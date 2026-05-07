export const DEFAULT_AUTH_REDIRECT_PATH = '/tool'

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

export function getAuthRedirectFromLocation(location, fallback = DEFAULT_AUTH_REDIRECT_PATH) {
  const stateRedirect = location?.state?.from
  if (stateRedirect) return normalizeAuthRedirect(stateRedirect, fallback)

  const searchParams = new URLSearchParams(location?.search ?? '')
  return normalizeAuthRedirect(searchParams.get('from'), fallback)
}
