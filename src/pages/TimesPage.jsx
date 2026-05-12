import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const createSectionRef = useRef(null)
  const projectIdFromUrl = searchParams.get('projectId') ?? ''
  const [projects, setProjects] = useState([])
  const [teamsByProject, setTeamsByProject] = useState({})
  const [canManageProjectById, setCanManageProjectById] = useState({})
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlySelectedProject, setShowOnlySelectedProject] = useState(Boolean(projectIdFromUrl))
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
  const projectCountLabel = useMemo(
    () => formatTeamMetric(projects.length, 'projeto disponível', 'projetos disponíveis'),
    [projects.length],
  )
  const projectsWithTeamsCount = useMemo(
    () =>
      projects.filter((project) => {
        const projectTeams = teamsByProject[project.id] ?? []
        return projectTeams.length > 0
      }).length,
    [projects, teamsByProject],
  )
  const manageableProjectCount = useMemo(
    () => projects.filter((project) => canManageProjectById[project.id]).length,
    [canManageProjectById, projects],
  )
  const visibleProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')

    return projects.filter((project) => {
      if (showOnlySelectedProject && selectedProjectId && project.id !== selectedProjectId) {
        return false
      }

      if (!normalizedSearch) return true

      const projectTeams = teamsByProject[project.id] ?? []
      const projectText = [project.name, project.description].join(' ').toLocaleLowerCase('pt-BR')
      const teamsText = projectTeams
        .map((team) => [team.name, team.description].join(' '))
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return projectText.includes(normalizedSearch) || teamsText.includes(normalizedSearch)
    })
  }, [projects, searchTerm, selectedProjectId, showOnlySelectedProject, teamsByProject])
  const visibleTeamCount = useMemo(
    () =>
      visibleProjects.reduce((total, project) => {
        const projectTeams = teamsByProject[project.id] ?? []
        return total + projectTeams.length
      }, 0),
    [teamsByProject, visibleProjects],
  )
  const visibleTeamCountLabel = useMemo(
    () => formatTeamMetric(visibleTeamCount, 'time exibido', 'times exibidos'),
    [visibleTeamCount],
  )
  const visibleProjectCountLabel = useMemo(
    () => formatTeamMetric(visibleProjects.length, 'projeto exibido', 'projetos exibidos'),
    [visibleProjects.length],
  )
  const selectedProjectTeamCount = selectedProject
    ? (teamsByProject[selectedProject.id] ?? []).length
    : 0
  const canCreateForSelectedProject = Boolean(
    selectedProjectId && canManageProjectById[selectedProjectId],
  )
  const hasFilteredNoResults = !isLoading && projects.length > 0 && visibleProjects.length === 0

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
  }, [projectIdFromUrl, userId])

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
        { text: projectCountLabel },
      ],
    })

    return () => setTopbarStatus(null)
  }, [projectCountLabel, setTopbarStatus, teamCountLabel])

  function handleProjectSelection(projectId) {
    setSelectedProjectId(projectId)
    if (projectId) {
      setSearchParams({ projectId }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  function handleSelectProjectForCreation(projectId) {
    handleProjectSelection(projectId)
    setShowOnlySelectedProject(true)
    setMessage('Projeto selecionado para criação do time.')
    window.requestAnimationFrame(() => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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
            entram como uma camada leve para refino, estimativa e acompanhamento.
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

      <section className="teams-page__overview" aria-label="Resumo operacional de times">
        <article className="teams-page__overview-card teams-page__overview-card--primary">
          <span>Colaboração</span>
          <strong>{teamCount}</strong>
          <p>{teamCount === 1 ? 'time pronto para organizar pessoas.' : 'times prontos para organizar pessoas.'}</p>
        </article>
        <article className="teams-page__overview-card">
          <span>Projetos com times</span>
          <strong>{projectsWithTeamsCount}</strong>
          <p>Projetos que já possuem uma guilda de trabalho vinculada.</p>
        </article>
        <article className="teams-page__overview-card">
          <span>Gestão liberada</span>
          <strong>{manageableProjectCount}</strong>
          <p>Projetos onde você pode criar times e administrar membros.</p>
        </article>
        <article className="teams-page__overview-card">
          <span>Fluxo recomendado</span>
          <strong>Projeto</strong>
          <p>Crie times apenas quando houver colaboração recorrente no projeto.</p>
        </article>
      </section>

      {projectIdFromUrl && selectedProject ? (
        <section className="panel teams-page__context" aria-label="Projeto em foco">
          <div className="teams-page__context-copy">
            <p className="projects-page__eyebrow">Projeto em foco</p>
            <h2>{selectedProject.name}</h2>
            <p>
              Você entrou a partir de um projeto. Este contexto tem{' '}
              {formatTeamMetric(selectedProjectTeamCount, 'time vinculado', 'times vinculados')}.
            </p>
          </div>
          <div className="teams-page__context-actions">
            <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProject.id}`}>
              Abrir projeto
            </Link>
            <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${selectedProject.id}`}>
              Abrir Roda
            </Link>
          </div>
        </section>
      ) : null}

      <div className="projects-page__layout">
        <section ref={createSectionRef} className="panel projects-page__form-card" aria-label="Criar time">
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">Novo time</p>
            <h2>Criar time</h2>
            <p>Escolha o projeto e crie um time para colaboração, refinamento e estimativas futuras.</p>
          </div>

          <div className="teams-page__creation-status" aria-label="Permissão para criar time">
            <strong>
              {selectedProject
                ? canCreateForSelectedProject
                  ? 'Você pode criar times neste projeto.'
                  : 'Somente consulta neste projeto.'
                : 'Selecione um projeto para começar.'}
            </strong>
            <p>
              Times não são obrigatórios para usar a Bancada. Use esta área quando o projeto precisar de organização
              colaborativa.
            </p>
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
                required
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
              disabled={isCreating || isLoading || !canCreateForSelectedProject || !name.trim()}
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
              <h2>{visibleTeamCountLabel}</h2>
            </div>
            <div className="teams-page__section-metrics" aria-label="Resumo da listagem">
              <span className="projects-page__section-count">{visibleProjectCountLabel}</span>
              <span className="projects-page__section-count">{teamCountLabel}</span>
            </div>
          </div>

          <div className="teams-page__toolbar" aria-label="Filtros de times">
            <label className="projects-page__field projects-page__field--search">
              <span>Buscar time ou projeto</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nome do projeto, time ou descrição"
              />
            </label>
            <div className="teams-page__toolbar-actions">
              <button
                type="button"
                className={`btn btn-secondary btn-small ${showOnlySelectedProject ? 'is-active' : ''}`}
                disabled={!selectedProjectId}
                onClick={() => setShowOnlySelectedProject((current) => !current)}
              >
                {showOnlySelectedProject ? 'Ver todos os projetos' : 'Ver projeto selecionado'}
              </button>
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
          {hasFilteredNoResults ? (
            <div className="projects-page__empty">
              <h3>Nenhum resultado encontrado</h3>
              <p>Limpe a busca ou veja todos os projetos para revisar os times disponíveis.</p>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setSearchTerm('')
                  setShowOnlySelectedProject(false)
                }}
              >
                Limpar filtros
              </button>
            </div>
          ) : null}

          <div className="teams-page__groups">
            {visibleProjects.map((project) => {
              const projectTeams = teamsByProject[project.id] ?? []
              const canManageProjectMembers = Boolean(canManageProjectById[project.id])

              return (
                <section key={project.id} className="teams-page__group" aria-label={`Times de ${project.name}`}>
                  <div className="teams-page__group-header">
                    <div className="teams-page__group-title">
                      <p className="projects-page__eyebrow">Projeto</p>
                      <h3>{project.name}</h3>
                      <p>
                        {formatTeamMetric(projectTeams.length, 'time vinculado', 'times vinculados')} ·{' '}
                        {canManageProjectMembers ? 'Você pode gerenciar membros' : 'Somente visualização'}
                      </p>
                    </div>
                    <div className="teams-page__group-actions">
                      {canManageProjectMembers ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => handleSelectProjectForCreation(project.id)}
                        >
                          Criar time aqui
                        </button>
                      ) : null}
                      <Link className="btn btn-secondary btn-small" to={`/projetos/${project.id}`}>
                        Ver projeto
                      </Link>
                      <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${project.id}`}>
                        Abrir Roda
                      </Link>
                    </div>
                  </div>

                  <div className="teams-page__group-metrics" aria-label={`Resumo de ${project.name}`}>
                    <span>{formatTeamMetric(projectTeams.length, 'time vinculado', 'times vinculados')}</span>
                    <span>{canManageProjectMembers ? 'Gestão de membros liberada' : 'Gestão somente leitura'}</span>
                    <span>Rodas vinculadas ao projeto</span>
                  </div>

                  {projectTeams.length === 0 ? (
                    <div className="projects-page__empty">
                      <h3>Nenhum time neste projeto</h3>
                      <p>Crie um time quando a organização do projeto pedir colaboração recorrente.</p>
                      {canManageProjectMembers ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => handleSelectProjectForCreation(project.id)}
                        >
                          Preparar primeiro time
                        </button>
                      ) : null}
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
