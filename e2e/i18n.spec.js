import { expect, test } from '@playwright/test'

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
  await expect(page).toHaveURL('/projetos')
  await expect(page).toHaveTitle('Projetos · ProdForge')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.locator('.language-switcher option[value="en"]')).toBeDisabled()

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

test('cadastro e confirmação preservam o destino codificado e permitem reenviar sem sair da tela', async ({ page, context }, testInfo) => {
  const traffic = await mockWorkspace(context, user, { authenticated: false, resendFailsFirst: true })
  const from = '/times?projectId=project-b&ref=a%26b%23c#main-content'
  await page.goto(authLink('/signup', from, 'pt-BR'))
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  await page.getByLabel('E-mail', { exact: true }).fill(user.email)
  await page.locator('input[type="password"]').fill('short')
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await expect(page.getByText('Use pelo menos 6 caracteres.')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeFocused()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('Use at least 6 characters.', { exact: true })).toBeVisible()
  await expect(page.locator('#uso-de-dados').getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/en/terms-of-use')
  await expect(page.locator('input[type="password"]')).toHaveValue('short')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(user.email)
  await expect(page).toHaveTitle('Create a ProdForge account')
  await page.locator('input[type="password"]').fill('test-password')
  if (testInfo.project.name === 'celular') await page.setViewportSize({ width: 320, height: 740 })
  await checkWidth(page)
  await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
  await evidence(page, testInfo, 'cadastro-en')
  await page.getByRole('button', { name: 'Create a free account' }).click()
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

test('rotas públicas abrem diretamente nos dois idiomas com metadados e vínculos equivalentes', async ({ page, request }, testInfo) => {
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
    if (english === '/en/faq') {
      const schema = page.locator('script[type="application/ld+json"]')
      await expect(schema).toHaveCount(1)
      expect(JSON.parse(await schema.textContent()).mainEntity.length).toBeGreaterThan(5)
    }
    if (english === '/en/terms-of-use' && testInfo.project.name === 'celular') {
      await page.setViewportSize({ width: 320, height: 740 })
      await checkWidth(page)
      await page.getByRole('combobox', { name: 'Language' }).scrollIntoViewIfNeeded()
      await evidence(page, testInfo, 'termos-en')
    }
    await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
    await expect(page).toHaveURL(portuguese)
    await expect(page.getByRole('heading', { level: 1, name: ptHeading, exact: true })).toBeVisible()
  }

  await page.goto('/preferencias-de-cookies?utm_source=old#privacy-preferences-info-title')
  await expect(page).toHaveURL('/preferencias-de-privacidade?utm_source=old#privacy-preferences-info-title')
  await page.goto('http://127.0.0.1:4176/en/contact')
  await expect(page).toHaveURL('http://127.0.0.1:4176/')
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveCount(0)
})

test('home mantém rascunho, âncora e validação da lista de interesse ao traduzir', async ({ page, context }, testInfo) => {
  const sent = []
  await context.route((url) => url.origin === 'http://127.0.0.1:54321' && url.pathname === '/rest/v1/leads', async (route) => {
    sent.push(route.request().postDataJSON())
    await route.fulfill({ status: 201, json: [] })
  })
  await page.goto('/?utm_source=demo#lead-capture-title')
  await page.getByRole('button', { name: 'Recusar opcionais' }).click()
  await page.locator('#lead-name').fill('Nome de teste')
  await page.getByRole('button', { name: 'Avise quando abrir' }).click()
  await expect(page.locator('#lead-email-error')).toHaveText('Informe seu e-mail.')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/en/?utm_source=demo#lead-capture-title')
  await expect(page.locator('#lead-name')).toHaveValue('Nome de teste')
  await expect(page.locator('#lead-email-error')).toHaveText('Enter your email address.')
  expect(sent).toHaveLength(0)
  await expect(page.getByRole('link', { name: 'See the full learning path' })).toHaveAttribute('href', '/en/learn')
  await page.locator('#lead-email').fill('test@example.test')
  await page.getByRole('button', { name: 'Notify me when it opens' }).click()
  await expect(page.getByText('You are on the list. We will let you know when there are updates.')).toBeVisible()
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
  await page.locator('#contact-name').fill('Nome de teste')
  await page.locator('#contact-email').fill('test@example.test')
  await page.locator('#contact-category').selectOption('privacidade')
  await page.locator('#contact-subject').fill('Assunto de teste')
  await page.locator('#contact-message').fill('Mensagem escrita em português.')
  await page.locator('.contact-page__submit').click()
  await expect(page.locator('#contact-subject-error')).toHaveText('Informe o assunto.')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page).toHaveURL('/en/contact?utm_source=demo#formulario-contato')
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
  const key = 'prodforge_privacy_consent'
  await page.goto('/en/')
  await expect(page.getByRole('link', { name: 'Manage preferences' })).toHaveAttribute('href', '/en/privacy-preferences')
  await page.getByRole('link', { name: 'Manage preferences' }).click()
  await expect(page).toHaveURL('/en/privacy-preferences')
  await expect(page.getByRole('heading', { name: 'Control optional data' })).toHaveCount(0)
  await page.locator('#privacy-preferences-analytics').check()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page).toHaveURL('/preferencias-de-privacidade')
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
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull()
  await page.getByRole('link', { name: 'Privacy Policy', exact: true }).first().click()
  await expect(page).toHaveURL('/en/privacy-policy')
  await expect(page.getByRole('button', { name: 'Reject optional' })).toBeVisible()
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
    ['/rest/v1/user_stories', '/rest/v1/rpc/search_user_story_groups'].includes(url.pathname), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (url.pathname.endsWith('/search_user_story_groups')) {
      searches.push(request.postDataJSON())
      return route.fulfill({
        json: records.slice(0, 1).map((story) => ({ ...story, total_count: 1301, versions_count: records.length })),
      })
    }
    if (method === 'HEAD') {
      reads.push(method)
      return route.fulfill({ status: 200, headers: { 'content-range': '*/' + records.length } })
    }
    if (method === 'POST') {
      const [payload] = request.postDataJSON()
      writes.push(payload)
      const story = { ...payload, id: 'generated-' + writes.length, estimation_status: 'created' }
      records.unshift(story)
      return route.fulfill({ status: 201, json: [story] })
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
  const traffic = await mockStoryTraffic(context)
  const payloads = []
  const releases = []
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await context.route('http://127.0.0.1:54321/functions/v1/generate-user-story', async (route) => {
    const requestIndex = payloads.length
    payloads.push(route.request().postDataJSON())
    await new Promise((resolve) => releases.push(resolve))
    await route.fulfill(requestIndex === 0
      ? { status: 429, json: { message: 'Mensagem do provedor em português.' } }
      : { json: forgeFixture })
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
  await expect.poll(() => traffic.writes.length).toBe(1)
  await showForgeTab(page, 'Artefato')
  await expect(page.getByRole('heading', { name: forgeFixture.title })).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByText('First version saved · inspection 83/100')).toBeVisible()
  await expect(page.locator('.story-document')).toContainText(forgeFixture.user_story)
  await expect(page.locator('.story-document')).toContainText(forgeFixture.acceptance_criteria[0])
  expect(payloads).toHaveLength(2)
  expect(payloads[1]).toEqual({ input_context: original, input_requirements: expect.any(String), input_adjustment: '' })
  expect(traffic.writes[0]).toMatchObject({ title: forgeFixture.title, user_story: forgeFixture.user_story, project_id: 'project-a', version_number: 1 })
  expect(traffic.writes[0]).not.toHaveProperty('output_language')
  await page.locator('.story-document').getByRole('button', { name: 'Edit', exact: true }).first().click()
  await page.getByRole('textbox', { name: 'Edit user story' }).fill('Rascunho manual em português.')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
  await expect(page.getByRole('textbox', { name: 'Editar user story' })).toHaveValue('Rascunho manual em português.')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByRole('textbox', { name: 'Edit user story' })).toHaveValue('Rascunho manual em português.')
  expect(traffic.writes).toHaveLength(1)
  expect(payloads).toHaveLength(2)
  expect(runtimeErrors).toEqual([])
  await checkWidth(page)
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
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.history-preview')).toContainText(forgeFixture.user_story)
})
