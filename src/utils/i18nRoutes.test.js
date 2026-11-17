import { describe, expect, it } from 'vitest'
import { isLocalPreview, languageDestination, preferenceKey, resolveLanguage } from '../i18n/routes'

describe('pilot language resolution', () => {
  const teams = { pathname: '/times', search: '', enabled: true }

  it('uses the public route even when preferences and browser disagree', () => {
    expect(resolveLanguage({ ...teams, pathname: '/en/about/', saved: 'pt-BR' })).toBe('en')
    expect(resolveLanguage({ ...teams, pathname: '/sobre', search: '?lang=en', saved: 'en' })).toBe('pt-BR')
  })

  it('limits English to supported pages in the explicit local preview', () => {
    expect(isLocalPreview('i18n-preview', '127.0.0.1')).toBe(true)
    expect(isLocalPreview('i18n-preview', 'prodforge.techtupa.com.br')).toBe(false)
    expect(isLocalPreview('production', '127.0.0.1')).toBe(false)
    expect(resolveLanguage({ ...teams, enabled: false, search: '?lang=en' })).toBe('pt-BR')
    expect(resolveLanguage({ ...teams, pathname: '/login', saved: 'en' })).toBe('en')
    expect(resolveLanguage({ ...teams, pathname: '/projetos', saved: 'en' })).toBe('pt-BR')
  })

  it('uses URL, account, visitor, compatible browser language and default in order', () => {
    expect(resolveLanguage({ ...teams, search: '?lang=pt-BR', saved: 'en' })).toBe('pt-BR')
    expect(resolveLanguage({ ...teams, search: '?lang=de', saved: 'pt-BR', visitor: 'en' })).toBe('pt-BR')
    expect(resolveLanguage({ ...teams, visitor: 'en', browser: ['pt-PT'] })).toBe('en')
    expect(resolveLanguage({ ...teams, browser: ['fr', 'en-GB'] })).toBe('en')
    expect(resolveLanguage({ ...teams, browser: ['fr'] })).toBe('pt-BR')
    expect(new Set([preferenceKey('a'), preferenceKey('b'), preferenceKey()]).size).toBe(3)
  })

  it('preserves encoded and repeated parameters and the anchor', () => {
    const about = { pathname: '/sobre/', search: '?utm_source=a%20b', hash: '#nossa-visao' }
    expect(languageDestination(about, 'en')).toEqual({ ...about, pathname: '/en/about' })
    expect(languageDestination({
      ...about, pathname: '/times', search: '?x=a%20b&projectId=123&x=c&lang=pt-BR',
    }, 'en')).toEqual({
      ...about, pathname: '/times', search: '?x=a%20b&projectId=123&x=c&lang=en',
    })
    expect(languageDestination({ pathname: '/login', search: '?from=%2Froda%3Fcodigo%3DABC' }, 'en').search)
      .toBe('?from=%2Froda%3Fcodigo%3DABC&lang=en')
    expect(languageDestination({ pathname: '/projetos' }, 'en')).toBeNull()
  })
})
