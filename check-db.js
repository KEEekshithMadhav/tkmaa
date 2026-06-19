const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  console.log('--- Checking tournament_matches columns ---')
  const { data: colsTM, error: errTM } = await supabase.rpc('inspect_columns', { table_name_input: 'tournament_matches' })
  if (errTM) {
    // If inspect_columns RPC doesn't exist, try querying info schema
    const { data: colsInfo, error: errInfo } = await supabase.from('tournament_matches').select('*').limit(1)
    if (colsInfo && colsInfo.length > 0) {
      console.log('Tournament Matches Columns:', Object.keys(colsInfo[0]))
    } else {
      console.log('Error or empty table:', errInfo)
    }
  } else {
    console.log('TM Columns:', colsTM)
  }

  console.log('--- Checking students columns ---')
  const { data: colsS, error: errS } = await supabase.from('students').select('*').limit(1)
  if (colsS && colsS.length > 0) {
    console.log('Students Columns:', Object.keys(colsS[0]))
  } else {
    console.log('Error or empty table:', errS)
  }
}
check()
