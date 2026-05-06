function WorkspaceEmptyState({ hasDraft }) {
  return (
    <section className="panel workspace-state workspace-state--empty workspace-state--compact">
      <div className="workspace-state__content">
        <div className="workspace-state__copy">
          <p className="workspace-state__eyebrow">Primeira versão</p>
          <h2>{hasDraft ? 'Pronta para a forja.' : 'A primeira versão aparecerá aqui.'}</h2>
          <p>
            Depois da forja, este espaço mostra a user story estruturada para refino.
          </p>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
