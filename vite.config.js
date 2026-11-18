import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import productionLegalRelease from './src/content/legalRelease.production.json'
import englishAbout from './src/content/en/aboutMetadata.json'
import englishFaq from './src/content/en/faqPage.i18n.json'
import englishLearning from './src/content/en/learningEditorial.json'
import portugueseLearning from './src/content/pt-BR/learningEditorial.json'
import { getLearningMetadata } from './src/i18n/learningMetadata.js'
import { learningRoutes } from './src/i18n/learningRoutes.js'
import englishMetadata from './src/content/en/publicMetadata.json'
import { getFaqCategories } from './src/content/faqData.js'
import { getPublicMetadata } from './src/i18n/publicMetadata.js'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { SITE_URL } from './src/i18n/aboutMetadata.js'
import { getOgLocale, getPilotPage, isLanguageBuild, PILOT_MODE, RELEASE_MODE, publicLocalePages } from './src/i18n/routes.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const generatedPortugueseEntries = new Set(['refinamento-e-criterios', 'alinhamento-com-stakeholders'])

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const copyReviewDirectory = 'revisao-de-textos'

function isCopyReviewRequest(pathname) {
  try {
    const [, directory, ...segments] = decodeURIComponent(pathname).replaceAll('\\', '/').toLowerCase().split('/')
    return directory === copyReviewDirectory || (directory === '@fs' && segments.includes(copyReviewDirectory))
  } catch {
    return false
  }
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function publicReleaseMetadata(html, page, mode) {
  if (mode !== RELEASE_MODE || !page?.en) return html
  const indexable = !['terms', 'privacyPolicy', 'preferences'].includes(page.id)
  const alternate = ['pt-BR', 'en', 'x-default'].map((language) =>
    `<link rel="alternate" hreflang="${language}" href="${SITE_URL + page[language === 'x-default' ? 'pt-BR' : language]}" data-i18n-alternate />`).join('\n')
  const output = indexable ? html.replace(/(<meta name="robots" content=")[^"]*(")/, '$1index,follow$2') : html
  return output.replace('</head>', alternate + '\n</head>')
}

function publicMetadataPlugin(mode) {
  function servePublicEntry(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url, 'http://localhost')
      if (mode !== PILOT_MODE && isCopyReviewRequest(url.pathname)) {
        response.statusCode = 404
        response.end()
        return
      }

      const page = getPilotPage(url.pathname)
      if (page?.en) {
        const isEnglish = /^\/en(?:\/|$)/.test(url.pathname)
        const path = isEnglish && isLanguageBuild(mode) ? page.en : page['pt-BR']
        request.url = path.replace(/\/$/, '') + '/index.html' + url.search
      }
      next()
    })
  }

  return {
    name: 'prodforge-public-metadata',
    configureServer: servePublicEntry,
    configurePreviewServer: servePublicEntry,
    transformIndexHtml: {
      order: 'pre',
      handler(html, { path }) {
        const route = path.replace(/\/index\.html$/, '').replace(/\/$/, '')
        const page = getPilotPage(route)
        const isEnglish = isLanguageBuild(mode) && /^\/en(?:\/|$)/.test(route)
        const generatedPortuguese = generatedPortugueseEntries.has(page?.guideSlug)
        if (!page?.en || (!isEnglish && page.id !== 'about' && !generatedPortuguese)) return publicReleaseMetadata(html, page, mode)

        const language = isEnglish ? 'en' : 'pt-BR'
        const faq = page.id === 'faq' ? getFaqCategories((key) => englishFaq[key]) : undefined
        const catalog = page.id === 'about' ? englishAbout : englishMetadata
        const metadata = page.learning
          ? getLearningMetadata(page, language, isEnglish ? englishLearning : portugueseLearning)
          : getPublicMetadata(page.id, language, faq, isEnglish ? catalog : undefined)
        const template = isEnglish || generatedPortuguese
          ? readFileSync(resolve(rootDir, 'sobre/index.html'), 'utf8') : html
        const values = {
          type: 'website',
          imageWidth: '1200',
          imageHeight: '630',
          ogDescription: metadata.description,
          twitterDescription: metadata.description,
          ...metadata,
          url: SITE_URL + metadata.path,
          ogLocale: getOgLocale(language),
        }
        const entry = metadata.jsonLd ? template : template.replace(
          /^ +<script type="application\/ld\+json" data-page-metadata="structured-data">\{\{structuredData\}\}<\/script>\r?\n/m,
          '',
        )
        return publicReleaseMetadata(entry.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
          if (key === 'structuredData') {
            return JSON.stringify(metadata.jsonLd).replaceAll('<', '\\u003c')
          }
          return typeof values[key] === 'string' ? escapeHtml(values[key]) : placeholder
        }), page, mode)
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), publicMetadataPlugin(mode), {
    name: 'prodforge-public-release',
    apply: 'build',
    generateBundle() {
      if (mode !== RELEASE_MODE) return
      const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
      this.emitFile({ type: 'asset', fileName: 'release.json', source: JSON.stringify({
        commit, internationalization: true, legal: productionLegalRelease,
      }) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source:
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        publicLocalePages.filter((page) => !['terms', 'privacyPolicy', 'preferences'].includes(page.id))
          .flatMap((page) => ['pt-BR', 'en'].map((language) => `<url><loc>${SITE_URL + page[language]}</loc></url>`)).join('') + '</urlset>',
      })
    },
  }],
  build: {
    ...(mode === PILOT_MODE ? { outDir: 'dist-i18n-preview' } : {}),
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        login: resolve(rootDir, 'login/index.html'),
        signup: resolve(rootDir, 'signup/index.html'),
        checkEmail: resolve(rootDir, 'check-email/index.html'),
        privacyPolicy: resolve(rootDir, 'politica-de-privacidade/index.html'),
        privacyPreferences: resolve(rootDir, 'preferencias-de-privacidade/index.html'),
        cookiePreferences: resolve(rootDir, 'preferencias-de-cookies/index.html'),
        termsOfUse: resolve(rootDir, 'termos-de-uso/index.html'),
        contact: resolve(rootDir, 'contato/index.html'),
        about: resolve(rootDir, 'sobre/index.html'),
        ...(mode === PILOT_MODE ? { copyReview: resolve(rootDir, copyReviewDirectory, 'index.html') } : {}),
        ...(isLanguageBuild(mode) ? {
          ...Object.fromEntries(publicLocalePages.map(({ id, en }) => [
            id + 'English', resolve(rootDir, en.slice(1).replace(/\/$/, '') + '/index.html'),
          ])),
        } : {}),
        faq: resolve(rootDir, 'faq/index.html'),
        ...Object.fromEntries(learningRoutes.map((page) => [
          page.id, resolve(rootDir, page['pt-BR'].slice(1) + '/index.html'),
        ])),
      },
    },
  },
}))
