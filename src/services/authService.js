import { supabase } from '../lib/supabaseClient'
import { DEFAULT_AUTH_REDIRECT_PATH, normalizeAuthRedirect } from '../utils/authRedirect'

const ALLOWED_EMAIL_REDIRECT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  'prodforge.techtupa.br',
  'www.prodforge.techtupa.br',
  'prodforge.techtupa.com.br',
  'www.prodforge.techtupa.com.br',
])

function buildEmailRedirectOptions(redirectTo = DEFAULT_AUTH_REDIRECT_PATH) {
  if (typeof window === 'undefined') return undefined

  const { hostname, origin } = window.location
  if (!ALLOWED_EMAIL_REDIRECT_HOSTS.has(hostname)) {
    return undefined
  }

  const redirectPath = normalizeAuthRedirect(redirectTo)

  return {
    emailRedirectTo: new URL(redirectPath, origin).toString(),
  }
}

export function maskEmail(email) {
  const normalized = typeof email === 'string' ? email.trim() : ''
  if (!normalized || !normalized.includes('@')) return ''

  const [localPart, domain] = normalized.split('@')
  if (!localPart || !domain) return normalized

  if (localPart.length <= 2) {
    return `${localPart[0] ?? '*'}*@${domain}`
  }

  return `${localPart.slice(0, 2)}***@${domain}`
}

export async function signUpWithEmail({ email, password, redirectTo }) {
  const options = buildEmailRedirectOptions(redirectTo)

  return supabase.auth.signUp({
    email,
    password,
    ...(options ? { options } : {}),
  })
}

export async function signInWithEmail({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function resendSignupConfirmation(email, redirectTo) {
  const options = buildEmailRedirectOptions(redirectTo)

  return supabase.auth.resend({
    type: 'signup',
    email,
    ...(options ? { options } : {}),
  })
}
