import { defaultStoryFormat, resolveStoryNotes } from './storyFormat'

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

export function buildStoryPlainText(story, t = defaultStoryFormat) {
  if (!story) return ''

  const acceptanceCriteria = normalizeList(story.acceptance_criteria)

  return [
    `${t('user_story')}: ${withFallbackText(story.user_story)}`,
    '',
    t('criteria') + ':',
    acceptanceCriteria.length > 0
      ? acceptanceCriteria.map((item, index) => `${index + 1}. ${item}`).join('\n')
      : '-',
  ]
    .filter((section) => section !== '')
    .join('\n')
}

export function buildStoryMarkdown(story, t = defaultStoryFormat) {
  if (!story) return ''

  const acceptanceCriteria = normalizeList(story.acceptance_criteria)
  const businessRules = normalizeList(story.business_rules)
  const gaps = normalizeList(story.gaps)
  const qaChecklist = normalizeList(story.qa_checklist)
  const notes = resolveStoryNotes(story, t)

  return joinSections([
    `# ${withFallbackText(story.title, t('user_story'))}`,
    buildSection(t('goal'), withFallbackText(story.objective)),
    buildSection(t('user_story'), withFallbackText(story.user_story)),
    buildSection(
      t('criteria'),
      acceptanceCriteria.map((item, index) => `${index + 1}. ${item}`).join('\n'),
    ),
    businessRules.length > 0
      ? buildSection(t('business_rules'), businessRules.map((item) => `- ${item}`).join('\n'))
      : '',
    gaps.length > 0 ? buildSection(t('gaps'), gaps.map((item) => `- ${item}`).join('\n')) : '',
    qaChecklist.length > 0
      ? buildSection(t('qa'), qaChecklist.map((item) => `- ${item}`).join('\n'))
      : '',
    notes ? buildSection(t('notes'), notes.trim()) : '',
  ])
}

export function buildStoryJiraLike(story, t = defaultStoryFormat) {
  if (!story) return ''

  const acceptanceCriteria = normalizeList(story.acceptance_criteria)
  const businessRules = normalizeList(story.business_rules)
  const gaps = normalizeList(story.gaps)
  const qaChecklist = normalizeList(story.qa_checklist)
  const notes = resolveStoryNotes(story, t)

  return joinSections([
    `${t('jira_summary')}: ${withFallbackText(story.title, t('user_story'))}`,
    buildJiraSection(t('goal'), withFallbackText(story.objective)),
    buildJiraSection(t('user_story'), withFallbackText(story.user_story)),
    buildJiraSection(
      t('criteria'),
      acceptanceCriteria.map((item) => `# ${item}`).join('\n'),
    ),
    businessRules.length > 0
      ? buildJiraSection(t('business_rules'), businessRules.map((item) => `* ${item}`).join('\n'))
      : '',
    gaps.length > 0 ? buildJiraSection(t('gaps'), gaps.map((item) => `* ${item}`).join('\n')) : '',
    qaChecklist.length > 0
      ? buildJiraSection(t('qa'), qaChecklist.map((item) => `* ${item}`).join('\n'))
      : '',
    notes ? buildJiraSection(t('notes'), notes.trim()) : '',
  ])
}

export async function copyTextToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Alguns navegadores bloqueiam a API assíncrona; o fallback mantém a ação local de cópia.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)
  const didCopy = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!didCopy) {
    throw new Error('Não foi possível copiar o texto.')
  }
}
