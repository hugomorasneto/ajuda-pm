import portuguese from './pt-BR/learningEditorial.json' with { type: 'json' }

export const starterGuideSlugs = [
  'fundamentos-produto-agil',
  'user-stories-na-pratica',
  'backlog-e-refinamento',
  'refinamento-e-criterios',
  'alinhamento-com-stakeholders',
]

const guideDetails = [
  { slug: 'fundamentos-produto-agil', nextReads: ['user-stories-na-pratica', 'backlog-e-refinamento'], readingTime: '6 min' },
  { slug: 'user-stories-na-pratica', nextReads: ['backlog-e-refinamento', 'discovery-leve'], readingTime: '7 min' },
  { slug: 'backlog-e-refinamento', nextReads: ['scrum-para-pm-po', 'user-stories-na-pratica'], readingTime: '6 min' },
  { slug: 'scrum-para-pm-po', nextReads: ['backlog-e-refinamento', 'discovery-leve'], readingTime: '7 min' },
  { slug: 'discovery-leve', nextReads: ['fundamentos-produto-agil', 'user-stories-na-pratica'], readingTime: '6 min' },
  { slug: 'refinamento-e-criterios', nextReads: ['user-stories-na-pratica', 'backlog-e-refinamento'], readingTime: '7 min' },
  { slug: 'alinhamento-com-stakeholders', nextReads: ['backlog-e-refinamento', 'discovery-leve'], readingTime: '6 min' },
]

const noteDetails = [
  { slug: 'ia-para-melhorar-user-stories', targetGuideSlug: 'user-stories-na-pratica' },
  { slug: 'como-conversar-melhor-com-dev', targetGuideSlug: 'backlog-e-refinamento' },
  { slug: 'sinais-de-backlog-mal-definido', targetGuideSlug: 'fundamentos-produto-agil' },
  { slug: 'criterio-de-aceite-vs-caso-de-teste', targetGuideSlug: 'refinamento-e-criterios' },
  { slug: 'como-evitar-surpresa-na-review', targetGuideSlug: 'alinhamento-com-stakeholders' },
]

const guidesBySlug = new Map(guideDetails.map((guide) => [guide.slug, guide]))

export const learningGuides = guideDetails.map(({ slug }) => getLearningGuideBySlug(slug))

export function getLearningGuideBySlug(slug, catalog = portuguese) {
  const details = guidesBySlug.get(slug)
  return details ? { ...details, ...catalog.guides[slug] } : null
}

export function getLearningGuidesBySlugs(slugs, catalog) {
  return slugs.map((slug) => getLearningGuideBySlug(slug, catalog)).filter(Boolean)
}

export function getLearningNotes(catalog = portuguese) {
  return noteDetails.map((note) => ({ ...note, ...catalog.notes[note.slug] }))
}
