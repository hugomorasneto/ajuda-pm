import { useCopy } from '../i18n/context'
import { useEffect } from 'react'
import Link from '../i18n/LocalizedLink'
import BeforeAfterStory from '../components/landing/BeforeAfterStory'
import BenefitsStrip from '../components/landing/BenefitsStrip'
import ContextStrip from '../components/landing/ContextStrip'
import LandingHero from '../components/landing/LandingHero'
import LandingFaq from '../components/landing/LandingFaq'
import LeadCaptureForm from '../components/landing/LeadCaptureForm'
import LearningTeaser from '../components/landing/LearningTeaser'
import PricingTeaser from '../components/landing/PricingTeaser'
import WorkflowSteps from '../components/landing/WorkflowSteps'
import { HUGO_MORAES_LINKEDIN_URL } from '../constants/app'
import { getLearningGuidesBySlugs, starterGuideSlugs } from '../content/learningContent'
import { getLandingCopy } from '../content/landingCopy'
import { useLearningCatalog } from '../hooks/useLearningCatalog'
import { useAuth } from '../hooks/useAuth'
import { usePublicPageMetadata } from '../hooks/usePublicPageMetadata'
import { PRIVACY_CONSENT_CHANGE_EVENT } from '../utils/privacyConsent'

function HomePage() {
  const t = useCopy('homePage')
  const landingCopy = getLandingCopy(useCopy('landingCopy'))
  const { user } = useAuth()
  const featuredGuides = getLearningGuidesBySlugs(starterGuideSlugs, useLearningCatalog())

  usePublicPageMetadata('home')

  useEffect(() => {
    let active = true
    let landingViewTracked = false

    async function trackLandingView() {
      const { trackEvent } = await import('../services/analyticsService')
      if (!active || landingViewTracked) return

      const response = await trackEvent({
        event_name: 'landing_view',
        event_category: 'public',
      })

      if (response.success) {
        landingViewTracked = true
      }
    }

    trackLandingView().catch(() => {})
    window.addEventListener(PRIVACY_CONSENT_CHANGE_EVENT, trackLandingView)

    return () => {
      active = false
      window.removeEventListener(PRIVACY_CONSENT_CHANGE_EVENT, trackLandingView)
    }
  }, [])

  return (
    <div className="page landing-page">
      <LandingHero hero={landingCopy.hero} isAuthenticated={Boolean(user)} sectionId="produto" />
      <ContextStrip items={landingCopy.contextStrip} />
      <WorkflowSteps content={landingCopy.workflow} />
      <BeforeAfterStory content={landingCopy.beforeAfter} />
      <BenefitsStrip content={landingCopy.benefits} />
      <LearningTeaser content={landingCopy.learningTeaser} guides={featuredGuides} />
      <PricingTeaser content={landingCopy.pricing} isAuthenticated={Boolean(user)} />
      <LeadCaptureForm content={landingCopy.leadCapture} />
      <LandingFaq content={landingCopy.faq} />

      <section className="landing-section landing-creator" aria-labelledby="landing-creator-title">
        <div className="landing-creator__card">
          <div className="landing-creator__copy">
            <h2 id="landing-creator-title">{t('homePage_por_tras_do_prodforge')}</h2>
            <p>
              {t('homePage_o_prodforge_foi_criado_por')}
            </p>
            <p className="landing-creator__support">
              {t('homePage_uma_iniciativa_da_tech_tupa')}
            </p>
          </div>

          <a
            className="landing-button forge-button forge-button--metal forge-button--sm landing-creator__cta"
            href={HUGO_MORAES_LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('homePage_conectar_no_linkedin')}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="landing-section landing-final-cta">
        <div className="landing-final-cta__content">
          <div className="landing-final-cta__copy">
            <p className="landing-section__eyebrow">{landingCopy.finalCta.eyebrow}</p>
            <h2>{landingCopy.finalCta.title}</h2>
            <p>{landingCopy.finalCta.description}</p>
          </div>

          <div className="landing-final-cta__actions">
            {user ? (
              <Link className="landing-button forge-button forge-button--ember forge-button--lg" to="/tool">
                {t('homePage_abrir_bancada')}
              </Link>
            ) : (
              <>
                <Link className="landing-button forge-button forge-button--ember forge-button--lg" to="/signup">
                  {t('homePage_criar_conta_gratis')}
                </Link>
                <Link className="landing-button forge-button forge-button--metal forge-button--lg" to="/login">
                  {t('homePage_entrar')}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
