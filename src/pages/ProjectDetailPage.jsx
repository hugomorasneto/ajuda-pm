import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useCopy, useLanguage } from '../i18n/context'
import { formatNotice } from '../i18n/formatNotice'
import Link from '../i18n/LocalizedLink'
import { localizeHref } from '../i18n/routes'
import { useAuth } from '../hooks/useAuth'
import {
  addProjectMemberByEmail,
  checkCanManageProject,
  getProjectById,
  listProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from '../services/projectsService'
import {
  listStoryHistoryGroups,
  updateUserStoryEstimationStatus,
} from '../services/userStoriesService'
import {
  createProjectKanbanColumn,
  listProjectKanbanBoard,
  moveProjectKanbanStory,
  reorderProjectKanbanColumn,
  updateProjectKanbanColumn,
} from '../services/projectKanbanService'
import {
  listPlanningPokerSessionStorySummaries,
  listPlanningPokerSessionsByProject,
} from '../services/planningPokerService'
import {
  analyzeProject,
  buildProjectAnalysisMarkdown,
  deleteProjectAnalysis,
  listProjectAnalyses,
  saveProjectAnalysis,
} from '../services/projectAiService'
import {
  LIVE_PLANNING_SESSION_STATUSES,
  PLANNING_SESSION_STATUS_LABELS,
  getPlanningStorySessionIndex,
} from '../utils/planningPokerUtils'
import {
  buildProjectActionPlanMarkdown,
  findProjectInsightCandidateStory,
  getProjectInsightFreshness,
} from '../utils/projectInsightsUtils'
import { normalizeStorySearchQuery, storyMatchesSearch } from '../utils/storySearchUtils'
import { copyTextToClipboard } from '../utils/storyExport'

const projectAnalysisErrorKeys = {
  INVALID_INPUT: 'invalid_analysis_input',
  AUTH_REQUIRED: 'session_expired',
  RATE_LIMIT: 'analysis_rate_limit',
  PROVIDER_UNAVAILABLE: 'analysis_unavailable',
  TIMEOUT: 'analysis_timeout',
  NETWORK: 'analysis_network_error',
}

const projectErrorKeys = new Map([
  ['Informe um nome para o projeto.', 'project_name_required'],
  ['Informe um nome para a coluna.', 'column_name_required'],
  ['Informe o e-mail do membro.', 'member_email_required'],
  ['Usuário não encontrado para esse e-mail.', 'member_email_not_found'],
  ['História não encontrada.', 'story_missing'],
  ['História não encontrada neste projeto.', 'story_missing'],
  ['Membro não encontrado neste projeto.', 'member_missing'],
  ['Coluna não encontrada.', 'column_missing'],
  ['Coluna não encontrada neste projeto.', 'column_missing'],
])

const PROJECT_MEMBER_ROLES = [
  { value: 'member', label: 'member' },
  { value: 'admin', label: 'administrator' },
  { value: 'viewer', label: 'viewer' },
]

const ROLE_LABELS = {
  owner: 'owner',
  admin: 'administrator',
  member: 'member',
  viewer: 'viewer',
}

const PROJECT_ACCESS_DETAILS = {
  owner: {
    title: 'project_owner',
    description: 'full_control_over_the_project_members_columns',
    nextAction: 'use_this_access_to_keep_project_context',
  },
  admin: {
    title: 'project_administrator',
    description: 'you_can_edit_the_project_manage_members',
    nextAction: 'manage_day_to_day_work_independently_of',
  },
  member: {
    title: 'project_member',
    description: 'you_can_move_stories_on_the_board',
    nextAction: 'organize_stories_and_bring_ready_items_to',
  },
  viewer: {
    title: 'project_viewer',
    description: 'you_can_view_project_context_stories_the',
    nextAction: 'request_member_or_administrator_access_if_you',
  },
  none: {
    title: 'checking_access',
    description: 'prodforge_is_loading_your_role_in_this',
    nextAction: 'actions_will_appear_once_your_permissions_are',
  },
}

const ESTIMATION_STATUS_LABELS = {
  created: 'created',
  refining: 'refining',
  ready_for_estimation: 'ready_to_estimate',
  estimated: 'estimated',
}

const ESTIMATION_STATUS_OPTIONS = [
  { value: 'created', label: 'created' },
  { value: 'refining', label: 'refining' },
  { value: 'ready_for_estimation', label: 'ready_to_estimate' },
  { value: 'estimated', label: 'estimated' },
]

const STORY_ESTIMATION_FILTER_OPTIONS = [
  { value: 'all', label: 'all' },
  ...ESTIMATION_STATUS_OPTIONS,
]

const STORY_STATUS_QUICK_FILTERS = [
  { value: 'all', label: 'all', hint: 'full_view' },
  { value: 'created', label: 'created_2', hint: 'awaiting_preparation' },
  { value: 'refining', label: 'refining', hint: 'refinement_in_progress' },
  { value: 'ready_for_estimation', label: 'ready', hint: 'available_for_planning_poker' },
  { value: 'estimated', label: 'estimated_2', hint: 'already_scored' },
]

const PROJECT_GUIDED_STATUS_LABELS = {
  complete: 'completed',
  current: 'now',
  next: 'next',
}

function formatProjectDateTime(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getEstimationStatusLabel(status, t) {
  return t(ESTIMATION_STATUS_LABELS[status] ?? ESTIMATION_STATUS_LABELS.created)
}

function getPlanningStatusLabel(status, t) {
  const code = Object.hasOwn(PLANNING_SESSION_STATUS_LABELS, status) ? status : 'draft'
  return t('planning_status_' + code)
}

function getKanbanColumnLabel(column, t) {
  const key = 'default_column_' + column.status_base
  return column.is_default && t(key, { lng: 'pt-BR' }) === column.name ? t(key) : column.name
}

function getStoryVersionLabel(versionNumber, t) {
  const count = Number(versionNumber ?? 1)
  const safeCount = Number.isFinite(count) && count > 0 ? count : 1
  return `${safeCount} ${safeCount === 1 ? t('version') : t('versions')}`
}

function getStoryPreview(story, t) {
  return story?.input_context?.trim() || story?.user_story?.trim() || t('no_description')
}

function getKanbanColumnIntent(statusBase, t) {
  const intents = {
    created: t('new_stories_that_haven_t_been_prepared'),
    refining: t('stories_that_need_work_before_estimation'),
    ready_for_estimation: t('stories_ready_to_take_into_a_planning'),
    estimated: t('stories_with_a_final_score_or_recorded'),
  }

  return intents[statusBase] ?? t('custom_column_in_the_project_s_workflow')
}

function getKanbanColumnEmptyText(statusBase, t) {
  const texts = {
    created: t('new_stories_linked_to_the_project_appear'),
    refining: t('move_stories_that_need_more_work_before'),
    ready_for_estimation: t('move_stories_here_when_they_re_ready'),
    estimated: t('stories_finalized_in_planning_poker_appear_here'),
  }

  return texts[statusBase] ?? t('drag_a_story_to_this_column_when')
}

function isStoryInLivePlanningSession(story, planningStorySessionById = {}) {
  return Boolean(planningStorySessionById[story?.id]?.isLive)
}

function isReadyStoryAvailableForPlanning(story, planningStorySessionById = {}) {
  return (
    story?.estimation_status === 'ready_for_estimation' &&
    !isStoryInLivePlanningSession(story, planningStorySessionById)
  )
}

function countAvailableReadyStories(stories = [], planningStorySessionById = {}) {
  return stories.filter((story) => isReadyStoryAvailableForPlanning(story, planningStorySessionById)).length
}

function ProjectInsightList({ title, items, emptyText, defaultOpen = false }) {
  const t = useCopy('projectDetail')
  const safeItems = Array.isArray(items) ? items : []
  const countLabel = safeItems.length === 1 ? t('1_item') : t('items', { p1: safeItems.length })

  return (
    <details className="project-detail-page__ai-detail-card" open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{safeItems.length > 0 ? countLabel : t('no_items')}</small>
        </span>
      </summary>
      {safeItems.length > 0 ? (
        <ul>
          {safeItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </details>
  )
}

function ProjectDetailPage() {
  const t = useCopy('projectDetail')
  const tInsights = useCopy('projectInsights')
  const { language, preview } = useLanguage()
  const { projectId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [project, setProject] = useState(null)
  const [projectMembers, setProjectMembers] = useState([])
  const [projectStories, setProjectStories] = useState([])
  const [kanbanColumns, setKanbanColumns] = useState([])
  const [planningSessions, setPlanningSessions] = useState([])
  const [planningSessionStoriesBySession, setPlanningSessionStoriesBySession] = useState({})
  const [projectStoryCount, setProjectStoryCount] = useState(0)
  const [projectStoryFilteredCount, setProjectStoryFilteredCount] = useState(0)
  const [projectStoryStatusCounts, setProjectStoryStatusCounts] = useState({
    created: 0,
    refining: 0,
    ready_for_estimation: 0,
    estimated: 0,
  })
  const [selectedProjectStoryIds, setSelectedProjectStoryIds] = useState([])
  const [storyEstimationFilter, setStoryEstimationFilter] = useState('all')
  const [storySearchInput, setStorySearchInput] = useState('')
  const [storyViewMode, setStoryViewMode] = useState('board')
  const [isInsightCandidateFilterActive, setIsInsightCandidateFilterActive] = useState(false)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('')
  const [newKanbanColumnName, setNewKanbanColumnName] = useState('')
  const [newKanbanColumnStatusBase, setNewKanbanColumnStatusBase] = useState('created')
  const [editingKanbanColumnId, setEditingKanbanColumnId] = useState(null)
  const [editingKanbanColumnName, setEditingKanbanColumnName] = useState('')
  const [editingKanbanColumnStatusBase, setEditingKanbanColumnStatusBase] = useState('created')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [isLoadingKanban, setIsLoadingKanban] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isCreatingKanbanColumn, setIsCreatingKanbanColumn] = useState(false)
  const [isAddingProjectMember, setIsAddingProjectMember] = useState(false)
  const [updatingProjectMemberId, setUpdatingProjectMemberId] = useState(null)
  const [removingProjectMemberId, setRemovingProjectMemberId] = useState(null)
  const [updatingStoryStatusId, setUpdatingStoryStatusId] = useState(null)
  const [movingKanbanStoryId, setMovingKanbanStoryId] = useState(null)
  const [reorderingKanbanColumnId, setReorderingKanbanColumnId] = useState(null)
  const [savingKanbanColumnId, setSavingKanbanColumnId] = useState(null)
  const [draggedKanbanStoryId, setDraggedKanbanStoryId] = useState(null)
  const [dragOverKanbanColumnId, setDragOverKanbanColumnId] = useState(null)
  const [canManageProjectMembers, setCanManageProjectMembers] = useState(false)
  const [projectMessage, setProjectMessage] = useState('')
  const [storyStatusMessage, setStoryStatusMessage] = useState('')
  const [kanbanMessage, setKanbanMessage] = useState('')
  const [planningSummaryMessage, setPlanningSummaryMessage] = useState('')
  const [memberMessage, setMemberMessage] = useState('')
  const [projectInsights, setProjectInsights] = useState(null)
  const [projectInsightsMessage, setProjectInsightsMessage] = useState('')
  const [projectInsightsCopyFeedback, setProjectInsightsCopyFeedback] = useState('')
  const [projectInsightHistory, setProjectInsightHistory] = useState([])
  const [activeProjectInsightId, setActiveProjectInsightId] = useState(null)
  const [deletingProjectInsightId, setDeletingProjectInsightId] = useState(null)
  const [isLoadingProjectInsightHistory, setIsLoadingProjectInsightHistory] = useState(false)
  const [isProjectInsightHistoryUnavailable, setIsProjectInsightHistoryUnavailable] = useState(false)
  const [isGeneratingProjectInsights, setIsGeneratingProjectInsights] = useState(false)
  const [isPreparingInsightCandidates, setIsPreparingInsightCandidates] = useState(false)
  const [isKanbanUnavailable, setIsKanbanUnavailable] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const storiesLabel = useMemo(
    () => `${projectStoryCount} ${projectStoryCount === 1 ? t('story') : t('stories_2')}`,
    [t, projectStoryCount],
  )
  const membersLabel = useMemo(
    () => `${projectMembers.length} ${t('member', { count: projectMembers.length })}`,
    [t, projectMembers.length],
  )
  const currentProjectRole = useMemo(() => {
    const memberRoleValue = projectMembers.find((member) => member.user_id === userId)?.role
    if (memberRoleValue) return memberRoleValue
    return project?.owner_id === userId ? 'owner' : null
  }, [project?.owner_id, projectMembers, userId])
  const canEditKanbanColumns = canManageProjectMembers
  const canMoveKanbanCards = ['owner', 'admin', 'member'].includes(currentProjectRole)
  const currentAccessDetails = PROJECT_ACCESS_DETAILS[currentProjectRole] ?? PROJECT_ACCESS_DETAILS.none
  const currentProjectRoleLabel = ROLE_LABELS[currentProjectRole] ? t(ROLE_LABELS[currentProjectRole]) : t('loading')
  const projectAccessCapabilities = useMemo(
    () => [
      {
        label: t('edit_project_and_members'),
        enabled: canManageProjectMembers,
        detail: canManageProjectMembers ? t('allowed') : t('owners_and_administrators_only'),
      },
      {
        label: t('create_and_edit_columns'),
        enabled: canEditKanbanColumns,
        detail: canEditKanbanColumns ? t('allowed') : t('view_only'),
      },
      {
        label: t('move_stories_on_the_kanban_board'),
        enabled: canMoveKanbanCards,
        detail: canMoveKanbanCards ? t('allowed') : t('view_only'),
      },
      {
        label: t('create_planning_poker_sessions'),
        enabled: canManageProjectMembers,
        detail: canManageProjectMembers ? t('allowed') : t('owners_and_administrators_only'),
      },
    ],
    [t, canEditKanbanColumns, canManageProjectMembers, canMoveKanbanCards],
  )
  const filteredStoriesLabel = useMemo(
    () =>
      `${projectStoryFilteredCount} ${
        projectStoryFilteredCount === 1 ? t('story_found') : t('stories_found')
      }`,
    [t, projectStoryFilteredCount],
  )
  const currentStoryFilterLabel = useMemo(
    () =>
      t(STORY_ESTIMATION_FILTER_OPTIONS.find((option) => option.value === storyEstimationFilter)?.label ?? 'all'),
    [t, storyEstimationFilter],
  )
  const storySearchQuery = normalizeStorySearchQuery(storySearchInput)
  const isStorySearchActive = storySearchQuery.length > 0
  const hasNoProjectStories = !isLoadingStories && projectStoryCount === 0
  const hasProjectStories = projectStoryCount > 0
  const shouldShowStoryLimitNotice =
    storyViewMode === 'list' && projectStoryFilteredCount > projectStories.length
  const canGenerateProjectInsights = Boolean(project && projectStoryCount > 0 && !isGeneratingProjectInsights)
  const readyStoryCount = projectStoryStatusCounts.ready_for_estimation
  const refiningStoryCount = projectStoryStatusCounts.refining
  const estimatedStoryCount = projectStoryStatusCounts.estimated
  const kanbanStories = useMemo(
    () => kanbanColumns.flatMap((column) => column.cards ?? []),
    [kanbanColumns],
  )
  const planningStorySessionById = useMemo(
    () => getPlanningStorySessionIndex(planningSessions, planningSessionStoriesBySession),
    [planningSessionStoriesBySession, planningSessions],
  )
  const projectInsightCandidateCards = useMemo(() => {
    if (!projectInsights?.estimation_candidates?.length) return []

    const storiesById = new Map(
      [...kanbanStories, ...projectStories].filter(Boolean).map((story) => [story.id, story]),
    )
    const searchableStories = Array.from(storiesById.values())

    return projectInsights.estimation_candidates.map((candidate) => {
      const matchedStory = findProjectInsightCandidateStory(candidate, searchableStories)

      return {
        candidate,
        story: matchedStory,
      }
    })
  }, [kanbanStories, projectInsights, projectStories])
  const actionableInsightCandidateStories = useMemo(
    () =>
      projectInsightCandidateCards
        .map((item) => item.story)
        .filter(
          (story, index, stories) =>
            story &&
            stories.findIndex((current) => current?.id === story.id) === index &&
            !['ready_for_estimation', 'estimated'].includes(story.estimation_status),
        ),
    [projectInsightCandidateCards],
  )
  const projectInsightCandidateStoryIds = useMemo(
    () =>
      projectInsightCandidateCards
        .map((item) => item.story?.id)
        .filter((storyId, index, storyIds) => storyId && storyIds.indexOf(storyId) === index),
    [projectInsightCandidateCards],
  )
  const readyInsightCandidateStoryIds = useMemo(
    () =>
      projectInsightCandidateCards
        .map((item) => item.story)
        .filter((story, index, stories) =>
          story &&
          story.estimation_status === 'ready_for_estimation' &&
          stories.findIndex((current) => current?.id === story.id) === index,
        )
        .map((story) => story.id),
    [projectInsightCandidateCards],
  )
  const projectInsightCandidateStoryIdSet = useMemo(
    () => new Set(projectInsightCandidateStoryIds),
    [projectInsightCandidateStoryIds],
  )
  const insightCandidateFilterLabel =
    projectInsightCandidateStoryIds.length === 1
      ? t('1_ai_candidate')
      : t('ai_candidates', { p1: projectInsightCandidateStoryIds.length })
  const shouldFocusInsightCandidates =
    isInsightCandidateFilterActive && projectInsightCandidateStoryIds.length > 0
  const projectActionPlanItems = useMemo(() => {
    const nextActions = (projectInsights?.next_actions ?? []).map((item) => String(item).trim()).filter(Boolean)
    return nextActions.length > 0
      ? nextActions.slice(0, 3)
      : [t('choose_the_next_action_with_the_pm')]
  }, [t, projectInsights])
  const projectActionPlanStats = useMemo(
    () => [
      {
        label: t('risks'),
        value: projectInsights?.risks?.length ?? 0,
        detail: t('to_review'),
      },
      {
        label: t('questions'),
        value: projectInsights?.refinement_questions?.length ?? 0,
        detail: t('to_discuss'),
      },
      {
        label: t('candidates'),
        value: projectInsightCandidateStoryIds.length,
        detail: t('to_estimate'),
      },
      {
        label: t('ready'),
        value: readyInsightCandidateStoryIds.length,
        detail: t('for_planning_poker'),
      },
    ],
    [
      t,
      projectInsightCandidateStoryIds.length,
      projectInsights?.refinement_questions?.length,
      projectInsights?.risks?.length,
      readyInsightCandidateStoryIds.length,
    ],
  )
  const livePlanningStoryCount = useMemo(
    () =>
      Object.values(planningStorySessionById).filter((entry) =>
        LIVE_PLANNING_SESSION_STATUSES.includes(entry.session?.status),
      ).length,
    [planningStorySessionById],
  )
  const livePlanningSessionCount = useMemo(
    () => planningSessions.filter((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)).length,
    [planningSessions],
  )
  const completedPlanningSessionCount = useMemo(
    () => planningSessions.filter((session) => session.status === 'completed').length,
    [planningSessions],
  )
  const visibleKanbanColumns = useMemo(
    () =>
      kanbanColumns.map((column) => ({
        ...column,
        cards:
          (column.cards ?? []).filter((story) => {
            const matchesStatus =
              storyEstimationFilter === 'all' || story.estimation_status === storyEstimationFilter
            const matchesInsightCandidate =
              !shouldFocusInsightCandidates || projectInsightCandidateStoryIdSet.has(story.id)
            const matchesSearch = storyMatchesSearch(story, storySearchQuery)
            return matchesStatus && matchesInsightCandidate && matchesSearch
          }),
      })),
    [
      kanbanColumns,
      projectInsightCandidateStoryIdSet,
      shouldFocusInsightCandidates,
      storyEstimationFilter,
      storySearchQuery,
    ],
  )
  const visibleKanbanStories = useMemo(
    () => visibleKanbanColumns.flatMap((column) => column.cards ?? []),
    [visibleKanbanColumns],
  )
  const visibleProjectStories = useMemo(
    () =>
      projectStories.filter((story) => {
        const matchesInsightCandidate =
          !shouldFocusInsightCandidates || projectInsightCandidateStoryIdSet.has(story.id)
        const matchesSearch = storyMatchesSearch(story, storySearchQuery)
        return matchesInsightCandidate && matchesSearch
      }),
    [projectInsightCandidateStoryIdSet, projectStories, shouldFocusInsightCandidates, storySearchQuery],
  )
  const visibleReadyStories = useMemo(() => {
    const sourceStories = storyViewMode === 'board' ? visibleKanbanStories : visibleProjectStories
    return sourceStories.filter((story) => story.estimation_status === 'ready_for_estimation')
  }, [storyViewMode, visibleKanbanStories, visibleProjectStories])
  const visibleAvailableReadyStories = useMemo(
    () => visibleReadyStories.filter((story) => isReadyStoryAvailableForPlanning(story, planningStorySessionById)),
    [planningStorySessionById, visibleReadyStories],
  )
  const selectedReadyStories = useMemo(
    () => visibleReadyStories.filter((story) => selectedProjectStoryIds.includes(story.id)),
    [selectedProjectStoryIds, visibleReadyStories],
  )
  const selectedReadyStoriesInLiveSessions = useMemo(
    () => selectedReadyStories.filter((story) => planningStorySessionById[story.id]?.isLive),
    [planningStorySessionById, selectedReadyStories],
  )
  const selectedReadyStoryIds = selectedReadyStories.map((story) => story.id)
  const visibleAvailableReadyCount = visibleAvailableReadyStories.length
  const visibleReadyBlockedCount = Math.max(0, visibleReadyStories.length - visibleAvailableReadyCount)
  const visibleKanbanLiveCount = useMemo(
    () => visibleKanbanStories.filter((story) => planningStorySessionById[story.id]?.isLive).length,
    [planningStorySessionById, visibleKanbanStories],
  )
  const selectedReadyStoriesLabel =
    selectedReadyStoryIds.length === 1
      ? t('1_selected_story')
      : t('selected_stories', { p1: selectedReadyStoryIds.length })
  const selectedReadyStoriesHint =
    selectedReadyStoriesInLiveSessions.length > 0
      ? t('already_in_an_active_session_remove_them', { p1: selectedReadyStoriesInLiveSessions.length, p2: selectedReadyStoriesInLiveSessions.length === 1 ? t('is') : t('are') })
      : visibleAvailableReadyCount > 0
        ? t('to_open_a_new_session', { p1: visibleAvailableReadyCount, p2: visibleAvailableReadyCount === 1 ? t('available_story') : t('available_stories') })
        : visibleReadyBlockedCount > 0
          ? t('the_visible_stories_that_are_ready_are')
          : t('select_ready_stories_from_the_board_or')
  const canOpenSelectedReadyStories =
    selectedReadyStoryIds.length > 0 && selectedReadyStoriesInLiveSessions.length === 0
  const selectedReadyStoriesRodaUrl =
    selectedReadyStoryIds.length > 0
      ? `/roda?projectId=${projectId}&storyIds=${selectedReadyStoryIds.join(',')}`
      : `/roda?projectId=${projectId}`
  const visibleKanbanStoryCount = visibleKanbanStories.length
  const visibleProjectStoryCount = visibleProjectStories.length
  const storySearchDisplay = storySearchInput.trim()
  const storySearchResultCount = storyViewMode === 'board' ? visibleKanbanStoryCount : visibleProjectStoryCount
  const storySearchResultLabel = `${storySearchResultCount} ${
    storySearchResultCount === 1 ? t('result_found') : t('results_found')
  }`
  const hasNoStoriesForInsightCandidateFilter =
    !isLoadingStories &&
    hasProjectStories &&
    shouldFocusInsightCandidates &&
    ((storyViewMode === 'board' && visibleKanbanStoryCount === 0) ||
      (storyViewMode === 'list' && visibleProjectStoryCount === 0))
  const hasNoStoriesForLocalSearch =
    !isLoadingStories &&
    hasProjectStories &&
    isStorySearchActive &&
    !hasNoStoriesForInsightCandidateFilter &&
    ((storyViewMode === 'board' && visibleKanbanStoryCount === 0) ||
      (storyViewMode === 'list' && visibleProjectStoryCount === 0))
  const hasNoStoriesForFilter =
    !isLoadingStories &&
    projectStoryCount > 0 &&
    projectStories.length === 0 &&
    !hasNoStoriesForInsightCandidateFilter &&
    !hasNoStoriesForLocalSearch
  const kanbanBoardSummaryItems = useMemo(
    () => [
      {
        label: t('visible'),
        value: visibleKanbanStoryCount,
        detail: visibleKanbanStoryCount === 1 ? t('card_on_the_board') : t('cards_on_the_board'),
      },
      {
        label: t('available'),
        value: visibleAvailableReadyCount,
        detail: t('ready_for_a_new_session'),
      },
      {
        label: t('selected'),
        value: selectedReadyStoryIds.length,
        detail: t('in_the_current_selection'),
      },
      {
        label: t('in_planning_poker'),
        value: visibleKanbanLiveCount,
        detail: t('active_sessions'),
      },
    ],
    [t, selectedReadyStoryIds.length, visibleAvailableReadyCount, visibleKanbanLiveCount, visibleKanbanStoryCount],
  )
  const kanbanBoardOperationTitle = canMoveKanbanCards
    ? t('drag_cards_or_use_move_card')
    : t('view_only_board')
  const kanbanBoardOperationText = canMoveKanbanCards
    ? t('moving_a_story_between_columns_updates_its')
    : t('your_role_lets_you_view_the_workflow')
  const shouldShowKanbanLimitNotice = storyViewMode === 'board' && projectStoryCount > kanbanStories.length
  const activeProjectInsightRecord = useMemo(
    () => projectInsightHistory.find((item) => item.id === activeProjectInsightId) ?? null,
    [activeProjectInsightId, projectInsightHistory],
  )
  const currentProjectInsightFreshness = useMemo(() => {
    if (!projectInsights) return null

    return getProjectInsightFreshness(
      activeProjectInsightRecord ?? {
        input_story_count: Number(projectInsights?.meta?.analyzed_stories ?? projectStoryCount),
        analysis: projectInsights,
      },
      projectStoryCount,
      tInsights,
    )
  }, [activeProjectInsightRecord, projectInsights, projectStoryCount, tInsights])
  const isProjectInsightOutdated = Boolean(currentProjectInsightFreshness?.isOutdated)
  const projectInsightExecutiveLabel = projectInsights
    ? isProjectInsightOutdated
      ? currentProjectInsightFreshness.label
      : projectInsights.health_label
    : t('no_diagnosis')
  const projectInsightExecutiveText = projectInsights
    ? isProjectInsightOutdated
      ? t('run_a_fresh_analysis_before_choosing_the', { p1: currentProjectInsightFreshness.description })
      : projectInsights.summary
    : t('run_an_ai_analysis_to_summarize_risks')
  const projectInsightExecutiveActionLabel = projectInsights
    ? isProjectInsightOutdated
      ? t('update_diagnosis')
      : t('view_diagnosis')
    : t('generate_diagnosis')
  const projectInsightOverviewStatus = projectInsights
    ? isProjectInsightOutdated
      ? currentProjectInsightFreshness.label
      : projectInsights.health_label
    : t('diagnosis_on_demand')
  const projectInsightOverviewMeta = projectInsights
    ? `${Number(projectInsights?.meta?.analyzed_stories ?? projectStoryCount)} ${
        Number(projectInsights?.meta?.analyzed_stories ?? projectStoryCount) === 1
          ? t('story_analyzed')
          : t('stories_analyzed')
      }`
    : projectStoryCount > 0
      ? t('in_the_current_set', { p1: storiesLabel })
      : t('waiting_for_linked_stories')
  const latestProjectNextAction =
    (isProjectInsightOutdated
      ? t('update_the_diagnosis_to_analyze_the_latest')
      : projectInsights?.next_actions?.[0]) ??
    (projectStoryCount === 0
      ? t('forge_or_link_your_first_story_to')
      : t('generate_a_diagnosis_to_prioritize_risks_and'))
  const projectReadinessLabel = readyStoryCount > 0 ? t('ready_to_estimate_2') : t('in_progress')
  const projectReadinessText =
    projectStoryCount === 0
      ? t('no_stories_linked_yet')
      : readyStoryCount > 0
      ? t('for_planning_poker_2', { p1: readyStoryCount, p2: readyStoryCount === 1 ? t('story_ready') : t('stories_ready') })
      : t('in_refinement', { p1: refiningStoryCount, p2: estimatedStoryCount, p3: estimatedStoryCount === 1 ? t('estimated').toLocaleLowerCase(language) : t('estimated_2').toLocaleLowerCase(language) })
  const estimatedProgressPercent =
    projectStoryCount > 0 ? Math.round((estimatedStoryCount / projectStoryCount) * 100) : 0
  const readyProgressPercent =
    projectStoryCount > 0 ? Math.round((readyStoryCount / projectStoryCount) * 100) : 0
  const latestStoryActivityLabel = useMemo(() => {
    const dates = [...kanbanStories, ...projectStories]
      .map((story) => new Date(story?.created_at ?? '').getTime())
      .filter((timestamp) => Number.isFinite(timestamp))

    if (dates.length === 0) return t('no_activity')

    return formatProjectDateTime(Math.max(...dates), language)
  }, [language, t, kanbanStories, projectStories])
  const projectMetricsCards = useMemo(
    () => [
      {
        label: t('stories'),
        value: storiesLabel,
        detail:
          projectStoryCount > 0
            ? t('in_refinement_ready', { p1: refiningStoryCount, p2: readyStoryCount })
            : t('forge_or_link_your_first_story'),
        progress: projectStoryCount > 0 ? Math.min(100, Math.max(0, readyProgressPercent)) : 0,
        tone: readyStoryCount > 0 ? 'ready' : projectStoryCount > 0 ? 'attention' : 'idle',
        action:
          projectStoryCount > 0
            ? { label: t('view_board'), href: '#historias-projeto' }
            : { label: t('forge_story'), to: `/tool?projectId=${projectId}` },
      },
      {
        label: t('estimates'),
        value: t('estimated_percent', { percent: estimatedProgressPercent }),
        detail:
          projectStoryCount > 0
            ? t('stories_with_a_final_score', { p1: estimatedStoryCount, p2: projectStoryCount })
            : t('no_estimates_recorded_yet'),
        progress: estimatedProgressPercent,
        tone: estimatedStoryCount > 0 ? 'ready' : readyStoryCount > 0 ? 'attention' : 'idle',
        action:
          estimatedStoryCount > 0
            ? { label: t('view_sessions'), to: `/roda?projectId=${projectId}` }
            : { label: t('prepare_a_selection'), href: '#historias-projeto' },
      },
      {
        label: t('planning_poker_sessions'),
        value:
          livePlanningSessionCount > 0
            ? t('active_session', { count: livePlanningSessionCount })
            : t('completed_session', { count: completedPlanningSessionCount }),
        detail:
          livePlanningStoryCount > 0
            ? `${livePlanningStoryCount} ${
                livePlanningStoryCount === 1 ? t('story_in_an_active_session') : t('stories_in_active_sessions')
              }`
            : t('no_active_sessions_right_now'),
        progress: livePlanningSessionCount > 0 ? 100 : completedPlanningSessionCount > 0 ? 70 : 0,
        tone: livePlanningSessionCount > 0 ? 'live' : completedPlanningSessionCount > 0 ? 'ready' : 'idle',
        action: {
          label: livePlanningSessionCount > 0 ? t('continue_sessions') : t('open_sessions'),
          to: `/roda?projectId=${projectId}`,
        },
      },
      {
        label: t('latest_story'),
        value: latestStoryActivityLabel,
        detail:
          latestStoryActivityLabel === t('no_activity')
            ? t('no_stories_linked_to_this_project')
            : t('most_recent_story_linked_to_this_project'),
        progress: latestStoryActivityLabel === t('no_activity') ? 0 : 100,
        tone: latestStoryActivityLabel === t('no_activity') ? 'idle' : 'tech',
        action: { label: t('browse_stories'), to: `/historico?projectId=${projectId}` },
      },
    ],
    [
      t,
      completedPlanningSessionCount,
      estimatedProgressPercent,
      estimatedStoryCount,
      latestStoryActivityLabel,
      livePlanningSessionCount,
      livePlanningStoryCount,
      projectId,
      projectStoryCount,
      readyProgressPercent,
      readyStoryCount,
      refiningStoryCount,
      storiesLabel,
    ],
  )
  const projectGuidedSteps = useMemo(() => {
    const hasStories = projectStoryCount > 0
    const hasReadyOrEstimated = readyStoryCount > 0 || livePlanningStoryCount > 0 || estimatedStoryCount > 0
    const hasPlanningSession = livePlanningSessionCount > 0 || completedPlanningSessionCount > 0
    const hasFinalEstimate = estimatedStoryCount > 0 || completedPlanningSessionCount > 0
    const readyLabel =
      readyStoryCount === 1 ? t('1_ready_story') : t('ready_stories', { p1: readyStoryCount })
    const estimatedLabel =
      estimatedStoryCount === 1 ? t('1_estimated_story') : t('estimated_stories', { p1: estimatedStoryCount })

    return [
      {
        id: 'forge',
        title: t('forge_story'),
        description: hasStories
          ? t('to_the_project', { p1: projectStoryCount, p2: projectStoryCount === 1 ? t('story_linked') : t('stories_linked') })
          : t('create_your_first_story_with_this_project'),
        status: hasStories ? 'complete' : 'current',
        action: { label: hasStories ? t('new_story') : t('open_workbench'), to: `/tool?projectId=${projectId}` },
      },
      {
        id: 'kanban',
        title: t('organize_on_the_kanban_board'),
        description: hasStories
          ? t('use_the_board_to_group_stories_by')
          : t('the_board_will_appear_once_you_ve'),
        status: hasStories ? 'complete' : 'next',
        action: { label: t('view_board'), href: '#historias-projeto' },
      },
      {
        id: 'prepare',
        title: t('prepare_for_estimation'),
        description: hasReadyOrEstimated
          ? readyStoryCount > 0
            ? t('to_take_into_planning_poker', { p1: readyLabel })
            : t('this_project_already_has_stories_ready_or')
          : t('move_refined_stories_to_ready_to_estimate'),
        status: hasReadyOrEstimated ? 'complete' : hasStories ? 'current' : 'next',
        action: { label: t('prepare_stories'), href: '#historias-projeto' },
      },
      {
        id: 'planning',
        title: t('open_planning_poker'),
        description: hasPlanningSession
          ? livePlanningSessionCount > 0
            ? t('in_this_project', { p1: livePlanningSessionCount, p2: livePlanningSessionCount === 1 ? t('active_session') : t('active_sessions_2') })
            : t('planning_poker_history_is_available_to_browse')
          : t('create_a_session_when_there_are_stories'),
        status: hasPlanningSession ? 'complete' : readyStoryCount > 0 ? 'current' : 'next',
        action: { label: hasPlanningSession ? t('view_sessions') : t('create_session'), to: `/roda?projectId=${projectId}` },
      },
      {
        id: 'review',
        title: t('review_result'),
        description: hasFinalEstimate
          ? t('with_a_recorded_decision_for_prioritization', { p1: estimatedLabel })
          : livePlanningSessionCount > 0
            ? t('follow_the_open_session_and_select_the')
            : t('after_planning_poker_review_decisions_final_scores'),
        status: hasFinalEstimate ? 'complete' : livePlanningSessionCount > 0 ? 'current' : 'next',
        action: { label: t('browse_history'), to: `/roda?projectId=${projectId}` },
      },
    ]
  }, [
      t,
    completedPlanningSessionCount,
    estimatedStoryCount,
    livePlanningSessionCount,
    livePlanningStoryCount,
    projectId,
    projectStoryCount,
    readyStoryCount,
  ])
  const projectGuidedNextStep =
    projectGuidedSteps.find((step) => step.status === 'current') ??
    projectGuidedSteps.find((step) => step.status === 'next') ??
    projectGuidedSteps[projectGuidedSteps.length - 1]
  const storyOperationalGuidance = (() => {
    if (projectStoryCount === 0) {
      return {
        title: t('forge_your_first_story_2'),
        description: t('the_workbench_opens_with_this_project_selected'),
        cta: t('open_workbench'),
        to: `/tool?projectId=${projectId}`,
        tone: 'forge',
      }
    }

    if (readyStoryCount > 0) {
      return {
        title: t('take_ready_stories_into_planning_poker'),
        description: t('for_collaborative_estimation', { p1: readyStoryCount, p2: readyStoryCount === 1 ? t('story_is_already_ready') : t('stories_are_already_ready') }),
        cta: t('open_planning_poker'),
        to: `/roda?projectId=${projectId}`,
        tone: 'ready',
      }
    }

    if (isProjectInsightOutdated) {
      return {
        title: t('update_the_diagnosis_before_prioritizing'),
        description: currentProjectInsightFreshness.description,
        cta: t('update_ai_analysis'),
        href: '#diagnostico-projeto',
        tone: 'warning',
      }
    }

    if (refiningStoryCount > 0) {
      return {
        title: t('finish_refinement'),
        description: t('review_stories_in_refinement_adjust_the_criteria'),
        cta: t('view_refinement'),
        href: '#historias-projeto',
        tone: 'attention',
      }
    }

    if (!projectInsights) {
      return {
        title: t('run_ai_analysis'),
        description: t('use_the_project_diagnosis_to_identify_risks'),
        cta: t('generate_diagnosis'),
        href: '#diagnostico-projeto',
        tone: 'ai',
      }
    }

    return {
      title: t('organize_upcoming_stories'),
      description: t('use_the_board_to_prepare_new_candidates'),
      cta: t('review_board'),
      href: '#historias-projeto',
      tone: 'neutral',
    }
  })()
  const operationalEstimateLabel =
    livePlanningStoryCount > 0
      ? t('session_in_progress')
      : readyStoryCount > 0
        ? t('ready_for_planning_poker')
        : estimatedStoryCount > 0
          ? t('estimates_available')
          : t('no_selection_ready')
  const operationalEstimateText =
    livePlanningStoryCount > 0
      ? t('in_active_sessions', { p1: livePlanningStoryCount, p2: livePlanningStoryCount === 1 ? t('story_is') : t('stories_are') })
      : readyStoryCount > 0
        ? t('open_planning_poker_with_the_ready_stories')
        : estimatedStoryCount > 0
          ? t('browse_planning_poker_history_to_review_final')
          : t('move_stories_to_ready_once_refinement_is')
  const operationalNextActionLabel =
    projectStoryCount === 0
      ? t('forge_your_first_story')
      : readyStoryCount > 0
        ? t('open_planning_poker')
        : refiningStoryCount > 0
          ? t('finish_refinement')
          : t('generate_diagnosis')
  const operationalNextActionText =
    projectStoryCount === 0
      ? t('use_the_workbench_with_this_project_preselected')
      : readyStoryCount > 0
        ? t('bring_the_ready_stories_into_a_collaborative')
        : refiningStoryCount > 0
          ? t('review_criteria_questions_and_context_before_marking')
          : t('use_ai_to_identify_project_risks_and')
  const projectOperationalSnapshotCards = useMemo(
    () => [
      {
        label: t('coverage'),
        value: storiesLabel,
        description:
          projectStoryCount > 0
            ? t('in_the_project_in_this_view', { p1: membersLabel, p2: projectStoryFilteredCount })
            : t('no_stories_are_linked_to_this_project'),
        tone: projectStoryCount > 0 ? 'ready' : 'idle',
        action:
          projectStoryCount > 0
            ? { label: t('view_stories'), href: '#historias-projeto' }
            : { label: t('forge_story'), to: `/tool?projectId=${projectId}` },
      },
      {
        label: t('preparation'),
        value: projectReadinessLabel,
        description: projectReadinessText,
        tone: readyStoryCount > 0 ? 'ready' : projectStoryCount > 0 ? 'attention' : 'idle',
        action:
          readyStoryCount > 0
            ? { label: t('open_planning_poker'), to: `/roda?projectId=${projectId}` }
            : projectStoryCount > 0
              ? { label: t('prepare_stories'), href: '#historias-projeto' }
              : { label: t('create_first_story'), to: `/tool?projectId=${projectId}` },
      },
      {
        label: t('estimation'),
        value: operationalEstimateLabel,
        description: operationalEstimateText,
        tone: livePlanningStoryCount > 0 ? 'live' : readyStoryCount > 0 ? 'ready' : 'idle',
        action:
          livePlanningStoryCount > 0 || readyStoryCount > 0
            ? { label: t('go_to_planning_poker'), to: `/roda?projectId=${projectId}` }
            : estimatedStoryCount > 0
              ? { label: t('view_history'), to: `/roda?projectId=${projectId}` }
              : { label: t('organize_board'), href: '#historias-projeto' },
      },
      {
        label: t('next_action'),
        value: isProjectInsightOutdated ? t('update_diagnosis') : operationalNextActionLabel,
        description: isProjectInsightOutdated
          ? currentProjectInsightFreshness.description
          : operationalNextActionText,
        tone: isProjectInsightOutdated
          ? 'attention'
          : readyStoryCount > 0
            ? 'ready'
            : refiningStoryCount > 0
              ? 'attention'
              : 'tech',
        action:
          isProjectInsightOutdated
            ? { label: t('update_ai_analysis'), href: '#diagnostico-projeto' }
            : projectStoryCount === 0
            ? { label: t('open_workbench'), to: `/tool?projectId=${projectId}` }
            : readyStoryCount > 0
              ? { label: t('create_session'), to: `/roda?projectId=${projectId}` }
              : refiningStoryCount > 0
                ? { label: t('view_board'), href: '#historias-projeto' }
                : { label: t('generate_diagnosis'), href: '#diagnostico-projeto' },
      },
    ],
    [
      t,
      estimatedStoryCount,
      currentProjectInsightFreshness?.description,
      isProjectInsightOutdated,
      livePlanningStoryCount,
      membersLabel,
      operationalEstimateLabel,
      operationalEstimateText,
      operationalNextActionLabel,
      operationalNextActionText,
      projectReadinessLabel,
      projectReadinessText,
      projectId,
      projectStoryCount,
      projectStoryFilteredCount,
      readyStoryCount,
      refiningStoryCount,
      storiesLabel,
    ],
  )
  const projectCockpitCards = [
    {
      label: t('workbench'),
      title: projectStoryCount === 0 ? t('forge_your_first_story') : t('forge_a_new_story'),
      description:
        projectStoryCount === 0
          ? t('create_the_first_story_linked_to_this')
          : t('add_a_new_story_to_the_board'),
      to: `/tool?projectId=${projectId}`,
      cta: projectStoryCount === 0 ? t('start_in_workbench') : t('new_story_2'),
      tone: 'forge',
    },
    {
      label: t('board'),
      title: t('organize_workflow'),
      description:
        readyStoryCount > 0
          ? t('to_estimate_2', { p1: readyStoryCount, p2: readyStoryCount === 1 ? t('story_ready') : t('stories_ready') })
          : t('move_stories_between_columns_and_prepare_them'),
      href: '#historias-projeto',
      cta: t('open_board'),
      tone: readyStoryCount > 0 ? 'ready' : 'neutral',
    },
    {
      label: t('project_ai'),
      title: projectInsights
        ? isProjectInsightOutdated
          ? t('update_diagnosis')
          : t('review_diagnosis')
        : t('generate_diagnosis'),
      description: projectInsights
        ? isProjectInsightOutdated
          ? currentProjectInsightFreshness.description
          : t('use_the_saved_analysis_to_guide_refinement')
        : projectStoryCount === 0
          ? t('ai_analysis_becomes_available_once_stories_are')
          : t('use_ai_to_identify_risks_questions_and'),
      href: '#diagnostico-projeto',
      cta: projectInsights
        ? isProjectInsightOutdated
          ? t('update_ai_analysis')
          : t('view_analysis')
        : t('run_analysis'),
      tone: isProjectInsightOutdated ? 'warning' : projectInsights ? 'ai' : 'neutral',
    },
    {
      label: t('planning_poker'),
      title: livePlanningStoryCount > 0 ? t('continue_estimating') : t('start_estimation'),
      description:
        livePlanningStoryCount > 0
          ? t('in_active_sessions', { p1: livePlanningStoryCount, p2: livePlanningStoryCount === 1 ? t('story_is') : t('stories_are') })
          : readyStoryCount > 0
            ? t('take_ready_stories_to_the_team_to')
            : t('prepare_stories_on_the_board_before_starting'),
      to: `/roda?projectId=${projectId}`,
      cta: livePlanningStoryCount > 0 ? t('view_sessions') : t('open_planning_poker'),
      tone: readyStoryCount > 0 || livePlanningStoryCount > 0 ? 'ready' : 'neutral',
    },
    {
      label: t('history'),
      title: t('browse_stories'),
      description:
        projectStoryCount > 0
          ? t('to_review_copy_or_reopen', { p1: projectStoryCount, p2: projectStoryCount === 1 ? t('linked_story') : t('linked_stories') })
          : t('project_history_appears_once_you_ve_linked'),
      to: `/historico?projectId=${projectId}`,
      cta: t('view_history'),
      tone: projectStoryCount > 0 ? 'ready' : 'neutral',
    },
    {
      label: t('collaboration'),
      title: t('teams_and_members'),
      description:
        projectMembers.length > 0
          ? t('with_access_to_this_project', { p1: membersLabel })
          : t('add_people_when_you_re_ready_to'),
      to: `/times?projectId=${projectId}`,
      cta: t('manage_teams'),
      tone: projectMembers.length > 0 ? 'team' : 'neutral',
    },
  ]
  const connectedInsightCandidateCount = projectInsightCandidateStoryIds.length
  const actionableInsightCandidateCount = actionableInsightCandidateStories.length
  const readyInsightCandidateCount = readyInsightCandidateStoryIds.length
  const connectedInsightCandidateLabel =
    connectedInsightCandidateCount === 1 ? t('1_linked') : t('linked', { p1: connectedInsightCandidateCount })
  const readyStoriesCommandLabel = readyStoryCount === 1 ? t('1_ready') : t('ready_2', { p1: readyStoryCount })
  const estimatedStoriesCommandLabel =
    estimatedStoryCount === 1 ? t('1_estimated') : t('estimated_3', { p1: estimatedStoryCount })
  const actionableInsightCandidateLabel =
    actionableInsightCandidateCount === 1
      ? t('1_can_still_be_prepared')
      : t('can_still_be_prepared', { p1: actionableInsightCandidateCount })
  const readyInsightCandidateLabel =
    readyInsightCandidateCount === 1 ? t('1_is_already_ready') : t('are_already_ready', { p1: readyInsightCandidateCount })
  const projectAiCommandCards = [
    {
      label: t('current_stories'),
      title: storiesLabel,
      description:
        projectStoryCount > 0
          ? t('in_refinement_and', { p1: readyStoriesCommandLabel, p2: refiningStoryCount, p3: estimatedStoriesCommandLabel })
          : t('forge_or_link_stories_to_enable_project'),
      tone: projectStoryCount > 0 ? 'tech' : 'neutral',
      action: projectStoryCount > 0
        ? { label: t('view_board'), href: '#historias-projeto' }
        : { label: t('open_workbench'), to: `/tool?projectId=${projectId}` },
    },
    {
      label: t('diagnosis'),
      title: projectInsights
        ? isProjectInsightOutdated
          ? t('update_needed')
          : currentProjectInsightFreshness?.label ?? t('up_to_date')
        : t('not_generated_yet'),
      description: projectInsights
        ? isProjectInsightOutdated
          ? currentProjectInsightFreshness.description
          : t('the_analysis_is_available_to_guide_preparation')
        : t('run_an_executive_analysis_with_risks_questions'),
      tone: isProjectInsightOutdated ? 'warning' : projectInsights ? 'ai' : 'neutral',
      action: {
        label: isGeneratingProjectInsights
          ? t('analyzing')
          : projectInsights
            ? t('update_ai_analysis')
            : t('generate_diagnosis'),
        onClick: handleGenerateProjectInsights,
        disabled: !canGenerateProjectInsights,
      },
    },
    {
      label: t('candidates'),
      title: connectedInsightCandidateCount > 0 ? connectedInsightCandidateLabel : t('no_focus_applied'),
      description:
        connectedInsightCandidateCount > 0
          ? t('and', { p1: actionableInsightCandidateLabel, p2: readyInsightCandidateLabel })
          : projectInsights
            ? t('ai_couldn_t_match_candidates_to_project')
            : t('candidates_appear_after_you_run_an_ai'),
      tone: connectedInsightCandidateCount > 0 ? 'ready' : 'neutral',
      action: connectedInsightCandidateCount > 0
        ? {
            label: shouldFocusInsightCandidates ? t('clear_focus') : t('focus_board'),
            onClick: handleToggleInsightCandidateFilter,
          }
        : { label: t('view_stories'), href: '#historias-projeto' },
    },
    {
      label: t('next_action_2'),
      title: storyOperationalGuidance.title,
      description: storyOperationalGuidance.description,
      tone: storyOperationalGuidance.tone,
      action: {
        label: storyOperationalGuidance.cta,
        to: storyOperationalGuidance.to,
        href: storyOperationalGuidance.href,
      },
    },
  ]

  function getStoryStatusQuickFilterCount(status) {
    if (status === 'all') return projectStoryCount
    return projectStoryStatusCounts[status] ?? 0
  }

  const loadProjectStories = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoadingStories(true)
    const storiesPromise = listStoryHistoryGroups({
      userId,
      projectFilter: 'project',
      projectId,
      estimationStatus: storyEstimationFilter,
      page: 1,
      pageSize: 50,
    })
    const totalsPromise =
      storyEstimationFilter === 'all'
        ? storiesPromise
        : listStoryHistoryGroups({
            userId,
            projectFilter: 'project',
            projectId,
            page: 1,
            pageSize: 1,
          })

    const [storiesResponse, totalsResponse] = await Promise.all([storiesPromise, totalsPromise])
    setIsLoadingStories(false)

    if (storiesResponse.success) {
      const nextStories = storiesResponse.data ?? []
      setProjectStories(nextStories)
      setProjectStoryFilteredCount(storiesResponse.totalCount ?? 0)
    } else {
      setProjectStories([])
      setSelectedProjectStoryIds([])
      setProjectStoryFilteredCount(0)
    }

    if (totalsResponse.success) {
      setProjectStoryCount(totalsResponse.totalCount ?? 0)
    } else if (storyEstimationFilter === 'all') {
      setProjectStoryCount(0)
    }
  }, [projectId, storyEstimationFilter, userId])

  const loadProjectKanban = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoadingKanban(true)
    setIsKanbanUnavailable(false)
    const response = await listProjectKanbanBoard({ projectId, userId, limit: 200 })
    setIsLoadingKanban(false)

    if (response.success) {
      setKanbanColumns(response.data ?? [])
      setIsKanbanUnavailable(false)
      return
    }

    setKanbanColumns([])
    setIsKanbanUnavailable(true)
    setKanbanMessage(response.error?.code === 'PGRST202'
      ? 'the_kanban_board_will_be_available_after'
      : 'kanban_load_failed')
  }, [projectId, userId])

  const loadProjectPlanningSummaries = useCallback(async () => {
    if (!projectId || !userId) return

    setPlanningSummaryMessage('')
    const sessionsResponse = await listPlanningPokerSessionsByProject({ projectId, userId })

    if (!sessionsResponse.success) {
      setPlanningSessions([])
      setPlanningSessionStoriesBySession({})
      setPlanningSummaryMessage('could_not_load_the_project_s_planning')
      return
    }

    const nextSessions = sessionsResponse.data ?? []
    setPlanningSessions(nextSessions)

    if (nextSessions.length === 0) {
      setPlanningSessionStoriesBySession({})
      return
    }

    const storiesResponse = await listPlanningPokerSessionStorySummaries({
      sessionIds: nextSessions.map((session) => session.id),
      userId,
    })

    if (!storiesResponse.success) {
      setPlanningSessionStoriesBySession({})
      setPlanningSummaryMessage('the_planning_poker_summary_is_unavailable_right')
      return
    }

    const nextStoriesBySession = (storiesResponse.data ?? []).reduce((storiesBySession, story) => {
      if (!storiesBySession[story.session_id]) {
        storiesBySession[story.session_id] = []
      }

      storiesBySession[story.session_id].push(story)
      return storiesBySession
    }, {})

    setPlanningSessionStoriesBySession(nextStoriesBySession)
  }, [projectId, userId])

  const loadProjectStoryStatusCounts = useCallback(async () => {
    if (!projectId || !userId) return

    const responses = await Promise.all(
      ESTIMATION_STATUS_OPTIONS.map((option) =>
        listStoryHistoryGroups({
          userId,
          projectFilter: 'project',
          projectId,
          estimationStatus: option.value,
          page: 1,
          pageSize: 1,
        }),
      ),
    )

    const nextCounts = ESTIMATION_STATUS_OPTIONS.reduce((accumulator, option, index) => {
      accumulator[option.value] = responses[index]?.success ? (responses[index].totalCount ?? 0) : 0
      return accumulator
    }, {})

    setProjectStoryStatusCounts((current) => ({ ...current, ...nextCounts }))
  }, [projectId, userId])

  const loadProject = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoading(true)
    const [projectResponse, membersResponse, manageResponse] = await Promise.all([
      getProjectById({ projectId, userId }),
      listProjectMembers({ projectId, userId }),
      checkCanManageProject({ projectId, userId }),
    ])
    setIsLoading(false)

    if (!projectResponse.success || !projectResponse.data) {
      setNotFound(true)
      return
    }

    setProject(projectResponse.data)
    setProjectNameDraft(projectResponse.data.name ?? '')
    setProjectDescriptionDraft(projectResponse.data.description ?? '')
    setProjectMembers(membersResponse.success ? (membersResponse.data ?? []) : [])
    setCanManageProjectMembers(manageResponse.success ? Boolean(manageResponse.data) : false)
  }, [projectId, userId])

  const loadProjectInsightHistory = useCallback(async () => {
    if (!projectId || !userId) return

    setProjectInsights(null)
    setProjectInsightsMessage('')
    setProjectInsightsCopyFeedback('')
    setProjectInsightHistory([])
    setActiveProjectInsightId(null)
    setIsProjectInsightHistoryUnavailable(false)
    setIsLoadingProjectInsightHistory(true)
    const response = await listProjectAnalyses({ projectId, userId, limit: 3 })
    setIsLoadingProjectInsightHistory(false)

    if (response.success) {
      const history = response.data ?? []
      setProjectInsightHistory(history)
      if (history.length > 0) {
        setProjectInsights((current) => current ?? history[0].analysis)
        setActiveProjectInsightId((current) => current ?? history[0].id)
      }
      setIsProjectInsightHistoryUnavailable(false)
      return
    }

    setProjectInsightHistory([])
    setActiveProjectInsightId(null)
    setIsProjectInsightHistoryUnavailable(Boolean(response.unavailable))
  }, [projectId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProject()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProject])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectInsightHistory()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectInsightHistory])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectStories()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectStories])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectKanban()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectKanban])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectPlanningSummaries()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectPlanningSummaries])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectStoryStatusCounts()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectStoryStatusCounts])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: t('project'),
      title: project?.name ?? t('project'),
      pills: [
        { text: storiesLabel },
        { text: membersLabel },
        { text: livePlanningStoryCount > 0 ? t('in_an_active_session', { p1: livePlanningStoryCount }) : t('teams_and_planning_poker_in_the_menu') },
      ],
    })

    return () => setTopbarStatus(null)
  }, [t, livePlanningStoryCount, membersLabel, project?.name, setTopbarStatus, storiesLabel])

  async function handleUpdateProject(event) {
    event.preventDefault()
    setProjectMessage('')

    if (!canManageProjectMembers) {
      setProjectMessage('only_owners_and_administrators_can_edit_the')
      return
    }

    setIsSavingProject(true)
    const response = await updateProject({
      projectId,
      name: projectNameDraft,
      description: projectDescriptionDraft,
      userId,
    })
    setIsSavingProject(false)

    if (!response.success) {
      setProjectMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_save_the_project_right_now')
      return
    }

    setProject(response.data)
    setIsEditingProject(false)
    setProjectMessage('project_updated')
  }

  function handleCancelProjectEdit() {
    setProjectNameDraft(project?.name ?? '')
    setProjectDescriptionDraft(project?.description ?? '')
    setIsEditingProject(false)
    setProjectMessage('')
  }

  async function handleUpdateStoryEstimationStatus(story, nextStatus) {
    if (!story || story.estimation_status === nextStatus) return

    setStoryStatusMessage('')

    if (isStoryInLivePlanningSession(story, planningStorySessionById)) {
      setStoryStatusMessage('this_story_is_in_an_active_session')
      return
    }

    setUpdatingStoryStatusId(story.id)

    const targetKanbanColumn = canMoveKanbanCards
      ? kanbanColumns.find((column) => column.status_base === nextStatus)
      : null
    const response = targetKanbanColumn
      ? await moveProjectKanbanStory({
          projectId,
          storyId: story.id,
          columnId: targetKanbanColumn.id,
          position: getKanbanColumnDropPosition(targetKanbanColumn.id),
          userId,
        })
      : await updateUserStoryEstimationStatus({
          storyId: story.id,
          estimationStatus: nextStatus,
          userId,
        })

    setUpdatingStoryStatusId(null)

    if (!response.success) {
      setStoryStatusMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_update_the_story_status')
      return
    }

    setProjectStories((current) =>
      current.map((item) =>
        item.id === story.id ? { ...item, estimation_status: nextStatus } : item,
      ),
    )
    if (nextStatus !== 'ready_for_estimation') {
      setSelectedProjectStoryIds((current) => current.filter((storyId) => storyId !== story.id))
    }
    setStoryStatusMessage('estimation_status_updated')
    await Promise.all([
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectKanban(),
      loadProjectPlanningSummaries(),
    ])
  }

  async function handlePrepareStoryForPlanning(story) {
    if (!story) return
    await handleUpdateStoryEstimationStatus(story, 'ready_for_estimation')
  }

  async function handlePrepareInsightCandidates() {
    if (actionableInsightCandidateStories.length === 0) return

    setProjectInsightsMessage('')
    setIsPreparingInsightCandidates(true)

    const readyColumn = kanbanColumns.find((column) => column.status_base === 'ready_for_estimation')
    const responses = []

    for (const story of actionableInsightCandidateStories) {
      const response = readyColumn
        ? await moveProjectKanbanStory({
            projectId,
            storyId: story.id,
            columnId: readyColumn.id,
            position: getKanbanColumnDropPosition(readyColumn.id),
            userId,
          })
        : await updateUserStoryEstimationStatus({
            storyId: story.id,
            estimationStatus: 'ready_for_estimation',
            userId,
          })

      responses.push({ response, story })
    }

    setIsPreparingInsightCandidates(false)

    const preparedStoryIds = responses
      .filter((item) => item.response.success)
      .map((item) => item.story.id)
    const failureCount = responses.length - preparedStoryIds.length

    if (preparedStoryIds.length > 0) {
      setSelectedProjectStoryIds((current) => Array.from(new Set([...current, ...preparedStoryIds])))
    }

    setProjectInsightsMessage(
      failureCount > 0
        ? { key: 'candidates_prepared_could_not_update_right_now', values: { p1: preparedStoryIds.length, p2: failureCount } }
        : { key: 'candidates_prepared_for_estimation_and_selected_for', values: { p1: preparedStoryIds.length } },
    )

    await Promise.all([
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectKanban(),
      loadProjectPlanningSummaries(),
    ])
  }

  function getKanbanColumnDropPosition(columnId) {
    const column = kanbanColumns.find((item) => item.id === columnId)
    const positions = (column?.cards ?? []).map((story) => Number(story.kanban_position ?? 0))
    if (positions.length === 0) return 1000
    return Math.min(...positions) - 1000
  }

  function handleStartEditKanbanColumn(column) {
    setKanbanMessage('')
    setEditingKanbanColumnId(column.id)
    setEditingKanbanColumnName(column.name ?? '')
    setEditingKanbanColumnStatusBase(column.status_base ?? 'created')
  }

  function handleCancelEditKanbanColumn() {
    setEditingKanbanColumnId(null)
    setEditingKanbanColumnName('')
    setEditingKanbanColumnStatusBase('created')
  }

  async function handleCreateKanbanColumn(event) {
    event.preventDefault()

    if (!canEditKanbanColumns) {
      setKanbanMessage('only_owners_and_administrators_can_create_columns')
      return
    }

    setKanbanMessage('')
    setIsCreatingKanbanColumn(true)
    const response = await createProjectKanbanColumn({
      projectId,
      name: newKanbanColumnName,
      statusBase: newKanbanColumnStatusBase,
      userId,
    })
    setIsCreatingKanbanColumn(false)

    if (!response.success) {
      setKanbanMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_create_the_column_right_now')
      return
    }

    setNewKanbanColumnName('')
    setNewKanbanColumnStatusBase('created')
    setKanbanMessage('column_created')
    await loadProjectKanban()
  }

  async function handleUpdateKanbanColumn(event, column) {
    event.preventDefault()

    if (!canEditKanbanColumns) {
      setKanbanMessage('only_owners_and_administrators_can_edit_columns')
      return
    }

    setKanbanMessage('')
    setSavingKanbanColumnId(column.id)
    const response = await updateProjectKanbanColumn({
      columnId: column.id,
      name: editingKanbanColumnName,
      statusBase: editingKanbanColumnStatusBase,
      userId,
    })
    setSavingKanbanColumnId(null)

    if (!response.success) {
      setKanbanMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_save_the_column_right_now')
      return
    }

    handleCancelEditKanbanColumn()
    setKanbanMessage('column_updated')
    await Promise.all([
      loadProjectKanban(),
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectPlanningSummaries(),
    ])
  }

  async function handleReorderKanbanColumn(column, direction) {
    if (!canEditKanbanColumns) {
      setKanbanMessage('only_owners_and_administrators_can_reorder_columns')
      return
    }

    setKanbanMessage('')
    setReorderingKanbanColumnId(column.id)
    const response = await reorderProjectKanbanColumn({
      columnId: column.id,
      direction,
      userId,
    })
    setReorderingKanbanColumnId(null)

    if (!response.success) {
      setKanbanMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_reorder_the_column_right_now')
      return
    }

    setKanbanMessage('column_reordered')
    await loadProjectKanban()
  }

  async function handleMoveKanbanStory(story, columnId) {
    if (!story || !columnId || story.kanban_column_id === columnId) return

    if (!canMoveKanbanCards) {
      setKanbanMessage('viewers_can_browse_the_board_moving_stories')
      return
    }

    if (isStoryInLivePlanningSession(story, planningStorySessionById)) {
      setKanbanMessage('this_story_is_in_an_active_session_2')
      return
    }

    setKanbanMessage('')
    setMovingKanbanStoryId(story.id)
    const response = await moveProjectKanbanStory({
      projectId,
      storyId: story.id,
      columnId,
      position: getKanbanColumnDropPosition(columnId),
      userId,
    })
    setMovingKanbanStoryId(null)
    setDraggedKanbanStoryId(null)
    setDragOverKanbanColumnId(null)

    if (!response.success) {
      setKanbanMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_move_the_story_right_now')
      return
    }

    if (response.data?.estimation_status !== 'ready_for_estimation') {
      setSelectedProjectStoryIds((current) => current.filter((storyId) => storyId !== story.id))
    }
    setKanbanMessage('story_moved_and_status_updated')
    await Promise.all([
      loadProjectKanban(),
      loadProjectStories(),
      loadProjectStoryStatusCounts(),
      loadProjectPlanningSummaries(),
    ])
  }

  function handleKanbanDragStart(event, story) {
    if (!canMoveKanbanCards) return

    setDraggedKanbanStoryId(story.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', story.id)
  }

  function handleKanbanDragOver(event, columnId) {
    if (!canMoveKanbanCards || !draggedKanbanStoryId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverKanbanColumnId(columnId)
  }

  function handleKanbanDragLeave(columnId) {
    setDragOverKanbanColumnId((current) => (current === columnId ? null : current))
  }

  function handleKanbanDrop(event, columnId) {
    event.preventDefault()

    const storyId = event.dataTransfer.getData('text/plain') || draggedKanbanStoryId
    const story = kanbanStories.find((item) => item.id === storyId)
    handleMoveKanbanStory(story, columnId)
  }

  function handleToggleProjectStorySelection(storyId) {
    setStoryStatusMessage('')
    if (
      !selectedProjectStoryIds.includes(storyId) &&
      planningStorySessionById[storyId]?.isLive
    ) {
      setStoryStatusMessage('this_story_is_already_in_an_active')
      return
    }

    setSelectedProjectStoryIds((current) =>
      current.includes(storyId)
        ? current.filter((currentStoryId) => currentStoryId !== storyId)
        : [...current, storyId],
    )
  }

  function handleSelectVisibleReadyStories() {
    setStoryStatusMessage('')
    const availableStoryIds = visibleAvailableReadyStories.map((story) => story.id)
    setSelectedProjectStoryIds(availableStoryIds)
    setStoryStatusMessage(
      availableStoryIds.length === 0
        ? 'no_available_visible_stories_to_select'
        : 'available_visible_stories_selected_for_planning_poker',
    )
  }

  function handleToggleInsightCandidateFilter() {
    setStoryStatusMessage('')
    setIsInsightCandidateFilterActive((current) => !current)
  }

  function handleSelectReadyInsightCandidates() {
    setStoryStatusMessage('')
    setSelectedProjectStoryIds((current) =>
      Array.from(new Set([...current, ...readyInsightCandidateStoryIds])),
    )
  }

  function handleClearProjectStorySelection() {
    setStoryStatusMessage('')
    setSelectedProjectStoryIds([])
  }

  function handleSelectReadyStoriesInColumn(column) {
    const readyStoryIds = (column?.cards ?? [])
      .filter((story) => isReadyStoryAvailableForPlanning(story, planningStorySessionById))
      .map((story) => story.id)

    setStoryStatusMessage('')
    if (readyStoryIds.length === 0) {
      setStoryStatusMessage('this_column_has_no_ready_stories_available')
      return
    }
    setSelectedProjectStoryIds((current) => Array.from(new Set([...current, ...readyStoryIds])))
  }

  async function handleGenerateProjectInsights() {
    if (!project || !userId) return

    setProjectInsightsMessage('')
    setIsGeneratingProjectInsights(true)

    const storiesResponse = await listStoryHistoryGroups({
      userId,
      projectFilter: 'project',
      projectId,
      page: 1,
      pageSize: 30,
    })

    if (!storiesResponse.success) {
      setIsGeneratingProjectInsights(false)
      setProjectInsightsMessage('could_not_load_the_project_s_stories')
      return
    }

    const storiesForAnalysis = storiesResponse.data ?? []
    if (storiesForAnalysis.length === 0) {
      setIsGeneratingProjectInsights(false)
      setProjectInsightsMessage('forge_or_link_at_least_one_story')
      return
    }

    try {
      const analyzedStoryCount = storiesResponse.totalCount ?? storiesForAnalysis.length
      const analysis = await analyzeProject({
        project,
        stories: storiesForAnalysis,
        storyCount: analyzedStoryCount,
        memberCount: projectMembers.length,
      })
      setProjectInsights(analysis)
      setProjectInsightsCopyFeedback('')

      const saveResponse = await saveProjectAnalysis({
        projectId,
        userId,
        analysis,
        storyCount: analyzedStoryCount,
      })

      if (saveResponse.success && saveResponse.data) {
        setProjectInsightHistory((current) => [
          saveResponse.data,
          ...current.filter((item) => item.id !== saveResponse.data.id),
        ].slice(0, 3))
        setActiveProjectInsightId(saveResponse.data.id)
        setIsProjectInsightHistoryUnavailable(false)
        setProjectInsightsMessage('diagnosis_generated_and_saved_to_project_history')
      } else if (saveResponse.unavailable) {
        setActiveProjectInsightId(null)
        setIsProjectInsightHistoryUnavailable(true)
        setProjectInsightsMessage('diagnosis_generated_history_will_be_enabled_after')
      } else {
        setActiveProjectInsightId(null)
        setProjectInsightsMessage('diagnosis_generated_it_couldn_t_be_saved')
      }
    } catch (error) {
      setProjectInsightsMessage(
        projectAnalysisErrorKeys[error?.code] ?? 'could_not_generate_the_project_diagnosis_right',
      )
    } finally {
      setIsGeneratingProjectInsights(false)
    }
  }

  function handleOpenProjectInsightHistoryItem(item) {
    if (!item?.analysis) return

    setProjectInsights(item.analysis)
    setActiveProjectInsightId(item.id)
    setProjectInsightsCopyFeedback('')
    setProjectInsightsMessage('diagnosis_reopened_from_project_history')
  }

  async function handleDeleteProjectInsightHistoryItem(item) {
    if (!item?.id) return

    const confirmed = window.confirm(
      t('delete_the_diagnosis_from', { p1: formatProjectDateTime(item.created_at, language) }),
    )
    if (!confirmed) return

    setProjectInsightsMessage('')
    setDeletingProjectInsightId(item.id)
    const response = await deleteProjectAnalysis({
      projectId,
      diagnosticId: item.id,
      userId,
    })
    setDeletingProjectInsightId(null)

    if (!response.success) {
      setProjectInsightsMessage('could_not_delete_the_diagnosis_right_now')
      return
    }

    const remaining = projectInsightHistory.filter((historyItem) => historyItem.id !== item.id)
    setProjectInsightHistory(remaining)
    if (activeProjectInsightId === item.id) {
      const nextCurrent = remaining[0] ?? null
      setProjectInsights(nextCurrent?.analysis ?? null)
      setActiveProjectInsightId(nextCurrent?.id ?? null)
    }
    setProjectInsightsMessage('diagnosis_deleted_from_history')
  }

  async function handleCopyProjectInsights() {
    if (!projectInsights) return

    setProjectInsightsCopyFeedback('')

    try {
      await copyTextToClipboard(
        buildProjectAnalysisMarkdown({
          project,
          analysis: projectInsights,
          freshness: currentProjectInsightFreshness,
          storyCount: projectStoryCount,
          memberCount: projectMembers.length,
        }, tInsights),
      )
      setProjectInsightsCopyFeedback('diagnosis_copied_as_markdown')
      window.setTimeout(() => setProjectInsightsCopyFeedback(''), 2600)
    } catch {
      setProjectInsightsCopyFeedback('could_not_copy_the_diagnosis_right_now')
    }
  }

  async function handleCopyProjectActionPlan() {
    if (!projectInsights) return

    setProjectInsightsCopyFeedback('')

    try {
      await copyTextToClipboard(
        buildProjectActionPlanMarkdown({
          project,
          analysis: projectInsights,
          candidateStories: projectInsightCandidateCards,
          freshness: currentProjectInsightFreshness,
          storyCount: projectStoryCount,
        }, tInsights),
      )
      setProjectInsightsCopyFeedback('action_plan_copied_as_markdown')
      window.setTimeout(() => setProjectInsightsCopyFeedback(''), 2600)
    } catch {
      setProjectInsightsCopyFeedback('could_not_copy_the_action_plan_right')
    }
  }

  async function handleAddProjectMember(event) {
    event.preventDefault()
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('only_owners_and_administrators_can_add_project')
      return
    }

    setIsAddingProjectMember(true)
    const response = await addProjectMemberByEmail({
      projectId,
      email: memberEmail,
      role: memberRole,
      userId,
    })
    setIsAddingProjectMember(false)

    if (!response.success) {
      setMemberMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_add_this_member')
      return
    }

    setMemberEmail('')
    setMemberRole('member')
    setMemberMessage('member_added_to_the_project')
    await loadProject()
  }

  async function handleUpdateProjectMemberRole(member, nextRole) {
    if (!member || member.role === nextRole) return
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('only_owners_and_administrators_can_change_project')
      return
    }

    if (member.role === 'owner') {
      setMemberMessage('the_project_owner_s_role_can_t')
      return
    }

    if (member.user_id === userId) {
      setMemberMessage('you_can_t_change_your_own_role')
      return
    }

    setUpdatingProjectMemberId(member.user_id)
    const response = await updateProjectMemberRole({
      projectId,
      memberUserId: member.user_id,
      role: nextRole,
      userId,
    })
    setUpdatingProjectMemberId(null)

    if (!response.success) {
      setMemberMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_update_this_member')
      return
    }

    setProjectMembers((current) =>
      current.map((item) => (item.user_id === member.user_id ? { ...item, role: nextRole } : item)),
    )
    setMemberMessage('member_role_updated')
  }

  async function handleRemoveProjectMember(member) {
    if (!member) return
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('only_owners_and_administrators_can_remove_project')
      return
    }

    if (member.role === 'owner') {
      setMemberMessage('the_project_owner_can_t_be_removed')
      return
    }

    if (member.user_id === userId) {
      setMemberMessage('you_can_t_remove_your_own_access')
      return
    }

    const confirmed = window.confirm(t('remove_from_this_project', { p1: member.email }))
    if (!confirmed) return

    setRemovingProjectMemberId(member.user_id)
    const response = await removeProjectMember({
      projectId,
      memberUserId: member.user_id,
      userId,
    })
    setRemovingProjectMemberId(null)

    if (!response.success) {
      setMemberMessage(projectErrorKeys.get(response.error?.message) ?? 'could_not_remove_this_member')
      return
    }

    setProjectMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setMemberMessage('member_removed_from_the_project')
  }

  if (notFound) {
    return <Navigate to={preview ? localizeHref('/projetos', language) : '/projetos'} replace />
  }

  return (
    <div className="projects-page project-detail-page">
      <section className="panel projects-page__hero">
        <div>
          <p className="projects-page__eyebrow">{t('project')}</p>
          <h1>{project?.name ?? t('loading_project')}</h1>
          <p>
            {t('organize_your_stories_members_and_project_ai')}
          </p>
        </div>
        <div className="project-detail-page__actions">
          <Link className="btn btn-secondary btn-small" to="/projetos">
            {t('back')}
          </Link>
          <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
            {t('history')}
          </Link>
          {canManageProjectMembers ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditingProject((current) => !current)}
              disabled={isSavingProject}
            >
              {isEditingProject ? t('close_editor') : t('edit_project')}
            </button>
          ) : null}
          <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
            {t('workbench')}
          </Link>
        </div>
      </section>

      <section className="project-detail-page__access" aria-label={t('your_access_to_the_project')}>
        <div className="project-detail-page__access-main">
          <span>{t('your_access')}</span>
          <strong>{t(currentAccessDetails.title)}</strong>
          <p>{t(currentAccessDetails.description)}</p>
          <small>{t(currentAccessDetails.nextAction)}</small>
        </div>
        <div className="project-detail-page__access-role" aria-label={t('current_role', { p1: currentProjectRoleLabel })}>
          <span>{t('current_role_2')}</span>
          <strong>{currentProjectRoleLabel}</strong>
        </div>
        <ul className="project-detail-page__access-list" aria-label={t('available_permissions')}>
          {projectAccessCapabilities.map((capability) => (
            <li key={capability.label} className={capability.enabled ? 'is-enabled' : 'is-disabled'}>
              <strong>{capability.label}</strong>
              <span>{capability.detail}</span>
            </li>
          ))}
        </ul>
        <div className="project-detail-page__access-actions">
          {canMoveKanbanCards ? (
            <a className="btn btn-secondary btn-small" href="#historias-projeto">
              {t('organize_kanban_board')}
            </a>
          ) : null}
          {canManageProjectMembers ? (
            <a className="btn btn-secondary btn-small" href="#membros-projeto">
              {t('manage_members')}
            </a>
          ) : (
            <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
              {t('browse_history')}
            </Link>
          )}
        </div>
      </section>

      <section className="project-detail-page__metrics" aria-label={t('project_operational_metrics')}>
        <div className="project-detail-page__metrics-header">
          <div>
            <p className="projects-page__eyebrow">{t('project_metrics')}</p>
            <h2>{t('project_at_a_glance')}</h2>
            <p>{t('quick_indicators_to_help_you_decide_whether')}</p>
          </div>
        </div>
        <div className="project-detail-page__metrics-grid">
          {projectMetricsCards.map((metric) => (
            <article
              key={metric.label}
              className={`project-detail-page__metric-card project-detail-page__metric-card--${metric.tone}`}
            >
              <div className="project-detail-page__metric-copy">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </div>
              <div
                className="project-detail-page__metric-progress"
                role="progressbar"
                aria-label={metric.label}
                aria-valuenow={metric.progress}
              >
                <span style={{ width: `${metric.progress}%` }} />
              </div>
              {metric.action?.to ? (
                <Link className="btn btn-secondary btn-small" to={metric.action.to}>
                  {metric.action.label}
                </Link>
              ) : metric.action?.href ? (
                <a className="btn btn-secondary btn-small" href={metric.action.href}>
                  {metric.action.label}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel project-detail-page__guided-flow" aria-label={t('guided_project_workflow')}>
        <div className="project-detail-page__guided-flow-header">
          <div className="project-detail-page__guided-flow-copy">
            <p className="projects-page__eyebrow">{t('guided_workflow')}</p>
            <h2>{t('from_brief_to_estimate')}</h2>
            <p>
              {t('follow_the_steps_from_your_first_story')}
            </p>
          </div>
          {projectGuidedNextStep ? (
            <article
              className={`project-detail-page__guided-next project-detail-page__guided-next--${projectGuidedNextStep.status}`}
            >
              <span>{t('next_step')}</span>
              <strong>{projectGuidedNextStep.title}</strong>
              <p>{projectGuidedNextStep.description}</p>
              {projectGuidedNextStep.action?.to ? (
                <Link className="btn btn-primary btn-small" to={projectGuidedNextStep.action.to}>
                  {projectGuidedNextStep.action.label}
                </Link>
              ) : projectGuidedNextStep.action?.href ? (
                <a className="btn btn-primary btn-small" href={projectGuidedNextStep.action.href}>
                  {projectGuidedNextStep.action.label}
                </a>
              ) : null}
            </article>
          ) : null}
        </div>

        <ol className="project-detail-page__guided-steps">
          {projectGuidedSteps.map((step, index) => (
            <li key={step.id} className={`project-detail-page__guided-step is-${step.status}`}>
              <span className="project-detail-page__guided-step-number">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
              <small>{t(PROJECT_GUIDED_STATUS_LABELS[step.status])}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="project-detail-page__executive-strip" aria-label={t('project_executive_overview')}>
        <article className={isProjectInsightOutdated ? 'project-detail-page__executive-card--attention' : ''}>
          <span>{t('diagnosis')}</span>
          <strong>{projectInsightExecutiveLabel}</strong>
          <p>{projectInsightExecutiveText}</p>
          {currentProjectInsightFreshness ? (
            <small
              className={`project-detail-page__executive-status project-detail-page__executive-status--${currentProjectInsightFreshness.tone}`}
            >
              {currentProjectInsightFreshness.label}
            </small>
          ) : null}
          <a className="btn btn-secondary btn-small" href="#diagnostico-projeto">
            {projectInsightExecutiveActionLabel}
          </a>
        </article>

        <article>
          <span>{t('readiness')}</span>
          <strong>{projectReadinessLabel}</strong>
          <p>{projectReadinessText}</p>
          {readyStoryCount > 0 ? (
            <Link className="btn btn-primary btn-small" to={`/roda?projectId=${projectId}`}>
              {t('open_planning_poker')}
            </Link>
          ) : projectStoryCount === 0 ? (
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              {t('forge_story')}
            </Link>
          ) : (
            <a className="btn btn-secondary btn-small" href="#historias-projeto">
              {t('prepare_stories')}
            </a>
          )}
        </article>

        <article>
          <span>{t('next_action')}</span>
          <strong>{t('next_action_2')}</strong>
          <p>{latestProjectNextAction}</p>
          <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
            {t('view_stories_2')}
          </Link>
        </article>
      </section>

      <section className="panel project-detail-page__cockpit" aria-label={t('project_actions')}>
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">{t('project_actions_2')}</p>
            <h2>{t('what_to_do_next')}</h2>
            <p>{t('create_organize_analyze_and_estimate_stories_without')}</p>
          </div>
        </div>

        <div className="project-detail-page__cockpit-grid">
          {projectCockpitCards.map((card) => {
            const className = `project-detail-page__cockpit-card project-detail-page__cockpit-card--${card.tone}`
            const content = (
              <>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
                <small>{card.cta}</small>
              </>
            )

            return card.to ? (
              <Link key={card.label} className={className} to={card.to}>
                {content}
              </Link>
            ) : (
              <a key={card.label} className={className} href={card.href}>
                {content}
              </a>
            )
          })}
        </div>
      </section>

      <section className="panel project-detail-page__settings" aria-label={t('project_details')}>
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">{t('project_details')}</p>
            <h2>{t('organization_context')}</h2>
            <p>{project?.description || t('no_description_provided')}</p>
          </div>
        </div>

        {isEditingProject ? (
          <form className="project-detail-page__edit-form" onSubmit={handleUpdateProject}>
            <label className="projects-page__field">
              <span>{t('project_name')}</span>
              <input
                type="text"
                value={projectNameDraft}
                onChange={(event) => setProjectNameDraft(event.target.value)}
                placeholder={t('e_g_customer_onboarding')}
                disabled={isSavingProject}
              />
            </label>

            <label className="projects-page__field">
              <span>{t('optional_description')}</span>
              <textarea
                value={projectDescriptionDraft}
                onChange={(event) => setProjectDescriptionDraft(event.target.value)}
                placeholder={t('describe_the_project_s_journey_squad_or')}
                rows={4}
                disabled={isSavingProject}
              />
            </label>

            <div className="project-detail-page__edit-actions">
              <button type="submit" className="btn btn-primary btn-small" disabled={isSavingProject}>
                {isSavingProject ? t('saving') : t('save_project')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleCancelProjectEdit}
                disabled={isSavingProject}
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {projectMessage ? <p className="projects-page__message" role="status">{formatNotice(t, projectMessage)}</p> : null}
      </section>

      <section
        id="diagnostico-projeto"
        className="panel project-detail-page__ai"
        aria-label={t('project_ai_diagnosis')}
      >
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">{t('project_ai')}</p>
            <h2>{t('project_diagnosis')}</h2>
            <p>
              {t('run_an_executive_analysis_of_linked_stories')}
            </p>
          </div>
          <div className="project-detail-page__ai-actions">
            {projectInsights ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyProjectInsights}
              >
                {projectInsightsCopyFeedback === 'diagnosis_copied_as_markdown'
                  ? t('diagnosis_copied')
                  : t('copy_diagnosis')}
              </button>
            ) : null}
            {projectInsights ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyProjectActionPlan}
              >
                {projectInsightsCopyFeedback === 'action_plan_copied_as_markdown'
                  ? t('action_plan_copied')
                  : t('copy_action_plan')}
              </button>
            ) : null}
            {projectInsights ? (
              <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${projectId}`}>
                {t('take_to_planning_poker')}
              </Link>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleGenerateProjectInsights}
              disabled={!canGenerateProjectInsights}
            >
              {isGeneratingProjectInsights
                ? t('analyzing')
                : projectInsights
                  ? t('update_diagnosis')
                  : t('generate_diagnosis')}
            </button>
          </div>
        </div>

        {projectInsightsMessage ? (
          <p className="projects-page__message" role="status">
            {formatNotice(t, projectInsightsMessage)}
          </p>
        ) : null}
        {projectInsightsCopyFeedback ? (
          <p className="projects-page__message" role="status">
            {formatNotice(t, projectInsightsCopyFeedback)}
          </p>
        ) : null}

        <div className="project-detail-page__ai-overview" aria-label={t('project_ai_overview')}>
          <div className="project-detail-page__ai-overview-main">
            <div className="project-detail-page__ai-overview-copy">
              <p className="projects-page__eyebrow">{t('ai_overview')}</p>
              <h3>{projectInsights ? t('analysis_ready_for_review') : t('diagnosis_available_on_demand')}</h3>
              <p>
                {t('decide_whether_to_refresh_the_analysis_prepare')}
              </p>
            </div>

            <article
              className={`project-detail-page__ai-overview-card${
                isProjectInsightOutdated ? ' project-detail-page__ai-overview-card--attention' : ''
              }`}
            >
              <span>{projectInsightOverviewStatus}</span>
              <strong>{projectInsights ? projectInsights.summary : projectInsightExecutiveText}</strong>
              <small>{projectInsightOverviewMeta}</small>
              {currentProjectInsightFreshness ? (
                <small
                  className={`project-detail-page__ai-freshness project-detail-page__ai-freshness--${currentProjectInsightFreshness.tone}`}
                >
                  {currentProjectInsightFreshness.label} · {currentProjectInsightFreshness.description}
                </small>
              ) : null}
            </article>
          </div>

          <div className="project-detail-page__ai-route-grid">
            {projectAiCommandCards.map((card) => {
              const cardClassName = `project-detail-page__ai-route-card project-detail-page__ai-route-card--${card.tone}`
              const action = card.action

              return (
                <article key={card.label} className={cardClassName}>
                  <span>{card.label}</span>
                  <strong>{card.title}</strong>
                  <p>{card.description}</p>
                  {action?.to ? (
                    <Link className="btn btn-secondary btn-small" to={action.to}>
                      {action.label}
                    </Link>
                  ) : action?.href ? (
                    <a className="btn btn-secondary btn-small" href={action.href}>
                      {action.label}
                    </a>
                  ) : action?.onClick ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={action.onClick}
                      disabled={Boolean(action.disabled)}
                    >
                      {action.label}
                    </button>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="project-detail-page__ai-fact-grid" aria-label={t('ai_supporting_metrics')}>
            {(projectInsights ? projectActionPlanStats : projectOperationalSnapshotCards).map((item) => (
              <span key={item.label} className="project-detail-page__ai-fact">
                <strong>{item.value}</strong>
                {item.label}
                <small>{item.detail ?? item.description}</small>
              </span>
            ))}
          </div>
        </div>

        {!projectInsights ? (
          <div className="project-detail-page__ai-empty">
            <strong>{t('analysis_on_demand')}</strong>
            <p>
              {t('the_diagnosis_uses_the_latest_project_stories')}
            </p>
            {projectStoryCount === 0 ? (
              <p>{t('link_stories_to_this_project_to_enable')}</p>
            ) : null}
          </div>
        ) : (
          <div className="project-detail-page__ai-result">
            {isProjectInsightOutdated ? (
              <div className="project-detail-page__ai-refresh-callout" role="status">
                <div>
                  <strong>{t('outdated_diagnosis')}</strong>
                  <p>
                    {currentProjectInsightFreshness.description}{" "}{t('refresh_this_diagnosis_before_using_it_to')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={handleGenerateProjectInsights}
                  disabled={!canGenerateProjectInsights}
                >
                  {isGeneratingProjectInsights ? t('updating') : t('update_now')}
                </button>
              </div>
            ) : null}

            <div className="project-detail-page__ai-detail-header">
              <div>
                <p className="projects-page__eyebrow">{t('diagnosis_details')}</p>
                <h3>{t('risks_questions_and_candidates')}</h3>
                <p>{t('open_the_section_you_need_to_review')}</p>
              </div>
            </div>

            <div className="project-detail-page__ai-grid">
              <ProjectInsightList
                title={t('risks')}
                items={projectInsights.risks}
                emptyText={t('the_ai_identified_no_significant_risks')}
              />
              <ProjectInsightList
                title={t('refinement_questions')}
                items={projectInsights.refinement_questions}
                emptyText={t('no_additional_questions_were_suggested')}
              />
              <ProjectInsightList
                title={t('next_steps')}
                items={projectInsights.next_actions}
                emptyText={t('no_next_steps_were_suggested')}
              />
              <ProjectInsightList
                title={t('estimation_candidates')}
                items={projectInsights.estimation_candidates}
                emptyText={t('no_specific_candidates_were_identified')}
              />
            </div>

            <div className="project-detail-page__ai-action-plan" aria-label={t('diagnosis_action_plan')}>
              <div className="project-detail-page__ai-action-plan-header">
                <div>
                  <p className="projects-page__eyebrow">{t('action_plan')}</p>
                  <h3>{t('what_to_do_next')}</h3>
                  <p>{t('a_short_guide_to_turn_the_diagnosis')}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleCopyProjectActionPlan}
                >
                  {projectInsightsCopyFeedback === 'action_plan_copied_as_markdown'
                    ? t('action_plan_copied')
                    : t('copy_plan')}
                </button>
              </div>

              <ol className="project-detail-page__ai-action-list">
                {projectActionPlanItems.map((item, index) => (
                  <li key={`${item}-${index}`}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </li>
                ))}
              </ol>

              <div className="project-detail-page__ai-action-stats">
                {projectActionPlanStats.map((item) => (
                  <span key={item.label}>
                    <strong>{item.value}</strong>
                    {item.label}
                    <small>{item.detail}</small>
                  </span>
                ))}
              </div>
            </div>

            {projectInsightCandidateCards.length > 0 ? (
              <div className="project-detail-page__ai-candidates">
                <div className="project-detail-page__ai-candidates-header">
                  <div>
                    <strong>{t('candidates_linked_to_stories')}</strong>
                    <p>
                      {t('these_ai_suggestions_link_to_project_stories')}
                    </p>
                  </div>
                  <div className="project-detail-page__ai-candidates-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleToggleInsightCandidateFilter}
                    >
                      {shouldFocusInsightCandidates ? t('clear_board_focus') : t('focus_on_board')}
                    </button>
                    {readyInsightCandidateStoryIds.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectReadyInsightCandidates}
                      >
                        {t('select_ready_ai_candidates')}
                      </button>
                    ) : null}
                    {actionableInsightCandidateStories.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handlePrepareInsightCandidates}
                        disabled={isPreparingInsightCandidates}
                      >
                        {isPreparingInsightCandidates ? t('preparing') : t('prepare_candidates')}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="project-detail-page__ai-candidate-list">
                  {projectInsightCandidateCards.map((item) => {
                    const story = item.story
                    const planningEntry = story ? planningStorySessionById[story.id] : null
                    const planningSession = planningEntry?.session
                    const finalEstimate = planningEntry?.story?.final_estimate ?? planningEntry?.finalEstimate
                    const isReadyForPlanning = story?.estimation_status === 'ready_for_estimation'
                    const isEstimated = story?.estimation_status === 'estimated'
                    const isInLivePlanningSession = Boolean(planningEntry?.isLive)
                    const planningRoomUrl = planningSession
                      ? `/projetos/${projectId}/roda/${planningSession.id}`
                      : `/roda?projectId=${projectId}${story ? `&storyId=${story.id}` : ''}`
                    const canPrepareCandidate =
                      story &&
                      !isReadyForPlanning &&
                      !isEstimated &&
                      (canMoveKanbanCards || canManageProjectMembers || story.user_id === userId)

                    return (
                      <article
                        key={`${item.candidate}-${story?.id ?? 'sem-vinculo'}`}
                        className="project-detail-page__ai-candidate"
                      >
                        <div>
                          <span>{t('ai_suggestion')}</span>
                          <strong>{item.candidate}</strong>
                          {story ? (
                            <p>
                              {t('linked_to')}{" "}<b>{story.title ?? t('untitled_story')}</b>
                            </p>
                          ) : (
                            <p>{t('could_not_match_this_suggestion_to_a')}</p>
                          )}
                        </div>

                        <div className="project-detail-page__ai-candidate-meta">
                          {story ? <span>{getEstimationStatusLabel(story.estimation_status, t)}</span> : null}
                          {isInLivePlanningSession ? (
                            <span>{t('in_an_active_session_2')}</span>
                          ) : finalEstimate ? (
                            <span>{t('final')}{" "}{finalEstimate}</span>
                          ) : planningSession ? (
                            <span>{getPlanningStatusLabel(planningSession.status, t)}</span>
                          ) : null}
                        </div>

                        {story ? (
                          <div className="project-detail-page__ai-candidate-actions">
                            <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                              {t('open')}
                            </Link>
                            {canPrepareCandidate ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => handlePrepareStoryForPlanning(story)}
                                disabled={updatingStoryStatusId === story.id}
                              >
                                {updatingStoryStatusId === story.id ? t('preparing') : t('prepare')}
                              </button>
                            ) : null}
                            {isReadyForPlanning || isInLivePlanningSession || isEstimated ? (
                              <Link
                                className={`btn btn-small ${
                                  isReadyForPlanning || isInLivePlanningSession ? 'btn-primary' : 'btn-secondary'
                                }`}
                                to={planningRoomUrl}
                              >
                                {isInLivePlanningSession
                                  ? t('continue_session')
                                  : isEstimated
                                    ? t('view_estimate')
                                    : t('open_planning_poker')}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="project-detail-page__ai-next-step">
              <div>
                <strong>{t('next_action')}</strong>
                <p>
                  {t('use_the_diagnosis_to_prepare_stories_discuss')}
                </p>
              </div>
              <Link className="btn btn-primary btn-small" to={`/roda?projectId=${projectId}`}>
                {t('open_planning_poker_2')}
              </Link>
            </div>
          </div>
        )}

        <div className="project-detail-page__ai-history">
          <div>
            <strong>{t('recent_history')}</strong>
            <p>
              {t('reopen_recent_diagnoses_to_compare_project_progress')}
            </p>
          </div>

          {isLoadingProjectInsightHistory ? (
            <p className="projects-page__state">{t('loading_diagnoses')}</p>
          ) : null}

          {isProjectInsightHistoryUnavailable ? (
            <p className="projects-page__state">
              {t('history_will_be_available_after_applying_the')}{" "}<code>{'supabase/project-ai-diagnostics.sql'}</code>.
            </p>
          ) : null}

          {!isLoadingProjectInsightHistory &&
          !isProjectInsightHistoryUnavailable &&
          projectInsightHistory.length === 0 ? (
            <p className="projects-page__state">
              {t('no_saved_diagnoses_yet_generate_the_first')}
            </p>
          ) : null}

          {projectInsightHistory.length > 0 ? (
            <div className="project-detail-page__ai-history-list">
              {projectInsightHistory.map((item) => {
                const freshness = getProjectInsightFreshness(item, projectStoryCount, tInsights)

                return (
                  <article key={item.id} className="project-detail-page__ai-history-item">
                    <div>
                      <span>
                        {formatProjectDateTime(item.created_at, language)}
                        {activeProjectInsightId === item.id ? t('open_now') : ''}
                      </span>
                      <strong>{item.analysis.health_label}</strong>
                      <p>{item.analysis.summary}</p>
                      <div className="project-detail-page__ai-history-meta">
                        <span
                          className={`project-detail-page__ai-freshness project-detail-page__ai-freshness--${freshness.tone}`}
                        >
                          {freshness.label}
                        </span>
                        <small>{freshness.description}</small>
                      </div>
                    </div>
                    <div className="project-detail-page__ai-history-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => handleOpenProjectInsightHistoryItem(item)}
                      >
                        {t('reopen')}
                      </button>
                      {freshness.isOutdated ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={handleGenerateProjectInsights}
                          disabled={!canGenerateProjectInsights}
                        >
                          {t('update')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => handleDeleteProjectInsightHistoryItem(item)}
                        disabled={deletingProjectInsightId === item.id}
                      >
                        {deletingProjectInsightId === item.id ? t('deleting') : t('delete')}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel project-detail-page__collaboration" aria-label={t('collaboration_and_estimation')}>
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">{t('collaboration')}</p>
            <h2>{t('teams_and_planning_poker')}</h2>
            <p>{t('manage_teams_and_estimates_in_their_dedicated')}</p>
          </div>
        </div>

        <div className="project-detail-page__collaboration-actions">
          <Link className="btn btn-secondary" to={`/times?projectId=${projectId}`}>
            {t('manage_teams_2')}
          </Link>
          <Link className="btn btn-secondary" to={`/roda?projectId=${projectId}`}>
            {t('open_planning_poker_sessions')}
          </Link>
        </div>
      </section>

      <section
        id="historias-projeto"
        className="panel project-detail-page__stories"
        aria-label={t('stories_linked_to_the_project')}
      >
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">{t('project_stories')}</p>
            <h2>{storiesLabel}</h2>
            <p>{t('organize_stories_by_workflow_estimation_status_and')}</p>
            {hasProjectStories ? (
              <p className="project-detail-page__story-filter-summary">
                {isStorySearchActive
                  ? t('for', { p1: storySearchResultLabel, p2: storySearchDisplay })
                  : storyViewMode === 'board'
                  ? shouldFocusInsightCandidates
                    ? t('by_the_diagnosis', { p1: visibleKanbanStoryCount, p2: visibleKanbanStoryCount === 1 ? t('card_in_focus') : t('cards_in_focus') })
                    : t('on_the_board', { p1: visibleKanbanStoryCount, p2: visibleKanbanStoryCount === 1 ? t('visible_card') : t('visible_cards') })
                  : shouldFocusInsightCandidates
                    ? t('by_the_diagnosis', { p1: visibleProjectStoryCount, p2: visibleProjectStoryCount === 1 ? t('story_in_focus') : t('stories_in_focus') })
                    : storyEstimationFilter === 'all'
                    ? filteredStoriesLabel
                    : t('in', { p1: filteredStoriesLabel, p2: currentStoryFilterLabel })}
              </p>
            ) : null}
          </div>
          <div className="project-detail-page__story-actions">
            <label className="project-detail-page__story-search">
              <span>{t('search_this_project')}</span>
              <input
                type="search"
                value={storySearchInput}
                onChange={(event) => setStorySearchInput(event.target.value)}
                placeholder={t('title_context_or_user_story')}
                disabled={isLoadingStories}
              />
            </label>
            <div className="project-detail-page__story-view-toggle" role="group" aria-label={t('view_mode')}>
              <button
                type="button"
                className={storyViewMode === 'board' ? 'is-active' : ''}
                aria-pressed={storyViewMode === 'board'}
                onClick={() => setStoryViewMode('board')}
              >
                {t('board')}
              </button>
              <button
                type="button"
                className={storyViewMode === 'list' ? 'is-active' : ''}
                aria-pressed={storyViewMode === 'list'}
                onClick={() => setStoryViewMode('list')}
              >
                {t('list')}
              </button>
            </div>
            <label className="project-detail-page__story-filter">
              <span>{t('filter_by_status')}</span>
              <select
                value={storyEstimationFilter}
                onChange={(event) => setStoryEstimationFilter(event.target.value)}
                disabled={isLoadingStories}
              >
                {STORY_ESTIMATION_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              {t('forge_in_this_project')}
            </Link>
          </div>
        </div>

        <div className={`project-detail-page__story-guidance project-detail-page__story-guidance--${storyOperationalGuidance.tone}`}>
          <div>
            <span>{t('board_guidance')}</span>
            <strong>{storyOperationalGuidance.title}</strong>
            <p>{storyOperationalGuidance.description}</p>
          </div>
          {storyOperationalGuidance.to ? (
            <Link className="btn btn-primary btn-small" to={storyOperationalGuidance.to}>
              {storyOperationalGuidance.cta}
            </Link>
          ) : (
            <a className="btn btn-secondary btn-small" href={storyOperationalGuidance.href}>
              {storyOperationalGuidance.cta}
            </a>
          )}
        </div>

        {hasProjectStories ? (
          <div className="project-detail-page__story-quick-filters" aria-label={t('quick_story_filters')}>
            {STORY_STATUS_QUICK_FILTERS.map((option) => {
              const isActive = storyEstimationFilter === option.value
              const count = getStoryStatusQuickFilterCount(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`project-detail-page__story-quick-filter${isActive ? ' is-active' : ''}`}
                  onClick={() => setStoryEstimationFilter(option.value)}
                  aria-pressed={isActive}
                  disabled={isLoadingStories}
                >
                  <span>{t(option.label)}</span>
                  <strong>{count}</strong>
                  <small>{t(option.hint)}</small>
                </button>
              )
            })}
          </div>
        ) : null}

        {hasProjectStories && projectInsightCandidateStoryIds.length > 0 ? (
          <div
            className={`project-detail-page__story-ai-focus${
              shouldFocusInsightCandidates ? ' is-active' : ''
            }`}
          >
            <div>
              <strong>{insightCandidateFilterLabel}</strong>
              <p>
                {t('focus_on_the_stories_suggested_by_ai')}
              </p>
            </div>
            <div className="project-detail-page__story-ai-focus-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleToggleInsightCandidateFilter}
              >
                {shouldFocusInsightCandidates ? t('show_all') : t('focus_on_candidates')}
              </button>
              {readyInsightCandidateStoryIds.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleSelectReadyInsightCandidates}
                >
                  {t('select_ready_ai_candidates')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {hasProjectStories && storyViewMode === 'board' && canEditKanbanColumns ? (
          <form className="project-detail-page__kanban-column-form" onSubmit={handleCreateKanbanColumn}>
            <label className="projects-page__field">
              <span>{t('new_column')}</span>
              <input
                type="text"
                value={newKanbanColumnName}
                onChange={(event) => setNewKanbanColumnName(event.target.value)}
                placeholder={t('e_g_in_discovery')}
                disabled={isCreatingKanbanColumn}
              />
            </label>
            <label className="projects-page__field">
              <span>{t('base_status')}</span>
              <select
                value={newKanbanColumnStatusBase}
                onChange={(event) => setNewKanbanColumnStatusBase(event.target.value)}
                disabled={isCreatingKanbanColumn}
              >
                {ESTIMATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary btn-small"
              disabled={isCreatingKanbanColumn || !newKanbanColumnName.trim()}
            >
              {isCreatingKanbanColumn ? t('creating') : t('create_column')}
            </button>
          </form>
        ) : null}

        {hasProjectStories ? (
          <div className="project-detail-page__story-batch-bar">
            <div>
              <strong>{selectedReadyStoriesLabel}</strong>
              <p>{selectedReadyStoriesHint}</p>
            </div>
            <div className="project-detail-page__story-batch-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleSelectVisibleReadyStories}
                disabled={visibleAvailableReadyStories.length === 0 || isLoadingStories}
              >
                {t('select_visible_available_stories')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleClearProjectStorySelection}
                disabled={selectedReadyStoryIds.length === 0 || isLoadingStories}
              >
                {t('clear_selection')}
              </button>
              {canOpenSelectedReadyStories ? (
                <Link className="btn btn-primary btn-small" to={selectedReadyStoriesRodaUrl}>
                  {t('open_planning_poker_with_selected_stories')}
                </Link>
              ) : (
                <button type="button" className="btn btn-primary btn-small" disabled>
                  {t('open_planning_poker_with_selected_stories')}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {hasProjectStories && storyViewMode === 'board' ? (
          <div className="project-detail-page__kanban-overview" aria-label={t('kanban_board_summary')}>
            {kanbanBoardSummaryItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        ) : null}

        {hasProjectStories && storyViewMode === 'board' ? (
          <div className="project-detail-page__kanban-operation">
            <div>
              <span>{t('board_actions')}</span>
              <strong>{kanbanBoardOperationTitle}</strong>
              <p>{kanbanBoardOperationText}</p>
            </div>
            {visibleAvailableReadyCount > 0 ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleSelectVisibleReadyStories}
                disabled={isLoadingStories}
              >
                {t('select_available_stories')}
              </button>
            ) : null}
          </div>
        ) : null}

        {isLoadingStories ? <p className="projects-page__state">{t('loading_stories')}</p> : null}
        {hasNoProjectStories ? (
          <div className="projects-page__empty">
            <h3>{t('no_linked_stories_yet')}</h3>
            <p>{t('open_the_workbench_with_this_project_selected')}</p>
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              {t('forge_in_this_project')}
            </Link>
          </div>
        ) : null}
        {hasNoStoriesForFilter ? (
          <div className="projects-page__empty">
            <h3>{t('no_stories_match_this_filter')}</h3>
            <p>{t('select_another_status_to_see_other_stories')}</p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setStoryEstimationFilter('all')}
            >
              {t('view_all_stories')}
            </button>
          </div>
        ) : null}
        {hasNoStoriesForInsightCandidateFilter ? (
          <div className="projects-page__empty">
            <h3>{t('no_ai_candidates_in_this_view')}</h3>
            <p>{t('clear_the_ai_focus_or_change_the')}</p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setIsInsightCandidateFilterActive(false)
                setStoryEstimationFilter('all')
              }}
            >
              {t('clear_ai_focus')}
            </button>
          </div>
        ) : null}
        {hasNoStoriesForLocalSearch ? (
          <div className="projects-page__empty">
            <h3>{t('no_stories_match_your_search')}</h3>
            <p>
              {t('clear_your_search_or_select_another_status')}
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setStorySearchInput('')}
            >
              {t('clear_search')}
            </button>
          </div>
        ) : null}
        {storyStatusMessage ? <p className="projects-page__message" role="status">{formatNotice(t, storyStatusMessage)}</p> : null}
        {kanbanMessage ? <p className="projects-page__message" role="status">{formatNotice(t, kanbanMessage)}</p> : null}
        {planningSummaryMessage ? <p className="projects-page__message" role="status">{formatNotice(t, planningSummaryMessage)}</p> : null}
        {shouldShowStoryLimitNotice ? (
          <p className="projects-page__state">{t('showing_the_50_most_recent_stories_for')}</p>
        ) : null}
        {shouldShowKanbanLimitNotice ? (
          <p className="projects-page__state">{t('showing_the_200_most_recent_stories_on')}</p>
        ) : null}

        {storyViewMode === 'board' ? (
          <>
            {isLoadingKanban ? <p className="projects-page__state">{t('loading_kanban_board')}</p> : null}
            {isKanbanUnavailable && kanbanMessage === 'the_kanban_board_will_be_available_after' ? (
              <div className="projects-page__empty">
                <h3>{t('kanban_board_awaiting_sql_setup')}</h3>
                <p>
                  {t('apply')}{" "}<code>{'supabase/project-kanban.sql'}</code>{" "}{t('to_enable_columns_card_movement_and_board')}
                </p>
              </div>
            ) : null}
            {!isLoadingKanban && !isKanbanUnavailable && hasProjectStories ? (
              <div className="project-detail-page__kanban" aria-label={t('project_story_kanban_board')}>
                {visibleKanbanColumns.map((column, columnIndex) => {
                  const isEditingColumn = editingKanbanColumnId === column.id
                  const isDropTarget = dragOverKanbanColumnId === column.id
                  const columnCards = column.cards ?? []
                  const columnCount = columnCards.length
                  const availableReadyColumnStoryCount = countAvailableReadyStories(
                    columnCards,
                    planningStorySessionById,
                  )

                  return (
                    <section
                      key={column.id}
                      className={`project-detail-page__kanban-column project-detail-page__kanban-column--${
                        column.status_base
                      }${isDropTarget ? ' is-drop-target' : ''}`}
                      onDragOver={(event) => handleKanbanDragOver(event, column.id)}
                      onDragLeave={() => handleKanbanDragLeave(column.id)}
                      onDrop={(event) => handleKanbanDrop(event, column.id)}
                    >
                      <header className="project-detail-page__kanban-column-header">
                        <div>
                          <span>{getEstimationStatusLabel(column.status_base, t)}</span>
                          <h3>{getKanbanColumnLabel(column, t)}</h3>
                          <div className="project-detail-page__kanban-column-stats">
                            <small>
                              {columnCount} {columnCount === 1 ? t('story') : t('stories_2')}
                            </small>
                            {availableReadyColumnStoryCount > 0 ? (
                              <small>
                                {availableReadyColumnStoryCount}{' '}
                                {availableReadyColumnStoryCount === 1 ? t('available_for_planning_poker_2') : t('available_for_planning_poker_3')}
                              </small>
                            ) : null}
                          </div>
                          <small className="project-detail-page__kanban-column-hint">
                            {getKanbanColumnIntent(column.status_base, t)}
                          </small>
                        </div>
                        {canEditKanbanColumns || availableReadyColumnStoryCount > 0 ? (
                          <div className="project-detail-page__kanban-column-actions">
                            {availableReadyColumnStoryCount > 0 ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => handleSelectReadyStoriesInColumn(column)}
                                disabled={isLoadingStories}
                              >
                                {t('select_available_stories_2')}
                              </button>
                            ) : null}
                            {canEditKanbanColumns ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-small"
                                  onClick={() => handleReorderKanbanColumn(column, 'left')}
                                  disabled={columnIndex === 0 || reorderingKanbanColumnId === column.id}
                                  aria-label={t('move_column_left', { p1: getKanbanColumnLabel(column, t) })}
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-small"
                                  onClick={() => handleReorderKanbanColumn(column, 'right')}
                                  disabled={
                                    columnIndex === visibleKanbanColumns.length - 1 ||
                                    reorderingKanbanColumnId === column.id
                                  }
                                  aria-label={t('move_column_right', { p1: getKanbanColumnLabel(column, t) })}
                                >
                                  →
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-small"
                                  onClick={() => handleStartEditKanbanColumn(column)}
                                  aria-label={t('edit_column', { name: getKanbanColumnLabel(column, t) })}
                                >
                                  {t('edit')}
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </header>

                      {isEditingColumn ? (
                        <form
                          className="project-detail-page__kanban-column-edit"
                          onSubmit={(event) => handleUpdateKanbanColumn(event, column)}
                        >
                          <label className="projects-page__field">
                            <span>{t('column_name')}</span>
                            <input
                              type="text"
                              value={editingKanbanColumnName}
                              onChange={(event) => setEditingKanbanColumnName(event.target.value)}
                              disabled={savingKanbanColumnId === column.id}
                            />
                          </label>
                          <label className="projects-page__field">
                            <span>{t('base_status')}</span>
                            <select
                              value={editingKanbanColumnStatusBase}
                              onChange={(event) => setEditingKanbanColumnStatusBase(event.target.value)}
                              disabled={savingKanbanColumnId === column.id}
                            >
                              {ESTIMATION_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {t(option.label)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="project-detail-page__kanban-edit-actions">
                            <button
                              type="submit"
                              className="btn btn-primary btn-small"
                              disabled={savingKanbanColumnId === column.id || !editingKanbanColumnName.trim()}
                            >
                              {savingKanbanColumnId === column.id ? t('saving') : t('save_column')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-small"
                              onClick={handleCancelEditKanbanColumn}
                              disabled={savingKanbanColumnId === column.id}
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        </form>
                      ) : null}

                      <div className="project-detail-page__kanban-cards">
                        {columnCards.length === 0 ? (
                          <div className="project-detail-page__kanban-empty">
                            <p>{getKanbanColumnEmptyText(column.status_base, t)}</p>
                            {column.status_base === 'created' ? (
                              <Link className="btn btn-ghost btn-small" to={`/tool?projectId=${projectId}`}>
                                {t('forge_story')}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                        {columnCards.map((story) => {
                          const isReadyForPlanning = story.estimation_status === 'ready_for_estimation'
                          const isSelectedForPlanning = selectedProjectStoryIds.includes(story.id)
                          const isMovingStory = movingKanbanStoryId === story.id
                          const canPrepareForPlanning =
                            canMoveKanbanCards &&
                            !isReadyForPlanning &&
                            story.estimation_status !== 'estimated'
                          const planningEntry = planningStorySessionById[story.id]
                          const planningSession = planningEntry?.session
                          const planningStory = planningEntry?.story
                          const isInLivePlanningSession = Boolean(planningEntry?.isLive)
                          const finalEstimate = planningStory?.final_estimate ?? planningEntry?.finalEstimate
                          const canDragKanbanStory = canMoveKanbanCards && !isInLivePlanningSession
                          const planningRoomUrl = planningSession
                            ? `/projetos/${projectId}/roda/${planningSession.id}`
                            : `/roda?projectId=${projectId}`

                          return (
                            <article
                              key={story.id}
                              className={`project-detail-page__kanban-card${
                                isSelectedForPlanning ? ' is-selected' : ''
                              }${isMovingStory ? ' is-moving' : ''}${
                                isInLivePlanningSession ? ' is-live-session' : ''
                              }`}
                              draggable={canDragKanbanStory}
                              onDragStart={(event) => handleKanbanDragStart(event, story)}
                              onDragEnd={() => {
                                setDraggedKanbanStoryId(null)
                                setDragOverKanbanColumnId(null)
                              }}
                            >
                              {isReadyForPlanning ? (
                                <label
                                  className={`project-detail-page__story-select${
                                    isInLivePlanningSession ? ' is-disabled' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForPlanning}
                                    onChange={() => handleToggleProjectStorySelection(story.id)}
                                    disabled={isInLivePlanningSession}
                                  />
                                  <span>{isInLivePlanningSession ? t('already_in_an_active_session') : t('select_for_planning_poker')}</span>
                                </label>
                              ) : null}

                              <div className="project-detail-page__kanban-card-copy">
                                <h4>{story.title}</h4>
                                <p>{getStoryPreview(story, t)}</p>
                              </div>

                              <div className="project-detail-page__kanban-card-meta">
                                <span>{formatProjectDateTime(story.created_at, language)}</span>
                                <span>{getStoryVersionLabel(story.version_number, t)}</span>
                                <span>{getEstimationStatusLabel(story.estimation_status, t)}</span>
                                {finalEstimate ? <span>{t('final')}{" "}{finalEstimate}</span> : null}
                              </div>

                              {planningEntry ? (
                                <div
                                  className={`project-detail-page__kanban-card-planning${
                                    isInLivePlanningSession ? ' is-live' : ''
                                  }`}
                                >
                                  <strong>
                                    {isInLivePlanningSession
                                      ? t('in_an_active_session_2')
                                      : finalEstimate
                                        ? t('estimate_recorded')
                                        : t('linked_session')}
                                  </strong>
                                  <span>
                                    {planningSession?.name ?? t('planning_poker')} ·{' '}
                                    {getPlanningStatusLabel(planningSession?.status, t)}
                                  </span>
                                </div>
                              ) : null}

                              <div className="project-detail-page__kanban-card-actions">
                                {canDragKanbanStory ? (
                                  <details className="project-detail-page__kanban-card-tools">
                                    <summary>{t('move_card')}</summary>
                                    <label className="project-detail-page__kanban-move">
                                      <span>{t('move_to')}</span>
                                      <select
                                        value={story.kanban_column_id}
                                        onChange={(event) => handleMoveKanbanStory(story, event.target.value)}
                                        disabled={isMovingStory}
                                      >
                                        {kanbanColumns.map((targetColumn) => (
                                          <option key={targetColumn.id} value={targetColumn.id}>
                                            {getKanbanColumnLabel(targetColumn, t)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </details>
                                ) : null}
                                {canPrepareForPlanning ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-small"
                                    onClick={() => handlePrepareStoryForPlanning(story)}
                                    disabled={isMovingStory}
                                  >
                                    {isMovingStory ? t('preparing') : t('prepare_for_planning_poker')}
                                  </button>
                                ) : null}
                                <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                                  {t('open_in_workbench')}
                                </Link>
                                {isInLivePlanningSession ? (
                                  <Link className="btn btn-primary btn-small" to={planningRoomUrl}>
                                    {t('continue_session')}
                                  </Link>
                                ) : isReadyForPlanning ? (
                                  <Link
                                    className="btn btn-primary btn-small"
                                    to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                                  >
                                    {t('open_planning_poker')}
                                  </Link>
                                ) : null}
                                {story.estimation_status === 'estimated' ? (
                                  <Link className="btn btn-secondary btn-small" to={planningRoomUrl}>
                                    {t('view_estimate')}
                                  </Link>
                                ) : null}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {storyViewMode === 'list' ? (
        <div className="project-detail-page__story-list">
          {visibleProjectStories.map((story) => {
            const canUpdateStoryStatus = canManageProjectMembers || story.user_id === userId
            const isUpdatingStoryStatus = updatingStoryStatusId === story.id
            const isReadyForPlanning = story.estimation_status === 'ready_for_estimation'
            const isSelectedForPlanning = selectedProjectStoryIds.includes(story.id)
            const planningEntry = planningStorySessionById[story.id]
            const planningSession = planningEntry?.session
            const planningStory = planningEntry?.story
            const isInLivePlanningSession = Boolean(planningEntry?.isLive)
            const finalEstimate = planningStory?.final_estimate ?? planningEntry?.finalEstimate
            const planningRoomUrl = planningSession
              ? `/projetos/${projectId}/roda/${planningSession.id}`
              : `/roda?projectId=${projectId}`

            return (
              <article
                key={story.id}
                className={`project-detail-page__story${isSelectedForPlanning ? ' is-selected' : ''}`}
              >
                <div>
                  {isReadyForPlanning ? (
                    <label
                      className={`project-detail-page__story-select${
                        isInLivePlanningSession ? ' is-disabled' : ''
                      }`}
                    >
                        <input
                          type="checkbox"
                          checked={isSelectedForPlanning}
                          onChange={() => handleToggleProjectStorySelection(story.id)}
                          disabled={isInLivePlanningSession}
                        />
                      <span>{isInLivePlanningSession ? t('already_in_an_active_session') : t('select_for_planning_poker')}</span>
                    </label>
                  ) : null}
                  <h3>{story.title}</h3>
                  <p>{story.input_context || story.user_story || t('no_description')}</p>
                  {planningEntry ? (
                    <div
                      className={`project-detail-page__kanban-card-planning${
                        isInLivePlanningSession ? ' is-live' : ''
                      }`}
                    >
                      <strong>{isInLivePlanningSession ? t('in_an_active_session_2') : t('linked_session')}</strong>
                      <span>
                        {planningSession?.name ?? t('planning_poker')}
                        {finalEstimate ? t('final_2', { p1: finalEstimate }) : ''}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="project-detail-page__story-meta">
                  <span>{formatProjectDateTime(story.created_at, language)}</span>
                  {canUpdateStoryStatus ? (
                    <label className="project-detail-page__story-status">
                      <span>{t('estimation_status')}</span>
                      <select
                        value={story.estimation_status ?? 'created'}
                        onChange={(event) =>
                          handleUpdateStoryEstimationStatus(story, event.target.value)
                        }
                        disabled={isUpdatingStoryStatus || isInLivePlanningSession}
                      >
                        {ESTIMATION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span>{getEstimationStatusLabel(story.estimation_status, t)}</span>
                  )}
                  <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                    {t('open_in_workbench')}
                  </Link>
                  {isInLivePlanningSession ? (
                    <Link className="btn btn-primary btn-small" to={planningRoomUrl}>
                      {t('continue_session')}
                    </Link>
                  ) : isReadyForPlanning ? (
                    <Link
                      className="btn btn-primary btn-small"
                      to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                    >
                      {t('open_planning_poker')}
                    </Link>
                  ) : null}
                  {story.estimation_status === 'estimated' ? (
                    <Link className="btn btn-secondary btn-small" to={planningRoomUrl}>
                      {t('view_estimate')}
                    </Link>
                  ) : null}
                  {story.estimation_status !== 'ready_for_estimation' &&
                  story.estimation_status !== 'estimated' &&
                  canUpdateStoryStatus ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handlePrepareStoryForPlanning(story)}
                      disabled={isUpdatingStoryStatus}
                    >
                      {isUpdatingStoryStatus ? t('preparing') : t('prepare_for_planning_poker')}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
        ) : null}
      </section>

      <section id="membros-projeto" className="panel project-detail-page__members" aria-label={t('project_members')}>
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">{t('project_members')}</p>
            <h2>{membersLabel}</h2>
            <p>{t('people_with_access_to_this_project_and')}</p>
          </div>
        </div>

        {canManageProjectMembers ? (
          <form className="project-detail-page__member-form" onSubmit={handleAddProjectMember}>
            <label className="projects-page__field">
              <span>{t('registered_email')}</span>
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder={t('name_example_com')}
                disabled={isAddingProjectMember || isLoading}
              />
            </label>
            <label className="projects-page__field">
              <span>{t('role')}</span>
              <select
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value)}
                disabled={isAddingProjectMember || isLoading}
              >
                {PROJECT_MEMBER_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary btn-small"
              disabled={isAddingProjectMember || isLoading}
            >
              {isAddingProjectMember ? t('adding') : t('add_member')}
            </button>
          </form>
        ) : (
          <p className="projects-page__state">
            {t('you_can_view_the_members_only_owners')}
          </p>
        )}

        {memberMessage ? <p className="projects-page__message" role="status">{formatNotice(t, memberMessage)}</p> : null}
        {isLoading ? <p className="projects-page__state">{t('loading_members')}</p> : null}

        <div className="project-detail-page__member-list">
          {projectMembers.map((member) => {
            const canEditMember =
              canManageProjectMembers && member.role !== 'owner' && member.user_id !== userId
            const isUpdatingMember = updatingProjectMemberId === member.user_id
            const isRemovingMember = removingProjectMemberId === member.user_id

            return (
              <div key={member.user_id} className="project-detail-page__member">
                <span>{member.email}</span>
                {canEditMember ? (
                  <div className="project-detail-page__member-controls">
                    <label className="project-detail-page__member-role">
                      <span>{t('role')}</span>
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleUpdateProjectMemberRole(member, event.target.value)
                        }
                        disabled={isUpdatingMember || isRemovingMember}
                      >
                        {PROJECT_MEMBER_ROLES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => handleRemoveProjectMember(member)}
                      disabled={isUpdatingMember || isRemovingMember || member.user_id === userId}
                    >
                      {isRemovingMember ? t('removing') : t('remove')}
                    </button>
                  </div>
                ) : (
                  <strong>{ROLE_LABELS[member.role] ? t(ROLE_LABELS[member.role]) : member.role}</strong>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default ProjectDetailPage
