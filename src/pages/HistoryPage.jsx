import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import VersionDiffSummary from '../components/workspace/VersionDiffSummary'
import VersionTimeline from '../components/workspace/VersionTimeline'
import { getResolvedQualityScore, getScoreMeta } from '../components/workspace/qualityScoreUtils'
import { formatDateTime, parseTextList } from '../hooks/useUserStoryWorkspace'
import { useAuth } from '../hooks/useAuth'
import {
  getUserStoryById,
  listStoryHistoryGroups,
  listStoryVersions,
  updateUserStory,
  updateUserStoryEstimationStatus,
} from '../services/userStoriesService'
import { listProjects } from '../services/projectsService'
import {
  buildStoryJiraLike,
  buildStoryMarkdown,
  buildStoryPlainText,
  copyTextToClipboard,
} from '../utils/storyExport'
import {
  buildVersionComparisonMarkdown,
  buildVersionDiff,
} from '../utils/storyVersionUtils'

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'all', label: 'Tudo' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'generated', label: 'Forjado' },
  { value: 'reviewed', label: 'Inspecionado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'archived', label: 'Arquivado' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const STATUS_LABELS = {
  generated: 'Forjado',
  reviewed: 'Inspecionado',
  approved: 'Aprovado',
  archived: 'Arquivado',
}

const ESTIMATION_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'created', label: 'Criada' },
  { value: 'refining', label: 'Em refinamento' },
  { value: 'ready_for_estimation', label: 'Pronta para estimar' },
  { value: 'estimated', label: 'Estimada' },
]

const ESTIMATION_STATUS_LABELS = {
  created: 'Criada',
  refining: 'Em refinamento',
  ready_for_estimation: 'Pronta para estimar',
  estimated: 'Estimada',
}

const PROJECT_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'none', label: 'Sem projeto' },
  { value: 'project', label: 'Por projeto' },
]

const HISTORY_QUICK_FILTERS = [
  {
    value: 'all',
    label: 'Todas',
    description: 'Peças salvas no histórico.',
  },
  {
    value: 'without_project',
    label: 'Sem projeto',
    description: 'Peças avulsas para organizar.',
  },
  {
    value: 'ready_for_estimation',
    label: 'Prontas para estimar',
    description: 'Peças preparadas para a Roda.',
  },
  {
    value: 'estimated',
    label: 'Estimadas',
    description: 'Peças com pontuação final.',
  },
]

const INITIAL_ADVANCED_SECTIONS = {
  delivery: false,
  versions: false,
  comparison: false,
  inspection: false,
}

const DELIVERY_FORMAT_OPTIONS = [
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Artefato completo para backlog, documentação ou refinamento.',
    successMessage: 'Artefato em Markdown copiado.',
  },
  {
    value: 'plain',
    label: 'Texto simples',
    description: 'User story e critérios de aceite em formato direto.',
    successMessage: 'Artefato em texto simples copiado.',
  },
  {
    value: 'jira',
    label: 'Formato Jira',
    description: 'Texto estruturado para colar em uma issue manualmente.',
    successMessage: 'Formato textual para Jira copiado. Revise antes de colar na issue.',
  },
  {
    value: 'story',
    label: 'Somente user story',
    description: 'A frase principal para compartilhar rapidamente.',
    successMessage: 'User story copiada.',
  },
]

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Forjado'
}

function getDeliveryFormatLabel(value) {
  return DELIVERY_FORMAT_OPTIONS.find((option) => option.value === value)?.label ?? 'Markdown'
}

function buildDeliveryText(story, format) {
  if (!story) return ''

  if (format === 'story') return story.user_story ?? ''
  if (format === 'plain') return buildStoryPlainText(story)
  if (format === 'jira') return buildStoryJiraLike(story)

  return buildStoryMarkdown(story)
}

function getEstimationStatusLabel(status) {
  return ESTIMATION_STATUS_LABELS[status] ?? 'Criada'
}

function getOptionLabel(options, value, fallback = 'Todos') {
  return options.find((option) => option.value === value)?.label ?? fallback
}

function buildSinceIso(period) {
  const now = new Date()
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (period === '7d' || period === '30d') {
    const daysAgo = new Date(now)
    daysAgo.setDate(daysAgo.getDate() - Number.parseInt(period, 10))
    return daysAgo.toISOString()
  }
  return null
}

function mapStoryRowToResult(story) {
  if (!story) return null

  return {
    title: story.title,
    objective: story.objective || '-',
    user_story: story.user_story,
    acceptance_criteria: parseTextList(story.acceptance_criteria),
    business_rules: parseTextList(story.business_rules),
    gaps: parseTextList(story.gaps),
    qa_checklist: parseTextList(story.qa_checklist),
    notes: story.regeneration_instruction
      ? `Acabamento aplicado: ${story.regeneration_instruction}`
      : `Status: ${getStatusLabel(story.status)}`,
  }
}

function getVisibleRange({ page, pageSize, totalCount, itemCount }) {
  if (totalCount === 0) return '0-0'
  const start = (page - 1) * pageSize + 1
  const end = start + itemCount - 1
  return `${start}-${end}`
}

function getVersionCount(story) {
  const count = Number(story?.versions_count ?? story?.version_number ?? 1)
  return Number.isFinite(count) && count > 0 ? count : 1
}

function getVersionLabel(count) {
  return `${count} ${count === 1 ? 'versão' : 'versões'}`
}

function getProjectName(story, projects) {
  if (story?.project_name) return story.project_name
  if (story?.project_id) {
    return projects.find((project) => project.id === story.project_id)?.name ?? 'Projeto vinculado'
  }
  return 'Sem projeto'
}

function getStoryPreview(story) {
  return story?.input_context?.trim() || story?.input_requirements?.trim() || story?.user_story?.trim() || ''
}

function getHistoryItemNextAction(story) {
  if (!story?.project_id) {
    return {
      label: 'Organizar',
      text: 'Sem projeto',
    }
  }

  if (story.estimation_status === 'ready_for_estimation') {
    return {
      label: 'Roda',
      text: 'Pronta para estimar',
    }
  }

  if (story.estimation_status === 'estimated') {
    return {
      label: 'Estimativa',
      text: 'Pontuação registrada',
    }
  }

  return {
    label: 'Revisar',
    text: 'Pode seguir para preparo',
  }
}

function getHistoryItemTone(story) {
  if (!story?.project_id) return 'organize'
  if (story.estimation_status === 'ready_for_estimation') return 'ready'
  if (story.estimation_status === 'estimated') return 'estimated'
  return 'review'
}

function HistoryAccordion({ id, eyebrow, title, summary, open, onToggle, children }) {
  return (
    <details
      className="history-advanced-section"
      open={open}
      onToggle={(event) => onToggle(id, event.currentTarget.open)}
    >
      <summary>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
        </span>
        <em>{summary}</em>
      </summary>
      <div className="history-advanced-section__body">{children}</div>
    </details>
  )
}

function HistoryListState({ isLoading, loadError, hasItems }) {
  if (isLoading) {
    return (
      <div className="history-state history-state--loading" role="status">
        <span aria-hidden="true" />
        <p>Buscando peças forjadas...</p>
      </div>
    )
  }

  if (loadError) {
    return <p className="history-status history-status-error">{loadError}</p>
  }

  if (!hasItems) {
    return (
      <article className="history-empty-card">
        <p className="history-page__eyebrow">Histórico vazio</p>
        <h3>Nenhuma peça forjada ainda</h3>
        <p>
          Crie a primeira matéria-prima para gerar uma user story e voltar aqui para localizar,
          revisar e entregar o artefato.
        </p>
        <Link className="btn btn-primary btn-small" to="/tool">
          Criar primeira matéria-prima
        </Link>
      </article>
    )
  }

  return null
}

function HistoryPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setTopbarStatus } = useOutletContext() ?? {}
  const projectIdFromSearch = searchParams.get('projectId') ?? ''
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [period, setPeriod] = useState(projectIdFromSearch ? 'all' : '7d')
  const [status, setStatus] = useState('all')
  const [estimationStatus, setEstimationStatus] = useState('all')
  const [projectFilter, setProjectFilter] = useState(projectIdFromSearch ? 'project' : 'all')
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromSearch)
  const [projects, setProjects] = useState([])
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [pageJump, setPageJump] = useState('1')
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedStory, setSelectedStory] = useState(null)
  const [versions, setVersions] = useState([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const [copyTarget, setCopyTarget] = useState(null)
  const [projectAssignmentMessage, setProjectAssignmentMessage] = useState('')
  const [isAssigningProject, setIsAssigningProject] = useState(false)
  const [estimationActionMessage, setEstimationActionMessage] = useState('')
  const [isUpdatingEstimationStatus, setIsUpdatingEstimationStatus] = useState(false)
  const [openAdvancedSections, setOpenAdvancedSections] = useState(INITIAL_ADVANCED_SECTIONS)
  const [isProjectAssignmentOpen, setIsProjectAssignmentOpen] = useState(false)
  const [deliveryFormat, setDeliveryFormat] = useState('markdown')

  const selectedResult = useMemo(() => mapStoryRowToResult(selectedStory), [selectedStory])
  const deliveryPreviewText = useMemo(
    () => buildDeliveryText(selectedResult, deliveryFormat),
    [deliveryFormat, selectedResult],
  )
  const deliveryFormatLabel = useMemo(
    () => getDeliveryFormatLabel(deliveryFormat),
    [deliveryFormat],
  )
  const deliveryLineCount = useMemo(
    () => deliveryPreviewText.split('\n').filter(Boolean).length,
    [deliveryPreviewText],
  )
  const selectedDeliveryCopyTarget = `delivery-${deliveryFormat}`
  const selectedVersion = useMemo(
    () => versions.find((item) => item.id === selectedStory?.id) ?? null,
    [selectedStory, versions],
  )
  const previousVersion = useMemo(() => {
    if (!selectedVersion?.version_number) return null
    return versions.find((item) => item.version_number === selectedVersion.version_number - 1) ?? null
  }, [selectedVersion, versions])
  const currentVersionForComparison = selectedVersion ?? selectedStory
  const comparisonDiff = useMemo(
    () => buildVersionDiff(previousVersion, currentVersionForComparison),
    [currentVersionForComparison, previousVersion],
  )
  const comparisonMarkdown = useMemo(
    () =>
      buildVersionComparisonMarkdown({
        previousVersion,
        currentVersion: currentVersionForComparison,
      }),
    [currentVersionForComparison, previousVersion],
  )

  const selectStory = useCallback(
    async (story) => {
      if (!story || !userId) return

      setSelectedStory(story)
      setCopyMessage('')
      setProjectAssignmentMessage('')
      setEstimationActionMessage('')
      setIsLoadingVersions(true)

      const response = await listStoryVersions({
        storyGroupId: story.story_group_id ?? story.id,
        userId,
        limit: 50,
      })

      if (response.success) {
        setVersions(response.data ?? [])
      } else {
        setVersions([])
      }

      setIsLoadingVersions(false)
    },
    [userId],
  )

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Peças forjadas',
      title: selectedStory?.title || 'Peças forjadas',
      pills: [
        { text: `${totalCount} ${totalCount === 1 ? 'peça' : 'peças'}` },
        { text: `${pageSize} por página` },
      ],
    })

    return () => setTopbarStatus(null)
  }, [setTopbarStatus, selectedStory, totalCount, pageSize])

  useEffect(() => {
    let active = true

    async function loadProjects() {
      if (!userId) return

      const response = await listProjects({ userId })
      if (!active) return

      if (response.success) {
        setProjects(response.data ?? [])
      }
    }

    loadProjects()

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
      setPageJump('1')
    }, 300)

    return () => window.clearTimeout(timerId)
  }, [searchInput])

  useEffect(() => {
    async function loadHistory() {
      if (!userId) return

      setIsLoading(true)
      setLoadError('')

      const response = await listStoryHistoryGroups({
        userId,
        search: debouncedSearch,
        sinceIso: buildSinceIso(period),
        status,
        estimationStatus,
        projectFilter,
        projectId: projectFilter === 'project' ? selectedProjectId : null,
        page,
        pageSize,
      })

      if (response.success) {
        const nextItems = response.data ?? []
        if (response.totalPages > 0 && page > response.totalPages) {
          setPage(response.totalPages)
          setPageJump(String(response.totalPages))
          setIsLoading(false)
          return
        }

        setItems(nextItems)
        setTotalCount(response.totalCount)
        setTotalPages(response.totalPages)

        if (nextItems.length > 0) {
          await selectStory(nextItems[0])
        } else {
          setSelectedStory(null)
          setVersions([])
        }
      } else {
        setItems([])
        setTotalCount(0)
        setTotalPages(0)
        setLoadError(
          'Não foi possível carregar as peças forjadas. Verifique se a migration story-history-search.sql foi aplicada.',
        )
      }

      setIsLoading(false)
    }

    loadHistory()
  }, [
    debouncedSearch,
    estimationStatus,
    page,
    pageSize,
    period,
    projectFilter,
    selectedProjectId,
    selectStory,
    status,
    userId,
  ])

  async function handleSelectVersion(storyId) {
    if (!userId) return

    const version = versions.find((item) => item.id === storyId)
    if (version) {
      setSelectedStory(version)
      setCopyMessage('')
      setProjectAssignmentMessage('')
      setEstimationActionMessage('')
      return
    }

    const response = await getUserStoryById(storyId, userId)
    if (response.success && response.data) {
      setSelectedStory(response.data)
      setCopyMessage('')
      setProjectAssignmentMessage('')
      setEstimationActionMessage('')
    }
  }

  async function copySelectedText({ target, value, successMessage, errorMessage, logMessage }) {
    if (!value) return

    setCopyTarget(target)
    setCopyMessage('')
    try {
      await copyTextToClipboard(value)
      setCopyMessage(successMessage)
    } catch (error) {
      console.error(logMessage, error)
      setCopyMessage(errorMessage)
    } finally {
      setCopyTarget(null)
    }
  }

  async function handleCopyUserStory() {
    await copySelectedText({
      target: 'story',
      value: selectedResult?.user_story,
      successMessage: 'User story copiada.',
      errorMessage: 'Não foi possível copiar a user story agora.',
      logMessage: 'Falha ao copiar user story do histórico:',
    })
  }

  async function handleCopyPlain() {
    await copySelectedText({
      target: 'plain',
      value: buildStoryPlainText(selectedResult),
      successMessage: 'Artefato copiado.',
      errorMessage: 'Não foi possível copiar o artefato agora.',
      logMessage: 'Falha ao copiar texto simples do histórico:',
    })
  }

  async function handleCopyMarkdown() {
    await copySelectedText({
      target: 'markdown',
      value: buildStoryMarkdown(selectedResult),
      successMessage: 'Artefato em Markdown copiado.',
      errorMessage: 'Não foi possível copiar o artefato em Markdown agora.',
      logMessage: 'Falha ao copiar exportação em Markdown do histórico:',
    })
  }

  async function handleCopyJira() {
    await copySelectedText({
      target: 'jira',
      value: buildStoryJiraLike(selectedResult),
      successMessage: 'Formato textual para Jira copiado. Revise antes de colar na issue.',
      errorMessage: 'Não foi possível copiar o formato para Jira agora.',
      logMessage: 'Falha ao copiar formato textual para Jira do histórico:',
    })
  }

  async function handleCopySelectedDeliveryFormat() {
    const option = DELIVERY_FORMAT_OPTIONS.find((item) => item.value === deliveryFormat)
    await copySelectedText({
      target: selectedDeliveryCopyTarget,
      value: deliveryPreviewText,
      successMessage: option?.successMessage ?? `${deliveryFormatLabel} copiado.`,
      errorMessage: `Não foi possível copiar ${deliveryFormatLabel.toLocaleLowerCase('pt-BR')} agora.`,
      logMessage: 'Falha ao copiar formato de entrega do histórico:',
    })
  }

  async function handleCopyVersionComparison() {
    await copySelectedText({
      target: 'comparison',
      value: comparisonMarkdown,
      successMessage: 'Comparação de versões copiada.',
      errorMessage: 'Não foi possível copiar a comparação agora.',
      logMessage: 'Falha ao copiar comparação de versões do histórico:',
    })
  }

  function resetHistoryPagination() {
    setPage(1)
    setPageJump('1')
  }

  function resetPageWith(nextValueSetter, value) {
    nextValueSetter(value)
    resetHistoryPagination()
  }

  function getActiveQuickFilter() {
    if (
      period === 'all' &&
      status === 'all' &&
      estimationStatus === 'all' &&
      projectFilter === 'all' &&
      !selectedProjectId &&
      !searchInput.trim()
    ) {
      return 'all'
    }

    if (estimationStatus === 'all' && projectFilter === 'none') {
      return 'without_project'
    }

    if (projectFilter === 'all' && estimationStatus === 'ready_for_estimation') {
      return 'ready_for_estimation'
    }

    if (projectFilter === 'all' && estimationStatus === 'estimated') {
      return 'estimated'
    }

    return null
  }

  function handleQuickFilterChange(value) {
    setStatus('all')
    setSelectedProjectId('')

    if (value === 'all') {
      setSearchInput('')
      setDebouncedSearch('')
      setPeriod('all')
      setProjectFilter('all')
      setEstimationStatus('all')
    }

    if (value === 'without_project') {
      setProjectFilter('none')
      setEstimationStatus('all')
    }

    if (value === 'ready_for_estimation') {
      setProjectFilter('all')
      setEstimationStatus('ready_for_estimation')
    }

    if (value === 'estimated') {
      setProjectFilter('all')
      setEstimationStatus('estimated')
    }

    resetHistoryPagination()
  }

  function handleOpenProjectAssignment() {
    setIsProjectAssignmentOpen(true)
    window.requestAnimationFrame(() => {
      document.getElementById('history-project-assignment')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  function goToPage(nextPage) {
    const fallbackTotal = totalPages || 1
    const safePage = Math.min(Math.max(1, nextPage), fallbackTotal)
    setPage(safePage)
    setPageJump(String(safePage))
  }

  function handlePageJump(event) {
    event.preventDefault()
    goToPage(Number(pageJump) || 1)
  }

  function handleProjectFilterChange(value) {
    setProjectFilter(value)
    if (value !== 'project') {
      setSelectedProjectId('')
    } else if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id)
    }
    resetHistoryPagination()
  }

  function handleSelectedProjectChange(value) {
    setSelectedProjectId(value)
    resetHistoryPagination()
  }

  async function handleSelectedStoryProjectChange(value) {
    if (!selectedStory || !userId) return

    setProjectAssignmentMessage('')
    setEstimationActionMessage('')

    if (selectedStory.user_id !== userId) {
      setProjectAssignmentMessage(
        'Apenas quem criou esta história pode mudar o projeto vinculado.',
      )
      return
    }

    const nextProjectId = value || null
    setIsAssigningProject(true)
    const response = await updateUserStory(
      selectedStory.id,
      { project_id: nextProjectId },
      userId,
    )
    setIsAssigningProject(false)

    if (!response.success || !response.data?.[0]) {
      setProjectAssignmentMessage(
        response.error?.message ?? 'Não foi possível organizar esta história agora.',
      )
      return
    }

    const selectedProject = projects.find((project) => project.id === nextProjectId) ?? null
    const updatedStory = {
      ...selectedStory,
      ...response.data[0],
      project_name: selectedProject?.name ?? null,
    }

    setSelectedStory(updatedStory)
    setItems((currentItems) =>
      currentItems.map((item) => {
        const sameStory = item.id === selectedStory.id
        const sameGroup =
          item.story_group_id && item.story_group_id === selectedStory.story_group_id

        return sameStory || sameGroup
          ? {
              ...item,
              project_id: updatedStory.project_id,
              project_name: updatedStory.project_name,
            }
          : item
      }),
    )
    setProjectAssignmentMessage(
      updatedStory.project_id
        ? 'História organizada no projeto selecionado.'
        : 'História marcada como sem projeto.',
    )
  }

  async function prepareSelectedStoryForEstimation() {
    if (!selectedStory?.id || !userId) return false

    setEstimationActionMessage('')

    if (selectedStory.user_id !== userId) {
      setEstimationActionMessage(
        'Apenas quem criou esta história pode prepará-la para estimativa.',
      )
      return false
    }

    if (!selectedStory.project_id) {
      setEstimationActionMessage(
        'Vincule a história a um projeto antes de prepará-la para a Roda.',
      )
      return false
    }

    if (
      selectedStory.estimation_status === 'ready_for_estimation' ||
      selectedStory.estimation_status === 'estimated'
    ) {
      return true
    }

    setIsUpdatingEstimationStatus(true)
    const response = await updateUserStoryEstimationStatus({
      storyId: selectedStory.id,
      estimationStatus: 'ready_for_estimation',
      userId,
    })
    setIsUpdatingEstimationStatus(false)

    if (!response.success) {
      setEstimationActionMessage(
        response.error?.message ?? 'Não foi possível preparar esta história agora.',
      )
      return false
    }

    const updatedFields = {
      estimation_status: response.data?.estimation_status ?? 'ready_for_estimation',
    }

    setSelectedStory((current) => (current ? { ...current, ...updatedFields } : current))
    setVersions((currentVersions) =>
      currentVersions.map((version) =>
        version.id === selectedStory.id ? { ...version, ...updatedFields } : version,
      ),
    )
    setItems((currentItems) =>
      currentItems.map((item) => {
        const sameStory = item.id === selectedStory.id
        const sameGroup =
          item.story_group_id && item.story_group_id === selectedStory.story_group_id

        return sameStory || sameGroup ? { ...item, ...updatedFields } : item
      }),
    )
    setEstimationActionMessage('História pronta para estimativa.')
    return true
  }

  async function handleOpenPlanningPoker() {
    if (!selectedStory?.id) return

    setEstimationActionMessage('')

    if (!selectedStory.project_id) {
      setEstimationActionMessage(
        'Vincule a história a um projeto antes de abrir a Roda da Fogueira.',
      )
      return
    }

    const isAlreadyReady =
      selectedStory.estimation_status === 'ready_for_estimation' ||
      selectedStory.estimation_status === 'estimated'
    const prepared = isAlreadyReady ? true : await prepareSelectedStoryForEstimation()

    if (!prepared) return

    const query = new URLSearchParams({ projectId: selectedStory.project_id })
    if (selectedStory.estimation_status !== 'estimated') {
      query.set('storyId', selectedStory.id)
    }
    navigate(`/roda?${query.toString()}`)
  }

  function toggleAdvancedSection(section, isOpen) {
    setOpenAdvancedSections((current) => ({
      ...current,
      [section]: isOpen,
    }))
  }

  function openAdvancedSection(section) {
    setOpenAdvancedSections((current) => ({
      ...current,
      [section]: true,
    }))
  }

  const visibleRange = getVisibleRange({
    page,
    pageSize,
    totalCount,
    itemCount: items.length,
  })
  const selectedGroupKey = selectedStory?.story_group_id ?? selectedStory?.id ?? null
  const canAssignSelectedStoryProject = Boolean(selectedStory?.id && selectedStory.user_id === userId)
  const canPrepareSelectedStory = Boolean(selectedStory?.id && selectedStory.user_id === userId)
  const selectedProjectName = getProjectName(selectedStory, projects)
  const selectedVersionCount = Math.max(versions.length, getVersionCount(selectedStory))
  const latestVersionDate = formatDateTime(versions[0]?.created_at ?? selectedStory?.created_at)
  const qualityScore = selectedResult ? getResolvedQualityScore(selectedResult) : 0
  const qualityMeta = getScoreMeta(qualityScore)
  const acceptanceCriteria = selectedResult?.acceptance_criteria ?? []
  const previewCriteria = acceptanceCriteria.slice(0, 3)
  const hiddenCriteriaCount = Math.max(0, acceptanceCriteria.length - previewCriteria.length)
  const gapsCount = selectedResult?.gaps?.length ?? 0
  const qaCount = selectedResult?.qa_checklist?.length ?? 0
  const hasOriginalContext = Boolean(
    selectedStory?.input_context?.trim() || selectedStory?.input_requirements?.trim(),
  )
  const currentPageWithoutProjectCount = items.filter((item) => !item.project_id).length
  const currentPageReadyCount = items.filter((item) => item.estimation_status === 'ready_for_estimation').length
  const currentPageEstimatedCount = items.filter((item) => item.estimation_status === 'estimated').length
  const historySummaryItems = [
    {
      label: 'Recorte',
      value: totalCount,
      detail: totalCount === 1 ? 'peça encontrada' : 'peças encontradas',
    },
    {
      label: 'Nesta página',
      value: items.length,
      detail: 'visíveis agora',
    },
    {
      label: 'Sem projeto',
      value: currentPageWithoutProjectCount,
      detail: 'para organizar',
    },
    {
      label: 'Roda',
      value: currentPageReadyCount + currentPageEstimatedCount,
      detail: 'prontas ou estimadas',
    },
  ]
  const filterSummaryItems = [
    { label: 'Período', value: getOptionLabel(PERIOD_OPTIONS, period, 'Tudo') },
    { label: 'Status', value: getOptionLabel(STATUS_OPTIONS, status, 'Todos') },
    { label: 'Estimativa', value: getOptionLabel(ESTIMATION_STATUS_OPTIONS, estimationStatus, 'Todos') },
    {
      label: 'Projeto',
      value: projectFilter === 'project'
        ? projects.find((project) => project.id === selectedProjectId)?.name ?? 'Projeto'
        : getOptionLabel(PROJECT_FILTER_OPTIONS, projectFilter, 'Todas'),
    },
    { label: 'Página', value: `${pageSize} por página` },
  ]
  const isCopying = Boolean(copyTarget)
  const isCopyingSelectedDeliveryFormat = copyTarget === selectedDeliveryCopyTarget
  const isCopyingComparison = copyTarget === 'comparison'
  const comparisonSummaryLabel = comparisonDiff
    ? `${comparisonDiff.totalChanges} ${comparisonDiff.totalChanges === 1 ? 'mudança detectada' : 'mudanças detectadas'}`
    : 'Sem comparação real ainda'
  const activeQuickFilter = getActiveQuickFilter()
  const deliveryMetrics = selectedResult
    ? [
        {
          label: 'Critérios',
          value: selectedResult.acceptance_criteria.length,
        },
        {
          label: 'Regras',
          value: selectedResult.business_rules.length,
        },
        {
          label: 'Trincas',
          value: selectedResult.gaps.length,
        },
        {
          label: 'QA',
          value: selectedResult.qa_checklist.length,
        },
      ]
    : []
  let planningActionLabel = 'Preparar e abrir Roda'
  if (selectedStory?.estimation_status === 'estimated') {
    planningActionLabel = 'Ver Rodas do projeto'
  } else if (selectedStory?.estimation_status === 'ready_for_estimation') {
    planningActionLabel = 'Abrir Roda'
  }
  const historyNextAction = (() => {
    if (!selectedStory) return null

    if (selectedStory.user_id !== userId) {
      return {
        eyebrow: 'Consulta',
        title: 'Peça compartilhada',
        description: 'Você pode revisar e copiar este artefato, mas alterações ficam com quem criou a história.',
        actionLabel: 'Abrir na bancada',
        action: () => navigate(`/tool?storyId=${selectedStory.id}`),
        disabled: false,
      }
    }

    if (!selectedStory.project_id) {
      return {
        eyebrow: 'Organização',
        title: 'Vincule a um projeto',
        description: 'Projetos liberam organização por iniciativa, Kanban e Roda da Fogueira para estimativa.',
        actionLabel: 'Vincular projeto',
        action: handleOpenProjectAssignment,
        disabled: !canAssignSelectedStoryProject,
      }
    }

    if (selectedStory.estimation_status === 'estimated') {
      return {
        eyebrow: 'Estimativa',
        title: 'Estimativa registrada',
        description: 'Consulte as Rodas do projeto ou reabra a peça para revisar o conteúdo antes de encaminhar.',
        actionLabel: 'Ver estimativa',
        action: handleOpenPlanningPoker,
        disabled: isUpdatingEstimationStatus,
      }
    }

    if (selectedStory.estimation_status === 'ready_for_estimation') {
      return {
        eyebrow: 'Estimativa',
        title: 'Pronta para a Roda',
        description: 'Esta peça já está preparada para entrar em uma sessão colaborativa de estimativa.',
        actionLabel: 'Abrir Roda',
        action: handleOpenPlanningPoker,
        disabled: isUpdatingEstimationStatus,
      }
    }

    return {
      eyebrow: 'Próxima ação',
      title: 'Preparar estimativa',
      description: 'Marque a peça como pronta e abra a Roda quando o time estiver alinhado para pontuar.',
      actionLabel: isUpdatingEstimationStatus ? 'Preparando...' : 'Preparar e abrir Roda',
      action: handleOpenPlanningPoker,
      disabled: isUpdatingEstimationStatus || !canPrepareSelectedStory,
    }
  })()
  const selectedOperationalCards = selectedStory
    ? [
        {
          label: 'Entrega',
          title: 'Preparar cópia',
          description: `Formato atual: ${deliveryFormatLabel}. Revise a prévia antes de colar no backlog.`,
          actionLabel: 'Abrir entrega',
          action: () => openAdvancedSection('delivery'),
          tone: 'delivery',
        },
        {
          label: 'Organização',
          title: selectedProjectName,
          description: selectedStory.project_id
            ? 'Peça vinculada a um projeto com quadro, IA e Roda disponíveis.'
            : 'Peça avulsa. Vincule a um projeto para liberar organização e colaboração.',
          actionLabel: selectedStory.project_id ? 'Abrir projeto' : 'Vincular projeto',
          to: selectedStory.project_id ? `/projetos/${selectedStory.project_id}` : null,
          action: selectedStory.project_id ? null : handleOpenProjectAssignment,
          disabled: !selectedStory.project_id && !canAssignSelectedStoryProject,
          tone: selectedStory.project_id ? 'project' : 'organize',
        },
        {
          label: 'Estimativa',
          title: getEstimationStatusLabel(selectedStory.estimation_status),
          description: selectedStory.project_id
            ? 'Prepare ou abra a Roda da Fogueira quando a peça estiver pronta para pontuar.'
            : 'A Roda depende de projeto. Organize a peça antes de estimar com o time.',
          actionLabel: selectedStory.project_id ? planningActionLabel : 'Vincular projeto',
          action: selectedStory.project_id ? handleOpenPlanningPoker : handleOpenProjectAssignment,
          disabled: selectedStory.project_id
            ? !canPrepareSelectedStory || isUpdatingEstimationStatus
            : !canAssignSelectedStoryProject,
          tone: selectedStory.estimation_status === 'estimated'
            ? 'estimated'
            : selectedStory.estimation_status === 'ready_for_estimation'
              ? 'ready'
              : 'planning',
        },
        {
          label: 'Qualidade',
          title: `${qualityMeta.label} · ${qualityScore}/100`,
          description: `${gapsCount} ${gapsCount === 1 ? 'trinca' : 'trincas'} e ${qaCount} ${
            qaCount === 1 ? 'item de QA' : 'itens de QA'
          } registrados na inspeção.`,
          actionLabel: 'Ver inspeção',
          action: () => openAdvancedSection('inspection'),
          tone: qualityScore >= 80 ? 'quality' : 'warning',
        },
      ]
    : []

  return (
    <div className="history-page">
      <section className="panel history-page__hero">
        <div className="history-page__hero-copy">
          <p className="history-page__eyebrow">Peças forjadas</p>
          <h1>Peças forjadas</h1>
          <p>
            Histórico para localizar, revisar, copiar e reabrir user stories sem transformar esta tela em uma segunda bancada.
          </p>
        </div>
        <Link className="btn btn-secondary btn-small" to="/tool">
          Nova matéria-prima
        </Link>
      </section>

      {totalCount > 0 ? (
        <section className="history-summary-strip" aria-label="Resumo das peças forjadas">
          {historySummaryItems.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </section>
      ) : null}

      <section className="panel history-filters" aria-label="Filtros das peças forjadas">
        <div className="history-filters__primary">
          <label className="history-filter-field history-filter-field--search">
            <span>Buscar peça</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Título, matéria-prima, user story ou critério"
            />
          </label>

          <div className="history-filters__applied" aria-live="polite">
            <span>Recorte atual</span>
            <div className="history-filters__applied-list">
              {filterSummaryItems.map((item) => (
                <span key={item.label} className="history-filters__applied-chip">
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="history-quick-filters" aria-label="Filtros rápidos das peças forjadas">
          {HISTORY_QUICK_FILTERS.map((option) => {
            const isActive = activeQuickFilter === option.value

            return (
              <button
                key={option.value}
                type="button"
                className={`history-quick-filter ${isActive ? 'history-quick-filter--active' : ''}`}
                aria-pressed={isActive}
                onClick={() => handleQuickFilterChange(option.value)}
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            )
          })}
        </div>

        <details className="history-filters__advanced">
          <summary>
            <span>Filtros avançados</span>
            <em>Período, status, estimativa, projeto e navegação por páginas</em>
          </summary>

          <div className="history-filters__grid">
            <label className="history-filter-field">
              <span>Período</span>
              <select value={period} onChange={(event) => resetPageWith(setPeriod, event.target.value)}>
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter-field">
              <span>Status</span>
              <select value={status} onChange={(event) => resetPageWith(setStatus, event.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter-field">
              <span>Estimativa</span>
              <select
                value={estimationStatus}
                onChange={(event) => resetPageWith(setEstimationStatus, event.target.value)}
              >
                {ESTIMATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter-field">
              <span>Projeto</span>
              <select value={projectFilter} onChange={(event) => handleProjectFilterChange(event.target.value)}>
                {PROJECT_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {projectFilter === 'project' ? (
              <label className="history-filter-field">
                <span>Escolher projeto</span>
                <select
                  value={selectedProjectId}
                  onChange={(event) => handleSelectedProjectChange(event.target.value)}
                  disabled={projects.length === 0}
                >
                  {projects.length === 0 ? <option value="">Nenhum projeto</option> : null}
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="history-filter-field">
              <span>Por página</span>
              <select
                value={pageSize}
                onChange={(event) => resetPageWith(setPageSize, Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
      </section>

      <div className="history-layout">
        <section className="panel history-results" aria-label="Lista de peças forjadas">
          <div className="history-results__header">
            <div>
              <p className="history-page__eyebrow">Resultados</p>
              <h2>{totalCount} {totalCount === 1 ? 'peça' : 'peças'}</h2>
            </div>
            <span className="history-results__range">
              {visibleRange} de {totalCount}
            </span>
          </div>

          <HistoryListState isLoading={isLoading} loadError={loadError} hasItems={items.length > 0} />

          <div className="history-results__list">
            {items.map((item) => {
              const itemGroupKey = item.story_group_id ?? item.id
              const isActive = itemGroupKey === selectedGroupKey
              const preview = getStoryPreview(item)
              const versionCount = getVersionCount(item)
              const itemProjectName = item.project_name || 'Sem projeto'
              const nextAction = getHistoryItemNextAction(item)
              const itemTone = getHistoryItemTone(item)

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`history-result-card history-result-card--${itemTone} ${
                    isActive ? 'history-result-card--active' : ''
                  }`}
                  aria-pressed={isActive}
                  onClick={() => {
                    setProjectAssignmentMessage('')
                    selectStory(item)
                  }}
                >
                  <div className="history-result-card__title-row">
                    <h3>{item.title}</h3>
                    <span className="history-result-card__action">
                      {isActive ? 'Aberta' : 'Ver'}
                    </span>
                  </div>

                  {preview ? <p>{preview}</p> : <p>Peça salva sem resumo de matéria-prima.</p>}

                  <div className="history-result-card__next">
                    <span>{nextAction.label}</span>
                    <strong>{nextAction.text}</strong>
                  </div>

                  <div className="history-result-card__context" aria-label="Contexto da peça">
                    <span>{formatDateTime(item.created_at)}</span>
                    <strong>{itemProjectName}</strong>
                  </div>

                  <div className="history-result-card__meta" aria-label="Metadados da peça">
                    <span>{getVersionLabel(versionCount)}</span>
                    <span>{getStatusLabel(item.status)}</span>
                    <span>{getEstimationStatusLabel(item.estimation_status)}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="history-pagination" aria-label="Paginação das peças forjadas">
            <div className="history-pagination__controls">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => goToPage(1)} disabled={page <= 1}>
                Início
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                Anterior
              </button>
            </div>
            <form className="history-pagination__jump" onSubmit={handlePageJump}>
              <span>Página</span>
              <input
                type="number"
                min="1"
                max={Math.max(totalPages, 1)}
                value={pageJump}
                onChange={(event) => setPageJump(event.target.value)}
              />
              <span>de {Math.max(totalPages, 1)}</span>
              <button type="submit" className="btn btn-ghost btn-small">
                Ir
              </button>
            </form>
            <div className="history-pagination__controls">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => goToPage(page + 1)}
                disabled={totalPages === 0 || page >= totalPages}
              >
                Próxima
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => goToPage(totalPages)}
                disabled={totalPages === 0 || page >= totalPages}
              >
                Fim
              </button>
            </div>
          </div>
        </section>

        <aside className="history-detail" aria-label="Detalhe da peça selecionada">
          {selectedResult ? (
            <>
              <article className="panel history-preview">
                <header className="history-preview__header">
                  <div className="history-preview__copy">
                    <p className="history-page__eyebrow">Preview selecionado</p>
                    <h2>{selectedStory.title}</h2>
                    <div className="history-preview__badges" aria-label="Resumo da peça selecionada">
                      <span>{getStatusLabel(selectedStory.status)}</span>
                      <span>{selectedProjectName}</span>
                      <span>{getVersionLabel(selectedVersionCount)}</span>
                      <span>{getEstimationStatusLabel(selectedStory.estimation_status)}</span>
                    </div>
                  </div>

                  <div className="history-preview__actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => navigate(`/tool?storyId=${selectedStory.id}`)}
                    >
                      Abrir na bancada
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleCopyUserStory}
                      disabled={isCopying}
                    >
                      {copyTarget === 'story' ? 'Copiando...' : 'Copiar user story'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleCopyPlain}
                      disabled={isCopying}
                    >
                      {copyTarget === 'plain' ? 'Copiando...' : 'Copiar artefato'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleOpenPlanningPoker}
                      disabled={!canPrepareSelectedStory || isUpdatingEstimationStatus}
                    >
                      {isUpdatingEstimationStatus ? 'Preparando...' : planningActionLabel}
                    </button>
                  </div>
                </header>

                {copyMessage ? (
                  <p className="history-copy-message" role="status">
                    {copyMessage}
                  </p>
                ) : null}
                {estimationActionMessage ? (
                  <p className="history-copy-message" role="status">
                    {estimationActionMessage}
                  </p>
                ) : null}

                <div className="history-preview__command-grid" aria-label="Comandos da peça selecionada">
                  {selectedOperationalCards.map((card) => {
                    const cardClassName = `history-preview__command-card history-preview__command-card--${card.tone}`
                    const content = (
                      <>
                        <span>{card.label}</span>
                        <strong>{card.title}</strong>
                        <p>{card.description}</p>
                      </>
                    )

                    return (
                      <article key={card.label} className={cardClassName}>
                        {content}
                        {card.to ? (
                          <Link className="btn btn-secondary btn-small" to={card.to}>
                            {card.actionLabel}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={card.action}
                            disabled={card.disabled}
                          >
                            {card.actionLabel}
                          </button>
                        )}
                      </article>
                    )
                  })}
                </div>

                <div className="history-preview__facts">
                  <div>
                    <span>Projeto atual</span>
                    <strong>{selectedProjectName}</strong>
                  </div>
                  <div>
                    <span>Última versão</span>
                    <strong>{latestVersionDate}</strong>
                  </div>
                  <div>
                    <span>Inspeção</span>
                    <strong>{qualityMeta.label} · {qualityScore}/100</strong>
                  </div>
                </div>

                {historyNextAction ? (
                  <section className="history-preview__next-action" aria-label="Próxima ação sugerida">
                    <div>
                      <span>{historyNextAction.eyebrow}</span>
                      <strong>{historyNextAction.title}</strong>
                      <p>{historyNextAction.description}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={historyNextAction.action}
                      disabled={historyNextAction.disabled}
                    >
                      {historyNextAction.actionLabel}
                    </button>
                  </section>
                ) : null}

                <details
                  id="history-project-assignment"
                  className="history-preview__project-assignment"
                  open={isProjectAssignmentOpen}
                  onToggle={(event) => setIsProjectAssignmentOpen(event.currentTarget.open)}
                >
                  <summary>
                    <span>
                      <small>Organização da peça</small>
                      <strong>{selectedProjectName}</strong>
                    </span>
                    <em>{selectedStory.project_id ? 'Alterar projeto' : 'Vincular projeto'}</em>
                  </summary>

                  <div className="history-preview__project-assignment-body">
                    <label className="history-filter-field">
                      <span>Vincular projeto</span>
                      <select
                        value={selectedStory.project_id ?? ''}
                        onChange={(event) => handleSelectedStoryProjectChange(event.target.value)}
                        disabled={!canAssignSelectedStoryProject || isAssigningProject}
                      >
                        <option value="">Sem projeto</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      {canAssignSelectedStoryProject
                        ? 'Use projetos para separar peças antigas por produto, squad ou iniciativa.'
                        : 'Histórias compartilhadas ficam somente para consulta.'}
                    </p>
                    {projectAssignmentMessage ? (
                      <p className="history-detail__project-message" role="status">
                        {projectAssignmentMessage}
                      </p>
                    ) : null}
                  </div>
                </details>

                <div className="history-preview__content">
                  <section>
                    <p className="history-page__eyebrow">Objetivo</p>
                    <h3>O que esta peça resolve</h3>
                    <p>{selectedResult.objective}</p>
                  </section>

                  <section className="history-preview__story">
                    <p className="history-page__eyebrow">User story</p>
                    <h3>Formulação principal</h3>
                    <p>{selectedResult.user_story}</p>
                  </section>

                  <section>
                    <p className="history-page__eyebrow">Critérios de aceite</p>
                    <h3>Checklist resumido</h3>
                    {previewCriteria.length > 0 ? (
                      <>
                        <ol className="history-preview__criteria">
                          {previewCriteria.map((criterion) => (
                            <li key={criterion}>{criterion}</li>
                          ))}
                        </ol>
                        {hiddenCriteriaCount > 0 ? (
                          <p className="history-preview__note">
                            Mais {hiddenCriteriaCount} {hiddenCriteriaCount === 1 ? 'critério' : 'critérios'} na inspeção completa.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="history-preview__note">Nenhum critério de aceite salvo nesta peça.</p>
                    )}
                  </section>
                </div>

                <div className="history-preview__secondary-actions" aria-label="Atalhos para detalhes avançados">
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('delivery')}>
                    Entrega
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('versions')}>
                    Ver versões
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('comparison')}>
                    Comparação
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('inspection')}>
                    Inspeção completa
                  </button>
                </div>
              </article>

              <section className="history-detail__advanced" aria-label="Detalhes avançados da peça selecionada">
                <HistoryAccordion
                  id="delivery"
                  eyebrow="Entrega"
                  title="Entregar artefato"
                  summary="Markdown, texto simples e formato para Jira"
                  open={openAdvancedSections.delivery}
                  onToggle={toggleAdvancedSection}
                >
                  <div className="history-delivery">
                    <div className="history-delivery__intro">
                      <p>
                        Escolha um formato, revise a prévia e copie o artefato para o backlog. O formato para Jira é
                        apenas texto estruturado; o ProdForge não envia dados para ferramentas externas nesta ação.
                      </p>
                    </div>

                    <div className="history-delivery__format-grid" aria-label="Formatos de entrega">
                      {DELIVERY_FORMAT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`history-delivery__format-card${
                            deliveryFormat === option.value ? ' history-delivery__format-card--active' : ''
                          }`}
                          onClick={() => setDeliveryFormat(option.value)}
                          aria-pressed={deliveryFormat === option.value}
                        >
                          <span>{option.label}</span>
                          <p>{option.description}</p>
                        </button>
                      ))}
                    </div>

                    <section className="history-delivery__preview" aria-label="Prévia do formato selecionado">
                      <header>
                        <div>
                          <span>Prévia de entrega</span>
                          <strong>{deliveryFormatLabel}</strong>
                        </div>
                        <em>{deliveryLineCount} {deliveryLineCount === 1 ? 'linha' : 'linhas'}</em>
                      </header>

                      <pre>
                        <code>{deliveryPreviewText}</code>
                      </pre>

                      <div className="history-delivery__metrics" aria-label="Conteúdo incluído no artefato">
                        {deliveryMetrics.map((metric) => (
                          <span key={metric.label}>
                            <strong>{metric.value}</strong>
                            {metric.label}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={handleCopySelectedDeliveryFormat}
                        disabled={isCopying || !deliveryPreviewText}
                      >
                        {isCopyingSelectedDeliveryFormat ? 'Copiando...' : 'Copiar formato selecionado'}
                      </button>
                    </section>

                    <p className="history-delivery__shortcut-label">Atalhos rápidos</p>
                    <div className="history-delivery__actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleCopyMarkdown}
                        disabled={isCopying}
                      >
                        {copyTarget === 'markdown' ? 'Copiando...' : 'Copiar artefato em Markdown'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleCopyJira}
                        disabled={isCopying}
                      >
                        {copyTarget === 'jira' ? 'Copiando...' : 'Copiar formato para Jira'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleCopyPlain}
                        disabled={isCopying}
                      >
                        {copyTarget === 'plain' ? 'Copiando...' : 'Copiar artefato'}
                      </button>
                    </div>
                  </div>
                </HistoryAccordion>

                <HistoryAccordion
                  id="versions"
                  eyebrow="Versões"
                  title="Linha do tempo"
                  summary={`${getVersionLabel(selectedVersionCount)} · Última versão: ${latestVersionDate}`}
                  open={openAdvancedSections.versions}
                  onToggle={toggleAdvancedSection}
                >
                  <VersionTimeline
                    versions={versions}
                    selectedId={selectedStory.id}
                    isLoading={isLoadingVersions}
                    onSelect={handleSelectVersion}
                  />
                </HistoryAccordion>

                <HistoryAccordion
                  id="comparison"
                  eyebrow="Comparação"
                  title="Resumo do refino"
                  summary={selectedVersionCount > 1 ? comparisonSummaryLabel : 'Sem comparação real ainda'}
                  open={openAdvancedSections.comparison}
                  onToggle={toggleAdvancedSection}
                >
                  {selectedVersionCount > 1 ? (
                    <VersionDiffSummary
                      currentVersion={currentVersionForComparison}
                      previousVersion={previousVersion}
                      onCopyComparison={handleCopyVersionComparison}
                      isCopying={isCopyingComparison}
                    />
                  ) : (
                    <p className="history-status">
                      Gere uma nova versão para comparar evolução, acabamento e critérios.
                    </p>
                  )}
                </HistoryAccordion>

                <HistoryAccordion
                  id="inspection"
                  eyebrow="Inspeção"
                  title="Inspeção completa e contexto"
                  summary={`${qualityMeta.label} · ${selectedResult.gaps.length} ${selectedResult.gaps.length === 1 ? 'trinca' : 'trincas'} · ${selectedResult.qa_checklist.length} itens de QA`}
                  open={openAdvancedSections.inspection}
                  onToggle={toggleAdvancedSection}
                >
                  <div className="history-inspection">
                    <div className="history-inspection__overview" aria-label="Resumo da inspeção">
                      <span>
                        <strong>{qualityScore}/100</strong>
                        qualidade
                      </span>
                      <span>
                        <strong>{selectedResult.gaps.length}</strong>
                        {selectedResult.gaps.length === 1 ? 'trinca' : 'trincas'}
                      </span>
                      <span>
                        <strong>{selectedResult.business_rules.length}</strong>
                        {selectedResult.business_rules.length === 1 ? 'regra' : 'regras'}
                      </span>
                      <span>
                        <strong>{selectedResult.qa_checklist.length}</strong>
                        {selectedResult.qa_checklist.length === 1 ? 'item de QA' : 'itens de QA'}
                      </span>
                    </div>

                    <section className="history-inspection__score">
                      <p className="history-page__eyebrow">Qualidade da peça</p>
                      <strong>{qualityScore}/100</strong>
                      <span>{qualityMeta.label}</span>
                      <p>{qualityMeta.note}</p>
                    </section>

                    <section>
                      <h3>Pontos de atenção</h3>
                      {selectedResult.gaps.length > 0 ? (
                        <ul>
                          {selectedResult.gaps.map((gap) => (
                            <li key={gap}>{gap}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhuma trinca crítica foi identificada nesta versão.</p>
                      )}
                    </section>

                    <section>
                      <h3>Checklist de QA</h3>
                      {selectedResult.qa_checklist.length > 0 ? (
                        <ul>
                          {selectedResult.qa_checklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>O checklist de QA ainda não veio preenchido para esta versão.</p>
                      )}
                    </section>

                    <section>
                      <h3>Regras e notas</h3>
                      {selectedResult.business_rules.length > 0 ? (
                        <ul>
                          {selectedResult.business_rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      ) : null}
                      {selectedResult.notes ? <p>{selectedResult.notes}</p> : null}
                    </section>

                    <section className="history-inspection__context">
                      <h3>Contexto original</h3>
                      {hasOriginalContext ? (
                        <>
                          {selectedStory.input_context?.trim() ? (
                            <div>
                              <span>Matéria-prima</span>
                              <p>{selectedStory.input_context}</p>
                            </div>
                          ) : null}
                          {selectedStory.input_requirements?.trim() ? (
                            <div>
                              <span>Ligas e regras informadas</span>
                              <p>{selectedStory.input_requirements}</p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p>Esta peça não tem contexto original salvo para consulta.</p>
                      )}
                    </section>
                  </div>
                </HistoryAccordion>
              </section>
            </>
          ) : (
            <section className="panel history-detail__empty">
              <p className="history-page__eyebrow">Preview</p>
              <h2>Selecione uma peça</h2>
              <p>A leitura rápida, as ações de cópia e os detalhes avançados aparecem aqui.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

export default HistoryPage
