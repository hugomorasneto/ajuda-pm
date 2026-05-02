function BeforeAfterStory({ content }) {
  return (
    <section className="landing-section landing-before-after" id="antes-depois">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-before-after__grid">
        <article className="landing-before-after__panel landing-before-after__panel--before">
          <span className="landing-before-after__badge landing-before-after__badge--before">
            {content.before.label}
          </span>
          <h3>{content.before.title}</h3>
          <p className="landing-before-after__raw">{content.before.story}</p>
          <ul>
            {content.before.issues.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="landing-before-after__panel landing-before-after__panel--after">
          <span className="landing-before-after__badge landing-before-after__badge--after">
            {content.after.label}
          </span>
          <h3>{content.after.title}</h3>

          <div className="landing-before-after__section">
            <strong>Objetivo</strong>
            <p>{content.after.objective}</p>
          </div>

          <div className="landing-before-after__section">
            <strong>User story</strong>
            <p>{content.after.story}</p>
          </div>

          <div className="landing-before-after__section">
            <strong>Critérios de aceite</strong>
            <ul>
              {content.after.criteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="landing-before-after__note">{content.after.notes}</p>

          <div className="landing-before-after__score" aria-label="Indicador de qualidade">
            <span>Clareza da história</span>
            <strong>Alta ↑</strong>
          </div>
        </article>
      </div>
    </section>
  )
}

export default BeforeAfterStory
