import { useEffect } from 'react'
import { APP_NAME } from '../constants/app'

const SITE_URL = 'https://prodforge.techtupa.com.br'
const DEFAULT_IMAGE_URL = `${SITE_URL}/og-prodforge-workspace.png`
const DEFAULT_IMAGE_ALT =
  'Captura da Bancada do ProdForge com menu lateral, briefing, artefato e inspeção da user story.'

export const ACADEMIA_IMAGE_URL = `${SITE_URL}/og-academia.png`
export const ACADEMIA_IMAGE_ALT =
  'Campo de Treino ProdForge — Trilha prática de product management para PMs e POs iniciantes.'

function upsertMeta(selector, attributeName, attributeValue, content) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attributeName, attributeValue)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function upsertLink(selector, rel, href) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

function upsertStructuredData(jsonLd) {
  const selector = 'script[data-page-metadata="structured-data"]'
  const existingScript = document.head.querySelector(selector)

  if (!jsonLd) {
    if (existingScript) {
      existingScript.remove()
    }
    return
  }

  const script = existingScript ?? document.createElement('script')
  script.setAttribute('type', 'application/ld+json')
  script.setAttribute('data-page-metadata', 'structured-data')
  script.textContent = JSON.stringify(jsonLd)

  if (!existingScript) {
    document.head.appendChild(script)
  }
}

export function usePageMetadata({
  title,
  description,
  path = '/',
  type = 'website',
  image = DEFAULT_IMAGE_URL,
  imageAlt = DEFAULT_IMAGE_ALT,
  ogTitle = title,
  ogDescription = description,
  twitterCard = 'summary_large_image',
  twitterTitle = title,
  twitterDescription = description,
  jsonLd = null,
}) {
  useEffect(() => {
    const url = new URL(path, SITE_URL).toString()

    document.title = title
    upsertMeta('meta[name="description"]', 'name', 'description', description)
    upsertMeta('meta[name="robots"]', 'name', 'robots', 'index,follow')
    upsertLink('link[rel="canonical"]', 'canonical', url)

    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', APP_NAME)
    upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', 'pt_BR')
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription)
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url)
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', image)
    upsertMeta('meta[property="og:image:type"]', 'property', 'og:image:type', 'image/png')
    upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '1200')
    upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', '630')
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', imageAlt)

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', twitterCard)
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', twitterTitle)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', twitterDescription)
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)
    upsertMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', imageAlt)

    upsertStructuredData(jsonLd)
  }, [
    description,
    image,
    imageAlt,
    jsonLd,
    ogDescription,
    ogTitle,
    path,
    title,
    twitterCard,
    twitterDescription,
    twitterTitle,
    type,
  ])
}

export function buildArticleJsonLd({ title, description, path, excerpt, publishedTime }) {
  const url = new URL(path, SITE_URL).toString()

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    articleSection: 'Campo de Treino',
    inLanguage: 'pt-BR',
    mainEntityOfPage: url,
    url,
    image: DEFAULT_IMAGE_URL,
    author: {
      '@type': 'Organization',
      name: APP_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: APP_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    datePublished: publishedTime,
    dateModified: publishedTime,
    abstract: excerpt,
  }
}
