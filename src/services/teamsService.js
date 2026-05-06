import { supabase } from '../lib/supabaseClient'

const teamColumns = 'id, project_id, owner_id, name, description, created_at, updated_at'
const editableTeamMemberRoles = new Set(['admin', 'member', 'viewer'])

function normalizeTeamPayload({ name, description = '' }) {
  return {
    name: String(name ?? '').trim(),
    description: String(description ?? '').trim() || null,
  }
}

export async function listTeamsByProject({ projectId, userId } = {}) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: [] }
    }
    if (!projectId) {
      return { success: false, error: new Error('Projeto não informado.'), data: [] }
    }

    const { data, error } = await supabase
      .from('teams')
      .select(teamColumns)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase listTeamsByProject error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listTeamsByProject error:', error)
    return { success: false, error, data: [] }
  }
}

export async function createTeam({ projectId, name, description = '', userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }
    if (!projectId) {
      return { success: false, error: new Error('Projeto não informado.'), data: null }
    }

    const payload = normalizeTeamPayload({ name, description })
    if (!payload.name) {
      return { success: false, error: new Error('Informe um nome para o time.'), data: null }
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([{ ...payload, project_id: projectId, owner_id: userId }])
      .select(teamColumns)
      .single()

    if (error) {
      console.error('Supabase createTeam error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected createTeam error:', error)
    return { success: false, error, data: null }
  }
}

export async function listTeamMembers({ teamId, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: [] }
    }
    if (!teamId) {
      return { success: false, error: new Error('Time não informado.'), data: [] }
    }

    const { data, error } = await supabase.rpc('list_team_members', {
      p_team_id: teamId,
    })

    if (error) {
      console.error('Supabase listTeamMembers error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listTeamMembers error:', error)
    return { success: false, error, data: [] }
  }
}

export async function addTeamMemberByEmail({ teamId, email, role = 'member', userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }
    if (!teamId) {
      return { success: false, error: new Error('Time não informado.'), data: null }
    }

    const safeEmail = String(email ?? '').trim()
    if (!safeEmail) {
      return { success: false, error: new Error('Informe o e-mail do membro.'), data: null }
    }

    const { data, error } = await supabase.rpc('add_team_member_by_email', {
      p_team_id: teamId,
      p_email: safeEmail,
      p_role: role,
    })

    if (error) {
      console.error('Supabase addTeamMemberByEmail error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected addTeamMemberByEmail error:', error)
    return { success: false, error, data: null }
  }
}

export async function updateTeamMemberRole({ teamId, memberUserId, role, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }
    if (!teamId) {
      return { success: false, error: new Error('Time não informado.'), data: null }
    }
    if (!memberUserId) {
      return { success: false, error: new Error('Membro não informado.'), data: null }
    }
    if (!editableTeamMemberRoles.has(role)) {
      return { success: false, error: new Error('Papel inválido para membro do time.'), data: null }
    }

    const { data, error } = await supabase.rpc('update_team_member_role', {
      p_team_id: teamId,
      p_member_user_id: memberUserId,
      p_role: role,
    })

    if (error) {
      console.error('Supabase updateTeamMemberRole error:', error)
      return { success: false, error, data: null }
    }

    const updatedMember = data?.[0] ?? null
    if (!updatedMember) {
      return {
        success: false,
        error: new Error('Não foi possível alterar o papel deste membro.'),
        data: null,
      }
    }

    return { success: true, data: updatedMember }
  } catch (error) {
    console.error('Unexpected updateTeamMemberRole error:', error)
    return { success: false, error, data: null }
  }
}

export async function removeTeamMember({ teamId, memberUserId, userId }) {
  try {
    if (!userId) {
      return { success: false, error: new Error('Usuário não autenticado.'), data: null }
    }
    if (!teamId) {
      return { success: false, error: new Error('Time não informado.'), data: null }
    }
    if (!memberUserId) {
      return { success: false, error: new Error('Membro não informado.'), data: null }
    }
    if (memberUserId === userId) {
      return { success: false, error: new Error('Você não pode remover seu próprio acesso por aqui.'), data: null }
    }

    const { data, error } = await supabase.rpc('remove_team_member', {
      p_team_id: teamId,
      p_member_user_id: memberUserId,
    })

    if (error) {
      console.error('Supabase removeTeamMember error:', error)
      return { success: false, error, data: null }
    }

    const removedMember = data?.[0] ?? null
    if (!removedMember) {
      return {
        success: false,
        error: new Error('Não foi possível remover este membro.'),
        data: null,
      }
    }

    return { success: true, data: removedMember }
  } catch (error) {
    console.error('Unexpected removeTeamMember error:', error)
    return { success: false, error, data: null }
  }
}
