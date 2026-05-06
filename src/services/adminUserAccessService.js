import { supabase } from '../lib/supabaseClient'

function getFriendlyAccessError(error) {
  const message = String(error?.message ?? '').trim()

  if (!message) return 'Não foi possível salvar o acesso agora.'
  if (message.includes('Apenas administradores')) return message
  if (message.includes('Plano inválido')) return message
  if (message.includes('Limite de forjas inválido')) return message
  if (message.includes('Usuário não encontrado')) return message

  return 'Não foi possível salvar o acesso agora. Verifique os dados e tente novamente.'
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
        message: getFriendlyAccessError(error),
        data: null,
      }
    }

    return { success: true, data: data?.[0] ?? null, error: null, message: '' }
  } catch (error) {
    console.error('Unexpected updateAdminUserAccess error:', error)
    return {
      success: false,
      error,
      message: 'Não foi possível salvar o acesso agora. Tente novamente.',
      data: null,
    }
  }
}
