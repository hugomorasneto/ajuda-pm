import { useMemo } from 'react'
import BriefComposer from '../components/workspace/BriefComposer'
import QualityPanel from '../components/workspace/QualityPanel'
import RecentStoriesPanel from '../components/workspace/RecentStoriesPanel'
import StoryDocument from '../components/workspace/StoryDocument'
import VersionDiffSummary from '../components/workspace/VersionDiffSummary'
import VersionTimeline from '../components/workspace/VersionTimeline'
import WorkspaceEmptyState from '../components/workspace/WorkspaceEmptyState'
import WorkspaceErrorState from '../components/workspace/WorkspaceErrorState'
import WorkspaceLoadingState from '../components/workspace/WorkspaceLoadingState'
import { APP_NAME } from '../constants/app'
import { useUserStoryWorkspace } from '../hooks/useUserStoryWorkspace'

function ToolPage() {
  const {
    activeStoryTitle,
    copyMessage,
    editDraft,
    formValues,
    freeGenerationLimit,
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
    usageCount,
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

  return (
    <div className="page tool-page story-workspace">
      <section className="tool-header story-workspace__header">
        <p className="story-workspace__eyebrow">{APP_NAME}</p>
        <h1>Criação, revisão e comparação de user stories</h1>
        <p>
          Estruture o contexto, gere versões e revise o documento antes de compartilhar com dev,
          QA e produto.
        </p>
      </section>

      <div className="story-workspace__summary">
        <div className="story-workspace__summary-pills" aria-label="Resumo da área de trabalho">
          <span className="story-workspace__mini-pill">Plano {isPremium ? 'Premium' : 'Free'}</span>
          <span
            className={`story-workspace__mini-pill ${hasReachedLimit ? 'story-workspace__mini-pill--warning' : ''}`}
          >
            {isPremium
              ? 'Gerações liberadas'
              : `${remainingGenerations} ${remainingGenerations === 1 ? 'geração restante' : 'gerações restantes'}`}
          </span>
        </div>

        <div className="tool-mode-banner">
          <span className={`mode-pill ${isEditing ? 'mode-pill-editing' : 'mode-pill-new'}`}>
            {isEditing ? 'Versão ativa' : 'Nova user story'}
          </span>
        </div>
      </div>

      <div className="tool-grid story-workspace__grid">
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

        {documentCanvas}

        <QualityPanel
          story={reviewStory}
          isPremium={isPremium}
          usageCount={usageCount}
          remainingGenerations={remainingGenerations}
          freeGenerationLimit={freeGenerationLimit}
          hasReachedLimit={hasReachedLimit}
          onCopyPlain={() => handleCopy(reviewStory)}
          plainCopyMessage={copyMessage}
          isCopyingPlain={isCopying}
        />
      </div>

      <div className="story-workspace__navigation-grid">
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
          <div className="story-workspace__versions-stack">
            <VersionTimeline
              versions={versions}
              selectedId={selectedStoryId}
              isLoading={isLoadingVersions}
              onSelect={handleSelectVersion}
            />

            <VersionDiffSummary currentVersion={selectedVersion} previousVersion={previousVersion} />
          </div>
        ) : (
          <section className="panel story-workspace__versions-placeholder">
            <div className="panel-header">
              <p className="version-timeline__eyebrow">Versões</p>
              <h2>A linha do tempo aparece depois da primeira geração.</h2>
              <p>
                Gere uma user story para começar a comparar versões, revisar mudanças e navegar
                pela evolução da mesma base.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default ToolPage
