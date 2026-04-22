function WorkspaceEmptyState({ hasDraft }) {
  return (
    <section className="panel workspace-state workspace-state--empty">
      <div className="workspace-state__content">
        {/* AI sparkle icon */}
        <div className="workspace-state__icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
            <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z"/>
            <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5z"/>
          </svg>
        </div>

        <div className="workspace-state__copy">
          <h2>{hasDraft ? 'Parece que você tem algo em mente.' : 'Pronto para criar'}</h2>
          <p>
            {hasDraft
              ? 'Clique em Gerar Story para continuar.'
              : 'Preencha o contexto ao lado e clique em Gerar.'}
          </p>
        </div>

        <ul className="workspace-state__hints" aria-label="Dicas">
          <li><span className="workspace-state__hint-mark" aria-hidden="true">✦</span> Seja específico</li>
          <li><span className="workspace-state__hint-mark" aria-hidden="true">✦</span> Use exemplos reais</li>
          <li><span className="workspace-state__hint-mark" aria-hidden="true">✦</span> 1 problema por story</li>
        </ul>

        {!hasDraft && (
          <div className="workspace-state__actions">
            <a className="btn btn-secondary btn-small" href="#workspace-context">
              Preencher contexto
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
