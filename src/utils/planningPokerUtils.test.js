import { describe, expect, it } from 'vitest'
import {
  buildPlanningSessionSummaryMarkdown,
  buildPlanningAccessRequestMessage,
  formatPlanningTimerDuration,
  formatRemainingTime,
  getActivePlanningStorySessionByStoryId,
  getPlanningScoringScaleLabel,
  getPlanningSessionProgress,
  getPlanningStorySessionIndex,
  getPlanningSessionStatusLabel,
  getPlanningStoryStatusLabel,
  isRoundTimerExpired,
} from './planningPokerUtils'

describe('planningPokerUtils', () => {
  it('formata timers da Roda com linguagem legível', () => {
    expect(formatPlanningTimerDuration(null)).toBe('Sem timer')
    expect(formatPlanningTimerDuration(45)).toBe('45 segundos')
    expect(formatPlanningTimerDuration(300)).toBe('5 minutos')
  })

  it('formata tempo restante e detecta timer encerrado', () => {
    const now = new Date('2026-05-07T12:00:00Z').getTime()
    const endsAt = '2026-05-07T12:05:30Z'

    expect(formatRemainingTime(endsAt, now)).toBe('05:30')
    expect(isRoundTimerExpired(endsAt, now)).toBe(false)
    expect(isRoundTimerExpired(endsAt, new Date('2026-05-07T12:05:30Z').getTime())).toBe(true)
  })

  it('calcula progresso de histórias da sessão', () => {
    const progress = getPlanningSessionProgress([
      { status: 'estimated' },
      { status: 'skipped' },
      { status: 'pending' },
      { status: 'voting' },
    ])

    expect(progress).toMatchObject({
      estimated: 1,
      label: '2 histórias resolvidas de 4',
      pending: 1,
      progressPercent: 50,
      skipped: 1,
      voting: 1,
    })
  })

  it('detecta histórias que já estão em Rodas ativas', () => {
    const sessions = [
      { id: 's1', name: 'Roda ativa', status: 'active' },
      { id: 's2', name: 'Roda finalizada', status: 'completed' },
    ]
    const storiesBySession = {
      s1: [{ user_story_id: 'story-a' }],
      s2: [{ user_story_id: 'story-b' }],
    }

    expect(getActivePlanningStorySessionByStoryId(sessions, storiesBySession)).toEqual({
      'story-a': sessions[0],
    })
  })

  it('prioriza Roda ativa antes de estimativa finalizada no índice por história', () => {
    const sessions = [
      { id: 's1', name: 'Roda finalizada', status: 'completed', created_at: '2026-05-07T10:00:00Z' },
      { id: 's2', name: 'Roda ativa', status: 'voting', created_at: '2026-05-07T11:00:00Z' },
    ]
    const storiesBySession = {
      s1: [{ user_story_id: 'story-a', status: 'estimated', final_estimate: '5' }],
      s2: [{ user_story_id: 'story-a', status: 'voting' }],
    }

    expect(getPlanningStorySessionIndex(sessions, storiesBySession)['story-a']).toMatchObject({
      isLive: true,
      session: sessions[1],
    })
  })

  it('gera resumo Markdown consolidado da sessão', () => {
    const markdown = buildPlanningSessionSummaryMarkdown({
      participantsCount: 3,
      projectName: 'Portal B2B',
      session: {
        invite_code: 'ABC123',
        name: 'Roda sprint 10',
        scoring_scale: 'fibonacci',
        status: 'completed',
        vote_time_limit_seconds: 300,
      },
      stories: [
        {
          final_estimate: '5',
          status: 'estimated',
          user_story: { title: 'Filtro avançado' },
        },
      ],
    })

    expect(markdown).toContain('**Projeto:** Portal B2B')
    expect(markdown).toContain('**Timer:** 5 minutos')
    expect(markdown).toContain('**Participantes votantes:** 3')
    expect(markdown).toContain('- Filtro avançado · Estimada · Final: 5')
  })

  it('gera mensagem para pedir liberação de acesso à Roda', () => {
    const message = buildPlanningAccessRequestMessage({
      email: 'participante@empresa.com.br',
      inviteCode: 'abc123',
    })

    expect(message).toContain('Roda da Fogueira')
    expect(message).toContain('participante@empresa.com.br')
    expect(message).toContain('Código da Roda: ABC123.')
    expect(message).toContain('adicionar meu e-mail ao projeto')
  })

  it('prioriza o link da sala no pedido de acesso quando disponível', () => {
    const message = buildPlanningAccessRequestMessage({
      email: 'participante@empresa.com.br',
      inviteCode: 'ABC123',
      inviteUrl: 'https://prodforge.techtupa.com.br/projetos/projeto/roda/sessao',
    })

    expect(message).toContain(
      'Link da sala: https://prodforge.techtupa.com.br/projetos/projeto/roda/sessao.',
    )
    expect(message).not.toContain('Código da Roda: ABC123.')
  })

  it('mantém labels padrão para status e escala', () => {
    expect(getPlanningSessionStatusLabel('completed')).toBe('Finalizada')
    expect(getPlanningStoryStatusLabel('skipped')).toBe('Pulada')
    expect(getPlanningScoringScaleLabel('tshirt')).toBe('Tamanho de camiseta')
    expect(getPlanningSessionStatusLabel('unknown')).toBe('Rascunho')
  })
})
