import { describe, expect, it } from 'vitest'
import { getAuthErrorKey, getConfirmationErrorKey } from './authErrors'

describe('authentication error localization', () => {
  it('uses stable provider codes and preserves mappings from legacy messages', () => {
    expect(getAuthErrorKey({ code: 'email_not_confirmed', message: 'Provider details' })).toBe('notConfirmed')
    expect(getAuthErrorKey({ message: 'Invalid login credentials' })).toBe('invalidCredentials')
    expect(getAuthErrorKey({ code: 'over_email_send_rate_limit' })).toBe('rateLimited')
    expect(getAuthErrorKey({ code: 'unknown', message: 'Provider details' })).toBe('authFailed')
  })

  it('maps the callback error without displaying raw provider details', () => {
    expect(getConfirmationErrorKey({ search: '', hash: '#error=access_denied&error_code=otp_expired' }))
      .toBe('confirmationExpired')
    expect(getConfirmationErrorKey({ search: '?error=access_denied', hash: '' }))
      .toBe('confirmationFailed')
    expect(getConfirmationErrorKey({ search: '?from=%2Ftool', hash: '#section' })).toBe('')
  })
})
