import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProjectById } from '../services/projectsService'
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

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Visualizador',
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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [notFound, setNotFound] = useState(false)

  const teamsLabel = useMemo(
    () => `${teams.length} ${teams.length === 1 ? 'time' : 'times'}`,
    [teams.length],
  )

  const loadProject = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoading(true)
    const [projectResponse, teamsResponse] = await Promise.all([
      getProjectById({ projectId, userId }),
      listTeamsByProject({ projectId, userId }),
    ])
    setIsLoading(false)

    if (projectResponse.success && projectResponse.data) {
      setProject(projectResponse.data)
      setNotFound(false)
    } else {
      setNotFound(true)
    }

    if (teamsResponse.success) {
      setTeams(teamsResponse.data ?? [])
    }
  }, [projectId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProject()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProject])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Projeto',
      title: project?.name ?? 'Projeto',
      pills: [
        { text: teamsLabel },
        { text: 'Times avançados' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [project?.name, setTopbarStatus, teamsLabel])

  async function handleCreateTeam(event) {
    event.preventDefault()
    setMessage('')
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
          <Link className="btn btn-primary btn-small" to="/tool">
            Abrir Bancada
          </Link>
        </div>
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" aria-label="Criar time no projeto">
          <p className="projects-page__eyebrow">Camada colaborativa</p>
          <h2>Criar time</h2>
          <p>Use times quando o projeto precisar reunir pessoas para colaboração futura.</p>

          <form className="projects-page__form" onSubmit={handleCreateTeam}>
            <label className="projects-page__field">
              <span>Nome do time</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Guilda de Checkout"
                disabled={isCreating || isLoading}
              />
            </label>

            <label className="projects-page__field">
              <span>Descrição opcional</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva responsabilidade, squad ou frente de trabalho."
                rows={4}
                disabled={isCreating || isLoading}
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={isCreating || isLoading}>
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
