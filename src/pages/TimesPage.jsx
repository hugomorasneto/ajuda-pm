import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import TeamMembersPanel from '../components/projects/TeamMembersPanel'
import { useAuth } from '../hooks/useAuth'
import { checkCanManageProject, listProjects } from '../services/projectsService'
import { createTeam, listTeamsByProject } from '../services/teamsService'

function formatTeamMetric(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

function TimesPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [searchParams, setSearchParams] = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId') ?? ''
  const [projects, setProjects] = useState([])
  const [teamsByProject, setTeamsByProject] = useState({})
  const [canManageProjectById, setCanManageProjectById] = useState({})
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const teamCount = useMemo(
    () =>
      Object.values(teamsByProject).reduce(
        (total, projectTeams) => total + (Array.isArray(projectTeams) ? projectTeams.length : 0),
        0,
      ),
    [teamsByProject],
  )
  const teamCountLabel = useMemo(
    () => formatTeamMetric(teamCount, 'time criado', 'times criados'),
    [teamCount],
  )
  const canCreateForSelectedProject = Boolean(
    selectedProjectId && canManageProjectById[selectedProjectId],
  )

  const loadTeams = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    const projectsResponse = await listProjects({ userId })

    if (!projectsResponse.success) {
      setProjects([])
      setTeamsByProject({})
      setCanManageProjectById({})
      setMessage('Não foi possível carregar os projetos agora.')
      setIsLoading(false)
      return
    }

    const nextProjects = projectsResponse.data ?? []
    const entries = await Promise.all(
      nextProjects.map(async (project) => {
        const [teamsResponse, manageResponse] = await Promise.all([
          listTeamsByProject({ projectId: project.id, userId }),
          checkCanManageProject({ projectId: project.id, userId }),
        ])

        return [
          project.id,
          {
            canManage: manageResponse.success ? Boolean(manageResponse.data) : false,
            teams: teamsResponse.success ? (teamsResponse.data ?? []) : [],
          },
        ]
      }),
    )
    const nextTeamsByProject = Object.fromEntries(
      entries.map(([projectId, data]) => [projectId, data.teams]),
    )
    const nextCanManageProjectById = Object.fromEntries(
      entries.map(([projectId, data]) => [projectId, data.canManage]),
    )
    const fallbackProjectId = nextProjects[0]?.id ?? ''
    const requestedProjectIsAvailable = nextProjects.some((project) => project.id === projectIdFromUrl)
    const nextSelectedProjectId = requestedProjectIsAvailable ? projectIdFromUrl : fallbackProjectId

    setProjects(nextProjects)
    setTeamsByProject(nextTeamsByProject)
    setCanManageProjectById(nextCanManageProjectById)
    setSelectedProjectId((current) =>
      nextProjects.some((project) => project.id === current) ? current : nextSelectedProjectId,
    )
    setIsLoading(false)

    if (nextProjects.length > 0 && !projectIdFromUrl && fallbackProjectId) {
      setSearchParams({ projectId: fallbackProjectId }, { replace: true })
    }
  }, [projectIdFromUrl, setSearchParams, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadTeams()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadTeams])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Camada colaborativa',
      title: 'Times',
      pills: [
        { text: teamCountLabel },
        { text: formatTeamMetric(projects.length, 'projeto', 'projetos') },
      ],
    })

    return () => setTopbarStatus(null)
  }, [projects.length, setTopbarStatus, teamCountLabel])

  function handleProjectSelection(projectId) {
    setSelectedProjectId(projectId)
    if (projectId) {
      setSearchParams({ projectId }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  async function handleCreateTeam(event) {
    event.preventDefault()
    setMessage('')

    if (!selectedProjectId) {
      setMessage('Selecione um projeto para criar o time.')
      return
    }

    if (!canCreateForSelectedProject) {
      setMessage('Apenas responsáveis e administradores do projeto podem criar times.')
      return
    }

    setIsCreating(true)
    const response = await createTeam({
      projectId: selectedProjectId,
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
    setMessage('Time criado.')
    await loadTeams()
  }

  return (
    <div className="projects-page teams-page">
      <section className="panel projects-page__hero">
        <div className="projects-page__hero-copy">
          <p className="projects-page__eyebrow">Camada colaborativa</p>
          <h1>Times</h1>
          <p>
            Organize as guildas por projeto sem ocupar o detalhe da jornada. Times continuam vinculados a projetos e
            só entram quando a colaboração fizer sentido.
          </p>
          <div className="projects-page__hero-indicators" aria-label="Resumo dos times">
            <span className="projects-page__indicator">
              <strong>{teamCount}</strong>
              {teamCount === 1 ? 'time' : 'times'}
            </span>
            <span className="projects-page__indicator projects-page__indicator--free">
              Vinculados a projetos
            </span>
          </div>
        </div>
        <div className="projects-page__hero-actions">
          <Link className="btn btn-secondary btn-small" to="/projetos">
            Ver projetos
          </Link>
        </div>
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" aria-label="Criar time">
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">Novo time</p>
            <h2>Criar time</h2>
            <p>Escolha o projeto e crie um time para colaboração, refinamento e estimativas futuras.</p>
          </div>

          <form className="projects-page__form" onSubmit={handleCreateTeam}>
            <label className="projects-page__field">
              <span>Projeto</span>
              <select
                value={selectedProjectId}
                onChange={(event) => handleProjectSelection(event.target.value)}
                disabled={isLoading || isCreating || projects.length === 0}
              >
                {projects.length === 0 ? <option value="">Nenhum projeto disponível</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="projects-page__field">
              <span>Nome do time</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Guilda de Checkout"
                disabled={isCreating || isLoading || !canCreateForSelectedProject}
              />
            </label>

            <label className="projects-page__field">
              <span>Descrição opcional</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva responsabilidade, squad ou frente de trabalho."
                rows={4}
                disabled={isCreating || isLoading || !canCreateForSelectedProject}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || isLoading || !canCreateForSelectedProject}
            >
              {isCreating ? 'Criando time...' : 'Criar time'}
            </button>
          </form>

          {selectedProject && !canCreateForSelectedProject ? (
            <p className="projects-page__state">
              Você pode consultar os times de {selectedProject.name}. Apenas responsáveis e administradores criam novos
              times.
            </p>
          ) : null}
          {message ? <p className="projects-page__message">{message}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label="Times por projeto">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Times por projeto</p>
              <h2>{teamCountLabel}</h2>
            </div>
          </div>

          {isLoading ? <p className="projects-page__state">Carregando times...</p> : null}
          {!isLoading && projects.length === 0 ? (
            <div className="projects-page__empty">
              <h3>Nenhum projeto criado ainda</h3>
              <p>Crie um projeto antes de organizar times.</p>
              <Link className="btn btn-secondary btn-small" to="/projetos">
                Criar projeto
              </Link>
            </div>
          ) : null}

          <div className="teams-page__groups">
            {projects.map((project) => {
              const projectTeams = teamsByProject[project.id] ?? []
              const canManageProjectMembers = Boolean(canManageProjectById[project.id])

              return (
                <section key={project.id} className="teams-page__group" aria-label={`Times de ${project.name}`}>
                  <div className="teams-page__group-header">
                    <div>
                      <p className="projects-page__eyebrow">Projeto</p>
                      <h3>{project.name}</h3>
                    </div>
                    <Link className="btn btn-secondary btn-small" to={`/projetos/${project.id}`}>
                      Ver projeto
                    </Link>
                  </div>

                  {projectTeams.length === 0 ? (
                    <div className="projects-page__empty">
                      <h3>Nenhum time neste projeto</h3>
                      <p>Use o formulário ao lado para criar o primeiro time quando fizer sentido.</p>
                    </div>
                  ) : (
                    <div className="project-detail-page__teams">
                      {projectTeams.map((team) => (
                        <TeamMembersPanel
                          key={team.id}
                          team={team}
                          userId={userId}
                          canManageProjectMembers={canManageProjectMembers}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default TimesPage
