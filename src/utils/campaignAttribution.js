export const CAMPAIGN_ATTRIBUTION_STORAGE_KEY = 'prodforge_campaign_attribution'

export const CAMPAIGN_ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
]

function canUseLocalStorage() {
  if (typeof window === 'undefined') return false

  try {
    return Boolean(window.localStorage)
  } catch {
    return false
  }
}

function normalizeText(value) {
  const cleaned = typeof value === 'string' ? value.trim() : ''
  return cleaned || null
}

function normalizeSearch(search) {
  if (typeof search !== 'string') return ''
  if (!search) return ''
  return search.startsWith('?') ? search : `?${search}`
}

function normalizeReferrer(referrer, origin = '') {
  const cleaned = normalizeText(referrer)
  if (!cleaned) return null

  try {
    const referrerUrl = new URL(cleaned)
    if (origin && referrerUrl.origin === origin) return null
  } catch {
    return cleaned
  }

  return cleaned
}

function normalizeStoredAttribution(value) {
  if (!value || typeof value !== 'object') return null

  const attribution = CAMPAIGN_ATTRIBUTION_FIELDS.reduce((acc, field) => {
    acc[field] = normalizeText(value[field])
    return acc
  }, {})

  attribution.referrer = normalizeText(value.referrer)

  const hasCampaignValue = CAMPAIGN_ATTRIBUTION_FIELDS.some((field) => attribution[field])
  if (!hasCampaignValue && !attribution.referrer) return null

  return attribution
}

export function extractCampaignAttribution({
  search = '',
  referrer = '',
  origin = '',
} = {}) {
  const params = new URLSearchParams(normalizeSearch(search))
  const attribution = CAMPAIGN_ATTRIBUTION_FIELDS.reduce((acc, field) => {
    acc[field] = normalizeText(params.get(field))
    return acc
  }, {})

  attribution.referrer = normalizeReferrer(referrer, origin)

  const hasCampaignValue = CAMPAIGN_ATTRIBUTION_FIELDS.some((field) => attribution[field])
  if (!hasCampaignValue && !attribution.referrer) return null

  return attribution
}

export function readCampaignAttribution() {
  if (!canUseLocalStorage()) return null

  try {
    const storedValue = window.localStorage.getItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)
    if (!storedValue) return null

    return normalizeStoredAttribution(JSON.parse(storedValue))
  } catch {
    return null
  }
}

export function persistCampaignAttribution(attribution) {
  const normalized = normalizeStoredAttribution(attribution)
  if (!normalized || !canUseLocalStorage()) return null

  try {
    window.localStorage.setItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    return null
  }
}

export function clearCampaignAttribution() {
  if (!canUseLocalStorage()) return false

  try {
    window.localStorage.removeItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function getCurrentCampaignAttribution() {
  if (typeof window === 'undefined') return null

  return extractCampaignAttribution({
    search: window.location?.search,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    origin: window.location?.origin,
  })
}

export function getOrCreateCampaignAttribution() {
  const storedAttribution = readCampaignAttribution()
  if (storedAttribution) return storedAttribution

  const currentAttribution = getCurrentCampaignAttribution()
  if (!currentAttribution) return null

  return persistCampaignAttribution(currentAttribution)
}
