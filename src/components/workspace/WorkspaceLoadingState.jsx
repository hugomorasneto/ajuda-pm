const loadingPresets = {
  generate: {
    steps: [
      { label: 'Aquecendo a forja…', pct: 30 },
      { label: 'Refinando a estrutura…', pct: 65 },
      { label: 'Preparando critérios…', pct: 90 },
    ],
  },
  selection: {
    steps: [
      { label: 'Buscando a story…', pct: 40 },
      { label: 'Abrindo documento…', pct: 75 },
      { label: 'Sincronizando versões…', pct: 95 },
    ],
  },
}

function WorkspaceLoadingState({ mode = 'generate' }) {
  const preset = loadingPresets[mode] ?? loadingPresets.generate

  return (
    <section className="panel workspace-state workspace-state--loading" aria-live="polite" aria-label="Carregando">
      <div className="workspace-state__content">
        {/* Skeleton that mimics the real document structure */}
        <div className="workspace-state__skeleton" aria-hidden="true">
          {/* title skeleton */}
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--title" />
          {/* user story sentence */}
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--lg" />
          <span className="workspace-state__skeleton-line" />
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--md" />
          {/* criteria block */}
          <span className="workspace-state__skeleton-card" />
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--sm" />
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--md" />
          <span className="workspace-state__skeleton-line workspace-state__skeleton-line--sm" />
        </div>

        {/* Animated progress steps */}
        <div className="workspace-state__progress-steps">
          {preset.steps.map((step) => (
            <div key={step.label} className="workspace-state__progress-row">
              <span className="workspace-state__progress-label">{step.label}</span>
              <div className="workspace-state__progress-track">
                <span
                  className="workspace-state__progress-fill"
                  style={{ '--target-pct': `${step.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WorkspaceLoadingState
