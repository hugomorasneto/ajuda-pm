import { supabase } from '../lib/supabaseClient'

export async function saveUserStory(data, userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.') }
    }

    const { data: insertedRows, error } = await supabase
      .from('user_stories')
      .insert([{ ...data, user_id: userId }])
      .select()

    if (error) {
      console.error('Supabase saveUserStory error:', error)
      return { success: false, error }
    }

    console.log('Supabase saveUserStory success:', insertedRows)
    return { success: true, data: insertedRows }
  } catch (error) {
    console.error('Unexpected saveUserStory error:', error)
    return { success: false, error }
  }
}

export async function updateUserStory(id, data, userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.') }
    }

    const { data: updatedRows, error } = await supabase
      .from('user_stories')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Supabase updateUserStory error:', error)
      return { success: false, error }
    }

    console.log('Supabase updateUserStory success:', updatedRows)
    return { success: true, data: updatedRows }
  } catch (error) {
    console.error('Unexpected updateUserStory error:', error)
    return { success: false, error }
  }
}

export async function listRecentUserStories({
  limit = 10,
  sinceIso = null,
  offset = 0,
  userId,
} = {}) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: [] }
    }

    let query = supabase
      .from('user_stories')
      .select(
        'id, title, created_at, input_context, input_requirements, objective, user_story, acceptance_criteria, status',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sinceIso) {
      query = query.gte('created_at', sinceIso)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase listRecentUserStories error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected listRecentUserStories error:', error)
    return { success: false, error, data: [] }
  }
}

export async function getUserStoryById(id, userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select(
        'id, title, created_at, input_context, input_requirements, objective, user_story, acceptance_criteria, business_rules, gaps, qa_checklist, status',
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Supabase getUserStoryById error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected getUserStoryById error:', error)
    return { success: false, error, data: null }
  }
}

export async function countUserStoriesByUser(userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), count: 0 }
    }

    const { count, error } = await supabase
      .from('user_stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase countUserStoriesByUser error:', error)
      return { success: false, error, count: 0 }
    }

    return { success: true, count: count ?? 0 }
  } catch (error) {
    console.error('Unexpected countUserStoriesByUser error:', error)
    return { success: false, error, count: 0 }
  }
}
