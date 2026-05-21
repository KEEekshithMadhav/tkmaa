const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const ACCOUNTS = [
  { email: 'madhav@gmail.com', password: '@Madhavke888', name: 'Madhav', role: 'admin' },
  { email: 'harish@gmail.com', password: 'Harish1234', name: 'Harish', role: 'trainer', branch: 'Pragati Nagar' },
  { email: 'kiran@gmail.com', password: 'Kiran1234', name: 'Kiran', role: 'trainer', branch: 'Kukatpally' }
]

async function setup() {
  console.log('--- TKMAA MATCHED SETUP ---')

  for (const acc of ACCOUNTS) {
    console.log(`Processing ${acc.name}...`)
    
    // 1. Create Auth
    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: { data: { full_name: acc.name, role: acc.role } }
    })

    if (authErr && !authErr.message.includes('already registered')) {
        console.error(`  > Error creating ${acc.email}:`, authErr.message)
        continue
    }

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    })
    
    const userId = signInData?.user?.id || auth?.user?.id
    if (!userId) {
        console.log(`  > Could not retrieve ID for ${acc.email}:`, signInErr?.message || 'Unknown error')
        continue
    }

    // 2. Sync to public.users (Use separate insert/update to avoid upsert constraint issues)
    const { error: insErr } = await supabase.from('users').insert([{
      id: userId,
      clerk_id: userId,
      email: acc.email,
      full_name: acc.name,
      role: acc.role
    }])

    if (insErr && insErr.message.includes('already exists')) {
      await supabase.from('users').update({
        email: acc.email,
        full_name: acc.name,
        role: acc.role
      }).eq('id', userId)
    }

    // 3. Link Trainers to EXACT Branches
    if (acc.role === 'trainer' && acc.branch) {
      const { data: branch, error: bErr } = await supabase.from('branches')
        .select('id')
        .eq('name', acc.branch)
        .limit(1)
        .single()
        
      if (branch) {
        const { error: tInsErr } = await supabase.from('trainers').insert([{
          user_id: userId,
          branch_id: branch.id,
          experience_yrs: 5
        }])
        
        if (tInsErr && tInsErr.message.includes('already exists')) {
          await supabase.from('trainers').update({
            branch_id: branch.id,
            experience_yrs: 5
          }).eq('user_id', userId)
        }
        console.log(`  > Successfully linked ${acc.name} to branch: ${acc.branch}`)
      } else {
        console.log(`  > WARNING: Branch ${acc.branch} not found in DB!`)
      }
    }
  }

  console.log('--- SETUP COMPLETE ---')
}

setup()
