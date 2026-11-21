import { getExplicitLanguage, getPilotPage, languageDestination } from '../i18n/routes'

export const DEFAULT_AUTH_REDIRECT_PATH = '/tool'
const AUTH_REDIRECT_STORAGE_KEY = 'prodforge.auth.redirect'

function withSessionStorage(callback) {
  try {
    if (typeof window !== 'undefined') return callback(window.sessionStorage)
  } catch {
    // URL and router state still carry the destination when storage is blocked.
  }
}

export function normalizeAuthRedirect(value, fallback = DEFAULT_AUTH_REDIRECT_PATH) {
  const rawValue = typeof value === 'string' ? value.trim() : ''
  if (!rawValue) return fallback

  let candidate = rawValue
  // URLSearchParams already decoded the outer "from". Keep any encoded values inside it.
  if (/^%2f/i.test(rawValue)) {
    try {
      candidate = decodeURIComponent(rawValue)
    } catch {
      return fallback
    }
  }

  const path = candidate.split(/[?#]/, 1)[0]
  if (!path.startsWith('/') || path.startsWith('//') || /\\|%5c|%2f|[\r\n\t]/i.test(path)) {
    return fallback
  }
  return candidate
}

export function getAuthRedirectContext(value) {
  const [path] = normalizeAuthRedirect(value).split(/[?#]/, 1)
  if (path === '/roda' || path.startsWith('/roda/') || path.includes('/roda/')) return 'planning'
  if (path === '/historico' || path.startsWith('/historico/')) return 'history'
  if (path === '/projetos' || path.startsWith('/projetos/')) return 'project'
  if (path === '/times' || path.startsWith('/times/')) return 'teams'
  if (['/admin', '/tool/admin'].some((route) => path === route || path.startsWith(route + '/'))) return 'admin'
  return 'workspace'
}

function splitDestination(destination) {
  const hashIndex = destination.indexOf('#')
  const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : destination.slice(hashIndex)
  const queryIndex = beforeHash.indexOf('?')
  return {
    pathname: queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex),
    search: queryIndex === -1 ? '' : beforeHash.slice(queryIndex),
    hash,
  }
}

export function getAuthDestinationLanguage(value) {
  return getExplicitLanguage(splitDestination(normalizeAuthRedirect(value)).search)
}

export function getAuthContinuation(value, language) {
  const safeRedirect = normalizeAuthRedirect(value)
  if (!language) return safeRedirect

  const location = splitDestination(safeRedirect)
  const page = getPilotPage(location.pathname)
  // Apply an explicit auth choice only to destinations already available in both languages.
  if (!page || page.en || page.auth || getExplicitLanguage(location.search) === language) {
    return safeRedirect
  }

  const { pathname, search, hash } = languageDestination(location, language)
  return pathname + search + hash
}

export function buildAuthPath(path, redirectTo, language) {
  const params = new URLSearchParams()
  if (redirectTo) params.set('from', normalizeAuthRedirect(redirectTo))
  if (language) params.set('lang', language)
  return params.size ? path + '?' + params.toString() : path
}

// Stable prefix lets Go email templates select the current request language
// without parsing or reconstructing the opaque destination nested in "from".
export function buildEmailConfirmationPath(redirectTo, language) {
  const params = new URLSearchParams({
    lang: language === 'en' ? 'en' : 'pt-BR',
    from: normalizeAuthRedirect(redirectTo),
  })
  return '/check-email?' + params.toString()
}

export function persistAuthRedirect(value) {
  const redirect = normalizeAuthRedirect(value)
  if (redirect === DEFAULT_AUTH_REDIRECT_PATH) {
    clearAuthRedirect()
    return
  }
  withSessionStorage((storage) => storage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirect))
}

export function clearAuthRedirect() {
  withSessionStorage((storage) => storage.removeItem(AUTH_REDIRECT_STORAGE_KEY))
}

export function getAuthRedirectFromLocation(location, fallback = DEFAULT_AUTH_REDIRECT_PATH) {
  const params = new URLSearchParams(location?.search)
  const requested = location?.state?.from || params.get('from') || params.get('redirectTo')
  if (requested) return normalizeAuthRedirect(requested, fallback)
  if (location?.pathname?.replace(/\/+$/, '') === '/check-email') {
    const stored = withSessionStorage((storage) => storage.getItem(AUTH_REDIRECT_STORAGE_KEY))
    return normalizeAuthRedirect(stored, fallback)
  }
  return fallback
}
