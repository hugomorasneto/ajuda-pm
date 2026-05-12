import { describe, expect, it } from 'vitest'
import {
  buildProjectActionPlanMarkdown,
  findProjectInsightCandidateStory,
  formatProjectStoryCount,
  getProjectInsightFreshness,
  normalizeProjectSearchText,
} from './projectInsightsUtils'

describe('projectInsightsUtils', () => {
  it('formata contagem de histórias com fallback seguro', () => {
    expect(formatProjectStoryCount(1)).toBe('1 história')
    expect(formatProjectStoryCount(3)).toBe('3 histórias')
    expect(formatProjectStoryCount('sem número')).toBe('0 histórias')
  })

  it('sinaliza diagnóstico atualizado quando a base continua igual', () => {
    expect(getProjectInsightFreshness({ input_story_count: 2 }, 2)).toMatchObject({
      label: 'Atualizado',
      description: 'Base alinhada com as 2 histórias atuais do projeto.',
      tone: 'ready',
      isOutdated: false,
    })

    expect(getProjectInsightFreshness({ input_story_count: 1 }, 1)).toMatchObject({
      description: 'Base alinhada com a história atual do projeto.',
      isOutdated: false,
    })
  })

  it('sinaliza diagnóstico desatualizado quando novas histórias entram no projeto', () => {
    expect(getProjectInsightFreshness({ input_story_count: 2 }, 5)).toMatchObject({
      label: 'Desatualizado',
      description: '3 histórias novas após este diagnóstico.',
      tone: 'attention',
      savedStoryCount: 2,
      isOutdated: true,
    })
  })

  it('sinaliza mudança de recorte e base ausente', () => {
    expect(getProjectInsightFreshness({ input_story_count: 6 }, 4)).toMatchObject({
      label: 'Recorte mudou',
      description: 'Criado com 6 histórias; o projeto tem 4 histórias agora.',
      tone: 'tech',
      isOutdated: true,
    })

    expect(getProjectInsightFreshness({ input_story_count: 0 }, 4)).toMatchObject({
      label: 'Base não registrada',
      tone: 'attention',
      isOutdated: true,
    })
  })

  it('normaliza texto de busca para conectar sugestões da IA às histórias', () => {
    expect(normalizeProjectSearchText('Validação de Domínio B2B!')).toBe('validacao de dominio b2b')
  })

  it('encontra a história candidata por título ou contexto relevante', () => {
    const stories = [
      {
        id: 'story-domain',
        title: 'Validação de domínio B2B',
        input_context: 'Validar domínio corporativo no onboarding.',
        user_story: '',
      },
      {
        id: 'story-password',
        title: 'Recuperação de senha',
        input_context: 'Usuário não consegue recuperar acesso.',
        user_story: '',
      },
    ]

    expect(findProjectInsightCandidateStory('Validacao de dominio', stories)?.id).toBe('story-domain')
    expect(findProjectInsightCandidateStory('Recuperação de senha', stories)?.id).toBe('story-password')
  })

  it('evita vincular candidata quando só há correspondência fraca', () => {
    const stories = [
      {
        id: 'story-search',
        title: 'Filtro de busca',
        input_context: 'Cliente precisa buscar produtos.',
        user_story: '',
      },
    ]

    expect(findProjectInsightCandidateStory('Cliente', stories)).toBeNull()
  })

  it('gera plano de ação Markdown com checklist e candidatas conectadas', () => {
    const markdown = buildProjectActionPlanMarkdown({
      project: { name: 'Onboarding B2B' },
      storyCount: 3,
      freshness: { label: 'Atualizado', description: 'Base alinhada.' },
      analysis: {
        health_label: 'Atenção moderada',
        summary: 'Projeto precisa alinhar riscos antes da Roda.',
        next_actions: ['Preparar histórias críticas'],
        refinement_questions: ['Qual domínio deve ser bloqueado?'],
        risks: ['Critério de fallback está ausente'],
      },
      candidateStories: [
        {
          candidate: 'Validação de domínio',
          story: { title: 'Validação de domínio B2B' },
        },
        {
          candidate: 'Convite externo',
          story: null,
        },
      ],
    })

    expect(markdown).toContain('# Plano de ação do projeto: Onboarding B2B')
    expect(markdown).toContain('**Histórias no projeto:** 3 histórias')
    expect(markdown).toContain('- [ ] Preparar histórias críticas')
    expect(markdown).toContain('- [ ] Validação de domínio B2B — sugestão da IA: Validação de domínio')
    expect(markdown).toContain('- [ ] Convite externo — vincular manualmente a uma história do projeto')
  })
})
