import { describe, expect, it } from 'vitest'
import {
  buildStoryJiraLike,
  buildStoryMarkdown,
  buildStoryPlainText,
} from './storyExport'

const story = {
  acceptance_criteria: ['Critério A', 'Critério B'],
  business_rules: ['Regra fiscal'],
  gaps: ['Validar exceção'],
  notes: 'Observação final',
  objective: 'Reduzir retrabalho.',
  qa_checklist: ['Testar cenário feliz'],
  title: 'Filtro avançado',
  user_story: 'Como PM, quero filtrar itens para priorizar o backlog.',
}

describe('storyExport', () => {
  it('gera texto simples com user story e critérios de aceite', () => {
    const text = buildStoryPlainText(story)

    expect(text).toContain('User story: Como PM, quero filtrar itens')
    expect(text).toContain('Critérios de aceite:')
    expect(text).toContain('1. Critério A')
  })

  it('gera Markdown completo para backlog', () => {
    const markdown = buildStoryMarkdown(story)

    expect(markdown).toContain('# Filtro avançado')
    expect(markdown).toContain('## Critérios de aceite')
    expect(markdown).toContain('- Regra fiscal')
  })

  it('gera formato textual compatível com colagem no Jira', () => {
    const jiraText = buildStoryJiraLike(story)

    expect(jiraText).toContain('Summary: Filtro avançado')
    expect(jiraText).toContain('h2. User story')
    expect(jiraText).toContain('# Critério A')
  })

  it('mantém fallback quando não há critérios', () => {
    expect(buildStoryPlainText({ user_story: 'História curta' })).toContain('Critérios de aceite:\n-')
  })
})
