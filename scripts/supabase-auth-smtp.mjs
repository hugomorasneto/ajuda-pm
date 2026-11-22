import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { apply, candidate, matches, plan, rollback } from './auth-smtp.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => index % 2 ? pairs : [...pairs, [value.replace(/^--/, ''), values[index + 1]]], []))
const action = args.action ?? 'Plan'
const redactions = []
function privatePath(value) {
  if (!value || !isAbsolute(value)) throw Error('An absolute private path outside the repository is required')
  const path = existsSync(value) ? realpathSync(value) : resolve(realpathSync(dirname(value)), basename(value))
  let insideCheckout = false
  try { execFileSync('git', ['-C', dirname(path), 'rev-parse', '--show-toplevel'], { stdio: 'pipe', windowsHide: true }); insideCheckout = true }
  catch (error) { if (error.status !== 128) throw Error('Cannot validate private storage location') }
  if (insideCheckout) throw Error('Private material must stay outside every Git checkout')
  return path
}
function protect(value, operation) {
  if (process.platform !== 'win32') throw Error('Apply and rollback require Windows CurrentUser DPAPI')
  try { return execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('protect-auth-smtp.ps1', import.meta.url)), '-Action', operation], { input: value, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }) }
  catch { throw Error('Encrypted SMTP checkpoint operation failed') }
}
try {
  if (!['Plan', 'Apply', 'Verify', 'Rollback'].includes(action)) throw Error('Unknown SMTP action')
  if (!/^[a-z]{20}$/.test(args['project-ref'] ?? '')) throw Error('Explicit Supabase project reference required')
  const token = process.env[args['token-env']]
  if (!token) throw Error('Scoped project access token unavailable')
  redactions.push(token)
  const endpoint = `https://api.supabase.com/v1/projects/${args['project-ref']}/config/auth`
  async function request(method = 'GET', body) {
    const response = await fetch(endpoint, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
    if (!response.ok) throw Error(`Auth SMTP request failed (${response.status}); verify scoped Auth Config and Project Settings access`)
    return response.json()
  }
  const operations = { projectRef: args['project-ref'], getConfig: () => request(), patchConfig: body => request('PATCH', body) }
  let result
  if (action === 'Rollback') {
    const checkpoint = JSON.parse(protect(readFileSync(privatePath(args.checkpoint), 'utf8'), 'Unprotect'))
    redactions.push(checkpoint.previous?.smtp_pass, checkpoint.desired?.smtp_pass)
    result = await rollback({ ...operations, checkpoint })
  } else {
    const provider = await import(pathToFileURL(privatePath(args['credentials-module'])))
    const credentials = await provider.getSmtpCredentials()
    redactions.push(credentials.password)
    const desired = candidate(credentials, args['project-ref'], Number(args['hourly-limit'] ?? 10))
    if (action === 'Plan') result = plan(await request(), desired)
    else if (action === 'Verify') {
      if (!matches(await request(), desired)) throw Error('SMTP configuration differs from the validated candidate')
      result = { configured: true, liveDeliveryStillRequired: true }
    } else result = await apply({ ...operations, desired, saveCheckpoint: checkpoint => {
      const path = privatePath(args.checkpoint)
      writeFileSync(path, protect(JSON.stringify(checkpoint), 'Protect'), { flag: 'wx', mode: 0o600 })
    } })
  }
  console.log(JSON.stringify({ projectRef: args['project-ref'], action, ...result }))
} catch (error) {
  let message = error instanceof SyntaxError ? 'Invalid private SMTP data' : error.message
  for (const value of redactions) if (typeof value === 'string' && value) message = message.replaceAll(value, '[redacted]')
  console.error(message); process.exitCode = 1
}
