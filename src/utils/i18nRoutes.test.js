import { describe, expect, it } from 'vitest'
import { learningGuides } from '../content/learningContent'
import englishLearning from '../content/en/learningEditorial.json'
import { learningRoutes } from '../i18n/learningRoutes'
import { isLocalPreview, languageDestination, localizeHref, preferenceKey, resolveLanguage } from '../i18n/routes'

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
    expect(resolveLanguage({ ...teams, pathname: '/tool/admin', saved: 'en' })).toBe('pt-BR')
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
    expect(languageDestination({ pathname: '/tool/admin' }, 'en')).toBeNull()
  })

  it('localizes project URLs without changing their paths, parameters, or anchors', () => {
    expect(resolveLanguage({ ...teams, pathname: '/projetos', saved: 'en' })).toBe('en')
    expect(resolveLanguage({ ...teams, pathname: '/projetos/123', search: '?lang=pt-BR', saved: 'en' })).toBe('pt-BR')
    expect(localizeHref('/projetos/123?ref=a%20b&ref=c#historias-projeto', 'en'))
      .toBe('/projetos/123?ref=a%20b&ref=c&lang=en#historias-projeto')
    expect(localizeHref('/projetos/123/roda/456', 'en')).toBe('/projetos/123/roda/456?lang=en')
    expect(localizeHref('/roda?codigo=a%2Bb&ref=a&ref=b#sessao', 'en'))
      .toBe('/roda?codigo=a%2Bb&ref=a&ref=b&lang=en#sessao')
  })

  it('maps public links without changing encoded parameters and anchors', () => {
    expect(localizeHref('/#como-funciona', 'en')).toBe('/en/#como-funciona')
    expect(localizeHref('/en/contact?ref=a%26b#formulario-contato', 'pt-BR'))
      .toBe('/contato?ref=a%26b#formulario-contato')
    expect(localizeHref('/aprender/user-stories-na-pratica#checklist', 'en'))
      .toBe('/en/learn/user-stories-in-practice#checklist')
    expect(localizeHref('/aprender/guia-inexistente', 'en')).toBe('/aprender/guia-inexistente')
    expect(localizeHref('/login?from=%2Ftimes&lang=pt-BR', 'en')).toBe('/login?from=%2Ftimes&lang=pt-BR')
    expect(resolveLanguage({ pathname: '/en', enabled: true })).toBe('en')
  })

  it('keeps stable progress IDs for all localized guide paths', () => {
    const guideRoutes = learningRoutes.filter(({ guideSlug }) => guideSlug)
    expect(guideRoutes.map(({ guideSlug }) => guideSlug).sort()).toEqual(learningGuides.map(({ slug }) => slug).sort())
    expect(Object.keys(englishLearning.guides).sort()).toEqual(guideRoutes.map(({ guideSlug }) => guideSlug).sort())
    for (const route of guideRoutes) {
      const ref = '?ref=a%2Bb&ref=c'
      const path = route['pt-BR'] + ref + '#checklist'
      expect(localizeHref(path, 'en')).toBe(route.en + ref + '#checklist')
      expect(localizeHref(route.en + ref + '#checklist', 'pt-BR')).toBe(path)
    }
  })

})
