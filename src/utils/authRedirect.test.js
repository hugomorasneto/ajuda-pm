import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  buildAuthPath,
  clearAuthRedirect,
  getAuthContinuation,
  getAuthDestinationLanguage,
  getAuthRedirectContext,
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

  it('lê o destino da query e permite salvar para a etapa de confirmação', () => {
    const store = installSessionStorage()
    const redirect = getAuthRedirectFromLocation({
      pathname: '/login',
      search: '?from=%2Froda%3Fcodigo%3DABC123',
    })

    expect(redirect).toBe('/roda?codigo=ABC123')
    persistAuthRedirect(redirect)
    expect([...store.values()]).toContain('/roda?codigo=ABC123')
  })

  it('recupera o destino salvo quando a página de confirmação é recarregada', () => {
    installSessionStorage()
    persistAuthRedirect('/roda?codigo=ABC123')

    expect(getAuthRedirectFromLocation({ pathname: '/check-email', search: '' })).toBe('/roda?codigo=ABC123')
  })

  it('escolhe a Bancada em um login sem convite e limpa o destino ao persistir essa escolha', () => {
    installSessionStorage()
    persistAuthRedirect('/roda?codigo=ABC123')

    const target = getAuthRedirectFromLocation({ pathname: '/login', search: '' })
    expect(target).toBe(DEFAULT_AUTH_REDIRECT_PATH)
    persistAuthRedirect(target)
    expect(getAuthRedirectFromLocation({ pathname: '/check-email', search: '' })).toBe(DEFAULT_AUTH_REDIRECT_PATH)
    clearAuthRedirect()
  })


  it('classifica o contexto sem acoplar os fluxos aos textos da interface', () => {
    expect(getAuthRedirectContext('/roda?codigo=ABC123')).toBe('planning')
    expect(getAuthRedirectContext('/projetos/123/roda/456')).toBe('planning')
    expect(getAuthRedirectContext('/projetos/123')).toBe('project')
    expect(getAuthRedirectContext('/tool/admin')).toBe('admin')
    expect(getAuthRedirectContext('https://example.com/roda')).toBe('workspace')
  })

  it('preserva a codificação do destino e propaga o idioma para Times e Roda', () => {
    const from = '/times?projectId=p&ref=a%26b%23c&lang=en#main-content'
    const path = buildAuthPath('/login', from, 'pt-BR')
    const search = path.slice(path.indexOf('?'))
    expect(getAuthRedirectFromLocation({ pathname: '/login', search })).toBe(from)
    expect(getAuthDestinationLanguage(from)).toBe('en')
    expect(getAuthContinuation(from, 'en')).toBe(from)
    expect(getAuthContinuation(from, 'pt-BR')).toBe(from.replace('lang=en', 'lang=pt-BR'))
    const invite = '/roda?codigo=a%2Fb%26c#sessao'
    expect(getAuthContinuation(invite, 'en')).toBe('/roda?codigo=a%2Fb%26c&lang=en#sessao')
    expect(getAuthContinuation('/tool/admin?ref=a%20b#main-content', 'en'))
      .toBe('/tool/admin?ref=a%20b&lang=en#main-content')
  })

  it('mantém o destino explícito quando sessionStorage está indisponível', () => {
    vi.stubGlobal('window', {
      get sessionStorage() { throw new Error('Storage blocked') },
    })
    const from = '/roda?codigo=abc'
    expect(() => persistAuthRedirect(from)).not.toThrow()
    expect(getAuthRedirectFromLocation({ pathname: '/check-email', search: '?from=%2Froda%3Fcodigo%3Dabc' })).toBe(from)
    expect(getAuthRedirectFromLocation({ pathname: '/check-email/', search: '' })).toBe(DEFAULT_AUTH_REDIRECT_PATH)
  })
})
