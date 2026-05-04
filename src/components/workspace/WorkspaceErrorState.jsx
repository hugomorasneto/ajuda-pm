function WorkspaceErrorState({ message, canRetry, onRetry }) {
  return (
    <section className="panel workspace-state workspace-state--error" aria-live="polite">
      <div className="workspace-state__content">
        <p className="workspace-state__eyebrow">Erro</p>
        <h2>Não foi possível concluir esta etapa agora.</h2>
        <p>{message}</p>
        <p className="workspace-state__note">
          A matéria-prima preenchida foi preservada. Revise a bancada à esquerda e tente novamente quando
          estiver pronto.
        </p>

        <div className="workspace-state__actions">
          <button type="button" className="btn btn-primary" onClick={onRetry} disabled={!canRetry}>
            Tentar novamente
          </button>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceErrorState
