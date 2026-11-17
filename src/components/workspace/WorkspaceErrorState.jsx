import { useCopy } from '../../i18n/context'
function WorkspaceErrorState({
  message,
  canRetry,
  onRetry,
  title,
  note,
  retryLabel,
  secondaryAction = null,
}) {
  const t = useCopy('forge')
  return (
    <section className="panel workspace-state workspace-state--error" aria-live="polite">
      <div className="workspace-state__content">
        <p className="workspace-state__eyebrow">{t('error')}</p>
        <h2>{title ?? t('could_not_complete_this_step_try')}</h2>
        <p>{message}</p>
        <p className="workspace-state__note">{note ?? t('your_brief_is_still_here_review')}</p>

        <div className="workspace-state__actions">
          <button type="button" className="btn btn-primary" onClick={onRetry} disabled={!canRetry}>
            {retryLabel ?? t('try_again')}
          </button>
          {secondaryAction ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
            >
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default WorkspaceErrorState
