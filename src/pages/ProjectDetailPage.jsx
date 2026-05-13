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
  KANBAN_STATUS_OPTIONS,
  createProjectKanbanColumn,
  listProjectKanbanBoard,
  moveProjectKanbanStory,
  reorderProjectKanbanColumn,
  updateProjectKanbanColumn,
} from '../services/projectKanbanService'
import {
  listPlanningPokerSessionStorySummaries,
  listPlanningPokerSessionsByProject,
} from '../services/planningPokerService'
import {
  analyzeProject,
  buildProjectAnalysisMarkdown,
  deleteProjectAnalysis,
  listProjectAnalyses,
  saveProjectAnalysis,
} from '../services/projectAiService'
import {
  LIVE_PLANNING_SESSION_STATUSES,
  getPlanningSessionStatusLabel,
  getPlanningStorySessionIndex,
} from '../utils/planningPokerUtils'
import {
  buildProjectActionPlanMarkdown,
  findProjectInsightCandidateStory,
  getProjectInsightFreshness,
} from '../utils/projectInsightsUtils'
import { normalizeStorySearchQuery, storyMatchesSearch } from '../utils/storySearchUtils'
import { copyTextToClipboard } from '../utils/storyExport'

const PROJECT_MEMBER_ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'admin', label: 'Administrador' },
  { value: 'viewer', label: 'Visualizador' },
]

const ROLE_LABELS = {
  owner: 'Responsável',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
}

const PROJECT_ACCESS_DETAILS = {
  owner: {
    title: 'Responsável pelo projeto',
    description: 'Controle completo sobre projeto, membros, colunas, Kanban e Rodas da Fogueira.',
    nextAction: 'Use este acesso para manter contexto, permissões e estimativas organizados.',
  },
  admin: {
    title: 'Administrador do projeto',
    description: 'Pode editar o projeto, gerenciar membros, ajustar colunas e criar Rodas da Fogueira.',
    nextAction: 'Gerencie a operação do projeto sem depender do responsável principal.',
  },
  member: {
    title: 'Membro do projeto',
    description: 'Pode mover histórias no Kanban, preparar itens para estimativa e acompanhar Rodas.',
    nextAction: 'Organize histórias e leve itens prontos para discussão com o time.',
  },
  viewer: {
    title: 'Visualizador do projeto',
    description: 'Pode consultar contexto, histórias, Kanban, membros e histórico sem alterar a operação.',
    nextAction: 'Solicite papel de membro ou administrador se precisar mover histórias ou criar Rodas.',
  },
  none: {
    title: 'Acesso em validação',
    description: 'O ProdForge está carregando seu papel neste projeto.',
    nextAction: 'As ações aparecem assim que as permissões forem confirmadas.',
  },
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

const STORY_STATUS_QUICK_FILTERS = [
  { value: 'all', label: 'Todas', hint: 'Visão completa' },
  { value: 'created', label: 'Criadas', hint: 'Ainda sem preparo' },
  { value: 'refining', label: 'Em refinamento', hint: 'Ajustes em andamento' },
  { value: 'ready_for_estimation', label: 'Prontas', hint: 'Disponíveis para Roda' },
  { value: 'estimated', label: 'Estimadas', hint: 'Já pontuadas' },
]

const PROJECT_GUIDED_STATUS_LABELS = {
  complete: 'Concluído',
  current: 'Agora',
  next: 'Próximo',
}

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

function getStoryVersionLabel(versionNumber) {
  const count = Number(versionNumber ?? 1)
  const safeCount = Number.isFinite(count) && count > 0 ? count : 1
  return `${safeCount} ${safeCount === 1 ? 'versão' : 'versões'}`
}

function getStoryPreview(story) {
  return story?.input_context?.trim() || story?.user_story?.trim() || 'Sem descrição.'
}

function getKanbanColumnIntent(statusBase) {
  const intents = {
    created: 'Entrada inicial, ainda sem preparo para refinamento.',
    refining: 'Histórias que precisam de ajuste antes da estimativa.',
    ready_for_estimation: 'Histórias liberadas para abrir a Roda da Fogueira.',
    estimated: 'Histórias com pontuação final ou decisão registrada.',
  }

  return intents[statusBase] ?? 'Coluna personalizada do fluxo do projeto.'
}

function getKanbanColumnEmptyText(statusBase) {
  const texts = {
    created: 'As novas histórias vinculadas ao projeto aparecem aqui.',
    refining: 'Mova para cá o que ainda precisa de ajuste antes da Roda.',
    ready_for_estimation: 'Mova para cá as histórias prontas para estimar com o time.',
    estimated: 'Histórias seladas na Roda aparecem como estimadas.',
  }

  return texts[statusBase] ?? 'Arraste uma história para esta coluna quando ela entrar neste estágio.'
}

function isStoryInLivePlanningSession(story, planningStorySessionById = {}) {
  return Boolean(planningStorySessionById[story?.id]?.isLive)
}

function isReadyStoryAvailableForPlanning(story, planningStorySessionById = {}) {
  return (
    story?.estimation_status === 'ready_for_estimation' &&
    !isStoryInLivePlanningSession(story, planningStorySessionById)
  )
}

function countAvailableReadyStories(stories = [], planningStorySessionById = {}) {
  return stories.filter((story) => isReadyStoryAvailableForPlanning(story, planningStorySessionById)).length
}

function ProjectInsightList({ title, items, emptyText, defaultOpen = false }) {
  const safeItems = Array.isArray(items) ? items : []
  const countLabel = safeItems.length === 1 ? '1 item' : `${safeItems.length} itens`

  return (
    <details className="project-detail-page__ai-detail-card" open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{safeItems.length > 0 ? countLabel : 'Sem itens'}</small>
        </span>
      </summary>
      {safeItems.length > 0 ? (
        <ul>
          {safeItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </details>
  )
}

function ProjectDetailPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [project, setProject] = useState(null)
  const [projectMembers, setProjectMembers] = useState([])
  const [projectStories, setProjectStories] = useState([])
  const [kanbanColumns, setKanbanColumns] = useState([])
  const [planningSessions, setPlanningSessions] = useState([])
  const [planningSessionStoriesBySession, setPlanningSessionStoriesBySession] = useState({})
  const [projectStoryCount, setProjectStoryCount] = useState(0)
  const [projectStoryFilteredCount, setProjectStoryFilteredCount] = useState(0)
  const [projectStoryStatusCounts, setProjectStoryStatusCounts] = useState({
    created: 0,
    refining: 0,
    ready_for_estimation: 0,
    estimated: 0,
  })
  const [selectedProjectStoryIds, setSelectedProjectStoryIds] = useState([])
  const [storyEstimationFilter, setStoryEstimationFilter] = useState('all')
  const [storySearchInput, setStorySearchInput] = useState('')
  const [storyViewMode, setStoryViewMode] = useState('board')
  const [isInsightCandidateFilterActive, setIsInsightCandidateFilterActive] = useState(false)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('')
  const [newKanbanColumnName, setNewKanbanColumnName] = useState('')
  const [newKanbanColumnStatusBase, setNewKanbanColumnStatusBase] = useState('created')
  const [editingKanbanColumnId, setEditingKanbanColumnId] = useState(null)
  const [editingKanbanColumnName, setEditingKanbanColumnName] = useState('')
  const [editingKanbanColumnStatusBase, setEditingKanbanColumnStatusBase] = useState('created')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [isLoadingKanban, setIsLoadingKanban] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isCreatingKanbanColumn, setIsCreatingKanbanColumn] = useState(false)
  const [isAddingProjectMember, setIsAddingProjectMember] = useState(false)
  const [updatingProjectMemberId, setUpdatingProjectMemberId] = useState(null)
  const [removingProjectMemberId, setRemovingProjectMemberId] = useState(null)
  const [updatingStoryStatusId, setUpdatingStoryStatusId] = useState(null)
  const [movingKanbanStoryId, setMovingKanbanStoryId] = useState(null)
  const [reorderingKanbanColumnId, setReorderingKanbanColumnId] = useState(null)
  const [savingKanbanColumnId, setSavingKanbanColumnId] = useState(null)
  const [draggedKanbanStoryId, setDraggedKanbanStoryId] = useState(null)
  const [dragOverKanbanColumnId, setDragOverKanbanColumnId] = useState(null)
  const [canManageProjectMembers, setCanManageProjectMembers] = useState(false)
  const [projectMessage, setProjectMessage] = useState('')
  const [storyStatusMessage, setStoryStatusMessage] = useState('')
  const [kanbanMessage, setKanbanMessage] = useState('')
  const [planningSummaryMessage, setPlanningSummaryMessage] = useState('')
  const [memberMessage, setMemberMessage] = useState('')
  const [projectInsights, setProjectInsights] = useState(null)
  const [projectInsightsMessage, setProjectInsightsMessage] = useState('')
  const [projectInsightsCopyFeedback, setProjectInsightsCopyFeedback] = useState('')
  const [projectInsightHistory, setProjectInsightHistory] = useState([])
  const [activeProjectInsightId, setActiveProjectInsightId] = useState(null)
  const [deletingProjectInsightId, setDeletingProjectInsightId] = useState(null)
  const [isLoadingProjectInsightHistory, setIsLoadingProjectInsightHistory] = useState(false)
  const [isProjectInsightHistoryUnavailable, setIsProjectInsightHistoryUnavailable] = useState(false)
  const [isGeneratingProjectInsights, setIsGeneratingProjectInsights] = useState(false)
  const [isPreparingInsightCandidates, setIsPreparingInsightCandidates] = useState(false)
  const [isKanbanUnavailable, setIsKanbanUnavailable] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const storiesLabel = useMemo(
    () => `${projectStoryCount} ${projectStoryCount === 1 ? 'história' : 'histórias'}`,
    [projectStoryCount],
  )
  const membersLabel = useMemo(
    () => `${projectMembers.length} ${projectMembers.length === 1 ? 'membro' : 'membros'}`,
    [projectMembers.length],
  )
  const currentProjectRole = useMemo(() => {
    const memberRoleValue = projectMembers.find((member) => member.user_id === userId)?.role
    if (memberRoleValue) return memberRoleValue
    return project?.owner_id === userId ? 'owner' : null
  }, [project?.owner_id, projectMembers, userId])
  const canEditKanbanColumns = canManageProjectMembers
  const canMoveKanbanCards = ['owner', 'admin', 'member'].includes(currentProjectRole)
  const currentAccessDetails = PROJECT_ACCESS_DETAILS[currentProjectRole] ?? PROJECT_ACCESS_DETAILS.none
  const currentProjectRoleLabel = ROLE_LABELS[currentProjectRole] ?? 'Carregando'
  const projectAccessCapabilities = useMemo(
    () => [
      {
        label: 'Editar projeto e membros',
        enabled: canManageProjectMembers,
        detail: canManageProjectMembers ? 'Liberado' : 'Restrito a responsáveis e administradores',
      },
      {
        label: 'Criar e editar colunas',
        enabled: canEditKanbanColumns,
        detail: canEditKanbanColumns ? 'Liberado' : 'Somente consulta',
      },
      {
        label: 'Mover histórias no Kanban',
        enabled: canMoveKanbanCards,
        detail: canMoveKanbanCards ? 'Liberado' : 'Somente consulta',
      },
      {
        label: 'Criar Rodas da Fogueira',
        enabled: canManageProjectMembers,
        detail: canManageProjectMembers ? 'Liberado' : 'Restrito a responsáveis e administradores',
      },
    ],
    [canEditKanbanColumns, canManageProjectMembers, canMoveKanbanCards],
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
  const storySearchQuery = normalizeStorySearchQuery(storySearchInput)
  const isStorySearchActive = storySearchQuery.length > 0
  const hasNoProjectStories = !isLoadingStories && projectStoryCount === 0
  const hasProjectStories = projectStoryCount > 0
  const shouldShowStoryLimitNotice =
    storyViewMode === 'list' && projectStoryFilteredCount > projectStories.length
  const canGenerateProjectInsights = Boolean(project && projectStoryCount > 0 && !isGeneratingProjectInsights)
  const readyStoryCount = projectStoryStatusCounts.ready_for_estimation
  const refiningStoryCount = projectStoryStatusCounts.refining
  const estimatedStoryCount = projectStoryStatusCounts.estimated
  const kanbanStories = useMemo(
    () => kanbanColumns.flatMap((column) => column.cards ?? []),
    [kanbanColumns],
  )
  const planningStorySessionById = useMemo(
    () => getPlanningStorySessionIndex(planningSessions, planningSessionStoriesBySession),
    [planningSessionStoriesBySession, planningSessions],
  )
  const projectInsightCandidateCards = useMemo(() => {
    if (!projectInsights?.estimation_candidates?.length) return []

    const storiesById = new Map(
      [...kanbanStories, ...projectStories].filter(Boolean).map((story) => [story.id, story]),
    )
    const searchableStories = Array.from(storiesById.values())

    return projectInsights.estimation_candidates.map((candidate) => {
      const matchedStory = findProjectInsightCandidateStory(candidate, searchableStories)

      return {
        candidate,
        story: matchedStory,
      }
    })
  }, [kanbanStories, projectInsights, projectStories])
  const actionableInsightCandidateStories = useMemo(
    () =>
      projectInsightCandidateCards
        .map((item) => item.story)
        .filter(
          (story, index, stories) =>
            story &&
            stories.findIndex((current) => current?.id === story.id) === index &&
            !['ready_for_estimation', 'estimated'].includes(story.estimation_status),
        ),
    [projectInsightCandidateCards],
  )
  const projectInsightCandidateStoryIds = useMemo(
    () =>
      projectInsightCandidateCards
        .map((item) => item.story?.id)
        .filter((storyId, index, storyIds) => storyId && storyIds.indexOf(storyId) === index),
    [projectInsightCandidateCards],
  )
  const readyInsightCandidateStoryIds = useMemo(
    () =>
      projectInsightCandidateCards
        .map((item) => item.story)
        .filter((story, index, stories) =>
          story &&
          story.estimation_status === 'ready_for_estimation' &&
          stories.findIndex((current) => current?.id === story.id) === index,
        )
        .map((story) => story.id),
    [projectInsightCandidateCards],
  )
  const projectInsightCandidateStoryIdSet = useMemo(
    () => new Set(projectInsightCandidateStoryIds),
    [projectInsightCandidateStoryIds],
  )
  const insightCandidateFilterLabel =
    projectInsightCandidateStoryIds.length === 1
      ? '1 candidata da IA'
      : `${projectInsightCandidateStoryIds.length} candidatas da IA`
  const shouldFocusInsightCandidates =
    isInsightCandidateFilterActive && projectInsightCandidateStoryIds.length > 0
  const projectActionPlanItems = useMemo(() => {
    const nextActions = (projectInsights?.next_actions ?? []).map((item) => String(item).trim()).filter(Boolean)
    return nextActions.length > 0
      ? nextActions.slice(0, 3)
      : ['Definir a próxima ação com PM, PO e time antes de abrir estimativas.']
  }, [projectInsights])
  const projectActionPlanStats = useMemo(
    () => [
      {
        label: 'Riscos',
        value: projectInsights?.risks?.length ?? 0,
        detail: 'para revisar',
      },
      {
        label: 'Perguntas',
        value: projectInsights?.refinement_questions?.length ?? 0,
        detail: 'para alinhar',
      },
      {
        label: 'Candidatas',
        value: projectInsightCandidateStoryIds.length,
        detail: 'para estimar',
      },
      {
        label: 'Prontas',
        value: readyInsightCandidateStoryIds.length,
        detail: 'para Roda',
      },
    ],
    [
      projectInsightCandidateStoryIds.length,
      projectInsights?.refinement_questions?.length,
      projectInsights?.risks?.length,
      readyInsightCandidateStoryIds.length,
    ],
  )
  const livePlanningStoryCount = useMemo(
    () =>
      Object.values(planningStorySessionById).filter((entry) =>
        LIVE_PLANNING_SESSION_STATUSES.includes(entry.session?.status),
      ).length,
    [planningStorySessionById],
  )
  const livePlanningSessionCount = useMemo(
    () => planningSessions.filter((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)).length,
    [planningSessions],
  )
  const completedPlanningSessionCount = useMemo(
    () => planningSessions.filter((session) => session.status === 'completed').length,
    [planningSessions],
  )
  const visibleKanbanColumns = useMemo(
    () =>
      kanbanColumns.map((column) => ({
        ...column,
        cards:
          (column.cards ?? []).filter((story) => {
            const matchesStatus =
              storyEstimationFilter === 'all' || story.estimation_status === storyEstimationFilter
            const matchesInsightCandidate =
              !shouldFocusInsightCandidates || projectInsightCandidateStoryIdSet.has(story.id)
            const matchesSearch = storyMatchesSearch(story, storySearchQuery)
            return matchesStatus && matchesInsightCandidate && matchesSearch
          }),
      })),
    [
      kanbanColumns,
      projectInsightCandidateStoryIdSet,
      shouldFocusInsightCandidates,
      storyEstimationFilter,
      storySearchQuery,
    ],
  )
  const visibleKanbanStories = useMemo(
    () => visibleKanbanColumns.flatMap((column) => column.cards ?? []),
    [visibleKanbanColumns],
  )
  const visibleProjectStories = useMemo(
    () =>
      projectStories.filter((story) => {
        const matchesInsightCandidate =
          !shouldFocusInsightCandidates || projectInsightCandidateStoryIdSet.has(story.id)
        const matchesSearch = storyMatchesSearch(story, storySearchQuery)
        return matchesInsightCandidate && matchesSearch
      }),
    [projectInsightCandidateStoryIdSet, projectStories, shouldFocusInsightCandidates, storySearchQuery],
  )
  const visibleReadyStories = useMemo(() => {
    const sourceStories = storyViewMode === 'board' ? visibleKanbanStories : visibleProjectStories
    return sourceStories.filter((story) => story.estimation_status === 'ready_for_estimation')
  }, [storyViewMode, visibleKanbanStories, visibleProjectStories])
  const visibleAvailableReadyStories = useMemo(
    () => visibleReadyStories.filter((story) => isReadyStoryAvailableForPlanning(story, planningStorySessionById)),
    [planningStorySessionById, visibleReadyStories],
  )
  const selectedReadyStories = useMemo(
    () => visibleReadyStories.filter((story) => selectedProjectStoryIds.includes(story.id)),
    [selectedProjectStoryIds, visibleReadyStories],
  )
  const selectedReadyStoriesInLiveSessions = useMemo(
    () => selectedReadyStories.filter((story) => planningStorySessionById[story.id]?.isLive),
    [planningStorySessionById, selectedReadyStories],
  )
  const selectedReadyStoryIds = selectedReadyStories.map((story) => story.id)
  const visibleAvailableReadyCount = visibleAvailableReadyStories.length
  const visibleReadyBlockedCount = Math.max(0, visibleReadyStories.length - visibleAvailableReadyCount)
  const visibleKanbanLiveCount = useMemo(
    () => visibleKanbanStories.filter((story) => planningStorySessionById[story.id]?.isLive).length,
    [planningStorySessionById, visibleKanbanStories],
  )
  const selectedReadyStoriesLabel =
    selectedReadyStoryIds.length === 1
      ? '1 história selecionada'
      : `${selectedReadyStoryIds.length} histórias selecionadas`
  const selectedReadyStoriesHint =
    selectedReadyStoriesInLiveSessions.length > 0
      ? `${selectedReadyStoriesInLiveSessions.length} já ${
          selectedReadyStoriesInLiveSessions.length === 1 ? 'está' : 'estão'
        } em Roda ativa. Remova do lote antes de abrir uma nova Roda.`
      : visibleAvailableReadyCount > 0
        ? `${visibleAvailableReadyCount} ${
            visibleAvailableReadyCount === 1 ? 'história livre' : 'histórias livres'
          } para abrir uma nova Roda.`
        : visibleReadyBlockedCount > 0
          ? 'As histórias prontas visíveis já estão em Rodas ativas.'
          : 'Selecione histórias prontas no quadro ou na lista para abrir a Roda com o lote já carregado.'
  const canOpenSelectedReadyStories =
    selectedReadyStoryIds.length > 0 && selectedReadyStoriesInLiveSessions.length === 0
  const selectedReadyStoriesRodaUrl =
    selectedReadyStoryIds.length > 0
      ? `/roda?projectId=${projectId}&storyIds=${selectedReadyStoryIds.join(',')}`
      : `/roda?projectId=${projectId}`
  const visibleKanbanStoryCount = visibleKanbanStories.length
  const visibleProjectStoryCount = visibleProjectStories.length
  const storySearchDisplay = storySearchInput.trim()
  const storySearchResultCount = storyViewMode === 'board' ? visibleKanbanStoryCount : visibleProjectStoryCount
  const storySearchResultLabel = `${storySearchResultCount} ${
    storySearchResultCount === 1 ? 'resultado encontrado' : 'resultados encontrados'
  }`
  const hasNoStoriesForInsightCandidateFilter =
    !isLoadingStories &&
    hasProjectStories &&
    shouldFocusInsightCandidates &&
    ((storyViewMode === 'board' && visibleKanbanStoryCount === 0) ||
      (storyViewMode === 'list' && visibleProjectStoryCount === 0))
  const hasNoStoriesForLocalSearch =
    !isLoadingStories &&
    hasProjectStories &&
    isStorySearchActive &&
    !hasNoStoriesForInsightCandidateFilter &&
    ((storyViewMode === 'board' && visibleKanbanStoryCount === 0) ||
      (storyViewMode === 'list' && visibleProjectStoryCount === 0))
  const hasNoStoriesForFilter =
    !isLoadingStories &&
    projectStoryCount > 0 &&
    projectStories.length === 0 &&
    !hasNoStoriesForInsightCandidateFilter &&
    !hasNoStoriesForLocalSearch
  const kanbanBoardSummaryItems = useMemo(
    () => [
      {
        label: 'Visíveis',
        value: visibleKanbanStoryCount,
        detail: visibleKanbanStoryCount === 1 ? 'cartão no quadro' : 'cartões no quadro',
      },
      {
        label: 'Livres',
        value: visibleAvailableReadyCount,
        detail: 'prontas para nova Roda',
      },
      {
        label: 'Selecionadas',
        value: selectedReadyStoryIds.length,
        detail: 'no lote atual',
      },
      {
        label: 'Em Roda',
        value: visibleKanbanLiveCount,
        detail: 'sessões ativas',
      },
    ],
    [selectedReadyStoryIds.length, visibleAvailableReadyCount, visibleKanbanLiveCount, visibleKanbanStoryCount],
  )
  const kanbanBoardOperationTitle = canMoveKanbanCards
    ? 'Arraste cartões ou use Mover cartão'
    : 'Quadro em modo consulta'
  const kanbanBoardOperationText = canMoveKanbanCards
    ? 'Mover uma história entre colunas atualiza o status de estimativa. Histórias em Roda ativa ficam bloqueadas para evitar duplicidade.'
    : 'Seu papel permite acompanhar o fluxo, mas a movimentação fica restrita a membros, administradores e responsáveis.'
  const shouldShowKanbanLimitNotice = storyViewMode === 'board' && projectStoryCount > kanbanStories.length
  const activeProjectInsightRecord = useMemo(
    () => projectInsightHistory.find((item) => item.id === activeProjectInsightId) ?? null,
    [activeProjectInsightId, projectInsightHistory],
  )
  const currentProjectInsightFreshness = useMemo(() => {
    if (!projectInsights) return null

    return getProjectInsightFreshness(
      activeProjectInsightRecord ?? {
        input_story_count: Number(projectInsights?.meta?.analyzed_stories ?? projectStoryCount),
        analysis: projectInsights,
      },
      projectStoryCount,
    )
  }, [activeProjectInsightRecord, projectInsights, projectStoryCount])
  const isProjectInsightOutdated = Boolean(currentProjectInsightFreshness?.isOutdated)
  const projectInsightExecutiveLabel = projectInsights
    ? isProjectInsightOutdated
      ? currentProjectInsightFreshness.label
      : projectInsights.health_label
    : 'Sem diagnóstico'
  const projectInsightExecutiveText = projectInsights
    ? isProjectInsightOutdated
      ? `${currentProjectInsightFreshness.description} Atualize a leitura antes de orientar o próximo passo.`
      : projectInsights.summary
    : 'Gere uma leitura com IA para resumir riscos, dúvidas e próximos passos.'
  const projectInsightExecutiveActionLabel = projectInsights
    ? isProjectInsightOutdated
      ? 'Atualizar diagnóstico'
      : 'Ver diagnóstico'
    : 'Gerar diagnóstico'
  const latestProjectNextAction =
    (isProjectInsightOutdated
      ? 'Atualize o diagnóstico para alinhar a leitura de IA com as histórias atuais.'
      : projectInsights?.next_actions?.[0]) ??
    (projectStoryCount === 0
      ? 'Forje ou vincule a primeira história para liberar a leitura do projeto.'
      : 'Gere um diagnóstico para priorizar riscos e próximos passos.')
  const projectReadinessLabel = readyStoryCount > 0 ? 'Pronto para estimar' : 'Em organização'
  const projectReadinessText =
    projectStoryCount === 0
      ? 'Nenhuma história vinculada ainda.'
      : readyStoryCount > 0
      ? `${readyStoryCount} ${readyStoryCount === 1 ? 'história pronta' : 'histórias prontas'} para a Roda.`
      : `${refiningStoryCount} em refinamento · ${estimatedStoryCount} ${
          estimatedStoryCount === 1 ? 'estimada' : 'estimadas'
        }.`
  const estimatedProgressPercent =
    projectStoryCount > 0 ? Math.round((estimatedStoryCount / projectStoryCount) * 100) : 0
  const readyProgressPercent =
    projectStoryCount > 0 ? Math.round((readyStoryCount / projectStoryCount) * 100) : 0
  const latestStoryActivityLabel = useMemo(() => {
    const dates = [...kanbanStories, ...projectStories]
      .map((story) => new Date(story?.created_at ?? '').getTime())
      .filter((timestamp) => Number.isFinite(timestamp))

    if (dates.length === 0) return 'Sem atividade'

    return formatProjectDateTime(Math.max(...dates))
  }, [kanbanStories, projectStories])
  const projectMetricsCards = useMemo(
    () => [
      {
        label: 'Histórias',
        value: storiesLabel,
        detail:
          projectStoryCount > 0
            ? `${refiningStoryCount} em refinamento · ${readyStoryCount} prontas`
            : 'Forje ou vincule a primeira peça.',
        progress: projectStoryCount > 0 ? Math.min(100, Math.max(0, readyProgressPercent)) : 0,
        tone: readyStoryCount > 0 ? 'ready' : projectStoryCount > 0 ? 'attention' : 'idle',
        action:
          projectStoryCount > 0
            ? { label: 'Ver quadro', href: '#historias-projeto' }
            : { label: 'Forjar história', to: `/tool?projectId=${projectId}` },
      },
      {
        label: 'Estimativas',
        value: `${estimatedProgressPercent}% estimado`,
        detail:
          projectStoryCount > 0
            ? `${estimatedStoryCount}/${projectStoryCount} histórias com pontuação final`
            : 'Nenhuma estimativa registrada ainda.',
        progress: estimatedProgressPercent,
        tone: estimatedStoryCount > 0 ? 'ready' : readyStoryCount > 0 ? 'attention' : 'idle',
        action:
          estimatedStoryCount > 0
            ? { label: 'Ver Rodas', to: `/roda?projectId=${projectId}` }
            : { label: 'Preparar lote', href: '#historias-projeto' },
      },
      {
        label: 'Rodas',
        value:
          livePlanningSessionCount > 0
            ? `${livePlanningSessionCount} ${livePlanningSessionCount === 1 ? 'ativa' : 'ativas'}`
            : `${completedPlanningSessionCount} ${completedPlanningSessionCount === 1 ? 'finalizada' : 'finalizadas'}`,
        detail:
          livePlanningStoryCount > 0
            ? `${livePlanningStoryCount} ${
                livePlanningStoryCount === 1 ? 'história em sessão ativa' : 'histórias em sessões ativas'
              }`
            : 'Sem sessão ativa no momento.',
        progress: livePlanningSessionCount > 0 ? 100 : completedPlanningSessionCount > 0 ? 70 : 0,
        tone: livePlanningSessionCount > 0 ? 'live' : completedPlanningSessionCount > 0 ? 'ready' : 'idle',
        action: {
          label: livePlanningSessionCount > 0 ? 'Continuar Rodas' : 'Abrir Rodas',
          to: `/roda?projectId=${projectId}`,
        },
      },
      {
        label: 'Última peça',
        value: latestStoryActivityLabel,
        detail:
          latestStoryActivityLabel === 'Sem atividade'
            ? 'Nenhuma história vinculada ao projeto.'
            : 'História mais recente vinculada ao projeto.',
        progress: latestStoryActivityLabel === 'Sem atividade' ? 0 : 100,
        tone: latestStoryActivityLabel === 'Sem atividade' ? 'idle' : 'tech',
        action: { label: 'Consultar peças', to: `/historico?projectId=${projectId}` },
      },
    ],
    [
      completedPlanningSessionCount,
      estimatedProgressPercent,
      estimatedStoryCount,
      latestStoryActivityLabel,
      livePlanningSessionCount,
      livePlanningStoryCount,
      projectId,
      projectStoryCount,
      readyProgressPercent,
      readyStoryCount,
      refiningStoryCount,
      storiesLabel,
    ],
  )
  const projectGuidedSteps = useMemo(() => {
    const hasStories = projectStoryCount > 0
    const hasReadyOrEstimated = readyStoryCount > 0 || livePlanningStoryCount > 0 || estimatedStoryCount > 0
    const hasPlanningSession = livePlanningSessionCount > 0 || completedPlanningSessionCount > 0
    const hasFinalEstimate = estimatedStoryCount > 0 || completedPlanningSessionCount > 0
    const readyLabel =
      readyStoryCount === 1 ? '1 história pronta' : `${readyStoryCount} histórias prontas`
    const estimatedLabel =
      estimatedStoryCount === 1 ? '1 história estimada' : `${estimatedStoryCount} histórias estimadas`

    return [
      {
        id: 'forge',
        title: 'Forjar história',
        description: hasStories
          ? `${projectStoryCount} ${projectStoryCount === 1 ? 'história vinculada' : 'histórias vinculadas'} ao projeto.`
          : 'Crie a primeira peça com a Bancada já apontada para este projeto.',
        status: hasStories ? 'complete' : 'current',
        action: { label: hasStories ? 'Nova história' : 'Abrir Bancada', to: `/tool?projectId=${projectId}` },
      },
      {
        id: 'kanban',
        title: 'Organizar no Kanban',
        description: hasStories
          ? 'Use o quadro para separar o que está criado, em refinamento, pronto ou estimado.'
          : 'O quadro aparece como base visual assim que houver uma história vinculada.',
        status: hasStories ? 'complete' : 'next',
        action: { label: 'Ver quadro', href: '#historias-projeto' },
      },
      {
        id: 'prepare',
        title: 'Preparar para estimativa',
        description: hasReadyOrEstimated
          ? readyStoryCount > 0
            ? `${readyLabel} para levar à Roda da Fogueira.`
            : 'O projeto já possui histórias encaminhadas ou estimadas.'
          : 'Mova histórias refinadas para “Prontas para estimar” quando critérios e dúvidas estiverem claros.',
        status: hasReadyOrEstimated ? 'complete' : hasStories ? 'current' : 'next',
        action: { label: 'Preparar histórias', href: '#historias-projeto' },
      },
      {
        id: 'planning',
        title: 'Abrir Roda',
        description: hasPlanningSession
          ? livePlanningSessionCount > 0
            ? `${livePlanningSessionCount} ${livePlanningSessionCount === 1 ? 'Roda ativa' : 'Rodas ativas'} neste projeto.`
            : 'O histórico de Rodas já está disponível para consulta.'
          : 'Crie uma sessão quando houver histórias prontas para discussão com a guilda.',
        status: hasPlanningSession ? 'complete' : readyStoryCount > 0 ? 'current' : 'next',
        action: { label: hasPlanningSession ? 'Ver Rodas' : 'Criar Roda', to: `/roda?projectId=${projectId}` },
      },
      {
        id: 'review',
        title: 'Revisar resultado',
        description: hasFinalEstimate
          ? `${estimatedLabel} com decisão registrada para priorização.`
          : livePlanningSessionCount > 0
            ? 'Acompanhe a sessão aberta e sele a estimativa final quando houver consenso.'
            : 'Depois da Roda, revise decisões, pontuação final e próximos ajustes do backlog.',
        status: hasFinalEstimate ? 'complete' : livePlanningSessionCount > 0 ? 'current' : 'next',
        action: { label: 'Consultar histórico', to: `/roda?projectId=${projectId}` },
      },
    ]
  }, [
    completedPlanningSessionCount,
    estimatedStoryCount,
    livePlanningSessionCount,
    livePlanningStoryCount,
    projectId,
    projectStoryCount,
    readyStoryCount,
  ])
  const projectGuidedNextStep =
    projectGuidedSteps.find((step) => step.status === 'current') ??
    projectGuidedSteps.find((step) => step.status === 'next') ??
    projectGuidedSteps[projectGuidedSteps.length - 1]
  const storyOperationalGuidance = (() => {
    if (projectStoryCount === 0) {
      return {
        title: 'Forje a primeira história',
        description: 'A Bancada abre com este projeto selecionado para criar a primeira peça do quadro.',
        cta: 'Abrir Bancada',
        to: `/tool?projectId=${projectId}`,
        tone: 'forge',
      }
    }

    if (readyStoryCount > 0) {
      return {
        title: 'Levar lote pronto para a Roda',
        description: `${readyStoryCount} ${
          readyStoryCount === 1 ? 'história já está pronta' : 'histórias já estão prontas'
        } para estimativa colaborativa.`,
        cta: 'Abrir Roda',
        to: `/roda?projectId=${projectId}`,
        tone: 'ready',
      }
    }

    if (isProjectInsightOutdated) {
      return {
        title: 'Atualizar diagnóstico antes de priorizar',
        description: currentProjectInsightFreshness.description,
        cta: 'Atualizar IA',
        href: '#diagnostico-projeto',
        tone: 'warning',
      }
    }

    if (refiningStoryCount > 0) {
      return {
        title: 'Concluir refinamento',
        description: 'Revise histórias em refinamento, ajuste critérios e mova o que estiver pronto para estimar.',
        cta: 'Ver refinamento',
        href: '#historias-projeto',
        tone: 'attention',
      }
    }

    if (!projectInsights) {
      return {
        title: 'Gerar leitura de IA',
        description: 'Use o diagnóstico do projeto para encontrar riscos e próximas histórias para preparar.',
        cta: 'Gerar diagnóstico',
        href: '#diagnostico-projeto',
        tone: 'ai',
      }
    }

    return {
      title: 'Organizar próximas histórias',
      description: 'Use o quadro para preparar novas candidatas para estimativa ou revisar peças já estimadas.',
      cta: 'Revisar quadro',
      href: '#historias-projeto',
      tone: 'neutral',
    }
  })()
  const operationalEstimateLabel =
    livePlanningStoryCount > 0
      ? 'Roda em andamento'
      : readyStoryCount > 0
        ? 'Pronto para Roda'
        : estimatedStoryCount > 0
          ? 'Já possui estimativas'
          : 'Sem lote pronto'
  const operationalEstimateText =
    livePlanningStoryCount > 0
      ? `${livePlanningStoryCount} ${livePlanningStoryCount === 1 ? 'história está' : 'histórias estão'} em Rodas ativas.`
      : readyStoryCount > 0
        ? 'Abra a Roda da Fogueira com as histórias prontas ou selecione um lote no quadro.'
        : estimatedStoryCount > 0
          ? 'Consulte o histórico das Rodas para revisar decisões já seladas.'
          : 'Mova histórias para prontas quando o refinamento estiver suficiente.'
  const operationalNextActionLabel =
    projectStoryCount === 0
      ? 'Forjar primeira história'
      : readyStoryCount > 0
        ? 'Abrir Roda'
        : refiningStoryCount > 0
          ? 'Concluir refinamento'
          : 'Gerar diagnóstico'
  const operationalNextActionText =
    projectStoryCount === 0
      ? 'Use a Bancada com este projeto selecionado para criar a primeira peça.'
      : readyStoryCount > 0
        ? 'Leve o lote pronto para estimativa colaborativa.'
        : refiningStoryCount > 0
          ? 'Revise critérios, dúvidas e contexto antes de marcar histórias como prontas.'
          : 'Use a IA para encontrar riscos e próximos passos do projeto.'
  const projectOperationalSnapshotCards = useMemo(
    () => [
      {
        label: 'Cobertura',
        value: storiesLabel,
        description:
          projectStoryCount > 0
            ? `${membersLabel} no projeto. ${projectStoryFilteredCount} no recorte atual.`
            : 'Ainda não há histórias vinculadas a este projeto.',
        tone: projectStoryCount > 0 ? 'ready' : 'idle',
        action:
          projectStoryCount > 0
            ? { label: 'Ver histórias', href: '#historias-projeto' }
            : { label: 'Forjar história', to: `/tool?projectId=${projectId}` },
      },
      {
        label: 'Preparação',
        value: projectReadinessLabel,
        description: projectReadinessText,
        tone: readyStoryCount > 0 ? 'ready' : projectStoryCount > 0 ? 'attention' : 'idle',
        action:
          readyStoryCount > 0
            ? { label: 'Abrir Roda', to: `/roda?projectId=${projectId}` }
            : projectStoryCount > 0
              ? { label: 'Preparar histórias', href: '#historias-projeto' }
              : { label: 'Criar primeira peça', to: `/tool?projectId=${projectId}` },
      },
      {
        label: 'Estimativa',
        value: operationalEstimateLabel,
        description: operationalEstimateText,
        tone: livePlanningStoryCount > 0 ? 'live' : readyStoryCount > 0 ? 'ready' : 'idle',
        action:
          livePlanningStoryCount > 0 || readyStoryCount > 0
            ? { label: 'Ir para Rodas', to: `/roda?projectId=${projectId}` }
            : estimatedStoryCount > 0
              ? { label: 'Ver histórico', to: `/roda?projectId=${projectId}` }
              : { label: 'Organizar quadro', href: '#historias-projeto' },
      },
      {
        label: 'Próxima ação',
        value: isProjectInsightOutdated ? 'Atualizar diagnóstico' : operationalNextActionLabel,
        description: isProjectInsightOutdated
          ? currentProjectInsightFreshness.description
          : operationalNextActionText,
        tone: isProjectInsightOutdated
          ? 'attention'
          : readyStoryCount > 0
            ? 'ready'
            : refiningStoryCount > 0
              ? 'attention'
              : 'tech',
        action:
          isProjectInsightOutdated
            ? { label: 'Atualizar IA', href: '#diagnostico-projeto' }
            : projectStoryCount === 0
            ? { label: 'Abrir Bancada', to: `/tool?projectId=${projectId}` }
            : readyStoryCount > 0
              ? { label: 'Criar Roda', to: `/roda?projectId=${projectId}` }
              : refiningStoryCount > 0
                ? { label: 'Ver quadro', href: '#historias-projeto' }
                : { label: 'Gerar diagnóstico', href: '#diagnostico-projeto' },
      },
    ],
    [
      estimatedStoryCount,
      currentProjectInsightFreshness?.description,
      isProjectInsightOutdated,
      livePlanningStoryCount,
      membersLabel,
      operationalEstimateLabel,
      operationalEstimateText,
      operationalNextActionLabel,
      operationalNextActionText,
      projectReadinessLabel,
      projectReadinessText,
      projectId,
      projectStoryCount,
      projectStoryFilteredCount,
      readyStoryCount,
      refiningStoryCount,
      storiesLabel,
    ],
  )
  const projectCockpitCards = [
    {
      label: 'Bancada',
      title: projectStoryCount === 0 ? 'Forjar primeira história' : 'Forjar nova história',
      description:
        projectStoryCount === 0
          ? 'Crie a primeira peça já vinculada a este projeto.'
          : 'Adicione uma nova peça ao quadro mantendo o contexto do projeto.',
      to: `/tool?projectId=${projectId}`,
      cta: projectStoryCount === 0 ? 'Começar na Bancada' : 'Nova peça',
      tone: 'forge',
    },
    {
      label: 'Quadro',
      title: 'Organizar fluxo',
      description:
        readyStoryCount > 0
          ? `${readyStoryCount} ${readyStoryCount === 1 ? 'história pronta' : 'histórias prontas'} para estimar.`
          : 'Mova histórias entre colunas e prepare o lote para estimativa.',
      href: '#historias-projeto',
      cta: 'Abrir quadro',
      tone: readyStoryCount > 0 ? 'ready' : 'neutral',
    },
    {
      label: 'IA do projeto',
      title: projectInsights
        ? isProjectInsightOutdated
          ? 'Atualizar diagnóstico'
          : 'Revisar diagnóstico'
        : 'Gerar diagnóstico',
      description: projectInsights
        ? isProjectInsightOutdated
          ? currentProjectInsightFreshness.description
          : 'Use a leitura salva para orientar refinamento e decisões.'
        : projectStoryCount === 0
          ? 'A IA libera a leitura depois que houver histórias vinculadas.'
          : 'Mapeie riscos, dúvidas e próximas ações com IA.',
      href: '#diagnostico-projeto',
      cta: projectInsights
        ? isProjectInsightOutdated
          ? 'Atualizar IA'
          : 'Ver leitura'
        : 'Gerar leitura',
      tone: isProjectInsightOutdated ? 'warning' : projectInsights ? 'ai' : 'neutral',
    },
    {
      label: 'Roda da Fogueira',
      title: livePlanningStoryCount > 0 ? 'Continuar estimativas' : 'Abrir estimativa',
      description:
        livePlanningStoryCount > 0
          ? `${livePlanningStoryCount} ${
              livePlanningStoryCount === 1 ? 'história está' : 'histórias estão'
            } em Rodas ativas.`
          : readyStoryCount > 0
            ? 'Leve as histórias prontas para consenso com o time.'
            : 'Prepare histórias no quadro antes de abrir a Roda.',
      to: `/roda?projectId=${projectId}`,
      cta: livePlanningStoryCount > 0 ? 'Ver Rodas' : 'Abrir Roda',
      tone: readyStoryCount > 0 || livePlanningStoryCount > 0 ? 'ready' : 'neutral',
    },
    {
      label: 'Histórico',
      title: 'Consultar peças',
      description:
        projectStoryCount > 0
          ? `${projectStoryCount} ${
              projectStoryCount === 1 ? 'peça vinculada' : 'peças vinculadas'
            } para revisar, copiar ou reabrir.`
          : 'O histórico do projeto aparece depois que houver peças vinculadas.',
      to: `/historico?projectId=${projectId}`,
      cta: 'Ver histórico',
      tone: projectStoryCount > 0 ? 'ready' : 'neutral',
    },
    {
      label: 'Colaboração',
      title: 'Times e membros',
      description:
        projectMembers.length > 0
          ? `${membersLabel} com acesso ao projeto.`
          : 'Adicione pessoas quando o projeto pedir colaboração.',
      to: `/times?projectId=${projectId}`,
      cta: 'Gerenciar times',
      tone: projectMembers.length > 0 ? 'team' : 'neutral',
    },
  ]
  const connectedInsightCandidateCount = projectInsightCandidateStoryIds.length
  const actionableInsightCandidateCount = actionableInsightCandidateStories.length
  const readyInsightCandidateCount = readyInsightCandidateStoryIds.length
  const connectedInsightCandidateLabel =
    connectedInsightCandidateCount === 1 ? '1 conectada' : `${connectedInsightCandidateCount} conectadas`
  const readyStoriesCommandLabel = readyStoryCount === 1 ? '1 pronta' : `${readyStoryCount} prontas`
  const estimatedStoriesCommandLabel =
    estimatedStoryCount === 1 ? '1 estimada' : `${estimatedStoryCount} estimadas`
  const actionableInsightCandidateLabel =
    actionableInsightCandidateCount === 1
      ? '1 ainda pode ser preparada'
      : `${actionableInsightCandidateCount} ainda podem ser preparadas`
  const readyInsightCandidateLabel =
    readyInsightCandidateCount === 1 ? '1 já está pronta' : `${readyInsightCandidateCount} já estão prontas`
  const projectAiCommandCards = [
    {
      label: 'Base atual',
      title: storiesLabel,
      description:
        projectStoryCount > 0
          ? `${readyStoriesCommandLabel}, ${refiningStoryCount} em refinamento e ${estimatedStoriesCommandLabel}.`
          : 'Forje ou vincule histórias para liberar diagnóstico e ações guiadas.',
      tone: projectStoryCount > 0 ? 'tech' : 'neutral',
      action: projectStoryCount > 0
        ? { label: 'Ver quadro', href: '#historias-projeto' }
        : { label: 'Abrir Bancada', to: `/tool?projectId=${projectId}` },
    },
    {
      label: 'Diagnóstico',
      title: projectInsights
        ? isProjectInsightOutdated
          ? 'Precisa atualizar'
          : currentProjectInsightFreshness?.label ?? 'Atualizado'
        : 'Ainda não gerado',
      description: projectInsights
        ? isProjectInsightOutdated
          ? currentProjectInsightFreshness.description
          : 'Leitura disponível para orientar preparação, alinhamento e estimativa.'
        : 'Gere uma leitura executiva com riscos, perguntas e próximos passos.',
      tone: isProjectInsightOutdated ? 'warning' : projectInsights ? 'ai' : 'neutral',
      action: {
        label: isGeneratingProjectInsights
          ? 'Analisando...'
          : projectInsights
            ? 'Atualizar IA'
            : 'Gerar diagnóstico',
        onClick: handleGenerateProjectInsights,
        disabled: !canGenerateProjectInsights,
      },
    },
    {
      label: 'Candidatas',
      title: connectedInsightCandidateCount > 0 ? connectedInsightCandidateLabel : 'Sem foco ativo',
      description:
        connectedInsightCandidateCount > 0
          ? `${actionableInsightCandidateLabel} e ${readyInsightCandidateLabel}.`
          : projectInsights
            ? 'A IA não conectou candidatas automaticamente a histórias do projeto.'
            : 'As candidatas aparecem depois do diagnóstico com IA.',
      tone: connectedInsightCandidateCount > 0 ? 'ready' : 'neutral',
      action: connectedInsightCandidateCount > 0
        ? {
            label: shouldFocusInsightCandidates ? 'Limpar foco' : 'Focar quadro',
            onClick: handleToggleInsightCandidateFilter,
          }
        : { label: 'Ver histórias', href: '#historias-projeto' },
    },
    {
      label: 'Encaminhamento',
      title: storyOperationalGuidance.title,
      description: storyOperationalGuidance.description,
      tone: storyOperationalGuidance.tone,
      action: {
        label: storyOperationalGuidance.cta,
        to: storyOperationalGuidance.to,
        href: storyOperationalGuidance.href,
      },
    },
  ]

  function getStoryStatusQuickFilterCount(status) {
    if (status === 'all') return projectStoryCount
    return projectStoryStatusCounts[status] ?? 0
  }

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
      const nextStories = storiesResponse.data ?? []
      setProjectStories(nextStories)
      setProjectStoryFilteredCount(storiesResponse.totalCount ?? 0)
    } else {
      setProjectStories([])
      setSelectedProjectStoryIds([])
      setProjectStoryFilteredCount(0)
    }

    if (totalsResponse.success) {
      setProjectStoryCount(totalsResponse.totalCount ?? 0)
    } else if (storyEstimationFilter === 'all') {
      setProjectStoryCount(0)
    }
  }, [projectId, storyEstimationFilter, userId])

  const loadProjectKanban = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoadingKanban(true)
    setIsKanbanUnavailable(false)
    const response = await listProjectKanbanBoard({ projectId, userId, limit: 200 })
    setIsLoadingKanban(false)

    if (response.success) {
      setKanbanColumns(response.data ?? [])
      setIsKanbanUnavailable(false)
      return
    }

    setKanbanColumns([])
    setIsKanbanUnavailable(true)
    setKanbanMessage(
      response.error?.message ??
        'O quadro Kanban ficará disponível após aplicar o SQL desta etapa.',
    )
  }, [projectId, userId])

  const loadProjectPlanningSummaries = useCallback(async () => {
    if (!projectId || !userId) return

    setPlanningSummaryMessage('')
    const sessionsResponse = await listPlanningPokerSessionsByProject({ projectId, userId })

    if (!sessionsResponse.success) {
      setPlanningSessions([])
      setPlanningSessionStoriesBySession({})
      setPlanningSummaryMessage('Não foi possível carregar o resumo das Rodas deste projeto.')
      return
    }

    const nextSessions = sessionsResponse.data ?? []
    setPlanningSessions(nextSessions)

    if (nextSessions.length === 0) {
      setPlanningSessionStoriesBySession({})
      return
    }

    const storiesResponse = await listPlanningPokerSessionStorySummaries({
      sessionIds: nextSessions.map((session) => session.id),
      userId,
    })

    if (!storiesResponse.success) {
      setPlanningSessionStoriesBySession({})
      setPlanningSummaryMessage('Resumo das Rodas indisponível no momento.')
      return
    }

    const nextStoriesBySession = (storiesResponse.data ?? []).reduce((storiesBySession, story) => {
      if (!storiesBySession[story.session_id]) {
        storiesBySession[story.session_id] = []
      }

      storiesBySession[story.session_id].push(story)
      return storiesBySession
    }, {})

    setPlanningSessionStoriesBySession(nextStoriesBySession)
  }, [projectId, userId])

  const loadProjectStoryStatusCounts = useCallback(async () => {
    if (!projectId || !userId) return

    const responses = await Promise.all(
      ESTIMATION_STATUS_OPTIONS.map((option) =>
        listStoryHistoryGroups({
          userId,
          projectFilter: 'project',
          projectId,
          estimationStatus: option.value,
          page: 1,
          pageSize: 1,
        }),
      ),
    )

    const nextCounts = ESTIMATION_STATUS_OPTIONS.reduce((accumulator, option, index) => {
      accumulator[option.value] = responses[index]?.success ? (responses[index].totalCount ?? 0) : 0
      return accumulator
    }, {})

    setProjectStoryStatusCounts((current) => ({ ...current, ...nextCounts }))
  }, [projectId, userId])

  const loadProject = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoading(true)
    const [projectResponse, membersResponse, manageResponse] = await Promise.all([
      getProjectById({ projectId, userId }),
      listProjectMembers({ projectId, userId }),
      checkCanManageProject({ projectId, userId }),
    ])
    setIsLoading(false)

    if (!projectResponse.success || !projectResponse.data) {
      setNotFound(true)
      return
    }

    setProject(projectResponse.data)
    setProjectNameDraft(projectResponse.data.name ?? '')
    setProjectDescriptionDraft(projectResponse.data.description ?? '')
    setProjectMembers(membersResponse.success ? (membersResponse.data ?? []) : [])
    setCanManageProjectMembers(manageResponse.success ? Boolean(manageResponse.data) : false)
  }, [projectId, userId])

  const loadProjectInsightHistory = useCallback(async () => {
    if (!projectId || !userId) return

    setProjectInsights(null)
    setProjectInsightsMessage('')
    setProjectInsightsCopyFeedback('')
    setProjectInsightHistory([])
    setActiveProjectInsightId(null)
    setIsProjectInsightHistoryUnavailable(false)
    setIsLoadingProjectInsightHistory(true)
    const response = await listProjectAnalyses({ projectId, userId, limit: 3 })
    setIsLoadingProjectInsightHistory(false)

    if (response.success) {
      const history = response.data ?? []
      setProjectInsightHistory(history)
      if (history.length > 0) {
        setProjectInsights((current) => current ?? history[0].analysis)
        setActiveProjectInsightId((current) => current ?? history[0].id)
      }
      setIsProjectInsightHistoryUnavailable(false)
      return
    }

    setProjectInsightHistory([])
    setActiveProjectInsightId(null)
    setIsProjectInsightHistoryUnavailable(Boolean(response.unavailable))
  }, [projectId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProject()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProject])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectInsightHistory()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectInsightHistory])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectStories()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectStories])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectKanban()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectKanban])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectPlanningSummaries()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectPlanningSummaries])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectStoryStatusCounts()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectStoryStatusCounts])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Projeto',
      title: project?.name ?? 'Projeto',
      pills: [
        { text: storiesLabel },
        { text: membersLabel },
        { text: livePlanningStoryCount > 0 ? `${livePlanningStoryCount} em Roda ativa` : 'Times e Roda no menu' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [livePlanningStoryCount, membersLabel, project?.name, setTopbarStatus, storiesLabel])

  async function handleUpdateProject(event) {
    event.preventDefault()
    setProjectMessage('')

    if (!canManageProjectMembers) {
      setProjectMessage('Apenas responsáveis e administradores podem editar o projeto.')
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

    if (!response.success) {
      setProjectMessage(response.error?.message ?? 'Não foi possível salvar o projeto agora.')
      return
    }

    setProject(response.data)
    setIsEditingProject(false)
    setProjectMessage('Projeto atualizado.')
  }

  function handleCancelProjectEdit() {
    setProjectNameDraft(project?.name ?? '')
    setProjectDescriptionDraft(project?.description ?? '')
    setIsEditingProject(false)
    setProjectMessage('')
  }

  async function handleUpdateStoryEstimationStatus(story, nextStatus) {
    if (!story || story.estimation_status === nextStatus) return

    setStoryStatusMessage('')

    if (isStoryInLivePlanningSession(story, planningStorySessionById)) {
      setStoryStatusMessage('Esta história está em uma Roda ativa. Finalize ou continue a sessão antes de alterar o status.')
      return
    }

    setUpdatingStoryStatusId(story.id)

    const targetKanbanColumn = canMoveKanbanCards
      ? kanbanColumns.find((column) => column.status_base === nextStatus)
      : null
    const response = targetKanbanColumn
      ? await moveProjectKanbanStory({
          projectId,
          storyId: story.id,
          columnId: targetKanbanColumn.id,
          position: getKanbanColumnDropPosition(targetKanbanColumn.id),
          userId,
        })
      : await updateUserStoryEstimationStatus({
          storyId: story.id,
          estimationStatus: nextStatus,
          userId,
        })

    setUpdatingStoryStatusId(null)

    if (!response.success) {
      setStoryStatusMessage(response.error?.message ?? 'Não foi possível atualizar o status da história.')
      return
    }

    setProjectStories((current) =>
      current.map((item) =>
        item.id === story.id ? { ...item, estimation_status: nextStatus } : item,
      ),
    )
    if (nextStatus !== 'ready_for_estimation') {
      setSelectedProjectStoryIds((current) => current.filter((storyId) => storyId !== story.id))
    }
    setStoryStatusMessage('Status de estimativa atualizado.')
    await Promise.all([
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectKanban(),
      loadProjectPlanningSummaries(),
    ])
  }

  async function handlePrepareStoryForPlanning(story) {
    if (!story) return
    await handleUpdateStoryEstimationStatus(story, 'ready_for_estimation')
  }

  async function handlePrepareInsightCandidates() {
    if (actionableInsightCandidateStories.length === 0) return

    setProjectInsightsMessage('')
    setIsPreparingInsightCandidates(true)

    const readyColumn = kanbanColumns.find((column) => column.status_base === 'ready_for_estimation')
    const responses = []

    for (const story of actionableInsightCandidateStories) {
      const response = readyColumn
        ? await moveProjectKanbanStory({
            projectId,
            storyId: story.id,
            columnId: readyColumn.id,
            position: getKanbanColumnDropPosition(readyColumn.id),
            userId,
          })
        : await updateUserStoryEstimationStatus({
            storyId: story.id,
            estimationStatus: 'ready_for_estimation',
            userId,
          })

      responses.push({ response, story })
    }

    setIsPreparingInsightCandidates(false)

    const preparedStoryIds = responses
      .filter((item) => item.response.success)
      .map((item) => item.story.id)
    const failureCount = responses.length - preparedStoryIds.length

    if (preparedStoryIds.length > 0) {
      setSelectedProjectStoryIds((current) => Array.from(new Set([...current, ...preparedStoryIds])))
    }

    setProjectInsightsMessage(
      failureCount > 0
        ? `${preparedStoryIds.length} candidatas preparadas. ${failureCount} não puderam ser atualizadas agora.`
        : `${preparedStoryIds.length} candidatas preparadas para estimativa e selecionadas para a Roda.`,
    )

    await Promise.all([
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectKanban(),
      loadProjectPlanningSummaries(),
    ])
  }

  function getKanbanColumnDropPosition(columnId) {
    const column = kanbanColumns.find((item) => item.id === columnId)
    const positions = (column?.cards ?? []).map((story) => Number(story.kanban_position ?? 0))
    if (positions.length === 0) return 1000
    return Math.min(...positions) - 1000
  }

  function handleStartEditKanbanColumn(column) {
    setKanbanMessage('')
    setEditingKanbanColumnId(column.id)
    setEditingKanbanColumnName(column.name ?? '')
    setEditingKanbanColumnStatusBase(column.status_base ?? 'created')
  }

  function handleCancelEditKanbanColumn() {
    setEditingKanbanColumnId(null)
    setEditingKanbanColumnName('')
    setEditingKanbanColumnStatusBase('created')
  }

  async function handleCreateKanbanColumn(event) {
    event.preventDefault()

    if (!canEditKanbanColumns) {
      setKanbanMessage('Apenas responsáveis e administradores podem criar colunas.')
      return
    }

    setKanbanMessage('')
    setIsCreatingKanbanColumn(true)
    const response = await createProjectKanbanColumn({
      projectId,
      name: newKanbanColumnName,
      statusBase: newKanbanColumnStatusBase,
      userId,
    })
    setIsCreatingKanbanColumn(false)

    if (!response.success) {
      setKanbanMessage(response.error?.message ?? 'Não foi possível criar a coluna agora.')
      return
    }

    setNewKanbanColumnName('')
    setNewKanbanColumnStatusBase('created')
    setKanbanMessage('Coluna criada.')
    await loadProjectKanban()
  }

  async function handleUpdateKanbanColumn(event, column) {
    event.preventDefault()

    if (!canEditKanbanColumns) {
      setKanbanMessage('Apenas responsáveis e administradores podem editar colunas.')
      return
    }

    setKanbanMessage('')
    setSavingKanbanColumnId(column.id)
    const response = await updateProjectKanbanColumn({
      columnId: column.id,
      name: editingKanbanColumnName,
      statusBase: editingKanbanColumnStatusBase,
      userId,
    })
    setSavingKanbanColumnId(null)

    if (!response.success) {
      setKanbanMessage(response.error?.message ?? 'Não foi possível salvar a coluna agora.')
      return
    }

    handleCancelEditKanbanColumn()
    setKanbanMessage('Coluna atualizada.')
    await Promise.all([
      loadProjectKanban(),
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectPlanningSummaries(),
    ])
  }

  async function handleReorderKanbanColumn(column, direction) {
    if (!canEditKanbanColumns) {
      setKanbanMessage('Apenas responsáveis e administradores podem reordenar colunas.')
      return
    }

    setKanbanMessage('')
    setReorderingKanbanColumnId(column.id)
    const response = await reorderProjectKanbanColumn({
      columnId: column.id,
      direction,
      userId,
    })
    setReorderingKanbanColumnId(null)

    if (!response.success) {
      setKanbanMessage(response.error?.message ?? 'Não foi possível reordenar a coluna agora.')
      return
    }

    setKanbanMessage('Coluna reordenada.')
    await loadProjectKanban()
  }

  async function handleMoveKanbanStory(story, columnId) {
    if (!story || !columnId || story.kanban_column_id === columnId) return

    if (!canMoveKanbanCards) {
      setKanbanMessage('Visualizadores podem consultar o quadro, mas não mover histórias.')
      return
    }

    if (isStoryInLivePlanningSession(story, planningStorySessionById)) {
      setKanbanMessage('Esta história está em uma Roda ativa. Finalize ou continue a sessão antes de mover o card.')
      return
    }

    setKanbanMessage('')
    setMovingKanbanStoryId(story.id)
    const response = await moveProjectKanbanStory({
      projectId,
      storyId: story.id,
      columnId,
      position: getKanbanColumnDropPosition(columnId),
      userId,
    })
    setMovingKanbanStoryId(null)
    setDraggedKanbanStoryId(null)
    setDragOverKanbanColumnId(null)

    if (!response.success) {
      setKanbanMessage(response.error?.message ?? 'Não foi possível mover a história agora.')
      return
    }

    if (response.data?.estimation_status !== 'ready_for_estimation') {
      setSelectedProjectStoryIds((current) => current.filter((storyId) => storyId !== story.id))
    }
    setKanbanMessage('História movida e status atualizado.')
    await Promise.all([
      loadProjectKanban(),
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectPlanningSummaries(),
    ])
  }

  function handleKanbanDragStart(event, story) {
    if (!canMoveKanbanCards) return

    setDraggedKanbanStoryId(story.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', story.id)
  }

  function handleKanbanDragOver(event, columnId) {
    if (!canMoveKanbanCards || !draggedKanbanStoryId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverKanbanColumnId(columnId)
  }

  function handleKanbanDragLeave(columnId) {
    setDragOverKanbanColumnId((current) => (current === columnId ? null : current))
  }

  function handleKanbanDrop(event, columnId) {
    event.preventDefault()

    const storyId = event.dataTransfer.getData('text/plain') || draggedKanbanStoryId
    const story = kanbanStories.find((item) => item.id === storyId)
    handleMoveKanbanStory(story, columnId)
  }

  function handleToggleProjectStorySelection(storyId) {
    setStoryStatusMessage('')
    if (
      !selectedProjectStoryIds.includes(storyId) &&
      planningStorySessionById[storyId]?.isLive
    ) {
      setStoryStatusMessage('Esta história já está em uma Roda ativa. Continue a sessão existente ou escolha uma história livre.')
      return
    }

    setSelectedProjectStoryIds((current) =>
      current.includes(storyId)
        ? current.filter((currentStoryId) => currentStoryId !== storyId)
        : [...current, storyId],
    )
  }

  function handleSelectVisibleReadyStories() {
    setStoryStatusMessage('')
    const availableStoryIds = visibleAvailableReadyStories.map((story) => story.id)
    setSelectedProjectStoryIds(availableStoryIds)
    setStoryStatusMessage(
      availableStoryIds.length === 0
        ? 'Nenhuma história livre visível para selecionar.'
        : 'Histórias livres visíveis selecionadas para a Roda.',
    )
  }

  function handleToggleInsightCandidateFilter() {
    setStoryStatusMessage('')
    setIsInsightCandidateFilterActive((current) => !current)
  }

  function handleSelectReadyInsightCandidates() {
    setStoryStatusMessage('')
    setSelectedProjectStoryIds((current) =>
      Array.from(new Set([...current, ...readyInsightCandidateStoryIds])),
    )
  }

  function handleClearProjectStorySelection() {
    setStoryStatusMessage('')
    setSelectedProjectStoryIds([])
  }

  function handleSelectReadyStoriesInColumn(column) {
    const readyStoryIds = (column?.cards ?? [])
      .filter((story) => isReadyStoryAvailableForPlanning(story, planningStorySessionById))
      .map((story) => story.id)

    setStoryStatusMessage('')
    if (readyStoryIds.length === 0) {
      setStoryStatusMessage('Esta coluna não possui histórias prontas livres para selecionar.')
      return
    }
    setSelectedProjectStoryIds((current) => Array.from(new Set([...current, ...readyStoryIds])))
  }

  async function handleGenerateProjectInsights() {
    if (!project || !userId) return

    setProjectInsightsMessage('')
    setIsGeneratingProjectInsights(true)

    const storiesResponse = await listStoryHistoryGroups({
      userId,
      projectFilter: 'project',
      projectId,
      page: 1,
      pageSize: 30,
    })

    if (!storiesResponse.success) {
      setIsGeneratingProjectInsights(false)
      setProjectInsightsMessage('Não foi possível carregar as histórias do projeto para análise.')
      return
    }

    const storiesForAnalysis = storiesResponse.data ?? []
    if (storiesForAnalysis.length === 0) {
      setIsGeneratingProjectInsights(false)
      setProjectInsightsMessage('Forje ou vincule ao menos uma história antes de gerar o diagnóstico.')
      return
    }

    try {
      const analyzedStoryCount = storiesResponse.totalCount ?? storiesForAnalysis.length
      const analysis = await analyzeProject({
        project,
        stories: storiesForAnalysis,
        storyCount: analyzedStoryCount,
        memberCount: projectMembers.length,
      })
      setProjectInsights(analysis)
      setProjectInsightsCopyFeedback('')

      const saveResponse = await saveProjectAnalysis({
        projectId,
        userId,
        analysis,
        storyCount: analyzedStoryCount,
      })

      if (saveResponse.success && saveResponse.data) {
        setProjectInsightHistory((current) => [
          saveResponse.data,
          ...current.filter((item) => item.id !== saveResponse.data.id),
        ].slice(0, 3))
        setActiveProjectInsightId(saveResponse.data.id)
        setIsProjectInsightHistoryUnavailable(false)
        setProjectInsightsMessage('Diagnóstico gerado e salvo no histórico do projeto.')
      } else if (saveResponse.unavailable) {
        setActiveProjectInsightId(null)
        setIsProjectInsightHistoryUnavailable(true)
        setProjectInsightsMessage('Diagnóstico gerado. O histórico será ativado após aplicar o SQL desta etapa.')
      } else {
        setActiveProjectInsightId(null)
        setProjectInsightsMessage('Diagnóstico gerado. Não foi possível salvar no histórico agora.')
      }
    } catch (error) {
      setProjectInsightsMessage(
        error?.message ?? 'Não foi possível gerar o diagnóstico do projeto agora.',
      )
    } finally {
      setIsGeneratingProjectInsights(false)
    }
  }

  function handleOpenProjectInsightHistoryItem(item) {
    if (!item?.analysis) return

    setProjectInsights(item.analysis)
    setActiveProjectInsightId(item.id)
    setProjectInsightsCopyFeedback('')
    setProjectInsightsMessage('Diagnóstico reaberto do histórico do projeto.')
  }

  async function handleDeleteProjectInsightHistoryItem(item) {
    if (!item?.id) return

    const confirmed = window.confirm(
      `Excluir o diagnóstico de ${formatProjectDateTime(item.created_at)}?`,
    )
    if (!confirmed) return

    setProjectInsightsMessage('')
    setDeletingProjectInsightId(item.id)
    const response = await deleteProjectAnalysis({
      projectId,
      diagnosticId: item.id,
      userId,
    })
    setDeletingProjectInsightId(null)

    if (!response.success) {
      setProjectInsightsMessage(response.error?.message ?? 'Não foi possível excluir o diagnóstico agora.')
      return
    }

    const remaining = projectInsightHistory.filter((historyItem) => historyItem.id !== item.id)
    setProjectInsightHistory(remaining)
    if (activeProjectInsightId === item.id) {
      const nextCurrent = remaining[0] ?? null
      setProjectInsights(nextCurrent?.analysis ?? null)
      setActiveProjectInsightId(nextCurrent?.id ?? null)
    }
    setProjectInsightsMessage('Diagnóstico excluído do histórico.')
  }

  async function handleCopyProjectInsights() {
    if (!projectInsights) return

    setProjectInsightsCopyFeedback('')

    try {
      await copyTextToClipboard(
        buildProjectAnalysisMarkdown({
          project,
          analysis: projectInsights,
          freshness: currentProjectInsightFreshness,
          storyCount: projectStoryCount,
          memberCount: projectMembers.length,
        }),
      )
      setProjectInsightsCopyFeedback('Diagnóstico copiado em Markdown.')
      window.setTimeout(() => setProjectInsightsCopyFeedback(''), 2600)
    } catch {
      setProjectInsightsCopyFeedback('Não foi possível copiar o diagnóstico agora.')
    }
  }

  async function handleCopyProjectActionPlan() {
    if (!projectInsights) return

    setProjectInsightsCopyFeedback('')

    try {
      await copyTextToClipboard(
        buildProjectActionPlanMarkdown({
          project,
          analysis: projectInsights,
          candidateStories: projectInsightCandidateCards,
          freshness: currentProjectInsightFreshness,
          storyCount: projectStoryCount,
        }),
      )
      setProjectInsightsCopyFeedback('Plano de ação copiado em Markdown.')
      window.setTimeout(() => setProjectInsightsCopyFeedback(''), 2600)
    } catch {
      setProjectInsightsCopyFeedback('Não foi possível copiar o plano de ação agora.')
    }
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
      setMemberMessage(response.error?.message ?? 'Não foi possível adicionar este membro.')
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
      setMemberMessage('Apenas responsáveis e administradores podem alterar papéis do projeto.')
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
      setMemberMessage(response.error?.message ?? 'Não foi possível alterar este membro.')
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
            Contexto de organização para histórias, membros e futuras funções de IA. Times e Roda da Fogueira ficam em
            áreas próprias para manter esta página mais limpa.
          </p>
        </div>
        <div className="project-detail-page__actions">
          <Link className="btn btn-secondary btn-small" to="/projetos">
            Voltar
          </Link>
          <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
            Histórico
          </Link>
          {canManageProjectMembers ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditingProject((current) => !current)}
              disabled={isSavingProject}
            >
              {isEditingProject ? 'Fechar edição' : 'Editar'}
            </button>
          ) : null}
          <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
            Bancada
          </Link>
        </div>
      </section>

      <section className="project-detail-page__access" aria-label="Seu acesso no projeto">
        <div className="project-detail-page__access-main">
          <span>Seu acesso</span>
          <strong>{currentAccessDetails.title}</strong>
          <p>{currentAccessDetails.description}</p>
          <small>{currentAccessDetails.nextAction}</small>
        </div>
        <div className="project-detail-page__access-role" aria-label={`Papel atual: ${currentProjectRoleLabel}`}>
          <span>Papel atual</span>
          <strong>{currentProjectRoleLabel}</strong>
        </div>
        <ul className="project-detail-page__access-list" aria-label="Permissões disponíveis">
          {projectAccessCapabilities.map((capability) => (
            <li key={capability.label} className={capability.enabled ? 'is-enabled' : 'is-disabled'}>
              <strong>{capability.label}</strong>
              <span>{capability.detail}</span>
            </li>
          ))}
        </ul>
        <div className="project-detail-page__access-actions">
          {canMoveKanbanCards ? (
            <a className="btn btn-secondary btn-small" href="#historias-projeto">
              Organizar Kanban
            </a>
          ) : null}
          {canManageProjectMembers ? (
            <a className="btn btn-secondary btn-small" href="#membros-projeto">
              Gerenciar membros
            </a>
          ) : (
            <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
              Consultar histórico
            </Link>
          )}
        </div>
      </section>

      <section className="project-detail-page__metrics" aria-label="Métricas operacionais do projeto">
        <div className="project-detail-page__metrics-header">
          <div>
            <p className="projects-page__eyebrow">Métricas do projeto</p>
            <h2>Pulso operacional</h2>
            <p>Indicadores rápidos para decidir se o próximo passo é organizar, refinar ou estimar.</p>
          </div>
        </div>
        <div className="project-detail-page__metrics-grid">
          {projectMetricsCards.map((metric) => (
            <article
              key={metric.label}
              className={`project-detail-page__metric-card project-detail-page__metric-card--${metric.tone}`}
            >
              <div className="project-detail-page__metric-copy">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </div>
              <div
                className="project-detail-page__metric-progress"
                aria-label={`${metric.label}: ${metric.progress}%`}
              >
                <span style={{ width: `${metric.progress}%` }} />
              </div>
              {metric.action?.to ? (
                <Link className="btn btn-secondary btn-small" to={metric.action.to}>
                  {metric.action.label}
                </Link>
              ) : metric.action?.href ? (
                <a className="btn btn-secondary btn-small" href={metric.action.href}>
                  {metric.action.label}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel project-detail-page__guided-flow" aria-label="Trilha guiada do projeto">
        <div className="project-detail-page__guided-flow-header">
          <div className="project-detail-page__guided-flow-copy">
            <p className="projects-page__eyebrow">Trilha guiada</p>
            <h2>Do briefing à estimativa</h2>
            <p>
              Siga uma sequência simples para sair da primeira história até uma decisão de estimativa rastreável.
            </p>
          </div>
          {projectGuidedNextStep ? (
            <article
              className={`project-detail-page__guided-next project-detail-page__guided-next--${projectGuidedNextStep.status}`}
            >
              <span>Próximo passo</span>
              <strong>{projectGuidedNextStep.title}</strong>
              <p>{projectGuidedNextStep.description}</p>
              {projectGuidedNextStep.action?.to ? (
                <Link className="btn btn-primary btn-small" to={projectGuidedNextStep.action.to}>
                  {projectGuidedNextStep.action.label}
                </Link>
              ) : projectGuidedNextStep.action?.href ? (
                <a className="btn btn-primary btn-small" href={projectGuidedNextStep.action.href}>
                  {projectGuidedNextStep.action.label}
                </a>
              ) : null}
            </article>
          ) : null}
        </div>

        <ol className="project-detail-page__guided-steps">
          {projectGuidedSteps.map((step, index) => (
            <li key={step.id} className={`project-detail-page__guided-step is-${step.status}`}>
              <span className="project-detail-page__guided-step-number">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
              <small>{PROJECT_GUIDED_STATUS_LABELS[step.status]}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="project-detail-page__executive-strip" aria-label="Visão executiva do projeto">
        <article className={isProjectInsightOutdated ? 'project-detail-page__executive-card--attention' : ''}>
          <span>Diagnóstico</span>
          <strong>{projectInsightExecutiveLabel}</strong>
          <p>{projectInsightExecutiveText}</p>
          {currentProjectInsightFreshness ? (
            <small
              className={`project-detail-page__executive-status project-detail-page__executive-status--${currentProjectInsightFreshness.tone}`}
            >
              {currentProjectInsightFreshness.label}
            </small>
          ) : null}
          <a className="btn btn-secondary btn-small" href="#diagnostico-projeto">
            {projectInsightExecutiveActionLabel}
          </a>
        </article>

        <article>
          <span>Prontidão</span>
          <strong>{projectReadinessLabel}</strong>
          <p>{projectReadinessText}</p>
          {readyStoryCount > 0 ? (
            <Link className="btn btn-primary btn-small" to={`/roda?projectId=${projectId}`}>
              Abrir Roda
            </Link>
          ) : projectStoryCount === 0 ? (
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              Forjar história
            </Link>
          ) : (
            <a className="btn btn-secondary btn-small" href="#historias-projeto">
              Preparar histórias
            </a>
          )}
        </article>

        <article>
          <span>Próxima ação</span>
          <strong>Encaminhamento</strong>
          <p>{latestProjectNextAction}</p>
          <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
            Ver peças
          </Link>
        </article>
      </section>

      <section className="panel project-detail-page__cockpit" aria-label="Cockpit operacional do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Cockpit operacional</p>
            <h2>Próximos movimentos</h2>
            <p>Use estes atalhos para criar, organizar, diagnosticar e estimar sem perder o contexto do projeto.</p>
          </div>
        </div>

        <div className="project-detail-page__cockpit-grid">
          {projectCockpitCards.map((card) => {
            const className = `project-detail-page__cockpit-card project-detail-page__cockpit-card--${card.tone}`
            const content = (
              <>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
                <small>{card.cta}</small>
              </>
            )

            return card.to ? (
              <Link key={card.label} className={className} to={card.to}>
                {content}
              </Link>
            ) : (
              <a key={card.label} className={className} href={card.href}>
                {content}
              </a>
            )
          })}
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

      <section
        id="diagnostico-projeto"
        className="panel project-detail-page__ai"
        aria-label="Diagnóstico com IA do projeto"
      >
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">IA do projeto</p>
            <h2>Diagnóstico do projeto</h2>
            <p>
              Gere uma leitura executiva das histórias vinculadas para encontrar riscos, perguntas de refinamento
              e próximos passos antes da estimativa.
            </p>
          </div>
          <div className="project-detail-page__ai-actions">
            {projectInsights ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyProjectInsights}
              >
                {projectInsightsCopyFeedback === 'Diagnóstico copiado em Markdown.'
                  ? 'Diagnóstico copiado'
                  : 'Copiar diagnóstico'}
              </button>
            ) : null}
            {projectInsights ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyProjectActionPlan}
              >
                {projectInsightsCopyFeedback === 'Plano de ação copiado em Markdown.'
                  ? 'Plano copiado'
                  : 'Copiar plano de ação'}
              </button>
            ) : null}
            {projectInsights ? (
              <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${projectId}`}>
                Levar para Roda
              </Link>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleGenerateProjectInsights}
              disabled={!canGenerateProjectInsights}
            >
              {isGeneratingProjectInsights
                ? 'Analisando...'
                : projectInsights
                  ? 'Atualizar diagnóstico'
                  : 'Gerar diagnóstico'}
            </button>
          </div>
        </div>

        {projectInsightsMessage ? (
          <p className="projects-page__message" role="status">
            {projectInsightsMessage}
          </p>
        ) : null}
        {projectInsightsCopyFeedback ? (
          <p className="projects-page__message" role="status">
            {projectInsightsCopyFeedback}
          </p>
        ) : null}

        <div className="project-detail-page__ai-command" aria-label="Comando da IA do projeto">
          <div className="project-detail-page__ai-command-header">
            <div>
              <p className="projects-page__eyebrow">Comando de IA</p>
              <h3>Decisão guiada por contexto</h3>
              <p>
                Acompanhe a base atual, a validade do diagnóstico, as candidatas da IA e o próximo encaminhamento do
                projeto.
              </p>
            </div>
          </div>

          <div className="project-detail-page__ai-command-grid">
            {projectAiCommandCards.map((card) => {
              const cardClassName = `project-detail-page__ai-command-card project-detail-page__ai-command-card--${card.tone}`
              const action = card.action

              return (
                <article key={card.label} className={cardClassName}>
                  <span>{card.label}</span>
                  <strong>{card.title}</strong>
                  <p>{card.description}</p>
                  {action?.to ? (
                    <Link className="btn btn-secondary btn-small" to={action.to}>
                      {action.label}
                    </Link>
                  ) : action?.href ? (
                    <a className="btn btn-secondary btn-small" href={action.href}>
                      {action.label}
                    </a>
                  ) : action?.onClick ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={action.onClick}
                      disabled={Boolean(action.disabled)}
                    >
                      {action.label}
                    </button>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>

        <div className="project-detail-page__ai-snapshot" aria-label="Leitura operacional do projeto">
          <div className="project-detail-page__ai-snapshot-header">
            <div>
              <p className="projects-page__eyebrow">Leitura operacional</p>
              <h3>{projectInsights ? 'Base atual comparada ao diagnóstico' : 'Resumo antes da IA'}</h3>
              <p>
                Indicadores calculados com os dados atuais do projeto para orientar a próxima ação sem consumir
                análise com IA.
              </p>
            </div>
          </div>
          <div className="project-detail-page__ai-snapshot-grid">
            {projectOperationalSnapshotCards.map((card) => (
              <article
                key={card.label}
                className={`project-detail-page__ai-snapshot-card project-detail-page__ai-snapshot-card--${card.tone}`}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.description}</p>
                {card.action?.to ? (
                  <Link className="btn btn-secondary btn-small" to={card.action.to}>
                    {card.action.label}
                  </Link>
                ) : card.action?.href ? (
                  <a className="btn btn-secondary btn-small" href={card.action.href}>
                    {card.action.label}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        {!projectInsights ? (
          <div className="project-detail-page__ai-empty">
            <strong>Leitura sob demanda</strong>
            <p>
              O diagnóstico usa as histórias atuais do projeto, fica no histórico recente quando disponível e deve
              ser revisado pelo PM/PO antes de orientar o time.
            </p>
            {projectStoryCount === 0 ? (
              <p>Este projeto ainda precisa de histórias vinculadas para liberar a análise.</p>
            ) : null}
          </div>
        ) : (
          <div className="project-detail-page__ai-result">
            <div className="project-detail-page__ai-summary">
              <span>{projectInsights.health_label}</span>
              <p>{projectInsights.summary}</p>
              <small>
                {projectInsights.meta.analyzed_stories}{' '}
                {projectInsights.meta.analyzed_stories === 1 ? 'história analisada' : 'histórias analisadas'}
              </small>
              {currentProjectInsightFreshness ? (
                <small
                  className={`project-detail-page__ai-freshness project-detail-page__ai-freshness--${currentProjectInsightFreshness.tone}`}
                >
                  {currentProjectInsightFreshness.label} · {currentProjectInsightFreshness.description}
                </small>
              ) : null}
            </div>

            {isProjectInsightOutdated ? (
              <div className="project-detail-page__ai-refresh-callout" role="status">
                <div>
                  <strong>Diagnóstico desatualizado</strong>
                  <p>
                    {currentProjectInsightFreshness.description} Atualize a leitura antes de usar este diagnóstico
                    para priorizar refinamento, Roda ou próximas ações.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={handleGenerateProjectInsights}
                  disabled={!canGenerateProjectInsights}
                >
                  {isGeneratingProjectInsights ? 'Atualizando...' : 'Atualizar agora'}
                </button>
              </div>
            ) : null}

            <div className="project-detail-page__ai-grid">
              <ProjectInsightList
                title="Riscos"
                items={projectInsights.risks}
                emptyText="Nenhum risco relevante foi destacado pela IA."
                defaultOpen
              />
              <ProjectInsightList
                title="Perguntas de refinamento"
                items={projectInsights.refinement_questions}
                emptyText="Nenhuma pergunta adicional foi sugerida."
                defaultOpen
              />
              <ProjectInsightList
                title="Próximos passos"
                items={projectInsights.next_actions}
                emptyText="Nenhum próximo passo foi sugerido."
              />
              <ProjectInsightList
                title="Candidatas à estimativa"
                items={projectInsights.estimation_candidates}
                emptyText="Nenhuma candidata específica foi destacada."
              />
            </div>

            <div className="project-detail-page__ai-action-plan" aria-label="Plano de ação do diagnóstico">
              <div className="project-detail-page__ai-action-plan-header">
                <div>
                  <p className="projects-page__eyebrow">Plano de ação</p>
                  <h3>Próximos movimentos</h3>
                  <p>Roteiro curto para transformar o diagnóstico em preparação, alinhamento e estimativa.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleCopyProjectActionPlan}
                >
                  {projectInsightsCopyFeedback === 'Plano de ação copiado em Markdown.'
                    ? 'Plano copiado'
                    : 'Copiar plano'}
                </button>
              </div>

              <ol className="project-detail-page__ai-action-list">
                {projectActionPlanItems.map((item, index) => (
                  <li key={`${item}-${index}`}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </li>
                ))}
              </ol>

              <div className="project-detail-page__ai-action-stats">
                {projectActionPlanStats.map((item) => (
                  <span key={item.label}>
                    <strong>{item.value}</strong>
                    {item.label}
                    <small>{item.detail}</small>
                  </span>
                ))}
              </div>
            </div>

            {projectInsightCandidateCards.length > 0 ? (
              <div className="project-detail-page__ai-candidates">
                <div className="project-detail-page__ai-candidates-header">
                  <div>
                    <strong>Candidatas acionáveis</strong>
                    <p>
                      Sugestões da IA conectadas às histórias do projeto para acelerar preparação e estimativa.
                    </p>
                  </div>
                  <div className="project-detail-page__ai-candidates-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleToggleInsightCandidateFilter}
                    >
                      {shouldFocusInsightCandidates ? 'Limpar foco no quadro' : 'Focar no quadro'}
                    </button>
                    {readyInsightCandidateStoryIds.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectReadyInsightCandidates}
                      >
                        Selecionar prontas da IA
                      </button>
                    ) : null}
                    {actionableInsightCandidateStories.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handlePrepareInsightCandidates}
                        disabled={isPreparingInsightCandidates}
                      >
                        {isPreparingInsightCandidates ? 'Preparando...' : 'Preparar candidatas'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="project-detail-page__ai-candidate-list">
                  {projectInsightCandidateCards.map((item) => {
                    const story = item.story
                    const planningEntry = story ? planningStorySessionById[story.id] : null
                    const planningSession = planningEntry?.session
                    const finalEstimate = planningEntry?.story?.final_estimate ?? planningEntry?.finalEstimate
                    const isReadyForPlanning = story?.estimation_status === 'ready_for_estimation'
                    const isEstimated = story?.estimation_status === 'estimated'
                    const isInLivePlanningSession = Boolean(planningEntry?.isLive)
                    const planningRoomUrl = planningSession
                      ? `/projetos/${projectId}/roda/${planningSession.id}`
                      : `/roda?projectId=${projectId}${story ? `&storyId=${story.id}` : ''}`
                    const canPrepareCandidate =
                      story &&
                      !isReadyForPlanning &&
                      !isEstimated &&
                      (canMoveKanbanCards || canManageProjectMembers || story.user_id === userId)

                    return (
                      <article
                        key={`${item.candidate}-${story?.id ?? 'sem-vinculo'}`}
                        className="project-detail-page__ai-candidate"
                      >
                        <div>
                          <span>Sugestão da IA</span>
                          <strong>{item.candidate}</strong>
                          {story ? (
                            <p>
                              Vinculada a <b>{story.title ?? 'história sem título'}</b>
                            </p>
                          ) : (
                            <p>Não foi possível vincular automaticamente a uma história do projeto.</p>
                          )}
                        </div>

                        <div className="project-detail-page__ai-candidate-meta">
                          {story ? <span>{getEstimationStatusLabel(story.estimation_status)}</span> : null}
                          {isInLivePlanningSession ? (
                            <span>Em Roda ativa</span>
                          ) : finalEstimate ? (
                            <span>Final: {finalEstimate}</span>
                          ) : planningSession ? (
                            <span>{getPlanningSessionStatusLabel(planningSession.status)}</span>
                          ) : null}
                        </div>

                        {story ? (
                          <div className="project-detail-page__ai-candidate-actions">
                            <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                              Abrir
                            </Link>
                            {canPrepareCandidate ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => handlePrepareStoryForPlanning(story)}
                                disabled={updatingStoryStatusId === story.id}
                              >
                                {updatingStoryStatusId === story.id ? 'Preparando...' : 'Preparar'}
                              </button>
                            ) : null}
                            {isReadyForPlanning || isInLivePlanningSession || isEstimated ? (
                              <Link
                                className={`btn btn-small ${
                                  isReadyForPlanning || isInLivePlanningSession ? 'btn-primary' : 'btn-secondary'
                                }`}
                                to={planningRoomUrl}
                              >
                                {isInLivePlanningSession
                                  ? 'Continuar Roda'
                                  : isEstimated
                                    ? 'Ver estimativa'
                                    : 'Abrir Roda'}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="project-detail-page__ai-next-step">
              <div>
                <strong>Próxima ação</strong>
                <p>
                  Use o diagnóstico para preparar as histórias, alinhar dúvidas com o time e abrir a Roda da Fogueira
                  quando houver candidatas prontas para estimar.
                </p>
              </div>
              <Link className="btn btn-primary btn-small" to={`/roda?projectId=${projectId}`}>
                Abrir Roda da Fogueira
              </Link>
            </div>
          </div>
        )}

        <div className="project-detail-page__ai-history">
          <div>
            <strong>Histórico recente</strong>
            <p>
              Reabra os últimos diagnósticos gerados para comparar a evolução do projeto sem executar a IA novamente.
            </p>
          </div>

          {isLoadingProjectInsightHistory ? (
            <p className="projects-page__state">Carregando diagnósticos...</p>
          ) : null}

          {isProjectInsightHistoryUnavailable ? (
            <p className="projects-page__state">
              O histórico ficará disponível após aplicar o SQL <code>supabase/project-ai-diagnostics.sql</code>.
            </p>
          ) : null}

          {!isLoadingProjectInsightHistory &&
          !isProjectInsightHistoryUnavailable &&
          projectInsightHistory.length === 0 ? (
            <p className="projects-page__state">
              Nenhum diagnóstico salvo ainda. Gere o primeiro para criar uma referência do projeto.
            </p>
          ) : null}

          {projectInsightHistory.length > 0 ? (
            <div className="project-detail-page__ai-history-list">
              {projectInsightHistory.map((item) => {
                const freshness = getProjectInsightFreshness(item, projectStoryCount)

                return (
                  <article key={item.id} className="project-detail-page__ai-history-item">
                    <div>
                      <span>
                        {formatProjectDateTime(item.created_at)}
                        {activeProjectInsightId === item.id ? ' · Aberto agora' : ''}
                      </span>
                      <strong>{item.analysis.health_label}</strong>
                      <p>{item.analysis.summary}</p>
                      <div className="project-detail-page__ai-history-meta">
                        <span
                          className={`project-detail-page__ai-freshness project-detail-page__ai-freshness--${freshness.tone}`}
                        >
                          {freshness.label}
                        </span>
                        <small>{freshness.description}</small>
                      </div>
                    </div>
                    <div className="project-detail-page__ai-history-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => handleOpenProjectInsightHistoryItem(item)}
                      >
                        Reabrir
                      </button>
                      {freshness.isOutdated ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={handleGenerateProjectInsights}
                          disabled={!canGenerateProjectInsights}
                        >
                          Atualizar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => handleDeleteProjectInsightHistoryItem(item)}
                        disabled={deletingProjectInsightId === item.id}
                      >
                        {deletingProjectInsightId === item.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel project-detail-page__collaboration" aria-label="Colaboração e estimativas">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Colaboração</p>
            <h2>Times e Roda da Fogueira</h2>
            <p>Gerencie times e estimativas nas áreas dedicadas, mantendo o projeto focado em contexto e histórias.</p>
          </div>
        </div>

        <div className="project-detail-page__collaboration-actions">
          <Link className="btn btn-secondary" to={`/times?projectId=${projectId}`}>
            Gerenciar Times
          </Link>
          <Link className="btn btn-secondary" to={`/roda?projectId=${projectId}`}>
            Abrir Rodas da Fogueira
          </Link>
        </div>
      </section>

      <section
        id="historias-projeto"
        className="panel project-detail-page__stories"
        aria-label="Histórias vinculadas ao projeto"
      >
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Histórias do projeto</p>
            <h2>{storiesLabel}</h2>
            <p>Quadro visual para organizar histórias por fluxo, status de estimativa e preparo para a Roda.</p>
            {hasProjectStories ? (
              <p className="project-detail-page__story-filter-summary">
                {isStorySearchActive
                  ? `${storySearchResultLabel} para "${storySearchDisplay}".`
                  : storyViewMode === 'board'
                  ? shouldFocusInsightCandidates
                    ? `${visibleKanbanStoryCount} ${
                        visibleKanbanStoryCount === 1 ? 'card em foco' : 'cards em foco'
                      } pelo diagnóstico.`
                    : `${visibleKanbanStoryCount} ${
                        visibleKanbanStoryCount === 1 ? 'card visível' : 'cards visíveis'
                      } no quadro.`
                  : shouldFocusInsightCandidates
                    ? `${visibleProjectStoryCount} ${
                        visibleProjectStoryCount === 1 ? 'história em foco' : 'histórias em foco'
                      } pelo diagnóstico.`
                    : storyEstimationFilter === 'all'
                    ? filteredStoriesLabel
                    : `${filteredStoriesLabel} em ${currentStoryFilterLabel}.`}
              </p>
            ) : null}
          </div>
          <div className="project-detail-page__story-actions">
            <label className="project-detail-page__story-search">
              <span>Buscar no projeto</span>
              <input
                type="search"
                value={storySearchInput}
                onChange={(event) => setStorySearchInput(event.target.value)}
                placeholder="Título, contexto ou user story"
                disabled={isLoadingStories}
              />
            </label>
            <div className="project-detail-page__story-view-toggle" aria-label="Modo de visualização">
              <button
                type="button"
                className={storyViewMode === 'board' ? 'is-active' : ''}
                onClick={() => setStoryViewMode('board')}
              >
                Quadro
              </button>
              <button
                type="button"
                className={storyViewMode === 'list' ? 'is-active' : ''}
                onClick={() => setStoryViewMode('list')}
              >
                Lista
              </button>
            </div>
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

        <div className={`project-detail-page__story-guidance project-detail-page__story-guidance--${storyOperationalGuidance.tone}`}>
          <div>
            <span>Encaminhamento do quadro</span>
            <strong>{storyOperationalGuidance.title}</strong>
            <p>{storyOperationalGuidance.description}</p>
          </div>
          {storyOperationalGuidance.to ? (
            <Link className="btn btn-primary btn-small" to={storyOperationalGuidance.to}>
              {storyOperationalGuidance.cta}
            </Link>
          ) : (
            <a className="btn btn-secondary btn-small" href={storyOperationalGuidance.href}>
              {storyOperationalGuidance.cta}
            </a>
          )}
        </div>

        {hasProjectStories ? (
          <div className="project-detail-page__story-quick-filters" aria-label="Filtros rápidos de histórias">
            {STORY_STATUS_QUICK_FILTERS.map((option) => {
              const isActive = storyEstimationFilter === option.value
              const count = getStoryStatusQuickFilterCount(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`project-detail-page__story-quick-filter${isActive ? ' is-active' : ''}`}
                  onClick={() => setStoryEstimationFilter(option.value)}
                  aria-pressed={isActive}
                  disabled={isLoadingStories}
                >
                  <span>{option.label}</span>
                  <strong>{count}</strong>
                  <small>{option.hint}</small>
                </button>
              )
            })}
          </div>
        ) : null}

        {hasProjectStories && projectInsightCandidateStoryIds.length > 0 ? (
          <div
            className={`project-detail-page__story-ai-focus${
              shouldFocusInsightCandidates ? ' is-active' : ''
            }`}
          >
            <div>
              <strong>{insightCandidateFilterLabel}</strong>
              <p>
                Use o foco da IA para revisar apenas as histórias sugeridas no diagnóstico antes de preparar a Roda.
              </p>
            </div>
            <div className="project-detail-page__story-ai-focus-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleToggleInsightCandidateFilter}
              >
                {shouldFocusInsightCandidates ? 'Mostrar todas' : 'Focar candidatas'}
              </button>
              {readyInsightCandidateStoryIds.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleSelectReadyInsightCandidates}
                >
                  Selecionar prontas da IA
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {hasProjectStories && storyViewMode === 'board' && canEditKanbanColumns ? (
          <form className="project-detail-page__kanban-column-form" onSubmit={handleCreateKanbanColumn}>
            <label className="projects-page__field">
              <span>Nova coluna</span>
              <input
                type="text"
                value={newKanbanColumnName}
                onChange={(event) => setNewKanbanColumnName(event.target.value)}
                placeholder="Ex.: Em discovery"
                disabled={isCreatingKanbanColumn}
              />
            </label>
            <label className="projects-page__field">
              <span>Status base</span>
              <select
                value={newKanbanColumnStatusBase}
                onChange={(event) => setNewKanbanColumnStatusBase(event.target.value)}
                disabled={isCreatingKanbanColumn}
              >
                {KANBAN_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary btn-small"
              disabled={isCreatingKanbanColumn || !newKanbanColumnName.trim()}
            >
              {isCreatingKanbanColumn ? 'Criando...' : 'Criar coluna'}
            </button>
          </form>
        ) : null}

        {hasProjectStories ? (
          <div className="project-detail-page__story-batch-bar">
            <div>
              <strong>{selectedReadyStoriesLabel}</strong>
              <p>{selectedReadyStoriesHint}</p>
            </div>
            <div className="project-detail-page__story-batch-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleSelectVisibleReadyStories}
                disabled={visibleAvailableReadyStories.length === 0 || isLoadingStories}
              >
                Selecionar livres visíveis
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleClearProjectStorySelection}
                disabled={selectedReadyStoryIds.length === 0 || isLoadingStories}
              >
                Limpar seleção
              </button>
              {canOpenSelectedReadyStories ? (
                <Link className="btn btn-primary btn-small" to={selectedReadyStoriesRodaUrl}>
                  Abrir Roda com selecionadas
                </Link>
              ) : (
                <button type="button" className="btn btn-primary btn-small" disabled>
                  Abrir Roda com selecionadas
                </button>
              )}
            </div>
          </div>
        ) : null}

        {hasProjectStories && storyViewMode === 'board' ? (
          <div className="project-detail-page__kanban-overview" aria-label="Resumo do quadro Kanban">
            {kanbanBoardSummaryItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        ) : null}

        {hasProjectStories && storyViewMode === 'board' ? (
          <div className="project-detail-page__kanban-operation">
            <div>
              <span>Operação do quadro</span>
              <strong>{kanbanBoardOperationTitle}</strong>
              <p>{kanbanBoardOperationText}</p>
            </div>
            {visibleAvailableReadyCount > 0 ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleSelectVisibleReadyStories}
                disabled={isLoadingStories}
              >
                Selecionar histórias livres
              </button>
            ) : null}
          </div>
        ) : null}

        {isLoadingStories ? <p className="projects-page__state">Carregando histórias...</p> : null}
        {hasNoProjectStories ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história vinculada ainda</h3>
            <p>Abra a Bancada com este projeto selecionado ou organize uma peça avulsa quando fizer sentido.</p>
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              Forjar neste projeto
            </Link>
          </div>
        ) : null}
        {hasNoStoriesForFilter ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história neste filtro</h3>
            <p>Troque o status selecionado para ver outras peças vinculadas a este projeto.</p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setStoryEstimationFilter('all')}
            >
              Ver todas as histórias
            </button>
          </div>
        ) : null}
        {hasNoStoriesForInsightCandidateFilter ? (
          <div className="projects-page__empty">
            <h3>Nenhuma candidata visível neste recorte</h3>
            <p>Limpe o foco da IA ou troque o status para revisar as histórias sugeridas pelo diagnóstico.</p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setIsInsightCandidateFilterActive(false)
                setStoryEstimationFilter('all')
              }}
            >
              Limpar foco da IA
            </button>
          </div>
        ) : null}
        {hasNoStoriesForLocalSearch ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história encontrada na busca</h3>
            <p>
              A busca atual não encontrou histórias visíveis neste recorte. Limpe o termo ou troque o status para
              ampliar a lista.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setStorySearchInput('')}
            >
              Limpar busca
            </button>
          </div>
        ) : null}
        {storyStatusMessage ? <p className="projects-page__message">{storyStatusMessage}</p> : null}
        {kanbanMessage ? <p className="projects-page__message">{kanbanMessage}</p> : null}
        {planningSummaryMessage ? <p className="projects-page__message">{planningSummaryMessage}</p> : null}
        {shouldShowStoryLimitNotice ? (
          <p className="projects-page__state">Mostrando as 50 histórias mais recentes deste filtro.</p>
        ) : null}
        {shouldShowKanbanLimitNotice ? (
          <p className="projects-page__state">Mostrando as 200 histórias mais recentes no quadro.</p>
        ) : null}

        {storyViewMode === 'board' ? (
          <>
            {isLoadingKanban ? <p className="projects-page__state">Carregando quadro Kanban...</p> : null}
            {isKanbanUnavailable ? (
              <div className="projects-page__empty">
                <h3>Kanban aguardando SQL</h3>
                <p>
                  Aplique o arquivo <code>supabase/project-kanban.sql</code> para ativar colunas,
                  movimentação e permissões do quadro.
                </p>
              </div>
            ) : null}
            {!isLoadingKanban && !isKanbanUnavailable && hasProjectStories ? (
              <div className="project-detail-page__kanban" aria-label="Kanban de histórias do projeto">
                {visibleKanbanColumns.map((column, columnIndex) => {
                  const isEditingColumn = editingKanbanColumnId === column.id
                  const isDropTarget = dragOverKanbanColumnId === column.id
                  const columnCards = column.cards ?? []
                  const columnCount = columnCards.length
                  const availableReadyColumnStoryCount = countAvailableReadyStories(
                    columnCards,
                    planningStorySessionById,
                  )

                  return (
                    <section
                      key={column.id}
                      className={`project-detail-page__kanban-column project-detail-page__kanban-column--${
                        column.status_base
                      }${isDropTarget ? ' is-drop-target' : ''}`}
                      onDragOver={(event) => handleKanbanDragOver(event, column.id)}
                      onDragLeave={() => handleKanbanDragLeave(column.id)}
                      onDrop={(event) => handleKanbanDrop(event, column.id)}
                    >
                      <header className="project-detail-page__kanban-column-header">
                        <div>
                          <span>{getEstimationStatusLabel(column.status_base)}</span>
                          <h3>{column.name}</h3>
                          <div className="project-detail-page__kanban-column-stats">
                            <small>
                              {columnCount} {columnCount === 1 ? 'história' : 'histórias'}
                            </small>
                            {availableReadyColumnStoryCount > 0 ? (
                              <small>
                                {availableReadyColumnStoryCount}{' '}
                                {availableReadyColumnStoryCount === 1 ? 'livre para Roda' : 'livres para Roda'}
                              </small>
                            ) : null}
                          </div>
                          <small className="project-detail-page__kanban-column-hint">
                            {getKanbanColumnIntent(column.status_base)}
                          </small>
                        </div>
                        {canEditKanbanColumns || availableReadyColumnStoryCount > 0 ? (
                          <div className="project-detail-page__kanban-column-actions">
                            {availableReadyColumnStoryCount > 0 ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => handleSelectReadyStoriesInColumn(column)}
                                disabled={isLoadingStories}
                              >
                                Selecionar livres
                              </button>
                            ) : null}
                            {canEditKanbanColumns ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-small"
                                  onClick={() => handleReorderKanbanColumn(column, 'left')}
                                  disabled={columnIndex === 0 || reorderingKanbanColumnId === column.id}
                                  aria-label={`Mover coluna ${column.name} para a esquerda`}
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-small"
                                  onClick={() => handleReorderKanbanColumn(column, 'right')}
                                  disabled={
                                    columnIndex === visibleKanbanColumns.length - 1 ||
                                    reorderingKanbanColumnId === column.id
                                  }
                                  aria-label={`Mover coluna ${column.name} para a direita`}
                                >
                                  →
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-small"
                                  onClick={() => handleStartEditKanbanColumn(column)}
                                >
                                  Editar
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </header>

                      {isEditingColumn ? (
                        <form
                          className="project-detail-page__kanban-column-edit"
                          onSubmit={(event) => handleUpdateKanbanColumn(event, column)}
                        >
                          <label className="projects-page__field">
                            <span>Nome da coluna</span>
                            <input
                              type="text"
                              value={editingKanbanColumnName}
                              onChange={(event) => setEditingKanbanColumnName(event.target.value)}
                              disabled={savingKanbanColumnId === column.id}
                            />
                          </label>
                          <label className="projects-page__field">
                            <span>Status base</span>
                            <select
                              value={editingKanbanColumnStatusBase}
                              onChange={(event) => setEditingKanbanColumnStatusBase(event.target.value)}
                              disabled={savingKanbanColumnId === column.id}
                            >
                              {KANBAN_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="project-detail-page__kanban-edit-actions">
                            <button
                              type="submit"
                              className="btn btn-primary btn-small"
                              disabled={savingKanbanColumnId === column.id || !editingKanbanColumnName.trim()}
                            >
                              {savingKanbanColumnId === column.id ? 'Salvando...' : 'Salvar coluna'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-small"
                              onClick={handleCancelEditKanbanColumn}
                              disabled={savingKanbanColumnId === column.id}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : null}

                      <div className="project-detail-page__kanban-cards">
                        {columnCards.length === 0 ? (
                          <div className="project-detail-page__kanban-empty">
                            <p>{getKanbanColumnEmptyText(column.status_base)}</p>
                            {column.status_base === 'created' ? (
                              <Link className="btn btn-ghost btn-small" to={`/tool?projectId=${projectId}`}>
                                Forjar história
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                        {columnCards.map((story) => {
                          const isReadyForPlanning = story.estimation_status === 'ready_for_estimation'
                          const isSelectedForPlanning = selectedProjectStoryIds.includes(story.id)
                          const isMovingStory = movingKanbanStoryId === story.id
                          const canPrepareForPlanning =
                            canMoveKanbanCards &&
                            !isReadyForPlanning &&
                            story.estimation_status !== 'estimated'
                          const planningEntry = planningStorySessionById[story.id]
                          const planningSession = planningEntry?.session
                          const planningStory = planningEntry?.story
                          const isInLivePlanningSession = Boolean(planningEntry?.isLive)
                          const finalEstimate = planningStory?.final_estimate ?? planningEntry?.finalEstimate
                          const canDragKanbanStory = canMoveKanbanCards && !isInLivePlanningSession
                          const planningRoomUrl = planningSession
                            ? `/projetos/${projectId}/roda/${planningSession.id}`
                            : `/roda?projectId=${projectId}`

                          return (
                            <article
                              key={story.id}
                              className={`project-detail-page__kanban-card${
                                isSelectedForPlanning ? ' is-selected' : ''
                              }${isMovingStory ? ' is-moving' : ''}${
                                isInLivePlanningSession ? ' is-live-session' : ''
                              }`}
                              draggable={canDragKanbanStory}
                              onDragStart={(event) => handleKanbanDragStart(event, story)}
                              onDragEnd={() => {
                                setDraggedKanbanStoryId(null)
                                setDragOverKanbanColumnId(null)
                              }}
                            >
                              {isReadyForPlanning ? (
                                <label
                                  className={`project-detail-page__story-select${
                                    isInLivePlanningSession ? ' is-disabled' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForPlanning}
                                    onChange={() => handleToggleProjectStorySelection(story.id)}
                                    disabled={isInLivePlanningSession}
                                  />
                                  <span>{isInLivePlanningSession ? 'Já em Roda ativa' : 'Selecionar para Roda'}</span>
                                </label>
                              ) : null}

                              <div className="project-detail-page__kanban-card-copy">
                                <h4>{story.title}</h4>
                                <p>{getStoryPreview(story)}</p>
                              </div>

                              <div className="project-detail-page__kanban-card-meta">
                                <span>{formatProjectDateTime(story.created_at)}</span>
                                <span>{getStoryVersionLabel(story.version_number)}</span>
                                <span>{getEstimationStatusLabel(story.estimation_status)}</span>
                                {finalEstimate ? <span>Final: {finalEstimate}</span> : null}
                              </div>

                              {planningEntry ? (
                                <div
                                  className={`project-detail-page__kanban-card-planning${
                                    isInLivePlanningSession ? ' is-live' : ''
                                  }`}
                                >
                                  <strong>
                                    {isInLivePlanningSession
                                      ? 'Em Roda ativa'
                                      : finalEstimate
                                        ? 'Estimativa registrada'
                                        : 'Roda vinculada'}
                                  </strong>
                                  <span>
                                    {planningSession?.name ?? 'Roda da Fogueira'} ·{' '}
                                    {getPlanningSessionStatusLabel(planningSession?.status)}
                                  </span>
                                </div>
                              ) : null}

                              <div className="project-detail-page__kanban-card-actions">
                                {canDragKanbanStory ? (
                                  <details className="project-detail-page__kanban-card-tools">
                                    <summary>Mover cartão</summary>
                                    <label className="project-detail-page__kanban-move">
                                      <span>Mover para</span>
                                      <select
                                        value={story.kanban_column_id}
                                        onChange={(event) => handleMoveKanbanStory(story, event.target.value)}
                                        disabled={isMovingStory}
                                      >
                                        {kanbanColumns.map((targetColumn) => (
                                          <option key={targetColumn.id} value={targetColumn.id}>
                                            {targetColumn.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </details>
                                ) : null}
                                {canPrepareForPlanning ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-small"
                                    onClick={() => handlePrepareStoryForPlanning(story)}
                                    disabled={isMovingStory}
                                  >
                                    {isMovingStory ? 'Preparando...' : 'Preparar Roda'}
                                  </button>
                                ) : null}
                                <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                                  Abrir na Bancada
                                </Link>
                                {isInLivePlanningSession ? (
                                  <Link className="btn btn-primary btn-small" to={planningRoomUrl}>
                                    Continuar Roda
                                  </Link>
                                ) : isReadyForPlanning ? (
                                  <Link
                                    className="btn btn-primary btn-small"
                                    to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                                  >
                                    Abrir Roda
                                  </Link>
                                ) : null}
                                {story.estimation_status === 'estimated' ? (
                                  <Link className="btn btn-secondary btn-small" to={planningRoomUrl}>
                                    Ver estimativa
                                  </Link>
                                ) : null}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {storyViewMode === 'list' ? (
        <div className="project-detail-page__story-list">
          {visibleProjectStories.map((story) => {
            const canUpdateStoryStatus = canManageProjectMembers || story.user_id === userId
            const isUpdatingStoryStatus = updatingStoryStatusId === story.id
            const isReadyForPlanning = story.estimation_status === 'ready_for_estimation'
            const isSelectedForPlanning = selectedProjectStoryIds.includes(story.id)
            const planningEntry = planningStorySessionById[story.id]
            const planningSession = planningEntry?.session
            const planningStory = planningEntry?.story
            const isInLivePlanningSession = Boolean(planningEntry?.isLive)
            const finalEstimate = planningStory?.final_estimate ?? planningEntry?.finalEstimate
            const planningRoomUrl = planningSession
              ? `/projetos/${projectId}/roda/${planningSession.id}`
              : `/roda?projectId=${projectId}`

            return (
              <article
                key={story.id}
                className={`project-detail-page__story${isSelectedForPlanning ? ' is-selected' : ''}`}
              >
                <div>
                  {isReadyForPlanning ? (
                    <label
                      className={`project-detail-page__story-select${
                        isInLivePlanningSession ? ' is-disabled' : ''
                      }`}
                    >
                        <input
                          type="checkbox"
                          checked={isSelectedForPlanning}
                          onChange={() => handleToggleProjectStorySelection(story.id)}
                          disabled={isInLivePlanningSession}
                        />
                      <span>{isInLivePlanningSession ? 'Já em Roda ativa' : 'Selecionar para Roda'}</span>
                    </label>
                  ) : null}
                  <h3>{story.title}</h3>
                  <p>{story.input_context || story.user_story || 'Sem descrição.'}</p>
                  {planningEntry ? (
                    <div
                      className={`project-detail-page__kanban-card-planning${
                        isInLivePlanningSession ? ' is-live' : ''
                      }`}
                    >
                      <strong>{isInLivePlanningSession ? 'Em Roda ativa' : 'Roda vinculada'}</strong>
                      <span>
                        {planningSession?.name ?? 'Roda da Fogueira'}
                        {finalEstimate ? ` · Final: ${finalEstimate}` : ''}
                      </span>
                    </div>
                  ) : null}
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
                        disabled={isUpdatingStoryStatus || isInLivePlanningSession}
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
                  {isInLivePlanningSession ? (
                    <Link className="btn btn-primary btn-small" to={planningRoomUrl}>
                      Continuar Roda
                    </Link>
                  ) : isReadyForPlanning ? (
                    <Link
                      className="btn btn-primary btn-small"
                      to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                    >
                      Abrir Roda
                    </Link>
                  ) : null}
                  {story.estimation_status === 'estimated' ? (
                    <Link className="btn btn-secondary btn-small" to={planningRoomUrl}>
                      Ver estimativa
                    </Link>
                  ) : null}
                  {story.estimation_status !== 'ready_for_estimation' &&
                  story.estimation_status !== 'estimated' &&
                  canUpdateStoryStatus ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handlePrepareStoryForPlanning(story)}
                      disabled={isUpdatingStoryStatus}
                    >
                      {isUpdatingStoryStatus ? 'Preparando...' : 'Preparar Roda'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
        ) : null}
      </section>

      <section id="membros-projeto" className="panel project-detail-page__members" aria-label="Membros do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Membros do projeto</p>
            <h2>{membersLabel}</h2>
            <p>Pessoas com acesso ao contexto e às histórias vinculadas deste projeto.</p>
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
    </div>
  )
}

export default ProjectDetailPage
