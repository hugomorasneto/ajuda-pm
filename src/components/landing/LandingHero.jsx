import { Link } from 'react-router-dom'
import HeroTransformationPreview from './HeroTransformationPreview'

function LandingHero({ hero, isAuthenticated, sectionId }) {
  return (
    <section
      id={sectionId}
      className="landing-hero forge-panel forge-panel--metal"
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
                Abrir bancada
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
    </section>
  )
}

export default LandingHero
