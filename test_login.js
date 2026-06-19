const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TEST_ACCOUNTS = [
  { email: 'madhav@gmail.com',    password: '@Madhavke888' },
  { email: 'manoj@gmail.com',     password: 'Manoj@1234'  },
  { email: 'harish@gmail.com',    password: 'Harish@1234' },
  { email: 'bhanu@gmail.com',     password: 'Bhanu@1234'  },
  { email: 'kiran4455@gmail.com', password: 'Kiran@1234'  },
  { email: 'sravan@gmail.com',    password: 'Sravan@1234' },
]

async function testLogins() {
  console.log('\n══════════════════════════════════════')
  console.log('  LOGIN TEST — Checking each account')
  console.log('══════════════════════════════════════\n')

  // Also list all auth users to verify they exist
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authEmails = authUsers.map(u => u.email)

  for (const acc of TEST_ACCOUNTS) {
    const existsInAuth = authEmails.includes(acc.email)
    
    if (!existsInAuth) {
      console.log(`❌ ${acc.email.padEnd(35)} NOT FOUND in Supabase Auth`)
      continue
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    })

    if (error) {
      console.log(`❌ ${acc.email.padEnd(35)} FAIL: ${error.message}`)
    } else {
      console.log(`✅ ${acc.email.padEnd(35)} LOGIN OK  (uid: ${data.user.id.slice(0,8)})`)
      await supabase.auth.signOut()
    }
  }

  console.log('\n══════════════════════════════════════\n')
}

testLogins().catch(console.error)
