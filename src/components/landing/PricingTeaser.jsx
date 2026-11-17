import { useCopy } from '../../i18n/context'
import Link from '../../i18n/LocalizedLink'

function PricingCard({ plan, cta, variant }) {
  const isFeatured = variant === 'pro'

  return (
    <article
      className={`landing-pricing__card landing-pricing__card--${variant} forge-panel ${
        isFeatured ? 'forge-panel--active-tech' : 'forge-panel--metal'
      } forge-panel--interactive`}
    >
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
  const t = useCopy('pricingTeaser')
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
              <Link className="landing-button forge-button forge-button--metal forge-button--block" to="/tool">
                {t('pricingTeaser_abrir_bancada')}
              </Link>
            ) : (
              <Link className="landing-button forge-button forge-button--ember forge-button--block" to="/signup">
                {t('pricingTeaser_criar_conta_gratis')}
              </Link>
            )
          }
        />

        <PricingCard
          plan={content.pro}
          variant="pro"
          cta={
            <Link className="landing-button forge-button forge-button--tech forge-button--block" to="/#lead-capture-title">
              {t('pricingTeaser_receber_novidades_do_pro')}
            </Link>
          }
        />
      </div>
    </section>
  )
}

export default PricingTeaser
