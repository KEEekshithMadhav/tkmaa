const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey || serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY is missing in .env.local')
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key\n')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const REQUIRED_ACCOUNTS = [
  { email: 'madhav@gmail.com',           password: '@Madhavke888',  role: 'admin',   name: 'Madhav' },
  { email: 'hmyadala@gmail.com',          password: 'Hmyadala@123',  role: 'admin',   name: 'HM Yadala' },
  { email: 'manoj@gmail.com',             password: 'Manoj@1234',    role: 'trainer', name: 'Manoj' },
  { email: 'harish@gmail.com',            password: 'Harish@1234',   role: 'trainer', name: 'Harish' },
  { email: 'bhanu@gmail.com',             password: 'Bhanu@1234',    role: 'trainer', name: 'Bhanu' },
  { email: 'charan@gmail.com',            password: 'Charan@1234',   role: 'trainer', name: 'Charan' },
  { email: 'charan76@gmail.com',          password: 'Charan@1234',   role: 'trainer', name: 'Charan76' },
  { email: 'kowshik@gmail.com',           password: 'Kowshik@1234',  role: 'trainer', name: 'Kowshik' },
  { email: 'hharish40155@gmail.com',      password: 'Harish@1234',   role: 'trainer', name: 'Harish40155' },
  { email: 'kiran4455@gmail.com',         password: 'Kiran@1234',    role: 'student', name: 'Kiran' },
  { email: 'sravan@gmail.com',            password: 'Sravan@1234',   role: 'student', name: 'Sravan' },
  { email: 'keeekshithmadhav@gmail.com',  password: 'Eekshith@123',  role: 'student', name: 'Eekshith' },
  { email: 'uday@gmail.com',              password: 'Uday@1234',     role: 'student', name: 'Uday' },
  { email: 'dinesh@gmail.com',            password: 'Dinesh@1234',   role: 'student', name: 'Dinesh' },
  { email: 'prasad@gmail.com',            password: 'Prasad@1234',   role: 'student', name: 'Prasad' },
  { email: 'vibhav@gmail.com',            password: 'Vibhav@1234',   role: 'student', name: 'Vibhav' },
  { email: 'harish.m@aurora.edu.in',      password: 'Harish@1234',   role: 'student', name: 'Harish M' },
]

async function fixAllAccounts() {
  console.log('\n════════════════════════════════════════')
  console.log('  TKMAA Auth Account Fix Script')
  console.log('════════════════════════════════════════\n')

  const { data: { users: authUsers }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.error('❌ Failed to list Auth users:', listErr.message)
    return
  }

  console.log(`📋 Found ${authUsers.length} users in Supabase Auth\n`)

  const authByEmail = {}
  authUsers.forEach(u => { authByEmail[u.email] = u })

  const results = { created: [], updated: [], failed: [] }

  for (const acc of REQUIRED_ACCOUNTS) {
    const existing = authByEmail[acc.email]

    if (existing) {
      // Reset password for existing Auth user
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password: acc.password,
        email_confirm: true
      })

      // Sync role in public.users
      await admin.from('users').update({ role: acc.role }).eq('email', acc.email)

      if (error) {
        results.failed.push({ email: acc.email, reason: error.message })
        console.log(`❌ ${acc.email.padEnd(38)} FAILED: ${error.message}`)
      } else {
        results.updated.push(acc.email)
        console.log(`✅ ${acc.email.padEnd(38)} RESET   [${acc.role}]  pw: ${acc.password}`)
      }
    } else {
      // Create new Auth user
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.name, role: acc.role }
      })

      if (createErr) {
        results.failed.push({ email: acc.email, reason: createErr.message })
        console.log(`❌ ${acc.email.padEnd(38)} CREATE FAILED: ${createErr.message}`)
        continue
      }

      // Try to update existing public.users row, else insert new
      try {
        const { data: existingDbUser } = await admin.from('users').select('id').eq('email', acc.email).maybeSingle()

        if (existingDbUser) {
          // Update role only (can't change PK directly from anon)
          await admin.from('users').update({ role: acc.role }).eq('email', acc.email)
        } else {
          await admin.from('users').insert({
            id: newUser.user.id,
            clerk_id: newUser.user.id,
            email: acc.email,
            full_name: acc.name,
            role: acc.role
          })
        }
      } catch (dbErr) {
        console.log(`   ⚠️  DB sync issue for ${acc.email}: ${dbErr.message}`)
      }

      results.created.push(acc.email)
      console.log(`🆕 ${acc.email.padEnd(38)} CREATED [${acc.role}]  pw: ${acc.password}`)
    }
  }

  console.log('\n════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('════════════════════════════════════════')
  console.log(`  ✅ Reset   : ${results.updated.length}`)
  console.log(`  🆕 Created : ${results.created.length}`)
  console.log(`  ❌ Failed  : ${results.failed.length}`)

  if (results.failed.length > 0) {
    console.log('\n  Failed:')
    results.failed.forEach(f => console.log(`    - ${f.email}: ${f.reason}`))
  }

  console.log('\n════════════════════════════════════════')
  console.log('  LOGIN CREDENTIALS')
  console.log('════════════════════════════════════════')
  REQUIRED_ACCOUNTS.forEach(a => {
    console.log(`  ${a.role.toUpperCase().padEnd(8)} ${a.email.padEnd(38)} ${a.password}`)
  })
  console.log('════════════════════════════════════════\n')
}

fixAllAccounts().catch(console.error)
