import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Uses SERVICE ROLE key — runs only on server, never exposed to client
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req) {
  try {
    const { email, password, full_name, role, phone, branch_ids, sport_ids } = await req.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password and name are required.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    // 1. Create Auth user with admin API — auto-confirms email, no verification email sent
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // ← skips email confirmation, user can login immediately
      user_metadata: { full_name, role }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Failed to get user ID from Auth.' }, { status: 500 })
    }

    // 2. Sync to public.users table (trigger will also auto-create student/trainer row)
    const { error: insErr } = await adminSupabase.from('users').insert([{
      id: userId,
      clerk_id: userId,
      email,
      full_name,
      phone: phone || null,
      role
    }])

    if (insErr && !insErr.message.includes('already exists') && !insErr.message.includes('duplicate')) {
      // Auth user was created but DB sync failed — clean up Auth user
      await adminSupabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'DB sync failed: ' + insErr.message }, { status: 500 })
    }

    // If duplicate, just update
    if (insErr?.message.includes('already exists') || insErr?.message.includes('duplicate')) {
      await adminSupabase.from('users').update({ email, full_name, phone, role }).eq('id', userId)
    }

    // 3. Insert assignments (bypassing client RLS since we run with SERVICE ROLE)
    try {
      if (role === 'branch_admin') {
        if (branch_ids && branch_ids.length > 0) {
          const inserts = branch_ids.map(branchId => ({
            user_id: userId,
            branch_id: branchId
          }))
          const { error: bmErr } = await adminSupabase.from('branch_managers').insert(inserts)
          if (bmErr) throw bmErr
        }
      } else if (role === 'sport_admin') {
        if (sport_ids && sport_ids.length > 0) {
          const inserts = sport_ids.map(sportId => ({
            user_id: userId,
            sport_id: sportId
          }))
          const { error: saErr } = await adminSupabase.from('sport_admin_assignments').insert(inserts)
          if (saErr) throw saErr
        }
        if (branch_ids && branch_ids.length > 0 && sport_ids && sport_ids.length > 0) {
          const mgrInserts = []
          branch_ids.forEach(branchId => {
            sport_ids.forEach(sportId => {
              mgrInserts.push({
                user_id: userId,
                branch_id: branchId,
                sport_id: sportId
              })
            })
          })
          const { error: bmErr } = await adminSupabase.from('branch_managers').insert(mgrInserts)
          if (bmErr) throw bmErr
        }
      } else if (role === 'trainer') {
        const branchId = branch_ids?.[0] || null
        if (branchId) {
          // Trigger automatically creates a trainer record, so we upsert with branch_id
          const { error: tErr } = await adminSupabase
            .from('trainers')
            .upsert({ user_id: userId, branch_id: branchId, is_active: true }, { onConflict: 'user_id' })
          if (tErr) throw tErr
        }
      }
    } catch (assignErr) {
      // Transactional cleanup on assignment failures
      await adminSupabase.from('branch_managers').delete().eq('user_id', userId)
      await adminSupabase.from('sport_admin_assignments').delete().eq('user_id', userId)
      await adminSupabase.from('trainers').delete().eq('user_id', userId)
      await adminSupabase.from('users').delete().eq('id', userId)
      await adminSupabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'DB assignment failed: ' + assignErr.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      userId,
      message: `${role} account created successfully. They can now log in.`
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
