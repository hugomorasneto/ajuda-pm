import { describe, expect, it } from 'vitest'
import { normalizeStorySearchQuery, storyMatchesSearch } from './storySearchUtils'

const story = {
  title: 'Validação de domínio corporativo',
  input_context: 'Cadastro B2B com onboarding guiado.',
  user_story: 'Como admin, quero validar o domínio da empresa.',
  estimation_status: 'ready_for_estimation',
}

describe('storySearchUtils', () => {
  it('normaliza busca removendo acentos e caixa', () => {
    expect(normalizeStorySearchQuery('  Domínio Ágil  ')).toBe('dominio agil')
  })

  it('encontra história por título, contexto e user story', () => {
    expect(storyMatchesSearch(story, 'dominio')).toBe(true)
    expect(storyMatchesSearch(story, 'onboarding')).toBe(true)
    expect(storyMatchesSearch(story, 'admin')).toBe(true)
  })

  it('retorna verdadeiro para busca vazia', () => {
    expect(storyMatchesSearch(story, '')).toBe(true)
  })

  it('retorna falso quando não há correspondência', () => {
    expect(storyMatchesSearch(story, 'pagamento')).toBe(false)
  })
})
