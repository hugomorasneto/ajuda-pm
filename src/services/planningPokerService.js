import { supabase } from '../lib/supabaseClient'

const sessionColumns =
  'id, project_id, team_id, facilitator_id, name, status, scoring_scale, scoring_values, vote_time_limit_seconds, allow_revote, reveal_votes_after_all, allow_abstention, allow_observers, invite_code, started_at, completed_at, canceled_at, created_at, updated_at'
const sessionStoryColumns =
  'id, session_id, user_story_id, position, status, final_estimate, final_estimate_numeric, estimated_by, estimated_at, created_at, updated_at, user_story:user_stories(id, title, input_context, user_story, acceptance_criteria, estimation_status, created_at)'
const participantColumns =
  'id, session_id, user_id, display_name, role, status, joined_at, last_seen_at, created_at, updated_at'
const roundColumns =
  'id, session_id, session_story_id, round_number, status, started_by, started_at, ends_at, revealed_at, closed_at, created_at, updated_at'
const voteStatusColumns =
  'round_id, session_id, session_story_id, participant_id, user_id, has_voted, voted_at, updated_at'
const voteColumns =
  'id, session_id, session_story_id, round_id, participant_id, user_id, vote_value, vote_numeric, vote_kind, created_at, updated_at'
const resultColumns =
  'id, session_id, session_story_id, final_round_id, final_estimate, final_estimate_numeric, average, median, lowest_vote, highest_vote, divergence, vote_count, abstention_count, unknown_count, accepted_by, created_at, updated_at'

function requireUser(userId, fallbackData) {
  if (userId) return null
  return { success: false, error: new Error('Usuário não autenticado.'), data: fallbackData }
}

function requireValue(value, message, fallbackData) {
  if (value) return null
  return { success: false, error: new Error(message), data: fallbackData }
}

export async function listPlanningPokerSessionsByProject({ projectId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const projectError = requireValue(projectId, 'Projeto não informado.', [])
    if (projectError) return projectError

    const { data, error } = await supabase
      .from('planning_poker_sessions')
      .select(sessionColumns)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase listPlanningPokerSessionsByProject error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerSessionsByProject error:', error)
    return { success: false, error, data: [] }
  }
}

export async function createPlanningPokerSession({
  projectId,
  name,
  userStoryIds,
  teamId = null,
  scoringScale = 'fibonacci',
  voteTimeLimitSeconds = 300,
  allowRevote = true,
  revealVotesAfterAll = false,
  allowAbstention = true,
  allowObservers = true,
  userId,
}) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const projectError = requireValue(projectId, 'Projeto não informado.', null)
    if (projectError) return projectError

    const safeName = String(name ?? '').trim()
    if (!safeName) {
      return { success: false, error: new Error('Informe um nome para a Roda da Fogueira.'), data: null }
    }

    const safeStoryIds = Array.isArray(userStoryIds) ? userStoryIds.filter(Boolean) : []
    if (safeStoryIds.length === 0) {
      return {
        success: false,
        error: new Error('Selecione ao menos uma história pronta para estimar.'),
        data: null,
      }
    }

    const { data, error } = await supabase.rpc('create_planning_poker_session', {
      p_project_id: projectId,
      p_name: safeName,
      p_user_story_ids: safeStoryIds,
      p_team_id: teamId || null,
      p_scoring_scale: scoringScale,
      p_scoring_values: null,
      p_vote_time_limit_seconds: Number(voteTimeLimitSeconds) || 300,
      p_allow_revote: Boolean(allowRevote),
      p_reveal_votes_after_all: Boolean(revealVotesAfterAll),
      p_allow_abstention: Boolean(allowAbstention),
      p_allow_observers: Boolean(allowObservers),
    })

    if (error) {
      console.error('Supabase createPlanningPokerSession error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected createPlanningPokerSession error:', error)
    return { success: false, error, data: null }
  }
}

export async function getPlanningPokerSession({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', null)
    if (sessionError) return sessionError

    const { data, error } = await supabase
      .from('planning_poker_sessions')
      .select(sessionColumns)
      .eq('id', sessionId)
      .maybeSingle()

    if (error) {
      console.error('Supabase getPlanningPokerSession error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected getPlanningPokerSession error:', error)
    return { success: false, error, data: null }
  }
}

export async function getPlanningPokerSessionByInviteCode({ inviteCode, userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const safeInviteCode = String(inviteCode ?? '').trim().toUpperCase()
    const inviteCodeError = requireValue(safeInviteCode, 'Código da sala não informado.', null)
    if (inviteCodeError) return inviteCodeError

    const { data, error } = await supabase
      .from('planning_poker_sessions')
      .select(sessionColumns)
      .eq('invite_code', safeInviteCode)
      .maybeSingle()

    if (error) {
      console.error('Supabase getPlanningPokerSessionByInviteCode error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected getPlanningPokerSessionByInviteCode error:', error)
    return { success: false, error, data: null }
  }
}

export async function listPlanningPokerSessionStories({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', [])
    if (sessionError) return sessionError

    const { data, error } = await supabase
      .from('planning_poker_session_stories')
      .select(sessionStoryColumns)
      .eq('session_id', sessionId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Supabase listPlanningPokerSessionStories error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerSessionStories error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listPlanningPokerSessionStorySummaries({ sessionIds, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const safeSessionIds = Array.isArray(sessionIds) ? sessionIds.filter(Boolean) : []
    if (safeSessionIds.length === 0) {
      return { success: true, data: [] }
    }

    const { data, error } = await supabase
      .from('planning_poker_session_stories')
      .select('id, session_id, status, final_estimate, final_estimate_numeric, estimated_at, updated_at')
      .in('session_id', safeSessionIds)
      .order('position', { ascending: true })

    if (error) {
      console.error('Supabase listPlanningPokerSessionStorySummaries error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerSessionStorySummaries error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listPlanningPokerParticipants({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', [])
    if (sessionError) return sessionError

    const { data, error } = await supabase
      .from('planning_poker_participants')
      .select(participantColumns)
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Supabase listPlanningPokerParticipants error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerParticipants error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listPlanningPokerRounds({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', [])
    if (sessionError) return sessionError

    const { data, error } = await supabase
      .from('planning_poker_rounds')
      .select(roundColumns)
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })

    if (error) {
      console.error('Supabase listPlanningPokerRounds error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerRounds error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listPlanningPokerVoteStatus({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', [])
    if (sessionError) return sessionError

    const { data, error } = await supabase
      .from('planning_poker_vote_status')
      .select(voteStatusColumns)
      .eq('session_id', sessionId)
      .order('voted_at', { ascending: true })

    if (error) {
      console.error('Supabase listPlanningPokerVoteStatus error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerVoteStatus error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listPlanningPokerVotes({ roundId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const roundError = requireValue(roundId, 'Rodada não informada.', [])
    if (roundError) return roundError

    const { data, error } = await supabase
      .from('planning_poker_votes')
      .select(voteColumns)
      .eq('round_id', roundId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase listPlanningPokerVotes error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerVotes error:', error)
    return { success: false, error, data: [] }
  }
}

export async function listPlanningPokerResults({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, [])
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', [])
    if (sessionError) return sessionError

    const { data, error } = await supabase
      .from('planning_poker_results')
      .select(resultColumns)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase listPlanningPokerResults error:', error)
      return { success: false, error, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (error) {
    console.error('Unexpected listPlanningPokerResults error:', error)
    return { success: false, error, data: [] }
  }
}

export async function joinPlanningPokerSession({
  sessionId,
  displayName = '',
  role = 'participant',
  userId,
}) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', null)
    if (sessionError) return sessionError

    const { data, error } = await supabase.rpc('join_planning_poker_session', {
      p_session_id: sessionId,
      p_display_name: String(displayName ?? '').trim() || null,
      p_role: role,
    })

    if (error) {
      console.error('Supabase joinPlanningPokerSession error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected joinPlanningPokerSession error:', error)
    return { success: false, error, data: null }
  }
}

export async function startPlanningPokerRound({ sessionStoryId, voteTimeLimitSeconds = null, userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const storyError = requireValue(sessionStoryId, 'História da sessão não informada.', null)
    if (storyError) return storyError

    const { data, error } = await supabase.rpc('start_planning_poker_round', {
      p_session_story_id: sessionStoryId,
      p_vote_time_limit_seconds: voteTimeLimitSeconds,
    })

    if (error) {
      console.error('Supabase startPlanningPokerRound error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected startPlanningPokerRound error:', error)
    return { success: false, error, data: null }
  }
}

export async function castPlanningPokerVote({ roundId, voteValue, voteKind = 'estimate', userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const roundError = requireValue(roundId, 'Rodada não informada.', null)
    if (roundError) return roundError

    const { data, error } = await supabase.rpc('cast_planning_poker_vote', {
      p_round_id: roundId,
      p_vote_value: String(voteValue ?? '').trim(),
      p_vote_kind: voteKind,
    })

    if (error) {
      console.error('Supabase castPlanningPokerVote error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected castPlanningPokerVote error:', error)
    return { success: false, error, data: null }
  }
}

export async function revealPlanningPokerRound({ roundId, userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const roundError = requireValue(roundId, 'Rodada não informada.', null)
    if (roundError) return roundError

    const { data, error } = await supabase.rpc('reveal_planning_poker_round', {
      p_round_id: roundId,
    })

    if (error) {
      console.error('Supabase revealPlanningPokerRound error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected revealPlanningPokerRound error:', error)
    return { success: false, error, data: null }
  }
}

export async function sealPlanningPokerEstimate({ sessionStoryId, finalEstimate = '', userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const storyError = requireValue(sessionStoryId, 'História da sessão não informada.', null)
    if (storyError) return storyError

    const { data, error } = await supabase.rpc('seal_planning_poker_estimate', {
      p_session_story_id: sessionStoryId,
      p_final_estimate: String(finalEstimate ?? '').trim() || null,
    })

    if (error) {
      console.error('Supabase sealPlanningPokerEstimate error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected sealPlanningPokerEstimate error:', error)
    return { success: false, error, data: null }
  }
}

export async function skipPlanningPokerStory({ sessionStoryId, userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const storyError = requireValue(sessionStoryId, 'História da sessão não informada.', null)
    if (storyError) return storyError

    const { data, error } = await supabase.rpc('skip_planning_poker_story', {
      p_session_story_id: sessionStoryId,
    })

    if (error) {
      console.error('Supabase skipPlanningPokerStory error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected skipPlanningPokerStory error:', error)
    return { success: false, error, data: null }
  }
}

export async function completePlanningPokerSession({ sessionId, userId }) {
  try {
    const userError = requireUser(userId, null)
    if (userError) return userError

    const sessionError = requireValue(sessionId, 'Sessão não informada.', null)
    if (sessionError) return sessionError

    const { data, error } = await supabase.rpc('complete_planning_poker_session', {
      p_session_id: sessionId,
    })

    if (error) {
      console.error('Supabase completePlanningPokerSession error:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data: data?.[0] ?? null }
  } catch (error) {
    console.error('Unexpected completePlanningPokerSession error:', error)
    return { success: false, error, data: null }
  }
}

export function subscribeToPlanningPokerSession({ sessionId, onChange }) {
  if (!sessionId || typeof onChange !== 'function') return null

  const channel = supabase
    .channel(`planning-poker-session:${sessionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_poker_sessions', filter: `id=eq.${sessionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_poker_session_stories', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_poker_participants', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_poker_rounds', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_poker_vote_status', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_poker_results', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .subscribe()

  return channel
}
