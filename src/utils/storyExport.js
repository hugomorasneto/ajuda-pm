function normalizeList(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => String(item).trim()).filter(Boolean)
}

function withFallbackText(value, fallback = '-') {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || fallback
}

function buildSection(title, body) {
  if (!body) return ''
  return `## ${title}\n${body}`.trim()
}

function buildJiraSection(title, body) {
  if (!body) return ''
  return `h2. ${title}\n${body}`.trim()
}

function joinSections(sections) {
  return sections.filter(Boolean).join('\n\n').trim()
}

export function buildStoryMarkdown(story) {
  if (!story) return ''

  const acceptanceCriteria = normalizeList(story.acceptance_criteria)
  const businessRules = normalizeList(story.business_rules)
  const gaps = normalizeList(story.gaps)
  const qaChecklist = normalizeList(story.qa_checklist)

  return joinSections([
    `# ${withFallbackText(story.title, 'User story')}`,
    buildSection('Objetivo', withFallbackText(story.objective)),
    buildSection('User story', withFallbackText(story.user_story)),
    buildSection(
      'Critérios de aceite',
      acceptanceCriteria.map((item, index) => `${index + 1}. ${item}`).join('\n'),
    ),
    businessRules.length > 0
      ? buildSection('Regras de negócio', businessRules.map((item) => `- ${item}`).join('\n'))
      : '',
    gaps.length > 0 ? buildSection('Gaps', gaps.map((item) => `- ${item}`).join('\n')) : '',
    qaChecklist.length > 0
      ? buildSection('Checklist de QA', qaChecklist.map((item) => `- ${item}`).join('\n'))
      : '',
    story.notes ? buildSection('Notas', story.notes.trim()) : '',
  ])
}

export function buildStoryJiraLike(story) {
  if (!story) return ''

  const acceptanceCriteria = normalizeList(story.acceptance_criteria)
  const businessRules = normalizeList(story.business_rules)
  const gaps = normalizeList(story.gaps)
  const qaChecklist = normalizeList(story.qa_checklist)

  return joinSections([
    `Summary: ${withFallbackText(story.title, 'User story')}`,
    buildJiraSection('Objetivo', withFallbackText(story.objective)),
    buildJiraSection('User story', withFallbackText(story.user_story)),
    buildJiraSection(
      'Critérios de aceite',
      acceptanceCriteria.map((item) => `# ${item}`).join('\n'),
    ),
    businessRules.length > 0
      ? buildJiraSection('Regras de negócio', businessRules.map((item) => `* ${item}`).join('\n'))
      : '',
    gaps.length > 0 ? buildJiraSection('Gaps', gaps.map((item) => `* ${item}`).join('\n')) : '',
    qaChecklist.length > 0
      ? buildJiraSection('Checklist de QA', qaChecklist.map((item) => `* ${item}`).join('\n'))
      : '',
    story.notes ? buildJiraSection('Notas', story.notes.trim()) : '',
  ])
}

export async function copyTextToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
