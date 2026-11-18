export function formatNotice(t, notice) {
  if (!notice) return ''
  if (typeof notice === 'string') return t(notice)
  const message = t(notice.key, notice.values)
  return notice.keepDraft ? t('generation_failure_draft_kept', { message }) : message
}
