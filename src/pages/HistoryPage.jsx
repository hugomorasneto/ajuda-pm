import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import ExportActionsBar from '../components/workspace/ExportActionsBar'
import StoryDocument from '../components/workspace/StoryDocument'
import VersionDiffSummary from '../components/workspace/VersionDiffSummary'
import VersionTimeline from '../components/workspace/VersionTimeline'
import { formatDateTime, parseTextList } from '../hooks/useUserStoryWorkspace'
import { useAuth } from '../hooks/useAuth'
import {
  getUserStoryById,
  listStoryHistoryGroups,
  listStoryVersions,
  updateUserStory,
} from '../services/userStoriesService'
import { listProjects } from '../services/projectsService'
import { copyTextToClipboard } from '../utils/storyExport'

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

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Forjado'
}

function getEstimationStatusLabel(status) {
  return ESTIMATION_STATUS_LABELS[status] ?? 'Criada'
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
  const [isCopyingPlain, setIsCopyingPlain] = useState(false)
  const [projectAssignmentMessage, setProjectAssignmentMessage] = useState('')
  const [isAssigningProject, setIsAssigningProject] = useState(false)

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

  async function handleCopyPlain() {
    if (!selectedResult) return

    setIsCopyingPlain(true)
    try {
      await copyTextToClipboard(buildPlainText(selectedResult))
      setCopyMessage('Texto simples copiado.')
    } catch (error) {
      console.error('Falha ao copiar texto simples do histórico:', error)
      setCopyMessage('Não foi possível copiar o texto simples agora.')
    } finally {
      setIsCopyingPlain(false)
    }
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
      currentItems.map((item) =>
        item.id === selectedStory.id
          ? {
              ...item,
              project_id: updatedStory.project_id,
              project_name: updatedStory.project_name,
            }
          : item,
      ),
    )
    setProjectAssignmentMessage(
      updatedStory.project_id
        ? 'História organizada no projeto selecionado.'
        : 'História marcada como sem projeto.',
    )
  }

  const visibleRange = getVisibleRange({
    page,
    pageSize,
    totalCount,
    itemCount: items.length,
  })
  const selectedGroupKey = selectedStory?.story_group_id ?? selectedStory?.id ?? null
  const canAssignSelectedStoryProject = Boolean(selectedStory?.id && selectedStory.user_id === userId)

  return (
    <div className="history-page">
      <section className="panel history-page__hero">
        <div className="history-page__hero-copy">
          <p className="history-page__eyebrow">Peças forjadas</p>
          <h1>Peças forjadas</h1>
          <p>
            Histórico das user stories geradas para buscar, filtrar, entregar e reabrir sem poluir a bancada principal.
          </p>
        </div>
        <Link className="btn btn-secondary btn-small" to="/tool">
          Nova matéria-prima
        </Link>
      </section>

      <section className="panel history-filters" aria-label="Filtros das peças forjadas">
        <label className="history-filter-field history-filter-field--search">
          <span>Buscar</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Título, matéria-prima, liga ou critério"
          />
        </label>

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

          {isLoading ? <p className="history-status">Buscando peças forjadas...</p> : null}
          {loadError ? <p className="history-status history-status-error">{loadError}</p> : null}
          {!isLoading && !loadError && items.length === 0 ? (
            <p className="history-status">Nenhuma peça forjada encontrada para os filtros atuais.</p>
          ) : null}

          <div className="history-results__list">
            {items.map((item) => {
              const itemGroupKey = item.story_group_id ?? item.id
              const isActive = itemGroupKey === selectedGroupKey
              const preview = item.input_context?.trim() || item.input_requirements?.trim() || ''

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`history-result-card ${isActive ? 'history-result-card--active' : ''}`}
                  onClick={() => {
                    setProjectAssignmentMessage('')
                    selectStory(item)
                  }}
                >
                  <div className="history-result-card__top">
                    <h3>{item.title}</h3>
                    <span>{getStatusLabel(item.status)}</span>
                  </div>
                  {preview ? <p>{preview}</p> : null}
                  <div className="history-result-card__meta">
                    <span>{formatDateTime(item.created_at)}</span>
                    <span>{item.project_name || 'Sem projeto'}</span>
                    <span>{getEstimationStatusLabel(item.estimation_status)}</span>
                    <span>{item.versions_count ?? item.version_number ?? 1} versões</span>
                    <span>{isActive ? 'Aberta para inspeção' : 'Ver inspeção'}</span>
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
              <div className="panel history-detail__actions">
                <div>
                  <p className="history-page__eyebrow">Inspeção</p>
                  <h2>{selectedStory.title}</h2>
                  <p>
                    Revise qualidade, gaps e próximos ajustes antes de levar esta peça para a bancada.
                    Estimativa: {getEstimationStatusLabel(selectedStory.estimation_status)}.
                  </p>
                  <div className="history-detail__project-assignment">
                    <label className="history-filter-field">
                      <span>Projeto da história</span>
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
                    <p className="history-detail__project-note">
                      {canAssignSelectedStoryProject
                        ? 'Organize peças antigas em projetos quando fizer sentido.'
                        : 'Histórias compartilhadas ficam somente para consulta.'}
                    </p>
                    {projectAssignmentMessage ? (
                      <p className="history-detail__project-message" role="status">
                        {projectAssignmentMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => navigate(`/tool?storyId=${selectedStory.id}`)}
                >
                  Abrir na bancada
                </button>
              </div>

              <StoryDocument
                result={selectedResult}
                saveMessage=""
                isLoadingSelectedStory={false}
                editDraft={{
                  title: selectedResult.title,
                  user_story: selectedResult.user_story,
                  acceptance_criteria: selectedResult.acceptance_criteria,
                }}
                onEditDraftChange={() => {}}
                onSaveEdits={() => {}}
                isSavingEdits={false}
                canEdit={false}
              />

              <section className="panel history-detail__export">
                <div>
                  <p className="history-page__eyebrow">Entregar artefato</p>
                  <h2>Entregar no backlog</h2>
                </div>
                <ExportActionsBar
                  story={selectedResult}
                  onCopyPlain={handleCopyPlain}
                  plainCopyMessage={copyMessage}
                  isCopyingPlain={isCopyingPlain}
                />
              </section>

              <VersionTimeline
                versions={versions}
                selectedId={selectedStory.id}
                isLoading={isLoadingVersions}
                onSelect={handleSelectVersion}
              />
              <VersionDiffSummary
                currentVersion={selectedVersion}
                previousVersion={previousVersion}
              />
            </>
          ) : (
            <section className="panel history-detail__empty">
              <p className="history-page__eyebrow">Inspeção</p>
              <h2>Selecione uma peça</h2>
              <p>A revisão de qualidade, gaps e versões da peça selecionada aparece aqui.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

export default HistoryPage
