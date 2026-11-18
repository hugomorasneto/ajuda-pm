import { getOgLocale, getPilotPage, RELEASE_MODE } from '../i18n/routes'
import { useEffect } from 'react'
import { APP_NAME } from '../constants/app'

const SITE_URL = 'https://prodforge.techtupa.com.br'
const DEFAULT_IMAGE_URL = `${SITE_URL}/og-prodforge.png`
const DEFAULT_IMAGE_ALT =
  'Preview do ProdForge, workspace de IA para transformar briefings confusos em user stories claras.'

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
  enabled = true,
  language = 'pt-BR',
  description,
  path = '/',
  type = 'website',
  image = DEFAULT_IMAGE_URL,
  imageAlt = DEFAULT_IMAGE_ALT,
  imageWidth = '1200',
  imageHeight = '630',
  ogTitle = title,
  ogDescription = description,
  twitterCard = 'summary_large_image',
  twitterTitle = title,
  twitterDescription = description,
  robots = 'index,follow',
  jsonLd = null,
}) {
  useEffect(() => {
    if (!enabled) return
    const url = new URL(path, SITE_URL).toString()
    const page = import.meta.env.MODE === RELEASE_MODE ? getPilotPage(path) : undefined
    const isIndexable = page?.en && !['terms', 'privacyPolicy', 'preferences'].includes(page.id)
    document.head.querySelectorAll('link[data-i18n-alternate]').forEach((link) => link.remove())
    if (page?.en) {
      for (const lang of ['pt-BR', 'en', 'x-default']) {
        const link = document.createElement('link')
        link.rel = 'alternate'
        link.hreflang = lang
        link.href = SITE_URL + page[lang === 'x-default' ? 'pt-BR' : lang]
        link.setAttribute('data-i18n-alternate', '')
        document.head.appendChild(link)
      }
    }

    document.title = title
    upsertMeta('meta[name="description"]', 'name', 'description', description)
    upsertMeta('meta[name="robots"]', 'name', 'robots', isIndexable ? 'index,follow' : robots)
    upsertLink('link[rel="canonical"]', 'canonical', url)

    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', APP_NAME)
    upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', getOgLocale(language))
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription)
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url)
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', image)
    upsertMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', image)
    upsertMeta('meta[property="og:image:type"]', 'property', 'og:image:type', 'image/png')
    upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', imageWidth)
    upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', imageHeight)
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', imageAlt)

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', twitterCard)
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', twitterTitle)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', twitterDescription)
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)
    upsertMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', imageAlt)

    upsertStructuredData(jsonLd)
  }, [
    description,
    enabled,
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    jsonLd,
    language,
    ogDescription,
    ogTitle,
    path,
    robots,
    title,
    twitterCard,
    twitterDescription,
    twitterTitle,
    type,
  ])
}
