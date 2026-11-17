import { readFileSync } from 'node:fs'
import englishAbout from './src/content/en/aboutMetadata.json'
import englishFaq from './src/content/en/faqPage.i18n.json'
import englishMetadata from './src/content/en/publicMetadata.json'
import { getFaqCategories } from './src/content/faqData.js'
import { getPublicMetadata } from './src/i18n/publicMetadata.js'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { SITE_URL } from './src/i18n/aboutMetadata.js'
import { getOgLocale, getPilotPage, PILOT_MODE, publicLocalePages } from './src/i18n/routes.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function publicMetadataPlugin(mode) {
  function servePublicEntry(server) {
    server.middlewares.use((request, _response, next) => {
      const url = new URL(request.url, 'http://localhost')
      const page = getPilotPage(url.pathname)
      if (page?.en) {
        const isEnglish = /^\/en(?:\/|$)/.test(url.pathname)
        const path = isEnglish && mode === PILOT_MODE ? page.en : page['pt-BR']
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
        const isEnglish = mode === PILOT_MODE && /^\/en(?:\/|$)/.test(route)
        if (!page?.en || (!isEnglish && page.id !== 'about')) return html

        const language = isEnglish ? 'en' : 'pt-BR'
        const faq = page.id === 'faq' ? getFaqCategories((key) => englishFaq[key]) : undefined
        const catalog = page.id === 'about' ? englishAbout : englishMetadata
        const metadata = getPublicMetadata(page.id, language, faq, isEnglish ? catalog : undefined)
        const template = isEnglish ? readFileSync(resolve(rootDir, 'sobre/index.html'), 'utf8') : html
        const values = {
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
        return entry.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
          if (key === 'structuredData') {
            return JSON.stringify(metadata.jsonLd).replaceAll('<', '\\u003c')
          }
          return typeof values[key] === 'string' ? escapeHtml(values[key]) : placeholder
        })
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), publicMetadataPlugin(mode)],
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
        ...(mode === PILOT_MODE ? Object.fromEntries(publicLocalePages.map(({ id, en }) => [
          id + 'English', resolve(rootDir, en.slice(1).replace(/\/$/, '') + '/index.html'),
        ])) : {}),
        faq: resolve(rootDir, 'faq/index.html'),
        aprender: resolve(rootDir, 'aprender/index.html'),
        fundamentos: resolve(rootDir, 'aprender/fundamentos-produto-agil/index.html'),
        userStories: resolve(rootDir, 'aprender/user-stories-na-pratica/index.html'),
        backlog: resolve(rootDir, 'aprender/backlog-e-refinamento/index.html'),
        scrum: resolve(rootDir, 'aprender/scrum-para-pm-po/index.html'),
        discovery: resolve(rootDir, 'aprender/discovery-leve/index.html'),
      },
    },
  },
}))
