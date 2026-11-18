import { defaultStoryFormat } from './storyFormat'

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

export function buildVersionDiff(previousVersion, currentVersion, t = defaultStoryFormat) {
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
      label: t('title'),
      changed: hasTextChanged(previousVersion.title, currentVersion.title),
    },
    {
      key: 'objective',
      label: t('goal'),
      changed: hasTextChanged(previousVersion.objective, currentVersion.objective),
    },
    {
      key: 'user_story',
      label: t('user_story'),
      changed: hasTextChanged(previousVersion.user_story, currentVersion.user_story),
    },
    {
      key: 'notes',
      label: t('refinement'),
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

export function getVersionDiffLead(diff, t = defaultStoryFormat) {
  if (!diff) return t('first_comparison')
  if (diff.totalChanges === 0) return t('no_changes')

  const entries = [
    ['fields_changed', diff.textChangesCount],
    ['items_added', diff.totalAdded],
    ['items_removed', diff.totalRemoved],
  ]
  const changes = entries.filter(([, count]) => count > 0)
    .map(([key, count]) => t(key, { count }))
  return t('comparison_lead', { changes: changes.join(', ') })
}

function formatList(items, fallback) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`
}

export function buildVersionComparisonMarkdown(
  { previousVersion, currentVersion }, t = defaultStoryFormat,
) {
  const diff = buildVersionDiff(previousVersion, currentVersion, t)
  if (!diff) return ''

  const changedFields = diff.fieldChanges.filter((item) => item.changed)
  const sections = [
    ['fields', changedFields.map((item) => item.label), t('no_fields')],
    ['criteria_added', diff.acceptanceCriteria.added],
    ['criteria_removed', diff.acceptanceCriteria.removed],
    ['rules_added', diff.businessRules.added],
    ['gaps_added', diff.gaps.added],
    ['qa_added', diff.qaChecklist.added],
  ]
  return [
    `# ${t('comparison')}`,
    '',
    `${t('artifact')}: ${normalizeText(currentVersion.title) || t('user_story')}`,
    `${t('comparing')}: ${diff.previousLabel} -> ${diff.currentLabel}`,
    '',
    `## ${t('summary')}`,
    getVersionDiffLead(diff, t),
    ...sections.flatMap(([heading, items, empty = t('no_items')]) => [
      '', `## ${t(heading)}`, formatList(items, empty),
    ]),
  ].join('\n')
}
