import { Link } from 'react-router-dom'

const STEPS = [
  {
    num: '01',
    label: 'Brief',
    description: 'Cole o contexto e os requisitos da demanda — como chegou para você.',
  },
  {
    num: '02',
    label: 'Story',
    description: 'Receba a user story estruturada com objetivo, critérios e gaps.',
  },
  {
    num: '03',
    label: 'Revisão',
    description: 'Revise, edite e exporte para o backlog, Jira ou Markdown.',
  },
]

function OnboardingModal({ onDismiss }) {
  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss() }}
    >
      <div className="onboarding-card">

        {/* Header */}
        <div className="onboarding-card__header">
          <div className="onboarding-card__brand">
            <span className="onboarding-card__brand-mark" aria-hidden="true" />
            <span className="onboarding-card__brand-name">ProdForge</span>
          </div>
          <button
            type="button"
            className="onboarding-card__close"
            onClick={onDismiss}
            aria-label="Fechar boas-vindas"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Copy */}
        <div className="onboarding-card__copy">
          <span className="onboarding-card__eyebrow">Bem-vindo</span>
          <h2 id="onboarding-title" className="onboarding-card__title">
            Sua primeira user story está a 3 campos de distância.
          </h2>
          <p className="onboarding-card__subtitle">
            Cole o contexto, receba a story estruturada, revise e exporte.
            É isso — sem template para preencher, sem framework para decorar.
          </p>
        </div>

        {/* Steps */}
        <div className="onboarding-steps" aria-label="Como funciona">
          {STEPS.map((step, i) => (
            <div key={step.num} className="onboarding-step">
              {i > 0 && (
                <div className="onboarding-step__connector" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className="onboarding-step__card">
                <span className="onboarding-step__num">{step.num}</span>
                <strong className="onboarding-step__label">{step.label}</strong>
                <p className="onboarding-step__description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="onboarding-card__actions">
          <button
            type="button"
            className="onboarding-card__cta"
            onClick={onDismiss}
          >
            Entendi, vou começar →
          </button>
          <Link
            to="/aprender/user-stories-na-pratica"
            className="onboarding-card__learn-link"
            onClick={onDismiss}
          >
            Ver guia de user stories antes →
          </Link>
        </div>

      </div>
    </div>
  )
}

export default OnboardingModal
