import { useCopy, useLanguage } from '../i18n/context'
import { formatNotice } from '../i18n/formatNotice'
import { localizeHref } from '../i18n/routes'
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
  { id: 'entrada', label: 'workspace' },
  { id: 'resultado', label: 'artifact' },
  { id: 'revisao', label: 'inspection' },
]

const ESTIMATION_STATUS_LABELS = {
  created: 'created',
  refining: 'in_refinement',
  ready_for_estimation: 'ready_for_estimation',
  estimated: 'estimate_finalized',
}

function InspectionPreviewCard() {
  const t = useCopy('forge')
  return (
    <aside className="panel workspace-inspection-preview" aria-label={t('inspection_preview')}>
      <p className="quality-panel__panel-eyebrow">{t('inspection')}</p>
      <h2>{t('inspection_becomes_available_after_generation')}</h2>
      <p>{t('the_score_gaps_and_checklist_appear')}</p>
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
  const t = useCopy('forge')
  return (
    <section className="post-forge-next-steps panel" aria-label={t('next_steps_for_this_artifact')}>
      <div className="post-forge-next-steps__header">
        <div>
          <p className="projects-page__eyebrow">{t('next_steps')}</p>
          <h2>{t('take_this_story_into_your_product')}</h2>
          <p>{t('copy_it_to_your_backlog_organize')}</p>
        </div>
        <div className="post-forge-next-steps__status" aria-label={t('current_artifact_context')}>
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
          <strong>{isCopying ? t('copying') : t('copy_to_backlog')}</strong>
          <small>{t('take_the_user_story_and_acceptance')}</small>
        </button>

        <button
          type="button"
          className="post-forge-next-steps__action"
          onClick={onOrganize}
          disabled={!canEdit || isSaving}
        >
          <span>2</span>
          <strong>{isSaving ? t('organizing') : t('organize_in_a_project')}</strong>
          <small>{t('use_projects_to_group_stories_by')}</small>
        </button>

        <button
          type="button"
          className="post-forge-next-steps__action post-forge-next-steps__action--primary"
          onClick={onOpenPlanning}
          disabled={!canEdit || isOpeningPlanning || isSaving}
        >
          <span>3</span>
          <strong>{isOpeningPlanning ? t('preparing') : t('prepare_planning_poker')}</strong>
          <small>{t('mark_the_story_as_ready_and')}</small>
        </button>
      </div>
    </section>
  )
}

function ToolPage() {
  const t = useCopy('forge')
  const storyFormat = useCopy('storyFormat')
  const { language, preview } = useLanguage()
  const navigate = useNavigate()
  const [mobileTab, setMobileTab] = useState('entrada')
  const [searchParams] = useSearchParams()
  const projectIdFromQuery = searchParams.get('projectId')
  const storyIdFromQuery = searchParams.get('storyId')
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
  } = useUserStoryWorkspace(storyFormat)

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
    if (!storyIdFromQuery || !userId || loadedQueryStoryIdRef.current === storyIdFromQuery) return

    loadedQueryStoryIdRef.current = storyIdFromQuery
    setMobileTab('resultado')
    handleSelectHistory(storyIdFromQuery)
  }, [handleSelectHistory, storyIdFromQuery, userId])

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
      setProjectActionMessage('could_not_create_the_project_try')
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
          ? 'project_created_and_story_organized'
          : 'the_project_was_created_but_the',
      )
    } else {
      setProjectActionMessage('project_created_new_stories_can_use')
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
        ? 'story_organized_in_the_selected_project'
        : 'could_not_organize_the_story_try',
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
      setProjectActionMessage('choose_or_create_a_project_to')
      return
    }

    setIsOpeningPlanningShortcut(true)
    setProjectActionMessage('')

    if (!linkedProjectId) {
      const assigned = await handleAssignSelectedStoryToProject(targetProjectId)
      if (!assigned) {
        setIsOpeningPlanningShortcut(false)
        setMobileTab('entrada')
        setProjectActionMessage('could_not_link_the_story_to')
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
    const path = `/roda?${query.toString()}`
    navigate(preview ? localizeHref(path, language) : path)
  }

  async function handleOrganizeFromNextSteps() {
    setMobileTab('entrada')

    if (!selectedStoryId || !canEditSelectedStory) {
      setProjectActionMessage('only_the_story_s_author_can')
      return
    }

    if (selectedStoryProjectId) {
      setProjectActionMessage('this_story_is_already_organized_in')
      return
    }

    if (selectedProjectId) {
      await handleAssignToSelectedProject()
      return
    }

    setProjectActionMessage('choose_an_existing_project_or_create')
  }

  const hasDraft = Boolean(
    formValues.problemContext.trim() ||
      formValues.requirements.trim() ||
      formValues.adjustment.trim(),
  )
  const showBlockingLoadingState = !reviewStory && (isSubmitting || isLoadingSelection)
  const showBlockingErrorState =
    !reviewStory && Boolean(workspaceError) && !showBlockingLoadingState
  const showStoryDeepLinkError = Boolean(storyIdFromQuery && showBlockingErrorState)
  const showEmptyState = !reviewStory && !showBlockingLoadingState && !showBlockingErrorState
  const workspaceStatusLabel = isEditing ? t('current_artifact') : t('new_artifact')
  const workspaceStatusTitle = isEditing && activeStoryTitle ? activeStoryTitle : t('in_preparation')
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const linkedStoryProject = projects.find((project) => project.id === selectedStoryProjectId) ?? null
  const selectedProjectName = selectedProject?.name ?? t('no_project')
  const linkedStoryProjectName = linkedStoryProject?.name ?? selectedProjectName
  const projectPillText = selectedProject ? selectedProjectName : t('standalone_artifact')
  const selectedStoryEstimationStatusLabel =
    t(ESTIMATION_STATUS_LABELS[selectedStoryEstimationStatus] ?? 'created')
  const planningShortcut = reviewStory
    ? {
        description: !canEditSelectedStory
          ? t('only_the_story_s_author_can_2')
          : selectedStoryProjectId
            ? selectedStoryEstimationStatus === 'ready_for_estimation'
              ? t('this_story_is_ready_for_a')
              : selectedStoryEstimationStatus === 'estimated'
                ? t('this_story_already_has_an_estimate')
                : t('mark_the_story_as_ready_and_2')
            : selectedProjectId
              ? t('link_this_story_to_the_selected')
              : t('link_this_story_to_a_project'),
        buttonLabel: selectedStoryProjectId
          ? selectedStoryEstimationStatus === 'ready_for_estimation'
            ? t('start_planning_poker_with_this_story')
            : selectedStoryEstimationStatus === 'estimated'
              ? t('open_project_sessions')
              : t('mark_as_ready_and_start_planning')
          : selectedProjectId
            ? t('link_project_and_start_planning_poker')
            : t('link_to_a_project'),
        isLoading: isOpeningPlanningShortcut,
        disabled: !selectedStoryId || !canEditSelectedStory || isOpeningPlanningShortcut || isSavingEdits,
        onClick: handleOpenPlanningFromWorkspace,
      }
    : null

  const { setTopbarStatus } = useOutletContext() ?? {}

  function handleRetryStoryDeepLink() {
    if (!storyIdFromQuery) return

    loadedQueryStoryIdRef.current = null
    setMobileTab('resultado')
    handleSelectHistory(storyIdFromQuery)
  }

  function handleGoToHistoryFromStoryError() {
    loadedQueryStoryIdRef.current = null
    navigate(preview ? localizeHref('/historico', language) : '/historico')
  }

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    const generationsText = effectiveForgeLimit === null
      ? 'Pro'
      : t('generation_count', { count: remainingGenerations })

    setTopbarStatus({
      label: workspaceStatusLabel,
      title: workspaceStatusTitle,
      pills: [
        {
          text: isEditing ? t('under_inspection') : t('waiting_for_generation'),
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
    t,
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
        message={formatNotice(t, workspaceError)}
        eyebrow={workspaceError?.quotaReached ? null : undefined}
        title={showStoryDeepLinkError ? t('artifact_not_found_or_access_denied')
          : workspaceError?.quotaReached ? t('generation_limit_reached') : undefined}
        note={
          showStoryDeepLinkError
            ? t('the_link_may_have_been_removed')
            : workspaceError?.quotaReached ? t('generation_limit_note') : undefined
        }
        canRetry={showStoryDeepLinkError || Boolean(formValues.problemContext.trim())}
        onRetry={showStoryDeepLinkError ? handleRetryStoryDeepLink
          : workspaceError?.quotaReached ? null : handleSubmitWithProject}
        retryLabel={showStoryDeepLinkError ? t('try_loading_again') : undefined}
        secondaryAction={
          showStoryDeepLinkError || workspaceError?.quotaReached
            ? {
                label: t('back_to_story_history'),
                onClick: handleGoToHistoryFromStoryError,
              }
            : null
        }
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
        projectLabel={selectedStoryProjectId ? linkedStoryProjectName : t('standalone_artifact')}
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
            plainCopyMessage={formatNotice(t, copyMessage)}
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
      actionMessage={formatNotice(t, projectActionMessage)}
    />
  )

  return (
    <div className="tool-page story-workspace">
      {language === 'en' && <p className="workspace-language-note">{t('generation_language_notice')}</p>}

      <nav className="workspace-tabs" aria-label={t('workspace_sections')}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`workspace-tabs__tab ${mobileTab === tab.id ? 'workspace-tabs__tab--active' : ''}`}
            onClick={() => setMobileTab(tab.id)}
            aria-pressed={mobileTab === tab.id}
          >
            {t(tab.label)}
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
