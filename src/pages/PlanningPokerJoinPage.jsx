import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useCopy, useLanguage } from '../i18n/context'
import { formatNotice } from '../i18n/formatNotice'
import Link from '../i18n/LocalizedLink'
import { localizeHref } from '../i18n/routes'
import { useAuth } from '../hooks/useAuth'
import { checkCanManageProject, listProjects } from '../services/projectsService'
import {
  createPlanningPokerSession,
  getPlanningPokerSessionByInviteCode,
  listPlanningPokerSessionsByProject,
  listPlanningPokerSessionStorySummaries,
} from '../services/planningPokerService'
import { listTeamsByProject } from '../services/teamsService'
import { listStoryHistoryGroups } from '../services/userStoriesService'
import {
  LIVE_PLANNING_SESSION_STATUSES,
  buildPlanningAccessRequestMessage,
  buildPlanningSessionSummaryMarkdown,
  formatPlanningCount,
  formatPlanningTimerDuration,
  getActivePlanningStorySessionByStoryId,
  getPlanningScoringScaleLabel,
  getPlanningSessionProgressById,
  getPlanningSessionSortWeight,
  getPlanningSessionStatusLabel,
  getPlanningStorySearchText,
  getPlanningStoryStatusLabel,
} from '../utils/planningPokerUtils'
import { copyTextToClipboard } from '../utils/storyExport'

const PLANNING_SESSION_FILTER_OPTIONS = [
  { value: 'all', label: 'all' },
  { value: 'active_group', label: 'in_progress' },
  { value: 'draft', label: 'draft' },
  { value: 'active', label: 'active' },
  { value: 'voting', label: 'voting' },
  { value: 'revealed', label: 'votes_revealed' },
  { value: 'completed', label: 'completed' },
  { value: 'canceled', label: 'canceled' },
]

const PLANNING_TIMER_OPTIONS = [
  { value: 60, label: '1_minute' },
  { value: 180, label: '3_minutes' },
  { value: 300, label: '5_minutes' },
  { value: 600, label: '10_minutes' },
]

const PLANNING_SCORING_SCALE_OPTIONS = [
  { value: 'fibonacci', label: 'fibonacci' },
  { value: 'tshirt', label: 't_shirt_sizes' },
]

const PLANNING_SCORING_SCALE_FILTER_OPTIONS = [
  { value: 'all', label: 'all' },
  ...PLANNING_SCORING_SCALE_OPTIONS,
  { value: 'custom', label: 'custom' },
]

function normalizeInviteCode(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

function formatPlanningDateTime(value, language = 'pt-BR') {
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

function buildPlanningInviteUrl(inviteCode, language) {
  if (typeof window === 'undefined' || !inviteCode) return ''
  const path = `/roda?codigo=${encodeURIComponent(inviteCode)}`
  return new URL(language ? localizeHref(path, language) : path, window.location.origin).toString()
}

function PlanningPokerJoinPage() {
  const t = useCopy('planning')
  const { language, preview } = useLanguage()
  const navigate = useNavigate()
  const currentLanguage = useRef(language)
  useLayoutEffect(() => { currentLanguage.current = language }, [language])
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [searchParams, setSearchParams] = useSearchParams()
  const autoJoinCodeAttemptedRef = useRef('')
  const codeFromUrl = normalizeInviteCode(searchParams.get('codigo'))
  const projectIdFromUrl = searchParams.get('projectId') ?? ''
  const storyIdFromUrl = searchParams.get('storyId') ?? ''
  const rawStoryIds = searchParams.get('storyIds') ?? ''
  const storyIdsFromUrl = useMemo(
    () =>
      rawStoryIds
        .split(',')
        .map((storyId) => storyId.trim())
        .filter(Boolean),
    [rawStoryIds],
  )
  const [inviteCode, setInviteCode] = useState(() => codeFromUrl)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl)
  const [accessiblePlanningSessions, setAccessiblePlanningSessions] = useState([])
  const [accessiblePlanningStoriesBySession, setAccessiblePlanningStoriesBySession] = useState({})
  const [canManageSelectedProject, setCanManageSelectedProject] = useState(false)
  const [teams, setTeams] = useState([])
  const [readyStories, setReadyStories] = useState([])
  const [selectedStoryIds, setSelectedStoryIds] = useState([])
  const [planningSessions, setPlanningSessions] = useState([])
  const [planningSessionStoriesBySession, setPlanningSessionStoriesBySession] = useState({})
  const [planningSessionStatusFilter, setPlanningSessionStatusFilter] = useState('all')
  const [planningSessionScaleFilter, setPlanningSessionScaleFilter] = useState('all')
  const [planningSessionStoryFilter, setPlanningSessionStoryFilter] = useState('all')
  const [planningSessionSearch, setPlanningSessionSearch] = useState('')
  const [accessiblePlanningStatusFilter, setAccessiblePlanningStatusFilter] = useState('all')
  const [accessiblePlanningSearch, setAccessiblePlanningSearch] = useState('')
  const [readyStorySearch, setReadyStorySearch] = useState('')
  const [hideActiveSessionStories, setHideActiveSessionStories] = useState(false)
  const [planningSessionName, setPlanningSessionName] = useState('')
  const [planningTeamId, setPlanningTeamId] = useState('')
  const [planningScoringScale, setPlanningScoringScale] = useState('fibonacci')
  const [planningVoteTimeLimit, setPlanningVoteTimeLimit] = useState(300)
  const [planningAllowRevote, setPlanningAllowRevote] = useState(true)
  const [planningRevealAfterAll, setPlanningRevealAfterAll] = useState(false)
  const [planningAllowAbstention, setPlanningAllowAbstention] = useState(true)
  const [planningAllowObservers, setPlanningAllowObservers] = useState(true)
  const [message, setMessage] = useState('')
  const [planningMessage, setPlanningMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [copyFeedbackBySessionId, setCopyFeedbackBySessionId] = useState({})
  const [accessRequestCode, setAccessRequestCode] = useState('')
  const [accessRequestFeedback, setAccessRequestFeedback] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingAccessiblePlanningSessions, setIsLoadingAccessiblePlanningSessions] = useState(false)
  const [isLoadingProjectContext, setIsLoadingProjectContext] = useState(false)
  const [isCreatingPlanningSession, setIsCreatingPlanningSession] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === planningTeamId) ?? null,
    [planningTeamId, teams],
  )
  const selectedTimerLabel = useMemo(
    () =>
      formatPlanningTimerDuration(planningVoteTimeLimit, t),
    [t, planningVoteTimeLimit],
  )
  const selectedStories = useMemo(
    () => readyStories.filter((story) => selectedStoryIds.includes(story.id)),
    [readyStories, selectedStoryIds],
  )
  const selectedStoryPreview = useMemo(
    () => selectedStories.slice(0, 3),
    [selectedStories],
  )
  const hasSelectedStoryPreview = selectedStoryPreview.length > 0
  const remainingSelectedStoryCount = selectedStoryIds.length - selectedStoryPreview.length
  const remainingSelectedStoryLabel =
    remainingSelectedStoryCount > 0 ? t('more_selected', { p1: remainingSelectedStoryCount }) : ''
  const selectedStoriesPanelLabel =
    selectedStoryIds.length === 1
      ? t('1_story_selected_for_planning_poker')
      : t('stories_selected_for_planning_poker', { p1: selectedStoryIds.length })
  const planningRuleSummary = useMemo(
    () => [
      planningAllowRevote ? t('vote_changes_allowed') : t('one_vote_per_person'),
      planningRevealAfterAll ? t('reveal_after_everyone_votes') : t('facilitator_reveals'),
      planningAllowAbstention ? t('abstentions_allowed') : t('no_abstentions'),
      planningAllowObservers ? t('observers_allowed') : t('no_observers'),
    ],
    [t, planningAllowAbstention, planningAllowObservers, planningAllowRevote, planningRevealAfterAll],
  )
  const accessRequestMessage = useMemo(
    () =>
      buildPlanningAccessRequestMessage({
        email: user?.email ?? '',
        inviteCode: accessRequestCode,
      }, t),
    [t, accessRequestCode, user?.email],
  )
  const readyStoriesLabel = useMemo(
    () =>
      `${readyStories.length} ${
        readyStories.length === 1 ? t('ready_story') : t('ready_stories')
      }`,
    [t, readyStories.length],
  )
  const filteredReadyStories = useMemo(() => {
    const search = readyStorySearch.trim().toLocaleLowerCase('pt-BR')
    if (!search) return readyStories

    return readyStories.filter((story) => {
      const searchable = [
        story.title,
        story.input_context,
        story.user_story,
        formatPlanningDateTime(story.created_at),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return searchable.includes(search)
    })
  }, [readyStories, readyStorySearch])
  const planningSessionsLabel = useMemo(
    () =>
      `${planningSessions.length} ${
        planningSessions.length === 1 ? t('session_created') : t('sessions_created')
      }`,
    [t, planningSessions.length],
  )
  const activePlanningSessionsCount = useMemo(
    () => planningSessions.filter((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)).length,
    [planningSessions],
  )
  const completedPlanningSessionsCount = useMemo(
    () => planningSessions.filter((session) => session.status === 'completed').length,
    [planningSessions],
  )
  const primaryActivePlanningSession = useMemo(
    () => planningSessions.find((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)) ?? null,
    [planningSessions],
  )
  const latestCompletedPlanningSession = useMemo(
    () => planningSessions.find((session) => session.status === 'completed') ?? null,
    [planningSessions],
  )
  const accessibleActivePlanningSessionsCount = useMemo(
    () => accessiblePlanningSessions.filter((session) => LIVE_PLANNING_SESSION_STATUSES.includes(session.status)).length,
    [accessiblePlanningSessions],
  )
  const accessibleCompletedPlanningSessionsCount = useMemo(
    () => accessiblePlanningSessions.filter((session) => session.status === 'completed').length,
    [accessiblePlanningSessions],
  )
  const accessibleCanceledPlanningSessionsCount = useMemo(
    () => accessiblePlanningSessions.filter((session) => session.status === 'canceled').length,
    [accessiblePlanningSessions],
  )
  const accessiblePlanningSessionsLabel = useMemo(
    () =>
      formatPlanningCount(
        accessiblePlanningSessions.length,
        t('accessible_session'),
        t('accessible_sessions'),
      ),
    [t, accessiblePlanningSessions.length],
  )
  const filteredAccessiblePlanningSessions = useMemo(() => {
    const search = accessiblePlanningSearch.trim().toLocaleLowerCase('pt-BR')

    return accessiblePlanningSessions.filter((session) => {
      const sessionStories = accessiblePlanningStoriesBySession[session.id] ?? []

      if (
        accessiblePlanningStatusFilter === 'active_group' &&
        !LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
      ) {
        return false
      }

      if (
        accessiblePlanningStatusFilter !== 'all' &&
        accessiblePlanningStatusFilter !== 'active_group' &&
        session.status !== accessiblePlanningStatusFilter
      ) {
        return false
      }

      if (!search) return true

      const searchable = [
        session.name,
        session.projectName,
        session.invite_code,
        getPlanningSessionStatusLabel(session.status),
        getPlanningScoringScaleLabel(session.scoring_scale),
        formatPlanningDateTime(session.created_at),
        ...sessionStories.map(getPlanningStorySearchText),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return searchable.includes(search)
    })
  }, [
    accessiblePlanningSearch,
    accessiblePlanningSessions,
    accessiblePlanningStatusFilter,
    accessiblePlanningStoriesBySession,
  ])
  const accessiblePlanningSessionsPreview = useMemo(
    () => filteredAccessiblePlanningSessions.slice(0, 8),
    [filteredAccessiblePlanningSessions],
  )
  const accessiblePlanningFilterOptions = useMemo(
    () => [
      { value: 'all', label: t('all'), count: accessiblePlanningSessions.length },
      { value: 'active_group', label: t('in_progress'), count: accessibleActivePlanningSessionsCount },
      { value: 'completed', label: t('completed_2'), count: accessibleCompletedPlanningSessionsCount },
      { value: 'canceled', label: t('canceled_2'), count: accessibleCanceledPlanningSessionsCount },
    ],
    [
      t,
      accessibleActivePlanningSessionsCount,
      accessibleCanceledPlanningSessionsCount,
      accessibleCompletedPlanningSessionsCount,
      accessiblePlanningSessions.length,
    ],
  )
  const hasAccessiblePlanningFilters =
    accessiblePlanningStatusFilter !== 'all' || accessiblePlanningSearch.trim().length > 0
  const canFilterAccessiblePlanningSessions =
    !isLoadingAccessiblePlanningSessions && accessiblePlanningSessions.length > 0
  const hasNoAccessiblePlanningSessions =
    !isLoadingAccessiblePlanningSessions && accessiblePlanningSessions.length === 0
  const hasFilteredAccessiblePlanningNoResults =
    canFilterAccessiblePlanningSessions && filteredAccessiblePlanningSessions.length === 0
  const hasAccessiblePlanningPreview =
    !isLoadingAccessiblePlanningSessions && accessiblePlanningSessionsPreview.length > 0
  const shouldShowAccessiblePlanningLimit =
    !isLoadingAccessiblePlanningSessions &&
    filteredAccessiblePlanningSessions.length > accessiblePlanningSessionsPreview.length
  const dashboardOverviewCards = useMemo(
    () => [
      {
        label: t('project'),
        value: selectedProject?.name ?? t('no_project_selected'),
        description: selectedProject
          ? t('project_loaded_for_creating_and_viewing_sessions')
          : t('choose_a_project_to_load_stories_and'),
      },
      {
        label: t('ready_stories_2'),
        value: readyStoriesLabel,
        description:
          readyStories.length > 0
            ? t('available_for_a_new_session')
            : t('mark_stories_as_ready_to_estimate_in'),
      },
      {
        label: t('active_sessions'),
        value: `${activePlanningSessionsCount} em andamento`,
        description:
          activePlanningSessionsCount > 0
            ? t('there_are_open_sessions_you_can_continue')
            : t('there_are_no_active_sessions_in_this'),
      },
      {
        label: t('history'),
        value: `${completedPlanningSessionsCount} finalizadas`,
        description: t('completed_sessions_are_available_to_review'),
      },
    ],
    [t, activePlanningSessionsCount, completedPlanningSessionsCount, readyStories.length, readyStoriesLabel, selectedProject],
  )
  const filteredPlanningSessions = useMemo(() => {
    const search = planningSessionSearch.trim().toLocaleLowerCase('pt-BR')

    return planningSessions
      .filter((session) => {
        const sessionStories = planningSessionStoriesBySession[session.id] ?? []
        const hasEstimatedStory = sessionStories.some((story) => story.status === 'estimated' || story.final_estimate)
        const hasPendingStory = sessionStories.some((story) => ['pending', 'voting'].includes(story.status))
        const hasSkippedStory = sessionStories.some((story) => story.status === 'skipped')

        if (
          planningSessionStatusFilter === 'active_group' &&
          !LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
        ) {
          return false
        }

        if (
          planningSessionStatusFilter !== 'all' &&
          planningSessionStatusFilter !== 'active_group' &&
          session.status !== planningSessionStatusFilter
        ) {
          return false
        }

        if (
          planningSessionScaleFilter !== 'all' &&
          session.scoring_scale !== planningSessionScaleFilter
        ) {
          return false
        }

        if (planningSessionStoryFilter === 'estimated_group' && !hasEstimatedStory) {
          return false
        }

        if (planningSessionStoryFilter === 'pending_group' && !hasPendingStory) {
          return false
        }

        if (planningSessionStoryFilter === 'skipped_group' && !hasSkippedStory) {
          return false
        }

        if (!search) return true

        const searchable = [
          session.name,
          session.invite_code,
          getPlanningSessionStatusLabel(session.status),
          getPlanningScoringScaleLabel(session.scoring_scale),
          formatPlanningDateTime(session.created_at),
          ...sessionStories.map(getPlanningStorySearchText),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')

        return searchable.includes(search)
      })
      .sort((a, b) => {
        const weightDiff = getPlanningSessionSortWeight(a.status) - getPlanningSessionSortWeight(b.status)
        if (weightDiff !== 0) return weightDiff

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [
    planningSessionScaleFilter,
    planningSessionSearch,
    planningSessionStatusFilter,
    planningSessionStoriesBySession,
    planningSessionStoryFilter,
    planningSessions,
  ])
  const planningSessionQuickFilters = useMemo(
    () => [
      {
        value: 'all',
        label: t('all'),
        count: planningSessions.length,
      },
      {
        value: 'active_group',
        label: t('in_progress'),
        count: activePlanningSessionsCount,
      },
      {
        value: 'completed',
        label: t('completed_2'),
        count: completedPlanningSessionsCount,
      },
    ],
    [t, activePlanningSessionsCount, completedPlanningSessionsCount, planningSessions.length],
  )
  const planningSessionProgressById = useMemo(() => {
    return getPlanningSessionProgressById(planningSessions, planningSessionStoriesBySession, t)
  }, [t, planningSessionStoriesBySession, planningSessions])
  const accessiblePlanningSessionProgressById = useMemo(() => {
    return getPlanningSessionProgressById(accessiblePlanningSessions, accessiblePlanningStoriesBySession, t)
  }, [t, accessiblePlanningSessions, accessiblePlanningStoriesBySession])
  const activePlanningStorySessionByStoryId = useMemo(() => {
    return getActivePlanningStorySessionByStoryId(planningSessions, planningSessionStoriesBySession)
  }, [planningSessionStoriesBySession, planningSessions])
  const readyStoriesWithoutActiveSession = useMemo(
    () => readyStories.filter((story) => !activePlanningStorySessionByStoryId[story.id]),
    [activePlanningStorySessionByStoryId, readyStories],
  )
  const visibleReadyStories = useMemo(
    () =>
      hideActiveSessionStories
        ? filteredReadyStories.filter((story) => !activePlanningStorySessionByStoryId[story.id])
        : filteredReadyStories,
    [activePlanningStorySessionByStoryId, filteredReadyStories, hideActiveSessionStories],
  )
  const visibleReadyStoriesWithoutActiveSession = useMemo(
    () => visibleReadyStories.filter((story) => !activePlanningStorySessionByStoryId[story.id]),
    [activePlanningStorySessionByStoryId, visibleReadyStories],
  )
  const readyStoriesInActiveSessionsCount = readyStories.length - readyStoriesWithoutActiveSession.length
  const visibleReadyStoriesLabel = useMemo(
    () =>
      `${visibleReadyStories.length} ${
        visibleReadyStories.length === 1 ? t('visible_story') : t('visible_stories')
      }`,
    [t, visibleReadyStories.length],
  )
  const readyStoryFilterHint =
    readyStoriesInActiveSessionsCount > 0
      ? hideActiveSessionStories
        ? `${formatPlanningCount(readyStoriesInActiveSessionsCount, t('story_hidden_because_it_s_in_an'), t('stories_hidden_because_they_re_in_active'))}.`
        : `${formatPlanningCount(readyStoriesInActiveSessionsCount, t('story_is_already_in_an_active_session'), t('stories_are_already_in_active_sessions'))}.`
      : t('no_ready_stories_are_in_an_active')
  const selectedStoriesInActiveSessions = useMemo(
    () =>
      selectedStories
        .map((story) => ({
          session: activePlanningStorySessionByStoryId[story.id],
          story,
        }))
        .filter((item) => Boolean(item.session)),
    [activePlanningStorySessionByStoryId, selectedStories],
  )
  const selectedStoriesConflictLabel =
    selectedStoriesInActiveSessions.length === 1
      ? t('1_story_is_already_in_an_active')
      : t('stories_are_already_in_active_sessions_2', { p1: selectedStoriesInActiveSessions.length })
  const planningSessionsWithEstimateCount = useMemo(
    () => planningSessions.filter((session) => (planningSessionProgressById[session.id]?.estimated ?? 0) > 0).length,
    [planningSessionProgressById, planningSessions],
  )
  const planningSessionsWithPendingCount = useMemo(
    () =>
      planningSessions.filter((session) => {
        const progress = planningSessionProgressById[session.id]
        return (progress?.pending ?? 0) > 0 || (progress?.voting ?? 0) > 0
      }).length,
    [planningSessionProgressById, planningSessions],
  )
  const planningSessionsWithSkippedCount = useMemo(
    () => planningSessions.filter((session) => (planningSessionProgressById[session.id]?.skipped ?? 0) > 0).length,
    [planningSessionProgressById, planningSessions],
  )
  const canCreatePlanningSession =
    canManageSelectedProject &&
    readyStories.length > 0 &&
    selectedStoryIds.length > 0 &&
    selectedStoriesInActiveSessions.length === 0
  const hasPlanningSessions = planningSessions.length > 0
  const hasActivePlanningSessionFilters =
    planningSessionStatusFilter !== 'all' ||
    planningSessionScaleFilter !== 'all' ||
    planningSessionStoryFilter !== 'all' ||
    planningSessionSearch.trim().length > 0
  const planningReadinessItems = useMemo(
    () => [
      {
        label: t('project'),
        value: selectedProject?.name ?? t('select_a_project'),
        isReady: Boolean(selectedProject),
      },
      {
        label: t('permission'),
        value: canManageSelectedProject
          ? t('you_can_create_sessions')
          : selectedProject
            ? t('view_only_access')
            : t('waiting_for_a_project'),
        isReady: canManageSelectedProject,
      },
      {
        label: t('stories'),
        value:
          selectedStoryIds.length > 0
            ? t('selected_count', { count: selectedStoryIds.length })
            : readyStories.length > 0
              ? t('select_ready_stories')
              : t('no_ready_stories'),
        isReady: selectedStoryIds.length > 0,
      },
      {
        label: t('overlap'),
        value:
          selectedStoryIds.length === 0
            ? t('waiting_for_a_selection')
            : selectedStoriesInActiveSessions.length > 0
              ? selectedStoriesConflictLabel
              : t('no_overlap_with_active_sessions'),
        isReady: selectedStoryIds.length > 0 && selectedStoriesInActiveSessions.length === 0,
      },
    ],
    [
      t,
      canManageSelectedProject,
      readyStories.length,
      selectedProject,
      selectedStoriesConflictLabel,
      selectedStoriesInActiveSessions.length,
      selectedStoryIds.length,
    ],
  )
  const planningCreateHint = canCreatePlanningSession
    ? selectedStoriesInActiveSessions.length > 0
      ? t('some_selected_stories_are_already_in_an')
      : t('everything_is_ready_to_open_the_session')
    : !selectedProject
      ? t('select_a_project_to_load_stories_and')
      : !canManageSelectedProject
        ? t('you_can_view_sessions_in_this_project')
        : readyStories.length === 0
          ? t('mark_stories_in_this_project_as_ready')
          : selectedStoriesInActiveSessions.length > 0
            ? t('remove_stories_that_are_already_in_an')
          : t('select_at_least_one_story_to_create')
  const dashboardNextAction = useMemo(() => {
    if (primaryActivePlanningSession && selectedProjectId) {
      return {
        tone: 'live',
        label: t('active_session'),
        title: primaryActivePlanningSession.name,
        description: t('this_project_has_a_session_in_progress'),
        primaryText: t('continue_session'),
        primaryTo: `/projetos/${selectedProjectId}/roda/${primaryActivePlanningSession.id}`,
        secondaryText: latestCompletedPlanningSession ? t('view_latest_result') : '',
        secondaryTo: latestCompletedPlanningSession
          ? `/projetos/${selectedProjectId}/roda/${latestCompletedPlanningSession.id}`
          : '',
      }
    }

    if (!selectedProject) {
      return {
        tone: 'setup',
        label: t('first_step'),
        title: t('choose_or_create_a_project'),
        description: t('planning_poker_requires_a_project_with_stories'),
        primaryText: t('manage_projects'),
        primaryTo: '/projetos',
        secondaryText: '',
        secondaryTo: '',
      }
    }

    if (!canManageSelectedProject) {
      return {
        tone: 'readonly',
        label: t('view_only'),
        title: t('you_can_follow_this_project'),
        description: t('only_project_owners_and_administrators_can_create'),
        primaryText: t('open_project'),
        primaryTo: `/projetos/${selectedProjectId}`,
        secondaryText: latestCompletedPlanningSession ? t('browse_history') : '',
        secondaryTo: latestCompletedPlanningSession
          ? `/projetos/${selectedProjectId}/roda/${latestCompletedPlanningSession.id}`
          : '',
      }
    }

    if (readyStories.length === 0) {
      return {
        tone: 'setup',
        label: t('preparation'),
        title: t('prepare_stories_for_estimation'),
        description: t('open_the_project_and_mark_stories_as'),
        primaryText: t('open_project'),
        primaryTo: `/projetos/${selectedProjectId}`,
        secondaryText: '',
        secondaryTo: '',
      }
    }

    if (selectedStoryIds.length === 0) {
      return {
        tone: 'select',
        label: t('selection'),
        title: t('choose_stories_for_the_session'),
        description: t('select_one_or_more_ready_stories_in'),
        primaryText: '',
        primaryTo: '',
        secondaryText: '',
        secondaryTo: '',
      }
    }

    return {
      tone: 'ready',
      label: t('ready'),
      title: t('ready_to_create_a_session'),
      description: t('review_the_summary_confirm_the_rules_and'),
      primaryText: '',
      primaryTo: '',
      secondaryText: '',
      secondaryTo: '',
    }
  }, [
      t,
    canManageSelectedProject,
    latestCompletedPlanningSession,
    primaryActivePlanningSession,
    readyStories.length,
    selectedProject,
    selectedProjectId,
    selectedStoryIds.length,
  ])

  const openPlanningSessionByCode = useCallback(
    async (rawCode, { isAutomatic = false } = {}) => {
      if (!isAutomatic) {
        setMessage('')
      }

      const safeInviteCode = normalizeInviteCode(rawCode)
      if (!safeInviteCode) {
        setMessage('enter_the_room_code_to_join_the')
        setAccessRequestCode('')
        setAccessRequestFeedback('')
        return false
      }

      if (!userId) {
        setMessage('sign_in_to_access_planning_poker')
        return false
      }

      setInviteCode(safeInviteCode)
      setIsSearching(true)

      const response = await getPlanningPokerSessionByInviteCode({
        inviteCode: safeInviteCode,
        userId,
      })

      setIsSearching(false)

      if (!response.success || !response.data) {
        setAccessRequestCode(safeInviteCode)
        setAccessRequestFeedback('')
        setMessage(
          isAutomatic
            ? 'could_not_open_this_invite_automatically_check'
            : 'no_accessible_session_was_found_for_that',
        )
        return false
      }

      setAccessRequestCode('')
      setAccessRequestFeedback('')
      const path = `/projetos/${response.data.project_id}/roda/${response.data.id}`
      navigate(preview ? localizeHref(path, currentLanguage.current) : path)
      return true
    },
    [navigate, preview, userId],
  )

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setIsLoadingProjects(true)
    const response = await listProjects({ userId })
    setIsLoadingProjects(false)

    if (!response.success) {
      setProjects([])
      setSelectedProjectId('')
      setMessage('could_not_load_projects_right_now')
      return
    }

    const nextProjects = response.data ?? []
    const requestedProjectIsAvailable = nextProjects.some((project) => project.id === projectIdFromUrl)
    const fallbackProjectId = nextProjects[0]?.id ?? ''
    const nextSelectedProjectId = requestedProjectIsAvailable ? projectIdFromUrl : fallbackProjectId

    setProjects(nextProjects)
    setSelectedProjectId((current) =>
      nextProjects.some((project) => project.id === current) ? current : nextSelectedProjectId,
    )
  }, [projectIdFromUrl, userId])

  const loadSelectedProjectContext = useCallback(async () => {
    if (!userId || !selectedProjectId) {
      setCanManageSelectedProject(false)
      setTeams([])
      setReadyStories([])
      setSelectedStoryIds([])
      setPlanningSessions([])
      setPlanningSessionStoriesBySession({})
      return
    }

    setIsLoadingProjectContext(true)
    const [manageResponse, teamsResponse, readyStoriesResponse, sessionsResponse] = await Promise.all([
      checkCanManageProject({ projectId: selectedProjectId, userId }),
      listTeamsByProject({ projectId: selectedProjectId, userId }),
      listStoryHistoryGroups({
        userId,
        projectFilter: 'project',
        projectId: selectedProjectId,
        estimationStatus: 'ready_for_estimation',
        page: 1,
        pageSize: 50,
      }),
      listPlanningPokerSessionsByProject({ projectId: selectedProjectId, userId }),
    ])

    setCanManageSelectedProject(manageResponse.success ? Boolean(manageResponse.data) : false)
    setTeams(teamsResponse.success ? (teamsResponse.data ?? []) : [])

    if (readyStoriesResponse.success) {
      const nextReadyStories = readyStoriesResponse.data ?? []
      const validStoryIds = new Set(nextReadyStories.map((story) => story.id))
      setReadyStories(nextReadyStories)
      setSelectedStoryIds((current) => current.filter((storyId) => validStoryIds.has(storyId)))
    } else {
      setReadyStories([])
      setSelectedStoryIds([])
    }

    if (sessionsResponse.success) {
      const nextSessions = sessionsResponse.data ?? []
      setPlanningSessions(nextSessions)

      if (nextSessions.length > 0) {
        const summariesResponse = await listPlanningPokerSessionStorySummaries({
          sessionIds: nextSessions.map((session) => session.id),
          userId,
        })

        if (summariesResponse.success) {
          const nextStoriesBySession = (summariesResponse.data ?? []).reduce((storiesBySession, story) => {
            if (!storiesBySession[story.session_id]) {
              storiesBySession[story.session_id] = []
            }

            storiesBySession[story.session_id].push(story)
            return storiesBySession
          }, {})

          setPlanningSessionStoriesBySession(nextStoriesBySession)
        } else {
          setPlanningSessionStoriesBySession({})
        }
      } else {
        setPlanningSessionStoriesBySession({})
      }
    } else {
      setPlanningSessions([])
      setPlanningSessionStoriesBySession({})
      setPlanningMessage('could_not_load_planning_poker_sessions_right')
    }

    setIsLoadingProjectContext(false)
  }, [selectedProjectId, userId])

  const loadAccessiblePlanningSessions = useCallback(async () => {
    if (!userId || projects.length === 0) {
      setAccessiblePlanningSessions([])
      setAccessiblePlanningStoriesBySession({})
      return
    }

    setIsLoadingAccessiblePlanningSessions(true)

    const sessionResponses = await Promise.all(
      projects.map(async (project) => {
        const response = await listPlanningPokerSessionsByProject({ projectId: project.id, userId })
        return {
          project,
          response,
        }
      }),
    )

    const nextSessions = sessionResponses
      .flatMap(({ project, response }) =>
        response.success
          ? (response.data ?? []).map((session) => ({
              ...session,
              projectName: project.name,
            }))
          : [],
      )
      .sort((a, b) => {
        const weightDiff = getPlanningSessionSortWeight(a.status) - getPlanningSessionSortWeight(b.status)
        if (weightDiff !== 0) return weightDiff

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    setAccessiblePlanningSessions(nextSessions)

    if (nextSessions.length === 0) {
      setAccessiblePlanningStoriesBySession({})
      setIsLoadingAccessiblePlanningSessions(false)
      return
    }

    const summariesResponse = await listPlanningPokerSessionStorySummaries({
      sessionIds: nextSessions.map((session) => session.id),
      userId,
    })

    if (summariesResponse.success) {
      const nextStoriesBySession = (summariesResponse.data ?? []).reduce((storiesBySession, story) => {
        if (!storiesBySession[story.session_id]) {
          storiesBySession[story.session_id] = []
        }

        storiesBySession[story.session_id].push(story)
        return storiesBySession
      }, {})

      setAccessiblePlanningStoriesBySession(nextStoriesBySession)
    } else {
      setAccessiblePlanningStoriesBySession({})
    }

    setIsLoadingAccessiblePlanningSessions(false)
  }, [projects, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjects()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjects])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadSelectedProjectContext()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadSelectedProjectContext])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadAccessiblePlanningSessions()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadAccessiblePlanningSessions])

  useEffect(() => {
    if (!codeFromUrl || !userId || autoJoinCodeAttemptedRef.current === codeFromUrl || isSearching) return

    const timerId = window.setTimeout(() => {
      autoJoinCodeAttemptedRef.current = codeFromUrl
      setMessage('opening_planning_poker_invite')
      openPlanningSessionByCode(codeFromUrl, { isAutomatic: true })
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [codeFromUrl, isSearching, openPlanningSessionByCode, userId])

  useEffect(() => {
    const requestedStoryIds = Array.from(
      new Set([...storyIdsFromUrl, storyIdFromUrl].filter(Boolean)),
    )
    if (requestedStoryIds.length === 0 || !selectedProjectId || isLoadingProjectContext) return

    const timerId = window.setTimeout(() => {
      const readyStoryIds = new Set(readyStories.map((story) => story.id))
      const freeReadyStoryIds = new Set(readyStoriesWithoutActiveSession.map((story) => story.id))
      const availableStoryIds = requestedStoryIds.filter((storyId) => freeReadyStoryIds.has(storyId))
      const blockedStoryCount = requestedStoryIds.filter(
        (storyId) => readyStoryIds.has(storyId) && !freeReadyStoryIds.has(storyId),
      ).length

      if (availableStoryIds.length === 0) {
        if (readyStories.length > 0) {
          setPlanningMessage(
            blockedStoryCount > 0
              ? 'the_stories_selected_in_the_project_are'
              : 'the_stories_selected_in_the_project_are_2',
          )
        }
        return
      }

      setSelectedStoryIds((current) =>
        Array.from(new Set([...availableStoryIds, ...current])),
      )
      setReadyStorySearch('')
      setHideActiveSessionStories(false)
      setPlanningMessage(
        blockedStoryCount > 0
          ? { key: 'selected_available_stories_were_already_in_active', values: { p1: availableStoryIds.length, p2: blockedStoryCount } }
          : availableStoryIds.length === 1
            ? 'story_selected_for_the_new_session'
            : { key: 'stories_selected_for_the_new_session', values: { p1: availableStoryIds.length } },
      )
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [
    isLoadingProjectContext,
    readyStories,
    readyStoriesWithoutActiveSession,
    selectedProjectId,
    storyIdFromUrl,
    storyIdsFromUrl,
  ])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: t('planning_poker'),
      title: t('collaborative_estimation'),
      pills: [
        { text: planningSessionsLabel },
        { text: readyStoriesLabel },
        { text: selectedProject?.name ?? t('choose_a_project') },
      ],
    })

    return () => setTopbarStatus(null)
  }, [t, planningSessionsLabel, readyStoriesLabel, selectedProject?.name, setTopbarStatus])

  function handleProjectSelection(projectId) {
    setSelectedProjectId(projectId)
    setPlanningTeamId('')
    setSelectedStoryIds([])

    const nextParams = new URLSearchParams(searchParams)
    if (projectId) {
      nextParams.set('projectId', projectId)
    } else {
      nextParams.delete('projectId')
    }
    nextParams.delete('storyId')
    nextParams.delete('storyIds')
    setSearchParams(nextParams, { replace: true })
  }

  function handleClearPlanningSessionFilters() {
    setPlanningSessionStatusFilter('all')
    setPlanningSessionScaleFilter('all')
    setPlanningSessionStoryFilter('all')
    setPlanningSessionSearch('')
  }

  function handleClearAccessiblePlanningFilters() {
    setAccessiblePlanningStatusFilter('all')
    setAccessiblePlanningSearch('')
  }

  function handleTogglePlanningStory(storyId) {
    setPlanningMessage('')
    if (
      !selectedStoryIds.includes(storyId) &&
      activePlanningStorySessionByStoryId[storyId]
    ) {
      setPlanningMessage('this_story_is_already_in_an_active')
      return
    }

    setSelectedStoryIds((current) =>
      current.includes(storyId)
        ? current.filter((currentStoryId) => currentStoryId !== storyId)
        : [...current, storyId],
    )
  }

  function handleSelectVisibleStories() {
    setPlanningMessage('')
    const visibleStoryIds = visibleReadyStoriesWithoutActiveSession.map((story) => story.id)
    setSelectedStoryIds((current) => Array.from(new Set([...current, ...visibleStoryIds])))
    setPlanningMessage(
      visibleStoryIds.length === 0
        ? 'no_visible_stories_are_available_to_select'
        : 'selected_visible_stories_available_for_planning_poker',
    )
  }

  function handleSelectAvailableStories() {
    setPlanningMessage('')
    const availableStoryIds = readyStoriesWithoutActiveSession.map((story) => story.id)
    setSelectedStoryIds((current) => Array.from(new Set([...current, ...availableStoryIds])))
    setPlanningMessage(
      availableStoryIds.length === 0
        ? 'no_available_stories_to_select'
        : 'selected_available_project_stories_for_planning_poker',
    )
  }

  function handleSelectAllReadyStories() {
    setPlanningMessage('')
    const availableStoryIds = readyStoriesWithoutActiveSession.map((story) => story.id)
    setSelectedStoryIds(availableStoryIds)
    setPlanningMessage(
      readyStoriesInActiveSessionsCount > 0
        ? 'selected_available_stories_stories_in_active_sessions'
        : 'all_ready_stories_were_selected_for_planning',
    )
  }

  function handleClearStorySelection() {
    setPlanningMessage('')
    setSelectedStoryIds([])
  }

  function handleRemovePlanningStory(storyId) {
    setPlanningMessage('')
    setSelectedStoryIds((current) => current.filter((currentStoryId) => currentStoryId !== storyId))
  }

  async function handleJoinByCode(event) {
    event.preventDefault()
    await openPlanningSessionByCode(inviteCode)
  }

  async function handleCopyAccessRequestMessage() {
    if (!accessRequestCode) return

    setAccessRequestFeedback('')
    try {
      await copyTextToClipboard(accessRequestMessage)
      setAccessRequestFeedback('message_copied_for_the_facilitator')
    } catch {
      setAccessRequestFeedback('could_not_copy_automatically_use_the_message')
    }
  }

  async function handleCreatePlanningSession(event) {
    event.preventDefault()
    setPlanningMessage('')

    if (!selectedProjectId) {
      setPlanningMessage('select_a_project_to_create_a_planning')
      return
    }

    if (!canManageSelectedProject) {
      setPlanningMessage('only_owners_and_administrators_can_create_a')
      return
    }

    if (selectedStoryIds.length === 0) {
      setPlanningMessage('select_at_least_one_story_ready_to')
      return
    }

    if (selectedStoriesInActiveSessions.length > 0) {
      setPlanningMessage('remove_stories_that_are_already_in_active')
      return
    }

    setIsCreatingPlanningSession(true)
    const response = await createPlanningPokerSession({
      projectId: selectedProjectId,
      name: planningSessionName || `Roda da Fogueira - ${selectedProject?.name ?? t('project')}`,
      userStoryIds: selectedStoryIds,
      teamId: planningTeamId || null,
      scoringScale: planningScoringScale,
      voteTimeLimitSeconds: planningVoteTimeLimit,
      allowRevote: planningAllowRevote,
      revealVotesAfterAll: planningRevealAfterAll,
      allowAbstention: planningAllowAbstention,
      allowObservers: planningAllowObservers,
      userId,
    })
    setIsCreatingPlanningSession(false)

    if (!response.success || !response.data) {
      setPlanningMessage('could_not_create_a_planning_poker_session')
      return
    }

    setPlanningSessionName('')
    setPlanningTeamId('')
    setPlanningScoringScale('fibonacci')
    setSelectedStoryIds([])
    setPlanningMessage('planning_poker_session_created')
    const path = `/projetos/${selectedProjectId}/roda/${response.data.id}`
    navigate(preview ? localizeHref(path, currentLanguage.current) : path)
  }

  async function handleCopySessionInvite(session, copyType) {
    setCopyMessage('')
    setCopyFeedbackBySessionId((current) => ({ ...current, [session?.id]: '' }))
    const safeInviteCode = normalizeInviteCode(session?.invite_code)

    if (!safeInviteCode) {
      setCopyMessage('this_session_has_no_invite_code_yet')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session?.id]: 'invite_unavailable' }))
      return
    }

    const textToCopy = copyType === 'link' ? buildPlanningInviteUrl(safeInviteCode, preview ? language : undefined) : safeInviteCode

    try {
      await copyTextToClipboard(textToCopy)
      const nextMessage = copyType === 'link' ? 'link_copied' : 'code_copied'
      setCopyMessage(copyType === 'link' ? 'link_copied_send_it_to_people_who' : 'code_copied_2')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: nextMessage }))
    } catch {
      setCopyMessage('could_not_copy_the_invite_right_now')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: 'copy_failed' }))
    }
  }

  async function handleCopySessionSummary(session, progress) {
    setCopyMessage('')
    setCopyFeedbackBySessionId((current) => ({ ...current, [session?.id]: '' }))
    if (!session) return

    try {
      await copyTextToClipboard(
        buildPlanningSessionSummaryMarkdown({
          progress,
          projectName: selectedProject?.name ?? '',
          session,
          stories: planningSessionStoriesBySession[session.id] ?? [],
        }),
      )
      setCopyMessage('summary_copied')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: 'summary_copied_2' }))
    } catch {
      setCopyMessage('could_not_copy_the_summary_right_now')
      setCopyFeedbackBySessionId((current) => ({ ...current, [session.id]: 'copy_failed' }))
    }
  }

  return (
    <div className="projects-page planning-poker-join planning-poker-dashboard">
      <section className="panel projects-page__hero planning-poker-join__hero">
        <div className="planning-poker-join__copy">
          <p className="projects-page__eyebrow">{t('planning_poker')}</p>
          <h1>{t('collaborative_estimation')}</h1>
          <p>
            {t('create_sessions_by_project_select_stories_ready')}
          </p>
        </div>

        <form className="planning-poker-join__form" onSubmit={handleJoinByCode}>
          <label className="projects-page__field">
            <span>{t('join_with_a_code')}</span>
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => {
                const nextCode = normalizeInviteCode(event.target.value)
                setInviteCode(nextCode)
                if (accessRequestCode && nextCode !== accessRequestCode) {
                  setAccessRequestCode('')
                  setAccessRequestFeedback('')
                }
              }}
              placeholder={t('e_g_136ce7ab2e')}
              autoComplete="off"
              className="planning-poker-join__code-input"
              disabled={isSearching}
            />
          </label>

          <button type="submit" className="btn btn-secondary" disabled={isSearching}>
            {isSearching ? t('finding_session') : t('join_session')}
          </button>

          <p className="planning-poker-join__access-note">
            {t('invite_links_open_the_room_automatically_when')}
          </p>

          {message ? <p className="projects-page__message" role="status">{formatNotice(t, message)}</p> : null}
        </form>
      </section>

      {accessRequestCode ? (
        <section className="panel planning-poker-join__access-request" aria-label={t('planning_poker_access_request')}>
          <div className="planning-poker-join__access-request-copy">
            <p className="projects-page__eyebrow">{t('access_pending')}</p>
            <h2>{t('request_access_from_the_facilitator')}</h2>
            <p>
              {t('the_invite_identifies_the_session_to_join')}
            </p>
          </div>
          <div className="planning-poker-join__access-request-card">
            <span>{t('code_received')}</span>
            <strong>{accessRequestCode}</strong>
            <p>{user?.email ? t('your_account_email', { p1: user.email }) : t('use_the_email_registered_with_prodforge')}</p>
          </div>
          <div className="planning-poker-join__access-request-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={handleCopyAccessRequestMessage}>
              {t('copy_access_request')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setAccessRequestCode('')
                setAccessRequestFeedback('')
                setMessage('')
              }}
            >
              {t('dismiss_notice')}
            </button>
            {accessRequestFeedback ? <p className="projects-page__message" role="status">{formatNotice(t, accessRequestFeedback)}</p> : null}
          </div>
          <details className="planning-poker-access-request__manual">
            <summary>{t('copy_manually')}</summary>
            <label>
              <span>{t('message_to_the_facilitator')}</span>
              <textarea
                readOnly
                rows={5}
                value={accessRequestMessage}
                aria-label={t('access_request_message_for_manual_copying')}
                onFocus={(event) => event.target.select()}
              />
            </label>
          </details>
        </section>
      ) : null}

      <section className="planning-poker-dashboard__overview" aria-label={t('planning_poker_overview')}>
        {dashboardOverviewCards.map((card) => (
          <article key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section
        className={`planning-poker-dashboard__next-action planning-poker-dashboard__next-action--${dashboardNextAction.tone}`}
        aria-label={t('recommended_next_action')}
      >
        <div>
          <p className="projects-page__eyebrow">{dashboardNextAction.label}</p>
          <h2>{dashboardNextAction.title}</h2>
          <p>{dashboardNextAction.description}</p>
        </div>
        <div className="planning-poker-dashboard__next-actions">
          {dashboardNextAction.primaryTo ? (
            <Link className="btn btn-primary btn-small" to={dashboardNextAction.primaryTo}>
              {dashboardNextAction.primaryText}
            </Link>
          ) : null}
          {dashboardNextAction.secondaryTo ? (
            <Link className="btn btn-secondary btn-small" to={dashboardNextAction.secondaryTo}>
              {dashboardNextAction.secondaryText}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="panel planning-poker-dashboard__accessible" aria-label={t('sessions_accessible_to_your_account')}>
        <div className="planning-poker-dashboard__accessible-header">
          <div>
            <p className="projects-page__eyebrow">{t('my_participation')}</p>
            <h2>{t('accessible_sessions')}</h2>
            <p>
              {t('the_facilitator_adds_email_addresses_to_the')}
            </p>
          </div>
          <div className="planning-poker-dashboard__accessible-metrics" aria-label={t('accessible_sessions_overview')}>
            <span>{accessiblePlanningSessionsLabel}</span>
            <strong>{t('active_count', { count: accessibleActivePlanningSessionsCount })}</strong>
          </div>
        </div>

        <div className="planning-poker-dashboard__access-steps" aria-label={t('how_invite_access_works')}>
          <article>
            <span>1</span>
            <strong>{t('facilitator_grants_access')}</strong>
            <p>{t('your_email_must_be_added_to_the')}</p>
          </article>
          <article>
            <span>2</span>
            <strong>{t('invite_opens_the_room')}</strong>
            <p>{t('the_link_or_code_opens_the_room')}</p>
          </article>
          <article>
            <span>3</span>
            <strong>{t('participant_follows_the_session')}</strong>
            <p>{t('sessions_you_can_access_appear_here')}</p>
          </article>
        </div>

        {isLoadingAccessiblePlanningSessions ? (
          <p className="projects-page__state">{t('loading_accessible_sessions')}</p>
        ) : null}

        {canFilterAccessiblePlanningSessions ? (
          <div className="planning-poker-dashboard__accessible-tools" aria-label={t('accessible_session_filters')}>
            <div className="planning-poker-dashboard__quick-filters">
              {accessiblePlanningFilterOptions.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={accessiblePlanningStatusFilter === filter.value ? 'is-active' : ''}
                  onClick={() => setAccessiblePlanningStatusFilter(filter.value)}
                  disabled={filter.count === 0}
                >
                  <span>{filter.label}</span>
                  <strong>{filter.count}</strong>
                </button>
              ))}
            </div>

            <div className="planning-poker-dashboard__accessible-search">
              <label className="projects-page__field">
                <span>{t('search_my_sessions')}</span>
                <input
                  type="search"
                  value={accessiblePlanningSearch}
                  onChange={(event) => setAccessiblePlanningSearch(event.target.value)}
                  placeholder={t('name_project_code_or_story')}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleClearAccessiblePlanningFilters}
                disabled={!hasAccessiblePlanningFilters}
              >
                {t('clear_filters')}
              </button>
            </div>
          </div>
        ) : null}

        {hasNoAccessiblePlanningSessions ? (
          <div className="planning-poker-dashboard__accessible-empty">
            <strong>{t('no_accessible_sessions_yet')}</strong>
            <p>
              {t('ask_the_facilitator_to_add_your_email')}
            </p>
          </div>
        ) : null}

        {hasFilteredAccessiblePlanningNoResults ? (
          <div className="planning-poker-dashboard__accessible-empty">
            <strong>{t('no_sessions_found')}</strong>
            <p>{t('clear_the_filters_to_see_other_sessions')}</p>
            <button type="button" className="btn btn-secondary btn-small" onClick={handleClearAccessiblePlanningFilters}>
              {t('clear_filters')}
            </button>
          </div>
        ) : null}

        {hasAccessiblePlanningPreview ? (
          <div className="planning-poker-dashboard__accessible-list">
            {accessiblePlanningSessionsPreview.map((session) => {
              const isLiveSession = LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
              const progress = accessiblePlanningSessionProgressById[session.id] ?? {
                label: t('no_linked_stories'),
                progressPercent: 0,
              }

              return (
                <article
                  key={session.id}
                  className={`planning-poker-dashboard__accessible-card ${
                    isLiveSession ? 'planning-poker-dashboard__accessible-card--live' : ''
                  }`.trim()}
                >
                  <div>
                    <span>{session.projectName ?? t('untitled_project')}</span>
                    <h3>{session.name}</h3>
                    <p>
                      {getPlanningSessionStatusLabel(session.status, t)} · {getPlanningScoringScaleLabel(session.scoring_scale, t)}
                    </p>
                  </div>
                  <div className="planning-poker-dashboard__accessible-progress" aria-label={t('progress_for', { p1: session.name })}>
                    <span>{progress.label}</span>
                    <strong>{progress.progressPercent}%</strong>
                  </div>
                  <Link className="btn btn-secondary btn-small" to={`/projetos/${session.project_id}/roda/${session.id}`}>
                    {isLiveSession ? t('join_session') : t('view_session')}
                  </Link>
                </article>
              )
            })}
          </div>
        ) : null}

        {shouldShowAccessiblePlanningLimit ? (
          <p className="projects-page__state">
            {t('showing')}{" "}{accessiblePlanningSessionsPreview.length}{" "}{t('of')}{' '}
            {formatPlanningCount(filteredAccessiblePlanningSessions.length, t('accessible_session'), t('accessible_sessions'))}.
          </p>
        ) : null}
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" aria-label={t('create_planning_poker_session')}>
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">{t('new_session')}</p>
            <h2>{t('create_session')}</h2>
            <p>{t('choose_a_project_ready_stories_and_voting')}</p>
          </div>

          {isLoadingProjects ? <p className="projects-page__state">{t('loading_projects')}</p> : null}

          <form className="project-detail-page__campfire-form" onSubmit={handleCreatePlanningSession}>
            <label className="projects-page__field">
              <span>{t('project')}</span>
              <select
                value={selectedProjectId}
                onChange={(event) => handleProjectSelection(event.target.value)}
                disabled={isLoadingProjects || isCreatingPlanningSession || projects.length === 0}
              >
                {projects.length === 0 ? <option value="">{t('no_projects_available')}</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="project-detail-page__campfire-grid">
              <label className="projects-page__field">
                <span>{t('session_name')}</span>
                <input
                  type="text"
                  value={planningSessionName}
                  onChange={(event) => setPlanningSessionName(event.target.value)}
                  placeholder={`Roda da Fogueira - ${selectedProject?.name ?? t('project')}`}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                />
              </label>

              <label className="projects-page__field">
                <span>{t('team')}</span>
                <select
                  value={planningTeamId}
                  onChange={(event) => setPlanningTeamId(event.target.value)}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                >
                  <option value="">{t('entire_project')}</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="projects-page__field">
                <span>{t('scale')}</span>
                <select
                  value={planningScoringScale}
                  onChange={(event) => setPlanningScoringScale(event.target.value)}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                >
                  {PLANNING_SCORING_SCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="projects-page__field">
                <span>{t('voting_time')}</span>
                <select
                  value={planningVoteTimeLimit}
                  onChange={(event) => setPlanningVoteTimeLimit(Number(event.target.value))}
                  disabled={isCreatingPlanningSession || !selectedProjectId}
                >
                  {PLANNING_TIMER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <details className="planning-poker-dashboard__advanced">
              <summary>
                <span>{t('advanced_rules')}</span>
                <strong>{planningRuleSummary.length}{" "}{t('rules_configured')}</strong>
              </summary>
              <div className="project-detail-page__campfire-options" aria-label={t('session_settings')}>
                <label>
                  <input
                    type="checkbox"
                    checked={planningAllowRevote}
                    onChange={(event) => setPlanningAllowRevote(event.target.checked)}
                    disabled={isCreatingPlanningSession}
                  />
                  <span>{t('allow_vote_changes')}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={planningRevealAfterAll}
                    onChange={(event) => setPlanningRevealAfterAll(event.target.checked)}
                    disabled={isCreatingPlanningSession}
                  />
                  <span>{t('reveal_after_everyone_votes')}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={planningAllowAbstention}
                    onChange={(event) => setPlanningAllowAbstention(event.target.checked)}
                    disabled={isCreatingPlanningSession}
                  />
                  <span>{t('allow_abstentions')}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={planningAllowObservers}
                    onChange={(event) => setPlanningAllowObservers(event.target.checked)}
                    disabled={isCreatingPlanningSession}
                  />
                  <span>{t('allow_observers')}</span>
                </label>
              </div>
            </details>

            <div className="project-detail-page__campfire-stories">
              <div>
                <h3>{t('stories_ready_to_estimate')}</h3>
                <p>{selectedStoryIds.length}{" "}{t('selected')}{" "}{readyStoriesLabel}{" "}{t('available')}</p>
              </div>

              {isLoadingProjectContext ? (
                <p className="projects-page__state">{t('loading_session_context')}</p>
              ) : null}

              {!isLoadingProjectContext && selectedProjectId && readyStories.length === 0 ? (
                <div className="projects-page__empty">
                  <h3>{t('no_stories_ready_to_estimate')}</h3>
                  <p>{t('mark_project_stories_as_ready_to_estimate')}</p>
                  <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}`}>
                    {t('prepare_stories')}
                  </Link>
                </div>
              ) : null}

              {readyStories.length > 0 ? (
                <>
                  <div className="project-detail-page__campfire-story-tools">
                    <label className="projects-page__field">
                      <span>{t('search_stories')}</span>
                      <input
                        type="search"
                        value={readyStorySearch}
                        onChange={(event) => setReadyStorySearch(event.target.value)}
                        placeholder={t('title_or_context')}
                        disabled={isCreatingPlanningSession}
                      />
                    </label>
                    <div className="project-detail-page__campfire-story-actions">
                      <span>{visibleReadyStoriesLabel}</span>
                      <button
                        type="button"
                        className={`btn btn-ghost btn-small ${hideActiveSessionStories ? 'is-active' : ''}`.trim()}
                        onClick={() => setHideActiveSessionStories((current) => !current)}
                        disabled={isCreatingPlanningSession || readyStoriesInActiveSessionsCount === 0}
                      >
                        {hideActiveSessionStories ? t('show_all') : t('hide_stories_in_active_sessions')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectVisibleStories}
                        disabled={isCreatingPlanningSession || visibleReadyStoriesWithoutActiveSession.length === 0}
                      >
                        {t('select_visible_available_stories')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectAvailableStories}
                        disabled={isCreatingPlanningSession || readyStoriesWithoutActiveSession.length === 0}
                      >
                        {t('select_available_stories')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleSelectAllReadyStories}
                        disabled={isCreatingPlanningSession || readyStoriesWithoutActiveSession.length === 0}
                      >
                        {t('select_all_available_stories')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={handleClearStorySelection}
                        disabled={isCreatingPlanningSession || selectedStoryIds.length === 0}
                      >
                        {t('clear_selection')}
                      </button>
                    </div>
                  </div>
                  <p className="planning-poker-dashboard__story-filter-hint">{readyStoryFilterHint}</p>

                  {selectedStories.length > 0 ? (
                    <div
                      className="planning-poker-dashboard__selected-stories"
                      aria-label={t('stories_selected_for_planning_poker_2')}
                    >
                      <div className="planning-poker-dashboard__selected-stories-header">
                        <div>
                          <p className="projects-page__eyebrow">{t('current_selection')}</p>
                          <h3>{selectedStoriesPanelLabel}</h3>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={handleClearStorySelection}
                          disabled={isCreatingPlanningSession}
                        >
                          {t('clear_selection')}
                        </button>
                      </div>
                      {selectedStoriesInActiveSessions.length > 0 ? (
                        <div className="planning-poker-dashboard__selection-warning" role="status">
                          <div>
                            <strong>{selectedStoriesConflictLabel}</strong>
                            <p>
                              {t('remove_these_stories_from_the_selection_or')}
                            </p>
                          </div>
                          {selectedStoriesInActiveSessions[0]?.session ? (
                            <Link
                              className="btn btn-secondary btn-small"
                              to={`/projetos/${selectedProjectId}/roda/${selectedStoriesInActiveSessions[0].session.id}`}
                            >
                              {t('open_active_session')}
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="planning-poker-dashboard__selected-story-list">
                        {selectedStories.map((story) => {
                          const activeSession = activePlanningStorySessionByStoryId[story.id]

                          return (
                            <article
                              key={story.id}
                              className={`planning-poker-dashboard__selected-story ${
                                activeSession ? 'planning-poker-dashboard__selected-story--active-session' : ''
                              }`.trim()}
                            >
                              <div>
                                <strong>{story.title ?? t('untitled_story')}</strong>
                                <span>
                                  {activeSession
                                    ? t('in_an_active_session', { p1: activeSession.name })
                                    : formatPlanningDateTime(story.created_at, language)}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-small"
                                onClick={() => handleRemovePlanningStory(story.id)}
                                disabled={isCreatingPlanningSession}
                              >
                                {t('remove')}
                              </button>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {visibleReadyStories.length === 0 ? (
                    <div className="projects-page__empty">
                      <h3>
                        {hideActiveSessionStories && filteredReadyStories.length > 0
                          ? t('all_visible_stories_are_in_active_sessions')
                          : t('no_stories_found')}
                      </h3>
                      <p>
                        {hideActiveSessionStories && filteredReadyStories.length > 0
                          ? t('turn_off_the_filter_to_also_see')
                          : t('clear_the_search_to_see_other_ready')}
                      </p>
                      {hideActiveSessionStories && filteredReadyStories.length > 0 ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => setHideActiveSessionStories(false)}
                          disabled={isCreatingPlanningSession}
                        >
                          {t('show_all')}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="project-detail-page__campfire-story-list">
                      {visibleReadyStories.map((story) => {
                        const isSelected = selectedStoryIds.includes(story.id)
                        const activeSession = activePlanningStorySessionByStoryId[story.id]

                        return (
                          <label
                            key={story.id}
                            className={[
                              'project-detail-page__campfire-story-option',
                              isSelected ? 'project-detail-page__campfire-story-option--selected' : '',
                              activeSession ? 'project-detail-page__campfire-story-option--active-session' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePlanningStory(story.id)}
                              disabled={isCreatingPlanningSession || Boolean(activeSession)}
                            />
                            <span>
                              <strong>{story.title}</strong>
                              <small>{formatPlanningDateTime(story.created_at, language)}</small>
                              <em>{isSelected ? t('selected_2') : activeSession ? t('already_in_an_active_session') : t('ready_to_estimate')}</em>
                              {activeSession ? <small>{t('in_progress_2')}{" "}{activeSession.name}</small> : null}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="project-detail-page__campfire-create-summary" aria-label={t('review_before_creating_a_session')}>
              <div>
                <p className="projects-page__eyebrow">{t('review')}</p>
                <h3>{t('session_summary')}</h3>
                <p>{t('review_the_details_before_opening_the_session')}</p>
              </div>

              <dl>
                <div>
                  <dt>{t('project')}</dt>
                  <dd>{selectedProject?.name ?? t('select_a_project')}</dd>
                </div>
                <div>
                  <dt>{t('team')}</dt>
                  <dd>{selectedTeam?.name ?? t('entire_project')}</dd>
                </div>
                <div>
                  <dt>{t('stories')}</dt>
                  <dd>{t('selected_count', { count: selectedStoryIds.length })}</dd>
                </div>
                <div>
                  <dt>{t('scale')}</dt>
                  <dd>{getPlanningScoringScaleLabel(planningScoringScale, t)}</dd>
                </div>
                <div>
                  <dt>{t('timer')}</dt>
                  <dd>{selectedTimerLabel}</dd>
                </div>
              </dl>

              <div className="project-detail-page__campfire-create-rules" aria-label={t('active_session_rules')}>
                {planningRuleSummary.map((rule) => (
                  <span key={rule}>{rule}</span>
                ))}
              </div>

              <ul className="project-detail-page__campfire-create-preview" hidden={!hasSelectedStoryPreview}>
                {selectedStoryPreview.map((story) => (
                  <li key={story.id}>{story.title}</li>
                ))}
                {remainingSelectedStoryLabel ? <li>{remainingSelectedStoryLabel}</li> : null}
              </ul>

              {!hasSelectedStoryPreview ? (
                <p className="projects-page__state">{t('select_at_least_one_story_ready_to')}</p>
              ) : null}
            </div>

            <div className="planning-poker-dashboard__readiness" aria-label={t('requirements_for_creating_a_session')}>
              <div>
                <p className="projects-page__eyebrow">{t('ready_to_create')}</p>
                <h3>{canCreatePlanningSession ? t('session_ready_to_open') : t('complete_the_requirements')}</h3>
                <p>{planningCreateHint}</p>
              </div>
              <ul>
                {planningReadinessItems.map((item) => (
                  <li key={item.label} className={item.isReady ? 'is-ready' : ''}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreatingPlanningSession || !canCreatePlanningSession}
            >
              {isCreatingPlanningSession ? t('creating_session') : t('create_planning_poker_session')}
            </button>
          </form>

          {!selectedProjectId && projects.length === 0 ? (
            <div className="projects-page__empty">
              <h3>{t('no_projects_yet')}</h3>
              <p>{t('create_a_project_to_use_planning_poker')}</p>
              <Link className="btn btn-secondary btn-small" to="/projetos">
                {t('create_project')}
              </Link>
            </div>
          ) : null}
          {selectedProjectId && !canManageSelectedProject ? (
            <div className="projects-page__empty">
              <h3>{t('view_only_mode_for_this_project')}</h3>
              <p>{t('you_can_view_this_project_s_sessions')}</p>
              <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}`}>
                {t('open_project')}
              </Link>
            </div>
          ) : null}
          {planningMessage ? <p className="projects-page__message" role="status">{formatNotice(t, planningMessage)}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label={t('planning_poker_history')}>
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">{t('history')}</p>
              <h2>{planningSessionsLabel}</h2>
              <p>{selectedProject ? t('sessions_for', { p1: selectedProject.name }) : t('choose_a_project_to_browse_its_sessions')}</p>
            </div>
          </div>

          {hasPlanningSessions ? (
            <>
              <div className="planning-poker-dashboard__quick-filters" aria-label={t('quick_session_filters')}>
                {planningSessionQuickFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={planningSessionStatusFilter === filter.value ? 'is-active' : ''}
                    onClick={() => setPlanningSessionStatusFilter(filter.value)}
                    disabled={isLoadingProjectContext}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>

              <div className="planning-poker-dashboard__quick-filters" aria-label={t('quick_story_filters')}>
                {[
                  { value: 'estimated_group', label: t('with_estimates'), count: planningSessionsWithEstimateCount },
                  { value: 'pending_group', label: t('with_pending_stories'), count: planningSessionsWithPendingCount },
                  { value: 'skipped_group', label: t('skipped'), count: planningSessionsWithSkippedCount },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={planningSessionStoryFilter === filter.value ? 'is-active' : ''}
                    onClick={() =>
                      setPlanningSessionStoryFilter((current) => (current === filter.value ? 'all' : filter.value))
                    }
                    disabled={isLoadingProjectContext || filter.count === 0}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>

              <div className="project-detail-page__campfire-filters" aria-label={t('planning_poker_session_filters')}>
                <label className="projects-page__field">
                  <span>{t('search_sessions')}</span>
                  <input
                    type="search"
                    value={planningSessionSearch}
                    onChange={(event) => setPlanningSessionSearch(event.target.value)}
                    placeholder={t('room_name_or_code')}
                    disabled={isLoadingProjectContext}
                  />
                </label>

                <label className="projects-page__field">
                  <span>{t('status')}</span>
                  <select
                    value={planningSessionStatusFilter}
                    onChange={(event) => setPlanningSessionStatusFilter(event.target.value)}
                    disabled={isLoadingProjectContext}
                  >
                    {PLANNING_SESSION_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="projects-page__field">
                  <span>{t('scale')}</span>
                  <select
                    value={planningSessionScaleFilter}
                    onChange={(event) => setPlanningSessionScaleFilter(event.target.value)}
                    disabled={isLoadingProjectContext}
                  >
                    {PLANNING_SCORING_SCALE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="project-detail-page__campfire-filter-summary">
                  <span>{formatPlanningCount(filteredPlanningSessions.length, t('session_found'), t('sessions_found'))}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={handleClearPlanningSessionFilters}
                    disabled={!hasActivePlanningSessionFilters || isLoadingProjectContext}
                  >
                    {t('clear_filters')}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {isLoadingProjectContext ? <p className="projects-page__state">{t('loading_sessions')}</p> : null}
          {!isLoadingProjectContext && selectedProjectId && !hasPlanningSessions ? (
            <div className="projects-page__empty">
              <h3>{t('no_sessions_yet')}</h3>
              <p>{t('create_a_planning_poker_session_with_stories')}</p>
              {readyStories.length === 0 ? (
                <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}`}>
                  {t('prepare_stories')}
                </Link>
              ) : null}
            </div>
          ) : null}
          {!isLoadingProjectContext && hasPlanningSessions && filteredPlanningSessions.length === 0 ? (
            <div className="projects-page__empty">
              <h3>{t('no_sessions_found')}</h3>
              <p>{t('change_the_filters_to_see_other_sessions')}</p>
            </div>
          ) : null}
          {copyMessage ? <p className="projects-page__message" role="status">{formatNotice(t, copyMessage)}</p> : null}

          <div className="project-detail-page__campfire-session-list">
            {filteredPlanningSessions.map((session) => {
              const isLiveSession = ['active', 'voting', 'revealed'].includes(session.status)
              const sessionStories = planningSessionStoriesBySession[session.id] ?? []
              const progress = planningSessionProgressById[session.id] ?? {
                estimated: 0,
                label: t('no_linked_stories'),
                pending: 0,
                progressPercent: 0,
                skipped: 0,
                total: 0,
                voting: 0,
              }
              const sessionStatusLabel = getPlanningSessionStatusLabel(session.status, t)
              const sessionActionLabel = isLiveSession
                ? t('continue_session')
                : session.status === 'completed'
                  ? t('view_result')
                  : t('open_room')
              const copyFeedback = copyFeedbackBySessionId[session.id]

              return (
                <article
                  key={session.id}
                  className={`project-detail-page__campfire-session ${
                    isLiveSession ? 'project-detail-page__campfire-session--live' : ''
                  }`.trim()}
                >
                  <div className="project-detail-page__campfire-session-content">
                    <div>
                      <div className="planning-poker-dashboard__session-title">
                        <h3>{session.name}</h3>
                        <span className={isLiveSession ? 'is-live' : ''}>{sessionStatusLabel}</span>
                      </div>
                      <p>
                        {t('code')}{" "}{session.invite_code} · {getPlanningScoringScaleLabel(session.scoring_scale, t)} ·{' '}
                        {formatPlanningTimerDuration(session.vote_time_limit_seconds, t)}
                      </p>
                    </div>

                    <div
                      className="project-detail-page__campfire-session-progress"
                      aria-label={t('progress_for_session', { p1: session.name })}
                    >
                      <div className="project-detail-page__campfire-session-progress-header">
                        <span>{progress.label}</span>
                        <strong>{progress.progressPercent}%</strong>
                      </div>
                      <div className="project-detail-page__campfire-session-progress-bar" aria-hidden="true">
                        <span style={{ width: `${progress.progressPercent}%` }} />
                      </div>
                      <div className="project-detail-page__campfire-session-progress-chips">
                        <span>{t('estimated_count', { count: progress.estimated })}</span>
                        <span>{formatPlanningCount(progress.voting, t('voting_2'), t('voting_2'))}</span>
                        <span>{t('pending_count', { count: progress.pending })}</span>
                        {progress.skipped > 0 ? (
                          <span>{t('skipped_count', { count: progress.skipped })}</span>
                        ) : null}
                      </div>
                    </div>

                    <details className="planning-poker-dashboard__session-stories">
                      <summary>
                        <span>{t('session_stories')}</span>
                        <strong>{progress.label}</strong>
                      </summary>
                      {sessionStories.length > 0 ? (
                        <div className="planning-poker-dashboard__session-story-list">
                          {sessionStories.map((story, index) => (
                            <div key={story.id} className="planning-poker-dashboard__session-story">
                              <div>
                                <strong>{story.user_story?.title ?? t('story', { p1: index + 1 })}</strong>
                                <span>{getPlanningStoryStatusLabel(story.status, t)}</span>
                              </div>
                              <em>{story.final_estimate ? t('final', { p1: story.final_estimate }) : t('no_final_estimate')}</em>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="projects-page__state">{t('no_stories_linked_to_this_session')}</p>
                      )}
                    </details>
                  </div>

                  <div className="project-detail-page__campfire-session-meta">
                    <span>{t('created_on')}{" "}{formatPlanningDateTime(session.created_at, language)}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCopySessionInvite(session, 'code')}
                    >
                      {t('copy_code')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCopySessionInvite(session, 'link')}
                    >
                      {t('copy_link_for_members')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCopySessionSummary(session, progress)}
                    >
                      {t('copy_summary')}
                    </button>
                    <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProjectId}/roda/${session.id}`}>
                      {sessionActionLabel}
                    </Link>
                    {copyFeedback ? <span className="planning-poker-dashboard__copy-feedback">{formatNotice(t, copyFeedback)}</span> : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PlanningPokerJoinPage
