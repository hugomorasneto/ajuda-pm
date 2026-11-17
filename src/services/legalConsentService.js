import { supabase } from '../lib/supabaseClient'
import release from '../content/legalRelease.json'

export function matchesLocalLegalRelease(status) {
  return status?.version === release.version && status?.sha256 === release.sha256
}

export function localLegalAssertion(language) {
  return { ...release, language }
}

export async function getLocalLegalStatus() {
  const { data, error } = await supabase.rpc('get_local_legal_status')
  if (error || !matchesLocalLegalRelease(data)) throw new Error('Legal release unavailable')
  return data
}

export async function acceptLocalLegalTerms(language) {
  const { data, error } = await supabase.rpc('accept_local_legal_terms', {
    p_version: release.version,
    p_sha256: release.sha256,
    p_language: language,
  })
  if (error || !matchesLocalLegalRelease(data) || data.accepted !== true) {
    throw new Error('Legal acceptance could not be confirmed')
  }
  return data
}
