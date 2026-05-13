import { describe, expect, it } from 'vitest'
import {
  buildVersionComparisonMarkdown,
  buildVersionDiff,
  getVersionDiffLead,
  normalizeVersionList,
} from './storyVersionUtils'

const previousVersion = {
  version_number: 1,
  title: 'Busca simples',
  objective: 'Encontrar itens.',
  user_story: 'Como cliente, quero buscar produtos.',
  acceptance_criteria: 'Critério mantido\nCritério removido',
  business_rules: 'Regra antiga',
  gaps: '',
  qa_checklist: 'Teste antigo',
}

const currentVersion = {
  version_number: 2,
  title: 'Busca combinável',
  objective: 'Encontrar itens com filtros.',
  user_story: 'Como cliente, quero combinar filtros para encontrar produtos.',
  acceptance_criteria: 'Critério mantido\nCritério novo',
  business_rules: 'Regra antiga\nRegra nova',
  gaps: 'Validar paginação',
  qa_checklist: 'Teste antigo\nTeste novo',
  regeneration_instruction: 'Mais objetivo',
}

describe('storyVersionUtils', () => {
  it('normaliza listas de versões vindas como texto ou array', () => {
    expect(normalizeVersionList('A\n\n B ')).toEqual(['A', 'B'])
    expect(normalizeVersionList([' A ', ''])).toEqual(['A'])
  })

  it('calcula diferenças entre versões', () => {
    const diff = buildVersionDiff(previousVersion, currentVersion)

    expect(diff.currentLabel).toBe('V2')
    expect(diff.previousLabel).toBe('V1')
    expect(diff.acceptanceCriteria.added).toEqual(['Critério novo'])
    expect(diff.acceptanceCriteria.removed).toEqual(['Critério removido'])
    expect(diff.textChangesCount).toBe(4)
  })

  it('gera lead legível para comparação', () => {
    const diff = buildVersionDiff(previousVersion, currentVersion)

    expect(getVersionDiffLead(diff)).toContain('campos alterados')
    expect(getVersionDiffLead(diff)).toContain('itens adicionados')
  })

  it('gera resumo em Markdown para copiar comparação', () => {
    const markdown = buildVersionComparisonMarkdown({ previousVersion, currentVersion })

    expect(markdown).toContain('# Comparação de versões')
    expect(markdown).toContain('Comparando: V1 -> V2')
    expect(markdown).toContain('- Critério novo')
    expect(markdown).toContain('- Regra nova')
  })
})
