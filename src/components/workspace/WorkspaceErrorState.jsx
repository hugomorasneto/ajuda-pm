function WorkspaceErrorState({
  message,
  canRetry,
  onRetry,
  title = 'Não foi possível concluir esta etapa agora.',
  note = 'A matéria-prima preenchida foi preservada. Revise a bancada à esquerda e tente novamente quando estiver pronto.',
  retryLabel = 'Tentar novamente',
  secondaryAction = null,
}) {
  return (
    <section className="panel workspace-state workspace-state--error" aria-live="polite">
      <div className="workspace-state__content">
        <p className="workspace-state__eyebrow">Erro</p>
        <h2>{title}</h2>
        <p>{message}</p>
        {note ? <p className="workspace-state__note">{note}</p> : null}

        <div className="workspace-state__actions">
          <button type="button" className="btn btn-primary" onClick={onRetry} disabled={!canRetry}>
            {retryLabel}
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
