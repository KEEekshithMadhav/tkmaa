const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: 'd:/ABMR/tkmaa/tkmaa/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  console.log('--- branch_managers ---')
  const { data: bm, error: bmErr } = await supabase.from('branch_managers').select('*, users(full_name, email), branches(name)')
  if (bmErr) console.error(bmErr)
  else console.table(bm.map(r => ({
    id: r.id,
    user_name: r.users?.full_name,
    user_email: r.users?.email,
    branch_name: r.branches?.name,
    sport_id: r.sport_id
  })))

  console.log('\n--- sport_admin_assignments ---')
  const { data: sa, error: saErr } = await supabase.from('sport_admin_assignments').select('*, users(full_name, email), sports(sport_name)')
  if (saErr) console.error(saErr)
  else console.table(sa.map(r => ({
    id: r.id,
    user_name: r.users?.full_name,
    user_email: r.users?.email,
    sport_name: r.sports?.sport_name
  })))
}

check()
