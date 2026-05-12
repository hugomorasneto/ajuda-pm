export function formatProjectStoryCount(count) {
  const numericCount = Number(count ?? 0)
  const safeCount = Number.isFinite(numericCount) && numericCount > 0 ? numericCount : 0
  return `${safeCount} ${safeCount === 1 ? 'história' : 'histórias'}`
}

export function getProjectInsightFreshness(item, currentStoryCount) {
  const savedStoryCount = Number(item?.input_story_count ?? item?.analysis?.meta?.analyzed_stories ?? 0)
  const numericCurrentCount = Number(currentStoryCount ?? 0)
  const safeCurrentCount = Number.isFinite(numericCurrentCount) && numericCurrentCount > 0 ? numericCurrentCount : 0

  if (!item) {
    return {
      label: 'Sem referência salva',
      description: 'Gere ou reabra um diagnóstico para comparar com o projeto atual.',
      tone: 'idle',
      savedStoryCount: 0,
      isOutdated: false,
    }
  }

  if (!Number.isFinite(savedStoryCount) || savedStoryCount <= 0) {
    return {
      label: 'Base não registrada',
      description: 'Este diagnóstico não informa quantas histórias foram usadas na análise.',
      tone: 'attention',
      savedStoryCount: Number.isFinite(savedStoryCount) ? savedStoryCount : 0,
      isOutdated: true,
    }
  }

  if (safeCurrentCount > savedStoryCount) {
    const diff = safeCurrentCount - savedStoryCount
    return {
      label: 'Desatualizado',
      description: `${formatProjectStoryCount(diff)} ${diff === 1 ? 'nova' : 'novas'} após este diagnóstico.`,
      tone: 'attention',
      savedStoryCount,
      isOutdated: true,
    }
  }

  if (safeCurrentCount < savedStoryCount) {
    return {
      label: 'Recorte mudou',
      description: `Criado com ${formatProjectStoryCount(savedStoryCount)}; o projeto tem ${formatProjectStoryCount(safeCurrentCount)} agora.`,
      tone: 'tech',
      savedStoryCount,
      isOutdated: true,
    }
  }

  return {
    label: 'Atualizado',
    description:
      safeCurrentCount === 1
        ? 'Base alinhada com a história atual do projeto.'
        : `Base alinhada com as ${formatProjectStoryCount(safeCurrentCount)} atuais do projeto.`,
    tone: 'ready',
    savedStoryCount,
    isOutdated: false,
  }
}

export function normalizeProjectSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function asProjectText(value, fallback = '') {
  const cleaned = typeof value === 'string' ? value.trim() : ''
  return cleaned || fallback
}

function asProjectList(value, fallback = []) {
  if (!Array.isArray(value)) return fallback

  const cleaned = value.map((item) => String(item).trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : fallback
}

function formatMarkdownChecklist(items, fallback) {
  const normalizedItems = asProjectList(items, [])
  if (normalizedItems.length === 0) return `- [ ] ${fallback}`

  return normalizedItems.map((item) => `- [ ] ${item}`).join('\n')
}

function formatCandidateStoryLine(item) {
  const candidate = asProjectText(item?.candidate, 'Candidata sem nome')
  const storyTitle = asProjectText(item?.story?.title, '')

  if (!storyTitle) {
    return `- [ ] ${candidate} — vincular manualmente a uma história do projeto`
  }

  return `- [ ] ${storyTitle} — sugestão da IA: ${candidate}`
}

export function buildProjectActionPlanMarkdown({
  project,
  analysis,
  candidateStories = [],
  freshness,
  storyCount = 0,
}) {
  if (!analysis) return ''

  const projectName = asProjectText(project?.name, 'Projeto')
  const healthLabel = asProjectText(analysis.health_label, 'Em organização')
  const freshnessLabel = freshness?.label ? `${freshness.label} — ${freshness.description}` : 'Sem referência de atualização.'
  const candidates = Array.isArray(candidateStories) ? candidateStories : []
  const candidateLines =
    candidates.length > 0
      ? candidates.map(formatCandidateStoryLine).join('\n')
      : '- [ ] Nenhuma candidata conectada automaticamente pelo diagnóstico.'

  return [
    `# Plano de ação do projeto: ${projectName}`,
    `**Saúde do projeto:** ${healthLabel}`,
    `**Status do diagnóstico:** ${freshnessLabel}`,
    `**Histórias no projeto:** ${formatProjectStoryCount(storyCount)}`,
    '',
    '## Resumo executivo',
    asProjectText(analysis.summary, 'Nenhum resumo gerado.'),
    '',
    '## Próximos passos',
    formatMarkdownChecklist(analysis.next_actions, 'Definir a próxima ação com o time.'),
    '',
    '## Perguntas para refinamento',
    formatMarkdownChecklist(analysis.refinement_questions, 'Validar dúvidas abertas com PM, PO e time técnico.'),
    '',
    '## Riscos para endereçar',
    formatMarkdownChecklist(analysis.risks, 'Nenhum risco relevante foi destacado.'),
    '',
    '## Candidatas para estimativa',
    candidateLines,
  ].join('\n')
}

export function getProjectStorySearchText(story) {
  return normalizeProjectSearchText([
    story?.title,
    story?.input_context,
    story?.user_story,
  ].filter(Boolean).join(' '))
}

export function findProjectInsightCandidateStory(candidate, stories = []) {
  const normalizedCandidate = normalizeProjectSearchText(candidate)
  if (!normalizedCandidate) return null
  const candidateWordCount = normalizedCandidate.split(' ').filter(Boolean).length

  const candidateTokens = new Set(
    normalizedCandidate
      .split(' ')
      .filter((token) => token.length > 3),
  )

  return stories
    .map((story) => {
      const titleText = normalizeProjectSearchText(story?.title)
      const storyText = getProjectStorySearchText(story)
      const exactScore =
        titleText &&
        (normalizedCandidate === titleText ||
          normalizedCandidate.includes(titleText) ||
          (candidateWordCount > 1 && titleText.includes(normalizedCandidate)))
          ? 100
          : candidateWordCount > 1 && (storyText.includes(normalizedCandidate) || normalizedCandidate.includes(storyText))
            ? 80
            : 0
      const tokenScore = Array.from(candidateTokens).filter((token) => storyText.includes(token)).length

      return {
        score: exactScore + tokenScore,
        story,
      }
    })
    .filter((item) => item.score > 1)
    .sort((left, right) => right.score - left.score)[0]?.story ?? null
}
