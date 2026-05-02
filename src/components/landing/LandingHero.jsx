import { Link } from 'react-router-dom'
import HeroTransformationPreview from './HeroTransformationPreview'

function LandingHero({ hero, isAuthenticated }) {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-hero__copy">
        <span className="badge-pill">{hero.eyebrow}</span>
        <h1 id="landing-hero-title">{hero.title}</h1>
        <p className="landing-hero__description">{hero.description}</p>

        <div className="landing-hero__actions">
          {isAuthenticated ? (
            <>
              <Link className="landing-button landing-button--primary" to="/tool">
                Abrir área de trabalho →
              </Link>
              <a className="landing-button landing-button--secondary" href="#como-funciona">
                Ver o fluxo
              </a>
            </>
          ) : (
            <>
              <Link className="landing-button landing-button--primary" to="/signup">
                Gerar minha primeira história →
              </Link>
              <a className="landing-button landing-button--secondary" href="#antes-depois">
                Ver exemplo pronto
              </a>
            </>
          )}
        </div>

        {hero.microcopy ? (
          <p className="landing-hero__microcopy">{hero.microcopy}</p>
        ) : null}
      </div>

      <HeroTransformationPreview preview={hero.preview} />

      <div className="landing-hero__stats" aria-label="Métricas da proposta de valor">
        {hero.stats.map((item) => (
          <article key={item.label} className="landing-stat">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export default LandingHero
