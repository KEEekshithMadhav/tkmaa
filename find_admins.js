const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: 'd:/ABMR/tkmaa/tkmaa/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', ['admin', 'super_admin'])

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Admins list:', data)
  }
}

check()
