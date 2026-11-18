import { SITE_URL } from './aboutMetadata.js'

export function getLearningMetadata(page, language, catalog) {
  const { meta, guides } = catalog
  const guide = guides[page.guideSlug]
  const path = page[language]
  const isEnglish = language === 'en'
  const image = SITE_URL + (isEnglish ? '/web-app-manifest-512x512.png' : '/og-prodforge.png')
  const publisher = {
    '@type': 'Organization',
    name: 'ProdForge',
    url: SITE_URL,
  }

  return {
    language,
    path,
    type: guide ? 'article' : 'website',
    title: guide?.seo.title ?? meta.title,
    description: guide?.seo.description ?? meta.description,
    image,
    imageAlt: meta.imageAlt,
    ...(isEnglish ? { robots: 'noindex,follow', imageWidth: '512', imageHeight: '512' } : { robots: 'index,follow' }),
    jsonLd: guide ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.seo.description,
      articleSection: meta.name,
      inLanguage: language,
      mainEntityOfPage: SITE_URL + path,
      url: SITE_URL + path,
      image,
      author: publisher,
      publisher: { ...publisher, logo: { '@type': 'ImageObject', url: SITE_URL + '/favicon.svg' } },
      datePublished: '2026-05-01',
      dateModified: '2026-05-01',
      abstract: guide.excerpt,
    } : null,
  }
}
