const guideSlugs = [
  ['fundamentos-produto-agil', 'agile-product-foundations'],
  ['user-stories-na-pratica', 'user-stories-in-practice'],
  ['backlog-e-refinamento', 'backlog-and-refinement'],
  ['scrum-para-pm-po', 'scrum-for-pms-and-pos'],
  ['discovery-leve', 'lightweight-discovery'],
  ['refinamento-e-criterios', 'refinement-and-acceptance-criteria'],
  ['alinhamento-com-stakeholders', 'stakeholder-alignment'],
]

export const learningRoutes = [
  { id: 'learning', learning: true, 'pt-BR': '/aprender', en: '/en/learn' },
  ...guideSlugs.map(([guideSlug, englishSlug]) => ({
    id: 'learning-' + guideSlug,
    learning: true,
    guideSlug,
    'pt-BR': '/aprender/' + guideSlug,
    en: '/en/learn/' + englishSlug,
  })),
]
