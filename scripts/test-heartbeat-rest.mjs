import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'

const base = process.argv[2]
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/)
const secret = 'local-heartbeat-secret-at-least-32-characters'
function token(role, sub) {
  const parts = [{ alg: 'HS256', typ: 'JWT' }, { role, sub, exp: Math.floor(Date.now() / 1000) + 600 }]
    .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
  return `${parts}.${createHmac('sha256', secret).update(parts).digest('base64url')}`
}
async function request(path, role, options = {}, sub) {
  return fetch(`${base}/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${token(role, sub)}` } : {}), ...options.headers },
  })
}
let ready = false
for (let attempt = 0; attempt < 30; attempt++) {
  try { await fetch(base); ready = true; break } catch { await setTimeout(500) }
}
assert.ok(ready, 'PostgREST ready')
const path = 'techtupa_heartbeat'
for (const [role, sub] of [[null], ['anon'], ['authenticated', 'aa000000-0000-0000-0000-000000000001'], ['authenticated', 'aa000000-0000-0000-0000-000000000002']]) {
  for (const options of [
    {},
    { method: 'POST', body: JSON.stringify({ id: 'intruder' }) },
    { method: 'PATCH', body: JSON.stringify({ source: 'intruder' }) },
    { method: 'DELETE' },
    { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ id: 'main', source: 'intruder' }) },
  ]) {
    const response = await request(`${path}?id=eq.main`, role, options, sub)
    assert.ok([401, 403].includes(response.status), `${role ?? 'visitor'} ${options.method ?? 'GET'} denied: ${response.status}`)
  }
}
const before = await request(`${path}?id=eq.main&select=id,touched_at,source`, 'service_role')
assert.equal(before.status, 200)
assert.equal((await before.json()).length, 1)
const now = new Date().toISOString()
const payload = { id: 'main', touched_at: now, source: 'techtupa-keepalive', meta: { origin: 'techtupa', run_id: 'rest-fixture' } }
for (let attempt = 0; attempt < 2; attempt++) {
  const upsert = await request(`${path}?on_conflict=id`, 'service_role', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload),
  })
  assert.ok([200, 201].includes(upsert.status), `monitor upsert accepted: ${upsert.status}`)
  assert.equal((await upsert.json())[0].id, 'main')
}
const after = await request(`${path}?id=eq.main`, 'service_role')
assert.equal(after.status, 200)
const rows = await after.json()
assert.equal(rows.length, 1)
assert.equal(Date.parse(rows[0].touched_at), Date.parse(now))
assert.deepEqual(rows[0].meta, payload.meta)
console.log('PASS: REST blocks visitor/two accounts and preserves monitor GET/UPSERT/replay/GET')
