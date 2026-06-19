const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use service role client to inspect the DB results
const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  const timestamp = Date.now()
  const newUserEmail = `flow_test_${timestamp}@example.com`
  const newUserPassword = `Password_${timestamp}`
  const newUserName = `Flow Test User ${timestamp}`
  const newUserRole = 'sport_admin'

  // Get a sample branch and sport to assign
  const { data: branches } = await adminSupabase.from('branches').select('id, name').limit(1)
  const { data: sports } = await adminSupabase.from('sports').select('id, sport_name').limit(1)
  
  const branchId = branches?.[0]?.id
  const branchName = branches?.[0]?.name
  const sportId = sports?.[0]?.id
  const sportName = sports?.[0]?.sport_name

  if (!branchId || !sportId) {
    console.error('No branch or sport found to assign')
    return
  }

  console.log(`Testing with Branch: ${branchName} (${branchId}), Sport: ${sportName} (${sportId})`)
  console.log(`\nStep 1: Calling /api/auth/register for ${newUserEmail}...`)
  console.time('Register API Call')
  
  let newUserId;
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUserEmail,
        password: newUserPassword,
        full_name: newUserName,
        role: newUserRole,
        branch_ids: [branchId],
        sport_ids: [sportId]
      })
    })
    
    console.timeEnd('Register API Call')
    const json = await res.json()
    console.log('API Response:', json)
    if (!res.ok) {
      throw new Error(json.error || 'API returned non-ok status')
    }
    newUserId = json.userId
  } catch (err) {
    console.timeEnd('Register API Call')
    console.error('API call failed:', err)
    return
  }

  console.log(`\nStep 2: Verifying database entries for ${newUserId}...`)
  
  // Verify user row
  const { data: userRow } = await adminSupabase.from('users').select('*').eq('id', newUserId).maybeSingle()
  console.log('User row in DB:', userRow ? 'Found ✅' : 'Missing ❌', userRow)

  // Verify sport assignments
  const { data: saRows } = await adminSupabase.from('sport_admin_assignments').select('*').eq('user_id', newUserId)
  console.log('Sport assignments in DB:', saRows.length > 0 ? `Found ${saRows.length} ✅` : 'Missing ❌', saRows)

  // Verify branch manager assignments
  const { data: bmRows } = await adminSupabase.from('branch_managers').select('*').eq('user_id', newUserId)
  console.log('Branch managers in DB:', bmRows.length > 0 ? `Found ${bmRows.length} ✅` : 'Missing ❌', bmRows)

  // Cleanup
  console.log('\nCleaning up database/auth...')
  await adminSupabase.from('branch_managers').delete().eq('user_id', newUserId)
  await adminSupabase.from('sport_admin_assignments').delete().eq('user_id', newUserId)
  await adminSupabase.from('users').delete().eq('id', newUserId)
  await adminSupabase.auth.admin.deleteUser(newUserId)
  console.log('Cleanup completed.')
}

run().catch(console.error)
