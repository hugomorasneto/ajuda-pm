import { supabase } from '../lib/supabaseClient'

const baseStoryColumns =
  'id, user_id, project_id, estimation_status, story_group_id, version_number, previous_version_id, regeneration_instruction, title, created_at, input_context, input_requirements, objective, user_story, acceptance_criteria, business_rules, gaps, qa_checklist, status'

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

export async function updateUserStoryEstimationStatus({ storyId, estimationStatus, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    if (!storyId) {
      return { success: false, error: new Error('História não informada.'), data: null }
    }

    const { data, error } = await supabase.rpc('update_user_story_estimation_status', {
      p_story_id: storyId,
      p_estimation_status: estimationStatus,
    })

    if (error) {
      console.error('Supabase updateUserStoryEstimationStatus error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected updateUserStoryEstimationStatus error:', error)
    return { success: false, error, data: null }
  }
}

export async function listRecentUserStories({
  limit = 10,
  sinceIso = null,
  offset = 0,
  userId,
  projectFilter = 'all',
  projectId = null,
} = {}) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: [] }
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

    if (projectFilter === 'none') {
      query = query.is('project_id', null)
    } else if (projectFilter === 'project' && projectId) {
      query = query.eq('project_id', projectId)
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

export async function listRecentStoryGroups({
  limit = 10,
  sinceIso = null,
  userId,
  projectFilter = 'all',
  projectId = null,
} = {}) {
  const response = await listRecentUserStories({
    limit: Math.max(50, limit * 4),
    sinceIso,
    offset: 0,
    userId,
    projectFilter,
    projectId,
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

export async function listStoryHistoryGroups({
  userId,
  search = '',
  sinceIso = null,
  status = 'all',
  estimationStatus = 'all',
  projectFilter = 'all',
  projectId = null,
  page = 1,
  pageSize = 10,
} = {}) {
  try {
    if (!userId) {
      return {
        success: false,
        error: new Error('Usuário não autenticado.'),
        data: [],
        totalCount: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      }
    }

    const safePageSize = Math.max(1, Math.min(Number(pageSize) || 10, 50))
    const safePage = Math.max(1, Number(page) || 1)
    const offset = (safePage - 1) * safePageSize
    const normalizedSearch = String(search ?? '').trim()
    const normalizedStatus = status && status !== 'all' ? status : null
    const normalizedEstimationStatus =
      estimationStatus && estimationStatus !== 'all' ? estimationStatus : null
    const normalizedProjectFilter = ['all', 'none', 'project'].includes(projectFilter)
      ? projectFilter
      : 'all'

    const { data, error } = await supabase.rpc('search_user_story_groups', {
      p_user_id: userId,
      p_search: normalizedSearch || null,
      p_since: sinceIso,
      p_status: normalizedStatus,
      p_estimation_status: normalizedEstimationStatus,
      p_limit: safePageSize,
      p_offset: offset,
      p_project_filter: normalizedProjectFilter,
      p_project_id: normalizedProjectFilter === 'project' ? projectId : null,
    })

    if (error) {
      console.error('Supabase listStoryHistoryGroups error:', error)
      return {
        success: false,
        error,
        data: [],
        totalCount: 0,
        page: safePage,
        pageSize: safePageSize,
        totalPages: 0,
      }
    }

    const totalCount = Number(data?.[0]?.total_count ?? 0)
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / safePageSize) : 0

    return {
      success: true,
      data: data ?? [],
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    }
  } catch (error) {
    console.error('Unexpected listStoryHistoryGroups error:', error)
    return {
      success: false,
      error,
      data: [],
      totalCount: 0,
      page: Math.max(1, Number(page) || 1),
      pageSize,
      totalPages: 0,
    }
  }
}

export async function listStoryVersions({ storyGroupId, userId, limit = 20 } = {}) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: [] }
    }
    if (!storyGroupId) {
      return { success: true, data: [] }
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select(baseStoryColumns)
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
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select(baseStoryColumns)
      .eq('id', id)
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
