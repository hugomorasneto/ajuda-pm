import { useCopy, useLanguage } from '../../i18n/context'
import { teamOperationMessage, renderTeamMessage } from '../../utils/teamMessages'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addTeamMemberByEmail,
  listTeamMembers,
  removeTeamMember,
  updateTeamMemberRole,
} from '../../services/teamsService'

const EDITABLE_ROLES = ['member', 'admin', 'viewer']
const KNOWN_ROLES = ['owner', ...EDITABLE_ROLES]

function TeamMembersPanel({ team, userId, canManageProjectMembers }) {
  const t = useCopy('members')
  const { language } = useLanguage()
  const teamId = team?.id
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState(null)
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [message, setMessage] = useState(null)

  const currentUserTeamRole = useMemo(
    () => members.find((member) => member.user_id === userId)?.role ?? null,
    [members, userId],
  )
  const canManageTeamMembers =
    canManageProjectMembers || currentUserTeamRole === 'owner' || currentUserTeamRole === 'admin'
  const memberCountLabel = t('memberCount', { count: members.length })
  const managementLabel = canManageTeamMembers ? t('management') : t('readOnly')

  const loadMembers = useCallback(async () => {
    if (!teamId || !userId) return

    setIsLoading(true)
    const response = await listTeamMembers({ teamId, userId })
    setIsLoading(false)

    if (response.success) {
      setMembers(response.data ?? [])
      return
    }

    setMessage({ key: 'loadFailed' })
  }, [teamId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadMembers()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadMembers])

  async function handleAddMember(event) {
    event.preventDefault()
    setMessage(null)

    if (!canManageTeamMembers) {
      setMessage({ key: 'addPermission' })
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
      setMessage(teamOperationMessage(response.error, 'addFailed'))
      return
    }

    setEmail('')
    setRole('member')
    setMessage({ key: 'added' })
    await loadMembers()
  }

  async function handleUpdateMemberRole(member, nextRole) {
    if (!member || member.role === nextRole) return
    setMessage(null)

    if (!canManageTeamMembers) {
      setMessage({ key: 'editPermission' })
      return
    }

    if (member.role === 'owner') {
      setMessage({ key: 'editOwner' })
      return
    }

    if (member.user_id === userId) {
      setMessage({ key: 'editSelf' })
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
      setMessage(teamOperationMessage(response.error, 'editFailed'))
      return
    }

    setMembers((current) =>
      current.map((item) => (item.user_id === member.user_id ? { ...item, role: nextRole } : item)),
    )
    setMessage({ key: 'updated' })
  }

  async function handleRemoveMember(member) {
    if (!member) return
    setMessage(null)

    if (!canManageTeamMembers) {
      setMessage({ key: 'removePermission' })
      return
    }

    if (member.role === 'owner') {
      setMessage({ key: 'removeOwner' })
      return
    }

    if (member.user_id === userId) {
      setMessage({ key: 'removeSelf' })
      return
    }

    const confirmed = window.confirm(t('confirmRemove', { email: member.email }))
    if (!confirmed) return

    setRemovingMemberId(member.user_id)
    const response = await removeTeamMember({
      teamId,
      memberUserId: member.user_id,
      userId,
    })
    setRemovingMemberId(null)

    if (!response.success) {
      setMessage(teamOperationMessage(response.error, 'removeFailed'))
      return
    }

    setMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setMessage({ key: 'removed' })
  }

  return (
    <article className="project-detail-team">
      <div className="project-detail-team__header">
        <div className="project-detail-team__title">
          <h3 title={team.name}>{team.name}</h3>
          {team.description ? <p>{team.description}</p> : <p>{t('noDescription')}</p>}
        </div>
        <div className="project-detail-team__summary" aria-label={t('summary')}>
          <span>{memberCountLabel}</span>
          <span>{managementLabel}</span>
        </div>
      </div>

      <div className="project-detail-team__guidance">
        <strong>{canManageTeamMembers ? t('addPeople') : t('viewTeam')}</strong>
        <p>
          {canManageTeamMembers
            ? t('addHelp')
            : t('viewHelp')}
        </p>
      </div>

      {canManageTeamMembers ? (
        <form className="project-detail-team__member-form" onSubmit={handleAddMember}>
          <label className="projects-page__field">
            <span>{t('email')}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('emailExample')}
              disabled={isAdding}
              required
            />
          </label>
          <label className="projects-page__field">
            <span>{t('role')}</span>
            <select value={role} onChange={(event) => setRole(event.target.value)} disabled={isAdding}>
              {EDITABLE_ROLES.map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-secondary btn-small" disabled={isAdding || !email.trim()}>
            {isAdding ? t('adding') : t('add')}
          </button>
        </form>
      ) : (
        <p className="projects-page__state">
          {t('viewOnly')}
        </p>
      )}

      {message ? <p className="projects-page__message" role="status">{renderTeamMessage(t, message, language)}</p> : null}
      {isLoading ? <p className="projects-page__state">{t('loading')}</p> : null}

      <div className="project-detail-team__members">
        {!isLoading && members.length === 0 ? (
          <div className="project-detail-team__member project-detail-team__member--empty">
            <span>{t('empty')}</span>
          </div>
        ) : null}
        {members.map((member) => {
          const canEditMember =
            canManageTeamMembers && member.role !== 'owner' && member.user_id !== userId
          const isUpdatingMember = updatingMemberId === member.user_id
          const isRemovingMember = removingMemberId === member.user_id

          return (
            <div key={member.user_id} className="project-detail-team__member">
              <div className="project-detail-team__member-identity">
                <span title={member.email}>{member.email}</span>
                <small>{member.user_id === userId ? t('you') : t('teamMember')}</small>
              </div>
              {canEditMember ? (
                <div className="project-detail-team__member-controls">
                  <label className="project-detail-team__member-role">
                    <span>{t('role')}</span>
                    <select
                      value={member.role}
                      onChange={(event) => handleUpdateMemberRole(member, event.target.value)}
                      disabled={isUpdatingMember || isRemovingMember}
                    >
                      {EDITABLE_ROLES.map((option) => (
                        <option key={option} value={option}>
                          {t(option)}
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
                    {isRemovingMember ? t('removing') : t('remove')}
                  </button>
                </div>
              ) : (
                <strong className={`project-detail-team__role-badge project-detail-team__role-badge--${member.role}`}>
                  {KNOWN_ROLES.includes(member.role) ? t(member.role) : member.role}
                </strong>
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

export default TeamMembersPanel
