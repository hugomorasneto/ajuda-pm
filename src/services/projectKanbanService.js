import { supabase } from '../lib/supabaseClient'

export const KANBAN_STATUS_OPTIONS = [
  { value: 'created', label: 'Criada' },
  { value: 'refining', label: 'Em refinamento' },
  { value: 'ready_for_estimation', label: 'Pronta para estimar' },
  { value: 'estimated', label: 'Estimada' },
]

function requireUser(userId, fallbackData) {
  if (userId) return null
  return { success: false, error: new Error('Usuário não autenticado.'), data: fallbackData }
}

function requireValue(value, message, fallbackData) {
  if (value) return null
  return { success: false, error: new Error(message), data: fallbackData }
}

function normalizeBoardRows(rows = []) {
  const columns = new Map()

  for (const row of rows) {
    if (!row?.column_id) continue

    if (!columns.has(row.column_id)) {
      columns.set(row.column_id, {
        id: row.column_id,
        name: row.column_name,
        position: row.column_position,
        status_base: row.column_status_base,
        is_default: Boolean(row.column_is_default),
        cards: [],
      })
    }

    if (!row.story_id) continue

    columns.get(row.column_id).cards.push({
      id: row.story_id,
      user_id: row.story_user_id,
      story_group_key: row.story_group_key,
      kanban_column_id: row.column_id,
      kanban_position: row.story_position ?? 0,
      title: row.story_title,
      status: row.story_status,
      estimation_status: row.story_estimation_status,
      created_at: row.story_created_at,
      version_number: row.story_version_number,
      input_context: row.story_input_context,
      user_story: row.story_user_story,
    })
  }

  return Array.from(columns.values())
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
    .map((column) => ({
      ...column,
      cards: [...column.cards].sort((left, right) => {
        const positionDelta = (left.kanban_position ?? 0) - (right.kanban_position ?? 0)
        if (positionDelta !== 0) return positionDelta
        return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
      }),
    }))
}

export async function ensureProjectKanbanDefaults({ projectId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const projectError = requireValue(projectId, 'Projeto não informado.', [])
    if (projectError) return projectError

    const { data, error } = await supabase.rpc('ensure_project_kanban_defaults', {
      p_project_id: projectId,
    })

    if (error) {
      console.error('Supabase ensureProjectKanbanDefaults error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected ensureProjectKanbanDefaults error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listProjectKanbanBoard({ projectId, userId, limit = 200 }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const projectError = requireValue(projectId, 'Projeto não informado.', [])
    if (projectError) return projectError

    const { data, error } = await supabase.rpc('list_project_kanban_board', {
      p_project_id: projectId,
      p_limit: limit,
    })

    if (error) {
      console.error('Supabase listProjectKanbanBoard error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: normalizeBoardRows(data ?? []) }
  } catch (error) {
    console.error('Unexpected listProjectKanbanBoard error:', error)
    return { success: false, error, data: [] }
  }
}

export async function createProjectKanbanColumn({
  projectId,
  name,
  statusBase = 'created',
  userId,
}) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const projectError = requireValue(projectId, 'Projeto não informado.', null)
    if (projectError) return projectError

    const safeName = String(name ?? '').trim()
    if (!safeName) {
      return { success: false, error: new Error('Informe um nome para a coluna.'), data: null }
    }

    const { data, error } = await supabase.rpc('create_project_kanban_column', {
      p_project_id: projectId,
      p_name: safeName,
      p_status_base: statusBase,
    })

    if (error) {
      console.error('Supabase createProjectKanbanColumn error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected createProjectKanbanColumn error:', error)
    return { success: false, error, data: null }
  }
}

export async function updateProjectKanbanColumn({
  columnId,
  name,
  statusBase = 'created',
  userId,
}) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const columnError = requireValue(columnId, 'Coluna não informada.', null)
    if (columnError) return columnError

    const safeName = String(name ?? '').trim()
    if (!safeName) {
      return { success: false, error: new Error('Informe um nome para a coluna.'), data: null }
    }

    const { data, error } = await supabase.rpc('update_project_kanban_column', {
      p_column_id: columnId,
      p_name: safeName,
      p_status_base: statusBase,
    })

    if (error) {
      console.error('Supabase updateProjectKanbanColumn error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected updateProjectKanbanColumn error:', error)
    return { success: false, error, data: null }
  }
}

export async function reorderProjectKanbanColumn({ columnId, direction, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const columnError = requireValue(columnId, 'Coluna não informada.', [])
    if (columnError) return columnError

    const { data, error } = await supabase.rpc('reorder_project_kanban_column', {
      p_column_id: columnId,
      p_direction: direction,
    })

    if (error) {
      console.error('Supabase reorderProjectKanbanColumn error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected reorderProjectKanbanColumn error:', error)
    return { success: false, error, data: [] }
  }
}

export async function moveProjectKanbanStory({
  projectId,
  storyId,
  columnId,
  position = 0,
  userId,
}) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const projectError = requireValue(projectId, 'Projeto não informado.', null)
    if (projectError) return projectError

    const storyError = requireValue(storyId, 'História não informada.', null)
    if (storyError) return storyError

    const columnError = requireValue(columnId, 'Coluna não informada.', null)
    if (columnError) return columnError

    const { data, error } = await supabase.rpc('move_project_kanban_story', {
      p_project_id: projectId,
      p_story_id: storyId,
      p_column_id: columnId,
      p_position: Number(position) || 0,
    })

    if (error) {
      console.error('Supabase moveProjectKanbanStory error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected moveProjectKanbanStory error:', error)
    return { success: false, error, data: null }
  }
}
