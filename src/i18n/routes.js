export const DEFAULT_LANGUAGE = 'pt-BR'
export const ENGLISH = 'en'
export const PILOT_MODE = 'i18n-preview'

const pilotPages = [
  { id: 'about', 'pt-BR': '/sobre', en: '/en/about' },
  { id: 'teams', 'pt-BR': '/times' },
  { id: 'login', 'pt-BR': '/login', auth: true },
  { id: 'signup', 'pt-BR': '/signup', auth: true },
  { id: 'checkEmail', 'pt-BR': '/check-email', auth: true },
]

export function getPilotPage(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return pilotPages.find((page) => page[DEFAULT_LANGUAGE] === path || page.en === path)
}

function normalizeLanguage(value) {
  const code = typeof value === 'string' ? value.toLowerCase().split('-')[0] : ''
  if (code === 'en') return ENGLISH
  if (code === 'pt') return DEFAULT_LANGUAGE
  return undefined
}

export function resolveLanguage({ pathname, search, enabled, saved, visitor, browser = [] }) {
  const page = enabled ? getPilotPage(pathname) : undefined
  if (!page) return DEFAULT_LANGUAGE
  if (page.en) return pathname.startsWith('/en/') ? ENGLISH : DEFAULT_LANGUAGE

  return getExplicitLanguage(search) ?? normalizeLanguage(saved) ?? normalizeLanguage(visitor) ??
    browser.map(normalizeLanguage).find(Boolean) ?? DEFAULT_LANGUAGE
}

export function getExplicitLanguage(search) {
  const value = new URLSearchParams(search).get('lang')
  return value === ENGLISH || value === DEFAULT_LANGUAGE ? value : undefined
}

export function withoutLanguage(search) {
  const fields = search ? search.slice(1).split('&') : []
  return fields.filter((field) => !new URLSearchParams(field).has('lang')).join('&')
}

export function languageDestination(location, language) {
  const { pathname, search, hash } = location
  const page = getPilotPage(pathname)
  if (!page) return null
  if (page.en) return { pathname: page[language], search, hash }

  // Keep opaque parameters as originally encoded, including duplicate values.
  const retained = withoutLanguage(search)
  const parameter = 'lang=' + language
  return { pathname, search: '?' + (retained ? retained + '&' : '') + parameter, hash }
}

export function isLocalPreview(mode, hostname) {
  return mode === PILOT_MODE && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}

export function preferenceKey(userId) {
  return 'prodforge.uiLanguage.' + (userId ? 'user.' + userId : 'visitor')
}

export function getOgLocale(language) {
  return language === ENGLISH ? 'en_US' : 'pt_BR'
}
