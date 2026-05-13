import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  LIVE_PLANNING_SESSION_STATUSES,
  buildPlanningSessionSummaryMarkdown,
  formatPlanningCount,
  formatPlanningTimerDuration,
  getActivePlanningStorySessionByStoryId,
  getPlanningScoringScaleLabel,
  getPlanningSessionProgressById,
  getPlanningSessionSortWeight,
  getPlanningSessionStatusLabel,
  getPlanningStorySearchText,
  getPlanningStoryStatusLabel,
} from '../utils/planningPokerUtils'
import { copyTextToClipboard } from '../utils/storyExport'

const PLANNING_SESSION_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'active_group', label: 'Em andamento' },
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
  const autoJoinCodeAttemptedRef = useRef('')
  const codeFromUrl = useMemo(() => normalizeInviteCode(searchParams.get('codigo')), [searchParams])
  const projectIdFromUrl = searchParams.get('projectId') ?? ''
  const storyIdFromUrl = searchParams.get('storyId') ?? ''
  const storyIdsFromUrl = useMemo(
    () =>
      String(searchParams.get('storyIds') ?? '')
        .split(',')
        .map((storyId) => storyId.trim())
        .filter(Boolean),
    [searchParams],
  )
  const [inviteCode, setInviteCode] = useState(() => codeFromUrl)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl)
  const [accessiblePlanningSessions, setAccessiblePlanningSessions] = useState([])
  const [accessiblePlanningStoriesBySession, setAccessiblePlanningStoriesBySession] = useState({})
  const [canManageSelectedProject, setCanManageSelectedProject] = useState(false)
  const [teams, setTeams] = useState([])
  const [readyStories, setReadyStories] = useState([])
  const [selectedStoryIds, setSelectedStoryIds] = useState([])
  const [planningSessions, setPlanningSessions] = useState([])
  const [planningSessionStoriesBySession, setPlanningSessionStoriesBySession] = useState({})
  const [planningSessionStatusFilter, setPlanningSessionStatusFilter] = useState('all')
  const [planningSessionScaleFilter, setPlanningSessionScaleFilter] = useState('all')
  const [planningSessionStoryFilter, setPlanningSessionStoryFilter] = useState('all')
  const [planningSessionSearch, setPlanningSessionSearch] = useState('')
  const [accessiblePlanningStatusFilter, setAccessiblePlanningStatusFilter] = useState('all')
  const [accessiblePlanningSearch, setAccessiblePlanningSearch] = useState('')
  const [readyStorySearch, setReadyStorySearch] = useState('')
  const [hideActiveSessionStories, setHideActiveSessionStories] = useState(false)
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
  const [copyFeedbackBySessionId, setCopyFeedbackBySessionId] = useState({})
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingAccessiblePlanningSessions, setIsLoadingAccessiblePlanningSessions] = useState(false)
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
      formatPlanningTimerDuration(planningVoteTimeLimit),
    [planningVoteTimeLimit],
  )
  const selectedStories = useMemo(
    () => readyStories.filter((story) => selectedStoryIds.includes(story.id)),
    [readyStories, selectedStoryIds],
  )
  const selectedStoryPreview = useMemo(
    () => selectedStories.slice(0, 3),
    [selectedStories],
  )
  const hasSelectedStoryPreview = selectedStoryPreview.length > 0
  const remainingSelectedStoryCount = selectedStoryIds.length - selectedStoryPreview.length
  const remainingSelectedStoryLabel =
    remainingSelectedStoryCount > 0 ? `Mais ${remainingSelectedStoryCount} selecionadas` : ''
  const selectedStoriesPanelLabel =
    selectedStoryIds.length === 1
      ? '1 história selecionada para a Roda'
      : `${selectedStoryIds.length} histórias selecionadas para a Roda`
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
  const planningSessionsLabel = useMemo(
    () =>
      `${planningSessions.length} ${
        planningSessions.length === 1 ? 'roda criada' : 'rodas criadas'
      }`,
    [planningSessions.length],
  )
  const activePlanningSessionsCount = useMemo(
    () => planningSessions.filter((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)).length,
    [planningSessions],
  )
  const completedPlanningSessionsCount = useMemo(
    () => planningSessions.filter((session) => session.status === 'completed').length,
    [planningSessions],
  )
  const primaryActivePlanningSession = useMemo(
    () => planningSessions.find((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)) ?? null,
    [planningSessions],
  )
  const latestCompletedPlanningSession = useMemo(
    () => planningSessions.find((session) => session.status === 'completed') ?? null,
    [planningSessions],
  )
  const accessibleActivePlanningSessionsCount = useMemo(
    () => accessiblePlanningSessions.filter((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)).length,
    [accessiblePlanningSessions],
  )
  const accessibleCompletedPlanningSessionsCount = useMemo(
    () => accessiblePlanningSessions.filter((session) => session.status === 'completed').length,
    [accessiblePlanningSessions],
  )
  const accessibleCanceledPlanningSessionsCount = useMemo(
    () => accessiblePlanningSessions.filter((session) => session.status === 'canceled').length,
    [accessiblePlanningSessions],
  )
  const accessiblePlanningSessionsLabel = useMemo(
    () =>
      formatPlanningCount(
        accessiblePlanningSessions.length,
        'Roda acessível',
        'Rodas acessíveis',
      ),
    [accessiblePlanningSessions.length],
  )
  const filteredAccessiblePlanningSessions = useMemo(() => {
    const search = accessiblePlanningSearch.trim().toLocaleLowerCase('pt-BR')

    return accessiblePlanningSessions.filter((session) => {
      const sessionStories = accessiblePlanningStoriesBySession[session.id] ?? []

      if (
        accessiblePlanningStatusFilter === 'active_group' &&
        !LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
      ) {
        return false
      }

      if (
        accessiblePlanningStatusFilter !== 'all' &&
        accessiblePlanningStatusFilter !== 'active_group' &&
        session.status !== accessiblePlanningStatusFilter
      ) {
        return false
      }

      if (!search) return true

      const searchable = [
        session.name,
        session.projectName,
        session.invite_code,
        getPlanningSessionStatusLabel(session.status),
        getPlanningScoringScaleLabel(session.scoring_scale),
        formatPlanningDateTime(session.created_at),
        ...sessionStories.map(getPlanningStorySearchText),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return searchable.includes(search)
    })
  }, [
    accessiblePlanningSearch,
    accessiblePlanningSessions,
    accessiblePlanningStatusFilter,
    accessiblePlanningStoriesBySession,
  ])
  const accessiblePlanningSessionsPreview = useMemo(
    () => filteredAccessiblePlanningSessions.slice(0, 8),
    [filteredAccessiblePlanningSessions],
  )
  const accessiblePlanningFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Todas', count: accessiblePlanningSessions.length },
      { value: 'active_group', label: 'Em andamento', count: accessibleActivePlanningSessionsCount },
      { value: 'completed', label: 'Finalizadas', count: accessibleCompletedPlanningSessionsCount },
      { value: 'canceled', label: 'Canceladas', count: accessibleCanceledPlanningSessionsCount },
    ],
    [
      accessibleActivePlanningSessionsCount,
      accessibleCanceledPlanningSessionsCount,
      accessibleCompletedPlanningSessionsCount,
      accessiblePlanningSessions.length,
    ],
  )
  const hasAccessiblePlanningFilters =
    accessiblePlanningStatusFilter !== 'all' || accessiblePlanningSearch.trim().length > 0
  const canFilterAccessiblePlanningSessions =
    !isLoadingAccessiblePlanningSessions && accessiblePlanningSessions.length > 0
  const hasNoAccessiblePlanningSessions =
    !isLoadingAccessiblePlanningSessions && accessiblePlanningSessions.length === 0
  const hasFilteredAccessiblePlanningNoResults =
    canFilterAccessiblePlanningSessions && filteredAccessiblePlanningSessions.length === 0
  const hasAccessiblePlanningPreview =
    !isLoadingAccessiblePlanningSessions && accessiblePlanningSessionsPreview.length > 0
  const shouldShowAccessiblePlanningLimit =
    !isLoadingAccessiblePlanningSessions &&
    filteredAccessiblePlanningSessions.length > accessiblePlanningSessionsPreview.length
  const dashboardOverviewCards = useMemo(
    () => [
      {
        label: 'Projeto',
        value: selectedProject?.name ?? 'Nenhum projeto selecionado',
        description: selectedProject
          ? 'Contexto carregado para criar e consultar Rodas.'
          : 'Escolha um projeto para carregar histórias e sessões.',
      },
      {
        label: 'Histórias prontas',
        value: readyStoriesLabel,
        description:
          readyStories.length > 0
            ? 'Disponíveis para entrar em uma nova Roda.'
            : 'Marque histórias como prontas para estimar no projeto.',
      },
      {
        label: 'Rodas ativas',
        value: `${activePlanningSessionsCount} em andamento`,
        description:
          activePlanningSessionsCount > 0
            ? 'Há sessões abertas para continuar.'
            : 'Nenhuma sessão operacional neste projeto.',
      },
      {
        label: 'Histórico',
        value: `${completedPlanningSessionsCount} finalizadas`,
        description: 'Sessões concluídas permanecem disponíveis para consulta.',
      },
    ],
    [activePlanningSessionsCount, completedPlanningSessionsCount, readyStories.length, readyStoriesLabel, selectedProject],
  )
  const filteredPlanningSessions = useMemo(() => {
    const search = planningSessionSearch.trim().toLocaleLowerCase('pt-BR')

    return planningSessions
      .filter((session) => {
        const sessionStories = planningSessionStoriesBySession[session.id] ?? []
        const hasEstimatedStory = sessionStories.some((story) => story.status === 'estimated' || story.final_estimate)
        const hasPendingStory = sessionStories.some((story) => ['pending', 'voting'].includes(story.status))
        const hasSkippedStory = sessionStories.some((story) => story.status === 'skipped')

        if (
          planningSessionStatusFilter === 'active_group' &&
          !LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
        ) {
          return false
        }

        if (
          planningSessionStatusFilter !== 'all' &&
          planningSessionStatusFilter !== 'active_group' &&
          session.status !== planningSessionStatusFilter
        ) {
          return false
        }

        if (
          planningSessionScaleFilter !== 'all' &&
          session.scoring_scale !== planningSessionScaleFilter
        ) {
          return false
        }

        if (planningSessionStoryFilter === 'estimated_group' && !hasEstimatedStory) {
          return false
        }

        if (planningSessionStoryFilter === 'pending_group' && !hasPendingStory) {
          return false
        }

        if (planningSessionStoryFilter === 'skipped_group' && !hasSkippedStory) {
          return false
        }

        if (!search) return true

        const searchable = [
          session.name,
          session.invite_code,
          getPlanningSessionStatusLabel(session.status),
          getPlanningScoringScaleLabel(session.scoring_scale),
          formatPlanningDateTime(session.created_at),
          ...sessionStories.map(getPlanningStorySearchText),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')

        return searchable.includes(search)
      })
      .sort((a, b) => {
        const weightDiff = getPlanningSessionSortWeight(a.status) - getPlanningSessionSortWeight(b.status)
        if (weightDiff !== 0) return weightDiff

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [
    planningSessionScaleFilter,
    planningSessionSearch,
    planningSessionStatusFilter,
    planningSessionStoriesBySession,
    planningSessionStoryFilter,
    planningSessions,
  ])
  const planningSessionQuickFilters = useMemo(
    () => [
      {
        value: 'all',
        label: 'Todas',
        count: planningSessions.length,
      },
      {
        value: 'active_group',
        label: 'Em andamento',
        count: activePlanningSessionsCount,
      },
      {
        value: 'completed',
        label: 'Finalizadas',
        count: completedPlanningSessionsCount,
      },
    ],
    [activePlanningSessionsCount, completedPlanningSessionsCount, planningSessions.length],
  )
  const planningSessionProgressById = useMemo(() => {
    return getPlanningSessionProgressById(planningSessions, planningSessionStoriesBySession)
  }, [planningSessionStoriesBySession, planningSessions])
  const accessiblePlanningSessionProgressById = useMemo(() => {
    return getPlanningSessionProgressById(accessiblePlanningSessions, accessiblePlanningStoriesBySession)
  }, [accessiblePlanningSessions, accessiblePlanningStoriesBySession])
  const activePlanningStorySessionByStoryId = useMemo(() => {
    return getActivePlanningStorySessionByStoryId(planningSessions, planningSessionStoriesBySession)
  }, [planningSessionStoriesBySession, planningSessions])
  const readyStoriesWithoutActiveSession = useMemo(
    () => readyStories.filter((story) => !activePlanningStorySessionByStoryId[story.id]),
    [activePlanningStorySessionByStoryId, readyStories],
  )
  const visibleReadyStories = useMemo(
    () =>
      hideActiveSessionStories
        ? filteredReadyStories.filter((story) => !activePlanningStorySessionByStoryId[story.id])
        : filteredReadyStories,
    [activePlanningStorySessionByStoryId, filteredReadyStories, hideActiveSessionStories],
  )
  const readyStoriesInActiveSessionsCount = readyStories.length - readyStoriesWithoutActiveSession.length
  const visibleReadyStoriesLabel = useMemo(
    () =>
      `${visibleReadyStories.length} ${
        visibleReadyStories.length === 1 ? 'história visível' : 'histórias visíveis'
      }`,
    [visibleReadyStories.length],
  )
  const readyStoryFilterHint =
    readyStoriesInActiveSessionsCount > 0
      ? hideActiveSessionStories
        ? `${formatPlanningCount(readyStoriesInActiveSessionsCount, 'história ocultada por Roda ativa', 'histórias ocultadas por Rodas ativas')}.`
        : `${formatPlanningCount(readyStoriesInActiveSessionsCount, 'história já está em Roda ativa', 'histórias já estão em Rodas ativas')}.`
      : 'Nenhuma história pronta aparece em Roda ativa.'
  const selectedStoriesInActiveSessions = useMemo(
    () =>
      selectedStories
        .map((story) => ({
          session: activePlanningStorySessionByStoryId[story.id],
          story,
        }))
        .filter((item) => Boolean(item.session)),
    [activePlanningStorySessionByStoryId, selectedStories],
  )
  const selectedStoriesConflictLabel =
    selectedStoriesInActiveSessions.length === 1
      ? '1 história já aparece em uma Roda ativa'
      : `${selectedStoriesInActiveSessions.length} histórias já aparecem em Rodas ativas`
  const planningSessionsWithEstimateCount = useMemo(
    () => planningSessions.filter((session) => (planningSessionProgressById[session.id]?.estimated ?? 0) > 0).length,
    [planningSessionProgressById, planningSessions],
  )
  const planningSessionsWithPendingCount = useMemo(
    () =>
      planningSessions.filter((session) => {
        const progress = planningSessionProgressById[session.id]
        return (progress?.pending ?? 0) > 0 || (progress?.voting ?? 0) > 0
      }).length,
    [planningSessionProgressById, planningSessions],
  )
  const planningSessionsWithSkippedCount = useMemo(
    () => planningSessions.filter((session) => (planningSessionProgressById[session.id]?.skipped ?? 0) > 0).length,
    [planningSessionProgressById, planningSessions],
  )
  const canCreatePlanningSession =
    canManageSelectedProject && readyStories.length > 0 && selectedStoryIds.length > 0
  const hasPlanningSessions = planningSessions.length > 0
  const hasActivePlanningSessionFilters =
    planningSessionStatusFilter !== 'all' ||
    planningSessionScaleFilter !== 'all' ||
    planningSessionStoryFilter !== 'all' ||
    planningSessionSearch.trim().length > 0
  const planningReadinessItems = useMemo(
    () => [
      {
        label: 'Projeto',
        value: selectedProject?.name ?? 'Selecione um projeto',
        isReady: Boolean(selectedProject),
      },
      {
        label: 'Permissão',
        value: canManageSelectedProject
          ? 'Você pode criar Rodas'
          : selectedProject
            ? 'Consulta disponível'
            : 'Aguardando projeto',
        isReady: canManageSelectedProject,
      },
      {
        label: 'Histórias',
        value:
          selectedStoryIds.length > 0
            ? formatPlanningCount(selectedStoryIds.length, 'selecionada', 'selecionadas')
            : readyStories.length > 0
              ? 'Selecione histórias prontas'
              : 'Sem histórias prontas',
        isReady: selectedStoryIds.length > 0,
      },
      {
        label: 'Duplicidade',
        value:
          selectedStoryIds.length === 0
            ? 'Aguardando seleção'
            : selectedStoriesInActiveSessions.length > 0
              ? selectedStoriesConflictLabel
              : 'Sem Roda ativa duplicada',
        isReady: selectedStoryIds.length > 0 && selectedStoriesInActiveSessions.length === 0,
      },
    ],
    [
      canManageSelectedProject,
      readyStories.length,
      selectedProject,
      selectedStoriesConflictLabel,
      selectedStoriesInActiveSessions.length,
      selectedStoryIds.length,
    ],
  )
  const planningCreateHint = canCreatePlanningSession
    ? selectedStoriesInActiveSessions.length > 0
      ? 'Há histórias selecionadas em Rodas ativas. Revise antes de criar outra sessão.'
      : 'Tudo pronto para abrir a sessão para a guilda.'
    : !selectedProject
      ? 'Selecione um projeto para carregar histórias e permissões.'
      : !canManageSelectedProject
        ? 'Você pode consultar Rodas, mas não criar novas sessões neste projeto.'
        : readyStories.length === 0
          ? 'Marque histórias deste projeto como prontas para estimar.'
          : 'Selecione ao menos uma história para criar a Roda.'
  const dashboardNextAction = useMemo(() => {
    if (primaryActivePlanningSession && selectedProjectId) {
      return {
        tone: 'live',
        label: 'Roda ativa',
        title: primaryActivePlanningSession.name,
        description: 'Há uma sessão em andamento neste projeto. Continue a votação antes de abrir uma nova Roda.',
        primaryText: 'Continuar Roda',
        primaryTo: `/projetos/${selectedProjectId}/roda/${primaryActivePlanningSession.id}`,
        secondaryText: latestCompletedPlanningSession ? 'Consultar último resultado' : '',
        secondaryTo: latestCompletedPlanningSession
          ? `/projetos/${selectedProjectId}/roda/${latestCompletedPlanningSession.id}`
          : '',
      }
    }

    if (!selectedProject) {
      return {
        tone: 'setup',
        label: 'Primeiro passo',
        title: 'Escolha ou crie um projeto',
        description: 'A Roda depende de um projeto com histórias prontas para estimar.',
        primaryText: 'Gerenciar projetos',
        primaryTo: '/projetos',
        secondaryText: '',
        secondaryTo: '',
      }
    }

    if (!canManageSelectedProject) {
      return {
        tone: 'readonly',
        label: 'Consulta',
        title: 'Você pode acompanhar este projeto',
        description: 'A criação de novas Rodas fica restrita a responsáveis e administradores do projeto.',
        primaryText: 'Abrir projeto',
        primaryTo: `/projetos/${selectedProjectId}`,
        secondaryText: latestCompletedPlanningSession ? 'Consultar histórico' : '',
        secondaryTo: latestCompletedPlanningSession
          ? `/projetos/${selectedProjectId}/roda/${latestCompletedPlanningSession.id}`
          : '',
      }
    }

    if (readyStories.length === 0) {
      return {
        tone: 'setup',
        label: 'Preparação',
        title: 'Prepare histórias para estimar',
        description: 'Abra o projeto e marque histórias como prontas para estimativa antes de criar a Roda.',
        primaryText: 'Abrir projeto',
        primaryTo: `/projetos/${selectedProjectId}`,
        secondaryText: '',
        secondaryTo: '',
      }
    }

    if (selectedStoryIds.length === 0) {
      return {
        tone: 'select',
        label: 'Seleção',
        title: 'Escolha as histórias da sessão',
        description: 'Selecione uma ou mais histórias prontas na lista para liberar a criação da Roda.',
        primaryText: '',
        primaryTo: '',
        secondaryText: '',
        secondaryTo: '',
      }
    }

    return {
      tone: 'ready',
      label: 'Pronta',
      title: 'Roda pronta para criar',
      description: 'Revise o resumo, confirme as regras e abra a sessão para a guilda.',
      primaryText: '',
      primaryTo: '',
      secondaryText: '',
      secondaryTo: '',
    }
  }, [
    canManageSelectedProject,
    latestCompletedPlanningSession,
    primaryActivePlanningSession,
    readyStories.length,
    selectedProject,
    selectedProjectId,
    selectedStoryIds.length,
  ])

  const openPlanningSessionByCode = useCallback(
    async (rawCode, { isAutomatic = false } = {}) => {
      if (!isAutomatic) {
        setMessage('')
      }

      const safeInviteCode = normalizeInviteCode(rawCode)
      if (!safeInviteCode) {
        setMessage('Informe o código da sala para entrar na Roda.')
        return false
      }

      if (!userId) {
        setMessage('Entre para acessar a Roda da Fogueira.')
        return false
      }

      setInviteCode(safeInviteCode)
      setIsSearching(true)

      const response = await getPlanningPokerSessionByInviteCode({
        inviteCode: safeInviteCode,
        userId,
      })

      setIsSearching(false)

      if (!response.success || !response.data) {
        setMessage(
          isAutomatic
            ? 'Não foi possível abrir este convite automaticamente. Confirme se seu e-mail foi adicionado ao projeto ou tente entrar pelo código.'
            : 'Não encontramos uma Roda acessível com esse código. Se você recebeu um convite, peça ao facilitador para adicionar seu e-mail ao projeto.',
        )
        return false
      }

      navigate(`/projetos/${response.data.project_id}/roda/${response.data.id}`)
      return true
    },
    [navigate, userId],
  )

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

  const loadAccessiblePlanningSessions = useCallback(async () => {
    if (!userId || projects.length === 0) {
      setAccessiblePlanningSessions([])
      setAccessiblePlanningStoriesBySession({})
      return
    }

    setIsLoadingAccessiblePlanningSessions(true)

    const sessionResponses = await Promise.all(
      projects.map(async (project) => {
        const response = await listPlanningPokerSessionsByProject({ projectId: project.id, userId })
        return {
          project,
          response,
        }
      }),
    )

    const nextSessions = sessionResponses
      .flatMap(({ project, response }) =>
        response.success
          ? (response.data ?? []).map((session) => ({
              ...session,
              projectName: project.name,
            }))
          : [],
      )
      .sort((a, b) => {
        const weightDiff = getPlanningSessionSortWeight(a.status) - getPlanningSessionSortWeight(b.status)
        if (weightDiff !== 0) return weightDiff

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    setAccessiblePlanningSessions(nextSessions)

    if (nextSessions.length === 0) {
      setAccessiblePlanningStoriesBySession({})
      setIsLoadingAccessiblePlanningSessions(false)
      return
    }

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

      setAccessiblePlanningStoriesBySession(nextStoriesBySession)
    } else {
      setAccessiblePlanningStoriesBySession({})
    }

    setIsLoadingAccessiblePlanningSessions(false)
  }, [projects, userId])

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
    const timerId = setTimeout(() => {
      loadAccessiblePlanningSessions()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadAccessiblePlanningSessions])

  useEffect(() => {
    if (!codeFromUrl || !userId || autoJoinCodeAttemptedRef.current === codeFromUrl || isSearching) return

    const timerId = window.setTimeout(() => {
      autoJoinCodeAttemptedRef.current = codeFromUrl
      setMessage('Abrindo convite da Roda...')
      openPlanningSessionByCode(codeFromUrl, { isAutomatic: true })
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [codeFromUrl, isSearching, openPlanningSessionByCode, userId])

  useEffect(() => {
    const requestedStoryIds = Array.from(
      new Set([...storyIdsFromUrl, storyIdFromUrl].filter(Boolean)),
    )
    if (requestedStoryIds.length === 0 || !selectedProjectId || isLoadingProjectContext) return

    const timerId = window.setTimeout(() => {
      const readyStoryIds = new Set(readyStories.map((story) => story.id))
      const availableStoryIds = requestedStoryIds.filter((storyId) => readyStoryIds.has(storyId))

      if (availableStoryIds.length === 0) {
        if (readyStories.length > 0) {
          setPlanningMessage('As histórias enviadas pelo Projeto não estão disponíveis entre as histórias prontas deste contexto.')
        }
        return
      }

      setSelectedStoryIds((current) =>
        Array.from(new Set([...availableStoryIds, ...current])),
      )
      setReadyStorySearch('')
      setHideActiveSessionStories(false)
      setPlanningMessage(
        availableStoryIds.length === 1
          ? 'História selecionada para criar a Roda.'
          : `${availableStoryIds.length} histórias selecionadas para criar a Roda.`,
      )
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [isLoadingProjectContext, readyStories, selectedProjectId, storyIdFromUrl, storyIdsFromUrl])

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
    nextParams.delete('storyId')
    nextParams.delete('storyIds')
    setSearchParams(nextParams, { replace: true })
  }

  function handleClearPlanningSessionFilters() {
    setPlanningSessionStatusFilter('all')
    setPlanningSessionScaleFilter('all')
    setPlanningSessionStoryFilter('all')
    setPlanningSessionSearch('')
  }

  function handleClearAccessiblePlanningFilters() {
    setAccessiblePlanningStatusFilter('all')
    setAccessiblePlanningSearch('')
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
    const visibleStoryIds = visibleReadyStories.map((story) => story.id)
    setSelectedStoryIds((current) => Array.from(new Set([...current, ...visibleStoryIds])))
  }

  function handleSelectAvailableStories() {
    setPlanningMessage('')
    const availableStoryIds = readyStoriesWithoutActiveSession.map((story) => story.id)
    setSelectedStoryIds((current) => Array.from(new Set([...current, ...availableStoryIds])))
  }

  function handleSelectAllReadyStories() {
    setPlanningMessage('')
    setSelectedStoryIds(readyStories.map((story) => story.id))
  }

  function handleClearStorySelection() {
    setPlanningMessage('')
    setSelectedStoryIds([])
  }

  function handleRemovePlanningStory(storyId) {
    setPlanningMessage('')
    setSelectedStoryIds((current) => current.filter((currentStoryId) => currentStoryId !== storyId))
  }

  async function handleJoinByCode(event) {
    event.preventDefault()
    await openPlanningSessionByCode(inviteCode)
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
    setCopyFeedbackBySessionId((current) => ({ ...current, [session?.id]: '' }))
    const safeInviteCode = normalizeInviteCode(session?.invite_code)

    if (!safeInviteCode) {
      setCopyMessage('Esta Roda ainda não possui código de convite.')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session?.id]: 'Convite indisponível' }))
      return
    }

    const textToCopy = copyType === 'link' ? buildPlanningInviteUrl(safeInviteCode) : safeInviteCode

    try {
      await copyTextToClipboard(textToCopy)
      const nextMessage = copyType === 'link' ? 'Link copiado' : 'Código copiado'
      setCopyMessage(copyType === 'link' ? 'Link copiado. Envie para pessoas adicionadas ao projeto.' : `${nextMessage}.`)
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: nextMessage }))
    } catch {
      setCopyMessage('Não foi possível copiar o convite agora.')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: 'Falha ao copiar' }))
    }
  }

  async function handleCopySessionSummary(session, progress) {
    setCopyMessage('')
    setCopyFeedbackBySessionId((current) => ({ ...current, [session?.id]: '' }))
    if (!session) return

    try {
      await copyTextToClipboard(
        buildPlanningSessionSummaryMarkdown({
          progress,
          projectName: selectedProject?.name ?? '',
          session,
          stories: planningSessionStoriesBySession[session.id] ?? [],
        }),
      )
      setCopyMessage('Resumo copiado.')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: 'Resumo copiado' }))
    } catch {
      setCopyMessage('Não foi possível copiar o resumo agora.')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: 'Falha ao copiar' }))
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

          <p className="planning-poker-join__access-note">
            Links com código tentam abrir a sala automaticamente. O acesso exige que seu e-mail esteja no projeto da
            Roda.
          </p>

          {message ? <p className="projects-page__message">{message}</p> : null}
        </form>
      </section>

      <section className="planning-poker-dashboard__overview" aria-label="Resumo operacional da Roda da Fogueira">
        {dashboardOverviewCards.map((card) => (
          <article key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section
        className={`planning-poker-dashboard__next-action planning-poker-dashboard__next-action--${dashboardNextAction.tone}`}
        aria-label="Próxima ação recomendada"
      >
        <div>
          <p className="projects-page__eyebrow">{dashboardNextAction.label}</p>
          <h2>{dashboardNextAction.title}</h2>
          <p>{dashboardNextAction.description}</p>
        </div>
        <div className="planning-poker-dashboard__next-actions">
          {dashboardNextAction.primaryTo ? (
            <Link className="btn btn-primary btn-small" to={dashboardNextAction.primaryTo}>
              {dashboardNextAction.primaryText}
            </Link>
          ) : null}
          {dashboardNextAction.secondaryTo ? (
            <Link className="btn btn-secondary btn-small" to={dashboardNextAction.secondaryTo}>
              {dashboardNextAction.secondaryText}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="panel planning-poker-dashboard__accessible" aria-label="Rodas acessíveis para sua conta">
        <div className="planning-poker-dashboard__accessible-header">
          <div>
            <p className="projects-page__eyebrow">Minha participação</p>
            <h2>Rodas acessíveis</h2>
            <p>
              Quem cria a Roda define a participação adicionando e-mails ao projeto. Depois disso, as sessões aparecem
              aqui e o link leva direto para a sala.
            </p>
          </div>
          <div className="planning-poker-dashboard__accessible-metrics" aria-label="Resumo das Rodas acessíveis">
            <span>{accessiblePlanningSessionsLabel}</span>
            <strong>{formatPlanningCount(accessibleActivePlanningSessionsCount, 'ativa', 'ativas')}</strong>
          </div>
        </div>

        <div className="planning-poker-dashboard__access-steps" aria-label="Como funciona o acesso por convite">
          <article>
            <span>1</span>
            <strong>Facilitador adiciona</strong>
            <p>O e-mail precisa estar no projeto da Roda.</p>
          </article>
          <article>
            <span>2</span>
            <strong>Convite abre a sala</strong>
            <p>O link ou código leva para a Roda quando o acesso está liberado.</p>
          </article>
          <article>
            <span>3</span>
            <strong>Participante acompanha</strong>
            <p>Rodas acessíveis ficam listadas nesta área.</p>
          </article>
        </div>

        {isLoadingAccessiblePlanningSessions ? (
          <p className="projects-page__state">Carregando Rodas acessíveis...</p>
        ) : null}

        {canFilterAccessiblePlanningSessions ? (
          <div className="planning-poker-dashboard__accessible-tools" aria-label="Filtros das Rodas acessíveis">
            <div className="planning-poker-dashboard__quick-filters">
              {accessiblePlanningFilterOptions.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={accessiblePlanningStatusFilter === filter.value ? 'is-active' : ''}
                  onClick={() => setAccessiblePlanningStatusFilter(filter.value)}
                  disabled={filter.count === 0}
                >
                  <span>{filter.label}</span>
                  <strong>{filter.count}</strong>
                </button>
              ))}
            </div>

            <div className="planning-poker-dashboard__accessible-search">
              <label className="projects-page__field">
                <span>Buscar nas minhas Rodas</span>
                <input
                  type="search"
                  value={accessiblePlanningSearch}
                  onChange={(event) => setAccessiblePlanningSearch(event.target.value)}
                  placeholder="Nome, projeto, código ou história"
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleClearAccessiblePlanningFilters}
                disabled={!hasAccessiblePlanningFilters}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        ) : null}

        {hasNoAccessiblePlanningSessions ? (
          <div className="planning-poker-dashboard__accessible-empty">
            <strong>Nenhuma Roda acessível ainda</strong>
            <p>
              Peça ao facilitador para adicionar seu e-mail ao projeto da Roda. Depois disso, você pode entrar pelo link,
              pelo código ou por esta lista.
            </p>
          </div>
        ) : null}

        {hasFilteredAccessiblePlanningNoResults ? (
          <div className="planning-poker-dashboard__accessible-empty">
            <strong>Nenhuma Roda encontrada</strong>
            <p>Limpe os filtros para consultar outras Rodas acessíveis para sua conta.</p>
            <button type="button" className="btn btn-secondary btn-small" onClick={handleClearAccessiblePlanningFilters}>
              Limpar filtros
            </button>
          </div>
        ) : null}

        {hasAccessiblePlanningPreview ? (
          <div className="planning-poker-dashboard__accessible-list">
            {accessiblePlanningSessionsPreview.map((session) => {
              const isLiveSession = LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
              const progress = accessiblePlanningSessionProgressById[session.id] ?? {
                label: 'Sem histórias vinculadas',
                progressPercent: 0,
              }

              return (
                <article
                  key={session.id}
                  className={`planning-poker-dashboard__accessible-card ${
                    isLiveSession ? 'planning-poker-dashboard__accessible-card--live' : ''
                  }`.trim()}
                >
                  <div>
                    <span>{session.projectName ?? 'Projeto sem nome'}</span>
                    <h3>{session.name}</h3>
                    <p>
                      {getPlanningSessionStatusLabel(session.status)} · {getPlanningScoringScaleLabel(session.scoring_scale)}
                    </p>
                  </div>
                  <div className="planning-poker-dashboard__accessible-progress" aria-label={`Progresso de ${session.name}`}>
                    <span>{progress.label}</span>
                    <strong>{progress.progressPercent}%</strong>
                  </div>
                  <Link className="btn btn-secondary btn-small" to={`/projetos/${session.project_id}/roda/${session.id}`}>
                    {isLiveSession ? 'Entrar na Roda' : 'Consultar Roda'}
                  </Link>
                </article>
              )
            })}
          </div>
        ) : null}

        {shouldShowAccessiblePlanningLimit ? (
          <p className="projects-page__state">
            Mostrando {accessiblePlanningSessionsPreview.length} de{' '}
            {formatPlanningCount(filteredAccessiblePlanningSessions.length, 'Roda acessível', 'Rodas acessíveis')}.
          </p>
        ) : null}
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
                <span>Time</span>
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
                <span>Escala</span>
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

            <details className="planning-poker-dashboard__advanced">
              <summary>
                <span>Regras avançadas</span>
                <strong>{planningRuleSummary.length} regras definidas</strong>
              </summary>
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
                  <span>Revelar após todos votarem</span>
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
            </details>

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
                  <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}`}>
                    Preparar histórias
                  </Link>
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
                      <span>{visibleReadyStoriesLabel}</span>
                      <button
                        type="button"
                        className={`btn btn-ghost btn-small ${hideActiveSessionStories ? 'is-active' : ''}`.trim()}
                        onClick={() => setHideActiveSessionStories((current) => !current)}
                        disabled={isCreatingPlanningSession || readyStoriesInActiveSessionsCount === 0}
                      >
                        {hideActiveSessionStories ? 'Ver todas' : 'Ocultar em Roda ativa'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectVisibleStories}
                        disabled={isCreatingPlanningSession || visibleReadyStories.length === 0}
                      >
                        Selecionar visíveis
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectAvailableStories}
                        disabled={isCreatingPlanningSession || readyStoriesWithoutActiveSession.length === 0}
                      >
                        Selecionar livres
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectAllReadyStories}
                        disabled={isCreatingPlanningSession || readyStories.length === 0}
                      >
                        Selecionar todas
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
                  <p className="planning-poker-dashboard__story-filter-hint">{readyStoryFilterHint}</p>

                  {selectedStories.length > 0 ? (
                    <div
                      className="planning-poker-dashboard__selected-stories"
                      aria-label="Histórias selecionadas para a Roda"
                    >
                      <div className="planning-poker-dashboard__selected-stories-header">
                        <div>
                          <p className="projects-page__eyebrow">Seleção atual</p>
                          <h3>{selectedStoriesPanelLabel}</h3>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={handleClearStorySelection}
                          disabled={isCreatingPlanningSession}
                        >
                          Limpar seleção
                        </button>
                      </div>
                      {selectedStoriesInActiveSessions.length > 0 ? (
                        <div className="planning-poker-dashboard__selection-warning" role="status">
                          <div>
                            <strong>{selectedStoriesConflictLabel}</strong>
                            <p>
                              Você ainda pode criar a sessão, mas vale confirmar se a estimativa não deveria continuar na
                              Roda já aberta.
                            </p>
                          </div>
                          {selectedStoriesInActiveSessions[0]?.session ? (
                            <Link
                              className="btn btn-secondary btn-small"
                              to={`/projetos/${selectedProjectId}/roda/${selectedStoriesInActiveSessions[0].session.id}`}
                            >
                              Abrir Roda ativa
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="planning-poker-dashboard__selected-story-list">
                        {selectedStories.map((story) => {
                          const activeSession = activePlanningStorySessionByStoryId[story.id]

                          return (
                            <article
                              key={story.id}
                              className={`planning-poker-dashboard__selected-story ${
                                activeSession ? 'planning-poker-dashboard__selected-story--active-session' : ''
                              }`.trim()}
                            >
                              <div>
                                <strong>{story.title ?? 'História sem título'}</strong>
                                <span>
                                  {activeSession
                                    ? `Em Roda ativa: ${activeSession.name}`
                                    : formatPlanningDateTime(story.created_at)}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-small"
                                onClick={() => handleRemovePlanningStory(story.id)}
                                disabled={isCreatingPlanningSession}
                              >
                                Remover
                              </button>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {visibleReadyStories.length === 0 ? (
                    <div className="projects-page__empty">
                      <h3>
                        {hideActiveSessionStories && filteredReadyStories.length > 0
                          ? 'Todas as histórias visíveis estão em Rodas ativas'
                          : 'Nenhuma história encontrada'}
                      </h3>
                      <p>
                        {hideActiveSessionStories && filteredReadyStories.length > 0
                          ? 'Desative o filtro para visualizar também histórias que já participam de uma Roda em andamento.'
                          : 'Limpe a busca para ver outras histórias prontas deste projeto.'}
                      </p>
                      {hideActiveSessionStories && filteredReadyStories.length > 0 ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => setHideActiveSessionStories(false)}
                          disabled={isCreatingPlanningSession}
                        >
                          Ver todas
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="project-detail-page__campfire-story-list">
                      {visibleReadyStories.map((story) => {
                        const isSelected = selectedStoryIds.includes(story.id)
                        const activeSession = activePlanningStorySessionByStoryId[story.id]

                        return (
                          <label
                            key={story.id}
                            className={[
                              'project-detail-page__campfire-story-option',
                              isSelected ? 'project-detail-page__campfire-story-option--selected' : '',
                              activeSession ? 'project-detail-page__campfire-story-option--active-session' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePlanningStory(story.id)}
                              disabled={isCreatingPlanningSession}
                            />
                            <span>
                              <strong>{story.title}</strong>
                              <small>{formatPlanningDateTime(story.created_at)}</small>
                              <em>{isSelected ? 'Selecionada' : activeSession ? 'Já em Roda ativa' : 'Pronta para estimar'}</em>
                              {activeSession ? <small>Em andamento: {activeSession.name}</small> : null}
                            </span>
                          </label>
                        )
                      })}
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

            <div className="planning-poker-dashboard__readiness" aria-label="Pré-requisitos para criar a Roda">
              <div>
                <p className="projects-page__eyebrow">Pronto para criar?</p>
                <h3>{canCreatePlanningSession ? 'Roda pronta para abrir' : 'Complete os requisitos'}</h3>
                <p>{planningCreateHint}</p>
              </div>
              <ul>
                {planningReadinessItems.map((item) => (
                  <li key={item.label} className={item.isReady ? 'is-ready' : ''}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
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
            <div className="projects-page__empty">
              <h3>Modo consulta neste projeto</h3>
              <p>Você pode consultar Rodas deste projeto. Apenas responsáveis e administradores criam novas sessões.</p>
              <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}`}>
                Abrir projeto
              </Link>
            </div>
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
            <>
              <div className="planning-poker-dashboard__quick-filters" aria-label="Filtros rápidos de Rodas">
                {planningSessionQuickFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={planningSessionStatusFilter === filter.value ? 'is-active' : ''}
                    onClick={() => setPlanningSessionStatusFilter(filter.value)}
                    disabled={isLoadingProjectContext}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>

              <div className="planning-poker-dashboard__quick-filters" aria-label="Filtros rápidos por histórias">
                {[
                  { value: 'estimated_group', label: 'Com estimativa', count: planningSessionsWithEstimateCount },
                  { value: 'pending_group', label: 'Com pendências', count: planningSessionsWithPendingCount },
                  { value: 'skipped_group', label: 'Puladas', count: planningSessionsWithSkippedCount },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={planningSessionStoryFilter === filter.value ? 'is-active' : ''}
                    onClick={() =>
                      setPlanningSessionStoryFilter((current) => (current === filter.value ? 'all' : filter.value))
                    }
                    disabled={isLoadingProjectContext || filter.count === 0}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>

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
            </>
          ) : null}

          {isLoadingProjectContext ? <p className="projects-page__state">Carregando Rodas...</p> : null}
          {!isLoadingProjectContext && selectedProjectId && !hasPlanningSessions ? (
            <div className="projects-page__empty">
              <h3>Nenhuma Roda criada</h3>
              <p>Crie uma Roda da Fogueira com histórias prontas para estimar e acompanhe o histórico aqui.</p>
              {readyStories.length === 0 ? (
                <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}`}>
                  Preparar histórias
                </Link>
              ) : null}
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
              const sessionStories = planningSessionStoriesBySession[session.id] ?? []
              const progress = planningSessionProgressById[session.id] ?? {
                estimated: 0,
                label: 'Sem histórias vinculadas',
                pending: 0,
                progressPercent: 0,
                skipped: 0,
                total: 0,
                voting: 0,
              }
              const sessionStatusLabel = getPlanningSessionStatusLabel(session.status)
              const sessionActionLabel = isLiveSession
                ? 'Continuar Roda'
                : session.status === 'completed'
                  ? 'Consultar resultado'
                  : 'Abrir sala'
              const copyFeedback = copyFeedbackBySessionId[session.id]

              return (
                <article
                  key={session.id}
                  className={`project-detail-page__campfire-session ${
                    isLiveSession ? 'project-detail-page__campfire-session--live' : ''
                  }`.trim()}
                >
                  <div className="project-detail-page__campfire-session-content">
                    <div>
                      <div className="planning-poker-dashboard__session-title">
                        <h3>{session.name}</h3>
                        <span className={isLiveSession ? 'is-live' : ''}>{sessionStatusLabel}</span>
                      </div>
                      <p>
                        Código {session.invite_code} · {getPlanningScoringScaleLabel(session.scoring_scale)} ·{' '}
                        {formatPlanningTimerDuration(session.vote_time_limit_seconds)}
                      </p>
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

                    <details className="planning-poker-dashboard__session-stories">
                      <summary>
                        <span>Histórias da Roda</span>
                        <strong>{progress.label}</strong>
                      </summary>
                      {sessionStories.length > 0 ? (
                        <div className="planning-poker-dashboard__session-story-list">
                          {sessionStories.map((story, index) => (
                            <div key={story.id} className="planning-poker-dashboard__session-story">
                              <div>
                                <strong>{story.user_story?.title ?? `História ${index + 1}`}</strong>
                                <span>{getPlanningStoryStatusLabel(story.status)}</span>
                              </div>
                              <em>{story.final_estimate ? `Final: ${story.final_estimate}` : 'Sem estimativa final'}</em>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="projects-page__state">Nenhuma história vinculada a esta Roda.</p>
                      )}
                    </details>
                  </div>

                  <div className="project-detail-page__campfire-session-meta">
                    <span>Criada em {formatPlanningDateTime(session.created_at)}</span>
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
                      Copiar link para membros
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCopySessionSummary(session, progress)}
                    >
                      Copiar resumo
                    </button>
                    <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}/roda/${session.id}`}>
                      {sessionActionLabel}
                    </Link>
                    {copyFeedback ? <span className="planning-poker-dashboard__copy-feedback">{copyFeedback}</span> : null}
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
