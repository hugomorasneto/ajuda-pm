import { supabase } from '../lib/supabaseClient'
import {
  hasPrivacyConsentForCategory,
  PRIVACY_CONSENT_CATEGORIES,
} from '../utils/privacyConsent'

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null
  return metadata
}

export async function trackEvent({ event_name, event_category = null, page_path = null, metadata = null }) {
  try {
    if (!event_name) return { success: false }
    if (!hasPrivacyConsentForCategory(PRIVACY_CONSENT_CATEGORIES.analytics)) {
      return { success: false, skipped: true, reason: 'privacy_consent_required' }
    }

    const { data } = await supabase.auth.getUser()
    const userId = data?.user?.id ?? null

    const payload = {
      user_id: userId,
      event_name,
      event_category,
      page_path: page_path ?? (typeof window !== 'undefined' ? window.location.pathname : null),
      metadata: sanitizeMetadata(metadata),
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
