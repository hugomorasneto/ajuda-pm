import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import BriefComposer from '../components/workspace/BriefComposer'
import ProjectContextPanel from '../components/workspace/ProjectContextPanel'
import QualityPanel from '../components/workspace/QualityPanel'
import StoryDocument from '../components/workspace/StoryDocument'
import WorkspaceEmptyState from '../components/workspace/WorkspaceEmptyState'
import WorkspaceErrorState from '../components/workspace/WorkspaceErrorState'
import WorkspaceLoadingState from '../components/workspace/WorkspaceLoadingState'
import { useAuth } from '../hooks/useAuth'
import { useUserStoryWorkspace } from '../hooks/useUserStoryWorkspace'
import { createProject, listProjects } from '../services/projectsService'

const TABS = [
  { id: 'entrada', label: 'Bancada' },
  { id: 'resultado', label: 'Artefato' },
  { id: 'revisao', label: 'Inspeção' },
]

const ESTIMATION_STATUS_LABELS = {
  created: 'Criada',
  refining: 'Em refinamento',
  ready_for_estimation: 'Pronta para estimar',
  estimated: 'Estimativa selada',
}

function InspectionPreviewCard() {
  return (
    <aside className="panel workspace-inspection-preview" aria-label="Prévia da inspeção">
      <p className="quality-panel__panel-eyebrow">Inspeção</p>
      <h2>A inspeção fica disponível depois da forja.</h2>
      <p>Score, trincas e checklist aparecem com a primeira versão.</p>
    </aside>
  )
}

function PostForgeNextSteps({
  canEdit,
  isCopying,
  isOpeningPlanning,
  isSaving,
  onCopy,
  onOpenPlanning,
  onOrganize,
  projectLabel,
  statusLabel,
}) {
  return (
    <section className="post-forge-next-steps panel" aria-label="Próximos passos da peça">
      <div className="post-forge-next-steps__header">
        <div>
          <p className="projects-page__eyebrow">Próximos passos</p>
          <h2>Leve esta story para o fluxo de produto</h2>
          <p>Copie para o backlog, organize em projeto ou prepare a Roda da Fogueira quando o time for estimar.</p>
        </div>
        <div className="post-forge-next-steps__status" aria-label="Contexto atual da peça">
          <span title={projectLabel}>{projectLabel}</span>
          <strong title={statusLabel}>{statusLabel}</strong>
        </div>
      </div>

      <div className="post-forge-next-steps__actions">
        <button
          type="button"
          className="post-forge-next-steps__action"
          onClick={onCopy}
          disabled={isCopying}
        >
          <span>1</span>
          <strong>{isCopying ? 'Copiando...' : 'Copiar para backlog'}</strong>
          <small>Leve a user story e critérios de aceite para sua ferramenta atual.</small>
        </button>

        <button
          type="button"
          className="post-forge-next-steps__action"
          onClick={onOrganize}
          disabled={!canEdit || isSaving}
        >
          <span>2</span>
          <strong>{isSaving ? 'Organizando...' : 'Organizar em projeto'}</strong>
          <small>Use projetos para agrupar histórias por jornada, iniciativa ou produto.</small>
        </button>

        <button
          type="button"
          className="post-forge-next-steps__action post-forge-next-steps__action--primary"
          onClick={onOpenPlanning}
          disabled={!canEdit || isOpeningPlanning || isSaving}
        >
          <span>3</span>
          <strong>{isOpeningPlanning ? 'Preparando...' : 'Preparar Roda'}</strong>
          <small>Marque a story como pronta e abra o fluxo de estimativa colaborativa.</small>
        </button>
      </div>
    </section>
  )
}

function ToolPage() {
  const navigate = useNavigate()
  const [mobileTab, setMobileTab] = useState('entrada')
  const [searchParams] = useSearchParams()
  const projectIdFromQuery = searchParams.get('projectId')
  const loadedQueryStoryIdRef = useRef(null)
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isOpeningPlanningShortcut, setIsOpeningPlanningShortcut] = useState(false)
  const [projectActionMessage, setProjectActionMessage] = useState('')
  const [refineRequestId, setRefineRequestId] = useState(0)
  const [attentionRequestId, setAttentionRequestId] = useState(0)

  const {
    activeStoryTitle,
    canEditSelectedStory,
    copyMessage,
    editDraft,
    effectiveForgeLimit,
    formValues,
    handleAssignSelectedStoryToProject,
    handleCopy,
    handleEditDraftChange,
    handleFieldChange,
    handlePromptChipApply,
    handleRefineStory,
    handleResetToCreate,
    handleSaveEdits,
    handleSelectHistory,
    handleSubmitStory,
    handleUpdateSelectedStoryEstimationStatus,
    hasReachedLimit,
    isCopying,
    isEditing,
    isLoadingSelection,
    isPremium,
    isSavingEdits,
    isSubmitting,
    remainingGenerations,
    result,
    saveMessage,
    selectedStoryId,
    selectedStoryEstimationStatus,
    selectedStoryProjectId,
    validationErrors,
    workspaceError,
  } = useUserStoryWorkspace()

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setIsLoadingProjects(true)
    const response = await listProjects({ userId })
    setIsLoadingProjects(false)

    if (response.success) {
      setProjects(response.data ?? [])
    }
  }, [userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjects()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjects])

  useEffect(() => {
    if (!selectedStoryId) return
    const timerId = setTimeout(() => {
      setSelectedProjectId(selectedStoryProjectId ?? '')
    }, 0)

    return () => clearTimeout(timerId)
  }, [selectedStoryId, selectedStoryProjectId])

  useEffect(() => {
    if (!projectIdFromQuery || projects.length === 0 || selectedStoryId) return
    if (!projects.some((project) => project.id === projectIdFromQuery)) return
    if (selectedProjectId === projectIdFromQuery) return

    const timerId = setTimeout(() => {
      setSelectedProjectId(projectIdFromQuery)
    }, 0)

    return () => clearTimeout(timerId)
  }, [projectIdFromQuery, projects, selectedProjectId, selectedStoryId])

  useEffect(() => {
    const storyIdFromQuery = searchParams.get('storyId')
    if (!storyIdFromQuery || !userId || loadedQueryStoryIdRef.current === storyIdFromQuery) return

    loadedQueryStoryIdRef.current = storyIdFromQuery
    setMobileTab('resultado')
    handleSelectHistory(storyIdFromQuery)
  }, [handleSelectHistory, searchParams, userId])

  const reviewStory = useMemo(() => {
    if (!result) return null

    const safeTitle = editDraft.title?.trim() || result.title
    const safeUserStory = editDraft.user_story?.trim() || result.user_story
    const safeCriteria =
      editDraft.acceptance_criteria?.length > 0
        ? editDraft.acceptance_criteria
        : result.acceptance_criteria

    return {
      ...result,
      title: safeTitle,
      user_story: safeUserStory,
      acceptance_criteria: safeCriteria,
    }
  }, [editDraft, result])

  function applyTemplateToBriefing(template) {
    handleFieldChange('problemContext', template.context)
    handleFieldChange('requirements', template.requirements)
    setMobileTab('entrada')
  }

  async function handleCreateProject({ name, description, shouldAssignCurrentStory = false }) {
    if (!userId) return false

    setProjectActionMessage('')
    setIsCreatingProject(true)
    const response = await createProject({ name, description, userId })
    setIsCreatingProject(false)

    if (!response.success || !response.data) {
      setProjectActionMessage(response.error?.message ?? 'Não foi possível criar o projeto agora.')
      return false
    }

    const nextProject = response.data
    setProjects((current) => [
      nextProject,
      ...current.filter((project) => project.id !== nextProject.id),
    ])
    setSelectedProjectId(nextProject.id)

    if (shouldAssignCurrentStory && selectedStoryId) {
      const assigned = await handleAssignSelectedStoryToProject(nextProject.id)
      setProjectActionMessage(
        assigned
          ? 'Projeto criado e história organizada.'
          : 'Projeto criado, mas não foi possível organizar a história agora.',
      )
    } else {
      setProjectActionMessage('Projeto criado. As próximas histórias podem usar esse contexto.')
    }

    return true
  }

  function handleProjectSelect(projectId) {
    setSelectedProjectId(projectId)
    setProjectActionMessage('')
  }

  function handleSubmitWithProject() {
    return handleSubmitStory({ projectId: selectedProjectId || null })
  }

  async function handleAssignToSelectedProject() {
    if (!selectedProjectId) return false

    setProjectActionMessage('')
    const assigned = await handleAssignSelectedStoryToProject(selectedProjectId)
    setProjectActionMessage(
      assigned
        ? 'História organizada no projeto selecionado.'
        : 'Não foi possível organizar a história agora.',
    )

    return assigned
  }

  function handleRequestRefineFromPanel() {
    setMobileTab('resultado')
    setRefineRequestId((current) => current + 1)
  }

  function handleShowAllAlertsFromPanel() {
    setMobileTab('resultado')
    setAttentionRequestId((current) => current + 1)
  }

  async function handleOpenPlanningFromWorkspace() {
    if (!selectedStoryId || !canEditSelectedStory) return

    const linkedProjectId = selectedStoryProjectId
    const targetProjectId = linkedProjectId || selectedProjectId

    if (!targetProjectId) {
      setMobileTab('entrada')
      setProjectActionMessage('Escolha ou crie um projeto para levar esta história para a Roda da Fogueira.')
      return
    }

    setIsOpeningPlanningShortcut(true)
    setProjectActionMessage('')

    if (!linkedProjectId) {
      const assigned = await handleAssignSelectedStoryToProject(targetProjectId)
      if (!assigned) {
        setIsOpeningPlanningShortcut(false)
        setMobileTab('entrada')
        setProjectActionMessage('Não foi possível vincular a história ao projeto antes de abrir a Roda.')
        return
      }
    }

    if (selectedStoryEstimationStatus !== 'ready_for_estimation' && selectedStoryEstimationStatus !== 'estimated') {
      const updated = await handleUpdateSelectedStoryEstimationStatus('ready_for_estimation')
      if (!updated) {
        setIsOpeningPlanningShortcut(false)
        return
      }
    }

    setIsOpeningPlanningShortcut(false)

    const query = new URLSearchParams({ projectId: targetProjectId })
    if (selectedStoryEstimationStatus !== 'estimated') {
      query.set('storyId', selectedStoryId)
    }
    navigate(`/roda?${query.toString()}`)
  }

  async function handleOrganizeFromNextSteps() {
    setMobileTab('entrada')

    if (!selectedStoryId || !canEditSelectedStory) {
      setProjectActionMessage('Apenas quem criou esta história pode organizar a peça em projeto.')
      return
    }

    if (selectedStoryProjectId) {
      setProjectActionMessage('Esta história já está organizada em um projeto.')
      return
    }

    if (selectedProjectId) {
      await handleAssignToSelectedProject()
      return
    }

    setProjectActionMessage('Escolha um projeto existente ou crie um novo para organizar esta história.')
  }

  const hasDraft = Boolean(
    formValues.problemContext.trim() ||
      formValues.requirements.trim() ||
      formValues.adjustment.trim(),
  )
  const showBlockingLoadingState = !reviewStory && (isSubmitting || isLoadingSelection)
  const showBlockingErrorState =
    !reviewStory && Boolean(workspaceError) && !showBlockingLoadingState
  const showEmptyState = !reviewStory && !showBlockingLoadingState && !showBlockingErrorState
  const workspaceStatusLabel = isEditing ? 'Peça atual' : 'Nova peça'
  const workspaceStatusTitle = isEditing && activeStoryTitle ? activeStoryTitle : 'Em preparo'
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const linkedStoryProject = projects.find((project) => project.id === selectedStoryProjectId) ?? null
  const selectedProjectName = selectedProject?.name ?? 'Sem projeto'
  const linkedStoryProjectName = linkedStoryProject?.name ?? selectedProjectName
  const projectPillText = selectedProject ? selectedProjectName : 'Peça avulsa'
  const selectedStoryEstimationStatusLabel =
    ESTIMATION_STATUS_LABELS[selectedStoryEstimationStatus] ?? 'Criada'
  const planningShortcut = reviewStory
    ? {
        description: !canEditSelectedStory
          ? 'Apenas quem criou a história pode prepará-la para estimativa.'
          : selectedStoryProjectId
            ? selectedStoryEstimationStatus === 'ready_for_estimation'
              ? 'Esta história já está pronta para entrar em uma Roda.'
              : selectedStoryEstimationStatus === 'estimated'
                ? 'Esta história já possui estimativa. Consulte as Rodas do projeto.'
                : 'Marque a história como pronta e abra a Roda com o projeto vinculado.'
            : selectedProjectId
              ? 'Vincule esta história ao projeto selecionado e abra a Roda em seguida.'
              : 'Vincule a história a um projeto antes de criar uma Roda.',
        buttonLabel: selectedStoryProjectId
          ? selectedStoryEstimationStatus === 'ready_for_estimation'
            ? 'Criar Roda com esta história'
            : selectedStoryEstimationStatus === 'estimated'
              ? 'Abrir Rodas do projeto'
              : 'Marcar e criar Roda'
          : selectedProjectId
            ? 'Vincular e criar Roda'
            : 'Vincular a projeto',
        isLoading: isOpeningPlanningShortcut,
        disabled: !selectedStoryId || !canEditSelectedStory || isOpeningPlanningShortcut || isSavingEdits,
        onClick: handleOpenPlanningFromWorkspace,
      }
    : null

  const { setTopbarStatus } = useOutletContext() ?? {}

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    const generationsText = effectiveForgeLimit === null
      ? 'Pro'
      : `${remainingGenerations} ${remainingGenerations === 1 ? 'forja' : 'forjas'}`

    setTopbarStatus({
      label: workspaceStatusLabel,
      title: workspaceStatusTitle,
      pills: [
        {
          text: isEditing ? 'Em inspeção' : 'Ainda não forjada',
          className: isEditing ? 'mode-pill-editing' : '',
        },
        {
          text: projectPillText,
          className: selectedProject ? 'mode-pill-editing' : '',
        },
        {
          text: generationsText,
          className: hasReachedLimit ? 'mode-pill-warning' : '',
        },
      ],
    })

    return () => setTopbarStatus(null)
  }, [
    setTopbarStatus,
    workspaceStatusLabel,
    workspaceStatusTitle,
    isEditing,
    isPremium,
    effectiveForgeLimit,
    remainingGenerations,
    hasReachedLimit,
    projectPillText,
    selectedProject,
  ])

  const documentCanvas = showBlockingLoadingState ? (
    <WorkspaceLoadingState mode={isLoadingSelection ? 'selection' : 'generate'} />
  ) : showBlockingErrorState ? (
      <WorkspaceErrorState
        message={workspaceError}
        canRetry={Boolean(formValues.problemContext.trim())}
        onRetry={handleSubmitWithProject}
      />
  ) : showEmptyState ? (
    <WorkspaceEmptyState hasDraft={hasDraft} />
  ) : (
    <>
      <StoryDocument
        key={selectedStoryId ?? 'workspace-document'}
        result={result}
        saveMessage={saveMessage}
        isLoadingSelectedStory={isLoadingSelection}
        editDraft={editDraft}
        baseContext={formValues.problemContext}
        baseRequirements={formValues.requirements}
        onEditDraftChange={handleEditDraftChange}
        onSaveEdits={handleSaveEdits}
        isSavingEdits={isSavingEdits}
        canEdit={canEditSelectedStory}
        onRefineStory={handleRefineStory}
        isRefining={isSubmitting}
        refineRequestId={refineRequestId}
        attentionRequestId={attentionRequestId}
      />
      <PostForgeNextSteps
        canEdit={canEditSelectedStory}
        isCopying={isCopying}
        isOpeningPlanning={isOpeningPlanningShortcut}
        isSaving={isSavingEdits}
        onCopy={() => handleCopy(reviewStory)}
        onOpenPlanning={handleOpenPlanningFromWorkspace}
        onOrganize={handleOrganizeFromNextSteps}
        projectLabel={selectedStoryProjectId ? linkedStoryProjectName : 'Peça avulsa'}
        statusLabel={selectedStoryEstimationStatusLabel}
      />
    </>
  )

  const rightPanel = (
    <aside className="workspace-right-panel">
      <div className="workspace-right-panel__review">
        {reviewStory ? (
          <QualityPanel
            story={reviewStory}
            isPremium={isPremium}
            effectiveForgeLimit={effectiveForgeLimit}
            remainingGenerations={remainingGenerations}
            hasReachedLimit={hasReachedLimit}
            onCopyPlain={() => handleCopy(reviewStory)}
            onRequestRefine={handleRequestRefineFromPanel}
            onShowAllAlerts={handleShowAllAlertsFromPanel}
            planningShortcut={planningShortcut}
            plainCopyMessage={copyMessage}
            isCopyingPlain={isCopying}
            canRefine={canEditSelectedStory}
          />
        ) : (
          <InspectionPreviewCard />
        )}
      </div>
    </aside>
  )

  const composerPanel = (
    <BriefComposer
      formValues={formValues}
      validationErrors={validationErrors}
      onChange={handleFieldChange}
      onApplyPrompt={handlePromptChipApply}
      onApplyTemplate={applyTemplateToBriefing}
      onSubmit={handleSubmitWithProject}
      onReset={handleResetToCreate}
      isSubmitting={isSubmitting}
      isEditing={isEditing && canEditSelectedStory}
      isGenerated={Boolean(result)}
      activeStoryTitle={activeStoryTitle}
      hasAdjustment={Boolean(formValues.adjustment.trim())}
    />
  )

  const projectPanel = (
    <ProjectContextPanel
      projects={projects}
      selectedProjectId={selectedProjectId}
      selectedProjectName={selectedProjectName}
      onSelectProject={handleProjectSelect}
      onCreateProject={handleCreateProject}
      onAssignToSelectedProject={handleAssignToSelectedProject}
      onForgeStandalone={handleSubmitWithProject}
      isCreating={isCreatingProject}
      isAssigning={isSavingEdits}
      isLoading={isLoadingProjects}
      isSubmitting={isSubmitting}
      hasGeneratedStory={Boolean(result)}
      canAssignGeneratedStory={Boolean(
        result && selectedStoryId && !selectedStoryProjectId && canEditSelectedStory,
      )}
      canAssignToSelectedProject={Boolean(
        result &&
          selectedStoryId &&
          canEditSelectedStory &&
          selectedProjectId &&
          selectedProjectId !== selectedStoryProjectId,
      )}
      actionMessage={projectActionMessage}
    />
  )

  return (
    <div className="tool-page story-workspace">

      <nav className="workspace-tabs" aria-label="Áreas da bancada">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`workspace-tabs__tab ${mobileTab === tab.id ? 'workspace-tabs__tab--active' : ''}`}
            onClick={() => setMobileTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {reviewStory ? (
        <div className="workspace-canvas workspace-canvas--with-story">
          <div
            className={`workspace-canvas__col workspace-canvas__col--left ${
              mobileTab === 'entrada' ? 'workspace-canvas__col--active' : ''
            }`}
          >
            {composerPanel}
            {projectPanel}
          </div>

          <div
            className={`workspace-canvas__col workspace-canvas__col--center ${
              mobileTab === 'resultado' ? 'workspace-canvas__col--active' : ''
            }`}
          >
            {documentCanvas}
          </div>

          <div
            className={`workspace-canvas__col workspace-canvas__col--right ${
              mobileTab === 'revisao' ? 'workspace-canvas__col--active' : ''
            }`}
          >
            {rightPanel}
          </div>
        </div>
      ) : (
        <div className="workspace-canvas workspace-canvas--empty">
          <div
            className={`workspace-canvas__col workspace-canvas__col--left ${
              mobileTab === 'entrada' ? 'workspace-canvas__col--active' : ''
            }`}
          >
            {composerPanel}
            {projectPanel}
          </div>

          <div
            className={`workspace-canvas__col workspace-canvas__col--right ${
              mobileTab === 'resultado' || mobileTab === 'revisao' ? 'workspace-canvas__col--active' : ''
            }`}
          >
            <div className="workspace-empty-rail">
              {showEmptyState ? (
                documentCanvas
              ) : (
                <>
                  {documentCanvas}
                  {rightPanel}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolPage
