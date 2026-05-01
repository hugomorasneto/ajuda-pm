import { useMemo, useState } from 'react'
import BriefComposer from '../components/workspace/BriefComposer'
import QualityPanel from '../components/workspace/QualityPanel'
import RecentStoriesPanel from '../components/workspace/RecentStoriesPanel'
import StoryDocument from '../components/workspace/StoryDocument'
import VersionDiffSummary from '../components/workspace/VersionDiffSummary'
import VersionTimeline from '../components/workspace/VersionTimeline'
import WorkspaceEmptyState from '../components/workspace/WorkspaceEmptyState'
import WorkspaceErrorState from '../components/workspace/WorkspaceErrorState'
import WorkspaceLoadingState from '../components/workspace/WorkspaceLoadingState'
import { useUserStoryWorkspace } from '../hooks/useUserStoryWorkspace'

const TABS = [
  { id: 'entrada', label: 'Brief' },
  { id: 'resultado', label: 'Story' },
  { id: 'revisao', label: 'Revisão' },
]

function ToolPage() {
  const [mobileTab, setMobileTab] = useState('entrada')

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
    handleSelectVersion,
    handleSubmitStory,
    hasReachedLimit,
    historyError,
    historyFilter,
    isCopying,
    isEditing,
    isLoadingRecent,
    isLoadingSelection,
    isLoadingVersions,
    isPremium,
    isSavingEdits,
    isSubmitting,
    loadRecentStories,
    previousVersion,
    recentStories,
    remainingGenerations,
    result,
    saveMessage,
    selectedStoryId,
    selectedVersion,
    setHistoryFilter,
    validationErrors,
    versions,
    workspaceError,
  } = useUserStoryWorkspace()

  const reviewStory = useMemo(() => {
    if (!result) return null

    const safeTitle = editDraft.title?.trim() || result.title
    const safeUserStory = editDraft.user_story?.trim() || result.user_story
    const safeCriteria =
      editDraft.acceptance_criteria?.length > 0 ? editDraft.acceptance_criteria : result.acceptance_criteria

    return {
      ...result,
      title: safeTitle,
      user_story: safeUserStory,
      acceptance_criteria: safeCriteria,
    }
  }, [editDraft, result])

  const hasDraft = Boolean(
    formValues.problemContext.trim() || formValues.requirements.trim() || formValues.adjustment.trim(),
  )
  const showBlockingLoadingState = !reviewStory && (isSubmitting || isLoadingSelection)
  const showBlockingErrorState = !reviewStory && Boolean(workspaceError) && !showBlockingLoadingState
  const showEmptyState = !reviewStory && !showBlockingLoadingState && !showBlockingErrorState
  const workspaceStatusLabel = isEditing ? 'Base ativa' : 'Nova base'
  const workspaceStatusTitle = isEditing && activeStoryTitle ? activeStoryTitle : 'Nova user story'
  const workspaceStatusNote = isEditing
    ? 'Revise a versão ativa, ajuste o texto e exporte quando estiver pronta.'
    : 'Preencha o brief, gere a story e siga para revisão no mesmo fluxo.'

  const documentCanvas = showBlockingLoadingState ? (
    <WorkspaceLoadingState mode={isLoadingSelection ? 'selection' : 'generate'} />
  ) : showBlockingErrorState ? (
    <WorkspaceErrorState
      message={workspaceError}
      canRetry={Boolean(formValues.problemContext.trim() && formValues.requirements.trim())}
      onRetry={handleSubmitStory}
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

      <div className="workspace-right-panel__history">
        <RecentStoriesPanel
          items={recentStories}
          selectedId={selectedStoryId}
          isLoading={isLoadingRecent}
          onSelect={handleSelectHistory}
          loadErrorMessage={historyError}
          reloadRecent={loadRecentStories}
          filterValue={historyFilter}
          onFilterChange={setHistoryFilter}
        />

        {isEditing ? (
          <div className="story-workspace__versions-stack workspace-right-panel__versions">
            <VersionTimeline
              versions={versions}
              selectedId={selectedStoryId}
              isLoading={isLoadingVersions}
              onSelect={handleSelectVersion}
            />
            <VersionDiffSummary currentVersion={selectedVersion} previousVersion={previousVersion} />
          </div>
        ) : null}
      </div>
    </aside>
  )

  return (
    <div className="tool-page story-workspace">
      <header className="workspace-status-bar">
        <div className="workspace-status-bar__copy">
          <p className="workspace-status-bar__eyebrow">{workspaceStatusLabel}</p>
          <div className="workspace-status-bar__headline">
            <span className="workspace-status-bar__title">{workspaceStatusTitle}</span>
            <p className="workspace-status-bar__note">{workspaceStatusNote}</p>
          </div>
        </div>

        <div className="workspace-status-bar__right">
          <span className={`mode-pill ${isEditing ? 'mode-pill-editing' : 'mode-pill-new'}`}>
            {isEditing ? 'Em revisão' : 'Nova'}
          </span>
          <span
            className={`story-workspace__mini-pill ${hasReachedLimit ? 'story-workspace__mini-pill--warning' : ''}`}
          >
            {isPremium
              ? 'Pro'
              : `${remainingGenerations} ${remainingGenerations === 1 ? 'geração' : 'gerações'}`}
          </span>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Áreas do workspace">
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
    </div>
  )
}

export default ToolPage
