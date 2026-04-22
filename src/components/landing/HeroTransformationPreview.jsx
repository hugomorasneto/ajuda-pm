function HeroTransformationPreview({ preview }) {
  return (
    <div className="hero-transformation-preview" aria-label="Preview do produto">
      <div className="hero-transformation-preview__frame">
        <div className="hero-transformation-preview__frame-top">
          <span className="hero-transformation-preview__frame-chip">Entrada real</span>
          <span className="hero-transformation-preview__frame-chip hero-transformation-preview__frame-chip--active">
            Documento pronto para revisão
          </span>
        </div>

        <div className="hero-transformation-preview__messy">
          <p className="hero-transformation-preview__label">{preview.problemLabel}</p>
          <h3>{preview.problemTitle}</h3>
          <ul className="hero-transformation-preview__messy-list">
            {preview.problemItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="hero-transformation-preview__bridge">
          <span>{preview.transitionLabel}</span>
        </div>

        <div className="hero-transformation-preview__output">
          <div className="hero-transformation-preview__document">
            <div className="hero-transformation-preview__document-header">
              <p className="hero-transformation-preview__label">Saída estruturada</p>
              <div className="hero-transformation-preview__document-pills" aria-hidden="true">
                <span>Objetivo</span>
                <span>Critérios</span>
                <span>QA</span>
              </div>
            </div>

            <h3>{preview.storyTitle}</h3>

            <div className="hero-transformation-preview__section">
              <strong>Objetivo</strong>
              <p>{preview.objective}</p>
            </div>

            <div className="hero-transformation-preview__section">
              <strong>Critérios de aceite</strong>
              <ul>
                {preview.criteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="hero-transformation-preview__rail">
            <div className="hero-transformation-preview__rail-block">
              <p className="hero-transformation-preview__label">Gaps</p>
              <ul>
                {preview.gaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="hero-transformation-preview__rail-block">
              <p className="hero-transformation-preview__label">Checklist de QA</p>
              <ul>
                {preview.qa.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <div className="hero-transformation-preview__footer" aria-hidden="true">
          <span>Objetivo claro</span>
          <span>Gaps visíveis</span>
          <span>Checklist pronto</span>
        </div>
      </div>
    </div>
  )
}

export default HeroTransformationPreview
