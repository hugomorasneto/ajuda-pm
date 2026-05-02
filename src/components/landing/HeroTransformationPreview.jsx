function HeroTransformationPreview({ preview }) {
  return (
    <div className="hero-transformation-preview" aria-label="Preview da transformação do briefing">
      <div className="hero-transformation-preview__frame forge-texture-layer">
        <div className="hero-transformation-preview__chrome" aria-hidden="true">
          <span className="hero-transformation-preview__chrome-dot hero-transformation-preview__chrome-dot--red" />
          <span className="hero-transformation-preview__chrome-dot hero-transformation-preview__chrome-dot--yellow" />
          <span className="hero-transformation-preview__chrome-dot hero-transformation-preview__chrome-dot--green" />
          <span className="hero-transformation-preview__chrome-title">ProdForge — área de trabalho</span>
        </div>

        <div className="hero-transformation-preview__frame-top">
          <span className="hero-transformation-preview__frame-chip forge-badge forge-badge--neutral">Entrada real</span>
          <span className="hero-transformation-preview__frame-chip forge-badge forge-badge--tech">Forja da story</span>
          <span className="hero-transformation-preview__frame-chip forge-badge forge-badge--success">Saída pronta</span>
        </div>

        <div className="hero-transformation-preview__stage">
          <div className="hero-transformation-preview__messy forge-panel forge-panel--warning">
            <p className="hero-transformation-preview__label">{preview.problemLabel}</p>
            <h3>{preview.problemTitle}</h3>
            <ul className="hero-transformation-preview__messy-list">
              {preview.problemItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="hero-transformation-preview__status forge-status-pill forge-status-pill--gap">
              {preview.problemStatus}
            </span>
          </div>

          <div className="hero-transformation-preview__forge-core" aria-hidden="true">
            <div className="hero-transformation-preview__forge-shell">
              <div className="hero-transformation-preview__forge-cap" />
              <div className="hero-transformation-preview__forge-mouth">
                <div className="hero-transformation-preview__forge-glow" />
              </div>
              <div className="hero-transformation-preview__forge-stream" />
            </div>
            <div className="hero-transformation-preview__forge-copy">
              <p className="hero-transformation-preview__label">{preview.transitionLabel}</p>
              <strong>{preview.furnaceTitle}</strong>
              <span>{preview.furnaceBody}</span>
              <span className="forge-glow-line forge-glow-line--ember" />
            </div>
          </div>

          <div className="hero-transformation-preview__output">
            <div className="hero-transformation-preview__document forge-panel forge-panel--active-ember">
              <div className="hero-transformation-preview__document-header">
                <p className="hero-transformation-preview__label">{preview.storyLabel}</p>
                <div className="hero-transformation-preview__document-pills" aria-hidden="true">
                  {preview.outputPills.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>

              <h3>{preview.storyTitle}</h3>

              <div className="hero-transformation-preview__section">
                <strong>{preview.objectiveLabel}</strong>
                <p>{preview.objective}</p>
              </div>

              <div className="hero-transformation-preview__section">
                <strong>{preview.criteriaLabel}</strong>
                <ul>
                  {preview.criteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="hero-transformation-preview__quality">
                <div className="hero-transformation-preview__quality-header">
                  <span>{preview.qualityLabel}</span>
                  <strong>{preview.qualityValue}</strong>
                </div>
                <div className="forge-metric-bar forge-metric-bar--ember" style={{ '--forge-metric-value': preview.qualityValue }}>
                  <div className="forge-metric-bar__track">
                    <span className="forge-metric-bar__fill" />
                  </div>
                </div>
                <span className="hero-transformation-preview__status forge-status-pill forge-status-pill--ready">
                  {preview.readyLabel}
                </span>
              </div>
            </div>

            <aside className="hero-transformation-preview__rail">
              <div className="hero-transformation-preview__rail-block forge-panel forge-panel--warning">
                <p className="hero-transformation-preview__label">{preview.gapsLabel}</p>
                <ul>
                  {preview.gaps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="hero-transformation-preview__rail-block forge-panel forge-panel--active-tech">
                <p className="hero-transformation-preview__label">{preview.qaLabel}</p>
                <ul>
                  {preview.qa.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>

        <div className="hero-transformation-preview__footer" aria-label="Resultados da forja">
          {preview.footerHighlights.map((item, index) => (
            <span
              key={item}
              className={`hero-transformation-preview__footer-pill forge-status-pill ${
                index === 0 ? 'forge-status-pill--ready' : 'forge-status-pill--tech'
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeroTransformationPreview
