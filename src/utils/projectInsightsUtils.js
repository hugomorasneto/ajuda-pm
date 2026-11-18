import portuguese from '../i18n/locales/pt-BR/projectInsights.json'

export function defaultProjectInsightCopy(key, values = {}) {
  const suffix = values.count === 1 ? '_one' : '_other'
  const template = portuguese[key] ?? portuguese[key + suffix]
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name]))
}

export function formatProjectStoryCount(count, t = defaultProjectInsightCopy) {
  const numericCount = Number(count ?? 0)
  const safeCount = Number.isFinite(numericCount) && numericCount > 0 ? numericCount : 0
  return t('story_count', { count: safeCount })
}

export function getProjectInsightFreshness(item, currentStoryCount, t = defaultProjectInsightCopy) {
  const savedStoryCount = Number(item?.input_story_count ?? item?.analysis?.meta?.analyzed_stories ?? 0)
  const numericCurrentCount = Number(currentStoryCount ?? 0)
  const safeCurrentCount = Number.isFinite(numericCurrentCount) && numericCurrentCount > 0 ? numericCurrentCount : 0

  if (!item) {
    return {
      label: t('no_saved_baseline'),
      description: t('no_saved_baseline_detail'),
      tone: 'idle',
      savedStoryCount: 0,
      isOutdated: false,
    }
  }

  if (!Number.isFinite(savedStoryCount) || savedStoryCount <= 0) {
    return {
      label: t('missing_baseline'),
      description: t('missing_baseline_detail'),
      tone: 'attention',
      savedStoryCount: Number.isFinite(savedStoryCount) ? savedStoryCount : 0,
      isOutdated: true,
    }
  }

  if (safeCurrentCount > savedStoryCount) {
    const diff = safeCurrentCount - savedStoryCount
    return {
      label: t('stale'),
      description: t('new_stories', { count: diff }),
      tone: 'attention',
      savedStoryCount,
      isOutdated: true,
    }
  }

  if (safeCurrentCount < savedStoryCount) {
    return {
      label: t('scope_changed'),
      description: t('scope_changed_detail', {
        saved: formatProjectStoryCount(savedStoryCount, t),
        current: formatProjectStoryCount(safeCurrentCount, t),
      }),
      tone: 'tech',
      savedStoryCount,
      isOutdated: true,
    }
  }

  return {
    label: t('up_to_date'),
    description: t('aligned', { count: safeCurrentCount }),
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

function formatCandidateStoryLine(item, t) {
  const candidate = asProjectText(item?.candidate, t('untitled_candidate'))
  const storyTitle = asProjectText(item?.story?.title, '')

  if (!storyTitle) {
    return `- [ ] ${t('candidate_to_link', { candidate })}`
  }

  return `- [ ] ${t('linked_candidate', { story: storyTitle, candidate })}`
}

export function buildProjectActionPlanMarkdown({
  project,
  analysis,
  candidateStories = [],
  freshness,
  storyCount = 0,
}, t = defaultProjectInsightCopy) {
  if (!analysis) return ''

  const projectName = asProjectText(project?.name, t('project'))
  const healthLabel = asProjectText(analysis.health_label, t('in_progress'))
  const freshnessLabel = freshness?.label ? `${freshness.label} — ${freshness.description}` : t('no_freshness')
  const candidates = Array.isArray(candidateStories) ? candidateStories : []
  const candidateLines =
    candidates.length > 0
      ? candidates.map((item) => formatCandidateStoryLine(item, t)).join('\n')
      : `- [ ] ${t('no_linked_candidates')}`

  return [
    `# ${t('plan_title', { project: projectName })}`,
    `**${t('health')}:** ${healthLabel}`,
    `**${t('diagnosis_status')}:** ${freshnessLabel}`,
    `**${t('project_story_count')}:** ${formatProjectStoryCount(storyCount, t)}`,
    '',
    `## ${t('summary')}`,
    asProjectText(analysis.summary, t('no_summary')),
    '',
    `## ${t('next_steps')}`,
    formatMarkdownChecklist(analysis.next_actions, t('decide_next_step')),
    '',
    `## ${t('questions')}`,
    formatMarkdownChecklist(analysis.refinement_questions, t('check_questions')),
    '',
    `## ${t('risks_to_address')}`,
    formatMarkdownChecklist(analysis.risks, t('no_risks')),
    '',
    `## ${t('candidates')}`,
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
