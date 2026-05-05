import { supabase } from '../lib/supabaseClient'

const projectColumns = 'id, owner_id, name, description, created_at, updated_at'

function normalizeProjectPayload({ name, description = '' }) {
  return {
    name: String(name ?? '').trim(),
    description: String(description ?? '').trim() || null,
  }
}

export async function listProjects({ userId } = {}) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: [] }
    }

    const { data, error } = await supabase
      .from('projects')
      .select(projectColumns)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase listProjects error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listProjects error:', error)
    return { success: false, error, data: [] }
  }
}

export async function createProject({ name, description = '', userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    const payload = normalizeProjectPayload({ name, description })
    if (!payload.name) {
      return { success: false, error: new Error('Informe um nome para o projeto.'), data: null }
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...payload, owner_id: userId }])
      .select(projectColumns)
      .single()

    if (error) {
      console.error('Supabase createProject error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected createProject error:', error)
    return { success: false, error, data: null }
  }
}

export async function getProjectById({ projectId, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    if (!projectId) {
      return { success: false, error: new Error('Projeto não informado.'), data: null }
    }

    const { data, error } = await supabase
      .from('projects')
      .select(projectColumns)
      .eq('id', projectId)
      .maybeSingle()

    if (error) {
      console.error('Supabase getProjectById error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected getProjectById error:', error)
    return { success: false, error, data: null }
  }
}
