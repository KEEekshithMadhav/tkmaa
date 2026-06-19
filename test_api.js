async function testApi() {
  const timestamp = Date.now()
  const payload = {
    email: `api_test_${timestamp}@example.com`,
    password: `Password_${timestamp}`,
    full_name: `API Test User ${timestamp}`,
    role: 'sport_admin'
  }

  console.log('Sending request to local API /api/auth/register...')
  console.time('API Request')
  
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    console.timeEnd('API Request')
    console.log('Response Status:', res.status)
    const json = await res.json()
    console.log('Response Body:', json)
  } catch (err) {
    console.timeEnd('API Request')
    console.error('Fetch Error:', err)
  }
}

testApi()
