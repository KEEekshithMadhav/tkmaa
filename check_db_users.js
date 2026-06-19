const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: 'd:/ABMR/tkmaa/tkmaa/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  console.log('Querying users...')
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching users:', error)
  } else {
    console.log('Recent 20 Users in public.users:')
    console.table(data)
  }
}

check()
