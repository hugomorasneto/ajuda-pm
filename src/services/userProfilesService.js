import { supabase } from '../lib/supabaseClient'

export async function getUserProfile(userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, plan, role, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Supabase getUserProfile error:', error)
      return { success: false, error, data: null }
    }

    return {
      success: true,
      data: data ?? { id: userId, plan: 'free', role: 'user', email: null, created_at: null },
    }
  } catch (error) {
    console.error('Unexpected getUserProfile error:', error)
    return { success: false, error, data: null }
  }
}
