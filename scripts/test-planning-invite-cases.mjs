// Extends the existing disposable Auth/PostgREST stack; never reads hosted credentials.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, devices } from '@playwright/test'

export function prepareInviteTls(output) {
  const certs = resolve(output, 'certs')
  mkdirSync(certs, { recursive: true })
  const config = resolve(certs, 'openssl.cnf')
  writeFileSync(config, '[req]\ndistinguished_name=dn\nx509_extensions=ca\nprompt=no\n[dn]\nCN=mail\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n[server]\nsubjectAltName=DNS:mail\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n')
  const openssl = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl'
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-config', config,
    '-keyout', resolve(certs, 'ca-key.pem'), '-out', resolve(certs, 'ca.pem')], { stdio: 'pipe', windowsHide: true })
  execFileSync(openssl, ['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-config', config,
    '-keyout', resolve(certs, 'key.pem'), '-out', resolve(certs, 'mail.csr')], { stdio: 'pipe', windowsHide: true })
  execFileSync(openssl, ['x509', '-req', '-days', '1', '-in', resolve(certs, 'mail.csr'), '-CA', resolve(certs, 'ca.pem'),
    '-CAkey', resolve(certs, 'ca-key.pem'), '-CAcreateserial', '-extfile', config, '-extensions', 'server', '-out', resolve(certs, 'cert.pem')], { stdio: 'pipe', windowsHide: true })
}

export async function testPlanningInviteFlow({ root, output, run, docker, sql, ready, endpoint, serviceJwt, browser, site, mailUrl, release, setEdgeUrl }) {
  const mount = `type=bind,source=${resolve(root, 'supabase/functions/planning-poker-invite')},target=/function,readonly`
  const image = 'denoland/deno:2.6.9'
  const unitOutput = docker('run', '--rm', '--mount', mount, image, 'deno', 'test', '--no-remote', '/function/email.test.ts')
  assert.match(unitOutput.replace(/\u001b\[[0-9;]*m/g, ''), /8 passed \| 0 failed/)
  console.log('PASS 8 Deno rendering/link regression tests')
  writeFileSync(resolve(output, 'edge.ts'), `import { handlePlanningPokerInviteRequest } from '/function/index.ts';\nDeno.serve({port:9000}, req => new URL(req.url).pathname === '/' ? new Response('ok') : handlePlanningPokerInviteRequest(req));\n`)
  const edge = run('edge', image, ['-p', '127.0.0.1::9000', '--mount', mount,
    '--mount', `type=bind,source=${resolve(output, 'edge.ts')},target=/local-test.ts,readonly`,
    '--mount', `type=bind,source=${resolve(output, 'certs')},target=/certs,readonly`,
    ...Object.entries({ SUPABASE_URL: 'http://mail:8025', SUPABASE_ANON_KEY: 'local-anon', SUPABASE_SERVICE_ROLE_KEY: serviceJwt,
      SMTP_HOST: 'mail', SMTP_PORT: '1465', SMTP_SECURE: 'true', SMTP_USERNAME: 'local', SMTP_PASSWORD: 'fictional', RODA_INVITE_FROM_EMAIL: 'ProdForge <local@example.test>',
    }).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
  ], ['deno', 'run', '--allow-net', '--allow-env', '--cert=/certs/ca.pem', '/local-test.ts'])
  const edgeUrl = endpoint(edge, 9000)
  setEdgeUrl(edgeUrl)
  await ready(edgeUrl)
  const api = 'http://127.0.0.1:54321'
  const password = 'local-fictional-password'
  async function request(path, body, token = serviceJwt) {
    const response = await fetch(api + path, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: 'local-anon', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  const actors = {}
  for (const name of ['owner', 'recipient', 'outsider']) {
    const email = `${name}@example.test`
    const created = await request('/auth/v1/admin/users', { email, password, email_confirm: true })
    assert.equal(created.status, 200)
    const login = await request('/auth/v1/token?grant_type=password', { email, password })
    assert.equal(login.status, 200)
    actors[name] = { id: created.body.id, token: login.body.access_token, email }
    sql(`insert into public.local_legal_acceptances(user_id,version,language,source) values ('${created.body.id}','${release.version}','pt-BR','session')`)
  }
  const project = '11111111-1111-4111-8111-111111111111'
  const session = '22222222-2222-4222-8222-222222222222'
  const otherProject = '33333333-3333-4333-8333-333333333333'
  sql(`insert into public.projects(id,owner_id,name) values ('${project}','${actors.owner.id}','Projeto original & Companhia'),('${otherProject}','${actors.outsider.id}','Outro cliente');
    insert into public.project_members(project_id,user_id,role) values ('${project}','${actors.recipient.id}','member');
    insert into public.planning_poker_sessions(id,project_id,facilitator_id,name,invite_code,status) values ('${session}','${project}','${actors.owner.id}','Roda original','LOCAL123','active');`)
  const targetPath = `/projetos/${project}/roda/${session}`
  const payload = { email: actors.recipient.email, project_id: project, session_id: session, invite_url: site + '/roda?codigo=LOCAL123&lang=en' }
  const send = (data, token = actors.owner.token) => request('/functions/v1/planning-poker-invite', data, token)
  for (const [label, data, token, error] of [
    ['unauthenticated', payload, '', /não autenticado/],
    ['non-manager/cross-project', payload, actors.outsider.token, /responsáveis e administradores/],
    ['member cannot send', payload, actors.recipient.token, /responsáveis e administradores/],
    ['room belongs to another project', { ...payload, project_id: otherProject }, actors.outsider.token, /não encontrada neste projeto/],
    ['wrong code', { ...payload, invite_url: site + '/roda?codigo=WRONG&lang=en' }, actors.owner.token, /não corresponde/],
    ['wrong direct room', { ...payload, invite_url: site + targetPath.replace(session, otherProject) }, actors.owner.token, /não corresponde/],
    ['external redirect', { ...payload, invite_url: 'https://example.com/roda?codigo=LOCAL123' }, actors.owner.token, /Link da Roda inválido/],
    ['recipient not a project member', { ...payload, email: actors.outsider.email }, actors.owner.token, /Adicione o e-mail ao projeto/],
  ]) {
    const result = await send(data, token)
    assert.equal(result.status, 400, label)
    assert.match(result.body.error, error, label)
  }
  assert.equal((await (await fetch(mailUrl)).json()).length, 0, 'Authorization failures never send SMTP')
  console.log('PASS 8 real Auth/PostgREST authorization and destination guards; no email sent on rejection')
  const views = [['desktop', { viewport: { width: 1440, height: 900 } }], ['celular', { ...devices['Pixel 7'], viewport: { width: 320, height: 740 } }]]
  for (const [device, options] of views) for (const language of ['pt-BR', 'en']) {
    const path = device === 'desktop' ? `/roda?codigo=LOCAL123&lang=${language}` : targetPath + `?ref=a%26b%23c&tag=1&tag=2&lang=${language}#main-content`
    const result = await send({ ...payload, invite_url: site + path })
    assert.equal(result.status, 200, JSON.stringify(result.body))
    assert.equal(result.body.message, language === 'en' ? 'Invitation sent by email.' : 'Convite enviado por e-mail.')
    const raw = (await (await fetch(mailUrl)).json()).at(-1)
    const encodedSubject = raw.match(/^Subject: (.+)$/m)[1].trim()
    const subject = encodedSubject.replace(/=\?UTF-8\?B\?(.+?)\?=/gi, (_, encoded) => Buffer.from(encoded, 'base64').toString())
    assert.equal(subject, (language === 'en' ? 'Planning Poker invitation: ' : 'Convite para a Roda da Fogueira: ') + 'Roda original')
    assert.ok(raw.includes(site + path), 'Plain text link preserved exactly')
    const html = raw.split('Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n')[1]?.split('\r\n--')[0]
    assert.ok(html?.includes(`lang="${language}"`), 'Localized HTML received over TLS SMTP')
    const context = await browser.newContext(options)
    await context.route(url => url.hostname !== '127.0.0.1', route => route.abort())
    const page = await context.newPage()
    const exceptions = [], badApi = []
    page.on('pageerror', error => exceptions.push(error.message))
    page.on('response', response => { if (response.url().includes('/rest/v1/') && response.status() >= 400) badApi.push(response.status() + ' ' + new URL(response.url()).pathname) })
    const capture = async state => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${device} ${language}: no overflow in ${state}`)
      await page.screenshot({ path: resolve(output, `invite-${device}-${language}-${state}.png`), fullPage: true })
      if (device === 'celular') await page.screenshot({ path: resolve(output, `invite-${device}-${language}-${state}-viewport.png`), fullPage: false })
    }
    // A saved preference contrary to the link must not override it.
    await page.goto(site + '/login?lang=' + (language === 'en' ? 'pt-BR' : 'en'))
    await page.getByRole('button', { name: language === 'en' ? 'Recusar opcionais' : 'Reject optional' }).click()
    await page.setContent(html)
    await capture('email')
    const action = page.getByRole('link', { name: language === 'en' ? 'Join the session' : 'Entrar na Roda', exact: true })
    assert.equal(await action.getAttribute('href'), site + path)
    await action.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#email')).toBeVisible()
    const loginUrl = new URL(page.url())
    assert.equal(loginUrl.searchParams.get('from'), path)
    assert.equal(loginUrl.searchParams.get('lang'), language)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page).toHaveTitle(/ProdForge/)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    await page.locator('#email').fill(actors.recipient.email)
    await page.locator('#password').fill(password)
    await capture('login')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(site + (device === 'desktop' ? targetPath + '?lang=' + language : path))
    await expect(page.locator('.planning-poker-room')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Roda original', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await capture('room')
    await page.reload()
    await expect(page.locator('.planning-poker-room')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    assert.deepEqual(exceptions, [], 'No JavaScript exceptions')
    assert.deepEqual(badApi, [], 'Real room API queries succeed')
    await context.close()
    console.log(`PASS ${device} ${language}: TLS SMTP subject/text/HTML, keyboard CTA, contrary saved preference, real login, correct room and reload`)
  }
  for (const suffix of ['', '&lang=es']) {
    const result = await send({ ...payload, invite_url: site + '/roda?codigo=LOCAL123' + suffix })
    assert.equal(result.status, 200)
    const raw = (await (await fetch(mailUrl)).json()).at(-1)
    assert.ok(raw.includes('/roda?codigo=LOCAL123&lang=pt-BR'))
  }
  console.log('PASS 2 real TLS SMTP fallback cases (legacy and unsupported language)')
}
