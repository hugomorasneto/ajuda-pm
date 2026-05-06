import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { checkCanManageProject } from '../services/projectsService'
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

function getSessionStatusLabel(status) {
  return SESSION_STATUS_LABELS[status] ?? 'Rascunho'
}

function getStoryStatusLabel(status) {
  return STORY_STATUS_LABELS[status] ?? 'Pendente'
}

function getRoundStatusLabel(status) {
  return ROUND_STATUS_LABELS[status] ?? 'Sem rodada ativa'
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

function buildVoteSummary(votes) {
  const numericVotes = votes
    .filter((vote) => vote.vote_kind === 'estimate' && vote.vote_numeric !== null)
    .map((vote) => Number(vote.vote_numeric))
    .filter((value) => Number.isFinite(value))

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
  }
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
  const [notFound, setNotFound] = useState(false)
  const [nowTick, setNowTick] = useState(0)

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
  const roomClosed = session?.status === 'completed' || session?.status === 'canceled'
  const storyLocked = ['estimated', 'skipped'].includes(currentStory?.status)
  const canVote =
    Boolean(currentRound) &&
    currentRound.status === 'voting' &&
    !roomClosed &&
    currentParticipant?.status === 'joined' &&
    currentParticipant?.role !== 'observer'
  const remainingTimeLabel = useMemo(() => {
    return formatRemainingTime(currentRound?.status === 'voting' ? currentRound.ends_at : null, nowTick)
  }, [currentRound?.ends_at, currentRound?.status, nowTick])

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
        { text: currentRound ? getRoundStatusLabel(currentRound.status) : 'Sem rodada' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [currentRound, participants.length, session?.name, session?.status, setTopbarStatus])

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

    const voteKind = value === '?' ? 'unknown' : 'estimate'
    await runAction(
      () => castPlanningPokerVote({ roundId: currentRound.id, voteValue: value, voteKind, userId }),
      'Voto registrado.',
    )
  }

  async function handleAbstain() {
    if (!currentRound) return

    await runAction(
      () =>
        castPlanningPokerVote({
          roundId: currentRound.id,
          voteValue: 'Abster-se',
          voteKind: 'abstain',
          userId,
        }),
      'Abstenção registrada.',
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
      'Estimativa selada.',
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
          <span>Código: {session?.invite_code ?? '-'}</span>
          <Link className="btn btn-secondary btn-small" to={`/projetos/${projectId}`}>
            Voltar ao projeto
          </Link>
        </div>
      </section>

      {message ? <p className="projects-page__message">{message}</p> : null}
      {isLoading ? <p className="projects-page__state">Carregando sala...</p> : null}

      <div className="planning-poker-room__layout">
        <aside className="panel planning-poker-room__stories" aria-label="Histórias da sessão">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Artefatos</p>
              <h2>Histórias</h2>
            </div>
          </div>

          <div className="planning-poker-room__story-list">
            {sessionStories.map((story) => (
              <button
                key={story.id}
                type="button"
                className={`planning-poker-room__story-card ${
                  story.id === currentStory?.id ? 'planning-poker-room__story-card--active' : ''
                }`.trim()}
                onClick={() => {
                  setSelectedSessionStoryId(story.id)
                  setFinalEstimate('')
                }}
              >
                <strong>{story.user_story?.title ?? 'História sem título'}</strong>
                <span>{getStoryStatusLabel(story.status)}</span>
                {story.final_estimate ? <span>Estimativa: {story.final_estimate}</span> : null}
              </button>
            ))}
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

          <div className="planning-poker-room__round-status">
            <span>{currentRound ? getRoundStatusLabel(currentRound.status) : 'Nenhuma rodada iniciada'}</span>
            <strong>{remainingTimeLabel}</strong>
            {hasUserVoted && currentRound?.status === 'voting' ? <span>Seu voto foi registrado.</span> : null}
          </div>

          <div className="planning-poker-room__cards" aria-label="Cartas de estimativa">
            {scoringValues.map((value) => (
              <button
                key={value}
                type="button"
                className="planning-poker-room__card"
                onClick={() => handleVote(value)}
                disabled={!canVote || isActing}
              >
                {value}
              </button>
            ))}
            {session?.allow_abstention ? (
              <button
                type="button"
                className="planning-poker-room__card planning-poker-room__card--muted"
                onClick={handleAbstain}
                disabled={!canVote || isActing}
              >
                Observar
              </button>
            ) : null}
          </div>

          {canFacilitate ? (
            <div className="planning-poker-room__facilitator">
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={handleStartRound}
                disabled={!currentStory || roomClosed || storyLocked || isActing}
              >
                {currentRound ? 'Reacender a Fogueira' : 'Acender Fogueira'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleRevealRound}
                disabled={!currentRound || currentRound.status !== 'voting' || isActing}
              >
                Revelar as Runas
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleSkipStory}
                disabled={!currentStory || roomClosed || currentStory.status === 'estimated' || isActing}
              >
                Pular história
              </button>
            </div>
          ) : null}

          {shouldShowResult && visibleSummary ? (
            <section className="planning-poker-room__result" aria-label="Resultado da rodada">
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
              </div>

              <div className="planning-poker-room__revealed-votes">
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

              {storyFinalEstimate && currentStory?.status === 'estimated' ? (
                <p className="planning-poker-room__result-note">
                  Esta história já tem uma estimativa selada.
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
                  <label className="projects-page__field">
                    <span>Estimativa final</span>
                    <input
                      type="text"
                      value={finalEstimate}
                      onChange={(event) => setFinalEstimate(event.target.value)}
                      placeholder={visibleSummary.suggestion || 'Ex.: 5'}
                      disabled={isActing}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary btn-small" disabled={isActing}>
                    Selar Estimativa
                  </button>
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
            </div>
          </div>

          <div className="planning-poker-room__participant-list">
            {participants.map((participant, index) => {
              const voted = currentRoundVoteStatus.some(
                (status) => status.participant_id === participant.id && status.has_voted,
              )

              return (
                <div key={participant.id} className="planning-poker-room__participant">
                  <span>{getParticipantLabel(participant, userId, index)}</span>
                  <strong>{participant.role === 'observer' ? 'Observador' : voted ? 'Votou' : 'Aguardando'}</strong>
                </div>
              )
            })}
          </div>

          <div className="planning-poker-room__session-meta">
            <span>Status: {getSessionStatusLabel(session?.status)}</span>
            <span>Participantes votantes: {eligibleVoters.length}</span>
            <span>Criada em {formatDateTime(session?.created_at)}</span>
          </div>

          {canFacilitate ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleCompleteSession}
              disabled={roomClosed || isActing}
            >
              Finalizar sessão
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default PlanningPokerRoomPage
