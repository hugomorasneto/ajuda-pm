import portuguese from '../content/pt-BR/publicMetadata.json' with { type: 'json' }
import { getAboutMetadata, SITE_URL } from './aboutMetadata.js'
import { publicLocalePages } from './routes.js'

const types = {
  faq: 'FAQPage',
  contact: 'ContactPage',
  privacyPolicy: 'WebPage',
  preferences: 'WebPage',
  terms: 'WebPage',
}

export function getPublicMetadata(id, language, faqCategories = [], catalog) {
  if (id === 'about') return getAboutMetadata(language, catalog)
  const isEnglish = language === 'en'
  const dictionary = catalog ?? portuguese
  const { name, title, description, ogDescription = description } = dictionary[id]
  const path = publicLocalePages.find((page) => page.id === id)[language]
  const type = types[id]
  const jsonLd = type ? {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    inLanguage: language,
    url: SITE_URL + path,
    isPartOf: { '@type': 'WebSite', name: 'ProdForge', url: SITE_URL + '/' },
    dateModified: ['faq', 'contact'].includes(id) ? '2026-05-05' : '2026-05-06',
  } : null

  if (id === 'faq') {
    jsonLd.mainEntity = faqCategories.flatMap(({ items }) =>
      items.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    )
  }

  return {
    language,
    path,
    title,
    description,
    ogDescription,
    twitterDescription: ogDescription,
    robots: isEnglish || ['privacyPolicy', 'preferences', 'terms'].includes(id) ? 'noindex,follow' : 'index,follow',
    ...(isEnglish ? {
      image: SITE_URL + '/web-app-manifest-512x512.png',
      imageAlt: dictionary.brandAlt,
      imageWidth: '512',
      imageHeight: '512',
    } : {}),
    jsonLd,
  }
}
