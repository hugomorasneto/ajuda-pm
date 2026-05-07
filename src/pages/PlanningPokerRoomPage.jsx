import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { checkCanManageProject } from '../services/projectsService'
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

const SESSION_STATUS_LABELS = {
  draft: 'Rascunho',
  active: 'Ativa',
  voting: 'Em votação',
  revealed: 'Votos revelados',
  completed: 'Finalizada',
  canceled: 'Cancelada',
}

const STORY_STATUS_LABELS = {
  pending: 'Pendente',
  voting: 'Em votação',
  estimated: 'Estimada',
  skipped: 'Pulada',
}

const ROUND_STATUS_LABELS = {
  voting: 'Votação aberta',
  revealed: 'Runas reveladas',
  closed: 'Rodada encerrada',
  canceled: 'Rodada cancelada',
}

const SCORING_SCALE_LABELS = {
  fibonacci: 'Fibonacci',
  tshirt: 'Tamanho de camiseta',
  custom: 'Customizada',
}

function getSessionStatusLabel(status) {
  return SESSION_STATUS_LABELS[status] ?? 'Rascunho'
}

function getStoryStatusLabel(status) {
  return STORY_STATUS_LABELS[status] ?? 'Pendente'
}

function getRoundStatusLabel(status) {
  return ROUND_STATUS_LABELS[status] ?? 'Sem rodada ativa'
}

function getScoringScaleLabel(scoringScale) {
  return SCORING_SCALE_LABELS[scoringScale] ?? 'Fibonacci'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatRemainingTime(endsAt, currentTime) {
  if (!endsAt) return 'Sem timer'
  if (!currentTime) return 'Atualizando timer'

  const remainingMs = new Date(endsAt).getTime() - currentTime
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Tempo encerrado'

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isRoundTimerExpired(endsAt, currentTime) {
  if (!endsAt || !currentTime) return false

  const endsAtMs = new Date(endsAt).getTime()
  return Number.isFinite(endsAtMs) && currentTime >= endsAtMs
}

function getParticipantLabel(participant, currentUserId, index) {
  if (!participant) return '-'
  if (participant.user_id === currentUserId) return 'Você'
  return participant.display_name || `Membro da guilda ${index + 1}`
}

function getMedian(values) {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function buildInviteUrl({ inviteCode, projectId, sessionId }) {
  if (typeof window === 'undefined') return ''

  if (inviteCode) {
    return new URL(`/roda?codigo=${encodeURIComponent(inviteCode)}`, window.location.origin).toString()
  }

  return new URL(`/projetos/${projectId}/roda/${sessionId}`, window.location.origin).toString()
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
}) {
  const storyTitle = story?.user_story?.title ?? 'História sem título'
  const storyText = story?.user_story?.user_story ?? story?.user_story?.input_context ?? ''
  const resultLabel = finalEstimate || summary?.suggestion || '-'
  const lines = [
    '# Resultado da Roda da Fogueira',
    '',
    `**Sessão:** ${session?.name ?? '-'}`,
    `**História:** ${storyTitle}`,
    `**Estimativa:** ${resultLabel}`,
    '',
    '## Métricas',
    `- Média: ${formatNumber(summary?.average)}`,
    `- Mediana: ${formatNumber(summary?.median)}`,
    `- Menor voto: ${formatNumber(summary?.lowest)}`,
    `- Maior voto: ${formatNumber(summary?.highest)}`,
    `- Divergência: ${formatNumber(summary?.divergence)}`,
    `- Votos: ${summary?.voteCount ?? '-'}`,
    `- Abstenções: ${summary?.abstentionCount ?? '-'}`,
    `- Não sei: ${summary?.unknownCount ?? '-'}`,
  ]

  if (storyText) {
    lines.push('', '## User story', storyText)
  }

  if (votes.length > 0) {
    lines.push('', '## Votos revelados')
    votes.forEach((vote) => {
      const participantIndex = participants.findIndex((participant) => participant.id === vote.participant_id)
      const participant = participants[participantIndex]
      lines.push(`- ${getParticipantLabel(participant, currentUserId, participantIndex)}: ${vote.vote_value}`)
    })
  }

  return lines.join('\n')
}

function PlanningPokerRoomPage() {
  const { projectId, sessionId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const hasJoinedRef = useRef(false)
  const reloadTimerRef = useRef(null)
  const [session, setSession] = useState(null)
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
  const [notFound, setNotFound] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const inviteUrl = useMemo(
    () => buildInviteUrl({ inviteCode: session?.invite_code, projectId, sessionId }),
    [projectId, session?.invite_code, sessionId],
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
        label: 'Sem consenso numérico',
        description: 'A rodada teve votos não numéricos ou ainda não possui estimativas suficientes para calcular divergência.',
        suggestion,
      }
    }

    if (numericDivergence === 0) {
      return {
        tone: 'strong',
        label: 'Consenso forte',
        description: 'Todos os votos numéricos convergiram para o mesmo valor. A estimativa já pode ser selada.',
        suggestion,
      }
    }

    if (numericDivergence <= 2) {
      return {
        tone: 'good',
        label: 'Alinhamento alto',
        description: 'A divergência é baixa. Confirme se há algum ponto aberto antes de selar a estimativa.',
        suggestion,
      }
    }

    if (numericDivergence <= 5) {
      return {
        tone: 'attention',
        label: 'Divergência moderada',
        description: 'Vale discutir os votos extremos antes de decidir se a mediana representa o consenso.',
        suggestion,
      }
    }

    return {
      tone: 'risk',
      label: 'Divergência alta',
      description: 'A guilda está desalinhada. Reabra a conversa ou faça uma nova rodada após esclarecer a história.',
      suggestion,
    }
  }, [shouldShowResult, storyFinalEstimate, visibleSummary])
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
  const votingProgressLabel = eligibleVoters.length > 0
    ? `${votedCount}/${eligibleVoters.length} votantes`
    : 'Sem votantes'
  const roomClosed = session?.status === 'completed' || session?.status === 'canceled'
  const storyLocked = ['estimated', 'skipped'].includes(currentStory?.status)
  const voteVisibilityLabel = shouldShowResult
    ? roomClosed
      ? 'Resultado salvo'
      : 'Votos revelados'
    : currentRound?.status === 'voting'
      ? 'Votos ocultos'
      : 'Sem rodada ativa'
  const resolvedStoriesCount = storyStatusCounts.estimated + storyStatusCounts.skipped
  const roomProgressLabel =
    sessionStories.length > 0
      ? `${resolvedStoriesCount}/${sessionStories.length} histórias concluídas`
      : 'Sem histórias'
  const roomProgressPercent =
    sessionStories.length > 0 ? Math.round((resolvedStoriesCount / sessionStories.length) * 100) : 0
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
  const facilitatorStateLabel = roomClosed
    ? getSessionStatusLabel(session?.status)
    : storyLocked
      ? getStoryStatusLabel(currentStory?.status)
      : ''
  const sessionCompletionLabel =
    session?.status === 'completed'
      ? 'Sessão finalizada'
      : session?.status === 'canceled'
        ? 'Sessão cancelada'
        : ''
  const guildSummaryLabel = roomClosed
    ? `${votedCount}/${eligibleVoters.length} votantes participaram da rodada selecionada.`
    : currentRound?.status === 'voting'
      ? `${votedCount}/${eligibleVoters.length} votantes já registraram presença.`
      : 'A presença da guilda será atualizada durante a votação.'
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
  const revotePolicyLabel = session?.allow_revote ? 'Novo voto permitido' : 'Voto único'
  const revealPolicyLabel = session?.reveal_votes_after_all
    ? 'Revelação após todos votarem'
    : 'Revelação pelo facilitador'
  const scoringScaleLabel = getScoringScaleLabel(session?.scoring_scale)
  const revealActionHint =
    currentRound?.status === 'voting'
      ? votingExpired
        ? 'Tempo encerrado. Os votos restantes foram bloqueados e o facilitador pode revelar as runas.'
        : requiresFullVotingBeforeReveal && hasPendingVotes
        ? 'A revelação está bloqueada até todos os votantes registrarem presença.'
        : 'As runas podem ser reveladas pelo facilitador quando fizer sentido para a discussão.'
      : null
  const getParticipantRoomStatus = useCallback(
    (participant) => {
      if (participant.role === 'observer') return 'Observador'

      const voted = currentRoundVoteStatus.some(
        (status) => status.participant_id === participant.id && status.has_voted,
      )

      if (voted) return roomClosed ? 'Voto registrado' : 'Votou'
      if (roomClosed) return 'Sem voto'
      if (currentRound?.status === 'revealed') return 'Não votou'
      if (currentRound?.status === 'voting') return 'Aguardando voto'

      return 'Aguardando rodada'
    },
    [currentRound?.status, currentRoundVoteStatus, roomClosed],
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
    return formatRemainingTime(currentRound?.status === 'voting' ? currentRound.ends_at : null, nowTick)
  }, [currentRound?.ends_at, currentRound?.status, nowTick])
  const allStoriesResolved = Boolean(
    sessionStories.length > 0 &&
      sessionStories.every((story) => ['estimated', 'skipped'].includes(story.status)),
  )
  const roomStage = useMemo(() => {
    if (session?.status === 'completed') {
      return {
        tone: 'closed',
        label: 'Roda finalizada',
        description: allStoriesResolved
          ? 'Todas as histórias foram concluídas e salvas no histórico.'
          : 'A sessão foi finalizada e permanece disponível para consulta.',
      }
    }

    if (session?.status === 'canceled') {
      return {
        tone: 'closed',
        label: 'Roda cancelada',
        description: 'A sessão foi encerrada sem novas votações.',
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        tone: 'revealed',
        label: 'Runas reveladas',
        description: 'Compare os votos, discuta a divergência e sele a estimativa final.',
      }
    }

    if (currentRound?.status === 'voting') {
      return {
        tone: votingExpired ? 'expired' : 'voting',
        label: votingExpired ? 'Tempo encerrado' : 'Votação em andamento',
        description: votingExpired
          ? 'Os votos restantes foram bloqueados. O facilitador pode revelar as runas.'
          : 'As cartas seguem ocultas para todos até a revelação.',
      }
    }

    if (currentStory?.status === 'estimated') {
      return {
        tone: 'closed',
        label: 'História estimada',
        description: 'Selecione outra história pendente ou finalize a sessão.',
      }
    }

    if (currentStory?.status === 'skipped') {
      return {
        tone: 'closed',
        label: 'História pulada',
        description: 'Selecione outra história para continuar a Roda.',
      }
    }

    return {
      tone: 'idle',
      label: canFacilitate ? 'Pronta para iniciar' : 'Aguardando facilitador',
      description: canFacilitate
        ? 'Acenda a fogueira para abrir a votação da história atual.'
        : 'O facilitador inicia a rodada quando a guilda estiver pronta.',
    }
  }, [allStoriesResolved, canFacilitate, currentRound?.status, currentStory?.status, session?.status, votingExpired])
  const facilitatorPanel = useMemo(() => {
    if (roomClosed) {
      return {
        title: 'Sessão encerrada',
        description: 'As ações de facilitação ficam bloqueadas após o encerramento da Roda.',
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        title: 'Selar ou reacender',
        description: 'Use o consenso da conversa para selar a estimativa ou abra nova rodada se a divergência persistir.',
      }
    }

    if (currentRound?.status === 'voting') {
      return {
        title: votingExpired ? 'Tempo encerrado' : 'Votação aberta',
        description: votingExpired
          ? 'Revele as runas para liberar a discussão dos votos.'
          : 'Acompanhe a presença dos votos sem ver valores individuais.',
      }
    }

    if (storyLocked) {
      return {
        title: 'História encerrada',
        description: 'Escolha outra história pendente para continuar a estimativa.',
      }
    }

    return {
      title: 'Comandos da Roda',
      description: 'Inicie a votação, revele as runas ou pule a história quando necessário.',
    }
  }, [currentRound?.status, roomClosed, storyLocked, votingExpired])
  const participantPanel = useMemo(() => {
    const roleLabel = currentParticipant?.role === 'observer' ? 'Observador' : 'Votante'

    if (roomClosed) {
      return {
        tone: 'closed',
        title: 'Roda encerrada',
        description: 'A sessão terminou. Você ainda pode consultar o resultado das histórias estimadas.',
        role: roleLabel,
        status: 'Consulta',
        action: 'Revisar resultado',
      }
    }

    if (!currentParticipant) {
      return {
        tone: 'idle',
        title: 'Entrando na guilda',
        description: 'Estamos registrando sua presença na sala antes de liberar a participação.',
        role: 'Carregando',
        status: 'Entrando',
        action: 'Aguardar',
      }
    }

    if (currentParticipant.role === 'observer') {
      return {
        tone: 'observer',
        title: 'Você está como observador',
        description: 'Acompanhe a conversa e os resultados. Observadores não votam nesta Roda.',
        role: roleLabel,
        status: currentRound?.status === 'revealed' ? 'Votos revelados' : 'Sem voto',
        action: currentRound?.status === 'revealed' ? 'Acompanhar discussão' : 'Aguardar revelação',
      }
    }

    if (currentRound?.status === 'voting') {
      if (votingExpired) {
        return {
          tone: 'expired',
          title: 'Tempo encerrado',
          description: 'A votação foi bloqueada pelo timer. Aguarde o facilitador revelar as runas.',
          role: roleLabel,
          status: hasUserVoted ? 'Voto registrado' : 'Sem voto',
          action: 'Aguardar revelação',
        }
      }

      if (hasUserVoted) {
        return {
          tone: 'ready',
          title: 'Voto registrado',
          description: session?.allow_revote
            ? 'Seu voto continua oculto. Você pode trocar a carta até a revelação.'
            : 'Seu voto continua oculto. Esta Roda não permite troca antes da revelação.',
          role: roleLabel,
          status: session?.allow_revote ? 'Troca permitida' : 'Troca bloqueada',
          action: 'Aguardar a guilda',
        }
      }

      return {
        tone: canVote ? 'voting' : 'idle',
        title: canVote ? 'Escolha sua carta' : 'Aguardando liberação',
        description: canVote
          ? 'Selecione uma runa. Ninguém vê o valor do seu voto antes da revelação.'
          : 'A votação está aberta, mas sua participação ainda não está liberada para esta rodada.',
        role: roleLabel,
        status: canVote ? 'Voto pendente' : 'Sem ação',
        action: canVote ? 'Votar agora' : 'Aguardar',
      }
    }

    if (currentRound?.status === 'revealed') {
      return {
        tone: 'revealed',
        title: 'Runas reveladas',
        description: 'Os votos estão visíveis. Participe da discussão antes da estimativa ser selada.',
        role: roleLabel,
        status: hasUserVoted ? 'Voto aberto' : 'Sem voto registrado',
        action: 'Discutir consenso',
      }
    }

    if (storyLocked) {
      return {
        tone: 'closed',
        title: 'História encerrada',
        description: 'Esta história já foi concluída nesta Roda. Aguarde a próxima seleção.',
        role: roleLabel,
        status: getStoryStatusLabel(currentStory?.status),
        action: 'Aguardar próxima história',
      }
    }

    return {
      tone: 'idle',
      title: 'Aguardando facilitador',
      description: 'A votação começa quando o facilitador acender a fogueira da história atual.',
      role: roleLabel,
      status: 'Sem rodada ativa',
      action: 'Aguardar início',
    }
  }, [
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
        ? 'Todas as histórias foram concluídas e a Roda foi finalizada automaticamente.'
        : 'Sessão finalizada. O histórico permanece disponível para consulta.'
    }

    if (session?.status === 'canceled') return 'Sessão cancelada.'

    if (currentRound?.status === 'voting') {
      if (votingExpired) {
        return canFacilitate
          ? 'Tempo encerrado. Os votos restantes foram bloqueados; revele as runas para seguir com a discussão.'
          : 'Tempo encerrado. Aguarde o facilitador revelar as runas.'
      }

      if (hasUserVoted) {
        const revoteCopy = session?.allow_revote
          ? 'Você ainda pode trocar sua carta antes da revelação.'
          : 'Esta Roda não permite novo voto.'

        return votedCount < eligibleVoters.length
          ? `Seu voto está registrado e segue oculto. ${revoteCopy} Aguardando outros membros da guilda.`
          : `Todos os votantes registraram presença. ${revoteCopy} O facilitador pode revelar as runas.`
      }

      return canVote && session?.reveal_votes_after_all
        ? 'Escolha uma carta. Ninguém vê votos individuais antes da revelação, e as runas só liberam após todos votarem.'
        : canVote
          ? 'Escolha uma carta. Ninguém vê votos individuais antes da revelação.'
        : 'Aguardando votos da guilda. Os valores permanecem ocultos até a revelação.'
    }

    if (currentRound?.status === 'revealed') {
      return 'Runas reveladas. Revise a divergência e sele a estimativa final.'
    }

    if (storyLocked) return 'Esta história já foi encerrada nesta Roda.'

    return canFacilitate
      ? 'Acenda a fogueira para abrir a votação desta história.'
      : 'Aguardando o facilitador iniciar a rodada.'
  }, [
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

    const [storiesResponse, participantsResponse, roundsResponse, resultsResponse, voteStatusResponse, manageResponse] =
      await Promise.all([
        listPlanningPokerSessionStories({ sessionId, userId }),
        listPlanningPokerParticipants({ sessionId, userId }),
        listPlanningPokerRounds({ sessionId, userId }),
        listPlanningPokerResults({ sessionId, userId }),
        listPlanningPokerVoteStatus({ sessionId, userId }),
        checkCanManageProject({ projectId: nextSession.project_id, userId }),
      ])

    const nextRounds = roundsResponse.success ? roundsResponse.data ?? [] : []
    const revealedRoundIds = nextRounds
      .filter((round) => ['revealed', 'closed'].includes(round.status))
      .map((round) => round.id)
    const votesResponses = await Promise.all(
      revealedRoundIds.map((roundId) => listPlanningPokerVotes({ roundId, userId })),
    )

    setSession(nextSession)
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
      label: 'Roda da Fogueira',
      title: session?.name ?? 'Sala de estimativa',
      pills: [
        { text: getSessionStatusLabel(session?.status) },
        { text: `${participants.length} membros` },
        { text: scoringScaleLabel },
        { text: currentRound ? getRoundStatusLabel(currentRound.status) : 'Sem rodada' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [currentRound, participants.length, scoringScaleLabel, session?.name, session?.status, setTopbarStatus])

  async function runAction(action, successMessage) {
    setMessage('')
    setIsActing(true)
    const response = await action()
    setIsActing(false)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível concluir a ação agora.')
      return null
    }

    if (successMessage) setMessage(successMessage)
    await loadRoom()
    return response.data
  }

  async function handleCopyInviteLink() {
    if (!inviteUrl) return

    setInviteMessage('')
    try {
      await copyTextToClipboard(inviteUrl)
      setInviteMessage('Link de convite copiado.')
    } catch {
      setInviteMessage('Não foi possível copiar o link agora.')
    }
  }

  async function handleCopyInviteCode() {
    if (!session?.invite_code) return

    setInviteMessage('')
    try {
      await copyTextToClipboard(session.invite_code)
      setInviteMessage('Código da sala copiado.')
    } catch {
      setInviteMessage('Não foi possível copiar o código agora.')
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
        }),
      )
      setMessage('Resultado da Roda copiado em Markdown.')
    } catch {
      setMessage('Não foi possível copiar o resultado agora.')
    }
  }

  function handleSelectNextPendingStory() {
    if (!nextPendingStory) return

    setSelectedSessionStoryId(nextPendingStory.id)
    setFinalEstimate('')
    setMessage('Próxima história pendente selecionada.')
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
      'Fogueira acesa. A votação está aberta.',
    )
  }

  async function handleVote(value) {
    if (!currentRound) return
    if (!canCastVote) {
      setMessage(votingExpired
        ? 'Tempo encerrado. Aguarde a revelação das runas.'
        : 'Seu voto já foi registrado e esta Roda não permite troca.'
      )
      return
    }

    const voteKind = value === '?' ? 'unknown' : 'estimate'
    await runAction(
      () => castPlanningPokerVote({ roundId: currentRound.id, voteValue: value, voteKind, userId }),
      'Voto registrado. Ele fica oculto até a revelação das runas.',
    )
  }

  async function handleAbstain() {
    if (!currentRound) return
    if (!canCastVote) {
      setMessage(votingExpired
        ? 'Tempo encerrado. Aguarde a revelação das runas.'
        : 'Seu voto já foi registrado e esta Roda não permite troca.'
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
      'Abstenção registrada. Ela fica oculta até a revelação das runas.',
    )
  }

  async function handleRevealRound() {
    if (!currentRound) return

    await runAction(
      () => revealPlanningPokerRound({ roundId: currentRound.id, userId }),
      'Runas reveladas.',
    )
  }

  async function handleSealEstimate() {
    if (!currentStory) return

    await runAction(
      () => sealPlanningPokerEstimate({ sessionStoryId: currentStory.id, finalEstimate, userId }),
      'Estimativa selada. Se todas as histórias foram concluídas, a Roda é finalizada automaticamente.',
    )
  }

  async function handleSkipStory() {
    if (!currentStory) return

    await runAction(
      () => skipPlanningPokerStory({ sessionStoryId: currentStory.id, userId }),
      'História pulada.',
    )
  }

  async function handleCompleteSession() {
    if (!session) return

    await runAction(
      () => completePlanningPokerSession({ sessionId: session.id, userId }),
      'Sessão finalizada.',
    )
  }

  if (notFound) {
    return <Navigate to={`/projetos/${projectId}`} replace />
  }

  return (
    <div className="planning-poker-room">
      <section className="panel planning-poker-room__hero">
        <div>
          <p className="projects-page__eyebrow">Roda da Fogueira</p>
          <h1>{session?.name ?? 'Carregando sala...'}</h1>
          <p>
            Estime uma história por vez, mantenha os votos ocultos e revele as runas quando a rodada estiver pronta.
          </p>
        </div>
        <div className="planning-poker-room__hero-actions">
          <div className="planning-poker-room__invite-box">
            <span>Código: {session?.invite_code ?? '-'}</span>
            <div className="planning-poker-room__invite-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyInviteLink}
                disabled={!session}
              >
                Copiar link
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleCopyInviteCode}
                disabled={!session?.invite_code}
              >
                Copiar código
              </button>
            </div>
            {inviteMessage ? <p className="planning-poker-room__invite-message">{inviteMessage}</p> : null}
          </div>
          <Link className="btn btn-secondary btn-small" to={`/projetos/${projectId}`}>
            Voltar ao projeto
          </Link>
        </div>
      </section>

      {message ? <p className="projects-page__message">{message}</p> : null}
      {isLoading ? <p className="projects-page__state">Carregando sala...</p> : null}

      {session ? (
        <section
          className={`panel planning-poker-room__command-bar planning-poker-room__command-bar--${roomStage.tone}`}
          aria-label="Status operacional da Roda"
        >
          <div className="planning-poker-room__command-copy">
            <p className="projects-page__eyebrow">Status da Roda</p>
            <h2>{roomStage.label}</h2>
            <p>{roomStage.description}</p>
          </div>
          <div className="planning-poker-room__command-metrics" aria-label="Resumo da sessão">
            <span>
              <small>Histórias</small>
              <strong>{roomProgressLabel}</strong>
            </span>
            <span>
              <small>Votantes</small>
              <strong>{votingProgressLabel}</strong>
            </span>
            <span>
              <small>Timer</small>
              <strong>{remainingTimeLabel}</strong>
            </span>
            <span>
              <small>Privacidade</small>
              <strong>{voteVisibilityLabel}</strong>
            </span>
          </div>
        </section>
      ) : null}

      <div className="planning-poker-room__layout">
        <aside className="panel planning-poker-room__stories" aria-label="Histórias da sessão">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Artefatos</p>
              <h2>Histórias</h2>
            </div>
          </div>

          <div className="planning-poker-room__story-progress" aria-label="Progresso das histórias da sessão">
            <div className="planning-poker-room__story-progress-header">
              <span>Progresso</span>
              <strong>{roomProgressLabel}</strong>
            </div>
            <div
              className="planning-poker-room__story-progress-bar"
              role="progressbar"
              aria-label="Histórias concluídas"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={roomProgressPercent}
            >
              <span style={{ width: `${roomProgressPercent}%` }} />
            </div>
            <div className="planning-poker-room__story-progress-chips" aria-label="Status das histórias">
              <span>{storyStatusCounts.pending} pendentes</span>
              <span>{storyStatusCounts.voting} em votação</span>
              <span>{storyStatusCounts.estimated} estimadas</span>
              <span>{storyStatusCounts.skipped} puladas</span>
            </div>
          </div>

          <div className="planning-poker-room__story-list">
            {sessionStories.length > 0 ? (
              sessionStories.map((story) => {
                const safeStatus = story.status ?? 'pending'
                const isActive = story.id === currentStory?.id
                const storyRoundCount = storyRoundCounts.get(story.id) ?? 0
                const storyRoundLabel = storyRoundCount === 1 ? '1 rodada' : `${storyRoundCount} rodadas`

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
                      <strong>{story.user_story?.title ?? 'História sem título'}</strong>
                      {isActive ? <span>Atual</span> : null}
                    </div>
                    <div className="planning-poker-room__story-card-meta">
                      <span className={`planning-poker-room__story-status planning-poker-room__story-status--${safeStatus}`}>
                        {getStoryStatusLabel(safeStatus)}
                      </span>
                      <span>{storyRoundLabel}</span>
                      {story.final_estimate ? <span>Final: {story.final_estimate}</span> : null}
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="projects-page__state">Nenhuma história vinculada a esta Roda.</p>
            )}
          </div>
        </aside>

        <main className="panel planning-poker-room__table" aria-label="Mesa de votação">
          <div className="planning-poker-room__story-focus">
            <p className="projects-page__eyebrow">História atual</p>
            <h2>{currentStory?.user_story?.title ?? 'Selecione uma história'}</h2>
            <p>
              {currentStory?.user_story?.user_story ??
                currentStory?.user_story?.input_context ??
                'Inicie uma rodada para estimar este item.'}
            </p>
            {storyFinalEstimate ? (
              <div className="planning-poker-room__story-pills" aria-label="Estimativa da história">
                <span>Estimativa selada: {storyFinalEstimate}</span>
              </div>
            ) : null}
          </div>

          <div className="planning-poker-room__round-status" aria-label="Resumo da rodada atual">
            <span>
              <small>Rodada</small>
              <strong>{currentRound ? getRoundStatusLabel(currentRound.status) : 'Nenhuma rodada iniciada'}</strong>
            </span>
            <span>
              <small>Tempo</small>
              <strong>{remainingTimeLabel}</strong>
            </span>
            <span>
              <small>Presença</small>
              <strong>{votingProgressLabel}</strong>
            </span>
            {hasUserVoted && currentRound?.status === 'voting' ? (
              <span>
                <small>Seu voto</small>
                <strong>{session?.allow_revote ? 'Registrado; troca permitida' : 'Registrado; troca bloqueada'}</strong>
              </span>
            ) : null}
          </div>
          <p className="planning-poker-room__guidance">{roomGuidance}</p>

          {!canFacilitate && participantPanel ? (
            <div
              className={`planning-poker-room__participant-panel planning-poker-room__participant-panel--${participantPanel.tone}`}
              aria-label="Sua participação na Roda"
            >
              <div className="planning-poker-room__participant-panel-copy">
                <p className="projects-page__eyebrow">Sua participação</p>
                <h3>{participantPanel.title}</h3>
                <p>{participantPanel.description}</p>
              </div>
              <div className="planning-poker-room__participant-panel-meta">
                <span>
                  <small>Seu papel</small>
                  <strong>{participantPanel.role}</strong>
                </span>
                <span>
                  <small>Status</small>
                  <strong>{participantPanel.status}</strong>
                </span>
                <span>
                  <small>Próximo passo</small>
                  <strong>{participantPanel.action}</strong>
                </span>
              </div>
            </div>
          ) : null}

          {shouldShowVotingDeck ? (
            <>
              <div className="planning-poker-room__cards-headline">
                <div>
                  <p className="projects-page__eyebrow">Cartas da guilda</p>
                  <h3>Escolha sua runa</h3>
                </div>
                <span>Ninguém vê votos antes da revelação</span>
              </div>

              <div className="planning-poker-room__cards" aria-label="Cartas de estimativa">
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
                    Observar
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="planning-poker-room__deck-state" aria-label="Estado das cartas da rodada">
              <div>
                <p className="projects-page__eyebrow">Cartas da guilda</p>
                <h3>{roomClosed || storyLocked ? 'Votação encerrada' : 'Aguardando rodada'}</h3>
                <p>
                  {roomClosed || storyLocked
                    ? 'As cartas ficam arquivadas neste histórico. Consulte os votos revelados e a estimativa selada abaixo.'
                    : 'As cartas aparecem quando o facilitador abrir a votação desta história.'}
                </p>
              </div>
              <span>{voteVisibilityLabel}</span>
            </div>
          )}

          {canFacilitate ? (
            <div className="planning-poker-room__facilitator" aria-label="Comandos do facilitador">
              <div className="planning-poker-room__facilitator-copy">
                <p className="projects-page__eyebrow">Facilitador</p>
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
                      {currentRound ? 'Reacender a Fogueira' : 'Acender Fogueira'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={handleRevealRound}
                      disabled={!canRevealRound}
                    >
                      Revelar as Runas
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={handleSkipStory}
                      disabled={!currentStory || currentStory.status === 'estimated' || isActing}
                    >
                      Pular história
                    </button>
                  </div>
                  {revealActionHint ? <p className="planning-poker-room__action-hint">{revealActionHint}</p> : null}
                </>
              ) : (
                <div className="planning-poker-room__facilitator-state" role="status">
                  <span>{facilitatorStateLabel}</span>
                  <p>
                    {roomClosed
                      ? 'Os comandos de facilitação foram encerrados. Use esta tela para consultar o histórico da votação.'
                      : 'Selecione uma história pendente para reabrir os comandos da rodada.'}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {shouldShowResult && visibleSummary ? (
            <section className="planning-poker-room__result" aria-label="Resultado da rodada">
              {consensusInsight ? (
                <div
                  className={`planning-poker-room__consensus planning-poker-room__consensus--${consensusInsight.tone}`}
                >
                  <div>
                    <p className="projects-page__eyebrow">Decisão da rodada</p>
                    <h3>{consensusInsight.label}</h3>
                    <p>{consensusInsight.description}</p>
                  </div>
                  <div className="planning-poker-room__consensus-score">
                    <span>Consenso sugerido</span>
                    <strong>{consensusInsight.suggestion || '-'}</strong>
                  </div>
                </div>
              ) : null}

              {storyFinalEstimate && currentStory?.status === 'estimated' ? (
                <div className="planning-poker-room__sealed-result" role="status">
                  <div>
                    <p className="projects-page__eyebrow">Estimativa selada</p>
                    <h3>{storyFinalEstimate}</h3>
                    <p>Decisão final registrada no histórico desta Roda.</p>
                  </div>
                  <span>{formatDateTime(currentStoryResult?.created_at ?? currentStory?.updated_at)}</span>
                </div>
              ) : null}

              <div className="planning-poker-room__result-actions" aria-label="Ações do resultado da rodada">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleCopyRoundResult}
                  disabled={!visibleSummary}
                >
                  Copiar resultado
                </button>
                {nextPendingStory ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={handleSelectNextPendingStory}
                  >
                    Próxima pendente
                  </button>
                ) : null}
              </div>

              <details className="planning-poker-room__result-details" open={!storyFinalEstimate}>
                <summary>
                  <span>Métricas da rodada</span>
                  <strong>{storyFinalEstimate ? `Final: ${storyFinalEstimate}` : `Sugestão: ${visibleSummary.suggestion || '-'}`}</strong>
                </summary>
                <div className="planning-poker-room__summary-grid">
                  {storyFinalEstimate ? <span>Final: {storyFinalEstimate}</span> : null}
                  <span>Média: {formatNumber(visibleSummary.average)}</span>
                  <span>Mediana: {formatNumber(visibleSummary.median)}</span>
                  <span>Menor: {formatNumber(visibleSummary.lowest)}</span>
                  <span>Maior: {formatNumber(visibleSummary.highest)}</span>
                  <span>Divergência: {formatNumber(visibleSummary.divergence)}</span>
                  {visibleSummary.voteCount !== null && visibleSummary.voteCount !== undefined ? (
                    <span>Votos: {visibleSummary.voteCount}</span>
                  ) : null}
                  {visibleSummary.abstentionCount !== null && visibleSummary.abstentionCount !== undefined ? (
                    <span>Abstenções: {visibleSummary.abstentionCount}</span>
                  ) : null}
                  {visibleSummary.unknownCount !== null && visibleSummary.unknownCount !== undefined ? (
                    <span>Não sei: {visibleSummary.unknownCount}</span>
                  ) : null}
                </div>
              </details>

              <details className="planning-poker-room__result-details" open={!storyFinalEstimate}>
                <summary>
                  <span>Votos revelados</span>
                  <strong>{currentRoundVotes.length} cartas abertas</strong>
                </summary>
                <div className="planning-poker-room__revealed-votes" aria-label="Votos revelados">
                  {currentRoundVotes.length > 0 ? (
                    currentRoundVotes.map((vote) => {
                      const participantIndex = participants.findIndex(
                        (participant) => participant.id === vote.participant_id,
                      )
                      const participant = participants[participantIndex]

                      return (
                        <div key={vote.id} className="planning-poker-room__revealed-vote">
                          <span>{getParticipantLabel(participant, userId, participantIndex)}</span>
                          <strong>{vote.vote_value}</strong>
                        </div>
                      )
                    })
                  ) : (
                    <p className="planning-poker-room__result-note">
                      Votos individuais disponíveis após a revelação das runas.
                    </p>
                  )}
                </div>
              </details>

              {session?.status === 'completed' && allStoriesResolved ? (
                <p className="planning-poker-room__result-note">
                  Todas as histórias desta Roda foram concluídas; a sessão foi finalizada automaticamente.
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
                    <p className="projects-page__eyebrow">Estimativa final</p>
                    <h3>Selar decisão</h3>
                    <p>
                      Registre o valor acordado pela guilda. A sugestão usa a mediana dos votos numéricos revelados.
                    </p>
                  </div>
                  <div className="planning-poker-room__seal-controls">
                    <label className="projects-page__field">
                      <span>Valor final</span>
                      <input
                        type="text"
                        value={finalEstimate}
                        onChange={(event) => setFinalEstimate(event.target.value)}
                        placeholder={visibleSummary.suggestion || 'Ex.: 5'}
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
                        Usar sugestão
                      </button>
                    ) : null}
                    <button type="submit" className="btn btn-primary btn-small" disabled={isActing}>
                      Selar Estimativa
                    </button>
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}
        </main>

        <aside className="panel planning-poker-room__guild" aria-label="Membros da guilda">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Guilda</p>
              <h2>{participants.length} membros</h2>
              <p className="planning-poker-room__guild-summary">{guildSummaryLabel}</p>
            </div>
          </div>

          <div className="planning-poker-room__participant-list">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className={`planning-poker-room__participant planning-poker-room__participant--${getParticipantRoomTone(participant)}`}
              >
                <span>{getParticipantLabel(participant, userId, index)}</span>
                <strong>{getParticipantRoomStatus(participant)}</strong>
              </div>
            ))}
          </div>

          <div className="planning-poker-room__session-meta">
            <span>Status: {getSessionStatusLabel(session?.status)}</span>
            <span>Escala: {scoringScaleLabel}</span>
            <span>Participantes votantes: {eligibleVoters.length}</span>
            <span>{revotePolicyLabel}</span>
            <span>{revealPolicyLabel}</span>
            <span>Criada em {formatDateTime(session?.created_at)}</span>
          </div>

          {canFacilitate ? (
            roomClosed ? (
              <div className="planning-poker-room__session-state" role="status">
                <strong>{sessionCompletionLabel}</strong>
                <span>Histórico disponível para consulta.</span>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCompleteSession}
                disabled={isActing}
              >
                Finalizar sessão
              </button>
            )
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default PlanningPokerRoomPage
