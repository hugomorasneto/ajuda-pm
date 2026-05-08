import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createProject, listProjects } from '../services/projectsService'
import { listTeamsByProject } from '../services/teamsService'
import { listStoryHistoryGroups } from '../services/userStoriesService'

const EMPTY_PROJECT_STATS = {
  storyCount: 0,
  readyStoryCount: 0,
  teamCount: 0,
}

const PROJECT_PORTFOLIO_FILTERS = [
  {
    value: 'all',
    label: 'Todos',
    description: 'Projetos cadastrados.',
  },
  {
    value: 'with_ready_stories',
    label: 'Prontos para Roda',
    description: 'Com histórias prontas.',
  },
  {
    value: 'with_teams',
    label: 'Com times',
    description: 'Colaboração ativa.',
  },
  {
    value: 'without_stories',
    label: 'Sem histórias',
    description: 'Ainda sem peças.',
  },
]

function formatProjectDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatProjectMetric(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

function ProjectsPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [projects, setProjects] = useState([])
  const [projectStatsById, setProjectStatsById] = useState({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')
  const nameInputRef = useRef(null)

  const projectCountLabel = useMemo(
    () => `${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'}`,
    [projects.length],
  )
  const portfolioTotals = useMemo(
    () =>
      projects.reduce(
        (totals, project) => {
          const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS

          return {
            storyCount: totals.storyCount + stats.storyCount,
            readyStoryCount: totals.readyStoryCount + stats.readyStoryCount,
            teamCount: totals.teamCount + stats.teamCount,
          }
        },
        { storyCount: 0, readyStoryCount: 0, teamCount: 0 },
      ),
    [projectStatsById, projects],
  )
  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchInput.trim().toLowerCase()

    return projects.filter((project) => {
      const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS
      const matchesSearch =
        !normalizedSearch ||
        project.name?.toLowerCase().includes(normalizedSearch) ||
        project.description?.toLowerCase().includes(normalizedSearch)

      if (!matchesSearch) return false

      if (portfolioFilter === 'with_ready_stories') {
        return stats.readyStoryCount > 0
      }

      if (portfolioFilter === 'with_teams') {
        return stats.teamCount > 0
      }

      if (portfolioFilter === 'without_stories') {
        return stats.storyCount === 0
      }

      return true
    })
  }, [portfolioFilter, projectStatsById, projects, searchInput])
  const filteredProjectCountLabel = useMemo(
    () =>
      formatProjectMetric(
        filteredProjects.length,
        'projeto encontrado',
        'projetos encontrados',
      ),
    [filteredProjects.length],
  )
  const hasNoProjectsForFilter =
    !isLoading && projects.length > 0 && filteredProjects.length === 0

  const loadProjectStats = useCallback(
    async (nextProjects) => {
      if (!userId || nextProjects.length === 0) {
        setProjectStatsById({})
        return
      }

      setIsLoadingStats(true)
      const entries = await Promise.all(
        nextProjects.map(async (project) => {
          const [storiesResponse, readyStoriesResponse, teamsResponse] = await Promise.all([
            listStoryHistoryGroups({
              userId,
              projectFilter: 'project',
              projectId: project.id,
              page: 1,
              pageSize: 1,
            }),
            listStoryHistoryGroups({
              userId,
              projectFilter: 'project',
              projectId: project.id,
              estimationStatus: 'ready_for_estimation',
              page: 1,
              pageSize: 1,
            }),
            listTeamsByProject({ projectId: project.id, userId }),
          ])

          return [
            project.id,
            {
              storyCount: storiesResponse.success ? storiesResponse.totalCount : 0,
              readyStoryCount: readyStoriesResponse.success ? readyStoriesResponse.totalCount : 0,
              teamCount: teamsResponse.success ? (teamsResponse.data?.length ?? 0) : 0,
            },
          ]
        }),
      )
      setProjectStatsById(Object.fromEntries(entries))
      setIsLoadingStats(false)
    },
    [userId],
  )

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    const response = await listProjects({ userId })
    setIsLoading(false)

    if (response.success) {
      const nextProjects = response.data ?? []
      setProjects(nextProjects)
      await loadProjectStats(nextProjects)
      return
    }

    setMessage('Não foi possível carregar os projetos agora.')
  }, [loadProjectStats, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjects()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjects])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Organização opcional',
      title: 'Projetos',
      pills: [
        { text: projectCountLabel },
        { text: 'Bancada continua livre' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [projectCountLabel, setTopbarStatus])

  async function handleCreateProject(event) {
    event.preventDefault()
    setMessage('')
    setIsCreating(true)

    const response = await createProject({
      name,
      description,
      userId,
    })
    setIsCreating(false)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível criar o projeto agora.')
      return
    }

    setName('')
    setDescription('')
    setMessage('Projeto criado. Você já pode selecionar esse contexto na Bancada.')
    await loadProjects()
  }

  function focusCreateProject() {
    nameInputRef.current?.focus()
  }

  return (
    <div className="projects-page">
      <section className="panel projects-page__hero">
        <div className="projects-page__hero-copy">
          <p className="projects-page__eyebrow">Organização opcional</p>
          <h1>Projetos</h1>
          <p>
            Agrupe histórias por jornada, squad ou iniciativa quando fizer sentido. Se quiser começar direto,
            a Bancada continua funcionando sem projeto.
          </p>
          <div className="projects-page__hero-indicators" aria-label="Resumo da organização por projetos">
            <span className="projects-page__indicator">
              <strong>{projects.length}</strong>
              {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
            <span className="projects-page__indicator">
              <strong>{portfolioTotals.storyCount}</strong>
              {portfolioTotals.storyCount === 1 ? 'história' : 'histórias'}
            </span>
            <span className="projects-page__indicator projects-page__indicator--ready">
              <strong>{portfolioTotals.readyStoryCount}</strong>
              {portfolioTotals.readyStoryCount === 1 ? 'pronta para Roda' : 'prontas para Roda'}
            </span>
            <span className="projects-page__indicator projects-page__indicator--free">
              Bancada continua livre
            </span>
          </div>
        </div>
        <div className="projects-page__hero-actions">
          <Link className="btn btn-secondary btn-small" to="/tool">
            Abrir Bancada
          </Link>
        </div>
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" id="criar-projeto" aria-label="Criar projeto">
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">Novo projeto</p>
            <h2>Criar projeto</h2>
            <p>Use projetos para agrupar histórias por jornada, squad ou objetivo.</p>
          </div>
          <form className="projects-page__form" onSubmit={handleCreateProject}>
            <label className="projects-page__field">
              <span>Nome do projeto</span>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Onboarding de clientes"
                disabled={isCreating}
              />
            </label>

            <label className="projects-page__field">
              <span>
                Descrição
                <small>Opcional</small>
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique a jornada, squad ou objetivo do projeto."
                rows={4}
                disabled={isCreating}
              />
            </label>

            <button type="submit" className="btn btn-primary projects-page__submit" disabled={isCreating}>
              {isCreating ? 'Criando projeto...' : 'Criar projeto'}
            </button>
          </form>
          {message ? <p className="projects-page__message" role="status">{message}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label="Lista de projetos">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Portfólio</p>
              <h2>Seus projetos</h2>
            </div>
            <span className="projects-page__section-count">{filteredProjectCountLabel}</span>
          </div>

          <div className="projects-page__filters" aria-label="Filtros dos projetos">
            <label className="projects-page__field projects-page__field--search">
              <span>Buscar projeto</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nome, squad, jornada ou iniciativa"
              />
            </label>

            <div className="projects-page__quick-filters" aria-label="Filtros rápidos de projetos">
              {PROJECT_PORTFOLIO_FILTERS.map((option) => {
                const isActive = portfolioFilter === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`projects-page__quick-filter ${
                      isActive ? 'projects-page__quick-filter--active' : ''
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setPortfolioFilter(option.value)}
                  >
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </button>
                )
              })}
            </div>
          </div>

          {isLoading ? <p className="projects-page__state">Carregando projetos...</p> : null}
          {isLoadingStats ? <p className="projects-page__state">Atualizando resumo dos projetos...</p> : null}
          {!isLoading && projects.length === 0 ? (
            <div className="projects-page__empty">
              <p className="projects-page__eyebrow">Comece quando fizer sentido</p>
              <h3>Nenhum projeto criado ainda</h3>
              <p>
                Você pode continuar usando a Bancada sem projeto ou criar seu primeiro projeto para organizar
                histórias por iniciativa.
              </p>
              <button type="button" className="btn btn-secondary btn-small" onClick={focusCreateProject}>
                Criar primeiro projeto
              </button>
            </div>
          ) : null}
          {hasNoProjectsForFilter ? (
            <div className="projects-page__empty">
              <p className="projects-page__eyebrow">Nenhum resultado</p>
              <h3>Nenhum projeto neste recorte</h3>
              <p>Ajuste a busca ou escolha outro filtro para voltar ao portfólio completo.</p>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setSearchInput('')
                  setPortfolioFilter('all')
                }}
              >
                Limpar filtros
              </button>
            </div>
          ) : null}

          <div className="projects-page__list">
            {filteredProjects.map((project) => {
              const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS

              return (
                <article key={project.id} className="projects-page__item">
                  <div className="projects-page__item-main">
                    <div className="projects-page__item-title-row">
                      <span className="projects-page__item-marker" aria-hidden="true" />
                      <h3>{project.name}</h3>
                    </div>
                    {project.description ? (
                      <p>{project.description}</p>
                    ) : (
                      <p>Sem descrição por enquanto.</p>
                    )}
                    <p className="projects-page__item-date">Criado em {formatProjectDate(project.created_at)}</p>
                    <div className="projects-page__item-metrics" aria-label={`Resumo de ${project.name}`}>
                      <span className="projects-page__metric">
                        {formatProjectMetric(stats.storyCount, 'história', 'histórias')}
                      </span>
                      <span className="projects-page__metric projects-page__metric--ready">
                        {formatProjectMetric(
                          stats.readyStoryCount,
                          'pronta para estimar',
                          'prontas para estimar',
                        )}
                      </span>
                      <span className="projects-page__metric">
                        {formatProjectMetric(stats.teamCount, 'time', 'times')}
                      </span>
                    </div>
                  </div>
                  <div className="projects-page__item-actions">
                    <Link className="btn btn-secondary btn-small" to={`/projetos/${project.id}`}>
                      Ver projeto
                    </Link>
                    <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${project.id}`}>
                      Ver histórias
                    </Link>
                    <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${project.id}`}>
                      Abrir Roda
                    </Link>
                    <Link className="btn btn-secondary btn-small" to={`/times?projectId=${project.id}`}>
                      Times
                    </Link>
                    <Link className="btn btn-primary btn-small" to={`/tool?projectId=${project.id}`}>
                      Forjar
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProjectsPage
