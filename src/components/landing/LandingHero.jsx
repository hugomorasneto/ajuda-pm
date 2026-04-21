import { Link } from 'react-router-dom'
import HeroTransformationPreview from './HeroTransformationPreview'

function LandingHero({ hero, isAuthenticated }) {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-hero__copy">
        <p className="landing-section__eyebrow">{hero.eyebrow}</p>
        <h1 id="landing-hero-title">{hero.title}</h1>
        <p className="landing-hero__description">{hero.description}</p>

        <div className="landing-hero__actions">
          {isAuthenticated ? (
            <>
              <Link className="landing-button landing-button--primary" to="/tool">
                Abrir área de trabalho
              </Link>
              <a className="landing-button landing-button--secondary" href="#como-funciona">
                Ver como funciona
              </a>
            </>
          ) : (
            <>
              <Link className="landing-button landing-button--primary" to="/signup">
                Testar grátis
              </Link>
              <a className="landing-button landing-button--secondary" href="#antes-depois">
                Ver exemplo
              </a>
            </>
          )}
        </div>

        <ul className="landing-hero__highlights">
          {hero.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="landing-hero__stats" aria-label="Métricas da proposta de valor">
          {hero.stats.map((item) => (
            <article key={item.label} className="landing-stat">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </div>

      <HeroTransformationPreview preview={hero.preview} />
    </section>
  )
}

export default LandingHero
