import { expect, test } from '@playwright/test'
import legalRelease from '../src/content/legalRelease.json' with { type: 'json' }

const user = { id: 'user-a', email: 'owner@example.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} }

async function mockWorkspace(context, activeUser = user, {
  empty = false, fail = false, authenticated = true, pendingLogin = false,
  resendFailsFirst = false, signOutFailsFirst = false,
} = {}) {
  const traffic = []
  const projects = empty ? [] : [
    { id: 'project-a', name: 'Checkout', description: 'Payments', owner_id: activeUser.id },
    { id: 'project-b', name: 'Catalog', description: 'Products', owner_id: 'another-user' },
  ]

  await context.addInitScript((account) => {
    if (!account) return
    const key = 'sb-127-auth-token'
    window.localStorage.setItem(key, JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: account,
    }))
  }, authenticated ? activeUser : null)

  await context.route('http://127.0.0.1:54321/**', async (route) => {
    const { pathname, searchParams } = new URL(route.request().url())
    traffic.push({ pathname, method: route.request().method(), redirectTo: searchParams.get('redirect_to') })
    const attempts = traffic.filter((entry) => entry.pathname === pathname).length
    if (pathname.endsWith('/signup')) {
      return route.fulfill({ json: { ...activeUser, identities: [{ id: 'test-identity' }] } })
    }
    if (pathname.endsWith('/resend')) {
      if (resendFailsFirst && attempts === 1) {
        return route.fulfill({ status: 429, json: { code: 'over_email_send_rate_limit', message: 'Rate limit' } })
      }
      return route.fulfill({ json: {} })
    }
    if (pathname.endsWith('/logout')) {
      if (signOutFailsFirst && attempts === 1) return route.fulfill({ status: 422, json: { message: 'Sign-out failed' } })
      return route.fulfill({ status: 204 })
    }
    if (pathname.endsWith('/token')) {
      if (pendingLogin && attempts === 1) {
        return route.fulfill({ status: 400, json: { code: 'email_not_confirmed', message: 'Email not confirmed' } })
      }
      return route.fulfill({ json: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: activeUser,
      } })
    }
    if (pathname.endsWith('/user')) return route.fulfill({ json: activeUser })
    if (pathname.endsWith('/get_local_legal_status')) {
      return route.fulfill({ json: { ...legalRelease, accepted: true, language: 'pt-BR', accepted_at: '2026-11-17T19:00:00Z' } })
    }
    if (pathname.endsWith('/projects')) {
      if (fail) return route.fulfill({ status: 400, json: { message: 'Project request failed' } })
      return route.fulfill({ json: projects })
    }
    if (pathname.endsWith('/teams')) {
      const isCheckout = searchParams.get('project_id') === 'eq.project-a'
      return route.fulfill({ json: isCheckout ? [
        { id: 'team-a', name: 'Checkout Guild', description: 'Payments', project_id: 'project-a' },
      ] : [] })
    }
    if (pathname.endsWith('/can_manage_project')) {
      return route.fulfill({ json: route.request().postDataJSON().p_project_id === 'project-a' })
    }
    if (pathname.endsWith('/list_team_members')) {
      return route.fulfill({ json: [
        { user_id: activeUser.id, email: activeUser.email, role: 'owner' },
        { user_id: 'team-member', email: 'member@example.test', role: 'member' },
      ] })
    }
    if (pathname.endsWith('/add_team_member_by_email')) {
      return route.fulfill({ status: 400, json: { message: 'Usuário não encontrado para esse e-mail.' } })
    }
    if (pathname.endsWith('/profiles')) {
      return route.fulfill({ json: { id: activeUser.id, role: 'user' } })
    }
    if (pathname.endsWith('/get_story_generation_usage')) {
      return route.fulfill({ json: { usage_count: 0, plan: 'free', effective_limit: 10, forge_limit_override: null } })
    }
    if (['/learning_progress', '/project_ai_diagnostics', '/search_story_history_groups']
      .some((endpoint) => pathname.endsWith(endpoint))) return route.fulfill({ json: [] })
    return route.abort()
  })

  return traffic
}

async function checkWidth(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  )
}

async function evidence(page, testInfo, name) {
  const path = testInfo.outputPath(name + '.png')
  await page.screenshot({ path, animations: 'disabled' })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:)/, (route) => route.abort())
})

test('Sobre mantém equivalência, âncora, metadados e acesso por teclado', async ({ page, request }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const ptPath = '/sobre?utm_source=example#nossa-visao'
  const enPath = '/en/about?utm_source=example#nossa-visao'
  const initialEnglish = await (await request.get('/en/about')).text()
  expect(initialEnglish).toContain('<html lang="en">')
  expect(initialEnglish).toContain('<title>About ProdForge | ProdForge</title>')
  expect(initialEnglish).toContain('content="noindex,follow"')
  expect(initialEnglish).toContain('href="https://prodforge.techtupa.com.br/en/about"')

  await page.goto(ptPath)
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o ProdForge' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  const control = page.getByRole('combobox', { name: 'Idioma' })
  await expect(control).toBeVisible()
  await page.keyboard.press('Tab')
  for (let i = 0; i < 18 && !(await control.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(control).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(enPath)
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(page.getByRole('heading', { level: 1, name: 'About ProdForge' })).toBeVisible()
  await expect(page.locator('#nossa-visao h2')).toHaveText('Our vision')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('About ProdForge | ProdForge')
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.getByRole('button', { name: 'Reject optional' })).toBeVisible()
  await checkWidth(page)
  if (testInfo.project.name === 'celular') {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Mobile public navigation' })).toBeVisible()
    await page.getByRole('button', { name: 'Close navigation' }).click()
    await page.setViewportSize({ width: 320, height: 740 })
  }
  await checkWidth(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeInViewport()
  await evidence(page, testInfo, 'sobre-consentimento-en')
  await page.getByRole('button', { name: 'Reject optional' }).click()
  await expect(page.getByRole('button', { name: 'Reject optional' })).toHaveCount(0)
  await evidence(page, testInfo, 'sobre-en')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'About ProdForge' })).toBeVisible()

  await page.goto(ptPath)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  expect(await page.evaluate(() => localStorage.getItem('prodforge.uiLanguage.visitor'))).toBe('en')
  await page.goto(enPath)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page).toHaveURL(ptPath)
  await expect(page).toHaveTitle('Sobre o ProdForge | ProdForge')
  await expect(page.getByRole('button', { name: 'Recusar opcionais' })).toHaveCount(0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await evidence(page, testInfo, 'sobre-pt-br')
  expect(errors).toEqual([])
})

test('Times preserva estado, traduz erro existente e não repete operações', async ({ page, context }, testInfo) => {
  const traffic = await mockWorkspace(context)
  const path = '/times?projectId=project-a&utm_source=a%20b&lang=pt-BR#main-content'
  await page.goto(path)
  await expect(page.getByText('Checkout Guild', { exact: true })).toBeVisible()
  await page.getByLabel('E-mail do participante').fill('missing@example.test')
  await page.getByRole('button', { name: 'Adicionar ao time' }).click()
  await expect(page.getByText('Usuário não encontrado para esse e-mail.')).toBeVisible()
  await page.getByLabel('Nome do time').fill('Meu rascunho')
  await page.getByLabel('Descrição opcional').fill('Contexto do time')
  await page.getByRole('searchbox').fill('Checkout')
  const beforeSwitch = traffic.length

  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/times?projectId=project-a&utm_source=a%20b&lang=en#main-content')
  await expect(page.getByLabel('Team name')).toHaveValue('Meu rascunho')
  await expect(page.getByLabel('Optional description')).toHaveValue('Contexto do time')
  await expect(page.getByRole('searchbox')).toHaveValue('Checkout')
  await expect(page.getByLabel('Member email')).toHaveValue('missing@example.test')
  await expect(page.getByText('No user was found for that email address.')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue('project-a')
  await expect(page).toHaveTitle('Teams · ProdForge')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(traffic).toHaveLength(beforeSwitch)
  await checkWidth(page)
  if (testInfo.project.name === 'celular') {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible()
    await page.locator('.workspace-sidebar__close').click()
    await page.setViewportSize({ width: 320, height: 740 })
  }
  await checkWidth(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeInViewport()
  await evidence(page, testInfo, 'times-en')
  await page.getByRole('combobox', { name: 'Project', exact: true }).selectOption('project-b')
  await expect(page).toHaveURL(/projectId=project-b.*utm_source=a\+b.*lang=en#main-content$/)
  await expect(page.getByText('You have read-only access to this project.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue('project-b')
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.goto('/times')
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page).toHaveTitle('Times · ProdForge')
  await evidence(page, testInfo, 'times-pt-br')
  expect(traffic.filter(({ pathname }) => pathname.endsWith('/add_team_member_by_email'))).toHaveLength(1)
  expect(traffic.some(({ pathname, method }) => pathname.endsWith('/teams') && method === 'POST')).toBe(false)
})

test('preferência da conta sincroniza entre abas sem sobrescrever o idioma explícito', async ({ page, context, browser }) => {
  await mockWorkspace(context, user, { empty: true })
  await page.goto('/times?lang=pt-BR')
  const other = await context.newPage()
  await other.goto('/times')
  await expect(other.getByText('Nenhum projeto criado ainda')).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(other.getByText('No projects yet')).toBeVisible()
  await page.goto('/times?lang=pt-BR')
  await other.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await other.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('Nenhum projeto criado ainda')).toBeVisible()
  const preference = await page.evaluate(() => localStorage.getItem('prodforge.uiLanguage.user.user-a'))

  const second = await browser.newContext({ baseURL: 'http://127.0.0.1:4175', locale: 'pt-BR' })
  try {
    await mockWorkspace(second, { ...user, id: 'user-b' }, { empty: true })
    await second.addInitScript((saved) => localStorage.setItem('prodforge.uiLanguage.user.user-a', saved), preference)
    const secondAccount = await second.newPage()
    await secondAccount.goto('/times')
    await expect(secondAccount.getByText('Nenhum projeto criado ainda')).toBeVisible()
  } finally {
    await second.close()
  }
})

test('Times trata falha de carregamento em inglês mesmo com armazenamento indisponível', async ({ page, context }) => {
  await mockWorkspace(context, user, { fail: true })
  await context.addInitScript(() => {
    Storage.prototype.setItem = new Proxy(Storage.prototype.setItem, {
      apply(fn, receiver, args) {
        if (args[0].startsWith('prodforge.uiLanguage.')) throw new Error('Storage unavailable')
        return Reflect.apply(fn, receiver, args)
      },
    })
  })
  await page.goto('/times?lang=pt-BR')
  await expect(page.getByText('Não foi possível carregar os projetos agora.')).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('Could not load projects right now.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Could not load projects right now.')).toBeVisible()
  await page.goto('/times')
  await expect(page.getByText('Não foi possível carregar os projetos agora.')).toBeVisible()
})

test('login simulado retorna ao destino original e o modo padrão é em português', async ({ page, context }) => {
  await mockWorkspace(context, user, { authenticated: false })
  const originalTarget = '/times?projectId=project-a&lang=en#main-content'
  await page.goto(originalTarget)
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('from')).toBe(originalTarget)
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('simulated-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(originalTarget)
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Teams' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('link', { name: 'View projects', exact: true }).click()
  await expect(page).toHaveURL('/projetos?lang=en')
  await expect(page).toHaveTitle('Projects · ProdForge')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.goto('http://127.0.0.1:4176/login?lang=en')
  await expect(page.getByRole('heading', { name: 'Entre na sua bancada' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)

  await page.goto('http://127.0.0.1:4176/sobre')
  await expect(page.getByRole('heading', { name: 'Sobre o ProdForge', level: 1 })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)
  await page.goto('http://127.0.0.1:4176/en/about')
  await expect(page).toHaveURL('http://127.0.0.1:4176/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

function authLink(route, from, lang) {
  return route + '?' + new URLSearchParams({ from, lang })
}

test('login mantém campos e aviso, reenvia uma vez e encerra a sessão no mesmo idioma', async ({ page, context }, testInfo) => {
  const traffic = await mockWorkspace(context, user, { authenticated: false, pendingLogin: true, signOutFailsFirst: true })
  const from = '/times?projectId=project-a&ref=a%26b%23c&lang=en#main-content'
  await page.goto(from)
  await page.getByRole('button', { name: 'Reject optional' }).click()
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('fake-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Confirm your email before signing in.')
  const language = page.getByRole('combobox', { name: 'Language' })
  await language.focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toBeFocused()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(user.email)
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('fake-password')
  await expect(page.getByRole('alert')).toHaveText('Confirme seu e-mail antes de entrar.')
  expect(new URL(page.url()).searchParams.get('from')).toBe(from)
  await page.getByRole('button', { name: 'Reenviar confirmação' }).click()
  await expect(page.getByText('Enviamos um novo link de confirmação para o seu e-mail.')).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('We sent a new confirmation link to your email address.')).toBeVisible()
  expect(traffic.filter(({ pathname }) => pathname.endsWith('/resend'))).toHaveLength(1)
  await checkWidth(page)
  await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'login-en')

  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(from)
  const menu = page.getByRole('button', { name: 'Open navigation' })
  if (testInfo.project.name === 'celular') {
    await expect(menu).toBeVisible()
    await menu.click()
    await expect(page.locator('.workspace-sidebar--open')).toBeVisible()
  }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Could not sign out. Try again.')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/login?lang=en')
  await expect(page.getByText('You signed out.')).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByText('Você saiu da conta.')).toBeVisible()
  expect(traffic.filter(({ pathname }) => pathname.endsWith('/logout'))).toHaveLength(2)

  const nextTarget = '/times?projectId=project-b&lang=en#main-content'
  // Open another route in this router instance without resetting the auth provider.
  await page.evaluate((target) => {
    window.history.pushState({ key: 'next-protected-link', idx: window.history.state.idx + 1 }, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, nextTarget)
  await expect(page.getByText('Sign in to access your workspace.')).toBeVisible()
  expect(new URL(page.url()).searchParams.get('from')).toBe(nextTarget)
  await expect(page.getByText('You signed out.')).toHaveCount(0)
})

test('cadastro preserva formulário e destino ao ler os documentos legais pelo teclado', async ({ page, context }) => {
  const traffic = await mockWorkspace(context, user, { authenticated: false })
  const from = '/times?ref=a%26b%23c#main-content'
  await page.goto(authLink('/signup', from, 'pt-BR'))
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  await page.locator('#email').fill('reader@example.test')
  await page.locator('#password').fill('fictional-password')
  for (const language of ['pt-BR', 'en']) {
    await page.getByRole('combobox').selectOption(language)
    await expect(page.locator('.auth-side__preview-story')).not.toContainText('<em>')
    await expect(page.locator('.auth-side__preview-story em')).toHaveCount(2)
    const documents = language === 'en'
      ? [['Read the Terms of Use in a new tab', 'Terms of Use'], ['Read the Privacy Policy in a new tab', 'Privacy Policy']]
      : [['Ler os Termos de Uso em uma nova aba', 'Termos de Uso'], ['Ler a Política de Privacidade em uma nova aba', 'Política de Privacidade']]
    for (const [name, heading] of documents) {
      const link = page.locator('#uso-de-dados').getByRole('link', { name, exact: true })
      await link.focus()
      await expect(link).toBeFocused()
      const popup = page.waitForEvent('popup')
      await page.keyboard.press('Enter')
      const document = await popup
      await expect(document.getByRole('heading', { name: heading, level: 1, exact: true })).toBeVisible()
      await expect(document.locator('html')).toHaveAttribute('lang', language)
      await document.close()
      await expect(page.locator('#email')).toHaveValue('reader@example.test')
      await expect(page.locator('#password')).toHaveValue('fictional-password')
      expect(new URL(page.url()).searchParams.get('from')).toBe(from)
      // Reviewing documents cannot create an account or accept on the person's behalf.
      await expect(page.getByRole('heading', { name: language === 'en' ? 'Create your free account' : 'Crie sua conta grátis' })).toBeVisible()
    }
  }
  expect(traffic.filter(({ pathname }) => pathname.endsWith('/signup') || pathname.endsWith('/accept_local_legal_terms'))).toHaveLength(0)
})

test('cadastro e confirmação preservam o destino codificado e permitem reenviar sem sair da tela', async ({ page, context }, testInfo) => {
  const traffic = await mockWorkspace(context, user, { authenticated: false, resendFailsFirst: true })
  const from = '/times?projectId=project-b&ref=a%26b%23c#main-content'
  await page.goto(authLink('/signup', from, 'pt-BR'))
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  await expect(page.locator('#uso-de-dados')).toContainText('aceita os Termos de Uso. Consulte a Política de Privacidade')
  await expect(page.locator('#uso-de-dados')).toContainText('uso profissional por pessoas com 18 anos ou mais')
  await expect(page.locator('#uso-de-dados').getByRole('link', { name: 'Ler a Política de Privacidade em uma nova aba' })).toHaveAttribute('href', '/politica-de-privacidade')
  await page.getByLabel('E-mail', { exact: true }).fill(user.email)
  await page.locator('input[type="password"]').fill('short')
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await expect(page.getByText('Use pelo menos 6 caracteres.')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeFocused()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('Use at least 6 characters.', { exact: true })).toBeVisible()
  await expect(page.locator('#uso-de-dados').getByRole('link', { name: 'Read the Terms of Use in a new tab' })).toHaveAttribute('href', '/en/terms-of-use')
  await expect(page.locator('#uso-de-dados')).toContainText('agree to the Terms of Use. Read the Privacy Policy')
  await expect(page.locator('#uso-de-dados')).toContainText('professional use by people aged 18 or older')
  await expect(page.locator('input[type="password"]')).toHaveValue('short')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(user.email)
  await expect(page).toHaveTitle('Create a ProdForge account')
  await page.locator('input[type="password"]').fill('test-password')
  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await checkWidth(page)
  await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'cadastro-en')
  const signupRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname === '/auth/v1/signup' && request.method() === 'POST')
  await page.getByRole('button', { name: 'Create a free account' }).click()
  expect((await signupRequest).postDataJSON().data.prodforge_legal_acceptance).toEqual({
    ...legalRelease, language: 'en',
  })
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  expect(page.url()).not.toContain(encodeURIComponent(user.email))
  expect(new URL(page.url()).searchParams.get('from')).toBe(from)
  await expect(page.getByText(/ow\*\*\*@example\.test/)).toBeVisible()
  await page.getByRole('button', { name: 'Resend email' }).click()
  await expect(page.getByRole('alert')).toHaveText(/Too many attempts/)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByRole('alert')).toHaveText(/Limite temporário/)
  await page.getByRole('button', { name: 'Reenviar e-mail' }).click()
  await expect(page.getByText('Enviamos um novo link de confirmação para o seu e-mail.')).toBeVisible()
  expect(traffic.filter(({ pathname }) => pathname.endsWith('/resend'))).toHaveLength(2)
  await page.getByRole('combobox', { name: 'Idioma' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'confirmacao-pt-br')

  const callback = new URL(traffic.find(({ pathname }) => pathname.endsWith('/signup')).redirectTo)
  expect(callback.pathname).toBe('/check-email')
  expect(callback.searchParams.get('from')).toBe(from)
  expect(callback.searchParams.get('lang')).toBe('en')
  expect(callback.hash).toBe('')
  const confirmation = await context.newPage()
  callback.hash = 'access_token=mock-access&refresh_token=mock-refresh&expires_in=3600&token_type=bearer&type=signup'
  await confirmation.goto(callback.href)
  await expect(confirmation).toHaveURL('/times?projectId=project-b&ref=a%26b%23c&lang=en#main-content')
  await expect(confirmation.locator('html')).toHaveAttribute('lang', 'en')
  await confirmation.close()
})

test('link expirado permite informar o e-mail e retomar o convite original', async ({ page, context }) => {
  const traffic = await mockWorkspace(context, user, { authenticated: false })
  const from = '/roda?codigo=a%2Fb%26c#sessao'
  await page.goto(authLink('/check-email', from, 'en') + '#error=access_denied&error_code=otp_expired')
  await expect(page.getByRole('alert')).toHaveText(/confirmation link expired/)
  await page.getByRole('button', { name: 'Resend email' }).click()
  await expect(page.getByText('Enter your email.', { exact: true })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByRole('button', { name: 'Resend email' }).click()
  await expect(page.getByText('We sent a new confirmation link to your email address.')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  const resent = traffic.find(({ pathname }) => pathname.endsWith('/resend'))
  expect(new URL(resent.redirectTo).searchParams.get('from')).toBe(from)
  await page.getByRole('link', { name: 'Go to sign in' }).click()
  expect(new URL(page.url()).searchParams.get('from')).toBe(from)
  await expect(page.getByText(/Once you confirm your email, sign in to access Planning Poker/)).toBeVisible()
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(user.email)
})

test('aceite versionado preserva destino e idioma, permite repetir falha e persiste entre abas', async ({ page, context }) => {
  await mockWorkspace(context)
  const target = '/times?projectId=project-a&ref=a%26b&lang=en#main-content'
  let receipt = null
  let releaseFailure
  const waiting = new Promise((resolve) => { releaseFailure = resolve })
  const writes = []
  await context.route('**/rest/v1/rpc/get_local_legal_status', (route) => route.fulfill({
    json: receipt ?? { ...legalRelease, accepted: false },
  }))
  await context.route('**/rest/v1/rpc/accept_local_legal_terms', async (route) => {
    const payload = route.request().postDataJSON()
    writes.push(payload)
    if (writes.length === 1) {
      await waiting
      return route.fulfill({ status: 400, json: { code: 'P0001', message: 'Local save failure' } })
    }
    receipt = {
      ...legalRelease, accepted: true, language: payload.p_language,
      accepted_at: '2026-11-17T19:00:00Z',
    }
    return route.fulfill({ json: receipt })
  })
  await page.goto('/en/')
  await page.getByRole('button', { name: 'Reject optional' }).click()
  const consent = await page.evaluate(() => localStorage.getItem('prodforge_privacy_consent_preview'))
  await page.goto(target)
  await expect(page.getByRole('heading', { name: 'Review the Terms to continue' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Read the Terms of Use in a new tab' }))
    .toHaveAttribute('href', '/en/terms-of-use')
  const accept = page.getByRole('button', { name: 'Accept the Terms and continue' })
  await accept.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => writes.length).toBe(1)
  await expect(page.getByRole('button', { name: 'Recording acceptance...' })).toBeDisabled()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  expect(writes).toEqual([{
    p_version: legalRelease.version, p_sha256: legalRelease.sha256, p_language: 'en',
  }])
  releaseFailure()
  await expect(page.getByRole('alert')).toHaveText('Não foi possível confirmar o registro do aceite. Tente novamente.')
  await page.getByRole('button', { name: 'Aceitar os Termos e continuar' }).click()
  await expect(page.getByRole('combobox', { name: 'Projeto', exact: true })).toHaveValue('project-a')
  await expect(page).toHaveURL(target.replace('lang=en', 'lang=pt-BR'))
  expect(writes).toHaveLength(2)
  expect(writes[1].p_language).toBe('pt-BR')
  expect(await page.evaluate(() => localStorage.getItem('prodforge_privacy_consent_preview'))).toBe(consent)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Projeto', exact: true })).toHaveValue('project-a')
  const second = await context.newPage()
  await second.goto(target)
  await expect(second.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue('project-a')
  expect(writes).toHaveLength(2)
  await second.close()
  await checkWidth(page)
})

test('aceite rejeita versão divergente e consulta novamente sem registrar escolha implícita', async ({ page, context }) => {
  const traffic = await mockWorkspace(context)
  let checks = 0
  await context.route('**/rest/v1/rpc/get_local_legal_status', (route) => {
    checks++
    return route.fulfill({ json: checks === 1
      ? { ...legalRelease, sha256: 'outdated', accepted: true }
      : { ...legalRelease, accepted: false } })
  })
  await page.goto('/times?projectId=project-a&lang=en')
  await expect(page.getByRole('alert')).toContainText("We couldn't verify this version of the Terms.")
  expect(traffic.some(({ pathname }) => pathname.endsWith('/projects'))).toBe(false)
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(page.getByRole('button', { name: 'Accept the Terms and continue' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByRole('button', { name: 'Aceitar os Termos e continuar' })).toBeVisible()
  expect(checks).toBe(2)
  expect(traffic.some(({ pathname }) => pathname.endsWith('/accept_local_legal_terms'))).toBe(false)
  await checkWidth(page)
})

test('rotas públicas abrem diretamente nos dois idiomas com metadados e vínculos equivalentes', async ({ page, request }, testInfo) => {
  const remoteFontRequests = []
  page.on('request', (request) => {
    const hostname = new URL(request.url()).hostname
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(hostname)) {
      remoteFontRequests.push(hostname)
    }
  })
  const entries = [
    ['/en/', '/', 'Turn unclear briefs into clear user stories.', 'Transforme briefings confusos em user stories claras.'],
    ['/en/faq', '/faq', 'Frequently asked questions', 'Perguntas Frequentes'],
    ['/en/contact', '/contato', 'Contact ProdForge', 'Fale com o ProdForge'],
    ['/en/privacy-policy', '/politica-de-privacidade', 'Privacy Policy', 'Política de Privacidade'],
    ['/en/privacy-preferences', '/preferencias-de-privacidade', 'Privacy Preferences', 'Preferências de Privacidade'],
    ['/en/terms-of-use', '/termos-de-uso', 'Terms of Use', 'Termos de Uso'],
  ]
  for (const [english, portuguese, enHeading, ptHeading] of entries) {
    const response = await request.get(english)
    expect(response.ok()).toBe(true)
    const html = await response.text()
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('content="noindex,follow"')
    expect(html).toContain('href="https://prodforge.techtupa.com.br' + english + '"')
    expect(html).not.toContain('{{')
    expect(html).not.toContain('hreflang=')
    await page.goto(english)
    await expect(page.getByRole('heading', { level: 1, name: enHeading, exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
    await expect.poll(() => page.evaluate(async () => {
      await document.fonts.load('400 16px Inter')
      return [...document.fonts].some((font) => font.family === 'Inter' && font.status === 'loaded')
    })).toBe(true)
    if (english === '/en/faq') {
      const schema = page.locator('script[type="application/ld+json"]')
      await expect(schema).toHaveCount(1)
      expect(JSON.parse(await schema.textContent()).mainEntity.length).toBeGreaterThan(5)
    }
    if (english === '/en/terms-of-use') {
      await expect(page.locator('#propriedade-intelectual')).toContainText('The MIT License governs use of the code released under it.')
      await expect(page.locator('#aceitacao-e-escopo')).toContainText('the Brazilian Portuguese version is the reference')
      await expect(page.locator('#o-que-e-o-prodforge')).toContainText('professional use by people aged 18 or older')
      await expect(page.locator('#propriedade-intelectual')).toContainText('provide the features you request and operate the service securely')
      await expect(page.locator('#planos-limites-e-recursos')).toContainText('a default allowance of 10 successful, saved generations per account, with no monthly reset')
      await expect(page.locator('#planos-limites-e-recursos')).toContainText('Manual edits, failed attempts, and project diagnostics are outside this allowance.')
      await expect(page.locator('#planos-limites-e-recursos')).toContainText('Deleting a saved story does not restore your allowance.')
      await expect(page.locator('.privacy-policy-hero__summary-date')).toHaveText(legalRelease.version)
      await expect(page.locator('#aceitacao-e-escopo')).toContainText('Hugo Cruz da Silva Moraes Neto')
      if (testInfo.project.name === 'celular') {
        await page.setViewportSize({ width: 320, height: 740 })
        await checkWidth(page)
        await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
        await evidence(page, testInfo, 'termos-en')
      }
    }
    if (english === '/en/privacy-policy') {
      await expect(page.locator('#direitos-do-titular')).toContainText('a review of decisions made solely by automated means that affect your interests')
      await expect(page.locator('#uso-de-inteligencia-artificial')).toContainText('the context needed to produce a response')
      await expect(page.locator('#quais-dados-podemos-coletar')).toContainText('generation counts and account limits')
      await expect(page.locator('.privacy-policy-hero__summary-date')).toHaveText(legalRelease.version)
      await expect(page.locator('#quem-somos')).toContainText('Hugo Cruz da Silva Moraes Neto')
      await expect(page.locator('#retencao-dos-dados')).not.toContainText('90 days')
      await expect(page.locator('#retencao-dos-dados')).toContainText('what needs to be kept, why, and for how long')
      await expect(page.locator('#como-usamos-os-dados')).toContainText('Pro updates when you ask to receive them')
    }
    await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
    await expect(page).toHaveURL(portuguese)
    await expect(page.getByRole('heading', { level: 1, name: ptHeading, exact: true })).toBeVisible()
    if (portuguese === '/termos-de-uso') {
      await expect(page.locator('#propriedade-intelectual')).toContainText('A revenda ou a sublicença de acesso ao serviço hospedado exige autorização expressa.')
      await expect(page.locator('#aceitacao-e-escopo')).toContainText('a versão em português brasileiro é a referência')
      await expect(page.locator('#o-que-e-o-prodforge')).toContainText('uso profissional por pessoas com 18 anos ou mais')
      await expect(page.locator('#planos-limites-e-recursos')).toContainText('Excluir uma história salva não repõe o saldo.')
      await expect(page.locator('.privacy-policy-hero__summary-date')).toHaveText(legalRelease.version)
    }
    if (portuguese === '/politica-de-privacidade') {
      await expect(page.locator('#direitos-do-titular')).toContainText('Agência Nacional de Proteção de Dados (ANPD)')
      await expect(page.locator('#cookies-e-tecnologias-similares')).toContainText('Cookies de marketing estão desativados.')
      await expect(page.locator('#quais-dados-podemos-coletar')).toContainText('contagem de gerações e limites da conta')
      await expect(page.locator('.privacy-policy-hero__summary-date')).toHaveText(legalRelease.version)
      await expect(page.locator('#retencao-dos-dados')).toContainText('com o motivo e o prazo aplicável')
      await expect(page.locator('#como-usamos-os-dados')).toContainText('novidades do Pro quando você pedir para recebê-las')
    }
  }

  await page.goto('/preferencias-de-cookies?utm_source=old#privacy-preferences-info-title')
  await expect(page).toHaveURL('/preferencias-de-privacidade?utm_source=old#privacy-preferences-info-title')
  expect(remoteFontRequests).toEqual([])
  expect((await request.get('/fonts/inter/InterVariable.woff2')).status()).toBe(200)
  await page.goto('http://127.0.0.1:4176/en/contact')
  await expect(page).toHaveURL('http://127.0.0.1:4176/')
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)
  await page.goto('http://127.0.0.1:4176/termos-de-uso')
  await expect(page.locator('.privacy-policy-hero__summary-date')).toContainText('2026')
  await expect(page.locator('#planos-limites-e-recursos')).not.toContainText('10 gerações bem-sucedidas')
  await expect(page.locator('#o-que-e-o-prodforge')).not.toContainText('18 anos')
  await expect.poll(() => remoteFontRequests.length).toBeGreaterThan(0)
  expect((await request.get('http://127.0.0.1:4176/revisao-de-textos/')).status()).toBe(404)
  const review = await request.get('/revisao-de-textos/')
  expect(review.ok()).toBe(true)
  const reviewHtml = await review.text()
  expect(reviewHtml).toContain('Base <code>efe7a43</code>')
  expect(reviewHtml).toContain('Confirme o custo previsto para as 10 gerações')
  expect(reviewHtml).toContain('Mapa de bases aprovado para validação dos fluxos.')
  expect(reviewHtml).toContain('Registro de aceite implementado para validação local.')
  await page.goto('/revisao-de-textos/#privacidade')
  await checkWidth(page)
  await page.getByRole('link', { name: 'Planos', exact: true }).click()
  await expect(page).toHaveURL('/revisao-de-textos/#planos')
  await checkWidth(page)
})

test('home mantém rascunho, âncora e validação da lista de interesse ao traduzir', async ({ page, context }, testInfo) => {
  const sent = []
  await context.route((url) => url.origin === 'http://127.0.0.1:54321' && url.pathname === '/rest/v1/leads', async (route) => {
    sent.push(route.request().postDataJSON())
    await route.fulfill({ status: 201, json: [] })
  })
  await page.goto('/?utm_source=demo#lead-capture-title')
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  const plans = page.locator('#planos')
  await expect(plans).toContainText('10 gerações bem-sucedidas e salvas por conta, sem renovação mensal.')
  await expect(plans).toContainText('Edições manuais, falhas e diagnósticos de projeto ficam fora da cota.')
  await expect(plans.locator('.landing-pricing__card--pro .landing-pricing__list')).toHaveCount(0)
  await page.locator('#lead-name').fill('Nome de teste')
  await page.getByRole('button', { name: 'Quero receber novidades do Pro' }).click()
  await expect(page.locator('#lead-email-error')).toHaveText('Informe seu e-mail.')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/en/?utm_source=demo#lead-capture-title')
  await expect(page.locator('#lead-name')).toHaveValue('Nome de teste')
  await expect(page.locator('#lead-email-error')).toHaveText('Enter your email address.')
  await expect(plans).toContainText('10 successful, saved generations per account, with no monthly reset.')
  await expect(plans).toContainText('Manual edits, failed attempts, and project diagnostics are outside this allowance.')
  await expect(plans).toContainText('We are evaluating the Pro plan.')
  if (testInfo.project.name === 'desktop') {
    const freeButton = await plans.getByRole('link', { name: 'Create a free account' }).boundingBox()
    const proButton = await plans.getByRole('link', { name: 'Get Pro updates' }).boundingBox()
    expect(proButton.height).toBeCloseTo(freeButton.height, 0)
  }
  expect(sent).toHaveLength(0)
  await expect(page.getByRole('link', { name: 'See the full learning path' })).toHaveAttribute('href', '/en/learn')
  await page.locator('#lead-email').fill('test@example.test')
  await page.getByRole('button', { name: 'Get Pro updates' }).click()
  await expect(page.getByText('You are on the Pro interest list.')).toBeVisible()
  expect(sent).toEqual([[{ name: 'Nome de teste', email: 'test@example.test' }]])
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.goto('/en/')
  await expect(page.getByRole('heading', { level: 1, name: 'Turn unclear briefs into clear user stories.' })).toBeInViewport()
  await expect.poll(() => page.locator('.hero-transformation-preview__image').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await checkWidth(page)
  await evidence(page, testInfo, 'home-en')
})

test('contato preserva dados e categoria, traduz erro do servidor e envia só por ação explícita', async ({ page, context }) => {
  const sent = []
  await context.route('http://127.0.0.1:54321/functions/v1/contact-message', async (route) => {
    sent.push(route.request().postDataJSON())
    if (sent.length === 1) {
      return route.fulfill({
        status: 400,
        json: { error: 'Validation failed', field_errors: { subject: 'Informe o assunto.' } },
      })
    }
    return route.fulfill({ json: { success: true } })
  })
  await page.goto('/contato?utm_source=demo#formulario-contato')
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  await expect(page.locator('.contact-page__privacy-note')).toContainText('registrar, encaminhar e responder à sua solicitação')
  await page.locator('#contact-name').fill('Nome de teste')
  await page.locator('#contact-email').fill('test@example.test')
  await page.locator('#contact-category').selectOption('privacidade')
  await page.locator('#contact-subject').fill('Assunto de teste')
  await page.locator('#contact-message').fill('Mensagem escrita em português.')
  await page.locator('.contact-page__submit').click()
  await expect(page.locator('#contact-subject-error')).toHaveText('Informe o assunto.')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/en/contact?utm_source=demo#formulario-contato')
  await expect(page.locator('.contact-page__privacy-note')).toContainText('record your request, route it to our team, and respond')
  await expect(page.locator('.contact-page__privacy-note').getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/en/privacy-policy')
  await expect(page.locator('#contact-name')).toHaveValue('Nome de teste')
  await expect(page.locator('#contact-email')).toHaveValue('test@example.test')
  await expect(page.locator('#contact-category')).toHaveValue('privacidade')
  await expect(page.locator('#contact-subject')).toHaveValue('Assunto de teste')
  await expect(page.locator('#contact-message')).toHaveValue('Mensagem escrita em português.')
  await expect(page.locator('#contact-subject-error')).toHaveText('Enter a subject.')
  expect(sent).toHaveLength(1)
  await page.locator('.contact-page__submit').click()
  await expect(page.getByText('Message sent. We will review it and reply to the email address you provided.')).toBeVisible()
  expect(sent).toHaveLength(2)
  expect(sent[1]).toMatchObject({ category: 'privacidade', subject: 'Assunto de teste', message: 'Mensagem escrita em português.' })
})

test('consentimento, alterações pendentes e idioma ficam independentes', async ({ page }, testInfo) => {
  const key = 'prodforge_privacy_consent_preview'
  await page.goto('/en/')
  await expect(page.locator('#privacy-consent-description')).toContainText('With your permission, we use analytics')
  await expect(page.getByRole('button', { name: 'Allow analytics' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage preferences' })).toHaveAttribute('href', '/en/privacy-preferences')
  await page.getByRole('link', { name: 'Manage preferences' }).click()
  await expect(page).toHaveURL('/en/privacy-preferences')
  await expect(page.getByText(/referral sources and campaign parameters/)).toBeVisible()
  await expect(page.locator('#privacy-preferences-marketing')).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'Choose your privacy preferences' })).toHaveCount(0)
  await page.locator('#privacy-preferences-analytics').check()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page).toHaveURL('/preferencias-de-privacidade')
  await expect(page.getByText(/a origem da visita e parâmetros de campanha/)).toBeVisible()
  await expect(page.locator('#privacy-preferences-analytics')).toBeChecked()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull()
  await page.getByRole('button', { name: 'Salvar preferências' }).click()
  await expect(page.getByText('Preferências salvas para este navegador e dispositivo.')).toBeVisible()
  const stored = await page.evaluate((key) => localStorage.getItem(key), key)
  expect(JSON.parse(stored).categories).toEqual({ essential: true, analytics: true, marketing: false })
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('Preferences saved for this browser and device.')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(stored)
  await checkWidth(page)
  await evidence(page, testInfo, 'preferencias-en')
  await page.getByRole('button', { name: 'Reset choice' }).click()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toBeNull()
  await page.getByRole('link', { name: 'Privacy Policy', exact: true }).first().click()
  await expect(page).toHaveURL('/en/privacy-policy')
  await expect(page.getByRole('button', { name: 'Reject optional' })).toBeVisible()
})

test('prévia preserva analytics antigo, bloqueia marketing e isola a redefinição', async ({ page, context }, testInfo) => {
  const legacyKey = 'prodforge_privacy_consent'
  const previewKey = legacyKey + '_preview'
  const legacy = JSON.stringify({ status: 'accepted', version: '2.1' })
  await context.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value)
  }, { key: legacyKey, value: legacy })
  await context.route('http://127.0.0.1:54321/rest/v1/tracking_events', (route) =>
    route.fulfill({ status: 201, json: [] }),
  )

  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/en/privacy-preferences')
  await expect(page.getByText('Analytics allowed', { exact: true }).first()).toBeVisible()
  const marketing = page.locator('#privacy-preferences-marketing')
  await expect(marketing).toBeDisabled()
  await expect(marketing).not.toBeChecked()
  await expect(page.locator('#privacy-preferences-analytics')).toBeChecked()
  expect(await page.evaluate((key) => localStorage.getItem(key), legacyKey)).toBe(legacy)
  expect(await page.evaluate((key) => localStorage.getItem(key), previewKey)).toBeNull()

  await page.getByRole('button', { name: 'Reset choice' }).click()
  await page.goto('/en/')
  const allow = page.getByRole('button', { name: 'Allow analytics' })
  await allow.focus()
  await expect(allow).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(allow).toHaveCount(0)
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), previewKey)).toMatchObject({
    version: '2.2',
    categories: { essential: true, analytics: true, marketing: false },
  })
  expect(await page.evaluate((key) => localStorage.getItem(key), legacyKey)).toBe(legacy)

  await page.goto('/en/privacy-preferences')
  await page.getByRole('button', { name: 'Reject optional' }).click()
  await page.reload()
  await expect(page.locator('#privacy-preferences-analytics')).not.toBeChecked()
  await expect(marketing).not.toBeChecked()
  await checkWidth(page)

  await page.goto('http://127.0.0.1:4176/preferencias-de-privacidade')
  await expect(page.getByRole('button', { name: 'Aceitar todos' })).toBeVisible()
  await expect(marketing).toBeEnabled()
  await expect(marketing).toBeChecked()
})

test('Campo de Treino abre a trilha e os sete guias nos dois idiomas', async ({ page, request }, testInfo) => {
  test.setTimeout(60_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const entries = [
    ['fundamentos-produto-agil', 'agile-product-foundations', 'Agile product foundations for new PMs and POs'],
    ['user-stories-na-pratica', 'user-stories-in-practice', 'User stories in practice'],
    ['backlog-e-refinamento', 'backlog-and-refinement', 'Backlog and refinement without chaos'],
    ['scrum-para-pm-po', 'scrum-for-pms-and-pos', 'Practical Scrum for PMs and POs'],
    ['discovery-leve', 'lightweight-discovery', 'Getting started with lightweight discovery'],
    ['refinamento-e-criterios', 'refinement-and-acceptance-criteria', 'Make refinement meetings count'],
    ['alinhamento-com-stakeholders', 'stakeholder-alignment', 'Stakeholder alignment without the game of telephone'],
  ]
  await page.goto('/aprender?origem=teste#modulos')
  await expect(page.getByRole('heading', { level: 1, name: 'Campo de Treino ProdForge' })).toBeVisible()
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  const selector = page.getByRole('combobox', { name: 'Idioma' })
  await selector.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/en/learn?origem=teste#modulos')
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(page.getByRole('heading', { level: 1, name: 'ProdForge Training Ground' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Learning path modules' }).getByRole('listitem')).toHaveCount(5)
  await expect(page.locator('.learn-apply-block__panel-text strong').first()).toHaveText('persona')
  await expect(page.locator('.quick-notes-strip').getByRole('listitem')).toHaveCount(5)
  await expect(page.getByRole('link', { name: 'Read User stories in practice', exact: true }))
    .toHaveAttribute('href', '/en/learn/user-stories-in-practice')
  await expect(page.getByRole('link', { name: 'Start the learning path' })).toHaveAttribute('href', '/en/learn/agile-product-foundations')
  await page.goto('/en/learn')
  await expect(page.getByRole('heading', { level: 1, name: 'ProdForge Training Ground' })).toBeInViewport()
  await checkWidth(page)
  await evidence(page, testInfo, 'campo-de-treino-en')

  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  for (const [portuguese, english, heading] of entries) {
    const path = '/en/learn/' + english
    const response = await request.get(path)
    const html = await response.text()
    expect(response.ok()).toBe(true)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('content="noindex,follow"')
    expect(html).toContain('property="og:type" content="article"')
    expect(html).toContain('href="https://prodforge.techtupa.com.br' + path + '"')
    expect(html).not.toContain('{{')
    await page.goto(path + '?ref=pt%2Ben#checklist')
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible()
    await expect(page.locator('#checklist li')).toHaveCount(4)
    await expect(page.getByRole('navigation', { name: 'Guide contents' })).toBeVisible()
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())
    expect(schema).toMatchObject({ '@type': 'Article', inLanguage: 'en', headline: heading })
    await expect(page.getByRole('link', { name: 'ProdForge Training Ground' })).toHaveAttribute('href', '/en/learn')
    const nextReads = await page.locator('#proximas-leituras .learning-guide-related__read').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href')),
    )
    expect(nextReads).toHaveLength(2)
    expect(nextReads.every((href) => href.startsWith('/en/learn/'))).toBe(true)
    await checkWidth(page)
    await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
    await expect(page).toHaveURL('/aprender/' + portuguese + '?ref=pt%2Ben#checklist')
    await expect(page.getByRole('heading', { name: 'Use isto antes de seguir' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  }

  await page.goto('/en/learn/lightweight-discovery')
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started with lightweight discovery' })).toBeInViewport()
  await evidence(page, testInfo, 'guia-en')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started with lightweight discovery' })).toBeVisible()
  await page.goto('/scrum-agil?origem=legado#checklist')
  await expect(page).toHaveURL('/aprender/scrum-para-pm-po?origem=legado#checklist')
  await page.goto('/en/learn/unknown?from=old#modulos')
  await expect(page).toHaveURL('/en/learn?from=old#modulos')
  expect(errors).toEqual([])
})

test('o progresso do Campo de Treino usa o mesmo guia ao trocar de idioma', async ({ page, context }) => {
  const guide = 'user-stories-na-pratica'
  const edits = []
  const completed = new Set(['fundamentos-produto-agil'])
  await mockWorkspace(context)
  await context.route((url) => url.origin === 'http://127.0.0.1:54321' && url.pathname === '/rest/v1/learning_progress', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'GET') {
      expect(url.searchParams.get('user_id')).toBe('eq.' + user.id)
      return route.fulfill({ json: [...completed].map((guide_slug) => ({ guide_slug })) })
    }
    if (request.method() === 'POST') {
      const payload = request.postDataJSON()
      edits.push({ method: 'POST', ...payload })
      completed.add(payload.guide_slug)
      return route.fulfill({ status: 201, json: [] })
    }
    const guideSlug = url.searchParams.get('guide_slug').slice(3)
    edits.push({ method: request.method(), guide_slug: guideSlug, user_id: url.searchParams.get('user_id').slice(3) })
    completed.delete(guideSlug)
    return route.fulfill({ status: 204 })
  })
  await page.goto('/times?lang=en')
  await expect(page.locator('.workspace-topbar__link--academy')).toHaveAttribute('href', '/en/learn')
  await page.goto('/aprender/' + guide + '#checklist')
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  await page.getByRole('button', { name: 'Marcar como concluído' }).click()
  await expect(page.getByText('Módulo concluído', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/en/learn/user-stories-in-practice#checklist')
  await expect(page.getByText('Module completed', { exact: true })).toBeVisible()
  await expect.poll(() => edits).toEqual([{ method: 'POST', user_id: user.id, guide_slug: guide }])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Undo completion' })).toBeVisible()
  await page.getByRole('link', { name: 'ProdForge Training Ground', exact: false }).first().click()
  await expect(page).toHaveURL('/en/learn')
  const progress = page.getByRole('progressbar', { name: 'Learning path progress' })
  await expect(progress).toHaveAttribute('aria-valuenow', '2')
  await expect(page.getByText('2 of 5 modules completed')).toBeVisible()
  await page.goBack()
  await page.getByRole('button', { name: 'Undo completion' }).click()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByRole('button', { name: 'Marcar como concluído' })).toBeVisible()
  await expect.poll(() => edits).toEqual([
    { method: 'POST', user_id: user.id, guide_slug: guide },
    { method: 'DELETE', user_id: user.id, guide_slug: guide },
  ])
})

const forgeFixture = {
  title: 'Recuperação de acesso',
  objective: 'Reduzir abandono no acesso.',
  user_story: 'Como cliente, quero recuperar meu acesso pelo celular.',
  acceptance_criteria: ['Enviar link na plataforma correta.', 'Preservar dados existentes.'],
  business_rules: ['Respeitar o prazo informado.'],
  gaps: ['Confirmar as exceções de conta.'],
  qa_checklist: ['Testar link inválido.'],
  notes: 'Validar ressalvas no refinamento.',
  generation_meta: { quality_score: 83 },
}

function savedStory(overrides = {}) {
  return {
    ...forgeFixture,
    id: 'story-2',
    user_id: user.id,
    project_id: 'project-a',
    estimation_status: 'created',
    story_group_id: 'story-group',
    version_number: 2,
    previous_version_id: 'story-1',
    regeneration_instruction: 'Preserve o contexto original.',
    input_context: 'Entrada em português que deve permanecer.',
    input_requirements: 'Validar no celular.',
    created_at: '2026-06-23T14:10:00Z',
    acceptance_criteria: forgeFixture.acceptance_criteria.join('\n'),
    business_rules: forgeFixture.business_rules.join('\n'),
    gaps: forgeFixture.gaps.join('\n'),
    qa_checklist: forgeFixture.qa_checklist.join('\n'),
    status: 'generated',
    ...overrides,
  }
}

async function mockStoryTraffic(context, initialVersions = []) {
  const records = [...initialVersions]
  const writes = []
  const searches = []
  const reads = []
  await mockWorkspace(context)
  await context.route((url) => url.origin === 'http://127.0.0.1:54321' &&
    ['/rest/v1/user_stories', '/rest/v1/rpc/search_user_story_groups', '/rest/v1/rpc/get_story_generation_usage'].includes(url.pathname), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname.endsWith('/get_story_generation_usage')) {
      return route.fulfill({ json: { usage_count: records.length, plan: 'free', effective_limit: 10, forge_limit_override: null } })
    }
    if (url.pathname.endsWith('/search_user_story_groups')) {
      searches.push(request.postDataJSON())
      return route.fulfill({
        json: records.slice(0, 1).map((story) => ({ ...story, total_count: 1301, versions_count: records.length })),
      })
    }
    if (method !== 'GET') {
      writes.push({ method, payload: request.postDataJSON() })
      return route.fulfill({ status: 405 })
    }
    reads.push(method)
    const id = url.searchParams.get('id')
    if (id) {
      const existing = records.find((row) => 'eq.' + row.id === id)
      return route.fulfill(existing ? { json: existing } : { status: 404, json: { message: 'Unknown artifact' } })
    }
    const group = url.searchParams.get('story_group_id')
    return route.fulfill({ json: group ? records.filter((row) => 'eq.' + row.story_group_id === group) : records })
  })
  return { records, writes, searches, reads }
}

function showForgeTab(page, tab) {
  const control = page.locator('.workspace-tabs button').filter({ hasText: tab })
  return control.isVisible().then((visible) => visible ? control.click() : undefined)
}

test('Bancada troca idioma durante geração, traduz erro e grava apenas a ação explícita', async ({ page, context }, testInfo) => {
  test.setTimeout(45_000)
  page.setDefaultTimeout(8000)
  const traffic = await mockStoryTraffic(context, Array.from({ length: 9 }, (_, index) =>
    savedStory({ id: 'previous-' + index, story_group_id: 'group-' + index })))
  const payloads = []
  const releases = []
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await context.route('http://127.0.0.1:54321/functions/v1/generate-user-story', async (route) => {
    const requestIndex = payloads.length
    payloads.push(route.request().postDataJSON())
    if (requestIndex < 2) await new Promise((resolve) => releases.push(resolve))
    if (requestIndex === 0) return route.fulfill({ status: 429, json: { code: 'RATE_LIMIT' } })
    if (requestIndex >= 2) return route.fulfill({ status: 403, json: {
      code: 'QUOTA_EXHAUSTED',
      usage: { usage_count: 10, plan: 'free', effective_limit: 10, forge_limit_override: null },
    } })
    const story = savedStory({
      id: 'generated-1', story_group_id: 'generated-group', version_number: 1,
      previous_version_id: null, input_context: payloads[1].input_context,
    })
    traffic.records.unshift(story)
    return route.fulfill({ json: { ...forgeFixture, story } })
  })

  await page.goto('/tool?projectId=project-a&ref=teste%20local&lang=pt-BR#main-content')
  await expect(page.getByRole('heading', { name: 'Descreva a matéria-prima da story' })).toBeVisible()
  await expect(page.locator('.brief-accordion__body[aria-hidden="true"][inert]')).toHaveCount(2)
  await page.getByRole('button', { name: 'Recuperação de senha' }).click()
  const brief = page.locator('#workspace-context')
  const appliedTemplate = await brief.inputValue()
  expect(appliedTemplate).toContain('Usuários não conseguem')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/tool?projectId=project-a&ref=teste%20local&lang=en#main-content')
  await expect(page.getByText('Story generation is currently in Brazilian Portuguese.')).toBeVisible()
  await expect(brief).toHaveValue(appliedTemplate)
  await expect(page.getByRole('button', { name: 'Password recovery' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')

  const original = 'Contexto de teste para recuperar acesso.'
  await brief.fill(original)
  await page.getByRole('button', { name: 'Forjar primeira versão' }).click()
  await expect.poll(() => releases.length).toBe(1)
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await showForgeTab(page, 'Artifact')
  await expect(page.getByRole('region', { name: 'Generating user story' })).toBeVisible()
  releases[0]()
  await expect(page.getByText(/The generator is busy.*Your brief is still here/)).toBeVisible()
  expect(traffic.writes).toHaveLength(0)
  await showForgeTab(page, 'Workspace')
  await expect(brief).toHaveValue(original)
  await page.getByRole('button', { name: 'Generate first version' }).click()
  await expect.poll(() => releases.length).toBe(2)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  releases[1]()
  await expect.poll(() => traffic.records.length).toBe(10)
  await showForgeTab(page, 'Artefato')
  await expect(page.getByRole('heading', { name: forgeFixture.title })).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('First version saved · inspection 83/100')).toBeVisible()
  await expect(page.locator('.story-document')).toContainText(forgeFixture.user_story)
  await expect(page.locator('.story-document')).toContainText(forgeFixture.acceptance_criteria[0])
  expect(payloads).toHaveLength(2)
  expect(payloads[1]).toEqual({
    input_context: original, input_requirements: expect.any(String), input_adjustment: '',
    request_id: payloads[0].request_id, regeneration_instruction: null,
    project_id: 'project-a', previous_version_id: null,
  })
  expect(payloads[1].request_id).toMatch(/^[a-f0-9-]{36}$/)
  await page.locator('.story-document').getByRole('button', { name: 'Edit', exact: true }).first().click()
  await page.getByRole('textbox', { name: 'Edit user story' }).fill('Rascunho manual em português.')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByRole('textbox', { name: 'Editar user story' })).toHaveValue('Rascunho manual em português.')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByRole('textbox', { name: 'Edit user story' })).toHaveValue('Rascunho manual em português.')
  expect(traffic.writes).toHaveLength(0)
  expect(payloads).toHaveLength(2)
  await page.reload()
  await expect(page.locator('.mode-pill-warning')).toHaveText('0 generations')
  await showForgeTab(page, 'Workspace')
  await brief.fill('A new brief for the eleventh generation.')
  await page.getByRole('button', { name: 'Generate first version' }).click()
  await expect.poll(() => payloads.length).toBe(3)
  await showForgeTab(page, 'Artifact')
  await expect(page.getByText(/You have reached the Free plan limit of 10 saved generations/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Back to story history' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByText(/Você atingiu a cota do plano Free/i).first()).toBeVisible()
  expect(traffic.records).toHaveLength(10)
  expect(traffic.writes).toHaveLength(0)
  expect(runtimeErrors).toEqual([])
  await checkWidth(page)
  await evidence(page, testInfo, 'bancada-cota-pt-br')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'bancada-en')
})

test('Histórico mantém busca, versão, comparação e exportação durante a troca de idioma', async ({ page, context }, testInfo) => {
  test.setTimeout(45_000)
  page.setDefaultTimeout(8000)
  const first = savedStory({
    id: 'story-1', title: 'Primeira estrutura',
    acceptance_criteria: 'Testar apenas no navegador.',
    version_number: 1, previous_version_id: null, regeneration_instruction: null,
  })
  const current = savedStory()
  const traffic = await mockStoryTraffic(context, [current, first])
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await page.addInitScript(() => {
    window.testClipboardWrites = []
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text) => window.testClipboardWrites.push(text) },
    })
  })
  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/historico?projectId=project-a&origem=teste%20local&lang=pt-BR#main-content')
  const search = page.getByRole('searchbox', { name: 'Buscar peça' })
  await search.fill('recuperar acesso')
  await expect.poll(() => traffic.searches.at(-1)?.p_search).toBe('recuperar acesso')
  await expect(page.locator('.history-preview')).toContainText(forgeFixture.user_story)
  await page.getByRole('button', { name: 'Ver versões', exact: true }).click()
  await page.getByRole('button', { name: /V1.*Primeira estrutura/ }).click()
  await expect(page.locator('.history-preview')).toContainText('Primeira estrutura')
  await page.getByRole('button', { name: /V2.*Recuperação de acesso/ }).click()
  const versionDate = page.locator('.version-timeline__meta').first()
  await expect(versionDate).toContainText('23/06')
  await page.getByRole('button', { name: 'Comparação', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resumo do refino', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Entrega', exact: true }).click()
  const preview = page.locator('.history-delivery__preview pre')
  await expect(preview).toContainText('## Critérios de aceite')
  await page.getByRole('button', { name: 'Formato Jira', exact: false }).click()
  await expect(preview).toContainText('h2. Critérios de aceite')
  const before = { reads: traffic.reads.length, searches: traffic.searches.length }
  const selector = page.getByRole('combobox', { name: 'Idioma' })
  await selector.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/historico?projectId=project-a&origem=teste%20local&lang=en#main-content')
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(page.getByRole('searchbox', { name: 'Search artifacts' })).toHaveValue('recuperar acesso')
  await expect(page.getByRole('heading', { name: '1,301 artifacts' })).toBeVisible()
  await expect(versionDate).toContainText('06/23')
  await expect(page.getByRole('button', { name: /V2.*Recuperação de acesso/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Refinement summary', exact: true })).toBeVisible()
  await expect(page.getByText('Title changed', { exact: true })).toBeVisible()
  await expect(page.locator('.version-diff-summary__metrics')).toContainText('item removed')
  await expect(preview).toContainText('h2. Acceptance criteria')
  await expect(preview).toContainText(forgeFixture.user_story)
  await expect(preview).toContainText(forgeFixture.acceptance_criteria[0])
  expect(traffic.reads).toHaveLength(before.reads)
  expect(traffic.searches).toHaveLength(before.searches)
  expect(traffic.writes).toHaveLength(0)
  expect(await page.evaluate(() => window.testClipboardWrites)).toEqual([])
  await page.getByRole('button', { name: 'Copy selected format' }).click()
  await page.getByRole('button', { name: 'Copy comparison' }).click()
  const copies = await page.evaluate(() => window.testClipboardWrites)
  expect(copies).toHaveLength(2)
  expect(copies[0]).toContain('h2. Acceptance criteria')
  expect(copies[0]).toContain(forgeFixture.user_story)
  expect(copies[1]).toContain('# Version comparison')
  expect(copies[1]).toContain('Testar apenas no navegador.')
  await page.getByRole('button', { name: 'Plain text', exact: false }).first().click()
  await expect(preview).toContainText('Acceptance criteria:')
  await expect(preview).toContainText(forgeFixture.user_story)
  await page.getByRole('button', { name: 'Jira format', exact: false }).first().click()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(preview).toContainText('h2. Critérios de aceite')
  await expect(page.getByText('Comparação de versões copiada.', { exact: true })).toBeVisible()
  expect(traffic.writes).toHaveLength(0)
  expect(runtimeErrors).toEqual([])
  await checkWidth(page)
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'historico-en')
  const historyReloaded = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/rest/v1/rpc/search_user_story_groups' &&
    response.request().method() === 'POST' && response.ok())
  await page.reload()
  await historyReloaded
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.history-preview')).toContainText(forgeFixture.user_story)
})

async function checkProjectsLayout(page) {
  await checkWidth(page)
  const clipped = await page.locator(
    '.projects-page > section, .projects-page__list-card, .projects-page__active-filter, ' +
    '.project-detail-page__story-actions, .project-detail-page__kanban',
  ).evaluateAll((sections) => sections.filter((section) => {
    const { left, right } = section.getBoundingClientRect()
    return left < -1 || right > window.innerWidth + 1
  }).map((section) => section.className))
  expect(clipped).toEqual([])
}

const projectFixtureDate = '2026-04-28T13:30:00Z'
const projectStoryTitle = 'Validação de domínio'
const projectDiagnosisSummary = 'Revisar as regras de domínio do cliente.'
const projectPath = '/projetos/project-a'

async function mockProjectDetails(context, { viewer = false, authenticated = true } = {}) {
  const traffic = await mockWorkspace(context, user, { authenticated })
  const owner = viewer ? { id: 'another-user', email: 'admin@example.test' } : user
  let checkout = {
    id: 'project-a', name: 'Checkout', description: 'Pagamentos recorrentes',
    owner_id: owner.id, created_at: projectFixtureDate,
  }
  const catalog = { id: 'project-b', name: 'Catalog', description: 'Produtos', created_at: projectFixtureDate }
  const readyStory = {
    id: 'story-ready', title: projectStoryTitle, estimation_status: 'ready_for_estimation',
    created_at: projectFixtureDate, version_number: 2, input_context: 'Restringir domínios pessoais',
    user_story: 'Como cliente, quero validar meu domínio.',
  }
  const stories = [readyStory, {
    ...readyStory, id: 'story-live', title: 'Confirmação de e-mail', version_number: 1,
  }]
  const board = stories.map((story) => ({
    column_id: 'ready', column_name: 'Prontas para estimar', column_is_default: true,
    column_status_base: 'ready_for_estimation', column_position: 10,
    story_id: story.id, story_title: story.title, story_estimation_status: story.estimation_status,
    story_created_at: story.created_at, story_version_number: story.version_number,
    story_input_context: story.input_context, story_user_story: story.user_story,
  }))
  board.push(
    { column_id: 'custom', column_name: 'Revisão do cliente', column_status_base: 'refining', column_position: 20 },
    { column_id: 'renamed', column_name: 'Entrada da equipe', column_is_default: true, column_status_base: 'created', column_position: 30 },
  )
  const endpoints = [
    'projects', 'can_manage_project', 'list_project_members', 'list_project_kanban_board',
    'planning_poker_sessions', 'planning_poker_session_stories', 'search_user_story_groups',
    'project_ai_diagnostics', 'add_project_member_by_email',
  ]
  let releaseMemberResponse
  const memberResponse = new Promise((resolve) => { releaseMemberResponse = resolve })
  await context.route((url) => url.origin === 'http://127.0.0.1:54321' &&
    endpoints.includes(url.pathname.split('/').at(-1)), async (route) => {
    const request = route.request()
    const { pathname, searchParams } = new URL(request.url())
    const endpoint = pathname.split('/').at(-1)
    const method = request.method()
    const body = request.postDataJSON()
    traffic.push({ pathname, method, body })
    switch (endpoint) {
      case 'projects': {
        if (method === 'PATCH') {
          checkout = { ...checkout, ...body }
          return route.fulfill({ json: checkout })
        }
        const records = [checkout, catalog].filter((item) =>
          !searchParams.has('id') || searchParams.get('id') === 'eq.' + item.id)
        return route.fulfill({ json: records })
      }
      case 'can_manage_project':
        return route.fulfill({ json: !viewer })
      case 'list_project_members':
        return route.fulfill({ json: [
          { user_id: owner.id, email: owner.email, role: 'owner' },
          { user_id: viewer ? user.id : 'project-viewer', email: 'viewer@example.test', role: 'viewer' },
        ] })
      case 'list_project_kanban_board':
        return route.fulfill({ json: board })
      case 'planning_poker_sessions':
        return route.fulfill({ json: [{ id: 'session-a', name: 'Estimativa de abril', status: 'voting' }] })
      case 'planning_poker_session_stories':
        return route.fulfill({ json: [{ session_id: 'session-a', user_story_id: 'story-live', status: 'voting' }] })
      case 'search_user_story_groups': {
        const matching = (body.p_project_id === checkout.id ? stories : [])
          .filter((story) => !body.p_estimation_status || story.estimation_status === body.p_estimation_status)
        return route.fulfill({ json: matching.slice(0, body.p_limit).map((story) => ({
          ...story, total_count: matching.length,
        })) })
      }
      case 'project_ai_diagnostics':
        return route.fulfill({ json: searchParams.get('project_id') === 'eq.project-a' ? [{
          id: 'diagnosis-a', project_id: 'project-a', created_at: projectFixtureDate,
          input_story_count: 1, analyzed_story_count: 1,
          health_label: 'Atenção moderada', summary: projectDiagnosisSummary,
          risks: ['Regras de validação pouco claras.'],
          refinement_questions: ['Quais domínios devem ser aceitos?'],
          next_actions: ['Alinhar regras com o time.'],
          estimation_candidates: [projectStoryTitle],
        }] : [] })
      case 'add_project_member_by_email':
        await memberResponse
        return route.fulfill({ status: 400, json: {
          code: 'P0001', message: 'Usuário não encontrado para esse e-mail.',
        } })
      default:
        return route.abort()
    }
  })
  return { traffic, releaseMemberResponse }
}

test('Projetos preserva busca, filtros e rascunho na troca de idioma', async ({ page, context }, testInfo) => {
  const { traffic } = await mockProjectDetails(context)
  const path = '/projetos?ref=a%20b&ref=c&lang=pt-BR#criar-projeto'
  await page.goto(path)
  const portfolio = page.getByRole('region', { name: 'Lista de projetos' })
  await expect(portfolio.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  const catalog = portfolio.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Catalog' }) })
  await expect(catalog.getByText('0 times', { exact: true })).toBeVisible()
  const ready = portfolio.getByRole('button', { name: 'Prontos para Roda Com histórias prontas.' })
  await ready.click()
  await expect(portfolio.getByRole('heading', { name: 'Catalog' })).toHaveCount(0)
  await portfolio.getByRole('searchbox').fill('pagamentos')
  await portfolio.getByRole('combobox', { name: 'Ordenar projetos' }).selectOption('name')
  await page.getByLabel('Nome do projeto').fill('Novo checkout')
  await page.getByLabel('Descrição Opcional').fill('Contexto da jornada')
  await expect(portfolio.getByText('Desatualizado', { exact: true })).toBeVisible()

  const beforeSwitch = traffic.length
  const language = page.getByRole('combobox', { name: 'Idioma' })
  await language.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(page).toHaveURL('/projetos?ref=a%20b&ref=c&lang=en#criar-projeto')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('Projects · ProdForge')
  await expect(page.getByLabel('Project name')).toHaveValue('Novo checkout')
  await expect(page.getByLabel('Description Optional')).toHaveValue('Contexto da jornada')
  const projectList = page.getByRole('region', { name: 'Project list' })
  await expect(projectList.getByRole('searchbox')).toHaveValue('pagamentos')
  await expect(projectList.getByRole('combobox', { name: 'Sort projects' })).toHaveValue('name')
  await expect(projectList.getByRole('button', { name: 'Ready for Planning Poker With stories ready to estimate.' }))
    .toHaveAttribute('aria-pressed', 'true')
  await expect(projectList.getByText('Outdated', { exact: true })).toBeVisible()
  await expect(projectList.getByText('Pagamentos recorrentes')).toBeVisible()
  const link = projectList.getByRole('link', { name: 'Checkout' })
  await expect(link).toHaveAttribute('href', projectPath + '?lang=en')
  expect(traffic).toHaveLength(beforeSwitch)

  if (testInfo.project.name === 'celular') {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible()
    await page.locator('.workspace-sidebar__close').click()
    await page.setViewportSize({ width: 320, height: 740 })
  }
  await checkProjectsLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeInViewport()
  await evidence(page, testInfo, 'projetos-en')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.goto('/projetos')
  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible()
  await page.goto('/projetos?lang=pt-BR')
  await expect(page.getByRole('heading', { name: 'Seus projetos' })).toBeVisible()
  await page.goto('http://127.0.0.1:4176/projetos?lang=en')
  await expect(page.getByRole('heading', { name: 'Seus projetos' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)
})

test('Detalhe preserva edição, seleção e avisos e localiza quadro e diagnóstico', async ({ page, context }, testInfo) => {
  const { traffic, releaseMemberResponse } = await mockProjectDetails(context)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const suffix = '?ref=a%26b&lang=pt-BR#historias-projeto'
  await page.goto(projectPath + suffix)
  await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible()
  await expect(page.getByText('Responsável pelo projeto', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Prontas para estimar', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Já em Roda ativa' })).toBeDisabled()
  await expect(page.getByText(projectDiagnosisSummary, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Editar projeto', exact: true }).click()
  await page.getByLabel('Nome do projeto').fill('Checkout em revisão')
  await page.getByLabel('Descrição opcional').fill('Rascunho do contexto')
  const boardSection = page.locator('#historias-projeto')
  await boardSection.getByRole('combobox', { name: 'Filtrar status' }).selectOption('ready_for_estimation')
  await expect(boardSection.getByRole('combobox', { name: 'Filtrar status' })).toBeEnabled()
  await page.getByLabel('Buscar no projeto').fill('domínio')
  await page.getByRole('checkbox', { name: 'Selecionar para Roda' }).check()
  const beforeSwitch = traffic.length

  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL(projectPath + suffix.replace('pt-BR', 'en'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByLabel('Project name')).toHaveValue('Checkout em revisão')
  await expect(page.getByLabel('Optional description')).toHaveValue('Rascunho do contexto')
  await expect(page.getByLabel('Search this project')).toHaveValue('domínio')
  await expect(boardSection.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('ready_for_estimation')
  await expect(boardSection.getByRole('heading', { name: projectStoryTitle })).toBeVisible()
  await expect(boardSection.getByRole('heading', { name: 'Ready to estimate', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Select for Planning Poker' })).toBeChecked()
  const sessionLink = page.getByRole('link', { name: 'Open Planning Poker with selected stories' })
  await expect(sessionLink).toHaveAttribute('href', '/roda?projectId=project-a&storyIds=story-ready&lang=en')
  await expect(page.getByRole('heading', { name: 'Project diagnosis', exact: true })).toBeVisible()
  await expect(page.getByText(projectDiagnosisSummary, { exact: true }).first()).toBeVisible()
  expect(traffic).toHaveLength(beforeSwitch)

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy action plan', exact: true }).click()
  await expect(page.getByText('Action plan copied as Markdown.', { exact: true })).toBeVisible()
  const markdown = await page.evaluate(() => navigator.clipboard.readText())
  expect(markdown).toContain('# Project action plan: Checkout')
  expect(markdown).toContain(projectDiagnosisSummary)
  expect(markdown).toContain('1 story added since this diagnosis.')

  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Project updated.', { exact: true })).toBeVisible()
  expect(traffic.filter(({ method }) => method === 'PATCH')).toEqual([
    { pathname: '/rest/v1/projects', method: 'PATCH', body: {
      name: 'Checkout em revisão', description: 'Rascunho do contexto',
    } },
  ])

  await page.getByLabel('Registered email').fill('missing@example.test')
  await page.getByRole('button', { name: 'Add member' }).click()
  const memberCalls = () => traffic.filter(({ pathname }) => pathname.endsWith('/add_project_member_by_email'))
  await expect.poll(() => memberCalls().length).toBe(1)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  releaseMemberResponse()
  await expect(page.getByText('Usuário não encontrado para esse e-mail.', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('No user found for this email address.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Registered email')).toHaveValue('missing@example.test')
  expect(memberCalls()).toHaveLength(1)

  await page.getByLabel('Search this project').clear()
  await boardSection.getByRole('combobox', { name: 'Filter by status' }).selectOption('all')
  await expect(boardSection.getByRole('heading', { name: 'Revisão do cliente' })).toBeVisible()
  await expect(boardSection.getByRole('heading', { name: 'Entrada da equipe' })).toBeVisible()
  await expect(boardSection.getByText('Estimativa de abril · Voting', { exact: true })).toBeVisible()
  await expect(boardSection.getByRole('checkbox', { name: 'Already in an active session' })).toBeDisabled()
  await boardSection.getByRole('button', { name: 'List', exact: true }).click()
  await expect(boardSection.getByRole('heading', { name: projectStoryTitle })).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(boardSection.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(boardSection.getByRole('checkbox', { name: 'Selecionar para Roda' })).toBeChecked()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await boardSection.getByRole('button', { name: 'Board', exact: true }).click()
  await expect(boardSection.getByRole('heading', { name: 'Revisão do cliente' })).toBeVisible()
  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await checkProjectsLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeInViewport()
  await evidence(page, testInfo, 'projeto-en')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Checkout em revisão', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL('/projetos?lang=en')
  expect(errors).toEqual([])
})

test('Link direto do projeto retorna após login e mantém perfil apenas de consulta', async ({ page, context }) => {
  await mockProjectDetails(context, { authenticated: false, viewer: true })
  const destination = projectPath + '?ref=a%2Bb&lang=en#historias-projeto'
  await page.goto(destination)
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('from')).toBe(destination)
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('simulated-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(destination)
  await expect(page.getByText('Project viewer', { exact: true })).toBeVisible()
  await expect(page.getByText('View-only board', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add member', exact: true })).toHaveCount(0)
  await expect(page.getByText('Move card', { exact: true })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByText('Visualizador do projeto', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar projeto', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Adicionar membro', exact: true })).toHaveCount(0)
})

const pokerRoomPath = '/projetos/project-a/roda/poker-a'
const pokerSessionName = 'Estimativas da entrega'
const pokerStoryTitle = 'Validar endereço'
const pokerStoryText = 'Como cliente, quero confirmar meu endereço de entrega.'

async function mockPlanningPoker(context, {
  authenticated = true, initialStatus = 'voting', holdInviteLookup = false,
} = {}) {
  const traffic = await mockWorkspace(context, user, { authenticated })
  const project = { id: 'project-a', name: 'Checkout', owner_id: user.id }
  const baseStory = {
    id: 'checkout-address', title: pokerStoryTitle, user_story: pokerStoryText, estimation_status: 'ready_for_estimation',
    created_at: '2026-08-14T13:00:00Z', total_count: 2,
  }
  const readyStories = [baseStory, { ...baseStory, id: 'checkout-delivery', title: 'Confirmar entrega' }]
  const session = {
    id: 'poker-a', name: pokerSessionName, project_id: project.id, facilitator_id: user.id,
    invite_code: 'CAMPFIRE42', status: initialStatus, scoring_scale: 'fibonacci',
    scoring_values: ['1', '3', '5', '?'], vote_time_limit_seconds: 300, allow_revote: true,
    reveal_votes_after_all: false, allow_abstention: true, allow_observers: true, created_at: baseStory.created_at,
  }
  const roomStory = {
    id: 'round-story', session_id: session.id, user_story_id: baseStory.id,
    status: initialStatus === 'voting' ? 'voting' : 'pending', position: 1, user_story: baseStory,
  }
  const round = {
    id: 'round-a', session_id: session.id, session_story_id: roomStory.id, status: 'voting', round_number: 1,
    started_at: new Date(Date.now() - 30_000).toISOString(), ends_at: new Date(Date.now() + 300_000).toISOString(),
  }
  const participant = { id: 'participant-a', user_id: user.id, role: 'facilitator', status: 'joined' }
  const other = { id: 'participant-b', user_id: 'user-b', display_name: 'Joana', role: 'participant', status: 'joined' }
  const votes = [{ id: 'vote-b', round_id: round.id, participant_id: other.id, vote_kind: 'estimate', vote_value: '5', vote_numeric: 5 }]
  let created = initialStatus !== 'draft'
  let resumeLookup
  const lookupGate = holdInviteLookup ? new Promise((resolve) => { resumeLookup = resolve }) : Promise.resolve()
  const endpoints = new Set([
    'projects', 'search_user_story_groups', 'planning_poker_sessions', 'planning_poker_session_stories',
    'planning_poker_participants', 'planning_poker_rounds', 'planning_poker_vote_status', 'planning_poker_votes',
    'planning_poker_results', 'create_planning_poker_session', 'join_planning_poker_session', 'cast_planning_poker_vote',
    'reveal_planning_poker_round', 'seal_planning_poker_estimate', 'add_project_member_by_email', 'planning-poker-invite',
  ])
  await context.route((url) => url.origin === 'http://127.0.0.1:54321' &&
    endpoints.has(url.pathname.split('/').at(-1)), async (route) => {
    const request = route.request()
    const { pathname, searchParams } = new URL(request.url())
    const endpoint = pathname.split('/').at(-1)
    const body = request.postDataJSON()
    const byCode = searchParams.get('invite_code')
    traffic.push({ pathname, method: request.method(), body, byCode })

    switch (endpoint) {
      case 'projects':
        return route.fulfill({ json: [project] })
      case 'search_user_story_groups':
        return route.fulfill({ json: readyStories })
      case 'planning_poker_sessions':
        if (byCode) await lookupGate
        return route.fulfill({ json: created && (!byCode || byCode === 'eq.' + session.invite_code) ? [session] : [] })
      case 'planning_poker_session_stories':
        return route.fulfill({ json: created ? [roomStory] : [] })
      case 'planning_poker_participants':
        return route.fulfill({ json: [participant, other] })
      case 'planning_poker_rounds':
        return route.fulfill({ json: initialStatus === 'voting' ? [round] : [] })
      case 'planning_poker_vote_status':
        return route.fulfill({ json: votes.map((vote) => ({
          round_id: round.id, participant_id: vote.participant_id,
          user_id: vote.participant_id === participant.id ? user.id : other.user_id, has_voted: true,
        })) })
      case 'planning_poker_votes':
        return route.fulfill({ json: round.status === 'voting' ? [] : votes })
      case 'planning_poker_results':
        return route.fulfill({ json: [] })
      case 'create_planning_poker_session': {
        created = true
        session.name = body.p_name
        session.scoring_scale = body.p_scoring_scale
        session.vote_time_limit_seconds = body.p_vote_time_limit_seconds
        roomStory.user_story = readyStories.find((story) => story.id === body.p_user_story_ids[0])
        roomStory.user_story_id = roomStory.user_story.id
        return route.fulfill({ json: [session] })
      }
      case 'join_planning_poker_session':
        return route.fulfill({ json: [participant] })
      case 'cast_planning_poker_vote':
        votes.push({
          id: 'vote-a', round_id: round.id, participant_id: participant.id,
          vote_kind: body.p_vote_kind, vote_value: body.p_vote_value,
        })
        return route.fulfill({ json: [votes.at(-1)] })
      case 'reveal_planning_poker_round':
        round.status = 'revealed'
        session.status = 'revealed'
        return route.fulfill({ json: [round] })
      case 'seal_planning_poker_estimate':
        roomStory.status = 'estimated'
        roomStory.final_estimate = body.p_final_estimate
        round.status = 'closed'
        session.status = 'completed'
        return route.fulfill({ json: [roomStory] })
      case 'add_project_member_by_email':
        return route.fulfill({ json: [{ user_id: 'invited', email: body.p_email, role: body.p_role }] })
      case 'planning-poker-invite':
        return route.fulfill({ status: 503, json: { success: false, error: 'Falha de envio simulada.' } })
      default:
        return route.abort()
    }
  })

  return {
    traffic,
    calls: (endpoint) => traffic.filter(({ pathname }) => pathname.endsWith('/' + endpoint)),
    resumeLookup,
  }
}

async function checkPokerLayout(page) {
  await checkWidth(page)
  const overflowing = await page.locator(
    '.planning-poker-dashboard > section, .planning-poker-room > section, ' +
    '.planning-poker-room__layout > section, .planning-poker-room__guild, .planning-poker-room__card',
  ).evaluateAll((entries) => entries.filter((entry) => {
    const { left, right } = entry.getBoundingClientRect()
    return left < -1 || right > window.innerWidth + 1
  }).map((entry) => entry.className))
  expect(overflowing).toEqual([])
}

test('Roda mantém regras, busca e seleção editada ao traduzir e cria uma única sessão', async ({ page, context }, testInfo) => {
  const { traffic, calls } = await mockPlanningPoker(context, { initialStatus: 'draft' })
  const path = '/roda?projectId=project-a&storyIds=checkout-address&ref=a%20b&lang=pt-BR#main-content'
  await page.goto(path)
  await expect(page.getByText('História selecionada para criar a Roda.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Buscar histórias', exact: true })
  await search.fill('entrega')
  await page.locator('.project-detail-page__campfire-story-option').filter({ hasText: 'Confirmar entrega' }).getByRole('checkbox').check()
  await page.getByLabel('Nome da Roda').fill(pokerSessionName)
  await page.getByRole('combobox', { name: 'Escala', exact: true }).first().selectOption('tshirt')
  await page.getByRole('combobox', { name: 'Tempo de votação', exact: true }).selectOption('180')
  await page.getByText('Regras avançadas', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'Permitir novo voto' }).uncheck()

  const beforeSwitch = traffic.length
  await page.getByRole('combobox', { name: 'Idioma' }).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(page).toHaveURL(path.replace('pt-BR', 'en'))
  await expect(page).toHaveTitle('Planning Poker · ProdForge')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByLabel('Session name')).toHaveValue(pokerSessionName)
  await expect(page.getByRole('combobox', { name: 'Scale', exact: true }).first()).toHaveValue('tshirt')
  await expect(page.getByRole('combobox', { name: 'Voting time', exact: true })).toHaveValue('180')
  await expect(page.getByRole('checkbox', { name: 'Allow vote changes' })).not.toBeChecked()
  await expect(page.getByRole('searchbox', { name: 'Search stories', exact: true })).toHaveValue('entrega')
  await expect(page.locator('.planning-poker-dashboard__selected-story')).toHaveCount(1)
  await expect(page.locator('.planning-poker-dashboard__selected-story')).toContainText('Confirmar entrega')
  expect(traffic).toHaveLength(beforeSwitch)

  if (testInfo.project.name === 'celular') {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible()
    await page.locator('.workspace-sidebar__close').click()
    await page.setViewportSize({ width: 320, height: 740 })
  }
  await checkPokerLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeInViewport()
  await evidence(page, testInfo, 'roda-en')

  await page.getByRole('button', { name: 'Create Planning Poker session', exact: true }).click()
  await expect(page).toHaveURL(pokerRoomPath + '?lang=en')
  await expect(page.getByRole('heading', { name: pokerSessionName, exact: true, level: 1 })).toBeVisible()
  expect(calls('create_planning_poker_session').map(({ body }) => body)).toEqual([expect.objectContaining({
    p_name: pokerSessionName, p_user_story_ids: ['checkout-delivery'], p_scoring_scale: 'tshirt',
    p_vote_time_limit_seconds: 180, p_allow_revote: false,
  })])
})

test('Sala preserva voto, sigilo, estimativa e convite ao trocar de idioma', async ({ page, context }, testInfo) => {
  const { traffic, calls } = await mockPlanningPoker(context)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const path = pokerRoomPath + '?ref=a%26b&lang=en#main-content'
  await page.goto(path)
  await expect(page.getByRole('button', { name: 'Abstain', exact: true })).toBeEnabled()
  await expect(page.getByText('Votes hidden', { exact: true }).first()).toBeVisible()
  const beforeSwitch = traffic.length
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page).toHaveURL(path.replace('lang=en', 'lang=pt-BR'))
  await expect(page.getByRole('button', { name: 'Abster-se', exact: true })).toBeEnabled()
  expect(traffic).toHaveLength(beforeSwitch)
  expect(calls('join_planning_poker_session')).toHaveLength(1)
  expect(calls('planning_poker_votes')).toHaveLength(0)

  await page.getByRole('button', { name: 'Abster-se', exact: true }).click()
  await expect(page.getByText('Abstenção registrada. Ela fica oculta até a revelação das runas.', { exact: true })).toBeVisible()
  expect(calls('cast_planning_poker_vote').map(({ body }) => body)).toEqual([
    { p_round_id: 'round-a', p_vote_value: 'Abster-se', p_vote_kind: 'abstain' },
  ])
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('Abstention recorded. It stays hidden until the cards are revealed.', { exact: true })).toBeVisible()
  expect(calls('planning_poker_votes')).toHaveLength(0)

  await page.getByRole('button', { name: 'Reveal cards', exact: true }).click()
  await expect(page.getByLabel('Final value')).toBeVisible()
  await expect(page.locator('.planning-poker-room__revealed-votes').getByText('Abstain', { exact: true })).toBeVisible()
  await page.getByLabel('Final value').fill('8')
  await page.getByLabel('Participant email').fill('invitee@example.test')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByLabel('Valor final')).toHaveValue('8')
  await expect(page.getByLabel('E-mail do participante')).toHaveValue('invitee@example.test')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy result', exact: true }).click()
  const result = await page.evaluate(() => navigator.clipboard.readText())
  expect(result).toContain('# Planning Poker result')
  expect(result).toContain(pokerStoryText)
  expect(result).toContain('Abstain')
  await page.getByRole('button', { name: 'Copy link for members', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible()
  const invite = new URL(await page.evaluate(() => navigator.clipboard.readText()))
  expect(invite.pathname + invite.search).toBe('/roda?codigo=CAMPFIRE42&lang=en')
  await page.getByRole('button', { name: 'Add and send invite', exact: true }).click()
  await expect(page.getByText('Participant added. The email could not be sent. Copy the invite and send it manually.', { exact: true }).first()).toBeVisible()
  expect(calls('add_project_member_by_email')).toHaveLength(1)
  expect(calls('planning-poker-invite')).toHaveLength(1)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByText('Participante adicionado, mas o e-mail não foi enviado. Copie o convite e envie manualmente.', { exact: true }).first()).toBeVisible()
  expect(calls('planning-poker-invite')).toHaveLength(1)
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')

  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await checkPokerLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await evidence(page, testInfo, 'sala-en')
  await page.getByRole('button', { name: 'Seal estimate', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Final session summary' })).toBeVisible()
  expect(calls('seal_planning_poker_estimate').map(({ body }) => body)).toEqual([
    { p_session_story_id: 'round-story', p_final_estimate: '8' },
  ])
  expect(calls('cast_planning_poker_vote')).toHaveLength(1)
  expect(calls('reveal_planning_poker_round')).toHaveLength(1)
  expect(calls('join_planning_poker_session')).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.goto('http://127.0.0.1:4176' + pokerRoomPath + '?lang=en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.getByRole('region', { name: 'Resumo final da sessão' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Convite em inglês retorna após login e abre a sala no idioma escolhido durante a busca', async ({ page, context }) => {
  const { traffic, resumeLookup } = await mockPlanningPoker(context, { authenticated: false, holdInviteLookup: true })
  const destination = '/roda?codigo=CAMPFIRE42&ref=a%20b&lang=en#main-content'
  await page.goto(destination)
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('from')).toBe(destination)
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('simulated-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(destination)
  const inviteLookups = () => traffic.filter(({ byCode }) => byCode === 'eq.CAMPFIRE42')
  await expect.poll(() => inviteLookups().length).toBe(1)
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page).toHaveURL(destination.replace('lang=en', 'lang=pt-BR'))
  resumeLookup()
  await expect(page).toHaveURL(pokerRoomPath + '?lang=pt-BR')
  await expect(page.getByRole('heading', { name: pokerSessionName, exact: true, level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revelar as Runas', exact: true })).toBeVisible()
  expect(inviteLookups()).toHaveLength(1)
})

test('Código inacessível mantém convite e traduz o pedido de liberação', async ({ page, context }) => {
  const { traffic, calls } = await mockPlanningPoker(context)
  const path = '/roda?codigo=DESCONHECIDO&ref=a%2Bb&lang=pt-BR#main-content'
  await page.goto(path)
  await expect(page.getByRole('heading', { name: 'Peça liberação ao facilitador' })).toBeVisible()
  const lookups = () => traffic.filter(({ byCode }) => byCode === 'eq.DESCONHECIDO')
  expect(lookups()).toHaveLength(1)
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL(path.replace('pt-BR', 'en'))
  await expect(page.getByRole('heading', { name: 'Request access from the facilitator' })).toBeVisible()
  await expect(page.getByText(/Could not open this invite automatically/)).toBeVisible()
  await page.getByText('Copy manually', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Access request message for manual copying' }))
    .toHaveValue(/My sign-in email is owner@example\.test\.\nSession code: DESCONHECIDO\./)
  expect(lookups()).toHaveLength(1)
  expect(calls('join_planning_poker_session')).toHaveLength(0)
  expect(calls('planning-poker-invite')).toHaveLength(0)
})

const adminPath = '/tool/admin'
const adminFixtureDate = '2026-08-14T13:00:00Z'
const managedEmail = 'review@example.test'
const secondEmail = 'another@example.test'
const adminGuideSlug = 'fundamentos-produto-agil'
const adminArtifactTitle = 'Validação de orçamento'
const adminAcceptanceCriteria = 'Dado um orçamento válido, exibir a confirmação.'

async function mockAdmin(context, {
  authenticated = true, role = 'admin', holdFirstSave = false, failDashboard = false,
} = {}) {
  const traffic = await mockWorkspace(context, user, { authenticated })
  const adminProfile = { id: user.id, email: user.email, plan: 'free', role, created_at: adminFixtureDate }
  let managedProfile = {
    id: 'access-user', email: managedEmail, plan: 'free', role: 'user', forge_limit_override: 10,
    access_notes: 'Nota existente', updated_at: adminFixtureDate, created_at: adminFixtureDate,
  }
  const secondProfile = {
    id: 'second-user', email: secondEmail, plan: 'free', role: 'user',
    forge_limit_override: null, created_at: adminFixtureDate,
  }
  const events = [
    { id: 'event-1', event_name: 'landing_view', user_id: null, page_path: '/', created_at: adminFixtureDate },
    { id: 'event-2', event_name: 'user_story_generate_success', user_id: managedProfile.id, page_path: '/tool', created_at: adminFixtureDate },
    { id: 'event-3', event_name: 'user_story_generate_failed', user_id: managedProfile.id, page_path: '/tool', created_at: adminFixtureDate },
    { id: 'event-4', event_name: 'user_story_generate_failed', user_id: secondProfile.id, page_path: '/tool', created_at: adminFixtureDate },
  ]
  let releaseFirstSave
  const pendingSave = holdFirstSave ? new Promise((resolve) => { releaseFirstSave = resolve }) : Promise.resolve()
  const endpoints = new Set([
    'profiles', 'tracking_events', 'leads', 'user_stories', 'learning_progress',
    'admin_update_user_access', 'admin_get_story_generation_usage',
  ])
  let saveAttempts = 0

  await context.route((url) => url.origin === 'http://127.0.0.1:54321' &&
    endpoints.has(url.pathname.split('/').at(-1)), async (route) => {
    const request = route.request()
    const { pathname, searchParams } = new URL(request.url())
    const endpoint = pathname.split('/').at(-1)
    const method = request.method()
    const body = request.postDataJSON()
    const scope = searchParams.get('id')
    traffic.push({ pathname, method, body, scope })

    if (method === 'HEAD') {
      let count = 2
      if (endpoint === 'leads') {
        count = 1234
      } else if (endpoint === 'profiles' && searchParams.has('created_at')) {
        count = 1
      } else if (endpoint === 'user_stories' && searchParams.has('user_id')) {
        count = searchParams.get('user_id') === 'eq.access-user' ? 9 : 1
      }
      return route.fulfill({ headers: { 'content-range': '*/' + count, 'access-control-expose-headers': 'content-range' } })
    }
    const rows = (data, count = data.length) => {
      const offset = Number(searchParams.get('offset') ?? 0)
      const range = data.length ? offset + '-' + (offset + data.length - 1) : '*'
      return route.fulfill({ headers: {
        'content-range': range + '/' + count, 'access-control-expose-headers': 'content-range',
      }, json: data })
    }
    switch (endpoint) {
      case 'profiles':
        if (scope?.startsWith('eq.')) return rows(scope === 'eq.' + user.id ? [adminProfile] : [])
        if (scope?.startsWith('in.')) return rows([adminProfile, managedProfile, secondProfile])
        return rows([managedProfile, secondProfile].filter((profile) =>
          !searchParams.has('email') || profile.email.includes(searchParams.get('email').replace(/^ilike\.%|%$/g, ''))))
      case 'tracking_events':
        if (failDashboard) return route.fulfill({ status: 500, json: { message: 'Mock unavailable' } })
        return rows(events)
      case 'leads': {
        const secondPage = searchParams.get('offset') === '10'
        const name = secondPage ? 'Ana do Vale' : 'Ana da Silva'
        return rows([{ id: secondPage ? 'lead-b' : 'lead-a', name, email: 'lead@example.test', created_at: adminFixtureDate }], 12)
      }
      case 'user_stories':
        return rows([{
          id: 'admin-artifact', user_id: managedProfile.id, title: adminArtifactTitle,
          status: 'generated', version_number: 2, created_at: adminFixtureDate,
          input_context: 'Validar orçamento antes de finalizar.', acceptance_criteria: adminAcceptanceCriteria,
        }])
      case 'learning_progress':
        return rows([{ id: 'progress-a', user_id: managedProfile.id, guide_slug: adminGuideSlug, completed_at: adminFixtureDate }])
      case 'admin_get_story_generation_usage':
        return route.fulfill({ json: body.p_user_id === managedProfile.id ? 10 : 1 })
      case 'admin_update_user_access':
        saveAttempts += 1
        if (holdFirstSave && saveAttempts === 1) {
          await pendingSave
          return route.fulfill({ status: 400, json: {
            code: 'P0001', message: 'Limite de forjas inválido. Use um número inteiro entre 0 e 9999.',
          } })
        }
        if (body.p_user_id !== managedProfile.id) return route.fulfill({ status: 404 })
        managedProfile = {
          ...managedProfile, plan: body.p_plan, forge_limit_override: body.p_forge_limit_override,
          access_notes: body.p_notes,
        }
        return rows([managedProfile])
      default:
        return route.abort()
    }
  })

  return { traffic, releaseFirstSave }
}

async function checkAdminLayout(page) {
  await checkWidth(page)
  const clipped = await page.locator(
    '.admin-page, .admin-tabs, .admin-table-wrap, .admin-access-modal, .admin-access-modal__actions',
  ).evaluateAll((items) => items.filter((item) => {
    const { left, right } = item.getBoundingClientRect()
    return left < -1 || right > window.innerWidth + 1
  }).map((item) => item.className))
  expect(clipped).toEqual([])
}

test('Administração traduz as seis abas e preserva período, busca e detalhe na troca', async ({ page, context }, testInfo) => {
  const { traffic } = await mockAdmin(context)
  const query = '?ref=a%20b&ref=c&lang=pt-BR#main-content'
  await page.goto('/admin' + query)
  await expect(page).toHaveURL(adminPath + query)
  await expect(page.getByRole('heading', { name: 'Sala de controle da Forja' })).toBeVisible()
  await expect(page.getByText('1.234', { exact: true })).toBeVisible()
  await expect(page.getByText('Cadastros no período: 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Usuários únicos: 2', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Período analisado' }).selectOption('30d')
  await expect(page.getByText('1.234', { exact: true })).toBeVisible()
  const overview = page.getByRole('tab', { name: 'Visão geral' })
  await overview.focus()
  await page.keyboard.press('ArrowRight')
  const leads = page.getByRole('tab', { name: 'Interessados' })
  await expect(leads).toBeFocused()
  await expect(leads).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('cell', { name: 'Ana da Silva' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar interessados' }).fill('Ana')
  await expect(page.getByRole('cell', { name: 'Ana da Silva' })).toBeVisible()
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Ana do Vale' })).toBeVisible()

  const beforeSwitch = traffic.length
  await page.getByRole('combobox', { name: 'Idioma' }).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(adminPath + query.replace('pt-BR', 'en'))
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(page.getByRole('combobox', { name: 'Reporting period' })).toHaveValue('30d')
  await expect(page.getByRole('tab', { name: 'Leads', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('searchbox', { name: 'Search leads' })).toHaveValue('Ana')
  await expect(page.getByText('Page 2 of 2 · 12 records', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Ana do Vale' })).toBeVisible()
  await expect(page.getByRole('cell', { name: /08\/14\/2026/ })).toBeVisible()
  expect(traffic).toHaveLength(beforeSwitch)
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveText(['Overview', 'Leads', 'Users', 'Usage', 'Artifacts', 'Learning'])

  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page.getByText('1,234', { exact: true })).toBeVisible()
  await expect(page.getByText('Sign-ups this period: 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Unique users: 2', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Usage', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Main funnel' })).toBeVisible()
  await expect(page.getByText('66.7%', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('user_story_generate_success', { exact: true }).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Learning', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Completions by guide' })).toBeVisible()
  await expect(page.getByText('Agile product foundations for new PMs and POs', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(adminGuideSlug, { exact: true })).toBeVisible()

  await page.getByRole('tab', { name: 'Artifacts', exact: true }).click()
  await page.getByRole('button', { name: 'View details', exact: true }).click()
  await expect(page.getByRole('heading', { name: adminArtifactTitle })).toBeVisible()
  await expect(page.getByText(adminAcceptanceCriteria)).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByRole('region', { name: 'Detalhe da peça selecionada' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Critérios de aceite' })).toBeVisible()
  await expect(page.getByText(adminAcceptanceCriteria)).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')

  if (testInfo.project.name === 'celular') {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible()
    await page.locator('.workspace-sidebar__close').click()
    await page.setViewportSize({ width: 320, height: 740 })
  }
  await checkAdminLayout(page)
  await page.evaluate(() => scrollTo(0, 0))
  await evidence(page, testInfo, 'admin-en')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await page.goto(adminPath)
  await expect(page.getByRole('heading', { name: 'Forge control room' })).toBeVisible()
  await page.goto('http://127.0.0.1:4176' + adminPath + '?lang=en')
  await expect(page.getByRole('heading', { name: 'Sala de controle da Forja' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)
})

test('Administração mantém o rascunho de acesso e traduz validações sem gravar ao trocar idioma', async ({ page, context }, testInfo) => {
  const { traffic, releaseFirstSave } = await mockAdmin(context, { holdFirstSave: true })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(adminPath + '?lang=pt-BR')
  await page.getByRole('tab', { name: 'Usuários', exact: true }).click()
  const managed = page.getByRole('row').filter({ hasText: managedEmail })
  await managed.getByRole('button', { name: 'Gerenciar', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(managedEmail)).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Plano', exact: true }).selectOption('premium')
  await dialog.getByRole('spinbutton', { name: 'Limite de forjas', exact: true }).fill('11111')
  await dialog.getByRole('textbox', { name: 'Observação administrativa' }).fill('Cota ajustada para homologação')
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Informe um limite inteiro entre 0 e 9.999.')
  await expect(dialog.getByRole('spinbutton', { name: 'Limite de forjas' })).toBeFocused()
  const saves = () => traffic.filter(({ pathname }) => pathname.endsWith('/admin_update_user_access'))
  expect(saves()).toHaveLength(0)

  const beforeSwitch = traffic.length
  const selector = dialog.getByRole('combobox', { name: 'Idioma' })
  await selector.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('combobox', { name: 'Language' })).toBeFocused()
  await expect(dialog).toHaveAccessibleName('Manage access')
  await expect(dialog.getByRole('spinbutton', { name: 'Forge limit' })).toHaveValue('11111')
  await expect(dialog.getByRole('combobox', { name: 'Plan', exact: true })).toHaveValue('premium')
  await expect(dialog.getByRole('textbox', { name: 'Administrative note' })).toHaveValue('Cota ajustada para homologação')
  await expect(dialog.getByRole('alert')).toHaveText('Enter a whole number between 0 and 9,999.')
  expect(traffic).toHaveLength(beforeSwitch)

  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await checkAdminLayout(page)
  expect(await dialog.evaluate((modal) => modal.scrollWidth - modal.clientWidth)).toBeLessThanOrEqual(1)
  await dialog.getByRole('spinbutton', { name: 'Forge limit' }).fill('25')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => saves().length).toBe(1)
  await dialog.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  releaseFirstSave()
  await expect(dialog.getByRole('alert')).toHaveText('Limite de forjas inválido. Use um número inteiro entre 0 e 9.999.')
  await dialog.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(dialog.getByRole('alert')).toHaveText('Invalid forge limit. Enter a whole number between 0 and 9,999.')
  await expect(dialog.getByRole('spinbutton', { name: 'Forge limit' })).toHaveValue('25')
  expect(saves()).toHaveLength(1)

  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByRole('status').filter({ hasText: 'Access updated successfully.' })).toBeVisible()
  expect(saves().map(({ body }) => body)).toEqual(Array(2).fill({
    p_user_id: 'access-user', p_plan: 'premium', p_forge_limit_override: 25, p_notes: 'Cota ajustada para homologação',
  }))
  await dialog.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'admin-acesso-en')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(managed.getByRole('button', { name: 'Manage', exact: true })).toBeFocused()
  await expect(managed.getByRole('cell', { name: 'Pro', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: secondEmail }).getByRole('cell', { name: 'Free', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Administração retorna ao link direto em inglês após o login do administrador', async ({ page, context }) => {
  const { traffic } = await mockAdmin(context, { authenticated: false })
  const target = adminPath + '?ref=a%2Bb&lang=en#main-content'
  await page.goto(target)
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('from')).toBe(target)
  expect(traffic.some(({ pathname }) => pathname.endsWith('/tracking_events'))).toBe(false)
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('simulated-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(target)
  await expect(page.getByRole('heading', { name: 'Forge control room' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
})

test('Administração redireciona a conta sem papel administrador antes de solicitar dados', async ({ page, context }) => {
  const { traffic } = await mockAdmin(context, { role: 'user' })
  await page.goto('/admin?lang=en')
  await expect(page).toHaveURL('/en/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Forge control room' })).toHaveCount(0)

  await page.goto('/admin?lang=pt-BR')
  await expect(page).toHaveURL('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  expect(traffic.some(({ pathname }) => /tracking_events|admin_update_user_access|\/leads$/.test(pathname))).toBe(false)
})

test('Administração traduz falha de carregamento sem repetir a consulta', async ({ page, context }) => {
  const { traffic } = await mockAdmin(context, { failDashboard: true })
  await page.goto(adminPath + '?lang=pt-BR')
  await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar os dados administrativos agora. Verifique as permissões e tente novamente.')
  const before = traffic.length
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByRole('alert')).toHaveText('Could not load administration data. Check your permissions and try again.')
  expect(traffic).toHaveLength(before)
})

test('Links da Bancada preservam o idioma e links logados com barra mantêm o layout', async ({ page, context }) => {
  await mockWorkspace(context)
  const path = '/times/?projectId=project-a&lang=en#main-content'
  await page.goto(path)
  await expect(page).toHaveURL(path)
  await expect(page.locator('.workspace-shell')).toHaveClass(/workspace-shell--forge/)
  await expect(page.getByRole('combobox', { name: 'Project', exact: true })).toHaveValue('project-a')
  await expect(page.locator('.workspace-sidebar__brand')).toHaveAttribute('href', '/tool?lang=en')

  const website = page.getByRole('link', { name: 'Website', exact: true })
  await expect(website).toHaveAttribute('href', '/en/')
  await website.click()
  await expect(page).toHaveURL('/en/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.goto(path.replace('lang=en', 'lang=pt-BR'))
  await expect(page.locator('.workspace-shell')).toHaveClass(/workspace-shell--forge/)
  await expect(page.locator('.workspace-sidebar__brand')).toHaveAttribute('href', '/tool?lang=pt-BR')
  await expect(page.getByRole('link', { name: 'Site', exact: true })).toHaveAttribute('href', '/')
})
