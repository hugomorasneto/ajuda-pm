import { learningRoutes } from './learningRoutes.js'

export const DEFAULT_LANGUAGE = 'pt-BR'
export const ENGLISH = 'en'
export const PILOT_MODE = 'i18n-preview'

export const publicLocalePages = [
  { id: 'home', 'pt-BR': '/', en: '/en/' },
  { id: 'about', 'pt-BR': '/sobre', en: '/en/about' },
  { id: 'faq', 'pt-BR': '/faq', en: '/en/faq' },
  { id: 'contact', 'pt-BR': '/contato', en: '/en/contact' },
  { id: 'privacyPolicy', 'pt-BR': '/politica-de-privacidade', en: '/en/privacy-policy' },
  { id: 'preferences', 'pt-BR': '/preferencias-de-privacidade', en: '/en/privacy-preferences' },
  { id: 'terms', 'pt-BR': '/termos-de-uso', en: '/en/terms-of-use' },
  ...learningRoutes,
]

const pilotPages = [
  ...publicLocalePages,
  { id: 'workspace', 'pt-BR': '/tool', workspace: true },
  { id: 'history', 'pt-BR': '/historico', workspace: true },
  { id: 'projects', 'pt-BR': '/projetos', workspace: true },
  { id: 'teams', 'pt-BR': '/times', workspace: true },
  { id: 'login', 'pt-BR': '/login', auth: true },
  { id: 'signup', 'pt-BR': '/signup', auth: true },
  { id: 'checkEmail', 'pt-BR': '/check-email', auth: true },
]

function normalizePath(path) {
  return path.replace(/\/+$/, '') || '/'
}

export function getPilotPage(pathname) {
  const path = normalizePath(pathname)
  if (/^\/projetos\/[^/]+$/.test(path)) {
    return { id: 'projectDetail', 'pt-BR': path, workspace: true }
  }
  return pilotPages.find((page) => page[DEFAULT_LANGUAGE] === path || (page.en && normalizePath(page.en) === path))
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
  if (page.en) return normalizePath(pathname) === normalizePath(page.en) ? ENGLISH : DEFAULT_LANGUAGE

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

export function localizeHref(to, language) {
  if (typeof to !== 'string' || !to.startsWith('/')) return to
  const pathname = to.split(/[?#]/, 1)[0]
  const suffix = to.slice(pathname.length)
  const page = getPilotPage(pathname)
  if (page?.en) return page[language] + suffix
  if (!page?.auth && !page?.workspace) return to

  const hashIndex = suffix.indexOf('#')
  const search = hashIndex === -1 ? suffix : suffix.slice(0, hashIndex)
  if (getExplicitLanguage(search)) return to
  const hash = hashIndex === -1 ? '' : suffix.slice(hashIndex)
  const next = languageDestination({ pathname, search, hash }, language)
  return next.pathname + next.search + next.hash
}
