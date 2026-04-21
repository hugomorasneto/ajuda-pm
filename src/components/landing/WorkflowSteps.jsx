function WorkflowSteps({ content }) {
  return (
    <section className="landing-section landing-workflow" id="como-funciona">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-workflow__grid">
        {content.steps.map((step) => (
          <article key={step.step} className="landing-workflow__item">
            <span className="landing-workflow__index">{step.step}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default WorkflowSteps
