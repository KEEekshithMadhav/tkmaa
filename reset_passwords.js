const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// ⚠️ You MUST use the SERVICE_ROLE key here (not anon key)
// Get it from: Supabase Dashboard → Project Settings → API → service_role key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.log('👉 Get it from: Supabase Dashboard → Settings → API → service_role (secret)')
  process.exit(1)
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Define the accounts to reset with their NEW passwords
const ACCOUNTS_TO_RESET = [
  { email: 'manoj@gmail.com',        newPassword: 'Manoj@1234',   role: 'trainer' },
  { email: 'harish@gmail.com',       newPassword: 'Harish@1234',  role: 'trainer' },
  { email: 'bhanu@gmail.com',        newPassword: 'Bhanu@1234',   role: 'trainer' },
  { email: 'charan@gmail.com',       newPassword: 'Charan@1234',  role: 'trainer' },
  { email: 'charan76@gmail.com',     newPassword: 'Charan@1234',  role: 'trainer' },
  { email: 'kowshik@gmail.com',      newPassword: 'Kowshik@1234', role: 'trainer' },
  { email: 'hharish40155@gmail.com', newPassword: 'Harish@1234',  role: 'trainer' },
  { email: 'kiran4455@gmail.com',    newPassword: 'Kiran@1234',   role: 'student' },
  { email: 'sravan@gmail.com',       newPassword: 'Sravan@1234',  role: 'student' },
]

async function resetPasswords() {
  console.log('--- RESETTING PASSWORDS ---\n')

  // List all users in Auth
  const { data: { users }, error: listErr } = await adminSupabase.auth.admin.listUsers()
  if (listErr) {
    console.error('❌ Failed to list users:', listErr.message)
    return
  }

  console.log(`Found ${users.length} users in Supabase Auth\n`)

  for (const acc of ACCOUNTS_TO_RESET) {
    const authUser = users.find(u => u.email === acc.email)

    if (!authUser) {
      console.log(`⚠️  ${acc.email} → NOT FOUND in Supabase Auth (needs to be created)`)
      
      // Create the user in Auth
      const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
        email: acc.email,
        password: acc.newPassword,
        email_confirm: true,
        user_metadata: { role: acc.role }
      })
      
      if (createErr) {
        console.error(`   ❌ Failed to create: ${createErr.message}`)
      } else {
        console.log(`   ✅ Created ${acc.email} with password: ${acc.newPassword}`)
      }
      continue
    }

    // Update the existing user's password
    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(authUser.id, {
      password: acc.newPassword,
      email_confirm: true
    })

    if (updateErr) {
      console.error(`❌ ${acc.email} → Failed: ${updateErr.message}`)
    } else {
      console.log(`✅ ${acc.email} → Password reset to: ${acc.newPassword}`)
    }
  }

  console.log('\n--- DONE ---')
  console.log('Now users can log in with the passwords shown above.')
}

resetPasswords()
