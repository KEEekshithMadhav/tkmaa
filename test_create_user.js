const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing')
  process.exit(1)
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runTest() {
  const timestamp = Date.now()
  const email = `testuser_${timestamp}@example.com`
  const password = `Password_${timestamp}`
  const full_name = `Test User ${timestamp}`
  const role = 'sport_admin'

  console.log(`Starting creation of user: ${email}`)

  console.time('1. createUser')
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role }
  })
  console.timeEnd('1. createUser')

  if (authError) {
    console.error('Auth Error:', authError.message)
    return
  }

  const userId = authData.user?.id
  console.log(`Auth user created with ID: ${userId}`)

  console.time('2. insert users row')
  const { data: insData, error: insErr } = await adminSupabase.from('users').insert([{
    id: userId,
    clerk_id: userId,
    email,
    full_name,
    phone: null,
    role
  }])
  console.timeEnd('2. insert users row')

  if (insErr) {
    console.error('DB Sync Error:', insErr.message)
    console.log('Cleaning up Auth user...')
    await adminSupabase.auth.admin.deleteUser(userId)
  } else {
    console.log('Successfully completed full user registration process!')
    // Cleanup the created test user
    console.log('Cleaning up created user from database and auth...')
    await adminSupabase.from('users').delete().eq('id', userId)
    await adminSupabase.auth.admin.deleteUser(userId)
    console.log('Cleanup done.')
  }
}

runTest().catch(console.error)
