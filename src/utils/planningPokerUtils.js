export const PLANNING_SESSION_STATUS_LABELS = {
  draft: 'Rascunho',
  active: 'Ativa',
  voting: 'Em votação',
  revealed: 'Votos revelados',
  completed: 'Finalizada',
  canceled: 'Cancelada',
}

export const PLANNING_STORY_STATUS_LABELS = {
  pending: 'Pendente',
  voting: 'Em votação',
  estimated: 'Estimada',
  skipped: 'Pulada',
}

export const PLANNING_ROUND_STATUS_LABELS = {
  voting: 'Votação aberta',
  revealed: 'Runas reveladas',
  closed: 'Rodada encerrada',
  canceled: 'Rodada cancelada',
}

export const PLANNING_SCORING_SCALE_LABELS = {
  fibonacci: 'Fibonacci',
  tshirt: 'Tamanho de camiseta',
  custom: 'Customizada',
}

export const LIVE_PLANNING_SESSION_STATUSES = ['active', 'voting', 'revealed']

export function getPlanningSessionStatusLabel(status) {
  return PLANNING_SESSION_STATUS_LABELS[status] ?? 'Rascunho'
}

export function getPlanningStoryStatusLabel(status) {
  return PLANNING_STORY_STATUS_LABELS[status] ?? 'Pendente'
}

export function getPlanningRoundStatusLabel(status) {
  return PLANNING_ROUND_STATUS_LABELS[status] ?? 'Sem rodada ativa'
}

export function getPlanningScoringScaleLabel(scoringScale) {
  return PLANNING_SCORING_SCALE_LABELS[scoringScale] ?? 'Fibonacci'
}

export function formatPlanningCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatPlanningTimerDuration(seconds) {
  const numericSeconds = Number(seconds)
  if (!Number.isFinite(numericSeconds) || numericSeconds <= 0) return 'Sem timer'

  if (numericSeconds < 60) {
    return formatPlanningCount(numericSeconds, 'segundo', 'segundos')
  }

  const minutes = Math.round(numericSeconds / 60)
  return formatPlanningCount(minutes, 'minuto', 'minutos')
}

export function formatRemainingTime(endsAt, currentTime) {
  if (!endsAt) return 'Sem timer'
  if (!currentTime) return 'Atualizando timer'

  const remainingMs = new Date(endsAt).getTime() - currentTime
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Tempo encerrado'

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

export function getPlanningSessionProgress(stories = []) {
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
        ? `${formatPlanningCount(resolved, 'história resolvida', 'histórias resolvidas')} de ${total}`
        : 'Sem histórias vinculadas',
    pending,
    progressPercent: total > 0 ? Math.round((resolved / total) * 100) : 0,
    resolved,
    skipped,
    total,
    voting,
  }
}

export function getPlanningSessionProgressById(sessions = [], storiesBySession = {}) {
  return sessions.reduce((progressById, session) => {
    progressById[session.id] = getPlanningSessionProgress(storiesBySession[session.id] ?? [])
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

export function buildPlanningSessionSummaryMarkdown({
  participantsCount = null,
  progress,
  projectName = '',
  session,
  stories = [],
}) {
  const safeProgress = progress ?? getPlanningSessionProgress(stories)
  const lines = [
    '# Roda da Fogueira',
    '',
    `**Sessão:** ${session?.name ?? '-'}`,
  ]

  if (projectName) lines.push(`**Projeto:** ${projectName}`)

  lines.push(
    `**Status:** ${getPlanningSessionStatusLabel(session?.status)}`,
    `**Código:** ${session?.invite_code ?? '-'}`,
    `**Escala:** ${getPlanningScoringScaleLabel(session?.scoring_scale)}`,
    `**Timer:** ${formatPlanningTimerDuration(session?.vote_time_limit_seconds)}`,
  )

  if (participantsCount !== null) lines.push(`**Participantes votantes:** ${participantsCount}`)

  lines.push(`**Progresso:** ${safeProgress.label}`, '', '## Histórias')

  if (stories.length === 0) {
    lines.push('- Nenhuma história vinculada.')
    return lines.join('\n')
  }

  stories.forEach((story, index) => {
    const title = story.user_story?.title ?? `História ${index + 1}`
    const estimate = story.final_estimate ? ` · Final: ${story.final_estimate}` : ''
    lines.push(`- ${title} · ${getPlanningStoryStatusLabel(story.status)}${estimate}`)
  })

  return lines.join('\n')
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
