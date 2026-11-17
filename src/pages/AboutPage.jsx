import { buildAuthPath } from '../utils/authRedirect'
import { getAboutContent } from '../content/about'
import { useCopy, useLanguage } from '../i18n/context'
import Link from '../i18n/LocalizedLink'
import { useAuth } from '../hooks/useAuth'
import { usePublicPageMetadata } from '../hooks/usePublicPageMetadata'

function AboutSection({ section, index }) {
  return (
    <article className="privacy-policy-section forge-panel forge-panel--metal" id={section.id}>
      <div className="privacy-policy-section__header">
        <span className="privacy-policy-section__index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2>{section.title}</h2>
      </div>

      <div className="privacy-policy-section__body">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

function AboutPage() {
  const { user } = useAuth()
  const { canSwitch, language } = useLanguage()
  const authLocale = canSwitch ? language : undefined
  const t = useCopy('about')
  const { heroSummary, transformationSteps, audienceCards, aboutSections, productPrinciples } =
    getAboutContent(language)
  const updatedDate = new Intl.DateTimeFormat(language, { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date('2026-05-05T00:00:00Z'),
  )

  usePublicPageMetadata('about')

  return (
    <div className="page privacy-policy-page about-page">
      <section className="privacy-policy-hero about-page__hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p>
            {t('intro')}
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : buildAuthPath('/signup', undefined, authLocale)}>
              {user ? t('openWorkspace') : t('tryTool')}
            </Link>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/">
              {t('home')}
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary about-page__summary" aria-label={t('summaryAria')}>
          <p className="privacy-policy-hero__summary-label">{t('summaryLabel')}</p>
          <p className="about-page__summary-title">{t('summaryTitle')}</p>
          <ul>
            {heroSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">{t('updated', { date: updatedDate })}</p>
        </aside>
      </section>

      <section className="about-page__flow forge-panel forge-panel--metal" aria-labelledby="about-flow-title">
        <div className="about-page__section-header">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">{t('flowLabel')}</p>
          <h2 id="about-flow-title">{t('flowTitle')}</h2>
          <p>
            {t('flowIntro')}
          </p>
        </div>

        <div className="about-page__flow-grid">
          {transformationSteps.map((step, index) => (
            <article className="about-page__flow-step" key={step.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-page__audience" aria-labelledby="about-audience-title">
        <div className="about-page__section-header">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('audienceLabel')}</p>
          <h2 id="about-audience-title">{t('audienceTitle')}</h2>
        </div>

        <div className="about-page__cards">
          {audienceCards.map((card) => (
            <article className="about-page__card forge-panel forge-panel--metal" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="privacy-policy-content about-page__content">
        <aside className="privacy-policy-toc about-page__toc" aria-label={t('tocAria')}>
          <p className="privacy-policy-toc__title">{t('toc')}</p>
          <nav>
            {aboutSections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="privacy-policy-sections">
          <p className="privacy-policy-intro">
            {t('sectionsIntro')}
          </p>

          {aboutSections.map((section, index) => (
            <AboutSection key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>

      <section className="about-page__principles forge-panel forge-panel--metal" aria-labelledby="about-principles-title">
        <div className="about-page__section-header">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">{t('principlesLabel')}</p>
          <h2 id="about-principles-title">{t('principlesTitle')}</h2>
        </div>

        <ul>
          {productPrinciples.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <section className="about-page__cta forge-panel forge-panel--metal forge-texture-layer" aria-labelledby="about-cta-title">
        <div>
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('ctaLabel')}</p>
          <h2 id="about-cta-title">{t('ctaTitle')}</h2>
          <p>
            {t('ctaIntro')}
          </p>
        </div>

        <div className="about-page__cta-actions">
          <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : buildAuthPath('/signup', undefined, authLocale)}>
            {user ? t('openWorkspace') : t('createAccount')}
          </Link>
          <Link className="forge-button forge-button--metal forge-button--md" to="/contato">
            {t('talk')}
          </Link>
        </div>

        <nav className="about-page__links" aria-label={t('links')}>
          <Link to="/contato">{t('contact')}</Link>
          <Link to="/politica-de-privacidade">{t('privacy')}</Link>
          <Link to="/termos-de-uso">{t('terms')}</Link>
        </nav>
      </section>
    </div>
  )
}

export default AboutPage
