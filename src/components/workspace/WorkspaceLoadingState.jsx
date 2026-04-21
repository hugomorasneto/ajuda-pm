const loadingPresets = {
  generate: {
    eyebrow: 'Gerando',
    title: 'Estruturando a user story',
    description:
      'O contexto está sendo organizado em um documento de revisão. O conteúdo preenchido continua preservado.',
    steps: ['Analisando o contexto', 'Estruturando a user story', 'Revisando critérios de aceite'],
  },
  selection: {
    eyebrow: 'Carregando',
    title: 'Abrindo a user story selecionada',
    description:
      'O ProdForge está trazendo o documento salvo, as versões relacionadas e o estado atual da área de trabalho.',
    steps: ['Buscando a user story', 'Atualizando o documento', 'Sincronizando versões e histórico'],
  },
}

function WorkspaceLoadingState({ mode = 'generate' }) {
  const preset = loadingPresets[mode] ?? loadingPresets.generate

  return (
    <section className="panel workspace-state workspace-state--loading" aria-live="polite">
      <div className="workspace-state__content">
        <p className="workspace-state__eyebrow">{preset.eyebrow}</p>
        <h2>{preset.title}</h2>
        <p>{preset.description}</p>

        <ol className="workspace-state__steps">
          {preset.steps.map((step, index) => (
            <li key={step}>
              <span className="workspace-state__step-index">{`0${index + 1}`}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="workspace-state__skeleton" aria-hidden="true">
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--lg" />
          <span className="workspace-state__skeleton-line" />
          <span className="workspace-state__skeleton-line" />
          <span className="workspace-state__skeleton-card" />
        </div>
      </div>
    </section>
  )
}

export default WorkspaceLoadingState
