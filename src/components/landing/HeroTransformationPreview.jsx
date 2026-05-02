function HeroTransformationPreview({ preview }) {
  const firstCriterion = preview.criteria[0]
  const firstGap = preview.gaps[0]
  const firstQa = preview.qa[0]

  return (
    <div className="hero-transformation-preview" aria-label="Preview da transformacao do briefing">
      <div className="hero-transformation-preview__frame">
        <div className="hero-transformation-preview__topbar" aria-hidden="true">
          <div className="hero-transformation-preview__brand">
            <span className="hero-transformation-preview__brand-mark" />
            <span>ProdForge</span>
          </div>
          <div className="hero-transformation-preview__topbar-status">
            <span>Workspace</span>
            <span>Forja ativa</span>
          </div>
        </div>

        <div className="hero-transformation-preview__pipeline">
          <article className="hero-transformation-preview__input forge-panel forge-panel--warning">
            <p className="hero-transformation-preview__label">{preview.problemLabel}</p>
            <h3>{preview.problemTitle}</h3>
            <p>{preview.problemItems[0]}</p>
            <div className="hero-transformation-preview__raw-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="hero-transformation-preview__status forge-status-pill forge-status-pill--gap">
              {preview.problemStatus}
            </span>
          </article>

          <div className="hero-transformation-preview__forge-core" aria-hidden="true">
            <div className="hero-transformation-preview__forge-rings">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-transformation-preview__forge-shell">
              <div className="hero-transformation-preview__forge-mouth">
                <div className="hero-transformation-preview__forge-glow" />
              </div>
              <div className="hero-transformation-preview__forge-stream" />
            </div>
            <div className="hero-transformation-preview__forge-copy">
              <p className="hero-transformation-preview__label">{preview.transitionLabel}</p>
              <strong>{preview.furnaceTitle}</strong>
            </div>
          </div>

          <article className="hero-transformation-preview__story forge-panel forge-panel--active-tech">
            <div className="hero-transformation-preview__story-header">
              <p className="hero-transformation-preview__label">{preview.storyLabel}</p>
              <span className="forge-status-pill forge-status-pill--ready">{preview.readyLabel}</span>
            </div>
            <h3>{preview.storyTitle}</h3>
            <p>{preview.objective}</p>
            <div className="hero-transformation-preview__quality">
              <div className="hero-transformation-preview__quality-header">
                <span>{preview.qualityLabel}</span>
                <strong>{preview.qualityValue}</strong>
              </div>
              <div className="forge-metric-bar forge-metric-bar--tech" style={{ '--forge-metric-value': preview.qualityValue }}>
                <div className="forge-metric-bar__track">
                  <span className="forge-metric-bar__fill" />
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="hero-transformation-preview__insights" aria-label="Itens estruturados na saida">
          <article className="hero-transformation-preview__mini-card hero-transformation-preview__mini-card--criteria">
            <span>{preview.criteriaLabel}</span>
            <p>{firstCriterion}</p>
          </article>
          <article className="hero-transformation-preview__mini-card hero-transformation-preview__mini-card--gap">
            <span>{preview.gapsLabel}</span>
            <p>{firstGap}</p>
          </article>
          <article className="hero-transformation-preview__mini-card hero-transformation-preview__mini-card--qa">
            <span>{preview.qaLabel}</span>
            <p>{firstQa}</p>
          </article>
        </div>
      </div>
    </div>
  )
}

export default HeroTransformationPreview
