import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  addProjectMemberByEmail,
  checkCanManageProject,
  getProjectById,
  listProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from '../services/projectsService'
import {
  listStoryHistoryGroups,
  updateUserStoryEstimationStatus,
} from '../services/userStoriesService'
import {
  addTeamMemberByEmail,
  createTeam,
  listTeamMembers,
  listTeamsByProject,
} from '../services/teamsService'

const TEAM_MEMBER_ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Visualizador' },
]

const PROJECT_MEMBER_ROLES = [
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

const ESTIMATION_STATUS_LABELS = {
  created: 'Criada',
  refining: 'Em refinamento',
  ready_for_estimation: 'Pronta para estimar',
  estimated: 'Estimada',
}

const ESTIMATION_STATUS_OPTIONS = [
  { value: 'created', label: 'Criada' },
  { value: 'refining', label: 'Em refinamento' },
  { value: 'ready_for_estimation', label: 'Pronta para estimar' },
  { value: 'estimated', label: 'Estimada' },
]

const STORY_ESTIMATION_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  ...ESTIMATION_STATUS_OPTIONS,
]

function formatProjectDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getEstimationStatusLabel(status) {
  return ESTIMATION_STATUS_LABELS[status] ?? 'Criada'
}

function TeamMembersPanel({ team, userId }) {
  const teamId = team?.id
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState('')

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

  return (
    <article className="project-detail-team">
      <div className="project-detail-team__header">
        <div>
          <h3>{team.name}</h3>
          {team.description ? <p>{team.description}</p> : <p>Sem descrição.</p>}
        </div>
      </div>

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

      {message ? <p className="projects-page__message">{message}</p> : null}
      {isLoading ? <p className="projects-page__state">Carregando membros...</p> : null}

      <div className="project-detail-team__members">
        {members.map((member) => (
          <div key={member.user_id} className="project-detail-team__member">
            <span>{member.email}</span>
            <strong>{ROLE_LABELS[member.role] ?? member.role}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}

function ProjectDetailPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [project, setProject] = useState(null)
  const [teams, setTeams] = useState([])
  const [projectMembers, setProjectMembers] = useState([])
  const [projectStories, setProjectStories] = useState([])
  const [projectStoryCount, setProjectStoryCount] = useState(0)
  const [projectStoryFilteredCount, setProjectStoryFilteredCount] = useState(0)
  const [storyEstimationFilter, setStoryEstimationFilter] = useState('all')
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isAddingProjectMember, setIsAddingProjectMember] = useState(false)
  const [updatingProjectMemberId, setUpdatingProjectMemberId] = useState(null)
  const [removingProjectMemberId, setRemovingProjectMemberId] = useState(null)
  const [updatingStoryStatusId, setUpdatingStoryStatusId] = useState(null)
  const [canManageProjectMembers, setCanManageProjectMembers] = useState(false)
  const [projectMessage, setProjectMessage] = useState('')
  const [storyStatusMessage, setStoryStatusMessage] = useState('')
  const [message, setMessage] = useState('')
  const [memberMessage, setMemberMessage] = useState('')
  const [notFound, setNotFound] = useState(false)

  const teamsLabel = useMemo(
    () => `${teams.length} ${teams.length === 1 ? 'time' : 'times'}`,
    [teams.length],
  )
  const storiesLabel = useMemo(
    () => `${projectStoryCount} ${projectStoryCount === 1 ? 'história' : 'histórias'}`,
    [projectStoryCount],
  )
  const membersLabel = useMemo(
    () => `${projectMembers.length} ${projectMembers.length === 1 ? 'membro' : 'membros'}`,
    [projectMembers.length],
  )
  const filteredStoriesLabel = useMemo(
    () =>
      `${projectStoryFilteredCount} ${
        projectStoryFilteredCount === 1 ? 'história encontrada' : 'histórias encontradas'
      }`,
    [projectStoryFilteredCount],
  )
  const currentStoryFilterLabel = useMemo(
    () =>
      STORY_ESTIMATION_FILTER_OPTIONS.find((option) => option.value === storyEstimationFilter)
        ?.label ?? 'Todas',
    [storyEstimationFilter],
  )
  const hasNoProjectStories = !isLoadingStories && projectStoryCount === 0
  const hasProjectStories = projectStoryCount > 0
  const hasNoStoriesForFilter =
    !isLoadingStories && projectStoryCount > 0 && projectStories.length === 0
  const shouldShowStoryLimitNotice = projectStoryFilteredCount > projectStories.length

  const loadProjectStories = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoadingStories(true)
    const storiesPromise = listStoryHistoryGroups({
      userId,
      projectFilter: 'project',
      projectId,
      estimationStatus: storyEstimationFilter,
      page: 1,
      pageSize: 50,
    })
    const totalsPromise =
      storyEstimationFilter === 'all'
        ? storiesPromise
        : listStoryHistoryGroups({
            userId,
            projectFilter: 'project',
            projectId,
            page: 1,
            pageSize: 1,
          })

    const [storiesResponse, totalsResponse] = await Promise.all([storiesPromise, totalsPromise])
    setIsLoadingStories(false)

    if (storiesResponse.success) {
      setProjectStories(storiesResponse.data ?? [])
      setProjectStoryFilteredCount(storiesResponse.totalCount ?? 0)
    } else {
      setProjectStories([])
      setProjectStoryFilteredCount(0)
    }

    if (totalsResponse.success) {
      setProjectStoryCount(totalsResponse.totalCount ?? 0)
    } else if (storyEstimationFilter === 'all') {
      setProjectStoryCount(0)
    }
  }, [projectId, storyEstimationFilter, userId])

  const loadProject = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoading(true)
    const [projectResponse, teamsResponse, membersResponse, manageResponse] =
      await Promise.all([
        getProjectById({ projectId, userId }),
        listTeamsByProject({ projectId, userId }),
        listProjectMembers({ projectId, userId }),
        checkCanManageProject({ projectId, userId }),
      ])
    setIsLoading(false)

    if (projectResponse.success && projectResponse.data) {
      setProject(projectResponse.data)
      setProjectNameDraft(projectResponse.data.name ?? '')
      setProjectDescriptionDraft(projectResponse.data.description ?? '')
      setNotFound(false)
    } else {
      setNotFound(true)
    }

    if (teamsResponse.success) {
      setTeams(teamsResponse.data ?? [])
    }

    if (membersResponse.success) {
      setProjectMembers(membersResponse.data ?? [])
    } else {
      setProjectMembers([])
    }

    setCanManageProjectMembers(manageResponse.success ? Boolean(manageResponse.data) : false)
  }, [projectId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProject()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProject])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectStories()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectStories])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Projeto',
      title: project?.name ?? 'Projeto',
      pills: [
        { text: storiesLabel },
        { text: membersLabel },
        { text: teamsLabel },
        { text: 'Times avançados' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [membersLabel, project?.name, setTopbarStatus, storiesLabel, teamsLabel])

  async function handleCreateTeam(event) {
    event.preventDefault()
    setMessage('')

    if (!canManageProjectMembers) {
      setMessage('Apenas responsáveis e administradores podem criar times neste projeto.')
      return
    }

    setIsCreating(true)

    const response = await createTeam({
      projectId,
      name,
      description,
      userId,
    })
    setIsCreating(false)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível criar o time agora.')
      return
    }

    setName('')
    setDescription('')
    setMessage('Time criado dentro deste projeto.')
    await loadProject()
  }

  async function handleUpdateProject(event) {
    event.preventDefault()
    setProjectMessage('')

    if (!canManageProjectMembers) {
      setProjectMessage('Apenas responsáveis e administradores podem editar este projeto.')
      return
    }

    setIsSavingProject(true)
    const response = await updateProject({
      projectId,
      name: projectNameDraft,
      description: projectDescriptionDraft,
      userId,
    })
    setIsSavingProject(false)

    if (!response.success || !response.data) {
      setProjectMessage(response.error?.message ?? 'Não foi possível atualizar o projeto agora.')
      return
    }

    setProject(response.data)
    setProjectNameDraft(response.data.name ?? '')
    setProjectDescriptionDraft(response.data.description ?? '')
    setIsEditingProject(false)
    setProjectMessage('Projeto atualizado.')
  }

  function handleCancelProjectEdit() {
    setProjectNameDraft(project?.name ?? '')
    setProjectDescriptionDraft(project?.description ?? '')
    setProjectMessage('')
    setIsEditingProject(false)
  }

  async function handleUpdateStoryEstimationStatus(story, estimationStatus) {
    if (!story || story.estimation_status === estimationStatus) return
    setStoryStatusMessage('')

    const canUpdateStoryStatus = canManageProjectMembers || story.user_id === userId
    if (!canUpdateStoryStatus) {
      setStoryStatusMessage(
        'Apenas quem criou a história ou responsáveis do projeto podem alterar o status de estimativa.',
      )
      return
    }

    setUpdatingStoryStatusId(story.id)
    const response = await updateUserStoryEstimationStatus({
      storyId: story.id,
      estimationStatus,
      userId,
    })
    setUpdatingStoryStatusId(null)

    if (!response.success || !response.data) {
      setStoryStatusMessage(response.error?.message ?? 'Não foi possível atualizar o status agora.')
      return
    }

    setProjectStories((current) =>
      current.map((item) =>
        item.id === story.id
          ? { ...item, estimation_status: response.data.estimation_status ?? estimationStatus }
          : item,
      ),
    )
    setStoryStatusMessage('Status de estimativa atualizado.')
    await loadProjectStories()
  }

  async function handleAddProjectMember(event) {
    event.preventDefault()
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('Apenas responsáveis e administradores podem adicionar membros ao projeto.')
      return
    }

    setIsAddingProjectMember(true)
    const response = await addProjectMemberByEmail({
      projectId,
      email: memberEmail,
      role: memberRole,
      userId,
    })
    setIsAddingProjectMember(false)

    if (!response.success) {
      setMemberMessage(response.error?.message ?? 'Não foi possível adicionar o membro agora.')
      return
    }

    setMemberEmail('')
    setMemberRole('member')
    setMemberMessage('Membro adicionado ao projeto.')
    await loadProject()
  }

  async function handleUpdateProjectMemberRole(member, nextRole) {
    if (!member || member.role === nextRole) return
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('Apenas responsáveis e administradores podem alterar papéis no projeto.')
      return
    }

    if (member.role === 'owner') {
      setMemberMessage('O owner do projeto não pode ter o papel alterado por aqui.')
      return
    }

    if (member.user_id === userId) {
      setMemberMessage('Você não pode alterar seu próprio papel por aqui.')
      return
    }

    setUpdatingProjectMemberId(member.user_id)
    const response = await updateProjectMemberRole({
      projectId,
      memberUserId: member.user_id,
      role: nextRole,
      userId,
    })
    setUpdatingProjectMemberId(null)

    if (!response.success) {
      setMemberMessage(response.error?.message ?? 'Não foi possível alterar o papel deste membro.')
      return
    }

    setProjectMembers((current) =>
      current.map((item) => (item.user_id === member.user_id ? { ...item, role: nextRole } : item)),
    )
    setMemberMessage('Papel do membro atualizado.')
  }

  async function handleRemoveProjectMember(member) {
    if (!member) return
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('Apenas responsáveis e administradores podem remover membros do projeto.')
      return
    }

    if (member.role === 'owner') {
      setMemberMessage('O owner do projeto não pode ser removido por aqui.')
      return
    }

    if (member.user_id === userId) {
      setMemberMessage('Você não pode remover seu próprio acesso por aqui.')
      return
    }

    const confirmed = window.confirm(`Remover ${member.email} deste projeto?`)
    if (!confirmed) return

    setRemovingProjectMemberId(member.user_id)
    const response = await removeProjectMember({
      projectId,
      memberUserId: member.user_id,
      userId,
    })
    setRemovingProjectMemberId(null)

    if (!response.success) {
      setMemberMessage(response.error?.message ?? 'Não foi possível remover este membro.')
      return
    }

    setProjectMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setMemberMessage('Membro removido do projeto.')
  }

  if (notFound) {
    return <Navigate to="/projetos" replace />
  }

  return (
    <div className="projects-page project-detail-page">
      <section className="panel projects-page__hero">
        <div>
          <p className="projects-page__eyebrow">Projeto</p>
          <h1>{project?.name ?? 'Carregando projeto...'}</h1>
          <p>
            Times ficam dentro do projeto para preparar colaboração futura sem atrapalhar o fluxo individual da Bancada.
          </p>
        </div>
        <div className="project-detail-page__actions">
          <Link className="btn btn-secondary btn-small" to="/projetos">
            Voltar para projetos
          </Link>
          {canManageProjectMembers ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditingProject((current) => !current)}
              disabled={isSavingProject}
            >
              {isEditingProject ? 'Fechar edição' : 'Editar projeto'}
            </button>
          ) : null}
          <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
            Abrir Bancada
          </Link>
        </div>
      </section>

      <section className="panel project-detail-page__settings" aria-label="Dados do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Dados do projeto</p>
            <h2>Contexto de organização</h2>
            <p>{project?.description || 'Sem descrição cadastrada.'}</p>
          </div>
        </div>

        {isEditingProject ? (
          <form className="project-detail-page__edit-form" onSubmit={handleUpdateProject}>
            <label className="projects-page__field">
              <span>Nome do projeto</span>
              <input
                type="text"
                value={projectNameDraft}
                onChange={(event) => setProjectNameDraft(event.target.value)}
                placeholder="Ex.: Onboarding de clientes"
                disabled={isSavingProject}
              />
            </label>

            <label className="projects-page__field">
              <span>Descrição opcional</span>
              <textarea
                value={projectDescriptionDraft}
                onChange={(event) => setProjectDescriptionDraft(event.target.value)}
                placeholder="Explique a jornada, squad ou objetivo do projeto."
                rows={4}
                disabled={isSavingProject}
              />
            </label>

            <div className="project-detail-page__edit-actions">
              <button type="submit" className="btn btn-primary btn-small" disabled={isSavingProject}>
                {isSavingProject ? 'Salvando...' : 'Salvar projeto'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleCancelProjectEdit}
                disabled={isSavingProject}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {projectMessage ? <p className="projects-page__message">{projectMessage}</p> : null}
      </section>

      <section className="panel project-detail-page__stories" aria-label="Histórias vinculadas ao projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Histórias do projeto</p>
            <h2>{storiesLabel}</h2>
            <p>Histórias vinculadas a este projeto, organizadas por status de estimativa.</p>
            {hasProjectStories ? (
              <p className="project-detail-page__story-filter-summary">
                {storyEstimationFilter === 'all'
                  ? filteredStoriesLabel
                  : `${filteredStoriesLabel} em ${currentStoryFilterLabel}.`}
              </p>
            ) : null}
          </div>
          <div className="project-detail-page__story-actions">
            <label className="project-detail-page__story-filter">
              <span>Filtrar status</span>
              <select
                value={storyEstimationFilter}
                onChange={(event) => setStoryEstimationFilter(event.target.value)}
                disabled={isLoadingStories}
              >
                {STORY_ESTIMATION_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              Forjar neste projeto
            </Link>
          </div>
        </div>

        {isLoadingStories ? <p className="projects-page__state">Carregando histórias...</p> : null}
        {hasNoProjectStories ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história vinculada ainda</h3>
            <p>Abra a Bancada com este projeto selecionado ou organize uma peça avulsa quando fizer sentido.</p>
          </div>
        ) : null}
        {hasNoStoriesForFilter ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história neste filtro</h3>
            <p>Troque o status selecionado para ver outras peças vinculadas a este projeto.</p>
          </div>
        ) : null}
        {storyStatusMessage ? <p className="projects-page__message">{storyStatusMessage}</p> : null}
        {shouldShowStoryLimitNotice ? (
          <p className="projects-page__state">Mostrando as 50 histórias mais recentes deste filtro.</p>
        ) : null}

        <div className="project-detail-page__story-list">
          {projectStories.map((story) => {
            const canUpdateStoryStatus = canManageProjectMembers || story.user_id === userId
            const isUpdatingStoryStatus = updatingStoryStatusId === story.id

            return (
              <article key={story.id} className="project-detail-page__story">
                <div>
                  <h3>{story.title}</h3>
                  <p>{story.input_context || story.user_story || 'Sem descrição.'}</p>
                </div>
                <div className="project-detail-page__story-meta">
                  <span>{formatProjectDateTime(story.created_at)}</span>
                  {canUpdateStoryStatus ? (
                    <label className="project-detail-page__story-status">
                      <span>Status de estimativa</span>
                      <select
                        value={story.estimation_status ?? 'created'}
                        onChange={(event) =>
                          handleUpdateStoryEstimationStatus(story, event.target.value)
                        }
                        disabled={isUpdatingStoryStatus}
                      >
                        {ESTIMATION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span>{getEstimationStatusLabel(story.estimation_status)}</span>
                  )}
                  <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                    Abrir na Bancada
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel project-detail-page__members" aria-label="Membros do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Membros do projeto</p>
            <h2>{membersLabel}</h2>
            <p>Pessoas com acesso ao contexto, histórias vinculadas e times deste projeto.</p>
          </div>
        </div>

        {canManageProjectMembers ? (
          <form className="project-detail-page__member-form" onSubmit={handleAddProjectMember}>
            <label className="projects-page__field">
              <span>E-mail cadastrado</span>
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="pessoa@empresa.com"
                disabled={isAddingProjectMember || isLoading}
              />
            </label>
            <label className="projects-page__field">
              <span>Papel</span>
              <select
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value)}
                disabled={isAddingProjectMember || isLoading}
              >
                {PROJECT_MEMBER_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary btn-small"
              disabled={isAddingProjectMember || isLoading}
            >
              {isAddingProjectMember ? 'Adicionando...' : 'Adicionar membro'}
            </button>
          </form>
        ) : (
          <p className="projects-page__state">
            Você pode consultar os membros. Apenas responsáveis e administradores adicionam novas pessoas.
          </p>
        )}

        {memberMessage ? <p className="projects-page__message">{memberMessage}</p> : null}
        {isLoading ? <p className="projects-page__state">Carregando membros...</p> : null}

        <div className="project-detail-page__member-list">
          {projectMembers.map((member) => {
            const canEditMember =
              canManageProjectMembers && member.role !== 'owner' && member.user_id !== userId
            const isUpdatingMember = updatingProjectMemberId === member.user_id
            const isRemovingMember = removingProjectMemberId === member.user_id

            return (
              <div key={member.user_id} className="project-detail-page__member">
                <span>{member.email}</span>
                {canEditMember ? (
                  <div className="project-detail-page__member-controls">
                    <label className="project-detail-page__member-role">
                      <span>Papel</span>
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleUpdateProjectMemberRole(member, event.target.value)
                        }
                        disabled={isUpdatingMember || isRemovingMember}
                      >
                        {PROJECT_MEMBER_ROLES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => handleRemoveProjectMember(member)}
                      disabled={isUpdatingMember || isRemovingMember || member.user_id === userId}
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
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" aria-label="Criar time no projeto">
          <p className="projects-page__eyebrow">Camada colaborativa</p>
          <h2>Criar time</h2>
          <p>
            Use times quando o projeto precisar reunir pessoas para colaboração futura.
            Apenas responsáveis e administradores criam times.
          </p>

          <form className="projects-page__form" onSubmit={handleCreateTeam}>
            <label className="projects-page__field">
              <span>Nome do time</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Guilda de Checkout"
                disabled={isCreating || isLoading || !canManageProjectMembers}
              />
            </label>

            <label className="projects-page__field">
              <span>Descrição opcional</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva responsabilidade, squad ou frente de trabalho."
                rows={4}
                disabled={isCreating || isLoading || !canManageProjectMembers}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || isLoading || !canManageProjectMembers}
            >
              {isCreating ? 'Criando time...' : 'Criar time'}
            </button>
          </form>
          {message ? <p className="projects-page__message">{message}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label="Times do projeto">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Times do projeto</p>
              <h2>{teamsLabel}</h2>
            </div>
          </div>

          {isLoading ? <p className="projects-page__state">Carregando times...</p> : null}
          {!isLoading && teams.length === 0 ? (
            <div className="projects-page__empty">
              <h3>Nenhum time criado ainda</h3>
              <p>Você pode manter este projeto individual e criar times apenas quando precisar colaborar.</p>
            </div>
          ) : null}

          <div className="project-detail-page__teams">
            {teams.map((team) => (
              <TeamMembersPanel key={team.id} team={team} userId={userId} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProjectDetailPage
