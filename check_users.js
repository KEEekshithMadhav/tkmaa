const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  console.log('--- USER TABLE CHECK ---')
  const { data: users, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('Error:', error)
    return
  }
  console.table(users.map(u => ({ email: u.email, role: u.role, id: u.id.slice(0,8) })))
  
  console.log('\n--- TRAINER TABLE CHECK ---')
  const { data: trainers } = await supabase.from('trainers').select('*, branches(name)')
  console.table(trainers?.map(t => ({ user_id: t.user_id.slice(0,8), branch: t.branches?.name })))
}

check()
