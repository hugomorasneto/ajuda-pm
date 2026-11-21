import { afterEach, describe, expect, it, vi } from 'vitest'
const { signUp, resend } = vi.hoisted(() => ({ signUp: vi.fn(), resend: vi.fn() }))
vi.mock('../lib/supabaseClient', () => ({ supabase: { auth: { signUp, resend } } }))
import { signUpWithEmail, resendSignupConfirmation } from './authService'
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('auth email requests', () => {
  it('registra somente idioma válido e preserva a asserção legal no cadastro', async () => {
    vi.stubGlobal('window', { location: { hostname: 'prodforge.techtupa.com.br', origin: 'https://prodforge.techtupa.com.br' } })
    const legalAcceptance = { version: 'fictional', language: 'en' }
    await signUpWithEmail({ email: 'qa@example.test', password: 'fictional', language: 'en', legalAcceptance, redirectTo: '/check-email?lang=en&from=%2Ftimes' })
    expect(signUp).toHaveBeenCalledWith({ email: 'qa@example.test', password: 'fictional', options: {
      emailRedirectTo: 'https://prodforge.techtupa.com.br/check-email?lang=en&from=%2Ftimes',
      data: { prodforge_email_language: 'en', prodforge_legal_acceptance: legalAcceptance },
    } })
    await signUpWithEmail({ language: 'fr' })
    expect(signUp.mock.lastCall[0].options.data.prodforge_email_language).toBe('pt-BR')
  })
  it('o reenvio conserva o destino e não altera os metadados da conta', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost:5173' } })
    const redirectTo = '/check-email?lang=pt-BR&from=%2Ftimes%3Fref%3Da%2526b%2523c%23main-content'
    await resendSignupConfirmation('qa@example.test', redirectTo)
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'qa@example.test', options: { emailRedirectTo: 'http://localhost:5173' + redirectTo } })
  })
})
