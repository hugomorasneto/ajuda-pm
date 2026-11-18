import { build } from 'vite'

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
await build({ mode: 'i18n-preview', logLevel: 'warn' })
