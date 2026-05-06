import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { checkCanManageProject, listProjects } from '../services/projectsService'
import {
  createPlanningPokerSession,
  getPlanningPokerSessionByInviteCode,
  listPlanningPokerSessionsByProject,
  listPlanningPokerSessionStorySummaries,
} from '../services/planningPokerService'
import { listTeamsByProject } from '../services/teamsService'
import { listStoryHistoryGroups } from '../services/userStoriesService'
import { copyTextToClipboard } from '../utils/storyExport'

const PLANNING_SESSION_STATUS_LABELS = {
  draft: 'Rascunho',
  active: 'Ativa',
  voting: 'Em votação',
  revealed: 'Votos revelados',
  completed: 'Finalizada',
  canceled: 'Cancelada',
}

const PLANNING_SESSION_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativa' },
  { value: 'voting', label: 'Em votação' },
  { value: 'revealed', label: 'Votos revelados' },
  { value: 'completed', label: 'Finalizada' },
  { value: 'canceled', label: 'Cancelada' },
]

const PLANNING_TIMER_OPTIONS = [
  { value: 60, label: '1 minuto' },
  { value: 180, label: '3 minutos' },
  { value: 300, label: '5 minutos' },
  { value: 600, label: '10 minutos' },
]

const PLANNING_SCORING_SCALE_OPTIONS = [
  { value: 'fibonacci', label: 'Fibonacci' },
  { value: 'tshirt', label: 'Tamanho de camiseta' },
]

const PLANNING_SCORING_SCALE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  ...PLANNING_SCORING_SCALE_OPTIONS,
  { value: 'custom', label: 'Customizada' },
]

const PLANNING_SCORING_SCALE_LABELS = {
  fibonacci: 'Fibonacci',
  tshirt: 'Tamanho de camiseta',
  custom: 'Customizada',
}

function normalizeInviteCode(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

function formatPlanningDateTime(value) {
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

function getPlanningSessionStatusLabel(status) {
  return PLANNING_SESSION_STATUS_LABELS[status] ?? 'Rascunho'
}

function getPlanningScoringScaleLabel(scoringScale) {
  return PLANNING_SCORING_SCALE_LABELS[scoringScale] ?? 'Fibonacci'
}

function formatPlanningCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

function buildPlanningInviteUrl(inviteCode) {
  if (typeof window === 'undefined' || !inviteCode) return ''
  return new URL(`/roda?codigo=${encodeURIComponent(inviteCode)}`, window.location.origin).toString()
}

function PlanningPokerJoinPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [searchParams, setSearchParams] = useSearchParams()
  const codeFromUrl = useMemo(() => normalizeInviteCode(searchParams.get('codigo')), [searchParams])
  const projectIdFromUrl = searchParams.get('projectId') ?? ''
  const [inviteCode, setInviteCode] = useState(() => codeFromUrl)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl)
  const [canManageSelectedProject, setCanManageSelectedProject] = useState(false)
  const [teams, setTeams] = useState([])
  const [readyStories, setReadyStories] = useState([])
  const [selectedStoryIds, setSelectedStoryIds] = useState([])
  const [planningSessions, setPlanningSessions] = useState([])
  const [planningSessionStoriesBySession, setPlanningSessionStoriesBySession] = useState({})
  const [planningSessionStatusFilter, setPlanningSessionStatusFilter] = useState('all')
  const [planningSessionScaleFilter, setPlanningSessionScaleFilter] = useState('all')
  const [planningSessionSearch, setPlanningSessionSearch] = useState('')
  const [readyStorySearch, setReadyStorySearch] = useState('')
  const [planningSessionName, setPlanningSessionName] = useState('')
  const [planningTeamId, setPlanningTeamId] = useState('')
  const [planningScoringScale, setPlanningScoringScale] = useState('fibonacci')
  const [planningVoteTimeLimit, setPlanningVoteTimeLimit] = useState(300)
  const [planningAllowRevote, setPlanningAllowRevote] = useState(true)
  const [planningRevealAfterAll, setPlanningRevealAfterAll] = useState(false)
  const [planningAllowAbstention, setPlanningAllowAbstention] = useState(true)
  const [planningAllowObservers, setPlanningAllowObservers] = useState(true)
  const [message, setMessage] = useState('')
  const [planningMessage, setPlanningMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingProjectContext, setIsLoadingProjectContext] = useState(false)
  const [isCreatingPlanningSession, setIsCreatingPlanningSession] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === planningTeamId) ?? null,
    [planningTeamId, teams],
  )
  const selectedTimerLabel = useMemo(
    () =>
      PLANNING_TIMER_OPTIONS.find((option) => option.value === planningVoteTimeLimit)?.label ??
      `${planningVoteTimeLimit}s`,
    [planningVoteTimeLimit],
  )
  const selectedStoryPreview = useMemo(
    () => readyStories.filter((story) => selectedStoryIds.includes(story.id)).slice(0, 3),
    [readyStories, selectedStoryIds],
  )
  const hasSelectedStoryPreview = selectedStoryPreview.length > 0
  const remainingSelectedStoryCount = selectedStoryIds.length - selectedStoryPreview.length
  const remainingSelectedStoryLabel =
    remainingSelectedStoryCount > 0 ? `Mais ${remainingSelectedStoryCount} selecionadas` : ''
  const planningRuleSummary = useMemo(
    () => [
      planningAllowRevote ? 'Novo voto permitido' : 'Voto único',
      planningRevealAfterAll ? 'Revelar após todos votarem' : 'Revelação pelo facilitador',
      planningAllowAbstention ? 'Abstenção permitida' : 'Sem abstenção',
      planningAllowObservers ? 'Observadores permitidos' : 'Sem observadores',
    ],
    [planningAllowAbstention, planningAllowObservers, planningAllowRevote, planningRevealAfterAll],
  )
  const readyStoriesLabel = useMemo(
    () =>
      `${readyStories.length} ${
        readyStories.length === 1 ? 'história pronta' : 'histórias prontas'
      }`,
    [readyStories.length],
  )
  const filteredReadyStories = useMemo(() => {
    const search = readyStorySearch.trim().toLocaleLowerCase('pt-BR')
    if (!search) return readyStories

    return readyStories.filter((story) => {
      const searchable = [
        story.title,
        story.input_context,
        story.user_story,
        formatPlanningDateTime(story.created_at),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return searchable.includes(search)
    })
  }, [readyStories, readyStorySearch])
  const filteredReadyStoriesLabel = useMemo(
    () =>
      `${filteredReadyStories.length} ${
        filteredReadyStories.length === 1 ? 'história visível' : 'histórias visíveis'
      }`,
    [filteredReadyStories.length],
  )
  const planningSessionsLabel = useMemo(
    () =>
      `${planningSessions.length} ${
        planningSessions.length === 1 ? 'roda criada' : 'rodas criadas'
      }`,
    [planningSessions.length],
  )
  const filteredPlanningSessions = useMemo(() => {
    const search = planningSessionSearch.trim().toLocaleLowerCase('pt-BR')

    return planningSessions.filter((session) => {
      if (planningSessionStatusFilter !== 'all' && session.status !== planningSessionStatusFilter) {
        return false
      }

      if (
        planningSessionScaleFilter !== 'all' &&
        session.scoring_scale !== planningSessionScaleFilter
      ) {
        return false
      }

      if (!search) return true

      const searchable = [
        session.name,
        session.invite_code,
        getPlanningSessionStatusLabel(session.status),
        getPlanningScoringScaleLabel(session.scoring_scale),
        formatPlanningDateTime(session.created_at),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return searchable.includes(search)
    })
  }, [planningSessionScaleFilter, planningSessionSearch, planningSessionStatusFilter, planningSessions])
  const planningSessionProgressById = useMemo(() => {
    return planningSessions.reduce((progressById, session) => {
      const stories = planningSessionStoriesBySession[session.id] ?? []
      const total = stories.length
      const estimated = stories.filter((story) => story.status === 'estimated').length
      const skipped = stories.filter((story) => story.status === 'skipped').length
      const voting = stories.filter((story) => story.status === 'voting').length
      const pending = stories.filter((story) => story.status === 'pending').length
      const resolved = estimated + skipped
      const progressPercent = total > 0 ? Math.round((resolved / total) * 100) : 0

      progressById[session.id] = {
        estimated,
        label:
          total > 0
            ? `${formatPlanningCount(resolved, 'história resolvida', 'histórias resolvidas')} de ${total}`
            : 'Sem histórias vinculadas',
        pending,
        progressPercent,
        skipped,
        total,
        voting,
      }

      return progressById
    }, {})
  }, [planningSessionStoriesBySession, planningSessions])
  const canCreatePlanningSession =
    canManageSelectedProject && readyStories.length > 0 && selectedStoryIds.length > 0
  const hasPlanningSessions = planningSessions.length > 0
  const hasActivePlanningSessionFilters =
    planningSessionStatusFilter !== 'all' ||
    planningSessionScaleFilter !== 'all' ||
    planningSessionSearch.trim().length > 0

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setIsLoadingProjects(true)
    const response = await listProjects({ userId })
    setIsLoadingProjects(false)

    if (!response.success) {
      setProjects([])
      setSelectedProjectId('')
      setMessage('Não foi possível carregar os projetos agora.')
      return
    }

    const nextProjects = response.data ?? []
    const requestedProjectIsAvailable = nextProjects.some((project) => project.id === projectIdFromUrl)
    const fallbackProjectId = nextProjects[0]?.id ?? ''
    const nextSelectedProjectId = requestedProjectIsAvailable ? projectIdFromUrl : fallbackProjectId

    setProjects(nextProjects)
    setSelectedProjectId((current) =>
      nextProjects.some((project) => project.id === current) ? current : nextSelectedProjectId,
    )
  }, [projectIdFromUrl, userId])

  const loadSelectedProjectContext = useCallback(async () => {
    if (!userId || !selectedProjectId) {
      setCanManageSelectedProject(false)
      setTeams([])
      setReadyStories([])
      setSelectedStoryIds([])
      setPlanningSessions([])
      setPlanningSessionStoriesBySession({})
      return
    }

    setIsLoadingProjectContext(true)
    const [manageResponse, teamsResponse, readyStoriesResponse, sessionsResponse] = await Promise.all([
      checkCanManageProject({ projectId: selectedProjectId, userId }),
      listTeamsByProject({ projectId: selectedProjectId, userId }),
      listStoryHistoryGroups({
        userId,
        projectFilter: 'project',
        projectId: selectedProjectId,
        estimationStatus: 'ready_for_estimation',
        page: 1,
        pageSize: 50,
      }),
      listPlanningPokerSessionsByProject({ projectId: selectedProjectId, userId }),
    ])

    setCanManageSelectedProject(manageResponse.success ? Boolean(manageResponse.data) : false)
    setTeams(teamsResponse.success ? (teamsResponse.data ?? []) : [])

    if (readyStoriesResponse.success) {
      const nextReadyStories = readyStoriesResponse.data ?? []
      const validStoryIds = new Set(nextReadyStories.map((story) => story.id))
      setReadyStories(nextReadyStories)
      setSelectedStoryIds((current) => current.filter((storyId) => validStoryIds.has(storyId)))
    } else {
      setReadyStories([])
      setSelectedStoryIds([])
    }

    if (sessionsResponse.success) {
      const nextSessions = sessionsResponse.data ?? []
      setPlanningSessions(nextSessions)

      if (nextSessions.length > 0) {
        const summariesResponse = await listPlanningPokerSessionStorySummaries({
          sessionIds: nextSessions.map((session) => session.id),
          userId,
        })

        if (summariesResponse.success) {
          const nextStoriesBySession = (summariesResponse.data ?? []).reduce((storiesBySession, story) => {
            if (!storiesBySession[story.session_id]) {
              storiesBySession[story.session_id] = []
            }

            storiesBySession[story.session_id].push(story)
            return storiesBySession
          }, {})

          setPlanningSessionStoriesBySession(nextStoriesBySession)
        } else {
          setPlanningSessionStoriesBySession({})
        }
      } else {
        setPlanningSessionStoriesBySession({})
      }
    } else {
      setPlanningSessions([])
      setPlanningSessionStoriesBySession({})
      setPlanningMessage('Não foi possível carregar as Rodas da Fogueira agora.')
    }

    setIsLoadingProjectContext(false)
  }, [selectedProjectId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjects()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjects])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadSelectedProjectContext()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadSelectedProjectContext])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Roda da Fogueira',
      title: 'Estimativas colaborativas',
      pills: [
        { text: planningSessionsLabel },
        { text: readyStoriesLabel },
        { text: selectedProject?.name ?? 'Escolha um projeto' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [planningSessionsLabel, readyStoriesLabel, selectedProject?.name, setTopbarStatus])

  function handleProjectSelection(projectId) {
    setSelectedProjectId(projectId)
    setPlanningTeamId('')
    setSelectedStoryIds([])

    const nextParams = new URLSearchParams(searchParams)
    if (projectId) {
      nextParams.set('projectId', projectId)
    } else {
      nextParams.delete('projectId')
    }
    setSearchParams(nextParams, { replace: true })
  }

  function handleClearPlanningSessionFilters() {
    setPlanningSessionStatusFilter('all')
    setPlanningSessionScaleFilter('all')
    setPlanningSessionSearch('')
  }

  function handleTogglePlanningStory(storyId) {
    setPlanningMessage('')
    setSelectedStoryIds((current) =>
      current.includes(storyId)
        ? current.filter((currentStoryId) => currentStoryId !== storyId)
        : [...current, storyId],
    )
  }

  function handleSelectVisibleStories() {
    setPlanningMessage('')
    const visibleStoryIds = filteredReadyStories.map((story) => story.id)
    setSelectedStoryIds((current) => Array.from(new Set([...current, ...visibleStoryIds])))
  }

  function handleClearStorySelection() {
    setPlanningMessage('')
    setSelectedStoryIds([])
  }

  async function handleJoinByCode(event) {
    event.preventDefault()
    setMessage('')

    const safeInviteCode = normalizeInviteCode(inviteCode)
    if (!safeInviteCode) {
      setMessage('Informe o código da sala para entrar na Roda.')
      return
    }

    setInviteCode(safeInviteCode)
    setIsSearching(true)

    const response = await getPlanningPokerSessionByInviteCode({
      inviteCode: safeInviteCode,
      userId,
    })

    setIsSearching(false)

    if (!response.success || !response.data) {
      setMessage('Não encontramos uma Roda acessível com esse código. Confirme o código ou peça acesso ao projeto.')
      return
    }

    navigate(`/projetos/${response.data.project_id}/roda/${response.data.id}`)
  }

  async function handleCreatePlanningSession(event) {
    event.preventDefault()
    setPlanningMessage('')

    if (!selectedProjectId) {
      setPlanningMessage('Selecione um projeto para criar a Roda da Fogueira.')
      return
    }

    if (!canManageSelectedProject) {
      setPlanningMessage('Apenas responsáveis e administradores podem criar uma Roda da Fogueira.')
      return
    }

    if (selectedStoryIds.length === 0) {
      setPlanningMessage('Selecione ao menos uma história pronta para estimar.')
      return
    }

    setIsCreatingPlanningSession(true)
    const response = await createPlanningPokerSession({
      projectId: selectedProjectId,
      name: planningSessionName || `Roda da Fogueira - ${selectedProject?.name ?? 'Projeto'}`,
      userStoryIds: selectedStoryIds,
      teamId: planningTeamId || null,
      scoringScale: planningScoringScale,
      voteTimeLimitSeconds: planningVoteTimeLimit,
      allowRevote: planningAllowRevote,
      revealVotesAfterAll: planningRevealAfterAll,
      allowAbstention: planningAllowAbstention,
      allowObservers: planningAllowObservers,
      userId,
    })
    setIsCreatingPlanningSession(false)

    if (!response.success || !response.data) {
      setPlanningMessage(response.error?.message ?? 'Não foi possível criar a Roda da Fogueira agora.')
      return
    }

    setPlanningSessionName('')
    setPlanningTeamId('')
    setPlanningScoringScale('fibonacci')
    setSelectedStoryIds([])
    setPlanningMessage('Roda da Fogueira criada.')
    navigate(`/projetos/${selectedProjectId}/roda/${response.data.id}`)
  }

  async function handleCopySessionInvite(session, copyType) {
    setCopyMessage('')
    const safeInviteCode = normalizeInviteCode(session?.invite_code)

    if (!safeInviteCode) {
      setCopyMessage('Esta Roda ainda não possui código de convite.')
      return
    }

    const textToCopy = copyType === 'link' ? buildPlanningInviteUrl(safeInviteCode) : safeInviteCode

    try {
      await copyTextToClipboard(textToCopy)
      setCopyMessage(copyType === 'link' ? 'Link de convite copiado.' : 'Código da sala copiado.')
    } catch {
      setCopyMessage('Não foi possível copiar o convite agora.')
    }
  }

  return (
    <div className="projects-page planning-poker-join planning-poker-dashboard">
      <section className="panel projects-page__hero planning-poker-join__hero">
        <div className="planning-poker-join__copy">
          <p className="projects-page__eyebrow">Roda da Fogueira</p>
          <h1>Estimativas colaborativas</h1>
          <p>
            Crie Rodas por projeto, escolha histórias prontas para estimar e acompanhe o histórico sem ocupar a tela de
            detalhe do projeto.
          </p>
        </div>

        <form className="planning-poker-join__form" onSubmit={handleJoinByCode}>
          <label className="projects-page__field">
            <span>Entrar por código</span>
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(normalizeInviteCode(event.target.value))}
              placeholder="Ex.: 136CE7AB2E"
              autoComplete="off"
              className="planning-poker-join__code-input"
              disabled={isSearching}
            />
          </label>

          <button type="submit" className="btn btn-secondary" disabled={isSearching}>
            {isSearching ? 'Buscando Roda...' : 'Entrar na Roda'}
          </button>

          {message ? <p className="projects-page__message">{message}</p> : null}
        </form>
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" aria-label="Criar Roda da Fogueira">
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">Nova Roda</p>
            <h2>Criar sessão</h2>
            <p>Selecione um projeto, histórias prontas e as regras da votação.</p>
          </div>

          {isLoadingProjects ? <p className="projects-page__state">Carregando projetos...</p> : null}

          <form className="project-detail-page__campfire-form" onSubmit={handleCreatePlanningSession}>
            <label className="projects-page__field">
              <span>Projeto</span>
              <select
                value={selectedProjectId}
                onChange={(event) => handleProjectSelection(event.target.value)}
                disabled={isLoadingProjects || isCreatingPlanningSession || projects.length === 0}
              >
                {projects.length === 0 ? <option value="">Nenhum projeto disponível</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="project-detail-page__campfire-grid">
              <label className="projects-page__field">
                <span>Nome da Roda</span>
                <input
                  type="text"
                  value={planningSessionName}
                  onChange={(event) => setPlanningSessionName(event.target.value)}
                  placeholder={`Roda da Fogueira - ${selectedProject?.name ?? 'Projeto'}`}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                />
              </label>

              <label className="projects-page__field">
                <span>Time vinculado</span>
                <select
                  value={planningTeamId}
                  onChange={(event) => setPlanningTeamId(event.target.value)}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                >
                  <option value="">Projeto inteiro</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="projects-page__field">
                <span>Escala da Roda</span>
                <select
                  value={planningScoringScale}
                  onChange={(event) => setPlanningScoringScale(event.target.value)}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                >
                  {PLANNING_SCORING_SCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="projects-page__field">
                <span>Tempo de votação</span>
                <select
                  value={planningVoteTimeLimit}
                  onChange={(event) => setPlanningVoteTimeLimit(Number(event.target.value))}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                >
                  {PLANNING_TIMER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="project-detail-page__campfire-options" aria-label="Configurações da Roda">
              <label>
                <input
                  type="checkbox"
                  checked={planningAllowRevote}
                  onChange={(event) => setPlanningAllowRevote(event.target.checked)}
                  disabled={isCreatingPlanningSession}
                />
                <span>Permitir novo voto</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={planningRevealAfterAll}
                  onChange={(event) => setPlanningRevealAfterAll(event.target.checked)}
                  disabled={isCreatingPlanningSession}
                />
                <span>Revelar somente após todos votarem</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={planningAllowAbstention}
                  onChange={(event) => setPlanningAllowAbstention(event.target.checked)}
                  disabled={isCreatingPlanningSession}
                />
                <span>Permitir abstenção</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={planningAllowObservers}
                  onChange={(event) => setPlanningAllowObservers(event.target.checked)}
                  disabled={isCreatingPlanningSession}
                />
                <span>Permitir observadores</span>
              </label>
            </div>

            <div className="project-detail-page__campfire-stories">
              <div>
                <h3>Histórias prontas para estimar</h3>
                <p>{selectedStoryIds.length} selecionadas. {readyStoriesLabel} disponíveis.</p>
              </div>

              {isLoadingProjectContext ? (
                <p className="projects-page__state">Carregando contexto da Roda...</p>
              ) : null}

              {!isLoadingProjectContext && selectedProjectId && readyStories.length === 0 ? (
                <div className="projects-page__empty">
                  <h3>Nenhuma história pronta para estimar</h3>
                  <p>Marque histórias do projeto como prontas para estimar antes de criar uma Roda.</p>
                </div>
              ) : null}

              {readyStories.length > 0 ? (
                <>
                  <div className="project-detail-page__campfire-story-tools">
                    <label className="projects-page__field">
                      <span>Buscar histórias</span>
                      <input
                        type="search"
                        value={readyStorySearch}
                        onChange={(event) => setReadyStorySearch(event.target.value)}
                        placeholder="Título ou contexto"
                        disabled={isCreatingPlanningSession}
                      />
                    </label>
                    <div className="project-detail-page__campfire-story-actions">
                      <span>{filteredReadyStoriesLabel}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectVisibleStories}
                        disabled={isCreatingPlanningSession || filteredReadyStories.length === 0}
                      >
                        Selecionar visíveis
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={handleClearStorySelection}
                        disabled={isCreatingPlanningSession || selectedStoryIds.length === 0}
                      >
                        Limpar seleção
                      </button>
                    </div>
                  </div>

                  {filteredReadyStories.length === 0 ? (
                    <div className="projects-page__empty">
                      <h3>Nenhuma história encontrada</h3>
                      <p>Limpe a busca para ver outras histórias prontas deste projeto.</p>
                    </div>
                  ) : (
                    <div className="project-detail-page__campfire-story-list">
                      {filteredReadyStories.map((story) => (
                        <label key={story.id} className="project-detail-page__campfire-story-option">
                          <input
                            type="checkbox"
                            checked={selectedStoryIds.includes(story.id)}
                            onChange={() => handleTogglePlanningStory(story.id)}
                            disabled={isCreatingPlanningSession}
                          />
                          <span>
                            <strong>{story.title}</strong>
                            <small>{formatPlanningDateTime(story.created_at)}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="project-detail-page__campfire-create-summary" aria-label="Resumo antes de criar a Roda">
              <div>
                <p className="projects-page__eyebrow">Conferência</p>
                <h3>Resumo da Roda</h3>
                <p>Revise o contexto antes de abrir a sessão para a guilda.</p>
              </div>

              <dl>
                <div>
                  <dt>Projeto</dt>
                  <dd>{selectedProject?.name ?? 'Selecione um projeto'}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{selectedTeam?.name ?? 'Projeto inteiro'}</dd>
                </div>
                <div>
                  <dt>Histórias</dt>
                  <dd>{formatPlanningCount(selectedStoryIds.length, 'selecionada', 'selecionadas')}</dd>
                </div>
                <div>
                  <dt>Escala</dt>
                  <dd>{getPlanningScoringScaleLabel(planningScoringScale)}</dd>
                </div>
                <div>
                  <dt>Timer</dt>
                  <dd>{selectedTimerLabel}</dd>
                </div>
              </dl>

              <div className="project-detail-page__campfire-create-rules" aria-label="Regras ativas da Roda">
                {planningRuleSummary.map((rule) => (
                  <span key={rule}>{rule}</span>
                ))}
              </div>

              <ul className="project-detail-page__campfire-create-preview" hidden={!hasSelectedStoryPreview}>
                {selectedStoryPreview.map((story) => (
                  <li key={story.id}>{story.title}</li>
                ))}
                {remainingSelectedStoryLabel ? <li>{remainingSelectedStoryLabel}</li> : null}
              </ul>

              {!hasSelectedStoryPreview ? (
                <p className="projects-page__state">Selecione ao menos uma história pronta para estimar.</p>
              ) : null}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreatingPlanningSession || !canCreatePlanningSession}
            >
              {isCreatingPlanningSession ? 'Criando Roda...' : 'Criar Roda da Fogueira'}
            </button>
          </form>

          {!selectedProjectId && projects.length === 0 ? (
            <div className="projects-page__empty">
              <h3>Nenhum projeto criado ainda</h3>
              <p>Crie um projeto para usar a Roda da Fogueira.</p>
              <Link className="btn btn-secondary btn-small" to="/projetos">
                Criar projeto
              </Link>
            </div>
          ) : null}
          {selectedProjectId && !canManageSelectedProject ? (
            <p className="projects-page__state">
              Você pode consultar Rodas deste projeto. Apenas responsáveis e administradores criam novas sessões.
            </p>
          ) : null}
          {planningMessage ? <p className="projects-page__message">{planningMessage}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label="Histórico da Roda da Fogueira">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Histórico</p>
              <h2>{planningSessionsLabel}</h2>
              <p>{selectedProject ? `Sessões de ${selectedProject.name}.` : 'Escolha um projeto para consultar as Rodas.'}</p>
            </div>
          </div>

          {hasPlanningSessions ? (
            <div className="project-detail-page__campfire-filters" aria-label="Filtros de Rodas da Fogueira">
              <label className="projects-page__field">
                <span>Buscar Roda</span>
                <input
                  type="search"
                  value={planningSessionSearch}
                  onChange={(event) => setPlanningSessionSearch(event.target.value)}
                  placeholder="Nome ou código da sala"
                  disabled={isLoadingProjectContext}
                />
              </label>

              <label className="projects-page__field">
                <span>Status</span>
                <select
                  value={planningSessionStatusFilter}
                  onChange={(event) => setPlanningSessionStatusFilter(event.target.value)}
                  disabled={isLoadingProjectContext}
                >
                  {PLANNING_SESSION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="projects-page__field">
                <span>Escala</span>
                <select
                  value={planningSessionScaleFilter}
                  onChange={(event) => setPlanningSessionScaleFilter(event.target.value)}
                  disabled={isLoadingProjectContext}
                >
                  {PLANNING_SCORING_SCALE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="project-detail-page__campfire-filter-summary">
                <span>{formatPlanningCount(filteredPlanningSessions.length, 'roda encontrada', 'rodas encontradas')}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleClearPlanningSessionFilters}
                  disabled={!hasActivePlanningSessionFilters || isLoadingProjectContext}
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          ) : null}

          {isLoadingProjectContext ? <p className="projects-page__state">Carregando Rodas...</p> : null}
          {!isLoadingProjectContext && selectedProjectId && !hasPlanningSessions ? (
            <div className="projects-page__empty">
              <h3>Nenhuma Roda criada</h3>
              <p>Crie uma Roda da Fogueira com histórias prontas para estimar e acompanhe o histórico aqui.</p>
            </div>
          ) : null}
          {!isLoadingProjectContext && hasPlanningSessions && filteredPlanningSessions.length === 0 ? (
            <div className="projects-page__empty">
              <h3>Nenhuma Roda encontrada</h3>
              <p>Ajuste os filtros para consultar outras sessões deste projeto.</p>
            </div>
          ) : null}
          {copyMessage ? <p className="projects-page__message">{copyMessage}</p> : null}

          <div className="project-detail-page__campfire-session-list">
            {filteredPlanningSessions.map((session) => {
              const isLiveSession = ['active', 'voting', 'revealed'].includes(session.status)
              const progress = planningSessionProgressById[session.id] ?? {
                estimated: 0,
                label: 'Sem histórias vinculadas',
                pending: 0,
                progressPercent: 0,
                skipped: 0,
                total: 0,
                voting: 0,
              }

              return (
                <article
                  key={session.id}
                  className={`project-detail-page__campfire-session ${
                    isLiveSession ? 'project-detail-page__campfire-session--live' : ''
                  }`.trim()}
                >
                  <div className="project-detail-page__campfire-session-content">
                    <div>
                      <h3>{session.name}</h3>
                      <p>Código da sala: {session.invite_code}</p>
                    </div>

                    <div
                      className="project-detail-page__campfire-session-progress"
                      aria-label={`Progresso da Roda ${session.name}`}
                    >
                      <div className="project-detail-page__campfire-session-progress-header">
                        <span>{progress.label}</span>
                        <strong>{progress.progressPercent}%</strong>
                      </div>
                      <div className="project-detail-page__campfire-session-progress-bar" aria-hidden="true">
                        <span style={{ width: `${progress.progressPercent}%` }} />
                      </div>
                      <div className="project-detail-page__campfire-session-progress-chips">
                        <span>{formatPlanningCount(progress.estimated, 'estimada', 'estimadas')}</span>
                        <span>{formatPlanningCount(progress.voting, 'em votação', 'em votação')}</span>
                        <span>{formatPlanningCount(progress.pending, 'pendente', 'pendentes')}</span>
                        {progress.skipped > 0 ? (
                          <span>{formatPlanningCount(progress.skipped, 'pulada', 'puladas')}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="project-detail-page__campfire-session-meta">
                    <span>{getPlanningSessionStatusLabel(session.status)}</span>
                    <span>{getPlanningScoringScaleLabel(session.scoring_scale)}</span>
                    <span>{formatPlanningDateTime(session.created_at)}</span>
                    <span>{session.vote_time_limit_seconds ? `${session.vote_time_limit_seconds}s` : 'Sem timer'}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCopySessionInvite(session, 'code')}
                    >
                      Copiar código
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCopySessionInvite(session, 'link')}
                    >
                      Copiar convite
                    </button>
                    <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}/roda/${session.id}`}>
                      {isLiveSession ? 'Continuar Roda' : 'Abrir sala'}
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

export default PlanningPokerJoinPage
