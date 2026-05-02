import { supabase } from '../lib/supabaseClient'

export async function getCompletedGuides(userId) {
  if (!userId) return { success: false, data: [] }

  const { data, error } = await supabase
    .from('learning_progress')
    .select('guide_slug, completed_at')
    .eq('user_id', userId)

  if (error) {
    console.error('getCompletedGuides error:', error)
    return { success: false, error, data: [] }
  }

  return { success: true, data: data ?? [] }
}

export async function markGuideCompleted(userId, guideSlug) {
  if (!userId || !guideSlug) return { success: false }

  const { error } = await supabase
    .from('learning_progress')
    .upsert({ user_id: userId, guide_slug: guideSlug }, { onConflict: 'user_id,guide_slug' })

  if (error) {
    console.error('markGuideCompleted error:', error)
    return { success: false, error }
  }

  return { success: true }
}

export async function unmarkGuideCompleted(userId, guideSlug) {
  if (!userId || !guideSlug) return { success: false }

  const { error } = await supabase
    .from('learning_progress')
    .delete()
    .eq('user_id', userId)
    .eq('guide_slug', guideSlug)

  if (error) {
    console.error('unmarkGuideCompleted error:', error)
    return { success: false, error }
  }

  return { success: true }
}
