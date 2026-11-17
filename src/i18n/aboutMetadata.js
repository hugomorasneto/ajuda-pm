import portuguese from '../content/pt-BR/aboutMetadata.json' with { type: 'json' }
import english from '../content/en/aboutMetadata.json' with { type: 'json' }
import { getPilotPage } from './routes.js'

export const SITE_URL = 'https://prodforge.techtupa.com.br'

export function getAboutMetadata(language) {
  const { name, title, description, imageAlt } = language === 'en' ? english : portuguese
  const path = getPilotPage('/sobre')[language]
  return {
    language,
    title,
    description,
    path,
    image: SITE_URL + '/og-prodforge-workspace.png',
    imageAlt,
    robots: language === 'en' ? 'noindex,follow' : 'index,follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name,
      description,
      inLanguage: language,
      url: SITE_URL + path,
      isPartOf: {
        '@type': 'WebSite',
        name: 'ProdForge',
        url: SITE_URL + '/',
      },
      dateModified: '2026-05-05',
    },
  }
}
