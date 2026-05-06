import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addTeamMemberByEmail,
  listTeamMembers,
  removeTeamMember,
  updateTeamMemberRole,
} from '../../services/teamsService'

const TEAM_MEMBER_ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Visualizador' },
]

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Visualizador',
}

function TeamMembersPanel({ team, userId, canManageProjectMembers }) {
  const teamId = team?.id
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState(null)
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [message, setMessage] = useState('')

  const currentUserTeamRole = useMemo(
    () => members.find((member) => member.user_id === userId)?.role ?? null,
    [members, userId],
  )
  const canManageTeamMembers =
    canManageProjectMembers || currentUserTeamRole === 'owner' || currentUserTeamRole === 'admin'

  const loadMembers = useCallback(async () => {
    if (!teamId || !userId) return

    setIsLoading(true)
    const response = await listTeamMembers({ teamId, userId })
    setIsLoading(false)

    if (response.success) {
      setMembers(response.data ?? [])
      return
    }

    setMessage('Não foi possível carregar os membros deste time.')
  }, [teamId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadMembers()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadMembers])

  async function handleAddMember(event) {
    event.preventDefault()
    setMessage('')

    if (!canManageTeamMembers) {
      setMessage('Apenas administradores do projeto ou do time podem adicionar membros.')
      return
    }

    setIsAdding(true)

    const response = await addTeamMemberByEmail({
      teamId,
      email,
      role,
      userId,
    })
    setIsAdding(false)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível adicionar o membro agora.')
      return
    }

    setEmail('')
    setRole('member')
    setMessage('Membro adicionado ao time.')
    await loadMembers()
  }

  async function handleUpdateMemberRole(member, nextRole) {
    if (!member || member.role === nextRole) return
    setMessage('')

    if (!canManageTeamMembers) {
      setMessage('Apenas administradores do projeto ou do time podem alterar papéis.')
      return
    }

    if (member.role === 'owner') {
      setMessage('O owner do time não pode ter o papel alterado por aqui.')
      return
    }

    if (member.user_id === userId) {
      setMessage('Você não pode alterar seu próprio papel por aqui.')
      return
    }

    setUpdatingMemberId(member.user_id)
    const response = await updateTeamMemberRole({
      teamId,
      memberUserId: member.user_id,
      role: nextRole,
      userId,
    })
    setUpdatingMemberId(null)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível alterar o papel deste membro.')
      return
    }

    setMembers((current) =>
      current.map((item) => (item.user_id === member.user_id ? { ...item, role: nextRole } : item)),
    )
    setMessage('Papel do membro atualizado.')
  }

  async function handleRemoveMember(member) {
    if (!member) return
    setMessage('')

    if (!canManageTeamMembers) {
      setMessage('Apenas administradores do projeto ou do time podem remover membros.')
      return
    }

    if (member.role === 'owner') {
      setMessage('O owner do time não pode ser removido por aqui.')
      return
    }

    if (member.user_id === userId) {
      setMessage('Você não pode remover seu próprio acesso por aqui.')
      return
    }

    const confirmed = window.confirm(`Remover ${member.email} deste time?`)
    if (!confirmed) return

    setRemovingMemberId(member.user_id)
    const response = await removeTeamMember({
      teamId,
      memberUserId: member.user_id,
      userId,
    })
    setRemovingMemberId(null)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível remover este membro.')
      return
    }

    setMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setMessage('Membro removido do time.')
  }

  return (
    <article className="project-detail-team">
      <div className="project-detail-team__header">
        <div>
          <h3>{team.name}</h3>
          {team.description ? <p>{team.description}</p> : <p>Sem descrição.</p>}
        </div>
      </div>

      {canManageTeamMembers ? (
        <form className="project-detail-team__member-form" onSubmit={handleAddMember}>
          <label className="projects-page__field">
            <span>E-mail cadastrado</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pessoa@empresa.com"
              disabled={isAdding}
            />
          </label>
          <label className="projects-page__field">
            <span>Papel</span>
            <select value={role} onChange={(event) => setRole(event.target.value)} disabled={isAdding}>
              {TEAM_MEMBER_ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-secondary btn-small" disabled={isAdding}>
            {isAdding ? 'Adicionando...' : 'Adicionar membro'}
          </button>
        </form>
      ) : (
        <p className="projects-page__state">
          Você pode consultar os membros. Apenas administradores do projeto ou do time adicionam novas pessoas.
        </p>
      )}

      {message ? <p className="projects-page__message">{message}</p> : null}
      {isLoading ? <p className="projects-page__state">Carregando membros...</p> : null}

      <div className="project-detail-team__members">
        {members.map((member) => {
          const canEditMember =
            canManageTeamMembers && member.role !== 'owner' && member.user_id !== userId
          const isUpdatingMember = updatingMemberId === member.user_id
          const isRemovingMember = removingMemberId === member.user_id

          return (
            <div key={member.user_id} className="project-detail-team__member">
              <span>{member.email}</span>
              {canEditMember ? (
                <div className="project-detail-team__member-controls">
                  <label className="project-detail-team__member-role">
                    <span>Papel</span>
                    <select
                      value={member.role}
                      onChange={(event) => handleUpdateMemberRole(member, event.target.value)}
                      disabled={isUpdatingMember || isRemovingMember}
                    >
                      {TEAM_MEMBER_ROLES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => handleRemoveMember(member)}
                    disabled={isUpdatingMember || isRemovingMember}
                  >
                    {isRemovingMember ? 'Removendo...' : 'Remover'}
                  </button>
                </div>
              ) : (
                <strong>{ROLE_LABELS[member.role] ?? member.role}</strong>
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

export default TeamMembersPanel
