const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: 'd:/ABMR/tkmaa/tkmaa/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Auth Users list:')
    users.forEach(u => {
      console.log(`- Email: ${u.email}, ID: ${u.id}, Name: ${u.user_metadata?.full_name || 'N/A'}, Role: ${u.user_metadata?.role || 'N/A'}`)
    })
  }
}

check()
