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
    const { userId, role, branch_ids, sport_ids } = await req.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and Role are required.' }, { status: 400 })
    }

    // 1. Perform assignments cleanup (delete legacy scopes)
    await adminSupabase.from('branch_managers').delete().eq('user_id', userId)
    await adminSupabase.from('sport_admin_assignments').delete().eq('user_id', userId)

    // 2. Insert new scope assignments (bypassing client RLS)
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
        // Upsert trainer branch assignment
        const { error: tErr } = await adminSupabase
          .from('trainers')
          .upsert({ user_id: userId, branch_id: branchId, is_active: true }, { onConflict: 'user_id' })
        if (tErr) throw tErr
      }
    }

    // 3. Finally, update the user role in the users table
    const { error: roleErr } = await adminSupabase
      .from('users')
      .update({ role })
      .eq('id', userId)

    if (roleErr) throw roleErr

    return NextResponse.json({ 
      success: true,
      message: 'User permissions and scopes updated successfully.'
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
