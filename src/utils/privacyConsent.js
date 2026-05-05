export const PRIVACY_CONSENT_STORAGE_KEY = 'prodforge_privacy_consent'
export const PRIVACY_CONSENT_VERSION = '1.0'
export const PRIVACY_CONSENT_CHANGE_EVENT = 'prodforge_privacy_consent_change'

export const PRIVACY_CONSENT_STATUS = {
  accepted: 'accepted',
  essentialOnly: 'essential_only',
}

const VALID_PRIVACY_CONSENT_STATUSES = new Set(Object.values(PRIVACY_CONSENT_STATUS))

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function notifyPrivacyConsentChange(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PRIVACY_CONSENT_CHANGE_EVENT, { detail }))
}

export function getPrivacyConsent() {
  if (!canUseLocalStorage()) return null

  try {
    const storedValue = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY)
    if (!storedValue) return null

    const consent = JSON.parse(storedValue)
    if (!consent || typeof consent !== 'object') return null

    return VALID_PRIVACY_CONSENT_STATUSES.has(consent.status) ? consent : null
  } catch {
    return null
  }
}

export function setPrivacyConsent(status) {
  if (!canUseLocalStorage() || !VALID_PRIVACY_CONSENT_STATUSES.has(status)) {
    return null
  }

  try {
    const payload = {
      status,
      timestamp: new Date().toISOString(),
      version: PRIVACY_CONSENT_VERSION,
    }

    window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(payload))
    notifyPrivacyConsentChange(payload)
    return payload
  } catch {
    return null
  }
}

export function clearPrivacyConsent() {
  if (!canUseLocalStorage()) return false

  try {
    window.localStorage.removeItem(PRIVACY_CONSENT_STORAGE_KEY)
    notifyPrivacyConsentChange(null)
    return true
  } catch {
    return false
  }
}
