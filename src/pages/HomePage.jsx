import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import BeforeAfterStory from '../components/landing/BeforeAfterStory'
import BenefitsStrip from '../components/landing/BenefitsStrip'
import LandingHero from '../components/landing/LandingHero'
import LeadCaptureForm from '../components/landing/LeadCaptureForm'
import LearningTeaser from '../components/landing/LearningTeaser'
import PricingTeaser from '../components/landing/PricingTeaser'
import WorkflowSteps from '../components/landing/WorkflowSteps'
import { getLearningGuidesBySlugs, learningHub } from '../content/learningContent'
import { landingCopy } from '../content/landingCopy'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'

function HomePage() {
  const { user } = useAuth()
  const featuredGuides = getLearningGuidesBySlugs(learningHub.starterGuideSlugs)

  usePageMetadata({
    title: 'ProdForge | Gere user stories mais claras com IA',
    description:
      'Transforme contexto solto em user stories com objetivo, criterios de aceite, gaps e checklist de QA. Feito para PMs e POs.',
    path: '/',
  })

  useEffect(() => {
    let active = true

    async function trackLandingView() {
      const { trackEvent } = await import('../services/analyticsService')
      if (!active) return

      trackEvent({
        event_name: 'landing_view',
        event_category: 'public',
      })
    }

    trackLandingView().catch(() => {})

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page landing-page">
      <LandingHero hero={landingCopy.hero} isAuthenticated={Boolean(user)} />
      <WorkflowSteps content={landingCopy.workflow} />
      <BeforeAfterStory content={landingCopy.beforeAfter} />
      <BenefitsStrip content={landingCopy.benefits} />
      <LearningTeaser content={landingCopy.learningTeaser} guides={featuredGuides} />
      <PricingTeaser content={landingCopy.pricing} isAuthenticated={Boolean(user)} />
      <LeadCaptureForm content={landingCopy.leadCapture} />

      <section className="landing-section landing-final-cta">
        <div className="landing-final-cta__content">
          <div className="landing-final-cta__copy">
            <p className="landing-section__eyebrow">{landingCopy.finalCta.eyebrow}</p>
            <h2>{landingCopy.finalCta.title}</h2>
            <p>{landingCopy.finalCta.description}</p>
          </div>

          <div className="landing-final-cta__actions">
            {user ? (
              <Link className="landing-button landing-button--primary" to="/tool">
                Abrir area de trabalho
              </Link>
            ) : (
              <>
                <Link className="landing-button landing-button--primary" to="/signup">
                  Criar conta gratis
                </Link>
                <Link className="landing-button landing-button--secondary" to="/login">
                  Entrar
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
