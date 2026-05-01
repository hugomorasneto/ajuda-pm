import { supabase } from '../lib/supabaseClient'

const AUTH_REDIRECT_PATH = '/tool'
const ALLOWED_EMAIL_REDIRECT_HOSTS = new Set(['localhost', 'prodforge.techtupa.com.br'])

function getRawAuthMessage(error) {
  return typeof error?.message === 'string' ? error.message.trim() : ''
}

function buildEmailRedirectOptions() {
  if (typeof window === 'undefined') return undefined

  const { hostname, origin } = window.location
  if (!ALLOWED_EMAIL_REDIRECT_HOSTS.has(hostname)) {
    return undefined
  }

  return {
    emailRedirectTo: new URL(AUTH_REDIRECT_PATH, origin).toString(),
  }
}

export function isEmailConfirmationError(error) {
  const message = getRawAuthMessage(error).toLowerCase()
  return message.includes('email not confirmed') || message.includes('not confirmed')
}

export function getAuthErrorMessage(error) {
  const rawMessage = getRawAuthMessage(error)
  const message = rawMessage.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.'
  }

  if (message.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Entre para continuar.'
  }

  if (message.includes('password should be at least')) {
    return 'Use uma senha com pelo menos 6 caracteres.'
  }

  if (isEmailConfirmationError(error)) {
    return 'Confirme seu e-mail antes de entrar.'
  }

  if (
    message.includes('rate limit') ||
    message.includes('over_email_send_rate_limit') ||
    message.includes('security purposes')
  ) {
    return 'Limite temporário de tentativas ou envios atingido. Aguarde alguns minutos e tente novamente.'
  }

  return rawMessage || 'Não foi possível concluir a autenticação agora.'
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

export async function signUpWithEmail({ email, password }) {
  const options = buildEmailRedirectOptions()

  return supabase.auth.signUp({
    email,
    password,
    ...(options ? { options } : {}),
  })
}

export async function signInWithEmail({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function resendSignupConfirmation(email) {
  const options = buildEmailRedirectOptions()

  return supabase.auth.resend({
    type: 'signup',
    email,
    ...(options ? { options } : {}),
  })
}
