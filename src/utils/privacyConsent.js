export const PRIVACY_CONSENT_STORAGE_KEY = 'prodforge_privacy_consent'
export const PRIVACY_CONSENT_VERSION = '2.1'
export const PRIVACY_CONSENT_CHANGE_EVENT = 'prodforge_privacy_consent_change'

export const PRIVACY_CONSENT_STATUS = {
  accepted: 'accepted',
  essentialOnly: 'essential_only',
  custom: 'custom',
}

export const PRIVACY_CONSENT_CATEGORIES = {
  essential: 'essential',
  analytics: 'analytics',
  marketing: 'marketing',
}

export const PRIVACY_CONSENT_CATEGORY_AVAILABILITY = {
  [PRIVACY_CONSENT_CATEGORIES.essential]: true,
  [PRIVACY_CONSENT_CATEGORIES.analytics]: true,
  [PRIVACY_CONSENT_CATEGORIES.marketing]: true,
}

const VALID_PRIVACY_CONSENT_STATUSES = new Set(Object.values(PRIVACY_CONSENT_STATUS))
const DEFAULT_PRIVACY_CATEGORIES = {
  [PRIVACY_CONSENT_CATEGORIES.essential]: true,
  [PRIVACY_CONSENT_CATEGORIES.analytics]: false,
  [PRIVACY_CONSENT_CATEGORIES.marketing]: false,
}
const OPTIONAL_PRIVACY_CATEGORIES = [
  PRIVACY_CONSENT_CATEGORIES.analytics,
  PRIVACY_CONSENT_CATEGORIES.marketing,
]

function canUseLocalStorage() {
  if (typeof window === 'undefined') return false

  try {
    return Boolean(window.localStorage)
  } catch {
    return false
  }
}

function notifyPrivacyConsentChange(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PRIVACY_CONSENT_CHANGE_EVENT, { detail }))
}

function createPrivacyConsentCategories(categories = {}) {
  return {
    [PRIVACY_CONSENT_CATEGORIES.essential]: true,
    [PRIVACY_CONSENT_CATEGORIES.analytics]:
      PRIVACY_CONSENT_CATEGORY_AVAILABILITY[PRIVACY_CONSENT_CATEGORIES.analytics] &&
      Boolean(categories[PRIVACY_CONSENT_CATEGORIES.analytics]),
    [PRIVACY_CONSENT_CATEGORIES.marketing]:
      PRIVACY_CONSENT_CATEGORY_AVAILABILITY[PRIVACY_CONSENT_CATEGORIES.marketing] &&
      Boolean(categories[PRIVACY_CONSENT_CATEGORIES.marketing]),
  }
}

function getStatusForCategories(categories) {
  const availableOptionalCategories = OPTIONAL_PRIVACY_CATEGORIES.filter(
    (categoryId) => PRIVACY_CONSENT_CATEGORY_AVAILABILITY[categoryId],
  )

  if (availableOptionalCategories.length === 0) return PRIVACY_CONSENT_STATUS.essentialOnly

  const hasAllAvailableOptionalConsent = availableOptionalCategories.every((categoryId) => categories[categoryId])
  const hasNoAvailableOptionalConsent = availableOptionalCategories.every((categoryId) => !categories[categoryId])

  if (hasAllAvailableOptionalConsent) return PRIVACY_CONSENT_STATUS.accepted
  if (hasNoAvailableOptionalConsent) return PRIVACY_CONSENT_STATUS.essentialOnly

  return PRIVACY_CONSENT_STATUS.custom
}

function getCategoriesForStatus(status) {
  if (status === PRIVACY_CONSENT_STATUS.accepted) {
    return createPrivacyConsentCategories({
      [PRIVACY_CONSENT_CATEGORIES.analytics]: true,
      [PRIVACY_CONSENT_CATEGORIES.marketing]: true,
    })
  }

  return DEFAULT_PRIVACY_CATEGORIES
}

function normalizePrivacyConsent(consent) {
  if (!consent || typeof consent !== 'object' || !VALID_PRIVACY_CONSENT_STATUSES.has(consent.status)) {
    return null
  }

  const categories = createPrivacyConsentCategories(consent.categories ?? getCategoriesForStatus(consent.status))

  return {
    status: getStatusForCategories(categories),
    categories,
    timestamp: typeof consent.timestamp === 'string' ? consent.timestamp : null,
    version: typeof consent.version === 'string' ? consent.version : PRIVACY_CONSENT_VERSION,
  }
}

function persistPrivacyConsent(payload) {
  if (!canUseLocalStorage()) return null

  try {
    window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(payload))
    notifyPrivacyConsentChange(payload)
    return payload
  } catch {
    return null
  }
}

export function getPrivacyConsent() {
  if (!canUseLocalStorage()) return null

  try {
    const storedValue = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY)
    if (!storedValue) return null

    const consent = JSON.parse(storedValue)
    return normalizePrivacyConsent(consent)
  } catch {
    return null
  }
}

export function hasPrivacyConsentForCategory(categoryId) {
  if (categoryId === PRIVACY_CONSENT_CATEGORIES.essential) return true
  if (!OPTIONAL_PRIVACY_CATEGORIES.includes(categoryId)) return false
  if (!PRIVACY_CONSENT_CATEGORY_AVAILABILITY[categoryId]) return false

  const consent = getPrivacyConsent()
  return Boolean(consent?.categories?.[categoryId])
}

export function setPrivacyConsent(status) {
  if (!canUseLocalStorage() || !VALID_PRIVACY_CONSENT_STATUSES.has(status)) {
    return null
  }

  const categories = getCategoriesForStatus(status)
  const payload = {
    status: getStatusForCategories(categories),
    categories,
    timestamp: new Date().toISOString(),
    version: PRIVACY_CONSENT_VERSION,
  }

  return persistPrivacyConsent(payload)
}

export function setPrivacyConsentPreferences(categories) {
  const normalizedCategories = createPrivacyConsentCategories(categories)

  const payload = {
    status: getStatusForCategories(normalizedCategories),
    categories: normalizedCategories,
    timestamp: new Date().toISOString(),
    version: PRIVACY_CONSENT_VERSION,
  }

  return persistPrivacyConsent(payload)
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
