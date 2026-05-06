import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
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
} from '../services/userStoriesService'
import { listProjects } from '../services/projectsService'
import {
  buildStoryJiraLike,
  buildStoryMarkdown,
  copyTextToClipboard,
} from '../utils/storyExport'

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

const INITIAL_ADVANCED_SECTIONS = {
  delivery: false,
  versions: false,
  comparison: false,
  inspection: false,
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Forjado'
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

function buildPlainText(story) {
  const acceptanceCriteria = Array.isArray(story?.acceptance_criteria)
    ? story.acceptance_criteria
    : []

  return [
    `User story: ${story?.user_story ?? '-'}`,
    '',
    'Critérios de aceite:',
    ...acceptanceCriteria.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')
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
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [period, setPeriod] = useState('7d')
  const [status, setStatus] = useState('all')
  const [estimationStatus, setEstimationStatus] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [selectedProjectId, setSelectedProjectId] = useState('')
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
  const [openAdvancedSections, setOpenAdvancedSections] = useState(INITIAL_ADVANCED_SECTIONS)

  const selectedResult = useMemo(() => mapStoryRowToResult(selectedStory), [selectedStory])
  const selectedVersion = useMemo(
    () => versions.find((item) => item.id === selectedStory?.id) ?? null,
    [selectedStory, versions],
  )
  const previousVersion = useMemo(() => {
    if (!selectedVersion?.version_number) return null
    return versions.find((item) => item.version_number === selectedVersion.version_number - 1) ?? null
  }, [selectedVersion, versions])

  const selectStory = useCallback(
    async (story) => {
      if (!story || !userId) return

      setSelectedStory(story)
      setCopyMessage('')
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
      return
    }

    const response = await getUserStoryById(storyId, userId)
    if (response.success && response.data) {
      setSelectedStory(response.data)
      setCopyMessage('')
      setProjectAssignmentMessage('')
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
      value: buildPlainText(selectedResult),
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

  function resetPageWith(nextValueSetter, value) {
    nextValueSetter(value)
    setPage(1)
    setPageJump('1')
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
    setPage(1)
    setPageJump('1')
  }

  function handleSelectedProjectChange(value) {
    setSelectedProjectId(value)
    setPage(1)
    setPageJump('1')
  }

  async function handleSelectedStoryProjectChange(value) {
    if (!selectedStory || !userId) return

    setProjectAssignmentMessage('')

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
  const selectedProjectName = getProjectName(selectedStory, projects)
  const selectedVersionCount = Math.max(versions.length, getVersionCount(selectedStory))
  const latestVersionDate = formatDateTime(versions[0]?.created_at ?? selectedStory?.created_at)
  const qualityScore = selectedResult ? getResolvedQualityScore(selectedResult) : 0
  const qualityMeta = getScoreMeta(qualityScore)
  const acceptanceCriteria = selectedResult?.acceptance_criteria ?? []
  const previewCriteria = acceptanceCriteria.slice(0, 3)
  const hiddenCriteriaCount = Math.max(0, acceptanceCriteria.length - previewCriteria.length)
  const hasOriginalContext = Boolean(
    selectedStory?.input_context?.trim() || selectedStory?.input_requirements?.trim(),
  )
  const filterSummary = [
    getOptionLabel(PERIOD_OPTIONS, period, 'Tudo'),
    getOptionLabel(STATUS_OPTIONS, status, 'Todos'),
    getOptionLabel(ESTIMATION_STATUS_OPTIONS, estimationStatus, 'Todos'),
    projectFilter === 'project'
      ? projects.find((project) => project.id === selectedProjectId)?.name ?? 'Projeto'
      : getOptionLabel(PROJECT_FILTER_OPTIONS, projectFilter, 'Todas'),
    `${pageSize} por página`,
  ].join(' · ')
  const isCopying = Boolean(copyTarget)

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
            <strong>{filterSummary}</strong>
          </div>
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

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`history-result-card ${isActive ? 'history-result-card--active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    setProjectAssignmentMessage('')
                    selectStory(item)
                  }}
                >
                  <div className="history-result-card__title-row">
                    <h3>{item.title}</h3>
                    <span className="history-result-card__action">
                      {isActive ? 'Selecionada' : 'Ver detalhes'}
                    </span>
                  </div>

                  {preview ? <p>{preview}</p> : <p>Peça salva sem resumo de matéria-prima.</p>}

                  <div className="history-result-card__meta" aria-label="Metadados da peça">
                    <span>{formatDateTime(item.created_at)}</span>
                    <span>{item.project_name || 'Sem projeto'}</span>
                    <span>{getVersionLabel(versionCount)}</span>
                    <span>{getStatusLabel(item.status)}</span>
                    {isActive ? <span className="history-badge--active">Aberta para inspeção</span> : null}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="history-pagination" aria-label="Paginação das peças forjadas">
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
                  </div>
                </header>

                {copyMessage ? (
                  <p className="history-copy-message" role="status">
                    {copyMessage}
                  </p>
                ) : null}

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

                <div className="history-preview__project-assignment">
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
                    <p>
                      Copie o artefato para o backlog. O formato para Jira é apenas texto formatado;
                      o ProdForge não envia dados para Jira nem promete integração externa nesta ação.
                    </p>
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
                  summary={selectedVersionCount > 1 ? 'Diferenças entre versões' : 'Sem comparação real ainda'}
                  open={openAdvancedSections.comparison}
                  onToggle={toggleAdvancedSection}
                >
                  {selectedVersionCount > 1 ? (
                    <VersionDiffSummary
                      currentVersion={selectedVersion}
                      previousVersion={previousVersion}
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
