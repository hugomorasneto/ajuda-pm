import portuguese from '../content/pt-BR/aboutMetadata.json' with { type: 'json' }
import { getPilotPage } from './routes.js'

export const SITE_URL = 'https://prodforge.techtupa.com.br'

export function getAboutMetadata(language, catalog = portuguese) {
  const { name, title, description, imageAlt, brandAlt } = catalog
  const path = getPilotPage('/sobre')[language]
  return {
    language,
    title,
    description,
    path,
    ...(language === 'en' ? {
      image: SITE_URL + '/web-app-manifest-512x512.png',
      imageAlt: brandAlt,
      imageWidth: '512',
      imageHeight: '512',
    } : { image: SITE_URL + '/og-prodforge-workspace.png', imageAlt }),
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
