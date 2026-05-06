function WorkspaceEmptyState({ hasDraft }) {
  return (
    <section className="panel workspace-state workspace-state--empty workspace-state--compact workspace-state--pre-forge">
      <div className="workspace-state__content">
        <div className="workspace-state__copy">
          <p className="workspace-state__eyebrow">Depois da forja</p>
          <h2>{hasDraft ? 'Pronta para mostrar a primeira versão.' : 'Resultado e inspeção aparecem aqui.'}</h2>
          <p>
            Depois da forja, você verá aqui a primeira versão e a inspeção da peça.
          </p>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
