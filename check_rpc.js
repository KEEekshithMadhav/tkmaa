const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const clientSupabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  console.log('Logging in as Madhav...')
  const { data: loginData, error: loginError } = await clientSupabase.auth.signInWithPassword({
    email: 'madhav@gmail.com',
    password: '@Madhavke888'
  })

  if (loginError) {
    console.error('Login failed:', loginError.message)
    return
  }

  console.log('Logged in successfully. User ID:', loginData.user.id)

  const { data: role, error: rErr } = await clientSupabase.rpc('get_my_role')
  if (rErr) {
    console.error('Error calling get_my_role:', rErr.message)
  } else {
    console.log('get_my_role() returned:', role)
  }

  const { data: branchIds, error: bErr } = await clientSupabase.rpc('get_my_branch_ids')
  if (bErr) {
    console.error('Error calling get_my_branch_ids:', bErr.message)
  } else {
    console.log('get_my_branch_ids() returned:', branchIds)
  }
}

check()
