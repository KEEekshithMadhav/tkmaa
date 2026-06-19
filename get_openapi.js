require('dotenv').config({ path: 'd:/ABMR/tkmaa/tkmaa/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const url = `${supabaseUrl}/rest/v1/`
  console.log(`Fetching OpenAPI spec using service role from: ${url}`)
  
  const res = await fetch(url, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  })

  if (!res.ok) {
    console.error('Failed to fetch:', res.status, res.statusText)
    return
  }

  const json = await res.json()
  console.log('--- EXPOSED TABLES & VIEWS ---')
  console.log(Object.keys(json.definitions || {}))
  
  console.log('\n--- EXPOSED FUNCTIONS (RPCs) ---')
  const paths = Object.keys(json.paths || {})
  const rpcs = paths.filter(p => p.startsWith('/rpc/'))
  console.log(rpcs)
}

run().catch(console.error)
