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
