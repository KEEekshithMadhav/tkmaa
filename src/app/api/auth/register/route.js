import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { email, password, full_name, role, phone } = await req.json()

    // We must use a fresh client to not mess with the current session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Using signUp. This will not log out the admin because it's running on the server
    // Note: If email confirmations are enabled in Supabase, the user won't be able to log in
    // until they confirm, unless we use service_role key to auto-confirm.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
        }
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id

    if (userId) {
      // Sync to users table (Avoid upsert to prevent constraint errors)
      const { error: insErr } = await supabase.from('users').insert([{
        id: userId,
        clerk_id: userId,
        email: email,
        full_name: full_name,
        phone: phone,
        role: role
      }])

      if (insErr && insErr.message.includes('already exists')) {
        await supabase.from('users').update({
          email: email,
          full_name: full_name,
          phone: phone,
          role: role
        }).eq('id', userId)
      }
    }

    return NextResponse.json({ user: authData.user })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
