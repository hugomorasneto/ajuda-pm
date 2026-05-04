import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import BriefComposer from '../components/workspace/BriefComposer'
import OnboardingModal from '../components/workspace/OnboardingModal'
import QualityPanel from '../components/workspace/QualityPanel'
import StoryDocument from '../components/workspace/StoryDocument'
import WorkspaceEmptyState from '../components/workspace/WorkspaceEmptyState'
import WorkspaceErrorState from '../components/workspace/WorkspaceErrorState'
import WorkspaceLoadingState from '../components/workspace/WorkspaceLoadingState'
import { useAuth } from '../hooks/useAuth'
import { useUserStoryWorkspace } from '../hooks/useUserStoryWorkspace'

const TABS = [
  { id: 'entrada', label: 'Bancada' },
  { id: 'resultado', label: 'Artefato' },
  { id: 'revisao', label: 'Inspeção' },
]

function hasSeenOnboarding(storageKey) {
  if (typeof window === 'undefined' || !storageKey) return true

  try {
    return Boolean(window.localStorage.getItem(storageKey))
  } catch (error) {
    console.error('Falha ao ler onboarding do workspace:', error)
    return true
  }
}

function ToolPage() {
  const [mobileTab, setMobileTab] = useState('entrada')
  const [dismissedOnboardingKey, setDismissedOnboardingKey] = useState(null)
  const [searchParams] = useSearchParams()
  const loadedQueryStoryIdRef = useRef(null)
  const { user } = useAuth()
  const onboardingStorageKey = user ? `pf_ob_${user.id}` : null

  const {
    activeStoryTitle,
    copyMessage,
    editDraft,
    formValues,
    handleCopy,
    handleEditDraftChange,
    handleFieldChange,
    handlePromptChipApply,
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
    validationErrors,
    workspaceError,
  } = useUserStoryWorkspace()

  function dismissOnboarding() {
    if (typeof window !== 'undefined' && onboardingStorageKey) {
      window.localStorage.setItem(onboardingStorageKey, '1')
      setDismissedOnboardingKey(onboardingStorageKey)
    }
  }

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

  const hasDraft = Boolean(
    formValues.problemContext.trim() ||
      formValues.requirements.trim() ||
      formValues.adjustment.trim(),
  )
  const showBlockingLoadingState = !reviewStory && (isSubmitting || isLoadingSelection)
  const showBlockingErrorState =
    !reviewStory && Boolean(workspaceError) && !showBlockingLoadingState
  const showEmptyState = !reviewStory && !showBlockingLoadingState && !showBlockingErrorState
  const workspaceStatusLabel = isEditing ? 'Peça ativa' : 'Nova matéria-prima'
  const workspaceStatusTitle = isEditing && activeStoryTitle ? activeStoryTitle : 'Nova story'
  const showOnboarding = Boolean(
    onboardingStorageKey &&
      dismissedOnboardingKey !== onboardingStorageKey &&
      !hasSeenOnboarding(onboardingStorageKey),
  )

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
          text: isEditing ? 'Em inspeção' : 'Nova peça',
          className: isEditing ? 'mode-pill-editing' : 'mode-pill-new',
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
  ])

  const documentCanvas = showBlockingLoadingState ? (
    <WorkspaceLoadingState mode={isLoadingSelection ? 'selection' : 'generate'} />
  ) : showBlockingErrorState ? (
    <WorkspaceErrorState
      message={workspaceError}
      canRetry={Boolean(formValues.problemContext.trim() && formValues.requirements.trim())}
      onRetry={handleSubmitStory}
    />
  ) : showEmptyState ? (
    <WorkspaceEmptyState hasDraft={hasDraft} onApplyTemplate={applyTemplateToBriefing} />
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
      canEdit={isEditing}
    />
  )

  const rightPanel = (
    <aside className="workspace-right-panel">
      <div className="workspace-right-panel__review">
        <QualityPanel
          story={reviewStory}
          isPremium={isPremium}
          remainingGenerations={remainingGenerations}
          hasReachedLimit={hasReachedLimit}
          onCopyPlain={() => handleCopy(reviewStory)}
          plainCopyMessage={copyMessage}
          isCopyingPlain={isCopying}
        />
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

      <div className="workspace-canvas">
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
            onSubmit={handleSubmitStory}
            onReset={handleResetToCreate}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            isGenerated={Boolean(result)}
            activeStoryTitle={activeStoryTitle}
            hasAdjustment={Boolean(formValues.adjustment.trim())}
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

      {showOnboarding ? <OnboardingModal onDismiss={dismissOnboarding} /> : null}
    </div>
  )
}

export default ToolPage
