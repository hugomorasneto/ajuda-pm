import { test, expect } from '@playwright/test'
import { publicLocalePages } from '../src/i18n/routes.js'
import release from '../src/content/legalRelease.production.json' with { type: 'json' }

test.beforeEach(async ({ context }) => {
  await context.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort())
})

test('versão pública conserva equivalência, documentos finais e preferências sem expor minutas', async ({ page, request }) => {
  const failures = []
  page.on('pageerror', (error) => failures.push(error.message))
  for (const route of publicLocalePages) {
    await page.goto(route.en)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible()
    await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute('href', 'https://prodforge.techtupa.com.br' + route['pt-BR'])
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', 'https://prodforge.techtupa.com.br' + route.en)
    const html = await (await request.get(route.en)).text()
    expect(html).toContain('hreflang="pt-BR"')
    expect(html).toContain('hreflang="en"')
    if (!['terms', 'privacyPolicy', 'preferences'].includes(route.id)) {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow')
      expect(html).toContain('content="index,follow"')
    }
    if (route.id === 'terms' || route.id === 'privacyPolicy') {
      await expect(page.locator('.privacy-policy-hero__summary-date')).toHaveText(release.version)
      await expect(page.locator('main')).not.toContainText('local validation')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.getByRole('combobox', { name: 'Language' }).selectOption('pt-BR')
    await expect(page).toHaveURL(route['pt-BR'])
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.locator('h1')).toBeVisible()
  }
  const minutas = await request.get('/revisao-de-textos/')
  expect(minutas.status()).toBe(404)
  const deployed = await (await request.get('/release.json')).json()
  expect(deployed.legal).toEqual(release)
  expect(deployed.internationalization).toBe(true)
  expect(deployed.commit).toMatch(/^[a-f0-9]{40}$/)
  expect(failures).toEqual([])
})

test('publicação preserva a escolha anterior de analytics, bloqueia marketing e permite redefinir', async ({ page, context }) => {
  await context.addInitScript(() => {
    if (!localStorage.getItem('prodforge-test-seeded')) {
      localStorage.setItem('prodforge-test-seeded', 'yes')
      localStorage.setItem('prodforge_privacy_consent', JSON.stringify({
        status: 'accepted', version: '2.1', categories: { essential: true, analytics: true, marketing: true },
      }))
    }
  })
  await page.goto('/en/privacy-preferences')
  await expect(page.locator('#privacy-preferences-analytics')).toBeChecked()
  await expect(page.locator('#privacy-preferences-marketing')).not.toBeChecked()
  await expect(page.locator('#privacy-preferences-marketing')).toBeDisabled()
  await page.getByRole('button', { name: 'Reset choice' }).click()
  expect(await page.evaluate(() => localStorage.getItem('prodforge_privacy_consent'))).toBeNull()
  await page.reload()
  await expect(page.locator('#privacy-preferences-analytics')).not.toBeChecked()
  await expect(page.locator('#privacy-preferences-marketing')).toBeDisabled()
})
