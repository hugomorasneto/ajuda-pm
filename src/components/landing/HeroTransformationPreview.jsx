function HeroTransformationPreview({ preview }) {
  return (
    <div className="hero-transformation-preview" aria-label="Preview do produto">
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
          <p className="hero-transformation-preview__label">Saída estruturada</p>
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
    </div>
  )
}

export default HeroTransformationPreview
