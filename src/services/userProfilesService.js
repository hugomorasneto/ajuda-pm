import { supabase } from '../lib/supabaseClient'

const profileColumns = 'id, email, plan, role, forge_limit_override, updated_at, created_at'
const fallbackProfileColumns = 'id, email, plan, role, created_at'

function buildFallbackProfile(userId) {
  return {
    id: userId,
    plan: 'free',
    role: 'user',
    email: null,
    forge_limit_override: null,
    updated_at: null,
    created_at: null,
  }
}

function withAccessDefaults(profile, userId) {
  return {
    ...buildFallbackProfile(userId),
    ...(profile ?? {}),
    forge_limit_override: Number.isInteger(profile?.forge_limit_override)
      ? profile.forge_limit_override
      : null,
  }
}

function shouldRetryWithoutAccessColumns(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('forge_limit_override') || message.includes('updated_at')
}

export async function getUserProfile(userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    let { data, error } = await supabase
      .from('profiles')
      .select(profileColumns)
      .eq('id', userId)
      .maybeSingle()

    if (error && shouldRetryWithoutAccessColumns(error)) {
      const fallback = await supabase
        .from('profiles')
        .select(fallbackProfileColumns)
        .eq('id', userId)
        .maybeSingle()

      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('Supabase getUserProfile error:', error)
      return { success: false, error, data: null }
    }

    return {
      success: true,
      data: withAccessDefaults(data, userId),
    }
  } catch (error) {
    console.error('Unexpected getUserProfile error:', error)
    return { success: false, error, data: null }
  }
}
