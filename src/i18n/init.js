import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, ENGLISH, isLocalPreview } from './routes'
import portuguesePreview from './preview-copy/pt-BR.json'
import englishPreview from './preview-copy/en.json'

const catalogs = import.meta.glob(['./locales/pt-BR/*.json', '../content/pt-BR/*.i18n.json'], { eager: true, import: 'default' })

function namespaces(files, overrides = {}) {
  return Object.fromEntries(Object.entries(files).map(([path, value]) => {
    const name = path.split('/').at(-1).replace(/(?:\.i18n)?\.json$/, '')
    return [name, { ...value, ...overrides[name] }]
  }))
}

const preview = import.meta.env.MODE === 'i18n-preview' &&
  isLocalPreview(import.meta.env.MODE, window.location.hostname)

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [DEFAULT_LANGUAGE, ENGLISH],
  resources: {
    [DEFAULT_LANGUAGE]: namespaces(catalogs, preview ? portuguesePreview : undefined),
    ...(preview ? {
      [ENGLISH]: namespaces(import.meta.glob(['./locales/en/*.json', '../content/en/*.i18n.json'], { eager: true, import: 'default' }), englishPreview),
    } : {}),
  },
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  react: { useSuspense: false },
})
