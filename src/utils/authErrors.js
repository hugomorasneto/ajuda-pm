const ERROR_KEYS = {
  invalid_credentials: 'invalidCredentials',
  email_address_invalid: 'emailInvalid',
  user_already_exists: 'alreadyRegistered',
  email_exists: 'alreadyRegistered',
  weak_password: 'weakPassword',
  email_not_confirmed: 'notConfirmed',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
  otp_expired: 'confirmationExpired',
}

export function getAuthErrorKey(error) {
  if (Object.hasOwn(ERROR_KEYS, error?.code)) return ERROR_KEYS[error.code]
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : ''
  if (message.includes('invalid login credentials')) return 'invalidCredentials'
  if (message.includes('email') && message.includes('invalid')) return 'emailInvalid'
  if (message.includes('user already registered')) return 'alreadyRegistered'
  if (message.includes('password should be at least')) return 'weakPassword'
  if (message.includes('not confirmed')) return 'notConfirmed'
  if (/rate limit|over_email_send_rate_limit|security purposes/.test(message)) return 'rateLimited'
  return 'authFailed'
}

export function getConfirmationErrorKey({ search, hash }) {
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.slice(1))
  const code = fragment.get('error_code') ?? query.get('error_code')
  if (code === 'otp_expired') return 'confirmationExpired'
  if (code || fragment.has('error') || query.has('error')) return 'confirmationFailed'
  return ''
}

export function isValidAuthEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
