const templateIds = [
  ['recuperacao-senha', '🔑'],
  ['onboarding-b2b', '🏢'],
  ['filtro-busca', '🔍'],
  ['notificacao-pagamento', '💳'],
]

export function getQuickTemplates(t) {
  return templateIds.map(([id, emoji]) => ({
    id,
    emoji,
    label: t(id + '.label'),
    context: t(id + '.context'),
    requirements: t(id + '.requirements'),
  }))
}
