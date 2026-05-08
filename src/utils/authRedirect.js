export const DEFAULT_AUTH_REDIRECT_PATH = '/tool'
const AUTH_REDIRECT_STORAGE_KEY = 'prodforge.auth.redirect'

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function normalizeAuthRedirect(value, fallback = DEFAULT_AUTH_REDIRECT_PATH) {
  const rawValue = typeof value === 'string' ? value.trim() : ''
  if (!rawValue) return fallback

  let candidate = rawValue
  try {
    candidate = decodeURIComponent(rawValue)
  } catch {
    candidate = rawValue
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback
  }

  return candidate
}

export function buildAuthPath(path, redirectTo) {
  const safeRedirect = normalizeAuthRedirect(redirectTo)
  const params = new URLSearchParams({ from: safeRedirect })

  return `${path}?${params.toString()}`
}

export function persistAuthRedirect(value) {
  if (!canUseSessionStorage()) return

  const safeRedirect = normalizeAuthRedirect(value)
  if (safeRedirect === DEFAULT_AUTH_REDIRECT_PATH) {
    window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, safeRedirect)
}

export function clearAuthRedirect() {
  if (!canUseSessionStorage()) return
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
}

function getStoredAuthRedirect(fallback = DEFAULT_AUTH_REDIRECT_PATH) {
  if (!canUseSessionStorage()) return fallback

  const storedRedirect = window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)
  return normalizeAuthRedirect(storedRedirect, fallback)
}

export function getAuthRedirectFromLocation(location, fallback = DEFAULT_AUTH_REDIRECT_PATH) {
  const stateRedirect = location?.state?.from
  if (stateRedirect) {
    const redirect = normalizeAuthRedirect(stateRedirect, fallback)
    persistAuthRedirect(redirect)
    return redirect
  }

  const searchParams = new URLSearchParams(location?.search ?? '')
  const queryRedirect = searchParams.get('from') ?? searchParams.get('redirectTo')
  if (queryRedirect) {
    const redirect = normalizeAuthRedirect(queryRedirect, fallback)
    persistAuthRedirect(redirect)
    return redirect
  }

  if (location?.pathname === '/check-email') {
    return getStoredAuthRedirect(fallback)
  }

  if (location?.pathname === '/login' || location?.pathname === '/signup') {
    clearAuthRedirect()
  }

  return fallback
}
