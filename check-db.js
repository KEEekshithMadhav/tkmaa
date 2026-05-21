const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'students' });
  console.log('Constraints:', data, error);
  
  // Alternative: query information_schema directly if rpc is not available
  const { data: raw, error: rawErr } = await supabase.from('students').select('*').limit(1);
  console.log('Sample row:', raw, rawErr);
}
check()
