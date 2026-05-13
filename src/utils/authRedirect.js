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

export function getAuthRedirectContext(value) {
  const redirect = normalizeAuthRedirect(value)
  const [path] = redirect.split(/[?#]/)
  const isPlanningPath = path === '/roda' || path.startsWith('/roda/') || path.includes('/roda/')

  if (isPlanningPath) {
    return {
      key: 'planning',
      label: 'Roda da Fogueira',
      targetText: 'a Roda da Fogueira',
      description: 'Depois do acesso, você volta ao convite ou à sala de estimativa.',
    }
  }

  if (path.startsWith('/historico')) {
    return {
      key: 'history',
      label: 'Peças forjadas',
      targetText: 'as Peças forjadas',
      description: 'Depois do acesso, você volta ao histórico para revisar suas histórias.',
    }
  }

  if (path.startsWith('/projetos')) {
    return {
      key: 'project',
      label: 'Projeto',
      targetText: 'o projeto',
      description: 'Depois do acesso, você volta ao projeto para organizar histórias, Kanban e colaboração.',
    }
  }

  if (path.startsWith('/times')) {
    return {
      key: 'teams',
      label: 'Times',
      targetText: 'a área de Times',
      description: 'Depois do acesso, você volta ao gerenciamento de equipes do ProdForge.',
    }
  }

  if (path.startsWith('/admin')) {
    return {
      key: 'admin',
      label: 'Administração',
      targetText: 'a Administração',
      description: 'Depois do acesso, você volta à área administrativa do produto.',
    }
  }

  return {
    key: 'workspace',
    label: 'Bancada',
    targetText: 'a Bancada',
    description: 'Depois do acesso, você volta à Bancada para continuar criando ou refinando histórias.',
  }
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
