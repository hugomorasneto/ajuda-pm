import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
})
