function normalizeSearchToken(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function normalizeStorySearchQuery(value) {
  return normalizeSearchToken(value)
}

export function storyMatchesSearch(story, query) {
  const normalizedQuery = normalizeStorySearchQuery(query)
  if (!normalizedQuery) return true

  const searchableText = [
    story?.title,
    story?.input_context,
    story?.input_requirements,
    story?.user_story,
    story?.objective,
    story?.estimation_status,
    story?.project_name,
  ]
    .map(normalizeSearchToken)
    .filter(Boolean)
    .join(' ')

  return searchableText.includes(normalizedQuery)
}
