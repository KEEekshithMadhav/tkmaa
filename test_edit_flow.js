const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  console.log('Finding test user "saniya"...')
  const { data: user } = await adminSupabase.from('users').select('*').eq('email', 'saniya@gmail.com').maybeSingle()
  
  if (!user) {
    console.error('User saniya@gmail.com not found')
    return
  }

  console.log('Found user saniya with ID:', user.id)

  // Get a sample branch and sport to assign
  const { data: branches } = await adminSupabase.from('branches').select('id, name').limit(1)
  const { data: sports } = await adminSupabase.from('sports').select('id, sport_name').limit(1)
  
  const branchId = branches?.[0]?.id
  const branchName = branches?.[0]?.name
  const sportId = sports?.[0]?.id
  const sportName = sports?.[0]?.sport_name

  console.log(`Assigning branch: ${branchName} (${branchId}), sport: ${sportName} (${sportId}) to saniya...`)

  console.time('Update Scope API')
  const res = await fetch('http://localhost:3000/api/users/update-scope', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      role: 'sport_admin',
      branch_ids: [branchId],
      sport_ids: [sportId]
    })
  })
  console.timeEnd('Update Scope API')

  const json = await res.json()
  console.log('Response:', json)

  if (res.ok) {
    console.log('Verification: checking DB records for saniya...')
    const { data: sa } = await adminSupabase.from('sport_admin_assignments').select('*').eq('user_id', user.id)
    const { data: bm } = await adminSupabase.from('branch_managers').select('*').eq('user_id', user.id)
    console.log('Sport Admin Assignments in DB:', sa)
    console.log('Branch Managers in DB:', bm)
  }
}

run().catch(console.error)
