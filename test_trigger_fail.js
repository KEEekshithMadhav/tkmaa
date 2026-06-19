const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runTest() {
  const timestamp = Date.now()
  const email = `test_trainer_${timestamp}@example.com`
  const password = `Password_${timestamp}`
  const full_name = `Test Trainer ${timestamp}`
  const role = 'trainer' // This will fire the trigger insert into public.trainers

  console.log(`Starting creation of trainer user: ${email}`)

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

  console.time('2. insert users row (will fire trigger)')
  const { data: insData, error: insErr } = await adminSupabase.from('users').insert([{
    id: userId,
    clerk_id: userId,
    email,
    full_name,
    phone: null,
    role
  }])
  console.timeEnd('2. insert users row (will fire trigger)')

  if (insErr) {
    console.error('DB Sync Error (Expected if trigger fails):', insErr.message)
    console.time('3. cleanup Auth user')
    await adminSupabase.auth.admin.deleteUser(userId)
    console.timeEnd('3. cleanup Auth user')
  } else {
    console.log('Successfully completed user registration! (Trigger did not fail?)')
    // Cleanup
    await adminSupabase.from('users').delete().eq('id', userId)
    await adminSupabase.auth.admin.deleteUser(userId)
  }
}

runTest().catch(console.error)
