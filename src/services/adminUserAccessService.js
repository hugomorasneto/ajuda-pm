import { supabase } from '../lib/supabaseClient'

function getAccessErrorKey(error) {
  const message = String(error?.message ?? '').trim()

  if (!message) return 'change_access_unavailable'
  if (message.includes('Apenas administradores')) return 'change_access_admin_only'
  if (message.includes('Plano inválido')) return 'change_access_invalid_plan'
  if (message.includes('Limite de forjas inválido')) return 'change_access_invalid_limit'
  if (message.includes('Usuário não encontrado')) return 'change_access_user_missing'

  return 'change_access_failed'
}

export async function updateAdminUserAccess({ userId, plan, forgeLimitOverride, notes }) {
  try {
    const { data, error } = await supabase.rpc('admin_update_user_access', {
      p_user_id: userId,
      p_plan: plan,
      p_forge_limit_override: forgeLimitOverride,
      p_notes: notes || null,
    })

    if (error) {
      console.error('Supabase updateAdminUserAccess error:', error)
      return {
        success: false,
        error,
        messageKey: getAccessErrorKey(error),
        data: null,
      }
    }

    return { success: true, data: data?.[0] ?? null, error: null, messageKey: '' }
  } catch (error) {
    console.error('Unexpected updateAdminUserAccess error:', error)
    return {
      success: false,
      error,
      messageKey: 'change_access_unavailable',
      data: null,
    }
  }
}
