import portuguese from '../i18n/locales/pt-BR/planning.json'

function defaultPlanningCopy(key, values = {}) {
  return portuguese[key].replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name]))
}

function portugueseLabels(keys) {
  return Object.fromEntries(Object.entries(keys).map(([code, key]) => [code, defaultPlanningCopy(key)]))
}
const PLANNING_SESSION_STATUS_KEYS = {
  draft: 'draft',
  active: 'active',
  voting: 'voting',
  revealed: 'votes_revealed',
  completed: 'completed',
  canceled: 'canceled',
}

const PLANNING_STORY_STATUS_KEYS = {
  pending: 'pending_3',
  voting: 'voting',
  estimated: 'estimated_3',
  skipped: 'skipped_3',
}

const PLANNING_ROUND_STATUS_KEYS = {
  voting: 'voting_open',
  revealed: 'cards_revealed_2',
  closed: 'round_closed',
  canceled: 'round_canceled',
}

const PLANNING_SCORING_SCALE_KEYS = {
  fibonacci: 'fibonacci',
  tshirt: 't_shirt_sizes',
  custom: 'custom',
}

export const PLANNING_SESSION_STATUS_LABELS = portugueseLabels(PLANNING_SESSION_STATUS_KEYS)
export const PLANNING_STORY_STATUS_LABELS = portugueseLabels(PLANNING_STORY_STATUS_KEYS)
export const PLANNING_ROUND_STATUS_LABELS = portugueseLabels(PLANNING_ROUND_STATUS_KEYS)
export const PLANNING_SCORING_SCALE_LABELS = portugueseLabels(PLANNING_SCORING_SCALE_KEYS)

export const LIVE_PLANNING_SESSION_STATUSES = ['active', 'voting', 'revealed']

export function getPlanningSessionStatusLabel(status, t = defaultPlanningCopy) {
  const key = PLANNING_SESSION_STATUS_KEYS[status]
  return t(typeof key === 'string' ? key : 'draft')
}

export function getPlanningStoryStatusLabel(status, t = defaultPlanningCopy) {
  const key = PLANNING_STORY_STATUS_KEYS[status]
  return t(typeof key === 'string' ? key : 'pending_3')
}

export function getPlanningRoundStatusLabel(status, t = defaultPlanningCopy) {
  const key = PLANNING_ROUND_STATUS_KEYS[status]
  return t(typeof key === 'string' ? key : 'no_active_round')
}

export function getPlanningScoringScaleLabel(scoringScale, t = defaultPlanningCopy) {
  const key = PLANNING_SCORING_SCALE_KEYS[scoringScale]
  return t(typeof key === 'string' ? key : 'fibonacci')
}

export function formatPlanningCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatPlanningTimerDuration(seconds, t = defaultPlanningCopy) {
  const numericSeconds = Number(seconds)
  if (!Number.isFinite(numericSeconds) || numericSeconds <= 0) return t('no_timer')

  if (numericSeconds < 60) {
    return formatPlanningCount(numericSeconds, t('second'), t('seconds'))
  }

  const minutes = Math.round(numericSeconds / 60)
  return formatPlanningCount(minutes, t('minute'), t('minutes'))
}

export function formatRemainingTime(endsAt, currentTime, t = defaultPlanningCopy) {
  if (!endsAt) return t('no_timer')
  if (!currentTime) return t('updating_timer')

  const remainingMs = new Date(endsAt).getTime() - currentTime
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return t('time_is_up')

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function isRoundTimerExpired(endsAt, currentTime) {
  if (!endsAt || !currentTime) return false

  const endsAtMs = new Date(endsAt).getTime()
  return Number.isFinite(endsAtMs) && currentTime >= endsAtMs
}

export function getPlanningSessionSortWeight(status) {
  if (status === 'voting') return 0
  if (status === 'revealed') return 1
  if (status === 'active') return 2
  if (status === 'draft') return 3
  if (status === 'completed') return 4
  if (status === 'canceled') return 5
  return 6
}

export function getPlanningSessionProgress(stories = [], t = defaultPlanningCopy) {
  const total = stories.length
  const estimated = stories.filter((story) => story.status === 'estimated').length
  const skipped = stories.filter((story) => story.status === 'skipped').length
  const voting = stories.filter((story) => story.status === 'voting').length
  const pending = stories.filter((story) => story.status === 'pending').length
  const resolved = estimated + skipped

  return {
    estimated,
    label:
      total > 0
        ? t('of_2', { p1: formatPlanningCount(resolved, t('resolved_story'), t('resolved_stories')), p2: total })
        : t('no_linked_stories'),
    pending,
    progressPercent: total > 0 ? Math.round((resolved / total) * 100) : 0,
    resolved,
    skipped,
    total,
    voting,
  }
}

export function getPlanningSessionProgressById(sessions = [], storiesBySession = {}, t = defaultPlanningCopy) {
  return sessions.reduce((progressById, session) => {
    progressById[session.id] = getPlanningSessionProgress(storiesBySession[session.id] ?? [], t)
    return progressById
  }, {})
}

export function getActivePlanningStorySessionByStoryId(sessions = [], storiesBySession = {}) {
  return sessions.reduce((storySessionById, session) => {
    if (!LIVE_PLANNING_SESSION_STATUSES.includes(session.status)) return storySessionById

    const stories = storiesBySession[session.id] ?? []
    stories.forEach((story) => {
      if (story.user_story_id && !storySessionById[story.user_story_id]) {
        storySessionById[story.user_story_id] = session
      }
    })

    return storySessionById
  }, {})
}

export function getPlanningStorySessionIndex(sessions = [], storiesBySession = {}) {
  const entries = sessions.flatMap((session) =>
    (storiesBySession[session.id] ?? []).map((story) => {
      const isLive = LIVE_PLANNING_SESSION_STATUSES.includes(session.status)
      const hasEstimate = story.status === 'estimated' || Boolean(story.final_estimate)

      return {
        finalEstimate: story.final_estimate ?? '',
        isLive,
        priority: isLive ? 0 : hasEstimate ? 1 : 2,
        session,
        story,
        storyId: story.user_story_id,
      }
    }),
  )

  return entries
    .filter((entry) => Boolean(entry.storyId))
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority

      const leftDate = new Date(left.story.updated_at ?? left.story.estimated_at ?? left.session.updated_at ?? left.session.created_at ?? 0)
        .getTime()
      const rightDate = new Date(right.story.updated_at ?? right.story.estimated_at ?? right.session.updated_at ?? right.session.created_at ?? 0)
        .getTime()

      return rightDate - leftDate
    })
    .reduce((index, entry) => {
      if (!index[entry.storyId]) {
        index[entry.storyId] = entry
      }

      return index
    }, {})
}

export function buildPlanningSessionSummaryMarkdown({
  participantsCount = null,
  progress,
  projectName = '',
  session,
  stories = [],
}, t = defaultPlanningCopy) {
  const safeProgress = progress ?? getPlanningSessionProgress(stories, t)
  const lines = [
    t('planning_poker_2'),
    '',
    t('session', { p1: session?.name ?? '-' }),
  ]

  if (projectName) lines.push(t('project_2', { p1: projectName }))

  lines.push(
    t('status_3', { p1: getPlanningSessionStatusLabel(session?.status, t) }),
    t('code_3', { p1: session?.invite_code ?? '-' }),
    t('scale_3', { p1: getPlanningScoringScaleLabel(session?.scoring_scale, t) }),
    t('timer_2', { p1: formatPlanningTimerDuration(session?.vote_time_limit_seconds, t) }),
  )

  if (participantsCount !== null) lines.push(t('voting_participants_2', { p1: participantsCount }))

  lines.push(t('progress_2', { p1: safeProgress.label }), '', t('stories_2'))

  if (stories.length === 0) {
    lines.push(t('no_linked_stories_3'))
    return lines.join('\n')
  }

  stories.forEach((story, index) => {
    const title = story.user_story?.title ?? t('story', { p1: index + 1 })
    const estimate = story.final_estimate ? t('final_3', { p1: story.final_estimate }) : ''
    lines.push(`- ${title} · ${getPlanningStoryStatusLabel(story.status, t)}${estimate}`)
  })

  return lines.join('\n')
}

export function buildPlanningAccessRequestMessage({ email = '', inviteCode = '', inviteUrl = '' } = {}, t = defaultPlanningCopy) {
  const safeEmail = String(email ?? '').trim()
  const safeInviteCode = String(inviteCode ?? '').trim().toUpperCase() || t('unspecified')
  const safeInviteUrl = String(inviteUrl ?? '').trim()
  const emailLine = safeEmail
    ? t('my_sign_in_email_is', { p1: safeEmail })
    : t('i_use_the_email_registered_with_prodforge')
  const accessLine = safeInviteUrl
    ? t('room_link', { p1: safeInviteUrl })
    : t('session_code', { p1: safeInviteCode })

  return [
    t('hi_i_m_trying_to_join_a'),
    emailLine,
    accessLine,
    t('could_you_add_my_email_to_the'),
  ].join('\n')
}

export function getPlanningStorySearchText(story) {
  return [
    story?.user_story?.title,
    story?.user_story?.input_context,
    story?.user_story?.user_story,
    story?.final_estimate,
    getPlanningStoryStatusLabel(story?.status),
  ]
    .filter(Boolean)
    .join(' ')
}
