import { supabase } from '../lib/supabaseClient'

const baseStoryColumns =
  'id, user_id, story_group_id, version_number, previous_version_id, regeneration_instruction, title, created_at, input_context, input_requirements, objective, user_story, acceptance_criteria, business_rules, gaps, qa_checklist, status'

function getClientUuid() {
  try {
    return crypto.randomUUID()
  } catch {
    return null
  }
}

export async function saveUserStory(data, userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuario nao autenticado.') }
    }

    const { data: insertedRows, error } = await supabase
      .from('user_stories')
      .insert([{ ...data, user_id: userId }])
      .select(baseStoryColumns)

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

export async function createUserStoryVersion({ data, userId, storyGroupId, previousVersionId = null }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuario nao autenticado.') }
    }

    const resolvedGroupId = storyGroupId ?? getClientUuid()
    if (!resolvedGroupId) {
      return { success: false, error: new Error('Nao foi possivel gerar identificador de grupo.') }
    }

    const { data: latestVersionRows, error: latestError } = await supabase
      .from('user_stories')
      .select('version_number')
      .eq('user_id', userId)
      .eq('story_group_id', resolvedGroupId)
      .order('version_number', { ascending: false })
      .limit(1)

    if (latestError) {
      console.error('Supabase createUserStoryVersion latest error:', latestError)
      return { success: false, error: latestError }
    }

    const currentMax = latestVersionRows?.[0]?.version_number ?? 0
    const nextVersionNumber = currentMax + 1

    return saveUserStory(
      {
        ...data,
        story_group_id: resolvedGroupId,
        version_number: nextVersionNumber,
        previous_version_id: previousVersionId,
      },
      userId,
    )
  } catch (error) {
    console.error('Unexpected createUserStoryVersion error:', error)
    return { success: false, error }
  }
}

export async function updateUserStory(id, data, userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuario nao autenticado.') }
    }

    const { data: updatedRows, error } = await supabase
      .from('user_stories')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select(baseStoryColumns)

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
      return { success: false, error: new Error('Usuario nao autenticado.'), data: [] }
    }

    let query = supabase
      .from('user_stories')
      .select(baseStoryColumns)
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

export async function listRecentStoryGroups({ limit = 10, sinceIso = null, userId } = {}) {
  const response = await listRecentUserStories({
    limit: Math.max(50, limit * 4),
    sinceIso,
    offset: 0,
    userId,
  })

  if (!response.success) return response

  const grouped = new Map()
  for (const row of response.data ?? []) {
    const key = row.story_group_id ?? row.id
    if (!grouped.has(key)) {
      grouped.set(key, row)
    }
  }

  return { success: true, data: Array.from(grouped.values()).slice(0, limit) }
}

export async function listStoryVersions({ storyGroupId, userId, limit = 20 } = {}) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuario nao autenticado.'), data: [] }
    }
    if (!storyGroupId) {
      return { success: true, data: [] }
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select(baseStoryColumns)
      .eq('user_id', userId)
      .eq('story_group_id', storyGroupId)
      .order('version_number', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Supabase listStoryVersions error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listStoryVersions error:', error)
    return { success: false, error, data: [] }
  }
}

export async function getUserStoryById(id, userId) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuario nao autenticado.'), data: null }
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select(baseStoryColumns)
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
      return { success: false, error: new Error('Usuario nao autenticado.'), count: 0 }
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

