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

export async function updateProject({ projectId, name, description = '', userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('UsuÃ¡rio nÃ£o autenticado.'), data: null }
    }

    if (!projectId) {
      return { success: false, error: new Error('Projeto nÃ£o informado.'), data: null }
    }

    const payload = normalizeProjectPayload({ name, description })
    if (!payload.name) {
      return { success: false, error: new Error('Informe um nome para o projeto.'), data: null }
    }

    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', projectId)
      .select(projectColumns)
      .single()

    if (error) {
      console.error('Supabase updateProject error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected updateProject error:', error)
    return { success: false, error, data: null }
  }
}

export async function checkCanManageProject({ projectId, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('UsuÃ¡rio nÃ£o autenticado.'), data: false }
    }

    if (!projectId) {
      return { success: false, error: new Error('Projeto nÃ£o informado.'), data: false }
    }

    const { data, error } = await supabase.rpc('can_manage_project', {
      p_project_id: projectId,
    })

    if (error) {
      console.error('Supabase checkCanManageProject error:', error)
      return { success: false, error, data: false }
    }

    return { success: true, data: Boolean(data) }
  } catch (error) {
    console.error('Unexpected checkCanManageProject error:', error)
    return { success: false, error, data: false }
  }
}

export async function listProjectMembers({ projectId, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('UsuÃ¡rio nÃ£o autenticado.'), data: [] }
    }

    if (!projectId) {
      return { success: false, error: new Error('Projeto nÃ£o informado.'), data: [] }
    }

    const { data, error } = await supabase.rpc('list_project_members', {
      p_project_id: projectId,
    })

    if (error) {
      console.error('Supabase listProjectMembers error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listProjectMembers error:', error)
    return { success: false, error, data: [] }
  }
}

export async function addProjectMemberByEmail({ projectId, email, role = 'member', userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('UsuÃ¡rio nÃ£o autenticado.'), data: null }
    }

    if (!projectId) {
      return { success: false, error: new Error('Projeto nÃ£o informado.'), data: null }
    }

    const safeEmail = String(email ?? '').trim()
    if (!safeEmail) {
      return { success: false, error: new Error('Informe o e-mail do membro.'), data: null }
    }

    const { data, error } = await supabase.rpc('add_project_member_by_email', {
      p_project_id: projectId,
      p_email: safeEmail,
      p_role: role,
    })

    if (error) {
      console.error('Supabase addProjectMemberByEmail error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected addProjectMemberByEmail error:', error)
    return { success: false, error, data: null }
  }
}
