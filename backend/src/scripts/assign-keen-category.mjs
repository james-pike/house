const BACKEND_URL = "https://house-qvr4.onrender.com"
const CATEGORY_ID = "pcat_01KK58WFZ6R141SFVDA76GDZX0" // Safety Footwear

// Login
const authRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
})
const { token: TOKEN } = await authRes.json()
if (!TOKEN) { console.error("Login failed"); process.exit(1) }
console.log("Logged in\n")

// Fetch all products (paginate)
let offset = 0
const limit = 100
let keenProducts = []

while (true) {
  const res = await fetch(`${BACKEND_URL}/admin/products?limit=${limit}&offset=${offset}&fields=id,title,handle,metadata`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const data = await res.json()
  const products = data.products || []
  if (products.length === 0) break

  for (const p of products) {
    if (p.metadata?.brand === "Keen") {
      keenProducts.push(p)
    }
  }

  offset += limit
  if (products.length < limit) break
}

console.log(`Found ${keenProducts.length} Keen products to assign to Safety Footwear\n`)

let ok = 0
let failed = 0

for (const p of keenProducts) {
  try {
    const res = await fetch(`${BACKEND_URL}/admin/products/${p.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        categories: [{ id: CATEGORY_ID }],
      }),
    })

    if (res.ok) {
      ok++
      console.log(`  OK  ${p.title}`)
    } else {
      const text = await res.text()
      failed++
      console.log(`  FAIL ${p.title} | ${res.status}: ${text.substring(0, 100)}`)
    }
  } catch (e) {
    failed++
    console.log(`  ERR  ${p.title} | ${e.message}`)
  }

  await new Promise(r => setTimeout(r, 50))
}

console.log(`\nDone! Assigned: ${ok}, Failed: ${failed}`)
