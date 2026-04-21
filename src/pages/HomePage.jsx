import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import LandingHero from '../components/landing/LandingHero'
import WorkflowSteps from '../components/landing/WorkflowSteps'
import BeforeAfterStory from '../components/landing/BeforeAfterStory'
import BenefitsStrip from '../components/landing/BenefitsStrip'
import PricingTeaser from '../components/landing/PricingTeaser'
import LeadCaptureForm from '../components/landing/LeadCaptureForm'
import { landingCopy } from '../content/landingCopy'
import { useAuth } from '../hooks/useAuth'
import { trackEvent } from '../services/analyticsService'

function HomePage() {
  const { user } = useAuth()

  useEffect(() => {
    trackEvent({
      event_name: 'landing_view',
      event_category: 'public',
    })
  }, [])

  return (
    <div className="page landing-page">
      <LandingHero hero={landingCopy.hero} isAuthenticated={Boolean(user)} />
      <WorkflowSteps content={landingCopy.workflow} />
      <BeforeAfterStory content={landingCopy.beforeAfter} />
      <BenefitsStrip content={landingCopy.benefits} />
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
                Abrir área de trabalho
              </Link>
            ) : (
              <>
                <Link className="landing-button landing-button--primary" to="/signup">
                  Testar grátis
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
