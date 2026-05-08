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
  analyzeProject,
  buildProjectAnalysisMarkdown,
  deleteProjectAnalysis,
  listProjectAnalyses,
  saveProjectAnalysis,
} from '../services/projectAiService'
import { copyTextToClipboard } from '../utils/storyExport'

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

const STORY_STATUS_QUICK_FILTERS = [
  { value: 'all', label: 'Todas', hint: 'Visão completa' },
  { value: 'created', label: 'Criadas', hint: 'Ainda sem preparo' },
  { value: 'refining', label: 'Em refinamento', hint: 'Ajustes em andamento' },
  { value: 'ready_for_estimation', label: 'Prontas', hint: 'Disponíveis para Roda' },
  { value: 'estimated', label: 'Estimadas', hint: 'Já pontuadas' },
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

function getStoryVersionLabel(versionNumber) {
  const count = Number(versionNumber ?? 1)
  const safeCount = Number.isFinite(count) && count > 0 ? count : 1
  return `${safeCount} ${safeCount === 1 ? 'versão' : 'versões'}`
}

function getStoryPreview(story) {
  return story?.input_context?.trim() || story?.user_story?.trim() || 'Sem descrição.'
}

function ProjectInsightList({ title, items, emptyText }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
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
  const [storyViewMode, setStoryViewMode] = useState('board')
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
  const visibleKanbanColumns = useMemo(
    () =>
      kanbanColumns.map((column) => ({
        ...column,
        cards:
          storyEstimationFilter === 'all'
            ? column.cards
            : column.cards.filter((story) => story.estimation_status === storyEstimationFilter),
      })),
    [kanbanColumns, storyEstimationFilter],
  )
  const visibleKanbanStories = useMemo(
    () => visibleKanbanColumns.flatMap((column) => column.cards ?? []),
    [visibleKanbanColumns],
  )
  const visibleReadyStories = useMemo(() => {
    const sourceStories = storyViewMode === 'board' ? visibleKanbanStories : projectStories
    return sourceStories.filter((story) => story.estimation_status === 'ready_for_estimation')
  }, [projectStories, storyViewMode, visibleKanbanStories])
  const selectedReadyStories = useMemo(
    () => visibleReadyStories.filter((story) => selectedProjectStoryIds.includes(story.id)),
    [selectedProjectStoryIds, visibleReadyStories],
  )
  const selectedReadyStoryIds = selectedReadyStories.map((story) => story.id)
  const selectedReadyStoriesLabel =
    selectedReadyStoryIds.length === 1
      ? '1 história selecionada'
      : `${selectedReadyStoryIds.length} histórias selecionadas`
  const selectedReadyStoriesRodaUrl =
    selectedReadyStoryIds.length > 0
      ? `/roda?projectId=${projectId}&storyIds=${selectedReadyStoryIds.join(',')}`
      : `/roda?projectId=${projectId}`
  const visibleKanbanStoryCount = visibleKanbanStories.length
  const shouldShowKanbanLimitNotice = storyViewMode === 'board' && projectStoryCount > kanbanStories.length
  const latestProjectNextAction =
    projectInsights?.next_actions?.[0] ??
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
        { text: 'Times e Roda no menu' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [membersLabel, project?.name, setTopbarStatus, storiesLabel])

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
    setUpdatingStoryStatusId(story.id)
    const response = await updateUserStoryEstimationStatus({
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
    await Promise.all([loadProjectStories(), loadProjectStoryStatusCounts(), loadProjectKanban()])
  }

  async function handlePrepareStoryForPlanning(story) {
    if (!story) return
    await handleUpdateStoryEstimationStatus(story, 'ready_for_estimation')
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
    await Promise.all([loadProjectKanban(), loadProjectStories(), loadProjectStoryStatusCounts()])
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
    await Promise.all([loadProjectKanban(), loadProjectStories(), loadProjectStoryStatusCounts()])
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
    setSelectedProjectStoryIds((current) =>
      current.includes(storyId)
        ? current.filter((currentStoryId) => currentStoryId !== storyId)
        : [...current, storyId],
    )
  }

  function handleSelectVisibleReadyStories() {
    setStoryStatusMessage('')
    setSelectedProjectStoryIds(visibleReadyStories.map((story) => story.id))
  }

  function handleClearProjectStorySelection() {
    setStoryStatusMessage('')
    setSelectedProjectStoryIds([])
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

      <section className="project-detail-page__executive-strip" aria-label="Visão executiva do projeto">
        <article>
          <span>Diagnóstico</span>
          <strong>{projectInsights?.health_label ?? 'Sem diagnóstico'}</strong>
          <p>
            {projectInsights
              ? projectInsights.summary
              : 'Gere uma leitura com IA para resumir riscos, dúvidas e próximos passos.'}
          </p>
          <a className="btn btn-secondary btn-small" href="#diagnostico-projeto">
            {projectInsights ? 'Ver diagnóstico' : 'Gerar diagnóstico'}
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

        {!projectInsights ? (
          <div className="project-detail-page__ai-empty">
            <strong>Leitura sob demanda</strong>
            <p>
              O diagnóstico não é salvo no banco nesta versão. Ele usa as histórias atuais do projeto e deve ser
              revisado pelo PM/PO antes de orientar o time.
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
            </div>

            <div className="project-detail-page__ai-grid">
              <ProjectInsightList
                title="Riscos"
                items={projectInsights.risks}
                emptyText="Nenhum risco relevante foi destacado pela IA."
              />
              <ProjectInsightList
                title="Perguntas de refinamento"
                items={projectInsights.refinement_questions}
                emptyText="Nenhuma pergunta adicional foi sugerida."
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
              {projectInsightHistory.map((item) => (
                <article key={item.id} className="project-detail-page__ai-history-item">
                  <div>
                    <span>
                      {formatProjectDateTime(item.created_at)}
                      {activeProjectInsightId === item.id ? ' · Aberto agora' : ''}
                    </span>
                    <strong>{item.analysis.health_label}</strong>
                    <p>{item.analysis.summary}</p>
                  </div>
                  <div className="project-detail-page__ai-history-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleOpenProjectInsightHistoryItem(item)}
                    >
                      Reabrir
                    </button>
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
              ))}
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
                {storyViewMode === 'board'
                  ? `${visibleKanbanStoryCount} ${
                      visibleKanbanStoryCount === 1 ? 'card visível' : 'cards visíveis'
                    } no quadro.`
                  : storyEstimationFilter === 'all'
                  ? filteredStoriesLabel
                  : `${filteredStoriesLabel} em ${currentStoryFilterLabel}.`}
              </p>
            ) : null}
          </div>
          <div className="project-detail-page__story-actions">
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
              <p>
                Selecione histórias prontas no quadro ou na lista para abrir a Roda da Fogueira com o lote já carregado.
              </p>
            </div>
            <div className="project-detail-page__story-batch-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleSelectVisibleReadyStories}
                disabled={visibleReadyStories.length === 0 || isLoadingStories}
              >
                Selecionar prontas visíveis
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleClearProjectStorySelection}
                disabled={selectedReadyStoryIds.length === 0 || isLoadingStories}
              >
                Limpar seleção
              </button>
              {selectedReadyStoryIds.length > 0 ? (
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
        {kanbanMessage ? <p className="projects-page__message">{kanbanMessage}</p> : null}
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

                  return (
                    <section
                      key={column.id}
                      className={`project-detail-page__kanban-column${isDropTarget ? ' is-drop-target' : ''}`}
                      onDragOver={(event) => handleKanbanDragOver(event, column.id)}
                      onDragLeave={() => handleKanbanDragLeave(column.id)}
                      onDrop={(event) => handleKanbanDrop(event, column.id)}
                    >
                      <header className="project-detail-page__kanban-column-header">
                        <div>
                          <span>{getEstimationStatusLabel(column.status_base)}</span>
                          <h3>{column.name}</h3>
                          <p>
                            {columnCount} {columnCount === 1 ? 'história' : 'histórias'}
                          </p>
                        </div>
                        {canEditKanbanColumns ? (
                          <div className="project-detail-page__kanban-column-actions">
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
                          <p className="project-detail-page__kanban-empty">Nenhuma história nesta coluna.</p>
                        ) : null}
                        {columnCards.map((story) => {
                          const isReadyForPlanning = story.estimation_status === 'ready_for_estimation'
                          const isSelectedForPlanning = selectedProjectStoryIds.includes(story.id)
                          const isMovingStory = movingKanbanStoryId === story.id

                          return (
                            <article
                              key={story.id}
                              className={`project-detail-page__kanban-card${
                                isSelectedForPlanning ? ' is-selected' : ''
                              }${isMovingStory ? ' is-moving' : ''}`}
                              draggable={canMoveKanbanCards}
                              onDragStart={(event) => handleKanbanDragStart(event, story)}
                              onDragEnd={() => {
                                setDraggedKanbanStoryId(null)
                                setDragOverKanbanColumnId(null)
                              }}
                            >
                              {isReadyForPlanning ? (
                                <label className="project-detail-page__story-select">
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForPlanning}
                                    onChange={() => handleToggleProjectStorySelection(story.id)}
                                  />
                                  <span>Selecionar para Roda</span>
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
                              </div>

                              <div className="project-detail-page__kanban-card-actions">
                                {canMoveKanbanCards ? (
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
                                ) : null}
                                <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                                  Abrir na Bancada
                                </Link>
                                {isReadyForPlanning ? (
                                  <Link
                                    className="btn btn-primary btn-small"
                                    to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                                  >
                                    Abrir Roda
                                  </Link>
                                ) : null}
                                {story.estimation_status === 'estimated' ? (
                                  <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${projectId}`}>
                                    Ver Rodas
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
          {projectStories.map((story) => {
            const canUpdateStoryStatus = canManageProjectMembers || story.user_id === userId
            const isUpdatingStoryStatus = updatingStoryStatusId === story.id
            const isReadyForPlanning = story.estimation_status === 'ready_for_estimation'
            const isSelectedForPlanning = selectedProjectStoryIds.includes(story.id)

            return (
              <article
                key={story.id}
                className={`project-detail-page__story${isSelectedForPlanning ? ' is-selected' : ''}`}
              >
                <div>
                  {isReadyForPlanning ? (
                    <label className="project-detail-page__story-select">
                      <input
                        type="checkbox"
                        checked={isSelectedForPlanning}
                        onChange={() => handleToggleProjectStorySelection(story.id)}
                      />
                      <span>Selecionar para Roda</span>
                    </label>
                  ) : null}
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
                  {isReadyForPlanning ? (
                    <Link
                      className="btn btn-primary btn-small"
                      to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                    >
                      Abrir Roda
                    </Link>
                  ) : null}
                  {story.estimation_status === 'estimated' ? (
                    <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${projectId}`}>
                      Ver Rodas
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

      <section className="panel project-detail-page__members" aria-label="Membros do projeto">
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
