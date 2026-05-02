import { Link } from 'react-router-dom'

function PricingCard({ plan, cta, variant }) {
  const isFeatured = variant === 'pro'

  return (
    <article className={`landing-pricing__card landing-pricing__card--${variant}`}>
      <div className="landing-pricing__card-header">
        <div>
          <p className="landing-pricing__name">{plan.name}</p>
          <p className="landing-pricing__description">{plan.description}</p>
        </div>
        <span className={`landing-pricing__badge${isFeatured ? ' landing-pricing__badge--featured' : ''}`}>
          {plan.badge}
        </span>
      </div>

      <ul className="landing-pricing__list">
        {plan.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {cta}
    </article>
  )
}

function PricingTeaser({ content, isAuthenticated }) {
  return (
    <section className="landing-section landing-pricing" id="planos">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-pricing__grid">
        <PricingCard
          plan={content.free}
          variant="free"
          cta={
            isAuthenticated ? (
              <Link className="landing-button landing-button--secondary" to="/tool">
                Abrir área de trabalho
              </Link>
            ) : (
              <Link className="landing-button landing-button--primary" to="/signup">
                Criar conta grátis
              </Link>
            )
          }
        />

        <PricingCard
          plan={content.pro}
          variant="pro"
          cta={
            <a className="landing-button landing-button--secondary" href="#lead-capture-title">
              Receber novidades do Pro
            </a>
          }
        />
      </div>
    </section>
  )
}

export default PricingTeaser
