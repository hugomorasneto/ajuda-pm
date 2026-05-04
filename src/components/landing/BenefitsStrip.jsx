import devForgemasterBlade from '../../assets/landing/personas/dev-forgemaster-blade.png'
import pmStrategistForge from '../../assets/landing/personas/pm-strategist-forge.png'
import qaGuardianShield from '../../assets/landing/personas/qa-guardian-shield.png'

const PERSONA_IMAGES = {
  'dev-forgemaster-blade': devForgemasterBlade,
  'pm-strategist-forge': pmStrategistForge,
  'qa-guardian-shield': qaGuardianShield,
}

function BenefitsStrip({ content }) {
  return (
    <section className="landing-section landing-benefits">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-benefits__grid">
        {content.items.map((item) => {
          const imageSrc = PERSONA_IMAGES[item.image]

          return (
            <article
              key={item.tone}
              className={`landing-benefits__item landing-benefits__item--${item.tone} forge-panel forge-panel--metal forge-panel--interactive`}
            >
              <div className="landing-benefits__media">
                {imageSrc ? (
                  <img
                    className="landing-benefits__image"
                    src={imageSrc}
                    alt={item.imageAlt}
                    width="1122"
                    height="1402"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <p className="landing-benefits__role">{item.role}</p>
              </div>

              <div className="landing-benefits__body">
                <h3>{item.title}</h3>
                <p className="landing-benefits__description">{item.description}</p>
                <ul className="landing-benefits__list" aria-label={`Benefícios para ${item.role}`}>
                  {item.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default BenefitsStrip
