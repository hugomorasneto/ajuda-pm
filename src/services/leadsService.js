import { supabase } from '../lib/supabaseClient'

function normalizeLeadPayload({ name, email }) {
  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
  }
}

export async function createLead({ name, email }) {
  try {
    const payload = normalizeLeadPayload({ name, email })
    const { error } = await supabase.from('leads').insert([payload])

    if (error) {
      return {
        success: false,
        duplicate: error.code === '23505',
        error,
      }
    }

    return {
      success: true,
      duplicate: false,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      duplicate: false,
      error,
    }
  }
}
