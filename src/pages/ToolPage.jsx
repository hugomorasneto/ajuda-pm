import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
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

function InspectionPreviewCard() {
  return (
    <aside className="panel workspace-inspection-preview" aria-label="Prévia da inspeção">
      <p className="quality-panel__panel-eyebrow">Inspeção</p>
      <h2>Inspeção após a primeira versão</h2>
      <p>
        Score, trincas, checklist de QA e ações de entrega aparecem aqui depois que a primeira user story for gerada.
      </p>
    </aside>
  )
}

function ToolPage() {
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
  const [projectActionMessage, setProjectActionMessage] = useState('')

  const {
    activeStoryTitle,
    canEditSelectedStory,
    copyMessage,
    editDraft,
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
    if (!storyIdFromQuery || loadedQueryStoryIdRef.current === storyIdFromQuery) return

    loadedQueryStoryIdRef.current = storyIdFromQuery
    const timerId = window.setTimeout(() => {
      setMobileTab('resultado')
      handleSelectHistory(storyIdFromQuery)
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [handleSelectHistory, searchParams])

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
  const selectedProjectName = selectedProject?.name ?? 'Sem projeto'
  const projectPillText = selectedProject ? selectedProjectName : 'Peça avulsa'

  const { setTopbarStatus } = useOutletContext() ?? {}

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    const generationsText = isPremium
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
    <StoryDocument
      key={selectedStoryId ?? 'workspace-document'}
      result={result}
      saveMessage={saveMessage}
      isLoadingSelectedStory={isLoadingSelection}
      editDraft={editDraft}
      onEditDraftChange={handleEditDraftChange}
      onSaveEdits={handleSaveEdits}
      isSavingEdits={isSavingEdits}
      canEdit={canEditSelectedStory}
      onRefineStory={handleRefineStory}
      isRefining={isSubmitting}
    />
  )

  const rightPanel = (
    <aside className="workspace-right-panel">
      <div className="workspace-right-panel__review">
        {reviewStory ? (
          <QualityPanel
            story={reviewStory}
            isPremium={isPremium}
            remainingGenerations={remainingGenerations}
            hasReachedLimit={hasReachedLimit}
            onCopyPlain={() => handleCopy(reviewStory)}
            plainCopyMessage={copyMessage}
            isCopyingPlain={isCopying}
          />
        ) : (
          <InspectionPreviewCard />
        )}
      </div>
    </aside>
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

      <div className={`workspace-canvas ${reviewStory ? 'workspace-canvas--with-story' : 'workspace-canvas--empty'}`}>
        <div
          className={`workspace-canvas__col workspace-canvas__col--left ${
            mobileTab === 'entrada' ? 'workspace-canvas__col--active' : ''
          }`}
        >
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
    </div>
  )
}

export default ToolPage
