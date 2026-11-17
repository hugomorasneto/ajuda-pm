import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, ENGLISH } from './routes'

const catalogs = import.meta.glob('./locales/pt-BR/*.json', { eager: true, import: 'default' })

function namespaces(files) {
  return Object.fromEntries(Object.entries(files).map(([path, value]) => [
    path.split('/').at(-1).replace(/\.json$/, ''),
    value,
  ]))
}

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [DEFAULT_LANGUAGE, ENGLISH],
  resources: {
    [DEFAULT_LANGUAGE]: namespaces(catalogs),
    ...(import.meta.env.MODE === 'i18n-preview' ? {
      [ENGLISH]: namespaces(import.meta.glob('./locales/en/*.json', { eager: true, import: 'default' })),
    } : {}),
  },
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  react: { useSuspense: false },
})
