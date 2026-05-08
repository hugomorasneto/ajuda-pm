import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  buildAuthPath,
  clearAuthRedirect,
  getAuthRedirectFromLocation,
  normalizeAuthRedirect,
  persistAuthRedirect,
} from './authRedirect'

function installSessionStorage() {
  const store = new Map()

  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      removeItem: (key) => {
        store.delete(key)
      },
      setItem: (key, value) => {
        store.set(key, String(value))
      },
    },
  })

  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authRedirect', () => {
  it('normaliza apenas caminhos internos seguros', () => {
    expect(normalizeAuthRedirect('/roda?codigo=ABC123')).toBe('/roda?codigo=ABC123')
    expect(normalizeAuthRedirect('https://example.com/roda')).toBe(DEFAULT_AUTH_REDIRECT_PATH)
    expect(normalizeAuthRedirect('//example.com/roda')).toBe(DEFAULT_AUTH_REDIRECT_PATH)
    expect(normalizeAuthRedirect('javascript:alert(1)')).toBe(DEFAULT_AUTH_REDIRECT_PATH)
  })

  it('monta caminhos de autenticação com destino preservado na URL', () => {
    expect(buildAuthPath('/login', '/projetos/123/roda/456')).toBe(
      '/login?from=%2Fprojetos%2F123%2Froda%2F456',
    )
  })

  it('lê o destino da query e salva para a etapa de confirmação', () => {
    const store = installSessionStorage()
    const redirect = getAuthRedirectFromLocation({
      pathname: '/login',
      search: '?from=%2Froda%3Fcodigo%3DABC123',
    })

    expect(redirect).toBe('/roda?codigo=ABC123')
    expect([...store.values()]).toContain('/roda?codigo=ABC123')
  })

  it('recupera o destino salvo quando a página de confirmação é recarregada', () => {
    installSessionStorage()
    persistAuthRedirect('/roda?codigo=ABC123')

    expect(getAuthRedirectFromLocation({ pathname: '/check-email', search: '' })).toBe('/roda?codigo=ABC123')
  })

  it('limpa destino antigo ao abrir login sem convite explícito', () => {
    installSessionStorage()
    persistAuthRedirect('/roda?codigo=ABC123')

    expect(getAuthRedirectFromLocation({ pathname: '/login', search: '' })).toBe(DEFAULT_AUTH_REDIRECT_PATH)
    expect(getAuthRedirectFromLocation({ pathname: '/check-email', search: '' })).toBe(DEFAULT_AUTH_REDIRECT_PATH)

    clearAuthRedirect()
  })
})
