import { supabase } from '../lib/supabaseClient'
import {
  clearCampaignAttribution,
  getOrCreateCampaignAttribution,
} from '../utils/campaignAttribution'
import {
  hasPrivacyConsentForCategory,
  PRIVACY_CONSENT_CATEGORIES,
} from '../utils/privacyConsent'

function sanitizeMetadata(metadata, attribution = null) {
  const safeMetadata = metadata && typeof metadata === 'object' ? { ...metadata } : {}

  if (attribution && !safeMetadata.attribution) {
    safeMetadata.attribution = attribution
  }

  return Object.keys(safeMetadata).length > 0 ? safeMetadata : null
}

export async function trackEvent({ event_name, event_category = null, page_path = null, metadata = null }) {
  try {
    if (!event_name) return { success: false }
    if (!hasPrivacyConsentForCategory(PRIVACY_CONSENT_CATEGORIES.analytics)) {
      clearCampaignAttribution()
      return { success: false, skipped: true, reason: 'privacy_consent_required' }
    }

    const attribution = getOrCreateCampaignAttribution()
    const { data } = await supabase.auth.getUser()
    const userId = data?.user?.id ?? null

    const payload = {
      user_id: userId,
      event_name,
      event_category,
      page_path: page_path ?? (typeof window !== 'undefined' ? window.location.pathname : null),
      metadata: sanitizeMetadata(metadata, attribution),
    }

    const { error } = await supabase.from('tracking_events').insert([payload])
    if (error) {
      console.warn('tracking_event_failed', error.message)
      return { success: false }
    }

    return { success: true }
  } catch {
    return { success: false }
  }
}
