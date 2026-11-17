import portuguese from '../i18n/locales/pt-BR/storyFormat.json'

export function defaultStoryFormat(key, values = {}) {
  const suffix = values.count === 1 ? '_one' : '_other'
  const template = portuguese[key] ?? portuguese[key + suffix]
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name]))
}

const storyStatusKeys = {
  generated: 'generated',
  reviewed: 'reviewed',
  approved: 'approved',
  archived: 'archived',
}

export function resolveStoryNotes(story, format = defaultStoryFormat) {
  if (story.refinementInstruction) return format('refinement_note', { instruction: story.refinementInstruction })
  if (story.storedStatus) return format('status_note', { status: format(storyStatusKeys[story.storedStatus] ?? 'generated') })
  return story.notes
}
