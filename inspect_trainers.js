const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: 'd:/ABMR/tkmaa/tkmaa/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  console.log('Fetching trainers...')
  const { data, error } = await supabase.from('trainers').select('*')
  if (error) {
    console.error('Error fetching trainers:', error)
  } else {
    console.log('Trainers list:')
    console.table(data)
  }
}

check()
