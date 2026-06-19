const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client with anon key
const clientSupabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
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

  console.log('\nFetching branch_managers with client client...')
  const { data: bm, error: bmErr } = await clientSupabase.from('branch_managers').select('*')
  if (bmErr) {
    console.error('Error fetching branch_managers:', bmErr.message)
  } else {
    console.log(`Found ${bm.length} branch_managers rows:`, bm)
  }

  console.log('\nFetching sport_admin_assignments with client client...')
  const { data: sa, error: saErr } = await clientSupabase.from('sport_admin_assignments').select('*')
  if (saErr) {
    console.error('Error fetching sport_admin_assignments:', saErr.message)
  } else {
    console.log(`Found ${sa.length} sport_admin_assignments rows:`, sa)
  }

  console.log('\nFetching branches with client client...')
  const { data: branches, error: bErr } = await clientSupabase.from('branches').select('*')
  if (bErr) {
    console.error('Error fetching branches:', bErr.message)
  } else {
    console.log(`Found ${branches.length} branches rows.`)
  }

  console.log('\nFetching users with client client...')
  const { data: users, error: uErr } = await clientSupabase.from('users').select('*')
  if (uErr) {
    console.error('Error fetching users:', uErr.message)
  } else {
    console.log(`Found ${users.length} users rows.`)
  }
}

run().catch(console.error)
