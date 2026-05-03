import { useEffect, useMemo, useState } from 'react'
import BriefComposer from '../components/workspace/BriefComposer'
import HistoryDrawerPanel from '../components/workspace/HistoryDrawerPanel'
import OnboardingModal from '../components/workspace/OnboardingModal'
import QualityPanel from '../components/workspace/QualityPanel'
import StoryDocument from '../components/workspace/StoryDocument'
import WorkspaceEmptyState from '../components/workspace/WorkspaceEmptyState'
import WorkspaceErrorState from '../components/workspace/WorkspaceErrorState'
import WorkspaceLoadingState from '../components/workspace/WorkspaceLoadingState'
import { useAuth } from '../hooks/useAuth'
import { useUserStoryWorkspace } from '../hooks/useUserStoryWorkspace'

const TABS = [
  { id: 'entrada', label: 'Brief' },
  { id: 'resultado', label: 'Story' },
  { id: 'revisao', label: 'Revisao' },
]

const DEFAULT_PANEL_PREFERENCES = Object.freeze({
  briefing: 'auto',
  inspection: 'auto',
  history: 'auto',
})

const DESKTOP_COLLAPSIBLE_QUERY = '(min-width: 1280px)'

function getWorkspacePanelsStorageKey(userId) {
  return userId ? `pf_tool_panels_${userId}` : null
}

function readWorkspacePanelPreferences(userId) {
  if (typeof window === 'undefined' || !userId) {
    return { ...DEFAULT_PANEL_PREFERENCES }
  }

  try {
    const rawValue = window.localStorage.getItem(getWorkspacePanelsStorageKey(userId))
    if (!rawValue) {
      return { ...DEFAULT_PANEL_PREFERENCES }
    }

    return {
      ...DEFAULT_PANEL_PREFERENCES,
      ...JSON.parse(rawValue),
    }
  } catch (error) {
    console.error('Falha ao ler preferencias de paineis:', error)
    return { ...DEFAULT_PANEL_PREFERENCES }
  }
}

function hasSeenOnboarding(storageKey) {
  if (typeof window === 'undefined' || !storageKey) return true

  try {
    return Boolean(window.localStorage.getItem(storageKey))
  } catch (error) {
    console.error('Falha ao ler onboarding do workspace:', error)
    return true
  }
}

function getMediaQueryMatch(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(query).matches
}

function ToolPage() {
  const [mobileTab, setMobileTab] = useState('entrada')
  const [dismissedOnboardingKey, setDismissedOnboardingKey] = useState(null)
  const [canCollapseDesktopPanels, setCanCollapseDesktopPanels] = useState(() =>
    getMediaQueryMatch(DESKTOP_COLLAPSIBLE_QUERY),
  )
  const { user } = useAuth()
  const onboardingStorageKey = user ? `pf_ob_${user.id}` : null
  const [panelPreferences, setPanelPreferences] = useState(() =>
    readWorkspacePanelPreferences(user?.id),
  )

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

  useEffect(() => {
    const storageKey = getWorkspacePanelsStorageKey(user?.id)
    if (!storageKey || typeof window === 'undefined') return

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(panelPreferences))
    } catch (error) {
      console.error('Falha ao salvar preferencias de paineis:', error)
    }
  }, [panelPreferences, user])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQueryList = window.matchMedia(DESKTOP_COLLAPSIBLE_QUERY)
    const syncDesktopCollapseAvailability = (event) => {
      setCanCollapseDesktopPanels(event.matches)
    }

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', syncDesktopCollapseAvailability)
      return () => mediaQueryList.removeEventListener('change', syncDesktopCollapseAvailability)
    }

    mediaQueryList.addListener(syncDesktopCollapseAvailability)
    return () => mediaQueryList.removeListener(syncDesktopCollapseAvailability)
  }, [])

  function dismissOnboarding() {
    if (typeof window !== 'undefined' && onboardingStorageKey) {
      window.localStorage.setItem(onboardingStorageKey, '1')
      setDismissedOnboardingKey(onboardingStorageKey)
    }
  }

  function updatePanelPreference(panelId, value) {
    setPanelPreferences((current) => ({
      ...current,
      [panelId]: value,
    }))
  }

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

  const isBriefingCollapsed =
    panelPreferences.briefing === 'collapsed' ||
    (panelPreferences.briefing === 'auto' && Boolean(reviewStory))
  const isInspectionCollapsed =
    canCollapseDesktopPanels &&
    (panelPreferences.inspection === 'collapsed' ||
      (panelPreferences.inspection === 'auto' && !reviewStory))
  const isHistoryCollapsed =
    canCollapseDesktopPanels &&
    (panelPreferences.history === 'collapsed' || panelPreferences.history === 'auto')

  function toggleBriefingPanel() {
    updatePanelPreference('briefing', isBriefingCollapsed ? 'open' : 'collapsed')
  }

  function toggleInspectionPanel() {
    updatePanelPreference('inspection', isInspectionCollapsed ? 'open' : 'collapsed')
  }

  function toggleHistoryPanel() {
    updatePanelPreference('history', isHistoryCollapsed ? 'open' : 'collapsed')
  }

  function applyTemplateToBriefing(template) {
    handleFieldChange('problemContext', template.context)
    handleFieldChange('requirements', template.requirements)
    setMobileTab('entrada')
    updatePanelPreference('briefing', 'open')
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
  const workspaceStatusLabel = isEditing ? 'Base ativa' : 'Nova base'
  const workspaceStatusTitle = isEditing && activeStoryTitle ? activeStoryTitle : 'Nova user story'
  const workspaceStatusNote = isEditing
    ? 'Revise a versao ativa, ajuste o texto e exporte quando estiver pronta.'
    : 'Preencha o brief, gere a story e siga para revisao no mesmo fluxo.'
  const showOnboarding = Boolean(
    onboardingStorageKey &&
      dismissedOnboardingKey !== onboardingStorageKey &&
      !hasSeenOnboarding(onboardingStorageKey),
  )

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
      <div
        className={`workspace-right-panel__review ${
          isInspectionCollapsed ? 'workspace-right-panel__review--collapsed' : ''
        }`}
      >
        <QualityPanel
          story={reviewStory}
          isPremium={isPremium}
          remainingGenerations={remainingGenerations}
          hasReachedLimit={hasReachedLimit}
          onCopyPlain={() => handleCopy(reviewStory)}
          plainCopyMessage={copyMessage}
          isCopyingPlain={isCopying}
          isCollapsed={isInspectionCollapsed}
          canCollapse={canCollapseDesktopPanels}
          onToggleCollapse={toggleInspectionPanel}
        />
      </div>

      <div
        className={`workspace-right-panel__history ${
          isHistoryCollapsed ? 'workspace-right-panel__history--collapsed' : ''
        }`}
      >
        <HistoryDrawerPanel
          items={recentStories}
          selectedId={selectedStoryId}
          isLoadingRecent={isLoadingRecent}
          onSelectHistory={handleSelectHistory}
          loadErrorMessage={historyError}
          reloadRecent={loadRecentStories}
          filterValue={historyFilter}
          onFilterChange={setHistoryFilter}
          isEditing={isEditing}
          versions={versions}
          isLoadingVersions={isLoadingVersions}
          onSelectVersion={handleSelectVersion}
          selectedVersion={selectedVersion}
          previousVersion={previousVersion}
          activeStoryTitle={activeStoryTitle}
          isCollapsed={isHistoryCollapsed}
          canCollapse={canCollapseDesktopPanels}
          onToggleCollapse={toggleHistoryPanel}
        />
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
            {isEditing ? 'Em revisao' : 'Nova'}
          </span>
          <span
            className={`story-workspace__mini-pill ${hasReachedLimit ? 'story-workspace__mini-pill--warning' : ''}`}
          >
            {isPremium
              ? 'Pro'
              : `${remainingGenerations} ${remainingGenerations === 1 ? 'geracao' : 'geracoes'}`}
          </span>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Areas do workspace">
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

      <div
        className={`workspace-canvas ${
          isBriefingCollapsed ? 'workspace-canvas--briefing-collapsed' : ''
        } ${isInspectionCollapsed ? 'workspace-canvas--inspection-collapsed' : ''} ${
          isHistoryCollapsed ? 'workspace-canvas--history-collapsed' : ''
        }`.trim()}
      >
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
            onSubmit={handleSubmitStory}
            onReset={handleResetToCreate}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            isGenerated={Boolean(result)}
            activeStoryTitle={activeStoryTitle}
            hasAdjustment={Boolean(formValues.adjustment.trim())}
            isCollapsed={isBriefingCollapsed}
            onToggleCollapse={toggleBriefingPanel}
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
