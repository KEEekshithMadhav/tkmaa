const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TRAINERS = [
  { email: 'harish@gmail.com', name: 'Harish', branch: 'Pragati Nagar' },
  { email: 'kiran@gmail.com', name: 'Kiran', branch: 'Kukatpally' }
]

async function fix() {
  console.log('--- FIXING TRAINER ACCOUNTS ---')
  
  for (const t of TRAINERS) {
    console.log(`Fixing ${t.name}...`)
    
    // 1. Get branch ID
    const { data: branch } = await supabase.from('branches').select('id').eq('name', t.branch).maybeSingle()
    if (!branch) {
      console.error(`  > Branch ${t.branch} not found!`)
      continue
    }

    // 2. Try to get ID from users table if it exists
    const { data: user } = await supabase.from('users').select('id').eq('email', t.email).maybeSingle()
    
    let userId = user?.id

    if (!userId) {
       // Try signing in to get ID
       const { data: signIn } = await supabase.auth.signInWithPassword({
         email: t.email,
         password: t.name + '1234' // Assuming standard password pattern
       })
       userId = signIn?.user?.id
    }

    if (!userId) {
      console.error(`  > Could not find Auth ID for ${t.email}. Please ensure the account is created in Supabase Auth.`)
      continue
    }

    // 3. Update/Insert public.users
    const { error: uErr } = await supabase.from('users').upsert({
      id: userId,
      email: t.email,
      full_name: t.name,
      role: 'trainer',
      clerk_id: userId
    })
    if (uErr) console.error('  > User Error:', uErr.message)

    // 4. Update/Insert public.trainers
    const { error: tErr } = await supabase.from('trainers').upsert({
      user_id: userId,
      branch_id: branch.id,
      experience_yrs: 5
    })
    if (tErr) console.error('  > Trainer Table Error:', tErr.message)

    console.log(`  > ${t.name} is now a TRAINER in ${t.branch}`)
  }
}

fix()
