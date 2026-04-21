function BenefitsStrip({ content }) {
  return (
    <section className="landing-section landing-benefits">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-benefits__grid">
        {content.items.map((item) => (
          <article key={item.role} className="landing-benefits__item">
            <p className="landing-benefits__role">{item.role}</p>
            <h3>{item.title}</h3>
            <ul>
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

export default BenefitsStrip
