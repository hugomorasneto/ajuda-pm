import { Link } from 'react-router-dom'
import HeroTransformationPreview from './HeroTransformationPreview'

function LandingHero({ hero, isAuthenticated, sectionId }) {
  return (
    <section
      id={sectionId}
      className="landing-hero forge-panel forge-panel--metal forge-texture-layer"
      aria-labelledby="landing-hero-title"
    >
      <div className="landing-hero__copy">
        <span className="landing-hero__eyebrow forge-badge forge-badge--ember">{hero.eyebrow}</span>
        <h1 id="landing-hero-title">{hero.title}</h1>
        <p className="landing-hero__description">{hero.description}</p>

        <div className="landing-hero__actions">
          {isAuthenticated ? (
            <>
              <Link className="landing-button forge-button forge-button--ember forge-button--lg" to="/tool">
                Abrir área de trabalho
              </Link>
              <a className="landing-button forge-button forge-button--metal forge-button--lg" href="#como-funciona">
                Ver como funciona
              </a>
            </>
          ) : (
            <>
              <Link className="landing-button forge-button forge-button--ember forge-button--lg" to="/signup">
                Criar conta grátis
              </Link>
              <a className="landing-button forge-button forge-button--metal forge-button--lg" href="#como-funciona">
                Ver como funciona
              </a>
            </>
          )}
        </div>

        {hero.microcopy ? <p className="landing-hero__microcopy">{hero.microcopy}</p> : null}
      </div>

      <HeroTransformationPreview preview={hero.preview} />

      <div className="landing-hero__stats" aria-label="Métricas da proposta de valor">
        {hero.stats.map((item) => (
          <article key={item.label} className="landing-stat forge-panel forge-panel--interactive forge-panel--metal">
            <p className="landing-stat__value">{item.value}</p>
            <span className="landing-stat__label">{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export default LandingHero
