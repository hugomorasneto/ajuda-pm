import { Link } from 'react-router-dom'
import { BRAND_MARK_SRC } from '../../constants/app'

const STEPS = [
  {
    num: '01',
    label: 'Matéria-prima',
    description: 'Cole briefing, dor do usuário ou demanda solta. A Forja precisa de contexto real, não de texto perfeito.',
  },
  {
    num: '02',
    label: 'Ligas',
    description: 'Inclua regras, exceções, integrações, métricas e exemplos. Esses detalhes dão resistência à peça.',
  },
  {
    num: '03',
    label: 'Inspeção',
    description: 'Forje a primeira versão, revise critérios de aceite e trincas, depois refine o acabamento.',
  },
]

const CHECKPOINTS = [
  'Quem é o usuário impactado?',
  'Qual problema precisa ser resolvido?',
  'Quais regras não podem ficar de fora?',
]

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function OnboardingModal({ onDismiss }) {
  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss() }}
    >
      <div className="onboarding-card forge-texture-layer">
        <div className="onboarding-card__header">
          <div className="onboarding-card__brand">
            <img
              src={BRAND_MARK_SRC}
              alt=""
              className="onboarding-card__brand-mark"
              aria-hidden="true"
            />
            <span className="onboarding-card__brand-name">ProdForge</span>
          </div>
          <button
            type="button"
            className="onboarding-card__close"
            onClick={onDismiss}
            aria-label="Fechar boas-vindas"
          >
            <IconClose />
          </button>
        </div>

        <div className="onboarding-card__body">
          <div className="onboarding-card__copy">
            <span className="forge-badge forge-badge--ember onboarding-card__eyebrow">
              Primeira forja
            </span>
            <h2 id="onboarding-title" className="onboarding-card__title">
              Leve sua primeira demanda para a Forja.
            </h2>
            <p className="onboarding-card__subtitle">
              Você entra com contexto solto. A ProdForge organiza objetivo, user story,
              critérios de aceite e pontos de inspeção para você revisar com calma.
            </p>
          </div>

          <aside className="onboarding-primer" aria-label="Antes de começar">
            <span className="onboarding-primer__icon" aria-hidden="true">
              <IconSpark />
            </span>
            <div className="onboarding-primer__copy">
              <p className="onboarding-primer__label">Antes de forjar</p>
              <p>Se conseguir responder a estas perguntas, já dá para começar:</p>
            </div>
            <ul className="onboarding-primer__list">
              {CHECKPOINTS.map((checkpoint) => (
                <li key={checkpoint}>{checkpoint}</li>
              ))}
            </ul>
          </aside>

          <div className="onboarding-steps" aria-label="Etapas para forjar a primeira user story">
            {STEPS.map((step) => (
              <div key={step.num} className="onboarding-step">
                <span className="onboarding-step__num">{step.num}</span>
                <div className="onboarding-step__copy">
                  <strong className="onboarding-step__label">{step.label}</strong>
                  <p className="onboarding-step__description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="onboarding-card__actions">
            <button
              type="button"
              className="forge-button forge-button--ember forge-button--lg onboarding-card__cta"
              onClick={onDismiss}
            >
              Abrir Bancada da Forja
            </button>
            <Link
              to="/aprender/user-stories-na-pratica"
              className="forge-button forge-button--ghost forge-button--lg onboarding-card__learn-link"
              onClick={onDismiss}
            >
              Ver guia prático
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
