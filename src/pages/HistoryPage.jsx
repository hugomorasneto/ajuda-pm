import { useCopy, useLanguage } from '../i18n/context'
import { localizeHref } from '../i18n/routes'
import Link from '../i18n/LocalizedLink'
import { resolveStoryNotes } from '../utils/storyFormat'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
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
  { value: 'today', label: 'today' },
  { value: '7d', label: '7_days' },
  { value: '30d', label: '30_days' },
  { value: 'all', label: 'all_time' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'generated', label: 'generated' },
  { value: 'reviewed', label: 'inspected' },
  { value: 'approved', label: 'approved' },
  { value: 'archived', label: 'archived' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const STATUS_LABELS = {
  generated: 'generated',
  reviewed: 'inspected',
  approved: 'approved',
  archived: 'archived',
}

const ESTIMATION_STATUS_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'created', label: 'created' },
  { value: 'refining', label: 'in_refinement' },
  { value: 'ready_for_estimation', label: 'ready_for_estimation' },
  { value: 'estimated', label: 'estimated' },
]

const ESTIMATION_STATUS_LABELS = {
  created: 'created',
  refining: 'in_refinement',
  ready_for_estimation: 'ready_for_estimation',
  estimated: 'estimated',
}

const PROJECT_FILTER_OPTIONS = [
  { value: 'all', label: 'all_2' },
  { value: 'none', label: 'no_project' },
  { value: 'project', label: 'by_project' },
]

const HISTORY_QUICK_FILTERS = [
  {
    value: 'all',
    label: 'all_2',
    description: 'artifacts_saved_in_your_history',
  },
  {
    value: 'without_project',
    label: 'no_project',
    description: 'standalone_artifacts_to_organize',
  },
  {
    value: 'ready_for_estimation',
    label: 'ready_for_estimation_2',
    description: 'artifacts_prepared_for_planning_poker',
  },
  {
    value: 'estimated',
    label: 'estimated_2',
    description: 'artifacts_with_a_final_estimate',
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
    label: 'markdown',
    description: 'complete_artifact_for_your_backlog_documentation',
    successMessage: 'markdown_artifact_copied',
  },
  {
    value: 'plain',
    label: 'plain_text',
    description: 'user_story_and_acceptance_criteria_in',
    successMessage: 'plain_text_artifact_copied',
  },
  {
    value: 'jira',
    label: 'jira_format',
    description: 'structured_text_to_paste_into_an',
    successMessage: 'jira_text_copied_review_it_before',
  },
  {
    value: 'story',
    label: 'user_story_only',
    description: 'the_main_statement_for_quick_sharing',
    successMessage: 'user_story_copied',
  },
]

function getStatusLabel(status, t) {
  return t(STATUS_LABELS[status] ?? 'generated')
}

function getDeliveryFormatLabel(value, t) {
  return t(DELIVERY_FORMAT_OPTIONS.find((option) => option.value === value)?.label ?? 'markdown')
}

function buildDeliveryText(story, format, t) {
  if (!story) return ''

  if (format === 'story') return story.user_story ?? ''
  if (format === 'plain') return buildStoryPlainText(story, t)
  if (format === 'jira') return buildStoryJiraLike(story, t)

  return buildStoryMarkdown(story, t)
}

function getEstimationStatusLabel(status, t) {
  return t(ESTIMATION_STATUS_LABELS[status] ?? 'created')
}

function getOptionLabel(options, value, fallback, t) {
  return t(options.find((option) => option.value === value)?.label ?? fallback)
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
    storedStatus: story.status ?? 'generated',
    refinementInstruction: story.regeneration_instruction,
  }
}

function getVisibleRange({ page, pageSize, totalCount, itemCount }, formatNumber) {
  if (totalCount === 0) return '0-0'
  const start = (page - 1) * pageSize + 1
  const end = start + itemCount - 1
  return `${formatNumber(start)}-${formatNumber(end)}`
}

function getVersionCount(story) {
  const count = Number(story?.versions_count ?? story?.version_number ?? 1)
  return Number.isFinite(count) && count > 0 ? count : 1
}

function getProjectName(story, projects, t) {
  if (story?.project_name) return story.project_name
  if (story?.project_id) {
    return projects.find((project) => project.id === story.project_id)?.name ?? t('linked_project')
  }
  return t('no_project')
}

function getStoryPreview(story) {
  return story?.input_context?.trim() || story?.input_requirements?.trim() || story?.user_story?.trim() || ''
}

function getHistoryItemNextAction(story, t) {
  if (!story?.project_id) {
    return {
      label: t('organize'),
      text: t('no_project'),
    }
  }

  if (story.estimation_status === 'ready_for_estimation') {
    return {
      label: t('planning_poker'),
      text: t('ready_for_estimation'),
    }
  }

  if (story.estimation_status === 'estimated') {
    return {
      label: t('estimation'),
      text: t('estimate_recorded'),
    }
  }

  return {
    label: t('review'),
    text: t('ready_for_preparation'),
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
  const t = useCopy('history')
  if (isLoading) {
    return (
      <div className="history-state history-state--loading" role="status">
        <span aria-hidden="true" />
        <p>{t('loading_story_history')}</p>
      </div>
    )
  }

  if (loadError) {
    return <p className="history-status history-status-error">{t(loadError)}</p>
  }

  if (!hasItems) {
    return (
      <article className="history-empty-card">
        <p className="history-page__eyebrow">{t('empty_history')}</p>
        <h3>{t('no_artifacts_yet')}</h3>
        <p>{t('create_your_first_brief_to_generate')}</p>
        <Link className="btn btn-primary btn-small" to="/tool">{t('create_your_first_brief')}</Link>
      </article>
    )
  }

  return null
}

function HistoryPage() {
  const t = useCopy('history')
  const storyFormat = useCopy('storyFormat')
  const { language, preview } = useLanguage()
  const formatNumber = new Intl.NumberFormat(language).format
  const getVersionLabel = (count) => t('version_count', { count, value: formatNumber(count) })
  const localizedPath = (path) => preview ? localizeHref(path, language) : path
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
  const selectedNotes = selectedResult ? resolveStoryNotes(selectedResult, storyFormat) : null
  const deliveryPreviewText = useMemo(
    () => buildDeliveryText(selectedResult, deliveryFormat, storyFormat),
    [deliveryFormat, selectedResult, storyFormat],
  )
  const deliveryFormatLabel = useMemo(
    () => getDeliveryFormatLabel(deliveryFormat, t),
    [deliveryFormat, t],
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
      }, storyFormat),
    [currentVersionForComparison, previousVersion, storyFormat],
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
      label: t('story_history'),
      title: selectedStory?.title || t('story_history'),
      pills: [
        { text: t('artifact_count', { count: totalCount, value: new Intl.NumberFormat(language).format(totalCount) }) },
        { text: t('per_page', { p1: pageSize }) },
      ],
    })

    return () => setTopbarStatus(null)
  }, [setTopbarStatus, selectedStory, totalCount, pageSize, t, language])

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
          'could_not_load_story_history_try',
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
      successMessage: 'user_story_copied',
      errorMessage: 'could_not_copy_the_user_story',
      logMessage: 'Falha ao copiar user story do histórico:',
    })
  }

  async function handleCopyPlain() {
    await copySelectedText({
      target: 'plain',
      value: buildStoryPlainText(selectedResult, storyFormat),
      successMessage: 'artifact_copied',
      errorMessage: 'could_not_copy_the_artifact_try',
      logMessage: 'Falha ao copiar texto simples do histórico:',
    })
  }

  async function handleCopyMarkdown() {
    await copySelectedText({
      target: 'markdown',
      value: buildStoryMarkdown(selectedResult, storyFormat),
      successMessage: 'markdown_artifact_copied',
      errorMessage: 'could_not_copy_the_markdown_artifact',
      logMessage: 'Falha ao copiar exportação em Markdown do histórico:',
    })
  }

  async function handleCopyJira() {
    await copySelectedText({
      target: 'jira',
      value: buildStoryJiraLike(selectedResult, storyFormat),
      successMessage: 'jira_text_copied_review_it_before',
      errorMessage: 'could_not_copy_jira_text_try',
      logMessage: 'Falha ao copiar formato textual para Jira do histórico:',
    })
  }

  async function handleCopySelectedDeliveryFormat() {
    const option = DELIVERY_FORMAT_OPTIONS.find((item) => item.value === deliveryFormat)
    await copySelectedText({
      target: selectedDeliveryCopyTarget,
      value: deliveryPreviewText,
      successMessage: option?.successMessage ?? 'artifact_copied',
      errorMessage: 'could_not_copy_the_artifact_try',
      logMessage: 'Falha ao copiar formato de entrega do histórico:',
    })
  }

  async function handleCopyVersionComparison() {
    await copySelectedText({
      target: 'comparison',
      value: comparisonMarkdown,
      successMessage: 'version_comparison_copied',
      errorMessage: 'could_not_copy_the_comparison_try',
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
        'only_the_story_s_author_can',
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
        'could_not_organize_the_story_try',
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
        ? 'story_organized_in_the_selected_project'
        : 'story_marked_as_having_no_project',
    )
  }

  async function prepareSelectedStoryForEstimation() {
    if (!selectedStory?.id || !userId) return false

    setEstimationActionMessage('')

    if (selectedStory.user_id !== userId) {
      setEstimationActionMessage(
        'only_the_story_s_author_can_2',
      )
      return false
    }

    if (!selectedStory.project_id) {
      setEstimationActionMessage(
        'link_the_story_to_a_project',
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
        'could_not_prepare_the_story_try',
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
    setEstimationActionMessage('story_ready_for_estimation')
    return true
  }

  async function handleOpenPlanningPoker() {
    if (!selectedStory?.id) return

    setEstimationActionMessage('')

    if (!selectedStory.project_id) {
      setEstimationActionMessage(
        'link_the_story_to_a_project_2',
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
  }, formatNumber)
  const selectedGroupKey = selectedStory?.story_group_id ?? selectedStory?.id ?? null
  const canAssignSelectedStoryProject = Boolean(selectedStory?.id && selectedStory.user_id === userId)
  const canPrepareSelectedStory = Boolean(selectedStory?.id && selectedStory.user_id === userId)
  const selectedProjectName = getProjectName(selectedStory, projects, t)
  const selectedVersionCount = Math.max(versions.length, getVersionCount(selectedStory))
  const latestVersionDate = formatDateTime(versions[0]?.created_at ?? selectedStory?.created_at, language)
  const qualityScore = selectedResult ? getResolvedQualityScore(selectedResult) : 0
  const qualityMeta = getScoreMeta(qualityScore, storyFormat)
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
      label: t('current_results'),
      value: totalCount,
      detail: totalCount === 1 ? t('artifact_found') : t('artifacts_found'),
    },
    {
      label: t('on_this_page'),
      value: items.length,
      detail: t('visible_now'),
    },
    {
      label: t('no_project'),
      value: currentPageWithoutProjectCount,
      detail: t('to_organize'),
    },
    {
      label: t('planning_poker'),
      value: currentPageReadyCount + currentPageEstimatedCount,
      detail: t('ready_or_estimated'),
    },
  ]
  const filterSummaryItems = [
    { label: t('period'), value: getOptionLabel(PERIOD_OPTIONS, period, 'all_time', t) },
    { label: t('status_2'), value: getOptionLabel(STATUS_OPTIONS, status, 'all', t) },
    { label: t('estimation'), value: getOptionLabel(ESTIMATION_STATUS_OPTIONS, estimationStatus, 'all', t) },
    {
      label: t('project'),
      value: projectFilter === 'project'
        ? projects.find((project) => project.id === selectedProjectId)?.name ?? t('project')
        : getOptionLabel(PROJECT_FILTER_OPTIONS, projectFilter, 'all_2', t),
    },
    { label: t('page'), value: t('per_page', { p1: pageSize }) },
  ]
  const isCopying = Boolean(copyTarget)
  const isCopyingSelectedDeliveryFormat = copyTarget === selectedDeliveryCopyTarget
  const isCopyingComparison = copyTarget === 'comparison'
  const comparisonSummaryLabel = comparisonDiff
    ? `${formatNumber(comparisonDiff.totalChanges)} ${comparisonDiff.totalChanges === 1 ? t('change_detected') : t('changes_detected')}`
    : t('no_comparison_yet')
  const activeQuickFilter = getActiveQuickFilter()
  const deliveryMetrics = selectedResult
    ? [
        {
          label: t('criteria'),
          value: selectedResult.acceptance_criteria.length,
        },
        {
          label: t('rules'),
          value: selectedResult.business_rules.length,
        },
        {
          label: t('gaps'),
          value: selectedResult.gaps.length,
        },
        {
          label: t('qa'),
          value: selectedResult.qa_checklist.length,
        },
      ]
    : []
  let planningActionLabel = t('prepare_and_open_planning_poker')
  if (selectedStory?.estimation_status === 'estimated') {
    planningActionLabel = t('view_project_sessions')
  } else if (selectedStory?.estimation_status === 'ready_for_estimation') {
    planningActionLabel = t('open_planning_poker')
  }
  const historyNextAction = (() => {
    if (!selectedStory) return null

    if (selectedStory.user_id !== userId) {
      return {
        eyebrow: t('read_only_access'),
        title: t('shared_artifact'),
        description: t('you_can_review_and_copy_this'),
        actionLabel: t('open_in_workspace'),
        action: () => navigate(localizedPath(`/tool?storyId=${selectedStory.id}`)),
        disabled: false,
      }
    }

    if (!selectedStory.project_id) {
      return {
        eyebrow: t('organization'),
        title: t('link_to_a_project'),
        description: t('projects_support_organization_by_initiative_kanban'),
        actionLabel: t('link_project'),
        action: handleOpenProjectAssignment,
        disabled: !canAssignSelectedStoryProject,
      }
    }

    if (selectedStory.estimation_status === 'estimated') {
      return {
        eyebrow: t('estimation'),
        title: t('estimate_recorded_2'),
        description: t('see_the_project_sessions_or_reopen'),
        actionLabel: t('view_estimate'),
        action: handleOpenPlanningPoker,
        disabled: isUpdatingEstimationStatus,
      }
    }

    if (selectedStory.estimation_status === 'ready_for_estimation') {
      return {
        eyebrow: t('estimation'),
        title: t('ready_for_planning_poker'),
        description: t('this_artifact_is_ready_for_a'),
        actionLabel: t('open_planning_poker'),
        action: handleOpenPlanningPoker,
        disabled: isUpdatingEstimationStatus,
      }
    }

    return {
      eyebrow: t('next_action'),
      title: t('prepare_for_estimation'),
      description: t('mark_the_artifact_as_ready_and'),
      actionLabel: isUpdatingEstimationStatus ? t('preparing') : t('prepare_and_open_planning_poker'),
      action: handleOpenPlanningPoker,
      disabled: isUpdatingEstimationStatus || !canPrepareSelectedStory,
    }
  })()
  const selectedOperationalCards = selectedStory
    ? [
        {
          label: t('delivery'),
          title: t('prepare_to_copy'),
          description: t('current_format_review_the_preview_before', { p1: deliveryFormatLabel }),
          actionLabel: t('open_delivery'),
          action: () => openAdvancedSection('delivery'),
          tone: 'delivery',
        },
        {
          label: t('organization'),
          title: selectedProjectName,
          description: selectedStory.project_id
            ? t('this_artifact_is_linked_to_a')
            : t('link_this_standalone_artifact_to_a'),
          actionLabel: selectedStory.project_id ? t('open_project') : t('link_project'),
          to: selectedStory.project_id ? `/projetos/${selectedStory.project_id}` : null,
          action: selectedStory.project_id ? null : handleOpenProjectAssignment,
          disabled: !selectedStory.project_id && !canAssignSelectedStoryProject,
          tone: selectedStory.project_id ? 'project' : 'organize',
        },
        {
          label: t('estimation'),
          title: getEstimationStatusLabel(selectedStory.estimation_status, t),
          description: selectedStory.project_id
            ? t('prepare_or_open_planning_poker_when')
            : t('planning_poker_requires_a_project_organize'),
          actionLabel: selectedStory.project_id ? planningActionLabel : t('link_project'),
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
          label: t('quality'),
          title: `${qualityMeta.label} · ${qualityScore}/100`,
          description: t('inspection_recorded_and', { p1: formatNumber(gapsCount), p2: t('gap', { count: gapsCount }), p3: formatNumber(qaCount), p4: qaCount === 1 ? t('qa_item') : t('qa_items') }),
          actionLabel: t('view_inspection'),
          action: () => openAdvancedSection('inspection'),
          tone: qualityScore >= 80 ? 'quality' : 'warning',
        },
      ]
    : []

  return (
    <div className="history-page">
      <section className="panel history-page__hero">
        <div className="history-page__hero-copy">
          <p className="history-page__eyebrow">{t('story_history')}</p>
          <h1>{t('story_history')}</h1>
          <p>{t('find_review_copy_and_reopen_user')}</p>
        </div>
        <Link className="btn btn-secondary btn-small" to="/tool">{t('new_brief')}</Link>
      </section>

      {totalCount > 0 ? (
        <section className="history-summary-strip" aria-label={t('story_history_summary')}>
          {historySummaryItems.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{typeof item.value === 'number' ? formatNumber(item.value) : item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </section>
      ) : null}

      <section className="panel history-filters" aria-label={t('story_history_filters')}>
        <div className="history-filters__primary">
          <label className="history-filter-field history-filter-field--search">
            <span>{t('search_artifacts')}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('title_brief_user_story_or_criterion')}
            />
          </label>

          <div className="history-filters__applied" aria-live="polite">
            <span>{t('current_view')}</span>
            <div className="history-filters__applied-list">
              {filterSummaryItems.map((item) => (
                <span key={item.label} className="history-filters__applied-chip">
                  <small>{item.label}</small>
                  <strong>{typeof item.value === 'number' ? formatNumber(item.value) : item.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="history-quick-filters" aria-label={t('quick_filters_for_story_history')}>
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
                <span>{t(option.label)}</span>
                <small>{t(option.description)}</small>
              </button>
            )
          })}
        </div>

        <details className="history-filters__advanced">
          <summary>
            <span>{t('advanced_filters')}</span>
            <em>{t('period_status_estimation_project_and_pagination')}</em>
          </summary>

          <div className="history-filters__grid">
            <label className="history-filter-field">
              <span>{t('period')}</span>
              <select value={period} onChange={(event) => resetPageWith(setPeriod, event.target.value)}>
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter-field">
              <span>{t('status_2')}</span>
              <select value={status} onChange={(event) => resetPageWith(setStatus, event.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter-field">
              <span>{t('estimation')}</span>
              <select
                value={estimationStatus}
                onChange={(event) => resetPageWith(setEstimationStatus, event.target.value)}
              >
                {ESTIMATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter-field">
              <span>{t('project')}</span>
              <select value={projectFilter} onChange={(event) => handleProjectFilterChange(event.target.value)}>
                {PROJECT_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>

            {projectFilter === 'project' ? (
              <label className="history-filter-field">
                <span>{t('choose_project')}</span>
                <select
                  value={selectedProjectId}
                  onChange={(event) => handleSelectedProjectChange(event.target.value)}
                  disabled={projects.length === 0}
                >
                  {projects.length === 0 ? <option value="">{t('no_projects')}</option> : null}
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="history-filter-field">
              <span>{t('per_page_2')}</span>
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
        <section className="panel history-results" aria-label={t('story_history_results')}>
          <div className="history-results__header">
            <div>
              <p className="history-page__eyebrow">{t('results')}</p>
              <h2>{t('artifact_count', { count: totalCount, value: formatNumber(totalCount) })}</h2>
            </div>
            <span className="history-results__range">
              {t('result_range', { range: visibleRange, total: formatNumber(totalCount) })}
            </span>
          </div>

          <HistoryListState isLoading={isLoading} loadError={loadError} hasItems={items.length > 0} />

          <div className="history-results__list">
            {items.map((item) => {
              const itemGroupKey = item.story_group_id ?? item.id
              const isActive = itemGroupKey === selectedGroupKey
              const preview = getStoryPreview(item)
              const versionCount = getVersionCount(item)
              const itemProjectName = item.project_name || t('no_project')
              const nextAction = getHistoryItemNextAction(item, t)
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
                    <h3 title={item.title}>{item.title}</h3>
                    <span
                      className="history-result-card__action"
                      title={isActive ? t('artifact_open_in_preview') : t('view_artifact_details')}
                    >
                      {isActive ? t('open') : t('view')}
                    </span>
                  </div>

                  {preview ? (
                    <p title={preview}>{preview}</p>
                  ) : (
                    <p>{t('this_artifact_has_no_brief_summary')}</p>
                  )}

                  <div className="history-result-card__next">
                    <span>{nextAction.label}</span>
                    <strong title={nextAction.text}>{nextAction.text}</strong>
                  </div>

                  <div className="history-result-card__context" aria-label={t('artifact_context')}>
                    <span>{formatDateTime(item.created_at, language)}</span>
                    <strong title={itemProjectName}>{itemProjectName}</strong>
                  </div>

                  <div className="history-result-card__meta" aria-label={t('artifact_details')}>
                    <span title={getVersionLabel(versionCount)}>{getVersionLabel(versionCount)}</span>
                    <span title={getStatusLabel(item.status, t)}>{getStatusLabel(item.status, t)}</span>
                    <span title={getEstimationStatusLabel(item.estimation_status, t)}>
                      {getEstimationStatusLabel(item.estimation_status, t)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="history-pagination" aria-label={t('story_history_pagination')}>
            <div className="history-pagination__controls">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => goToPage(1)} disabled={page <= 1}>{t('first')}</button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >{t('previous')}</button>
            </div>
            <form className="history-pagination__jump" onSubmit={handlePageJump}>
              <label htmlFor="history-page-jump">{t('page')}</label>
              <input
                id="history-page-jump"
                type="number"
                min="1"
                max={Math.max(totalPages, 1)}
                value={pageJump}
                onChange={(event) => setPageJump(event.target.value)}
              />
              <span>{t('page_count', { total: formatNumber(Math.max(totalPages, 1)) })}</span>
              <button type="submit" className="btn btn-ghost btn-small">{t('go')}</button>
            </form>
            <div className="history-pagination__controls">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => goToPage(page + 1)}
                disabled={totalPages === 0 || page >= totalPages}
              >{t('next')}</button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => goToPage(totalPages)}
                disabled={totalPages === 0 || page >= totalPages}
              >{t('last')}</button>
            </div>
          </div>
        </section>

        <aside className="history-detail" aria-label={t('selected_artifact_details')}>
          {selectedResult ? (
            <>
              <article className="panel history-preview">
                <header className="history-preview__header">
                  <div className="history-preview__copy">
                    <p className="history-page__eyebrow">{t('selected_preview')}</p>
                    <h2 title={selectedStory.title}>{selectedStory.title}</h2>
                    <div className="history-preview__badges" aria-label={t('selected_artifact_summary')}>
                      <span title={getStatusLabel(selectedStory.status, t)}>{getStatusLabel(selectedStory.status, t)}</span>
                      <span title={selectedProjectName}>{selectedProjectName}</span>
                      <span title={getVersionLabel(selectedVersionCount)}>{getVersionLabel(selectedVersionCount)}</span>
                      <span title={getEstimationStatusLabel(selectedStory.estimation_status, t)}>
                        {getEstimationStatusLabel(selectedStory.estimation_status, t)}
                      </span>
                    </div>
                  </div>

                  <div className="history-preview__actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => navigate(localizedPath(`/tool?storyId=${selectedStory.id}`))}
                    >{t('open_in_workspace')}</button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleCopyUserStory}
                      disabled={isCopying}
                    >
                      {copyTarget === 'story' ? t('copying') : t('copy_user_story')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleCopyPlain}
                      disabled={isCopying}
                    >
                      {copyTarget === 'plain' ? t('copying') : t('copy_artifact')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleOpenPlanningPoker}
                      disabled={!canPrepareSelectedStory || isUpdatingEstimationStatus}
                    >
                      {isUpdatingEstimationStatus ? t('preparing') : planningActionLabel}
                    </button>
                  </div>
                </header>

                {copyMessage ? (
                  <p className="history-copy-message" role="status">
                    {t(copyMessage)}
                  </p>
                ) : null}
                {estimationActionMessage ? (
                  <p className="history-copy-message" role="status">
                    {t(estimationActionMessage)}
                  </p>
                ) : null}

                <div className="history-preview__command-grid" aria-label={t('selected_artifact_actions')}>
                  {selectedOperationalCards.map((card) => {
                    const cardClassName = `history-preview__command-card history-preview__command-card--${card.tone}`
                    const content = (
                      <>
                        <span>{card.label}</span>
                        <strong title={card.title}>{card.title}</strong>
                        <p title={card.description}>{card.description}</p>
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
                    <span>{t('current_project')}</span>
                    <strong title={selectedProjectName}>{selectedProjectName}</strong>
                  </div>
                  <div>
                    <span>{t('latest_version')}</span>
                    <strong title={latestVersionDate}>{latestVersionDate}</strong>
                  </div>
                  <div>
                    <span>{t('inspection')}</span>
                    <strong title={`${qualityMeta.label} · ${qualityScore}/100`}>
                      {qualityMeta.label} · {qualityScore}/100
                    </strong>
                  </div>
                </div>

                {historyNextAction ? (
                  <section className="history-preview__next-action" aria-label={t('suggested_next_action')}>
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
                      <small>{t('artifact_organization')}</small>
                      <strong title={selectedProjectName}>{selectedProjectName}</strong>
                    </span>
                    <em title={selectedStory.project_id ? t('change_project') : t('link_project')}>
                      {selectedStory.project_id ? t('change_project') : t('link_project')}
                    </em>
                  </summary>

                  <div className="history-preview__project-assignment-body">
                    <label className="history-filter-field">
                      <span>{t('link_project')}</span>
                      <select
                        value={selectedStory.project_id ?? ''}
                        onChange={(event) => handleSelectedStoryProjectChange(event.target.value)}
                        disabled={!canAssignSelectedStoryProject || isAssigningProject}
                      >
                        <option value="">{t('no_project')}</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      {canAssignSelectedStoryProject
                        ? t('use_projects_to_group_older_artifacts')
                        : t('shared_stories_are_read_only')}
                    </p>
                    {projectAssignmentMessage ? (
                      <p className="history-detail__project-message" role="status">
                        {t(projectAssignmentMessage)}
                      </p>
                    ) : null}
                  </div>
                </details>

                <div className="history-preview__content">
                  <section>
                    <p className="history-page__eyebrow">{t('goal')}</p>
                    <h3>{t('what_this_artifact_solves')}</h3>
                    <p>{selectedResult.objective}</p>
                  </section>

                  <section className="history-preview__story">
                    <p className="history-page__eyebrow">{t('user_story')}</p>
                    <h3>{t('main_statement')}</h3>
                    <p>{selectedResult.user_story}</p>
                  </section>

                  <section>
                    <p className="history-page__eyebrow">{t('acceptance_criteria')}</p>
                    <h3>{t('checklist_summary')}</h3>
                    {previewCriteria.length > 0 ? (
                      <>
                        <ol className="history-preview__criteria">
                          {previewCriteria.map((criterion) => (
                            <li key={criterion}>{criterion}</li>
                          ))}
                        </ol>
                        {hiddenCriteriaCount > 0 ? (
                          <p className="history-preview__note">{t('additional_criteria', { count: hiddenCriteriaCount, value: formatNumber(hiddenCriteriaCount) })}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="history-preview__note">{t('this_artifact_has_no_saved_acceptance')}</p>
                    )}
                  </section>
                </div>

                <div className="history-preview__secondary-actions" aria-label={t('shortcuts_to_advanced_details')}>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('delivery')}>{t('delivery')}</button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('versions')}>{t('view_versions')}</button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('comparison')}>{t('comparison')}</button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => openAdvancedSection('inspection')}>{t('full_inspection')}</button>
                </div>
              </article>

              <section className="history-detail__advanced" aria-label={t('advanced_details_for_the_selected_artifact')}>
                <HistoryAccordion
                  id="delivery"
                  eyebrow={t('delivery')}
                  title={t('deliver_artifact')}
                  summary={t('markdown_plain_text_and_jira_format')}
                  open={openAdvancedSections.delivery}
                  onToggle={toggleAdvancedSection}
                >
                  <div className="history-delivery">
                    <div className="history-delivery__intro">
                      <p>{t('choose_a_format_review_the_preview')}</p>
                    </div>

                    <div className="history-delivery__format-grid" aria-label={t('delivery_formats')}>
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
                          <span>{t(option.label)}</span>
                          <p>{t(option.description)}</p>
                        </button>
                      ))}
                    </div>

                    <section className="history-delivery__preview" aria-label={t('selected_format_preview')}>
                      <header>
                        <div>
                          <span>{t('delivery_preview')}</span>
                          <strong>{deliveryFormatLabel}</strong>
                        </div>
                        <em>{t('line_count', { count: deliveryLineCount, value: formatNumber(deliveryLineCount) })}</em>
                      </header>

                      <pre>
                        <code>{deliveryPreviewText}</code>
                      </pre>

                      <div className="history-delivery__metrics" aria-label={t('content_included_in_the_artifact')}>
                        {deliveryMetrics.map((metric) => (
                          <span key={metric.label}>
                            <strong>{formatNumber(metric.value)}</strong>
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
                        {isCopyingSelectedDeliveryFormat ? t('copying') : t('copy_selected_format')}
                      </button>
                    </section>

                    <p className="history-delivery__shortcut-label">{t('quick_actions')}</p>
                    <div className="history-delivery__actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleCopyMarkdown}
                        disabled={isCopying}
                      >
                        {copyTarget === 'markdown' ? t('copying') : t('copy_markdown_artifact')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleCopyJira}
                        disabled={isCopying}
                      >
                        {copyTarget === 'jira' ? t('copying') : t('copy_jira_format')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleCopyPlain}
                        disabled={isCopying}
                      >
                        {copyTarget === 'plain' ? t('copying') : t('copy_artifact')}
                      </button>
                    </div>
                  </div>
                </HistoryAccordion>

                <HistoryAccordion
                  id="versions"
                  eyebrow={t('versions')}
                  title={t('timeline')}
                  summary={t('latest_version_2', { p1: getVersionLabel(selectedVersionCount), p2: latestVersionDate })}
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
                  eyebrow={t('comparison')}
                  title={t('refinement_summary')}
                  summary={selectedVersionCount > 1 ? comparisonSummaryLabel : t('no_comparison_yet')}
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
                    <p className="history-status">{t('generate_a_new_version_to_compare')}</p>
                  )}
                </HistoryAccordion>

                <HistoryAccordion
                  id="inspection"
                  eyebrow={t('inspection')}
                  title={t('full_inspection_and_context')}
                  summary={t('inspection_card_summary', {
                    quality: qualityMeta.label,
                    gaps: formatNumber(gapsCount),
                    gapLabel: t('gap', { count: gapsCount }),
                    qa: t('qa_count', { count: qaCount, value: formatNumber(qaCount) }),
                  })}
                  open={openAdvancedSections.inspection}
                  onToggle={toggleAdvancedSection}
                >
                  <div className="history-inspection">
                    <div className="history-inspection__overview" aria-label={t('inspection_summary')}>
                      <span>
                        <strong>{qualityScore}/100</strong>{t('quality_2')}</span>
                      <span>
                        <strong>{selectedResult.gaps.length}</strong>
                        {t('gap', { count: selectedResult.gaps.length })}
                      </span>
                      <span>
                        <strong>{selectedResult.business_rules.length}</strong>
                        {selectedResult.business_rules.length === 1 ? 'regra' : 'regras'}
                      </span>
                      <span>
                        <strong>{selectedResult.qa_checklist.length}</strong>
                        {selectedResult.qa_checklist.length === 1 ? t('qa_item') : t('qa_items')}
                      </span>
                    </div>

                    <section className="history-inspection__score">
                      <p className="history-page__eyebrow">{t('artifact_quality')}</p>
                      <strong>{qualityScore}/100</strong>
                      <span>{qualityMeta.label}</span>
                      <p>{qualityMeta.note}</p>
                    </section>

                    <section>
                      <h3>{t('points_to_review')}</h3>
                      {selectedResult.gaps.length > 0 ? (
                        <ul>
                          {selectedResult.gaps.map((gap) => (
                            <li key={gap}>{gap}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{t('this_version_has_no_identified_critical')}</p>
                      )}
                    </section>

                    <section>
                      <h3>{t('qa_checklist')}</h3>
                      {selectedResult.qa_checklist.length > 0 ? (
                        <ul>
                          {selectedResult.qa_checklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{t('this_version_has_no_qa_checklist')}</p>
                      )}
                    </section>

                    <section>
                      <h3>{t('rules_and_notes')}</h3>
                      {selectedResult.business_rules.length > 0 ? (
                        <ul>
                          {selectedResult.business_rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      ) : null}
                      {selectedNotes ? <p>{selectedNotes}</p> : null}
                    </section>

                    <section className="history-inspection__context">
                      <h3>{t('original_context')}</h3>
                      {hasOriginalContext ? (
                        <>
                          {selectedStory.input_context?.trim() ? (
                            <div>
                              <span>{t('brief')}</span>
                              <p>{selectedStory.input_context}</p>
                            </div>
                          ) : null}
                          {selectedStory.input_requirements?.trim() ? (
                            <div>
                              <span>{t('provided_rules_and_constraints')}</span>
                              <p>{selectedStory.input_requirements}</p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p>{t('this_artifact_has_no_saved_original')}</p>
                      )}
                    </section>
                  </div>
                </HistoryAccordion>
              </section>
            </>
          ) : (
            <section className="panel history-detail__empty">
              <p className="history-page__eyebrow">{t('preview')}</p>
              <h2>{t('select_an_artifact')}</h2>
              <p>{t('find_a_quick_summary_copy_actions')}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

export default HistoryPage
