function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeVersionList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return normalizeText(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildListDiff(previousValue, currentValue) {
  const previousItems = normalizeVersionList(previousValue)
  const currentItems = normalizeVersionList(currentValue)

  return {
    added: currentItems.filter((item) => !previousItems.includes(item)),
    removed: previousItems.filter((item) => !currentItems.includes(item)),
    unchangedCount: currentItems.filter((item) => previousItems.includes(item)).length,
    currentCount: currentItems.length,
    previousCount: previousItems.length,
  }
}

function hasTextChanged(previousValue, currentValue) {
  return normalizeText(previousValue) !== normalizeText(currentValue)
}

export function getVersionNumberLabel(version, fallback = '?') {
  const versionNumber = version?.version_number ?? fallback
  return `V${versionNumber}`
}

export function buildVersionDiff(previousVersion, currentVersion) {
  if (!previousVersion || !currentVersion) return null

  const acceptanceCriteria = buildListDiff(
    previousVersion.acceptance_criteria,
    currentVersion.acceptance_criteria,
  )
  const businessRules = buildListDiff(previousVersion.business_rules, currentVersion.business_rules)
  const gaps = buildListDiff(previousVersion.gaps, currentVersion.gaps)
  const qaChecklist = buildListDiff(previousVersion.qa_checklist, currentVersion.qa_checklist)
  const fieldChanges = [
    {
      key: 'title',
      label: 'Título',
      changed: hasTextChanged(previousVersion.title, currentVersion.title),
    },
    {
      key: 'objective',
      label: 'Objetivo',
      changed: hasTextChanged(previousVersion.objective, currentVersion.objective),
    },
    {
      key: 'user_story',
      label: 'User story',
      changed: hasTextChanged(previousVersion.user_story, currentVersion.user_story),
    },
    {
      key: 'notes',
      label: 'Acabamento',
      changed: hasTextChanged(
        previousVersion.regeneration_instruction,
        currentVersion.regeneration_instruction,
      ),
    },
  ]
  const listDiffs = [acceptanceCriteria, businessRules, gaps, qaChecklist]
  const totalAdded = listDiffs.reduce((sum, diff) => sum + diff.added.length, 0)
  const totalRemoved = listDiffs.reduce((sum, diff) => sum + diff.removed.length, 0)
  const textChangesCount = fieldChanges.filter((item) => item.changed).length

  return {
    previousLabel: getVersionNumberLabel(previousVersion),
    currentLabel: getVersionNumberLabel(currentVersion),
    fieldChanges,
    acceptanceCriteria,
    businessRules,
    gaps,
    qaChecklist,
    totalAdded,
    totalRemoved,
    textChangesCount,
    totalChanges: totalAdded + totalRemoved + textChangesCount,
  }
}

export function getVersionDiffLead(diff) {
  if (!diff) {
    return 'Gere uma nova versão para comparar evolução, acabamento e critérios.'
  }

  if (diff.totalChanges === 0) {
    return 'Esta versão manteve a estrutura textual da versão anterior.'
  }

  const parts = []
  if (diff.textChangesCount > 0) {
    parts.push(`${diff.textChangesCount} ${diff.textChangesCount === 1 ? 'campo alterado' : 'campos alterados'}`)
  }
  if (diff.totalAdded > 0) {
    parts.push(`${diff.totalAdded} ${diff.totalAdded === 1 ? 'item adicionado' : 'itens adicionados'}`)
  }
  if (diff.totalRemoved > 0) {
    parts.push(`${diff.totalRemoved} ${diff.totalRemoved === 1 ? 'item removido' : 'itens removidos'}`)
  }

  return `Comparação entre versões com ${parts.join(', ')}.`
}

function formatList(items, fallback = '- Nenhum item') {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : fallback
}

export function buildVersionComparisonMarkdown({ previousVersion, currentVersion }) {
  const diff = buildVersionDiff(previousVersion, currentVersion)
  if (!diff) return ''

  const changedFields = diff.fieldChanges.filter((item) => item.changed)

  return [
    `# Comparação de versões`,
    '',
    `Peça: ${normalizeText(currentVersion.title) || 'User story'}`,
    `Comparando: ${diff.previousLabel} -> ${diff.currentLabel}`,
    '',
    `## Resumo`,
    getVersionDiffLead(diff),
    '',
    `## Campos alterados`,
    formatList(changedFields.map((item) => item.label), '- Nenhum campo textual alterado'),
    '',
    `## Critérios adicionados`,
    formatList(diff.acceptanceCriteria.added),
    '',
    `## Critérios removidos`,
    formatList(diff.acceptanceCriteria.removed),
    '',
    `## Regras adicionadas`,
    formatList(diff.businessRules.added),
    '',
    `## Pontos de atenção adicionados`,
    formatList(diff.gaps.added),
    '',
    `## Itens de QA adicionados`,
    formatList(diff.qaChecklist.added),
  ].join('\n')
}
