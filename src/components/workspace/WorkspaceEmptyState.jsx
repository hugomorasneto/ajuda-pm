function WorkspaceEmptyState({ hasDraft }) {
  return (
    <section className="panel workspace-state workspace-state--empty workspace-state--compact">
      <div className="workspace-state__content">
        <div className="workspace-state__copy">
          <p className="workspace-state__eyebrow">Primeira versão</p>
          <h2>{hasDraft ? 'Matéria-prima pronta para forjar.' : 'A user story aparecerá aqui.'}</h2>
          <p>
            Depois de acionar a forja, este espaço mostra título, objetivo, user story e critérios de aceite para refino.
          </p>
        </div>

        <ul className="workspace-state__hints" aria-label="Próximos passos da bancada">
          <li>
            <span className="workspace-state__hint-mark" aria-hidden="true">1</span>
            Escreva o briefing no campo principal.
          </li>
          <li>
            <span className="workspace-state__hint-mark" aria-hidden="true">2</span>
            Adicione ligas e regras se tiver detalhes.
          </li>
          <li>
            <span className="workspace-state__hint-mark" aria-hidden="true">3</span>
            Clique em Forjar primeira versão.
          </li>
        </ul>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
