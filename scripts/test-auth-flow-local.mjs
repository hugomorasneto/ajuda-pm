// Real GoTrue + PostgREST + PostgreSQL, isolated from any hosted project.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes, createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect, devices } from '@playwright/test'
import { preview as startPreview } from 'vite'
import { buildAuthEmailConfig, authEmailTypes } from './auth-email-templates.mjs'
import { assertAuthEmail, testAuthEmailCases } from './test-auth-email-cases.mjs'
import { prepareInviteTls, testPlanningInviteFlow } from './test-planning-invite-cases.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const prefix = `prodforge-auth-${process.pid}`
const containers = []
const network = `${prefix}-net`
const secret = randomBytes(32).toString('hex') // Only inside this disposable stack.
const password = 'local-fictional-password'
const production = process.argv.includes('--production')
const planningInvites = process.argv.includes('--planning-invites')
const smtpTls = process.argv.includes('--smtp-tls')
const release = JSON.parse(readFileSync(resolve(root, production ? 'src/content/legalRelease.production.json' : 'src/content/legalRelease.json'), 'utf8'))
const output = resolve(tmpdir(), prefix)
const templates = buildAuthEmailConfig()
mkdirSync(resolve(output, 'templates'), { recursive: true })
for (const type of authEmailTypes) writeFileSync(resolve(output, `templates/${type}.html`), templates[`mailer_templates_${type}_content`])
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true }).trim()
const sql = (query) => execFileSync('docker', ['exec', '-i', `${prefix}-db`, 'psql', '-h', '127.0.0.1', '-X', '-qAt', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
async function ready(url) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return } catch { /* Container starting. */ }
    await sleep(500)
  }
  throw new Error(`Local service unavailable: ${url}`)
}
function run(name, image, args = [], command = []) {
  const id = `${prefix}-${name}`
  docker('run', '-d', '--name', id, '--network', network, '--network-alias', name, ...args, image, ...command)
  containers.push(id)
  return id
}
function endpoint(container, port) {
  return `http://${docker('port', container, `${port}/tcp`)}`
}
let gateway, preview, browser, edgeUrl, ownedNetwork = false
try {
  // The existing test build uses this fixed loopback API. Fail rather than reuse a stack.
  gateway = createServer()
  await new Promise((done, reject) => { gateway.once('error', reject); gateway.listen(54321, '127.0.0.1', done) })
  docker('network', 'create', network)
  ownedNetwork = true
  run('db', 'postgres:17.11-alpine', ['-e', 'POSTGRES_HOST_AUTH_METHOD=trust'])
  for (let i = 0; ; i++) {
    try { sql('select 1'); break } catch { if (i === 30) throw new Error('Local database unavailable'); await sleep(500) }
  }
  sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;`)
  if (planningInvites || smtpTls) prepareInviteTls(output)
  const mail = run('mail', 'node:24.22.1-bookworm-slim', ['-p', '127.0.0.1::8025', '--mount', `type=bind,source=${resolve(root, 'scripts/fixtures')},target=/fixtures,readonly`, '--mount', `type=bind,source=${resolve(output, 'templates')},target=/templates,readonly`, ...(planningInvites || smtpTls ? ['-e', 'INVITE_TLS=true', '--mount', `type=bind,source=${resolve(output, 'certs')},target=/certs,readonly`] : []), ...(smtpTls ? ['-e', 'AUTH_SMTP_TLS=true'] : [])], ['node', '/fixtures/auth-mail-local.mjs'])
  const mailUrl = endpoint(mail, 8025)
  await ready(`${mailUrl}/health`)
  const auth = run('auth', 'public.ecr.aws/supabase/gotrue:v2.198.0', [
    '-p', '127.0.0.1::9999',
    ...(smtpTls ? ['--mount', `type=bind,source=${resolve(output, 'certs')},target=/certs,readonly`] : []),
    ...Object.entries({
      GOTRUE_DB_DRIVER: 'postgres', DATABASE_URL: 'postgres://postgres@db:5432/postgres?search_path=auth',
      DB_NAMESPACE: 'auth', API_EXTERNAL_URL: 'http://127.0.0.1:54321/auth/v1',
      GOTRUE_API_HOST: '0.0.0.0', PORT: '9999', GOTRUE_JWT_SECRET: secret,
      GOTRUE_JWT_AUD: 'authenticated', GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
      GOTRUE_SITE_URL: 'http://127.0.0.1:43919', GOTRUE_URI_ALLOW_LIST: 'http://127.0.0.1:43919/**',
      GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true', GOTRUE_MAILER_AUTOCONFIRM: 'false',
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: '/auth/v1/verify',
      GOTRUE_SMTP_HOST: 'mail', GOTRUE_SMTP_PORT: smtpTls ? '465' : '1025', GOTRUE_SMTP_ADMIN_EMAIL: 'local@example.test',
      ...(smtpTls ? { GOTRUE_SMTP_USER: 'local', GOTRUE_SMTP_PASS: 'fictional', SSL_CERT_FILE: '/certs/ca.pem' } : {}),
      GOTRUE_SMTP_MAX_FREQUENCY: '1s', GOTRUE_RATE_LIMIT_EMAIL_SENT: '1000',
      ...Object.fromEntries(authEmailTypes.flatMap(type => [
        [`GOTRUE_MAILER_SUBJECTS_${type.toUpperCase()}`, templates[`mailer_subjects_${type}`]],
        [`GOTRUE_MAILER_TEMPLATES_${type.toUpperCase()}`, `http://mail:8025/templates/${type}.html`],
      ])),
    }).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
  ])
  const authUrl = endpoint(auth, 9999)
  await ready(`${authUrl}/health`)
  for (const file of ['supabase/init.sql', 'supabase/auth-rls.sql', 'supabase/migrations/20261117190539_local_legal_acceptance.sql']) {
    sql(readFileSync(resolve(root, file), 'utf8'))
  }
  if (production) sql(readFileSync(resolve(root, 'supabase/migrations/20261118022243_publish_legal_release.sql'), 'utf8'))
  if (planningInvites) {
    for (const file of ['learning-progress.sql', 'analytics-admin.sql', 'admin-readonly.sql', 'admin-user-access.sql', 'projects-foundation.sql', 'teams-foundation.sql', 'project-story-history-collaboration.sql', 'planning-poker-foundation.sql', 'planning-poker-timer-hardening.sql', 'planning-poker-vote-visibility-hardening.sql']) {
      sql(readFileSync(resolve(root, 'supabase', file), 'utf8'))
    }
    sql('grant usage on schema public to service_role; grant all on all tables in schema public to service_role;')
  }
  const rest = run('rest', 'public.ecr.aws/supabase/postgrest:v16.5', [
    '-p', '127.0.0.1::3000', '-e', 'PGRST_DB_URI=postgres://postgres@db:5432/postgres',
    '-e', `PGRST_JWT_SECRET=${secret}`, '-e', 'PGRST_DB_ANON_ROLE=anon',
  ])
  const restUrl = endpoint(rest, 3000)
  await ready(restUrl)
  gateway.on('request', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }
    const target = request.url.startsWith('/auth/v1/') ? authUrl : request.url.startsWith('/rest/v1/') ? restUrl : request.url.startsWith('/functions/v1/') ? edgeUrl : null
    if (!target) { response.writeHead(404); response.end(); return }
    try {
      const body = []
      for await (const part of request) body.push(part)
      const headers = { ...request.headers }
      delete headers.host
      delete headers['content-length']
      const upstream = await fetch(target + request.url.replace(/^\/(auth|rest|functions)\/v1/, ''), {
        method: request.method, headers, redirect: 'manual',
        ...(body.length ? { body: Buffer.concat(body) } : {}),
      })
      for (const key of ['content-type', 'location']) if (upstream.headers.has(key)) response.setHeader(key, upstream.headers.get(key))
      response.writeHead(upstream.status)
      response.end(Buffer.from(await upstream.arrayBuffer()))
    } catch { response.writeHead(502); response.end('Local test gateway failure') }
  })
  // Each run owns its build; other validation builds cannot replace its assets.
  const testBuild = resolve(output, 'site')
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
    const { build } = await import('vite')
    await build({ mode: process.argv[1], build: { outDir: process.argv[2], emptyOutDir: true }, logLevel: 'error' })
  `, production ? 'i18n-production' : 'i18n-preview', testBuild], { cwd: root, stdio: 'pipe', windowsHide: true })
  // Own the preview process; never reuse or stop another task's server.
  preview = await startPreview({ root, mode: production ? 'i18n-production' : 'i18n-preview', build: { outDir: testBuild }, preview: { host: '127.0.0.1', port: 43919, strictPort: true } })
  const site = 'http://127.0.0.1:43919'
  // Port must match allowed callbacks, which are configured only inside disposable Auth.
  await ready(site)
  mkdirSync(output, { recursive: true })
  browser = await chromium.launch()
  const claims = [ { alg: 'HS256', typ: 'JWT' }, { role: 'service_role', exp: Math.floor(Date.now() / 1000) + 600 } ]
    .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
  const serviceJwt = claims + '.' + createHmac('sha256', secret).update(claims).digest('base64url')
  if (planningInvites) await testPlanningInviteFlow({ root, output, run, docker, sql, ready, endpoint, serviceJwt, browser, site, mailUrl, release, setEdgeUrl: value => { edgeUrl = value } })
  const viewports = planningInvites || process.argv.includes('--emails-only') ? [] : [['desktop', { viewport: { width: 1440, height: 900 } }], ['celular', { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } }]]
  for (const [device, options] of viewports) {
    for (const language of ['pt-BR', 'en']) {
      const context = await browser.newContext(options)
      await context.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort())
      const page = await context.newPage()
      const exceptions = []
      page.on('pageerror', (error) => exceptions.push(error.message))
      async function capture(state) {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `No horizontal overflow: ${device} ${language} ${state}`)
        await page.screenshot({ path: resolve(output, `${device}-${language}-${state}.png`), fullPage: true })
      }
      const email = `${device}-${language.toLowerCase()}@example.test`
      const target = `/times?ref=a%26b%23c&lang=${language}#main-content`
      await page.goto(site + '/signup?' + new URLSearchParams({ from: target, lang: language }))
      await page.getByRole('button', { name: language === 'en' ? 'Reject optional' : 'Recusar opcionais' }).click()
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await capture('signup')
      await page.locator('button[type="submit"]').click()
      await expect(page).toHaveURL(/\/check-email\?/)
      assert.equal(new URL(page.url()).searchParams.get('from'), target)
      assert.equal(sql(`select count(*) from public.local_legal_acceptances a join auth.users u on u.id=a.user_id where u.email='${email}' and a.language='${language}' and a.source='signup'`), '1')
      await sleep(2100) // Exceed the disposable Auth's 1s cooldown with scheduling margin; no hosted config change.
      await page.locator('button[type="submit"]').click()
      await expect(page.getByText(language === 'en' ? 'We sent a new confirmation link to your email address.' : 'Enviamos um novo link de confirmação para o seu e-mail.')).toBeVisible()
      for (const chosen of [language === 'en' ? 'pt-BR' : 'en', language]) {
        await page.getByRole('combobox').selectOption(chosen)
        // Known signup addresses are intentionally shown masked, without a field.
        await expect(page.locator('main')).toContainText(email.slice(0, 2) + '***@example.test')
        await sleep(2100)
        const sent = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/v1/resend') && response.request().method() === 'POST')
        await page.locator('button[type="submit"]').click()
        const resend = await sent
        assert.equal(resend.status(), 200, 'Resend completed: ' + (resend.ok() ? 'OK' : JSON.stringify(await resend.json())))
        await expect(page.getByText(chosen === 'en' ? 'We sent a new confirmation link to your email address.' : 'Enviamos um novo link de confirmação para o seu e-mail.')).toBeVisible()
        const latest = (await (await fetch(mailUrl)).json()).filter(message => message.includes(email)).at(-1)
        const result = assertAuthEmail(latest, 'confirmation', chosen)
        const callback = new URL(new URL(result.link).searchParams.get('redirect_to'))
        assert.equal(callback.searchParams.get('lang'), chosen)
        assert.equal(callback.searchParams.get('from'), target)
      }
      const messages = await (await fetch(mailUrl)).json()
      const raw = messages.filter((message) => message.includes(email)).at(-1)
      assert.ok(raw, 'Confirmation was captured by the local SMTP sink')
      const { html, link } = assertAuthEmail(raw, 'confirmation', language)
      assert.ok(link, 'Real confirmation link is present')
      const returnUrl = new URL(new URL(link).searchParams.get('redirect_to'))
      assert.equal(returnUrl.searchParams.get('from'), target)
      assert.equal(returnUrl.searchParams.get('lang'), language)
      await page.setContent(html)
      await capture('email')
      await page.goto(site + '/check-email?' + new URLSearchParams({ from: target, lang: language }))
      await capture('confirmation')
      await page.getByRole('link', { name: language === 'en' ? 'Go to sign in' : 'Ir para o login', exact: true }).click()
      await page.locator('#password').fill(password)
      await page.locator('button[type="submit"]').click()
      await expect(page.getByRole('alert')).toHaveText(language === 'en' ? 'Confirm your email before signing in.' : 'Confirme seu e-mail antes de entrar.')
      await capture('login')
      await page.goto(link)
      await expect(page).toHaveURL(site + target)
      await expect(page.locator('.workspace-shell')).toBeVisible()
      await expect(page.locator('#legal-acceptance-title')).toHaveCount(0)
      await page.reload()
      await expect(page.locator('.workspace-shell')).toBeVisible()
      await expect(page.locator('#legal-acceptance-title')).toHaveCount(0)
      // Delete only this fixture's receipt, modelling an existing account without acceptance.
      sql(`delete from public.local_legal_acceptances where user_id=(select id from auth.users where email='${email}')`)
      await page.reload()
      await expect(page.locator('#legal-acceptance-title')).toBeVisible()
      await capture('terms')
      const accept = page.getByRole('button', { name: language === 'en' ? 'Accept the Terms and continue' : 'Aceitar os Termos e continuar' })
      await accept.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.workspace-shell')).toBeVisible()
      assert.equal(page.url(), site + target)
      assert.equal(sql(`select count(*) from public.local_legal_acceptances a join auth.users u on u.id=a.user_id where u.email='${email}' and a.language='${language}' and a.source='session'`), '1')
      if (device === 'celular') await page.getByRole('button', { name: language === 'en' ? 'Open navigation menu' : 'Abrir menu de navegação', exact: true }).click()
      await page.getByRole('button', { name: language === 'en' ? 'Sign out' : 'Sair', exact: true }).click()
      await expect(page).toHaveURL(site + '/login?lang=' + language)
      await page.goto(site + target)
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await page.locator('button[type="submit"]').click()
      await expect(page).toHaveURL(site + target)
      await expect(page.locator('.workspace-shell')).toBeVisible()
      await expect(page.locator('#legal-acceptance-title')).toHaveCount(0)
      assert.deepEqual(exceptions, [], 'No JavaScript exceptions in the auth journey')
      await context.close()
      console.log(`PASS ${device} ${language}: real signup, SMTP resend/confirmation, receipt, refresh, keyboard acceptance, sign-out/sign-in and original destination`)
    }
  }
  if (!planningInvites) await testAuthEmailCases('http://127.0.0.1:54321', mailUrl, site, serviceJwt, release)
  if (smtpTls) {
    const status = await (await fetch(mailUrl + '/auth-status')).json()
    assert.ok(status.messages > 0)
    assert.equal(status.tlsAuthenticatedMessages, status.messages, 'Every captured Auth email used TLS and SMTP authentication')
    console.log(`PASS all ${status.messages} local Auth emails used TLS and authenticated SMTP`)
  }
  console.log(`Evidence: ${output}`)
} finally {
  await browser?.close()
  preview?.httpServer.closeAllConnections()
  await preview?.close()
  gateway?.closeAllConnections()
  await new Promise((done) => gateway?.listening ? gateway.close(done) : done())
  for (const container of containers.reverse()) docker('rm', '-f', container)
  if (ownedNetwork) docker('network', 'rm', network)
}
