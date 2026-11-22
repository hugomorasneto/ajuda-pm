import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_admin_email', 'smtp_sender_name', 'rate_limit_email_sent']
function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}
export const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
const protectedHash = config => hash(Object.fromEntries(Object.entries(config).filter(([key]) => !smtpKeys.includes(key))))
const select = config => Object.fromEntries(smtpKeys.map(key => [key, config[key] ?? null]))
const readablePassword = value => typeof value === 'string' && value.length > 0 && !/^\*+$/.test(value)
export function candidate(credentials, projectRef, hourlyLimit = 10) {
  assert.equal(credentials.projectRef, projectRef, 'Credential belongs to another Supabase project')
  assert.match(credentials.host, /^[a-z0-9][a-z0-9.-]+$/i, 'Invalid SMTP hostname')
  assert.equal(credentials.port, 465, 'This configuration requires implicit TLS on port 465')
  for (const field of ['username', 'from']) assert.match(credentials[field], /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/, 'Invalid SMTP address')
  assert.ok(typeof credentials.password === 'string' && credentials.password.length > 0, 'SMTP password required')
  assert.ok(typeof credentials.sender === 'string' && credentials.sender.trim() && !/[\r\n]/.test(credentials.sender), 'Invalid sender name')
  assert.ok(Number.isInteger(hourlyLimit) && hourlyLimit >= 1 && hourlyLimit <= 30, 'Initial hourly limit must be between 1 and 30')
  return { smtp_host: credentials.host, smtp_port: String(credentials.port), smtp_user: credentials.username, smtp_pass: credentials.password,
    smtp_admin_email: credentials.from, smtp_sender_name: credentials.sender, rate_limit_email_sent: hourlyLimit }
}
export function matches(config, expected) {
  // Some Management API responses omit the password. Live delivery remains required.
  return smtpKeys.every(key => key === 'smtp_pass' && !readablePassword(config[key]) ? true : config[key] === expected[key])
}
export function plan(config, desired) {
  return { customSmtpConfigured: !!config.smtp_host, alreadyConfigured: matches(config, desired), host: desired.smtp_host,
    port: desired.smtp_port, sender: desired.smtp_sender_name, from: desired.smtp_admin_email,
    hourlyLimit: desired.rate_limit_email_sent, minimumSeconds: config.smtp_max_frequency,
    signupEnabled: !config.disable_signup && config.external_email_enabled, confirmationRequired: !config.mailer_autoconfirm }
}
export async function apply({ projectRef, desired, getConfig, patchConfig, saveCheckpoint }) {
  const before = await getConfig()
  assert.ok(!before.disable_signup && before.external_email_enabled && !before.mailer_autoconfirm, 'Review signup and confirmation settings before SMTP configuration')
  if (matches(before, desired)) return { applied: false, alreadyConfigured: true }
  assert.ok(!before.smtp_host || readablePassword(before.smtp_pass), 'Previous SMTP password is unavailable for recovery')
  const checkpoint = { version: 1, projectRef, previous: select(before), desired, protectedHash: protectedHash(before), capturedAt: new Date().toISOString() }
  await saveCheckpoint(checkpoint) // Must succeed before the first remote write.
  const immediatelyBefore = await getConfig()
  assert.equal(hash(immediatelyBefore), hash(before), 'Auth configuration changed during preparation')
  await patchConfig(desired)
  const after = await getConfig()
  assert.ok(matches(after, desired), 'SMTP verification failed; encrypted checkpoint retained')
  assert.equal(protectedHash(after), checkpoint.protectedHash, 'Protected Auth settings changed; inspect the encrypted checkpoint')
  return { applied: true, passwordReturned: readablePassword(after.smtp_pass), protectedSettingsUnchanged: true }
}
export async function rollback({ projectRef, checkpoint, getConfig, patchConfig }) {
  assert.equal(checkpoint.projectRef, projectRef, 'Checkpoint belongs to another Supabase project')
  assert.equal(checkpoint.version, 1, 'Unknown checkpoint version')
  assert.deepEqual(Object.keys(checkpoint.previous).sort(), [...smtpKeys].sort(), 'Unexpected recovery fields')
  assert.deepEqual(Object.keys(checkpoint.desired).sort(), [...smtpKeys].sort(), 'Unexpected candidate fields')
  const before = await getConfig()
  assert.ok(matches(before, checkpoint.desired), 'SMTP changed since application; refusing to overwrite it')
  await patchConfig(checkpoint.previous)
  const after = await getConfig()
  assert.ok(matches(after, checkpoint.previous), 'Recovery verification failed')
  assert.equal(protectedHash(after), protectedHash(before), 'Protected settings changed during recovery')
  return { restored: true, protectedSettingsUnchanged: true }
}
