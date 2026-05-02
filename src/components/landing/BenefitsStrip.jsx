const ROLE_ICONS = {
  PM: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="1.5" width="13" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 6h7M5.5 9h7M5.5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Dev: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6 5.5L2 9l4 3.5M12 5.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 3.5l-3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  QA: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 1.5L2 5v4.5c0 3.5 2.8 6.5 7 7.5 4.2-1 7-4 7-7.5V5L9 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
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
        {content.items.map((item) => (
          <article
            key={item.role}
            className={`landing-benefits__item landing-benefits__item--${item.role.toLowerCase()} forge-panel forge-panel--metal forge-panel--interactive`}
          >
            <div className="landing-benefits__icon">
              {ROLE_ICONS[item.role] ?? null}
            </div>
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
