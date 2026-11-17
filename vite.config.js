import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getAboutMetadata, SITE_URL } from './src/i18n/aboutMetadata.js'
import { getOgLocale, getPilotPage, PILOT_MODE } from './src/i18n/routes.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function aboutMetadataPlugin(mode) {
  function serveAboutEntry(server) {
    server.middlewares.use((request, _response, next) => {
      const url = new URL(request.url, 'http://localhost')
      const page = getPilotPage(url.pathname)
      if (page?.id === 'about') {
        const isEnglish = url.pathname.startsWith('/en/')
        const path = isEnglish && mode === PILOT_MODE ? page.en : page['pt-BR']
        request.url = path + '/index.html' + url.search
      }
      next()
    })
  }

  return {
    name: 'prodforge-about-metadata',
    configureServer: serveAboutEntry,
    configurePreviewServer: serveAboutEntry,
    transformIndexHtml: {
      order: 'pre',
      handler(html, { path }) {
        const route = path.replace(/\/index\.html$/, '').replace(/\/$/, '')
        if (getPilotPage(route)?.id !== 'about') return html

        const language = mode === PILOT_MODE && route.startsWith('/en/') ? 'en' : 'pt-BR'
        const metadata = getAboutMetadata(language)
        const values = {
          ...metadata,
          url: SITE_URL + metadata.path,
          ogLocale: getOgLocale(language),
        }
        return html.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
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
  plugins: [react(), aboutMetadataPlugin(mode)],
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
        ...(mode === PILOT_MODE ? { aboutEnglish: resolve(rootDir, 'en/about/index.html') } : {}),
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
