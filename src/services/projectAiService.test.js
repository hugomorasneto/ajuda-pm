import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {},
}))

import { buildProjectAnalysisMarkdown } from './projectAiService'

const baseAnalysis = {
  health_label: 'Atenção moderada',
  summary: 'Projeto precisa alinhar riscos antes da estimativa.',
  risks: ['Critério de fallback ausente'],
  refinement_questions: ['Qual comportamento esperado no erro?'],
  next_actions: ['Preparar histórias críticas'],
  estimation_candidates: ['Validação de domínio'],
  meta: {
    analyzed_stories: 2,
  },
}

describe('projectAiService', () => {
  it('inclui o status de atualização no Markdown do diagnóstico', () => {
    const markdown = buildProjectAnalysisMarkdown({
      project: {
        name: 'Onboarding B2B',
        description: 'Fluxo de entrada de novas contas.',
      },
      analysis: baseAnalysis,
      freshness: {
        label: 'Desatualizado',
        description: '1 história nova após este diagnóstico.',
      },
      storyCount: 3,
      memberCount: 2,
    })

    expect(markdown).toContain('# Diagnóstico do projeto: Onboarding B2B')
    expect(markdown).toContain(
      '**Status do diagnóstico:** Desatualizado - 1 história nova após este diagnóstico.',
    )
    expect(markdown).toContain('**Histórias vinculadas:** 3')
    expect(markdown).toContain('**Histórias analisadas:** 2')
    expect(markdown).toContain('- Preparar histórias críticas')
  })

  it('usa fallback claro quando não há referência de atualização', () => {
    const markdown = buildProjectAnalysisMarkdown({
      project: { name: 'Projeto sem histórico' },
      analysis: baseAnalysis,
      storyCount: 2,
      memberCount: 1,
    })

    expect(markdown).toContain('**Status do diagnóstico:** Sem referência de atualização.')
  })
})
