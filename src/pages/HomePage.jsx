import { useEffect } from 'react'
import { Link } from 'react-router-dom'
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
import { getLearningGuidesBySlugs, learningHub } from '../content/learningContent'
import { landingCopy } from '../content/landingCopy'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'

function HomePage() {
  const { user } = useAuth()
  const featuredGuides = getLearningGuidesBySlugs(learningHub.starterGuideSlugs)

  usePageMetadata({
    title: 'ProdForge | Workspace IA para Product Managers',
    description:
      'Transforme contexto solto em user stories claras, critérios de aceite, briefing expandido e materiais prontos para desenvolvimento com IA.',
    ogTitle: 'ProdForge | Workspace IA para Product Managers',
    ogDescription:
      'Crie user stories, critérios de aceite, briefings e materiais para desenvolvimento em segundos com IA.',
    twitterTitle: 'ProdForge | Workspace IA para Product Managers',
    twitterDescription: 'Transforme ideias soltas em histórias de usuário prontas para dev, QA e produto.',
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
            <h2 id="landing-creator-title">Por trás do ProdForge</h2>
            <p>
              O ProdForge foi criado por Hugo Moraes Neto, Product Manager / PMM, para transformar briefings
              confusos em histórias mais claras, acionáveis e úteis para times de produto, design, engenharia e
              QA.
            </p>
            <p className="landing-creator__support">
              Uma iniciativa da Tech Tupã, marca focada em automação, agentes de IA e produtos digitais.
            </p>
          </div>

          <a
            className="landing-button forge-button forge-button--metal forge-button--sm landing-creator__cta"
            href={HUGO_MORAES_LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Conectar no LinkedIn
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
                Abrir bancada
              </Link>
            ) : (
              <>
                <Link className="landing-button forge-button forge-button--ember forge-button--lg" to="/signup">
                  Criar conta grátis
                </Link>
                <Link className="landing-button forge-button forge-button--metal forge-button--lg" to="/login">
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
