function WorkspaceEmptyState({ hasDraft }) {
  return (
    <section className="panel workspace-state workspace-state--empty">
      <div className="workspace-state__content">
        <p className="workspace-state__eyebrow">Pronto para começar</p>
        <h2>Cole um contexto real para abrir a primeira revisão.</h2>
        <p>
          Cole uma dor do usuário, um problema de fluxo, uma regra de negócio ou uma demanda do
          backlog. O ProdForge transforma isso em uma user story com critérios de aceite, gaps e
          checklist de QA.
        </p>

        <div className="workspace-state__tips">
          <div className="workspace-state__tip">
            <strong>Contexto</strong>
            <span>Descreva o problema, impacto no produto e quem é afetado.</span>
          </div>
          <div className="workspace-state__tip">
            <strong>Requisitos</strong>
            <span>Liste regras, critérios mínimos e cenários alternativos.</span>
          </div>
          <div className="workspace-state__tip">
            <strong>Próximo passo</strong>
            <span>
              {hasDraft
                ? 'Complete o brief e gere a primeira versão.'
                : 'Preencha o brief guiado à esquerda para começar.'}
            </span>
          </div>
        </div>

        <div className="workspace-state__actions">
          <a className="btn btn-secondary" href="#workspace-composer">
            Preencher o brief
          </a>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
