import { describe, expect, it } from 'vitest'
import {
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
})
