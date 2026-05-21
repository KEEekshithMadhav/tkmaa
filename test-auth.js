const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  console.log('Testing Supabase Auth...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'testemailxyz123@gmail.com',
    password: 'Password123!',
  })

  if (error) {
    console.error('SignUp Error:', error.message)
  } else {
    console.log('SignUp Success:', data.user?.email)
  }
}

testAuth()
