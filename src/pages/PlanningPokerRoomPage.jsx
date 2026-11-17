import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useCopy, useLanguage } from '../i18n/context'
import { formatNotice } from '../i18n/formatNotice'
import Link from '../i18n/LocalizedLink'
import { localizeHref } from '../i18n/routes'
import { useAuth } from '../hooks/useAuth'
import { addProjectMemberByEmail, checkCanManageProject, getProjectById } from '../services/projectsService'
import {
  buildPlanningAccessRequestMessage,
  buildPlanningSessionSummaryMarkdown,
  formatPlanningTimerDuration,
  formatRemainingTime,
  getPlanningRoundStatusLabel as getRoundStatusLabel,
  getPlanningScoringScaleLabel as getScoringScaleLabel,
  getPlanningSessionProgress,
  getPlanningSessionStatusLabel as getSessionStatusLabel,
  getPlanningStoryStatusLabel as getStoryStatusLabel,
  isRoundTimerExpired,
} from '../utils/planningPokerUtils'
import { copyTextToClipboard } from '../utils/storyExport'
import {
  castPlanningPokerVote,
  completePlanningPokerSession,
  getPlanningPokerSession,
  joinPlanningPokerSession,
  listPlanningPokerParticipants,
  listPlanningPokerResults,
  listPlanningPokerRounds,
  listPlanningPokerSessionStories,
  listPlanningPokerVotes,
  listPlanningPokerVoteStatus,
  revealPlanningPokerRound,
  sealPlanningPokerEstimate,
  skipPlanningPokerStory,
  startPlanningPokerRound,
  subscribeToPlanningPokerSession,
} from '../services/planningPokerService'
import { sendPlanningPokerInviteEmail } from '../services/planningPokerInviteService'

const voteErrorKeys = new Map([
  ['Tempo de votação encerrado.', 'timed_out'],
  ['Esta rodada não está aberta para votação.', 'round_not_open'],
  ['Observadores não podem votar.', 'observer_cannot_vote'],
  ['Esta sessão não permite alterar o voto.', 'revote_disabled'],
  ['A revelação está configurada para acontecer somente após todos votarem.', 'reveal_requires_all'],
  ['Revele uma rodada antes de selar a estimativa.', 'reveal_before_sealing'],
  ['Apenas membros do projeto podem votar nesta sessão.', 'member_access_required'],
  ['Carta inválida para a escala desta sessão.', 'invalid_card'],
])

const inviteEmailErrorKeys = {
  INVITE_EMAIL_TIMEOUT: 'invite_timed_out',
  UNAUTHENTICATED: 'invite_sign_in_again',
}

function getVoteLabel(vote, t) {
  return vote.vote_kind === 'abstain' ? t('abstain') : vote.vote_value
}

function formatDateTime(value, language) {
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

function getParticipantLabel(participant, currentUserId, index, t) {
  if (!participant) return '-'
  if (participant.user_id === currentUserId) return t('you')
  return participant.display_name || t('team_member', { p1: index + 1 })
}

function getMedian(values) {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function formatNumber(value, language = 'pt-BR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return Number(value).toLocaleString(language, { maximumFractionDigits: 2 })
}

function buildInviteUrl({ inviteCode, projectId, sessionId, language }) {
  if (typeof window === 'undefined') return ''

  const path = inviteCode
    ? `/roda?codigo=${encodeURIComponent(inviteCode)}`
    : `/projetos/${projectId}/roda/${sessionId}`
  return new URL(language ? localizeHref(path, language) : path, window.location.origin).toString()
}

function buildVoteSummary(votes) {
  const numericVotes = votes
    .filter((vote) => vote.vote_kind === 'estimate' && vote.vote_numeric !== null)
    .map((vote) => Number(vote.vote_numeric))
    .filter((value) => Number.isFinite(value))
  const abstentionCount = votes.filter((vote) => vote.vote_kind === 'abstain').length
  const unknownCount = votes.filter((vote) => vote.vote_kind === 'unknown').length

  const total = numericVotes.reduce((sum, value) => sum + value, 0)
  const average = numericVotes.length > 0 ? total / numericVotes.length : null
  const median = getMedian(numericVotes)
  const lowest = numericVotes.length > 0 ? Math.min(...numericVotes) : null
  const highest = numericVotes.length > 0 ? Math.max(...numericVotes) : null

  return {
    average,
    median,
    lowest,
    highest,
    divergence: lowest !== null && highest !== null ? highest - lowest : null,
    suggestion: median !== null ? formatNumber(median) : '',
    voteCount: votes.length,
    estimateCount: numericVotes.length,
    abstentionCount,
    unknownCount,
  }
}

function buildRoomResultMarkdown({
  currentUserId,
  finalEstimate,
  participants,
  session,
  story,
  summary,
  votes,
}, t, language) {
  const storyTitle = story?.user_story?.title ?? t('untitled_story')
  const storyText = story?.user_story?.user_story ?? story?.user_story?.input_context ?? ''
  const resultLabel = finalEstimate || summary?.suggestion || '-'
  const lines = [
    t('planning_poker_result'),
    '',
    t('session', { p1: session?.name ?? '-' }),
    t('story_2', { p1: storyTitle }),
    t('estimate', { p1: resultLabel }),
    '',
    t('metrics'),
    t('average', { p1: formatNumber(summary?.average, language) }),
    t('median', { p1: formatNumber(summary?.median, language) }),
    t('lowest_vote', { p1: formatNumber(summary?.lowest, language) }),
    t('highest_vote', { p1: formatNumber(summary?.highest, language) }),
    t('spread', { p1: formatNumber(summary?.divergence, language) }),
    t('votes', { p1: summary?.voteCount ?? '-' }),
    t('abstentions', { p1: summary?.abstentionCount ?? '-' }),
    t('not_sure', { p1: summary?.unknownCount ?? '-' }),
  ]

  if (storyText) {
    lines.push('', t('user_story'), storyText)
  }

  if (votes.length > 0) {
    lines.push('', t('revealed_votes'))
    votes.forEach((vote) => {
      const participantIndex = participants.findIndex((participant) => participant.id === vote.participant_id)
      const participant = participants[participantIndex]
      lines.push(`- ${getParticipantLabel(participant, currentUserId, participantIndex, t)}: ${getVoteLabel(vote, t)}`)
    })
  }

  return lines.join('\n')
}

function PlanningPokerRoomPage() {
  const t = useCopy('planning')
  const { language, preview } = useLanguage()
  const { projectId, sessionId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const hasJoinedRef = useRef(false)
  const reloadTimerRef = useRef(null)
  const [session, setSession] = useState(null)
  const [project, setProject] = useState(null)
  const [sessionStories, setSessionStories] = useState([])
  const [participants, setParticipants] = useState([])
  const [rounds, setRounds] = useState([])
  const [results, setResults] = useState([])
  const [voteStatus, setVoteStatus] = useState([])
  const [revealedVotes, setRevealedVotes] = useState([])
  const [selectedSessionStoryId, setSelectedSessionStoryId] = useState('')
  const [finalEstimate, setFinalEstimate] = useState('')
  const [canManageProject, setCanManageProject] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isActing, setIsActing] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isAddingInviteMember, setIsAddingInviteMember] = useState(false)
  const [roomCopyFeedback, setRoomCopyFeedback] = useState('')
  const [accessRequestFeedback, setAccessRequestFeedback] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const inviteUrl = useMemo(
    () => buildInviteUrl({ inviteCode: session?.invite_code, projectId, sessionId, language: preview ? language : undefined }),
    [language, preview, projectId, session?.invite_code, sessionId],
  )
  const roomAccessUrl = useMemo(() => {
    return buildInviteUrl({ projectId, sessionId, language: preview ? language : undefined })
  }, [language, preview, projectId, sessionId])
  const roomAccessRequestMessage = useMemo(
    () =>
      buildPlanningAccessRequestMessage({
        email: user?.email ?? '',
        inviteUrl: roomAccessUrl,
      }, t),
    [t, roomAccessUrl, user?.email],
  )

  const currentParticipant = useMemo(
    () => participants.find((participant) => participant.user_id === userId) ?? null,
    [participants, userId],
  )
  const canFacilitate = Boolean(
    session &&
      userId &&
      (session.facilitator_id === userId || canManageProject || currentParticipant?.role === 'facilitator'),
  )

  const currentStory = useMemo(() => {
    if (selectedSessionStoryId) {
      const selected = sessionStories.find((story) => story.id === selectedSessionStoryId)
      if (selected) return selected
    }

    return (
      sessionStories.find((story) => story.status === 'voting') ??
      sessionStories.find((story) => story.status === 'pending') ??
      sessionStories[0] ??
      null
    )
  }, [selectedSessionStoryId, sessionStories])

  const storyStatusCounts = useMemo(
    () =>
      sessionStories.reduce(
        (counts, story) => {
          const status = story.status ?? 'pending'
          return {
            ...counts,
            [status]: (counts[status] ?? 0) + 1,
          }
        },
        { pending: 0, voting: 0, estimated: 0, skipped: 0 },
      ),
    [sessionStories],
  )
  const storyRoundCounts = useMemo(() => {
    return rounds.reduce((counts, round) => {
      const currentCount = counts.get(round.session_story_id) ?? 0
      counts.set(round.session_story_id, currentCount + 1)
      return counts
    }, new Map())
  }, [rounds])
  const currentStoryRounds = useMemo(
    () =>
      rounds
        .filter((round) => round.session_story_id === currentStory?.id)
        .sort((a, b) => a.round_number - b.round_number),
    [currentStory?.id, rounds],
  )
  const currentRound = useMemo(
    () =>
      [...currentStoryRounds]
        .reverse()
        .find((round) => ['voting', 'revealed'].includes(round.status)) ??
      currentStoryRounds[currentStoryRounds.length - 1] ??
      null,
    [currentStoryRounds],
  )
  const currentRoundVoteStatus = useMemo(
    () => voteStatus.filter((status) => status.round_id === currentRound?.id),
    [currentRound?.id, voteStatus],
  )
  const currentRoundVotes = useMemo(
    () => revealedVotes.filter((vote) => vote.round_id === currentRound?.id),
    [currentRound?.id, revealedVotes],
  )
  const voteSummary = useMemo(() => buildVoteSummary(currentRoundVotes), [currentRoundVotes])
  const currentStoryResult = useMemo(
    () => results.find((result) => result.session_story_id === currentStory?.id) ?? null,
    [currentStory?.id, results],
  )
  const storyFinalEstimate = currentStoryResult?.final_estimate ?? currentStory?.final_estimate ?? ''
  const persistedSummary = useMemo(() => {
    if (!currentStoryResult && !currentStory?.final_estimate) return null

    return {
      average: currentStoryResult?.average ?? null,
      median: currentStoryResult?.median ?? null,
      lowest: currentStoryResult?.lowest_vote ?? null,
      highest: currentStoryResult?.highest_vote ?? null,
      divergence: currentStoryResult?.divergence ?? null,
      suggestion: currentStoryResult?.final_estimate ?? currentStory?.final_estimate ?? '',
      voteCount: currentStoryResult?.vote_count ?? null,
      abstentionCount: currentStoryResult?.abstention_count ?? null,
      unknownCount: currentStoryResult?.unknown_count ?? null,
    }
  }, [currentStory?.final_estimate, currentStoryResult])
  const visibleSummary =
    currentRound?.status === 'revealed' ? voteSummary : persistedSummary
  const shouldShowResult =
    currentRound?.status === 'revealed' ||
    Boolean(currentStoryResult) ||
    Boolean(currentStory?.final_estimate)
  const consensusInsight = useMemo(() => {
    if (!shouldShowResult || !visibleSummary) return null

    const numericDivergence = Number(visibleSummary.divergence)
    const hasNumericDivergence = Number.isFinite(numericDivergence)
    const suggestion = visibleSummary.suggestion || storyFinalEstimate || ''

    if (!hasNumericDivergence) {
      return {
        tone: 'neutral',
        label: t('no_numeric_consensus'),
        description: t('this_round_has_non_numeric_votes_or'),
        suggestion,
      }
    }

    if (numericDivergence === 0) {
      return {
        tone: 'strong',
        label: t('strong_consensus'),
        description: t('all_numeric_votes_match_you_can_seal'),
        suggestion,
      }
    }

    if (numericDivergence <= 2) {
      return {
        tone: 'good',
        label: t('close_alignment'),
        description: t('the_spread_is_small_check_for_open'),
        suggestion,
      }
    }

    if (numericDivergence <= 5) {
      return {
        tone: 'attention',
        label: t('moderate_spread'),
        description: t('discuss_the_highest_and_lowest_votes_before'),
        suggestion,
      }
    }

    return {
      tone: 'risk',
      label: t('wide_spread'),
      description: t('the_team_has_different_views_discuss_the'),
      suggestion,
    }
  }, [t, shouldShowResult, storyFinalEstimate, visibleSummary])
  const scoringValues = Array.isArray(session?.scoring_values) ? session.scoring_values : []
  const eligibleVoters = useMemo(
    () =>
      participants.filter(
        (participant) => participant.status === 'joined' && participant.role !== 'observer',
      ),
    [participants],
  )
  const hasUserVoted = useMemo(
    () =>
      currentRoundVoteStatus.some((status) => status.user_id === userId && status.has_voted),
    [currentRoundVoteStatus, userId],
  )
  const votedCount = useMemo(
    () =>
      currentRoundVoteStatus.filter((status) =>
        status.has_voted &&
        eligibleVoters.some((participant) => participant.id === status.participant_id),
      ).length,
    [currentRoundVoteStatus, eligibleVoters],
  )
  const votingProgressPercent = eligibleVoters.length > 0
    ? Math.min(100, Math.round((votedCount / eligibleVoters.length) * 100))
    : 0
  const votingProgressLabel = eligibleVoters.length > 0
    ? t('voters', { p1: votedCount, p2: eligibleVoters.length })
    : t('no_voters')
  const roomClosed = session?.status === 'completed' || session?.status === 'canceled'
  const storyLocked = ['estimated', 'skipped'].includes(currentStory?.status)
  const voteVisibilityLabel = shouldShowResult
    ? roomClosed
      ? t('result_saved')
      : t('votes_revealed')
    : currentRound?.status === 'voting'
      ? t('votes_hidden')
      : t('no_active_round')
  const resolvedStoriesCount = storyStatusCounts.estimated + storyStatusCounts.skipped
  const roomProgressLabel =
    sessionStories.length > 0
      ? t('stories_completed', { p1: resolvedStoriesCount, p2: sessionStories.length })
      : t('no_stories')
  const roomProgressPercent =
    sessionStories.length > 0 ? Math.round((resolvedStoriesCount / sessionStories.length) * 100) : 0
  const unresolvedStoriesCount = sessionStories.length - resolvedStoriesCount
  const unresolvedStoriesLabel =
    unresolvedStoriesCount === 1
      ? t('1_story_still_open')
      : t('stories_still_open', { p1: Math.max(unresolvedStoriesCount, 0) })
  const allStoriesResolved = Boolean(
    sessionStories.length > 0 &&
      sessionStories.every((story) => ['estimated', 'skipped'].includes(story.status)),
  )
  const sessionSummaryProgress = useMemo(
    () => getPlanningSessionProgress(sessionStories, t),
    [t, sessionStories],
  )
  const votingExpired = Boolean(
    currentRound?.status === 'voting' && isRoundTimerExpired(currentRound.ends_at, nowTick),
  )
  const canVote =
    Boolean(currentRound) &&
    currentRound.status === 'voting' &&
    !roomClosed &&
    !votingExpired &&
    currentParticipant?.status === 'joined' &&
    currentParticipant?.role !== 'observer'
  const canCastVote = canVote && (Boolean(session?.allow_revote) || !hasUserVoted)
  const shouldShowVotingDeck = Boolean(currentRound?.status === 'voting' && !roomClosed && !storyLocked)
  const shouldShowFacilitatorActions = Boolean(canFacilitate && !roomClosed && !storyLocked)
  const nextPendingStory = useMemo(
    () =>
      sessionStories.find(
        (story) => story.id !== currentStory?.id && story.status === 'pending',
      ) ?? null,
    [currentStory?.id, sessionStories],
  )
  const currentStoryIndex = useMemo(
    () => sessionStories.findIndex((story) => story.id === currentStory?.id),
    [currentStory?.id, sessionStories],
  )
  const currentStoryPositionLabel =
    currentStoryIndex >= 0 && sessionStories.length > 0
      ? t('of_2', { p1: currentStoryIndex + 1, p2: sessionStories.length })
      : t('no_selection')
  const canSelectNextPendingStory = Boolean(nextPendingStory && canFacilitate && !roomClosed && !isActing)
  const storyContinuityPanel = useMemo(() => {
    if (sessionStories.length === 0) {
      return {
        tone: 'empty',
        eyebrow: t('no_artifacts'),
        title: t('no_linked_stories_2'),
        description: t('create_a_session_with_stories_ready_to'),
        action: null,
      }
    }

    if (roomClosed) {
      return {
        tone: 'closed',
        eyebrow: t('session_history'),
        title: t('session_available_for_review'),
        description: t('review_the_saved_estimates_and_revealed_votes', { p1: roomProgressLabel }),
        action: null,
      }
    }

    if (allStoriesResolved) {
      return {
        tone: 'complete',
        eyebrow: t('session_complete'),
        title: t('all_stories_are_resolved'),
        description: canFacilitate
          ? t('end_the_session_to_keep_this_result')
          : t('wait_for_the_facilitator_to_end_the'),
        action: null,
      }
    }

    if (storyLocked && nextPendingStory) {
      return {
        tone: 'next',
        eyebrow: t('next_step'),
        title: t('move_to_the_next_story'),
        description: t('is_still_pending_in_this_session', { p1: nextPendingStory.user_story?.title ?? t('the_next_pending_story') }),
        action: canFacilitate ? 'select-next' : null,
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        tone: 'decision',
        eyebrow: t('decision_open'),
        title: t('discuss_before_sealing'),
        description: t('votes_are_visible_confirm_consensus_or_start'),
        action: null,
      }
    }

    if (!currentRound && canFacilitate) {
      return {
        tone: 'ready',
        eyebrow: t('ready_to_start'),
        title: t('open_voting_when_the_team_is_ready'),
        description: t('cards_stay_hidden_until_the_reveal_use'),
        action: null,
      }
    }

    return null
  }, [
      t,
    allStoriesResolved,
    canFacilitate,
    currentRound,
    nextPendingStory,
    roomClosed,
    roomProgressLabel,
    sessionStories.length,
    storyLocked,
  ])
  const facilitatorStateLabel = roomClosed
    ? getSessionStatusLabel(session?.status, t)
    : storyLocked
      ? getStoryStatusLabel(currentStory?.status, t)
      : ''
  const sessionCompletionLabel =
    session?.status === 'completed'
      ? t('session_completed')
      : session?.status === 'canceled'
        ? t('session_canceled')
        : ''
  const guildSummaryLabel = roomClosed
    ? t('voters_participated_in_the_selected_round', { p1: votedCount, p2: eligibleVoters.length })
    : currentRound?.status === 'voting'
      ? t('voters_have_submitted_a_vote', { p1: votedCount, p2: eligibleVoters.length })
      : t('voting_progress_updates_during_the_round')
  const requiresFullVotingBeforeReveal = Boolean(session?.reveal_votes_after_all)
  const hasPendingVotes = eligibleVoters.length > 0 && votedCount < eligibleVoters.length
  const canRevealRound = Boolean(
    canFacilitate &&
      currentRound?.status === 'voting' &&
      !roomClosed &&
      !isActing &&
      (!requiresFullVotingBeforeReveal || !hasPendingVotes || votingExpired),
  )
  const canStartRound = Boolean(
    canFacilitate &&
      currentStory &&
      !roomClosed &&
      !storyLocked &&
      !isActing &&
      currentRound?.status !== 'voting',
  )
  const proposedFinalEstimate = String(
    finalEstimate || visibleSummary?.suggestion || storyFinalEstimate || '',
  ).trim()
  const canSealEstimate = Boolean(
    canFacilitate &&
      currentRound?.status === 'revealed' &&
      currentStory?.status !== 'estimated' &&
      proposedFinalEstimate &&
      !isActing,
  )
  const revotePolicyLabel = session?.allow_revote ? t('vote_changes_allowed') : t('one_vote_per_person')
  const revealPolicyLabel = session?.reveal_votes_after_all
    ? t('reveal_after_everyone_votes_2')
    : t('facilitator_reveals')
  const scoringScaleLabel = getScoringScaleLabel(session?.scoring_scale, t)
  const sessionControlPanel = useMemo(() => {
    if (roomClosed) {
      return {
        tone: 'closed',
        title: sessionCompletionLabel || t('session_closed'),
        description: t('this_session_is_closed_for_voting_and'),
        actionLabel: null,
      }
    }

    if (allStoriesResolved) {
      return {
        tone: 'complete',
        title: t('ready_to_complete'),
        description: t('all_stories_are_resolved_end_the_session'),
        actionLabel: t('end_session'),
      }
    }

    return {
      tone: 'active',
      title: t('session_in_progress'),
      description: t('end_the_session_manually_only_if_it', { p1: unresolvedStoriesLabel }),
      actionLabel: t('end_manually'),
    }
  }, [t, allStoriesResolved, roomClosed, sessionCompletionLabel, unresolvedStoriesLabel])
  const finalSessionPanel = useMemo(() => {
    if (!session || (!roomClosed && !allStoriesResolved)) return null

    if (session.status === 'canceled') {
      return {
        tone: 'canceled',
        title: t('session_canceled'),
        description: t('the_session_ended_with_no_further_voting'),
      }
    }

    if (session.status === 'completed' && allStoriesResolved) {
      return {
        tone: 'completed',
        title: t('session_completed_automatically'),
        description: t('all_stories_were_resolved_and_the_history'),
      }
    }

    if (session.status === 'completed') {
      return {
        tone: 'manual',
        title: t('session_ended_manually'),
        description: t('the_session_ended_before_all_stories_were'),
      }
    }

    return {
      tone: 'ready',
      title: t('all_stories_are_resolved'),
      description: t('end_the_session_to_close_voting_and'),
    }
  }, [t, allStoriesResolved, roomClosed, session])
  const revealActionHint =
    currentRound?.status === 'voting'
      ? votingExpired
        ? t('time_is_up_further_votes_are_blocked')
        : requiresFullVotingBeforeReveal && hasPendingVotes
        ? t('cards_stay_hidden_until_everyone_votes')
        : t('the_facilitator_can_reveal_the_cards_when')
      : null
  const getParticipantRoomStatus = useCallback(
    (participant) => {
      if (participant.role === 'observer') return t('observer')

      const voted = currentRoundVoteStatus.some(
        (status) => status.participant_id === participant.id && status.has_voted,
      )

      if (voted) return roomClosed ? t('vote_submitted') : t('voted')
      if (roomClosed) return t('no_vote')
      if (currentRound?.status === 'revealed') return t('did_not_vote')
      if (currentRound?.status === 'voting') return t('waiting_for_vote')

      return t('waiting_for_a_round')
    },
    [t, currentRound?.status, currentRoundVoteStatus, roomClosed],
  )
  const getParticipantRoomTone = useCallback(
    (participant) => {
      if (participant.role === 'observer') return 'observer'

      const voted = currentRoundVoteStatus.some(
        (status) => status.participant_id === participant.id && status.has_voted,
      )

      if (voted) return 'voted'
      if (roomClosed || currentRound?.status === 'revealed') return 'muted'

      return 'waiting'
    },
    [currentRound?.status, currentRoundVoteStatus, roomClosed],
  )
  const remainingTimeLabel = useMemo(() => {
    return formatRemainingTime(currentRound?.status === 'voting' ? currentRound.ends_at : null, nowTick, t)
  }, [t, currentRound?.ends_at, currentRound?.status, nowTick])
  const timerProgressPercent = useMemo(() => {
    if (currentRound?.status !== 'voting' || !currentRound.started_at || !currentRound.ends_at) {
      return null
    }

    const startedAt = new Date(currentRound.started_at).getTime()
    const endsAt = new Date(currentRound.ends_at).getTime()
    if (!Number.isFinite(startedAt) || !Number.isFinite(endsAt) || endsAt <= startedAt) {
      return null
    }

    const elapsed = Math.min(Math.max(nowTick - startedAt, 0), endsAt - startedAt)
    const remainingPercent = 100 - Math.round((elapsed / (endsAt - startedAt)) * 100)
    return Math.max(0, Math.min(100, remainingPercent))
  }, [currentRound, nowTick])
  const revealReadinessLabel = useMemo(() => {
    if (roomClosed) return t('history')
    if (storyLocked) return t('story_closed')
    if (currentRound?.status === 'revealed') return t('cards_revealed')
    if (currentRound?.status !== 'voting') return t('waiting_for_a_round')
    if (votingExpired) return t('ready_to_reveal')
    if (canRevealRound) return t('cards_can_be_revealed')
    if (requiresFullVotingBeforeReveal && hasPendingVotes) return t('waiting_for_votes')
    return t('voting')
  }, [
      t,
    canRevealRound,
    currentRound,
    hasPendingVotes,
    requiresFullVotingBeforeReveal,
    roomClosed,
    storyLocked,
    votingExpired,
  ])
  const revealReadinessDescription = useMemo(() => {
    if (roomClosed) return t('this_session_is_available_to_review')
    if (storyLocked) return t('select_a_pending_story_to_continue')
    if (currentRound?.status === 'revealed') return t('discuss_the_spread_and_choose_an_estimate')
    if (currentRound?.status !== 'voting') return t('the_facilitator_opens_the_next_round')
    if (votingExpired) return t('time_is_up_further_votes_are_blocked_2')
    if (canRevealRound) return t('the_facilitator_can_reveal_the_cards_now')
    if (requiresFullVotingBeforeReveal && hasPendingVotes) return t('cards_can_be_revealed_after_everyone_votes')
    return t('votes_stay_hidden_until_the_reveal')
  }, [
      t,
    canRevealRound,
    currentRound,
    hasPendingVotes,
    requiresFullVotingBeforeReveal,
    roomClosed,
    storyLocked,
    votingExpired,
  ])
  const roomStage = useMemo(() => {
    if (session?.status === 'completed') {
      return {
        tone: 'closed',
        label: t('planning_poker_completed'),
        description: allStoriesResolved
          ? t('all_stories_were_completed_and_saved_in')
          : t('the_session_ended_and_remains_available_to'),
      }
    }

    if (session?.status === 'canceled') {
      return {
        tone: 'closed',
        label: t('planning_poker_canceled'),
        description: t('the_session_ended_with_no_further_voting_2'),
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        tone: 'revealed',
        label: t('cards_revealed_2'),
        description: t('compare_the_votes_discuss_the_spread_and'),
      }
    }

    if (currentRound?.status === 'voting') {
      return {
        tone: votingExpired ? 'expired' : 'voting',
        label: votingExpired ? t('time_is_up') : t('voting_in_progress'),
        description: votingExpired
          ? t('further_votes_are_blocked_the_facilitator_can')
          : t('cards_are_hidden_from_everyone_until_the'),
      }
    }

    if (currentStory?.status === 'estimated') {
      return {
        tone: 'closed',
        label: t('story_estimated'),
        description: t('select_another_pending_story_or_end_the'),
      }
    }

    if (currentStory?.status === 'skipped') {
      return {
        tone: 'closed',
        label: t('story_skipped'),
        description: t('select_another_story_to_continue'),
      }
    }

    return {
      tone: 'idle',
      label: canFacilitate ? t('ready_to_start_2') : t('waiting_for_the_facilitator'),
      description: canFacilitate
        ? t('start_the_round_to_open_voting_for')
        : t('the_facilitator_starts_the_round_when_the'),
    }
  }, [t, allStoriesResolved, canFacilitate, currentRound?.status, currentStory?.status, session?.status, votingExpired])
  const facilitatorPanel = useMemo(() => {
    if (roomClosed) {
      return {
        title: t('session_closed'),
        description: t('facilitator_controls_are_locked_after_the_session'),
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        title: t('seal_the_estimate_or_start_another_round'),
        description: t('seal_the_estimate_once_the_team_reaches'),
      }
    }

    if (currentRound?.status === 'voting') {
      return {
        title: votingExpired ? t('time_is_up') : t('voting_open'),
        description: votingExpired
          ? t('reveal_the_cards_to_discuss_the_votes')
          : t('track_who_has_voted_while_keeping_individual'),
      }
    }

    if (storyLocked) {
      return {
        title: t('story_closed'),
        description: t('choose_another_pending_story_to_continue_estimating'),
      }
    }

    return {
      title: t('session_controls'),
      description: t('start_voting_reveal_the_cards_or_skip'),
    }
  }, [t, currentRound?.status, roomClosed, storyLocked, votingExpired])
  const participantPanel = useMemo(() => {
    const roleLabel = currentParticipant?.role === 'observer' ? t('observer') : t('voter')

    if (roomClosed) {
      return {
        tone: 'closed',
        title: t('session_ended'),
        description: t('the_session_has_ended_you_can_still'),
        role: roleLabel,
        status: t('view_only'),
        action: 'Revisar resultado',
      }
    }

    if (!currentParticipant) {
      return {
        tone: 'idle',
        title: t('joining_the_team'),
        description: t('your_participation_is_being_registered_before_you'),
        role: 'Carregando',
        status: t('joining'),
        action: 'Aguardar',
      }
    }

    if (currentParticipant.role === 'observer') {
      return {
        tone: 'observer',
        title: t('you_re_an_observer'),
        description: t('follow_the_discussion_and_results_observers_do'),
        role: roleLabel,
        status: currentRound?.status === 'revealed' ? t('votes_revealed') : t('no_vote'),
        action: currentRound?.status === 'revealed' ? t('follow_discussion') : t('wait_for_the_reveal'),
      }
    }

    if (currentRound?.status === 'voting') {
      if (votingExpired) {
        return {
          tone: 'expired',
          title: t('time_is_up'),
          description: t('the_timer_closed_voting_wait_for_the'),
          role: roleLabel,
          status: hasUserVoted ? t('vote_submitted') : t('no_vote'),
          action: t('wait_for_the_reveal'),
        }
      }

      if (hasUserVoted) {
        return {
          tone: 'ready',
          title: t('vote_submitted'),
          description: session?.allow_revote
            ? t('your_vote_stays_hidden_you_can_change')
            : t('your_vote_stays_hidden_vote_changes_are'),
          role: roleLabel,
          status: session?.allow_revote ? t('changes_allowed') : t('changes_disabled'),
          action: 'Aguardar a guilda',
        }
      }

      return {
        tone: canVote ? 'voting' : 'idle',
        title: canVote ? t('choose_your_card') : t('waiting_for_access'),
        description: canVote
          ? t('select_a_card_nobody_can_see_your')
          : t('voting_is_open_you_don_t_have'),
        role: roleLabel,
        status: canVote ? t('vote_pending') : t('no_action'),
        action: canVote ? t('vote_now') : t('wait'),
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        tone: 'revealed',
        title: t('cards_revealed_2'),
        description: t('votes_are_visible_join_the_discussion_before'),
        role: roleLabel,
        status: hasUserVoted ? t('vote_revealed') : t('no_vote_submitted'),
        action: 'Discutir consenso',
      }
    }

    if (storyLocked) {
      return {
        tone: 'closed',
        title: t('story_closed'),
        description: t('this_story_is_complete_wait_for_the'),
        role: roleLabel,
        status: getStoryStatusLabel(currentStory?.status, t),
        action: t('wait_next_story'),
      }
    }

    return {
      tone: 'idle',
      title: t('waiting_for_the_facilitator'),
      description: t('voting_begins_when_the_facilitator_starts_the'),
      role: roleLabel,
      status: t('no_active_round'),
      action: t('wait_for_start'),
    }
  }, [
      t,
    canVote,
    currentParticipant,
    currentRound?.status,
    currentStory?.status,
    hasUserVoted,
    roomClosed,
    session?.allow_revote,
    storyLocked,
    votingExpired,
  ])
  const roomGuidance = useMemo(() => {
    if (session?.status === 'completed') {
      return allStoriesResolved
        ? t('all_stories_were_completed_and_the_session')
        : t('session_completed_its_history_is_available_to')
    }

    if (session?.status === 'canceled') return t('session_canceled_2')

    if (currentRound?.status === 'voting') {
      if (votingExpired) {
        return canFacilitate
          ? t('time_is_up_further_votes_are_blocked_3')
          : t('time_is_up_wait_for_the_facilitator')
      }

      if (hasUserVoted) {
        const revoteCopy = session?.allow_revote
          ? t('you_can_still_change_your_card_before')
          : t('this_session_allows_one_vote_per_person')

        return votedCount < eligibleVoters.length
          ? t('your_vote_is_recorded_and_hidden_waiting', { p1: revoteCopy })
          : t('all_voters_have_voted_the_facilitator_can', { p1: revoteCopy })
      }

      return canVote && session?.reveal_votes_after_all
        ? t('choose_a_card_individual_votes_stay_hidden')
        : canVote
          ? t('choose_a_card_individual_votes_stay_hidden_2')
        : t('waiting_for_votes_the_values_stay_hidden')
    }

    if (currentRound?.status === 'revealed') {
      return t('cards_revealed_review_the_spread_and_choose')
    }

    if (storyLocked) return t('this_story_is_already_closed_in_this')

    return canFacilitate
      ? t('start_a_round_to_open_voting_for')
      : t('waiting_for_the_facilitator_to_start_the')
  }, [
      t,
    allStoriesResolved,
    canFacilitate,
    canVote,
    currentRound?.status,
    eligibleVoters.length,
    hasUserVoted,
    session?.allow_revote,
    session?.reveal_votes_after_all,
    session?.status,
    storyLocked,
    votingExpired,
    votedCount,
  ])

  const loadRoom = useCallback(async () => {
    if (!sessionId || !userId) return

    setIsLoading(true)
    const sessionResponse = await getPlanningPokerSession({ sessionId, userId })
    if (!sessionResponse.success || !sessionResponse.data) {
      setIsLoading(false)
      setNotFound(true)
      return
    }

    const nextSession = sessionResponse.data
    if (nextSession.project_id !== projectId) {
      setIsLoading(false)
      setNotFound(true)
      return
    }

    if (!hasJoinedRef.current && !['completed', 'canceled'].includes(nextSession.status)) {
      await joinPlanningPokerSession({ sessionId, userId })
      hasJoinedRef.current = true
    }

    const [
      storiesResponse,
      participantsResponse,
      roundsResponse,
      resultsResponse,
      voteStatusResponse,
      manageResponse,
      projectResponse,
    ] = await Promise.all([
      listPlanningPokerSessionStories({ sessionId, userId }),
      listPlanningPokerParticipants({ sessionId, userId }),
      listPlanningPokerRounds({ sessionId, userId }),
      listPlanningPokerResults({ sessionId, userId }),
      listPlanningPokerVoteStatus({ sessionId, userId }),
      checkCanManageProject({ projectId: nextSession.project_id, userId }),
      getProjectById({ projectId: nextSession.project_id, userId }),
    ])

    const nextRounds = roundsResponse.success ? roundsResponse.data ?? [] : []
    const revealedRoundIds = nextRounds
      .filter((round) => ['revealed', 'closed'].includes(round.status))
      .map((round) => round.id)
    const votesResponses = await Promise.all(
      revealedRoundIds.map((roundId) => listPlanningPokerVotes({ roundId, userId })),
    )

    setSession(nextSession)
    setProject(projectResponse.success ? projectResponse.data : null)
    setSessionStories(storiesResponse.success ? storiesResponse.data ?? [] : [])
    setParticipants(participantsResponse.success ? participantsResponse.data ?? [] : [])
    setRounds(nextRounds)
    setResults(resultsResponse.success ? resultsResponse.data ?? [] : [])
    setVoteStatus(voteStatusResponse.success ? voteStatusResponse.data ?? [] : [])
    setRevealedVotes(votesResponses.flatMap((response) => (response.success ? response.data ?? [] : [])))
    setCanManageProject(manageResponse.success ? Boolean(manageResponse.data) : false)
    setSelectedSessionStoryId((current) => {
      const nextStories = storiesResponse.success ? storiesResponse.data ?? [] : []
      if (current && nextStories.some((story) => story.id === current)) return current
      return (
        nextStories.find((story) => story.status === 'voting')?.id ??
        nextStories.find((story) => story.status === 'pending')?.id ??
        nextStories[0]?.id ??
        ''
      )
    })
    setNotFound(false)
    setIsLoading(false)
  }, [projectId, sessionId, userId])

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = setTimeout(() => {
      loadRoom()
    }, 250)
  }, [loadRoom])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadRoom()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadRoom])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowTick(Date.now())
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const channel = subscribeToPlanningPokerSession({ sessionId, onChange: scheduleReload })

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
      channel?.unsubscribe()
    }
  }, [scheduleReload, sessionId])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: t('planning_poker'),
      title: session?.name ?? t('estimation_room'),
      pills: [
        { text: getSessionStatusLabel(session?.status, t) },
        { text: t('member_count', { count: participants.length }) },
        { text: scoringScaleLabel },
        { text: currentRound ? getRoundStatusLabel(currentRound.status, t) : t('no_round') },
      ],
    })

    return () => setTopbarStatus(null)
  }, [t, currentRound, participants.length, scoringScaleLabel, session?.name, session?.status, setTopbarStatus])

  async function runAction(action, successMessage) {
    setMessage('')
    setIsActing(true)
    const response = await action()
    setIsActing(false)

    if (!response.success) {
      setMessage(voteErrorKeys.get(response.error?.message) ?? 'could_not_complete_the_action_right_now')
      return null
    }

    if (successMessage) setMessage(successMessage)
    await loadRoom()
    return response.data
  }

  async function handleCopyInviteLink() {
    if (!inviteUrl) return

    setShareMessage('')
    setRoomCopyFeedback('')
    try {
      await copyTextToClipboard(inviteUrl)
      setShareMessage('link_copied_send_it_to_people_who_2')
      setRoomCopyFeedback('invite_copied')
    } catch {
      setShareMessage('could_not_copy_the_link_right_now')
      setRoomCopyFeedback('copy_failed')
    }
  }

  async function handleInviteProjectMember(event) {
    event.preventDefault()

    const safeEmail = inviteEmail.trim()
    setInviteMessage('')
    setRoomCopyFeedback('')

    if (!safeEmail) {
      setInviteMessage('enter_the_email_address_of_the_person')
      return
    }

    if (!safeEmail.includes('@')) {
      setInviteMessage('enter_a_valid_email_address_to_grant')
      return
    }

    if (!canManageProject) {
      setInviteMessage('only_project_owners_and_administrators_can_add')
      return
    }

    setIsAddingInviteMember(true)
    const response = await addProjectMemberByEmail({
      projectId: session?.project_id ?? projectId,
      email: safeEmail,
      role: 'member',
      userId,
    })
    if (!response.success) {
      setIsAddingInviteMember(false)
      setInviteMessage(response.error?.message?.includes('Usuário não encontrado')
        ? 'this_email_address_has_no_confirmed_prodforge'
        : 'could_not_add_this_email_to_the')
      return
    }

    const emailResponse = await sendPlanningPokerInviteEmail({
      email: response.data?.email ?? safeEmail,
      projectId: session?.project_id ?? projectId,
      sessionId: session?.id ?? sessionId,
      inviteUrl,
    })
    setIsAddingInviteMember(false)

    setInviteEmail('')
    setInviteMessage(
      emailResponse.success
        ? 'participant_added_to_the_project_and_invited'
        : inviteEmailErrorKeys[emailResponse.error?.code] ?? 'invite_partial',
    )
    await loadRoom()
  }

  async function handleCopyInviteCode() {
    if (!session?.invite_code) return

    setShareMessage('')
    setRoomCopyFeedback('')
    try {
      await copyTextToClipboard(session.invite_code)
      setShareMessage('code_copied_2')
      setRoomCopyFeedback('code_copied')
    } catch {
      setShareMessage('could_not_copy_the_code_right_now')
      setRoomCopyFeedback('copy_failed')
    }
  }

  async function handleCopyRoundResult() {
    if (!currentStory || !visibleSummary) return

    setMessage('')
    try {
      await copyTextToClipboard(
        buildRoomResultMarkdown({
          currentUserId: userId,
          finalEstimate: storyFinalEstimate,
          participants,
          session,
          story: currentStory,
          summary: visibleSummary,
          votes: currentRoundVotes,
        }, t, language),
      )
      setMessage('planning_poker_result_copied_as_markdown')
    } catch {
      setMessage('could_not_copy_the_result_right_now')
    }
  }

  async function handleCopySessionSummary() {
    if (!session) return

    setMessage('')
    setRoomCopyFeedback('')
    try {
      await copyTextToClipboard(
        buildPlanningSessionSummaryMarkdown({
          participantsCount: eligibleVoters.length,
          progress: sessionSummaryProgress,
          projectName: project?.name ?? '',
          session,
          stories: sessionStories,
        }, t),
      )
      setMessage('summary_copied')
      setRoomCopyFeedback('summary_copied_2')
    } catch {
      setMessage('could_not_copy_the_summary_right_now')
      setRoomCopyFeedback('copy_failed')
    }
  }

  function handleSelectNextPendingStory() {
    if (!nextPendingStory) return

    setSelectedSessionStoryId(nextPendingStory.id)
    setFinalEstimate('')
    setMessage('next_pending_story_selected')
  }

  async function handleStartRound() {
    if (!currentStory) return

    setFinalEstimate('')
    await runAction(
      () =>
        startPlanningPokerRound({
          sessionStoryId: currentStory.id,
          voteTimeLimitSeconds: session?.vote_time_limit_seconds ?? null,
          userId,
        }),
      'round_started_voting_is_open',
    )
  }

  async function handleVote(value) {
    if (!currentRound) return
    if (!canCastVote) {
      setMessage(votingExpired
        ? 'time_is_up_wait_for_the_cards'
        : 'your_vote_has_been_recorded_this_session'
      )
      return
    }

    const voteKind = value === '?' ? 'unknown' : 'estimate'
    await runAction(
      () => castPlanningPokerVote({ roundId: currentRound.id, voteValue: value, voteKind, userId }),
      'vote_recorded_it_stays_hidden_until_the',
    )
  }

  async function handleAbstain() {
    if (!currentRound) return
    if (!canCastVote) {
      setMessage(votingExpired
        ? 'time_is_up_wait_for_the_cards'
        : 'your_vote_has_been_recorded_this_session'
      )
      return
    }

    await runAction(
      () =>
        castPlanningPokerVote({
          roundId: currentRound.id,
          voteValue: 'Abster-se',
          voteKind: 'abstain',
          userId,
        }),
      'abstention_recorded_it_stays_hidden_until_the',
    )
  }

  async function handleRevealRound() {
    if (!currentRound) return

    await runAction(
      () => revealPlanningPokerRound({ roundId: currentRound.id, userId }),
      'cards_revealed_3',
    )
  }

  async function handleSealEstimate() {
    if (!currentStory) return
    if (!proposedFinalEstimate) {
      setMessage('enter_or_choose_a_final_estimate_before')
      return
    }

    await runAction(
      () => sealPlanningPokerEstimate({ sessionStoryId: currentStory.id, finalEstimate: proposedFinalEstimate, userId }),
      'estimate_sealed_the_session_ends_automatically_once',
    )
  }

  async function handleSkipStory() {
    if (!currentStory) return

    await runAction(
      () => skipPlanningPokerStory({ sessionStoryId: currentStory.id, userId }),
      'story_skipped_2',
    )
  }

  async function handleCompleteSession() {
    if (!session) return

    await runAction(
      () => completePlanningPokerSession({ sessionId: session.id, userId }),
      'session_completed_2',
    )
  }

  async function handleCopyAccessRequestMessage() {
    setAccessRequestFeedback('')
    try {
      await copyTextToClipboard(roomAccessRequestMessage)
      setAccessRequestFeedback('message_copied_for_the_facilitator')
    } catch {
      setAccessRequestFeedback('could_not_copy_automatically_use_the_message')
    }
  }

  if (notFound) {
    return (
      <div className="planning-poker-room">
        <section className="panel planning-poker-room__access-state">
          <p className="projects-page__eyebrow">{t('planning_poker')}</p>
          <h1>{t('session_unavailable_or_access_pending')}</h1>
          <p>
            {t('the_invite_works_for_people_with_project')}
          </p>
          <div className="planning-poker-room__access-request">
            <div className="planning-poker-room__access-request-copy">
              <span>{t('access_pending')}</span>
              <strong>{t('request_project_access')}</strong>
              <p>
                {t('copy_a_message_with_your_email_and')}
              </p>
            </div>
            <div className="planning-poker-room__access-request-card">
              <span>{t('your_account_email_2')}</span>
              <strong>{user?.email ?? t('signed_in_account')}</strong>
              <p>{t('the_facilitator_needs_to_add_this_email')}</p>
            </div>
            <div className="planning-poker-room__access-request-actions">
              <button type="button" className="btn btn-primary btn-small" onClick={handleCopyAccessRequestMessage}>
                {t('copy_access_request')}
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
                  value={roomAccessRequestMessage}
                  aria-label={t('access_request_message_for_manual_copying')}
                  onFocus={(event) => event.target.select()}
                />
              </label>
            </details>
          </div>
          <div className="planning-poker-room__final-summary-actions">
            <Link className="btn btn-primary btn-small" to="/roda">
              {t('join_with_a_code')}
            </Link>
            <Link className="btn btn-secondary btn-small" to="/tool">
              {t('go_to_workbench')}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="planning-poker-room">
      <section className="panel planning-poker-room__hero">
        <div>
          <p className="projects-page__eyebrow">{t('planning_poker')}</p>
          <h1>{session?.name ?? t('loading_room')}</h1>
          <p>
            {t('estimate_one_story_at_a_time_keep')}
          </p>
        </div>
        <div className="planning-poker-room__hero-actions">
          <div className="planning-poker-room__invite-box">
            <span>{t('code_2')}{" "}{session?.invite_code ?? '-'}</span>
            <div className="planning-poker-room__invite-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyInviteLink}
                disabled={!session}
              >
                {roomCopyFeedback === 'invite_copied' ? t('link_copied') : t('copy_link_for_members')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleCopyInviteCode}
                disabled={!session?.invite_code}
              >
                {roomCopyFeedback === 'code_copied' ? t('code_copied') : t('copy_code')}
              </button>
            </div>
            {shareMessage ? <p className="planning-poker-room__invite-message" role="status">{formatNotice(t, shareMessage)}</p> : null}
          </div>
          <Link className="btn btn-secondary btn-small" to={`/projetos/${projectId}`}>
            {t('back_to_project')}
          </Link>
        </div>
      </section>

      {message ? <p className="projects-page__message" role="status">{formatNotice(t, message)}</p> : null}
      {isLoading ? <p className="projects-page__state">{t('loading_room')}</p> : null}

      {session ? (
        <section
          className={`panel planning-poker-room__command-bar planning-poker-room__command-bar--${roomStage.tone}`}
          aria-label={t('planning_poker_operational_status')}
        >
          <div className="planning-poker-room__command-copy">
            <p className="projects-page__eyebrow">{t('session_status')}</p>
            <h2>{roomStage.label}</h2>
            <p>{roomStage.description}</p>
          </div>
          <div className="planning-poker-room__command-metrics" aria-label={t('session_overview')}>
            <span>
              <small>{t('stories')}</small>
              <strong>{roomProgressLabel}</strong>
            </span>
            <span>
              <small>{t('voters_2')}</small>
              <strong>{votingProgressLabel}</strong>
            </span>
            <span>
              <small>{t('timer')}</small>
              <strong>{remainingTimeLabel}</strong>
            </span>
            <span>
              <small>{t('privacy')}</small>
              <strong>{voteVisibilityLabel}</strong>
            </span>
          </div>
        </section>
      ) : null}

      {finalSessionPanel ? (
        <section
          className={`panel planning-poker-room__final-summary planning-poker-room__final-summary--${finalSessionPanel.tone}`}
          aria-label={t('final_session_summary')}
        >
          <div className="planning-poker-room__final-summary-copy">
            <p className="projects-page__eyebrow">{t('final_session_summary')}</p>
            <h2>{finalSessionPanel.title}</h2>
            <p>{finalSessionPanel.description}</p>
          </div>

          <div className="planning-poker-room__final-summary-grid" aria-label={t('final_session_metrics')}>
            <span>
              <small>{t('estimated')}</small>
              <strong>{sessionSummaryProgress.estimated}</strong>
            </span>
            <span>
              <small>{t('skipped')}</small>
              <strong>{sessionSummaryProgress.skipped}</strong>
            </span>
            <span>
              <small>{t('pending')}</small>
              <strong>{sessionSummaryProgress.pending + sessionSummaryProgress.voting}</strong>
            </span>
            <span>
              <small>{t('voters_2')}</small>
              <strong>{eligibleVoters.length}</strong>
            </span>
            <span>
              <small>{t('scale')}</small>
              <strong>{scoringScaleLabel}</strong>
            </span>
            <span>
              <small>{t('timer')}</small>
              <strong>{formatPlanningTimerDuration(session?.vote_time_limit_seconds, t)}</strong>
            </span>
            <span>
              <small>{t('date')}</small>
              <strong>{formatDateTime(session?.completed_at ?? session?.canceled_at ?? session?.updated_at, language)}</strong>
            </span>
          </div>

          <div className="planning-poker-room__final-summary-actions">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleCopySessionSummary}
              disabled={!session}
            >
              {roomCopyFeedback === 'summary_copied_2' ? t('summary_copied_2') : t('copy_summary')}
            </button>
            <Link className="btn btn-ghost btn-small" to={`/roda?projectId=${projectId}`}>
              {t('back_to_planning_poker')}
            </Link>
          </div>
        </section>
      ) : null}

      <div className="planning-poker-room__layout">
        <aside className="panel planning-poker-room__stories" aria-label={t('stories_in_this_session')}>
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">{t('artifacts')}</p>
              <h2>{t('stories')}</h2>
            </div>
          </div>

          <div className="planning-poker-room__story-progress" aria-label={t('session_story_progress')}>
            <div className="planning-poker-room__story-progress-header">
              <span>{t('progress')}</span>
              <strong>{roomProgressLabel}</strong>
            </div>
            <div
              className="planning-poker-room__story-progress-bar"
              role="progressbar"
              aria-label={t('completed_stories')}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={roomProgressPercent}
            >
              <span style={{ width: `${roomProgressPercent}%` }} />
            </div>
            <div className="planning-poker-room__story-progress-chips" aria-label={t('story_status')}>
              <span>{t('pending_count', { count: storyStatusCounts.pending })}</span>
              <span>{storyStatusCounts.voting}{" "}{t('voting_2')}</span>
              <span>{t('estimated_count', { count: storyStatusCounts.estimated })}</span>
              <span>{t('skipped_count', { count: storyStatusCounts.skipped })}</span>
            </div>
          </div>

          <div className="planning-poker-room__story-list">
            {sessionStories.length > 0 ? (
              sessionStories.map((story) => {
                const safeStatus = story.status ?? 'pending'
                const isActive = story.id === currentStory?.id
                const storyRoundCount = storyRoundCounts.get(story.id) ?? 0
                const storyRoundLabel = storyRoundCount === 1 ? t('1_round') : t('rounds', { p1: storyRoundCount })

                return (
                  <button
                    key={story.id}
                    type="button"
                    className={[
                      'planning-poker-room__story-card',
                      `planning-poker-room__story-card--${safeStatus}`,
                      isActive ? 'planning-poker-room__story-card--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setSelectedSessionStoryId(story.id)
                      setFinalEstimate('')
                    }}
                  >
                    <div className="planning-poker-room__story-card-header">
                      <strong>{story.user_story?.title ?? t('untitled_story')}</strong>
                      {isActive ? <span>{t('current')}</span> : null}
                    </div>
                    <div className="planning-poker-room__story-card-meta">
                      <span className={`planning-poker-room__story-status planning-poker-room__story-status--${safeStatus}`}>
                        {getStoryStatusLabel(safeStatus, t)}
                      </span>
                      <span>{storyRoundLabel}</span>
                      {story.final_estimate ? <span>{t('final_2')}{" "}{story.final_estimate}</span> : null}
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="projects-page__state">{t('no_stories_linked_to_this_session')}</p>
            )}
          </div>
        </aside>

        <main className="panel planning-poker-room__table" aria-label={t('voting_table')}>
          <div className="planning-poker-room__story-focus">
            <div className="planning-poker-room__story-focus-head">
              <div>
                <p className="projects-page__eyebrow">{t('current_story')}</p>
                <h2>{currentStory?.user_story?.title ?? t('choose_a_story')}</h2>
              </div>
              <span>{currentStoryPositionLabel}</span>
            </div>
            <p>
              {currentStory?.user_story?.user_story ??
                currentStory?.user_story?.input_context ??
                t('start_a_round_to_estimate_this_story')}
            </p>
            {storyFinalEstimate ? (
              <div className="planning-poker-room__story-pills" aria-label={t('story_estimate')}>
                <span>{t('sealed_estimate')}{" "}{storyFinalEstimate}</span>
              </div>
            ) : null}
          </div>

          {storyContinuityPanel ? (
            <div
              className={`planning-poker-room__continuity planning-poker-room__continuity--${storyContinuityPanel.tone}`}
              aria-label={t('next_step_for_this_session')}
            >
              <div>
                <p className="projects-page__eyebrow">{storyContinuityPanel.eyebrow}</p>
                <h3>{storyContinuityPanel.title}</h3>
                <p>{storyContinuityPanel.description}</p>
              </div>
              {storyContinuityPanel.action === 'select-next' ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleSelectNextPendingStory}
                  disabled={!canSelectNextPendingStory}
                >
                  {t('select_next')}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="planning-poker-room__round-status" aria-label={t('current_round_summary')}>
            <span>
              <small>{t('round')}</small>
              <strong>{currentRound ? getRoundStatusLabel(currentRound.status, t) : t('no_round_has_started')}</strong>
            </span>
            <span>
              <small>{t('time')}</small>
              <strong>{remainingTimeLabel}</strong>
            </span>
            <span>
              <small>{t('participation')}</small>
              <strong>{votingProgressLabel}</strong>
            </span>
            {hasUserVoted && currentRound?.status === 'voting' ? (
              <span>
                <small>{t('your_vote')}</small>
                <strong>{session?.allow_revote ? t('recorded_changes_allowed') : t('recorded_changes_disabled')}</strong>
              </span>
            ) : null}
          </div>

          <div className="planning-poker-room__live-progress" aria-label={t('live_round_progress')}>
            <div className="planning-poker-room__live-progress-item">
              <div className="planning-poker-room__live-progress-head">
                <span>{t('votes_submitted')}</span>
                <strong>{votingProgressLabel}</strong>
              </div>
              <div
                className="planning-poker-room__live-progress-track"
                role="progressbar"
                aria-label={t('vote_submission_progress')}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={votingProgressPercent}
                aria-valuetext={votingProgressLabel}
                style={{ '--progress-width': `${votingProgressPercent}%` }}
              >
                <span />
              </div>
            </div>

            <div className="planning-poker-room__live-progress-item">
              <div className="planning-poker-room__live-progress-head">
                <span>{t('round_timer')}</span>
                <strong>{remainingTimeLabel}</strong>
              </div>
              {timerProgressPercent === null ? (
                <p>{t('this_round_has_no_active_time_limit')}</p>
              ) : (
                <div
                  className={`planning-poker-room__live-progress-track planning-poker-room__live-progress-track--timer ${
                    votingExpired ? 'planning-poker-room__live-progress-track--expired' : ''
                  }`}
                  role="progressbar"
                  aria-label={t('time_remaining_in_the_round')}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={timerProgressPercent}
                  aria-valuetext={remainingTimeLabel}
                  style={{ '--progress-width': `${timerProgressPercent}%` }}
                >
                  <span />
                </div>
              )}
            </div>

            <div className="planning-poker-room__live-progress-item planning-poker-room__live-progress-item--state">
              <div className="planning-poker-room__live-progress-head">
                <span>{t('facilitation')}</span>
                <strong>{revealReadinessLabel}</strong>
              </div>
              <p>{revealReadinessDescription}</p>
            </div>
          </div>
          <p className="planning-poker-room__guidance">{roomGuidance}</p>

          {!canFacilitate && participantPanel ? (
            <div
              className={`planning-poker-room__participant-panel planning-poker-room__participant-panel--${participantPanel.tone}`}
              aria-label={t('your_planning_poker_participation')}
            >
              <div className="planning-poker-room__participant-panel-copy">
                <p className="projects-page__eyebrow">{t('your_participation')}</p>
                <h3>{participantPanel.title}</h3>
                <p>{participantPanel.description}</p>
              </div>
              <div className="planning-poker-room__participant-panel-meta">
                <span>
                  <small>{t('your_role')}</small>
                  <strong>{participantPanel.role}</strong>
                </span>
                <span>
                  <small>{t('status')}</small>
                  <strong>{participantPanel.status}</strong>
                </span>
                <span>
                  <small>{t('next_step')}</small>
                  <strong>{participantPanel.action}</strong>
                </span>
              </div>
            </div>
          ) : null}

          {shouldShowVotingDeck ? (
            <>
              <div className="planning-poker-room__cards-headline">
                <div>
                  <p className="projects-page__eyebrow">{t('team_cards')}</p>
                  <h3>{t('choose_your_card_2')}</h3>
                </div>
                <span>{t('nobody_sees_votes_before_the_reveal')}</span>
              </div>

              <div className="planning-poker-room__cards" aria-label={t('estimation_cards')}>
                {scoringValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="planning-poker-room__card"
                    onClick={() => handleVote(value)}
                    disabled={!canCastVote || isActing}
                  >
                    {value}
                  </button>
                ))}
                {session?.allow_abstention ? (
                  <button
                    type="button"
                    className="planning-poker-room__card planning-poker-room__card--muted"
                    onClick={handleAbstain}
                    disabled={!canCastVote || isActing}
                  >
                    {t('abstain')}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="planning-poker-room__deck-state" aria-label={t('round_card_status')}>
              <div>
                <p className="projects-page__eyebrow">{t('team_cards')}</p>
                <h3>{roomClosed || storyLocked ? t('voting_closed') : t('waiting_for_a_round')}</h3>
                <p>
                  {roomClosed || storyLocked
                    ? t('the_cards_are_stored_in_the_history')
                    : t('cards_appear_when_the_facilitator_opens_voting')}
                </p>
              </div>
              <span>{voteVisibilityLabel}</span>
            </div>
          )}

          {canFacilitate ? (
            <div className="planning-poker-room__facilitator" aria-label={t('facilitator_controls')}>
              <div className="planning-poker-room__facilitator-copy">
                <p className="projects-page__eyebrow">{t('facilitator')}</p>
                <h3>{facilitatorPanel.title}</h3>
                <p>{facilitatorPanel.description}</p>
              </div>
              {shouldShowFacilitatorActions ? (
                <>
                  <div className="planning-poker-room__facilitator-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={handleStartRound}
                      disabled={!canStartRound}
                    >
                      {currentRound ? t('start_another_round') : t('start_round')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleRevealRound}
                      disabled={!canRevealRound}
                    >
                      {t('reveal_cards')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={handleSkipStory}
                      disabled={!currentStory || currentStory.status === 'estimated' || isActing}
                    >
                      {t('skip_story')}
                    </button>
                  </div>
                  {revealActionHint ? <p className="planning-poker-room__action-hint">{revealActionHint}</p> : null}
                </>
              ) : (
                <div className="planning-poker-room__facilitator-state" role="status">
                  <span>{facilitatorStateLabel}</span>
                  <p>
                    {roomClosed
                      ? t('facilitator_controls_are_closed_use_this_page')
                      : t('select_a_pending_story_to_reopen_the')}
                  </p>
                  {storyLocked && nextPendingStory ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={handleSelectNextPendingStory}
                      disabled={!canSelectNextPendingStory}
                    >
                      {t('select_next_pending_story')}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {shouldShowResult && visibleSummary ? (
            <section className="planning-poker-room__result" aria-label={t('round_result')}>
              {consensusInsight ? (
                <div
                  className={`planning-poker-room__consensus planning-poker-room__consensus--${consensusInsight.tone}`}
                >
                  <div>
                    <p className="projects-page__eyebrow">{t('round_decision')}</p>
                    <h3>{consensusInsight.label}</h3>
                    <p>{consensusInsight.description}</p>
                  </div>
                  <div className="planning-poker-room__consensus-score">
                    <span>{t('suggested_consensus')}</span>
                    <strong>{consensusInsight.suggestion || '-'}</strong>
                  </div>
                </div>
              ) : null}

              {storyFinalEstimate && currentStory?.status === 'estimated' ? (
                <div className="planning-poker-room__sealed-result" role="status">
                  <div>
                    <p className="projects-page__eyebrow">{t('estimate_sealed')}</p>
                    <h3>{storyFinalEstimate}</h3>
                    <p>{t('the_final_decision_is_recorded_in_the')}</p>
                  </div>
                  <span>{formatDateTime(currentStoryResult?.created_at ?? currentStory?.updated_at, language)}</span>
                </div>
              ) : null}

              <div className="planning-poker-room__result-actions" aria-label={t('round_result_actions')}>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleCopyRoundResult}
                  disabled={!visibleSummary}
                >
                  {t('copy_result')}
                </button>
                {nextPendingStory ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={handleSelectNextPendingStory}
                  >
                    {t('next_pending_story')}
                  </button>
                ) : null}
              </div>

              <details className="planning-poker-room__result-details" open={!storyFinalEstimate}>
                <summary>
                  <span>{t('round_metrics')}</span>
                  <strong>{storyFinalEstimate ? t('final', { p1: storyFinalEstimate }) : t('suggestion', { p1: visibleSummary.suggestion || '-' })}</strong>
                </summary>
                <div className="planning-poker-room__summary-grid">
                  {storyFinalEstimate ? <span>{t('final_2')}{" "}{storyFinalEstimate}</span> : null}
                  <span>{t('average_2')}{" "}{formatNumber(visibleSummary.average, language)}</span>
                  <span>{t('median_2')}{" "}{formatNumber(visibleSummary.median, language)}</span>
                  <span>{t('lowest')}{" "}{formatNumber(visibleSummary.lowest, language)}</span>
                  <span>{t('highest')}{" "}{formatNumber(visibleSummary.highest, language)}</span>
                  <span>{t('spread_2')}{" "}{formatNumber(visibleSummary.divergence, language)}</span>
                  {visibleSummary.voteCount !== null && visibleSummary.voteCount !== undefined ? (
                    <span>{t('votes_2')}{" "}{visibleSummary.voteCount}</span>
                  ) : null}
                  {visibleSummary.abstentionCount !== null && visibleSummary.abstentionCount !== undefined ? (
                    <span>{t('abstentions_2')}{" "}{visibleSummary.abstentionCount}</span>
                  ) : null}
                  {visibleSummary.unknownCount !== null && visibleSummary.unknownCount !== undefined ? (
                    <span>{t('not_sure_2')}{" "}{visibleSummary.unknownCount}</span>
                  ) : null}
                </div>
              </details>

              <details className="planning-poker-room__result-details" open={!storyFinalEstimate}>
                <summary>
                  <span>{t('votes_revealed')}</span>
                  <strong>{currentRoundVotes.length}{" "}{t('revealed_cards')}</strong>
                </summary>
                <div className="planning-poker-room__revealed-votes" aria-label={t('votes_revealed')}>
                  {currentRoundVotes.length > 0 ? (
                    currentRoundVotes.map((vote) => {
                      const participantIndex = participants.findIndex(
                        (participant) => participant.id === vote.participant_id,
                      )
                      const participant = participants[participantIndex]

                      return (
                        <div key={vote.id} className="planning-poker-room__revealed-vote">
                          <span>{getParticipantLabel(participant, userId, participantIndex, t)}</span>
                          <strong>{getVoteLabel(vote, t)}</strong>
                        </div>
                      )
                    })
                  ) : (
                    <p className="planning-poker-room__result-note">
                      {t('individual_votes_are_available_after_the_cards')}
                    </p>
                  )}
                </div>
              </details>

              {session?.status === 'completed' && allStoriesResolved ? (
                <p className="planning-poker-room__result-note">
                  {t('all_stories_in_this_session_were_completed')}
                </p>
              ) : null}

              {canFacilitate && currentRound?.status === 'revealed' && currentStory?.status !== 'estimated' ? (
                <form
                  className="planning-poker-room__seal"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSealEstimate()
                  }}
                >
                  <div className="planning-poker-room__seal-copy">
                    <p className="projects-page__eyebrow">{t('final_estimate')}</p>
                    <h3>{t('seal_decision')}</h3>
                    <p>
                      {t('enter_the_agreed_estimate_the_suggestion_uses')}
                    </p>
                  </div>
                  <div className="planning-poker-room__seal-controls">
                    <label className="projects-page__field">
                      <span>{t('final_value')}</span>
                      <input
                        type="text"
                        value={finalEstimate}
                        onChange={(event) => setFinalEstimate(event.target.value)}
                        placeholder={visibleSummary.suggestion || t('e_g_5')}
                        disabled={isActing}
                      />
                    </label>
                    {consensusInsight?.suggestion ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => setFinalEstimate(consensusInsight.suggestion)}
                        disabled={isActing}
                      >
                        {t('use_suggestion')}
                      </button>
                    ) : null}
                    <button type="submit" className="btn btn-primary btn-small" disabled={!canSealEstimate}>
                      {t('seal_estimate')}
                    </button>
                    {visibleSummary?.suggestion && !finalEstimate ? (
                      <p className="planning-poker-room__seal-note">
                        {t('if_you_leave_the_field_as_is')}{" "}{visibleSummary.suggestion}{" "}{t('will_be_used')}
                      </p>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}
        </main>

        <aside className="panel planning-poker-room__guild" aria-label={t('team_members')}>
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">{t('team_2')}</p>
              <h2>{t('member_count', { count: participants.length })}</h2>
              <p className="planning-poker-room__guild-summary">{guildSummaryLabel}</p>
            </div>
          </div>

          <div className="planning-poker-room__participant-list">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className={`planning-poker-room__participant planning-poker-room__participant--${getParticipantRoomTone(participant)}`}
              >
                <span>{getParticipantLabel(participant, userId, index, t)}</span>
                <strong>{getParticipantRoomStatus(participant)}</strong>
              </div>
            ))}
          </div>

          <div className="planning-poker-room__guild-progress" aria-label={t('team_voting_progress')}>
            <div className="planning-poker-room__guild-progress-header">
              <span>{t('current_round')}</span>
              <strong>{votingProgressLabel}</strong>
            </div>
            <div
              className="planning-poker-room__story-progress-bar"
              role="progressbar"
              aria-label={t('votes_submitted_by_the_team')}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={votingProgressPercent}
            >
              <span style={{ width: `${votingProgressPercent}%` }} />
            </div>
            <p>{t('hidden_vote_values', { visibility: voteVisibilityLabel })}</p>
          </div>

          {canFacilitate ? (
            <form className="planning-poker-room__invite-member" onSubmit={handleInviteProjectMember}>
              <div>
                <span>{t('invite_participant')}</span>
                <strong>{t('add_and_send_invite')}</strong>
                <p>
                  {t('the_participant_signs_in_with_this_email')}
                </p>
              </div>
              {canManageProject ? (
                <>
                  <label className="projects-page__field">
                    <span>{t('participant_email')}</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder={t('participant_example_com')}
                      disabled={isAddingInviteMember}
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn btn-secondary btn-small"
                    disabled={isAddingInviteMember || !session}
                  >
                    {isAddingInviteMember ? t('sending_invite') : t('add_and_send_invite')}
                  </button>
                </>
              ) : (
                <p className="planning-poker-room__invite-note">
                  {t('only_project_owners_and_administrators_can_grant')}
                </p>
              )}
              {inviteMessage ? <p className="planning-poker-room__invite-note" role="status">{formatNotice(t, inviteMessage)}</p> : null}
            </form>
          ) : null}

          <div className="planning-poker-room__session-meta">
            <span>{t('status_2')}{" "}{getSessionStatusLabel(session?.status, t)}</span>
            <span>{t('scale_2')}{" "}{scoringScaleLabel}</span>
            <span>{t('voting_participants')}{" "}{eligibleVoters.length}</span>
            <span>{revotePolicyLabel}</span>
            <span>{revealPolicyLabel}</span>
            <span>{t('created_on')}{" "}{formatDateTime(session?.created_at, language)}</span>
          </div>

          {canFacilitate ? (
            <div
              className={`planning-poker-room__session-control planning-poker-room__session-control--${sessionControlPanel.tone}`}
              role="status"
            >
              <div>
                <strong>{sessionControlPanel.title}</strong>
                <span>{sessionControlPanel.description}</span>
              </div>
              {sessionControlPanel.actionLabel ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleCompleteSession}
                  disabled={isActing}
                >
                  {sessionControlPanel.actionLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default PlanningPokerRoomPage
