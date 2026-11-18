import assert from 'node:assert/strict'
const free = 'aa000000-0000-0000-0000-000000000001'
const other = 'aa000000-0000-0000-0000-000000000002'
const pro = 'aa000000-0000-0000-0000-000000000003'
const project = 'ab000000-0000-0000-0000-000000000001'
const base = 'http://prodforge-quota-test-rest:3000'
const nativeFetch = globalThis.fetch
let ready = false
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await nativeFetch(base)
    await response.text()
    ready = true
    break
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}
assert.ok(ready, 'Local PostgREST did not become ready')
const encode = (text) => btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode('prodforge-quota-test-only-jwt-secret-2026'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
async function token(role, sub) {
  const data = [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify({ role, sub })].map(encode).join('.')
  const signature = await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(data))
  return data + '.' + encode(String.fromCharCode(...new Uint8Array(signature)))
}
const tokens = new Map(await Promise.all([free, other, pro].map(async (id) => [id, await token('authenticated', id)])))
const service = await token('service_role')
Deno.env.set('SUPABASE_URL', base)
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', service)
Deno.env.set('GEMINI_API_KEY', 'local-fake-provider-key')
let handle
Deno.serve = (callback) => { handle = callback }
let providerCalls = 0
let providerEntered
let resumeProvider
let sleepProvider = false
globalThis.fetch = async (url, init) => {
  if (url === base + '/auth/v1/user') {
    const auth = init.headers.Authorization
    const identity = [...tokens.entries()].find(([, value]) => auth === 'Bearer ' + value)?.[0]
    return identity ? Response.json({ id: identity }) : Response.json({}, { status: 401 })
  }
  if (url.startsWith(base + '/rest/v1/')) {
    return nativeFetch(url.replace('/rest/v1/', '/'), init)
  }
  if (new URL(url).hostname === 'generativelanguage.googleapis.com') {
    providerCalls++
    const prompt = JSON.parse(init.body).contents[0].parts[0].text
    if (sleepProvider && prompt.includes('COMPETIR')) {
      providerEntered()
      await new Promise((resolve) => { resumeProvider = resolve })
    }
    const text = prompt.includes('FAIL_GEMINI') ? 'invalid provider response' : JSON.stringify({
      title: 'Recuperação de acesso',
      objective: 'Garantir recuperação segura de acesso.',
      user_story: 'Como cliente, quero recuperar acesso, para utilizar minha conta.',
      acceptance_criteria: ['Exibir a confirmação.', 'Enviar o link.', 'Registrar o resultado.'],
      notes: 'Validar com QA.',
    })
    return Response.json({ candidates: [{ content: { parts: [{ text }] } }] })
  }
  throw new Error('Unexpected network request')
}
await import('file:///workspace/supabase/functions/generate-user-story/index.ts')
const direct = (actor, path, body, method = 'POST') => nativeFetch(base + path, {
  method, headers: { Authorization: 'Bearer ' + actor, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
async function usage(id) {
  const response = await direct(tokens.get(id), '/rpc/get_story_generation_usage', {})
  assert.equal(response.status, 200)
  return response.json()
}
function draft(context, more = {}) {
  return { request_id: crypto.randomUUID(), input_context: context, input_requirements: '', ...more }
}
async function generate(id, input, status, code) {
  const request = new Request('http://local.test/functions/v1/generate-user-story', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (tokens.get(id) ?? 'invalid-token') },
    body: JSON.stringify(input),
  })
  const response = await handle(request)
  const body = await response.json()
  assert.equal(response.status, status, JSON.stringify(body))
  if (code) assert.equal(body.code, code, JSON.stringify(body))
  return body
}
assert.equal((await usage(free)).usage_count, 9)
assert.equal((await usage(other)).usage_count, 0)
assert.equal((await usage(pro)).effective_limit, null)
await generate(undefined, draft('Unauthenticated'), 401)
await generate(free, draft('Invalid project', { project_id: project }), 409, 'TARGET_UNAVAILABLE')
const directInsert = await direct(tokens.get(free), '/user_stories', {
  user_id: free, input_context: 'Bypass', input_requirements: '', title: 'Conteudo', user_story: 'Conteudo',
})
assert.equal(directInsert.status, 403)
assert.ok(!(await direct(tokens.get(free), '/rpc/reserve_story_generation', {
  p_user_id: other, p_request_id: crypto.randomUUID(), p_fingerprint: 'test', p_project_id: null, p_previous_version_id: null,
})).ok)
assert.equal(providerCalls, 0)
await generate(free, draft('FAIL_GEMINI'), 502, 'PROVIDER_UNAVAILABLE')
assert.equal((await usage(free)).usage_count, 9)
await generate(free, draft('FAIL_DB'), 503, 'SAVE_FAILED')
assert.equal((await usage(free)).usage_count, 9)
const forbiddenRows = await direct(service, '/user_stories?input_context=eq.FAIL_DB', undefined, 'GET')
assert.deepEqual(await forbiddenRows.json(), [])
assert.equal(providerCalls, 2)

const inProvider = new Promise((resolve) => { providerEntered = resolve })
sleepProvider = true
const winningDraft = draft('COMPETIR')
const winningRequest = generate(free, winningDraft, 200)
await inProvider
await Promise.all([
  generate(free, draft('Segunda aba'), 409, 'GENERATION_IN_PROGRESS'),
  generate(free, winningDraft, 409, 'GENERATION_IN_PROGRESS'),
])
assert.equal(providerCalls, 3)
resumeProvider()
const saved = await winningRequest
assert.equal((await usage(free)).usage_count, 10)
const replay = await generate(free, winningDraft, 200)
assert.equal(replay.story.id, saved.story.id)
assert.equal(replay.generation_meta.quality_score, saved.generation_meta.quality_score)
await generate(free, { ...winningDraft, input_context: 'Mudança de conteúdo' }, 409, 'REQUEST_CONFLICT')
await generate(free, draft('Tentativa onze'), 403, 'QUOTA_EXHAUSTED')
assert.equal(providerCalls, 3)
const edit = await direct(tokens.get(free), '/user_stories?id=eq.' + saved.story.id, { title: 'Edição manual' }, 'PATCH')
assert.equal(edit.status, 204)
assert.equal((await usage(free)).usage_count, 10)
const deleted = await direct(service, '/user_stories?id=eq.' + saved.story.id, undefined, 'DELETE')
assert.equal(deleted.status, 204)
await generate(free, winningDraft, 409, 'STORY_REMOVED')
assert.equal((await usage(free)).usage_count, 10)

const first = await generate(other, draft('Projeto da conta', { project_id: project, user_id: free }), 200)
assert.equal(first.story.user_id, other)
assert.equal(first.story.version_number, 1)
const second = await generate(other, draft('Projeto da conta', {
  project_id: project, previous_version_id: first.story.id, regeneration_instruction: 'Refinar critérios.',
}), 200)
assert.equal(second.story.story_group_id, first.story.story_group_id)
assert.equal(second.story.version_number, 2)
assert.equal(second.story.previous_version_id, first.story.id)
assert.equal(second.story.regeneration_instruction, 'Refinar critérios.')
assert.equal((await usage(other)).usage_count, 2)
for (let i = 0; i < 11; i++) {
  await generate(pro, draft('Geração Pro ' + i), 200)
}
assert.equal((await usage(pro)).usage_count, 11)
const override = await direct(service, '/profiles?id=eq.' + other, { forge_limit_override: 2 }, 'PATCH')
assert.equal(override.status, 204)
await generate(other, draft('Tentativa acima do limite personalizado'), 403, 'QUOTA_EXHAUSTED')
assert.equal((await usage(other)).effective_limit, 2)
const pendingId = crypto.randomUUID()
const initialReservation = await direct(service, '/rpc/reserve_story_generation', {
  p_user_id: pro, p_request_id: pendingId, p_fingerprint: 'expired', p_project_id: null, p_previous_version_id: null,
})
const initialAttempt = (await initialReservation.json()).attempt_id
assert.ok(initialAttempt)
await direct(service, '/user_story_generation_requests?request_id=eq.' + pendingId, { lease_until: '2024-01-01' }, 'PATCH')
const renewedReservation = await direct(service, '/rpc/reserve_story_generation', {
  p_user_id: pro, p_request_id: pendingId, p_fingerprint: 'expired', p_project_id: null, p_previous_version_id: null,
})
const renewedAttempt = (await renewedReservation.json()).attempt_id
assert.ok(renewedAttempt)
assert.notEqual(initialAttempt, renewedAttempt)
const staleSave = await direct(service, '/rpc/save_story_generation', {
  p_user_id: pro, p_request_id: pendingId, p_attempt_id: initialAttempt, p_input: {}, p_output: {},
})
assert.equal((await staleSave.json()).code, 'RESERVATION_EXPIRED')
await direct(service, '/rpc/release_story_generation', { p_user_id: pro, p_request_id: pendingId, p_attempt_id: initialAttempt })
const activeReservation = await direct(service, '/rpc/reserve_story_generation', {
  p_user_id: pro, p_request_id: pendingId, p_fingerprint: 'expired', p_project_id: null, p_previous_version_id: null,
})
assert.equal((await activeReservation.json()).code, 'GENERATION_IN_PROGRESS')
await generate(pro, draft('Independent Pro request'), 200)
await direct(service, '/rpc/release_story_generation', { p_user_id: pro, p_request_id: pendingId, p_attempt_id: renewedAttempt })
console.log('PASS: historical usage, authentication and permissions, provider and save failures, concurrency, replay, 10/11, manual edit, deletion, account isolation, regeneration, Pro and administrative override.')
