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
  await expect(page.locator('#uso-de-dados').getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/termos-de-uso')
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
