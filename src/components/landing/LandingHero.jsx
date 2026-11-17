import { useCopy } from '../../i18n/context'
import Link from '../../i18n/LocalizedLink'
import HeroTransformationPreview from './HeroTransformationPreview'

function LandingHero({ hero, isAuthenticated, sectionId }) {
  const t = useCopy('landingHero')
  const primaryCtaPath = isAuthenticated ? '/tool' : '/signup'
  const primaryCtaLabel = isAuthenticated ? t('landingHero_abrir_bancada') : t('landingHero_criar_conta_gratis')

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
          <Link className="landing-button forge-button forge-button--ember forge-button--lg" to={primaryCtaPath}>
            {primaryCtaLabel}
          </Link>
          <Link className="landing-button forge-button forge-button--metal forge-button--lg" to="/#como-funciona">
            {t('landingHero_ver_como_funciona')}
          </Link>
        </div>

        {hero.microcopy ? <p className="landing-hero__microcopy">{hero.microcopy}</p> : null}

        {hero.trustSignals?.length ? (
          <ul className="landing-hero__trust-signals" aria-label={t('landingHero_sinais_de_confianca_da_prodforge')}>
            {hero.trustSignals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <HeroTransformationPreview preview={hero.preview} />
    </section>
  )
}

export default LandingHero
