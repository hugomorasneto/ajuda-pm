import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { apply, candidate, hash, matches, plan, rollback, smtpKeys } from './auth-smtp.mjs'

const projectRef = 'bkuizdxdmnneyjsjydtm'
const credentials = { projectRef, host: 'smtp.example.test', port: 465, username: 'local@example.test', password: 'fictional-private-password', from: 'local@example.test', sender: 'ProdForge' }
const desired = candidate(credentials, projectRef)
const base = { smtp_host: null, smtp_port: null, smtp_user: null, smtp_pass: null, smtp_admin_email: 'default@example.test', smtp_sender_name: null, rate_limit_email_sent: 2,
  smtp_max_frequency: 60, site_url: 'https://prodforge.techtupa.com.br', mailer_autoconfirm: false, external_email_enabled: true, disable_signup: false, mailer_subjects_confirmation: 'Existing bilingual template', uri_allow_list: 'existing', hook_send_email_enabled: false }
function fixture() {
  let config = structuredClone(base), saved
  const writes = [], events = []
  return {
    projectRef, desired, writes, events,
    get saved() { return saved },
    get config() { return config },
    getConfig: async () => structuredClone(config),
    patchConfig: async patch => { events.push('write'); writes.push(patch); config = { ...config, ...patch } },
    saveCheckpoint: async checkpoint => { events.push('backup'); saved = structuredClone(checkpoint) },
  }
}
test('candidate is scoped and only includes seven SMTP/limit fields', () => {
  assert.deepEqual(Object.keys(desired).sort(), [...smtpKeys].sort())
  assert.equal(desired.rate_limit_email_sent, 10)
  assert.equal(desired.smtp_port, '465')
  assert.throws(() => candidate(credentials, 'another-project'), /another Supabase/)
  assert.throws(() => candidate({ ...credentials, port: 25 }, projectRef), /TLS/)
  assert.throws(() => candidate({ ...credentials, sender: 'Name\r\nBcc: injected' }, projectRef), /sender/)
  assert.throws(() => candidate({ ...credentials, password: '' }, projectRef), /password required/)
  assert.throws(() => candidate(credentials, projectRef, 1000), /hourly limit/)
})
test('plan never contains a password and does not alter config', () => {
  const copy = structuredClone(base), result = plan(copy, desired)
  assert.equal(result.minimumSeconds, 60)
  assert.equal(result.confirmationRequired, true)
  assert.ok(!JSON.stringify(result).includes(credentials.password))
  assert.deepEqual(copy, base)
})
test('checkpoint precedes write; templates, confirmation, URL, hooks and cooldown remain untouched', async () => {
  const f = fixture(), result = await apply(f)
  assert.equal(result.applied, true)
  assert.deepEqual(f.events, ['backup', 'write'])
  for (const [key, value] of Object.entries(base)) if (!smtpKeys.includes(key)) assert.deepEqual(f.config[key], value)
  assert.equal(f.saved.previous.rate_limit_email_sent, 2)
  assert.equal(f.saved.projectRef, projectRef)
})
test('failed backup prevents all remote writes', async () => {
  const f = fixture()
  f.saveCheckpoint = async () => { throw Error('Encrypted backup unavailable') }
  await assert.rejects(apply(f), /backup unavailable/)
  assert.equal(f.writes.length, 0)
})
test('concurrent preparation change is rejected before patch', async () => {
  const f = fixture(), read = f.getConfig
  let count = 0
  f.getConfig = async () => ({ ...await read(), ...(count++ ? { site_url: 'https://changed.example.test' } : {}) })
  await assert.rejects(apply(f), /changed during preparation/)
  assert.equal(f.writes.length, 0)
})
test('already configured candidate is idempotent', async () => {
  const f = fixture()
  await apply(f)
  assert.equal((await apply(f)).alreadyConfigured, true)
  assert.equal(f.writes.length, 1)
})
test('unexpected post-patch changes are reported and retain the recovery checkpoint', async () => {
  const f = fixture(), patch = f.patchConfig
  f.patchConfig = async body => { await patch({ ...body, mailer_autoconfirm: true }) }
  await assert.rejects(apply(f), /Protected Auth settings changed/)
  assert.ok(f.saved)
})
test('rollback restores only owned fields, including previous limit, and preserves other settings', async () => {
  const f = fixture()
  await apply(f)
  await f.patchConfig({ mailer_subjects_confirmation: 'A newer template' })
  await rollback({ ...f, checkpoint: f.saved })
  assert.equal(f.config.smtp_host, null)
  assert.equal(f.config.rate_limit_email_sent, 2)
  assert.equal(f.config.mailer_subjects_confirmation, 'A newer template')
})
test('rollback rejects foreign checkpoints and subsequent SMTP changes', async () => {
  const f = fixture()
  await apply(f)
  await assert.rejects(rollback({ ...f, checkpoint: { ...f.saved, projectRef: 'other' } }), /another Supabase/)
  await f.patchConfig({ smtp_host: 'changed.example.test' })
  const before = f.writes.length
  await assert.rejects(rollback({ ...f, checkpoint: f.saved }), /refusing/)
  assert.equal(f.writes.length, before)
})
test('response omitting password still requires real delivery and config hashes are order independent', () => {
  assert.equal(matches({ ...desired, smtp_pass: null }, desired), true)
  assert.equal(matches({ ...desired, smtp_pass: '********' }, desired), true)
  assert.equal(matches({ ...desired, smtp_pass: 'wrong' }, desired), false)
  assert.equal(hash({ b: 1, a: { y: 2, x: 3 } }), hash({ a: { x: 3, y: 2 }, b: 1 }))
})
test('changed confirmation policy or unrecoverable previous password blocks apply', async () => {
  for (const config of [{ ...base, mailer_autoconfirm: true }, { ...base, smtp_host: 'old.example.test' }, { ...base, smtp_host: 'old.example.test', smtp_pass: '********' }]) {
    const f = fixture()
    f.getConfig = async () => config
    await assert.rejects(apply(f))
    assert.equal(f.writes.length, 0)
  }
})
test('Windows checkpoint encrypts, round-trips and rejects tampering', { skip: process.platform !== 'win32' }, () => {
  const run = (action, input) => execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('protect-auth-smtp.ps1', import.meta.url)), '-Action', action], { input, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const plain = JSON.stringify({ smtp_pass: credentials.password })
  const encrypted = run('Protect', plain)
  assert.ok(!encrypted.includes(credentials.password))
  assert.equal(run('Unprotect', encrypted), plain)
  const damaged = Buffer.from(encrypted, 'base64'); damaged[damaged.length - 1] ^= 1
  assert.throws(() => run('Unprotect', damaged.toString('base64')))
})
