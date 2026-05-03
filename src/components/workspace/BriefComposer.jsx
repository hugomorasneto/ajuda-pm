import { useState } from 'react'
import ComposerSection from './ComposerSection'
import PromptChips from './PromptChips'

// ── Icons (inline SVG, 16px) ─────────────────────────────────────
function IconFileText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function IconListChecks() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="10" y1="6" x2="21" y2="6"/>
      <line x1="10" y1="12" x2="21" y2="12"/>
      <line x1="10" y1="18" x2="21" y2="18"/>
      <polyline points="3 6 4 7 6 5"/>
      <polyline points="3 12 4 13 6 11"/>
      <polyline points="3 18 4 19 6 17"/>
    </svg>
  )
}

function IconSliders() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14"/>
      <line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/>
      <line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  )
}

function IconSparkles() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z"/>
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5z"/>
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

// ── Stepper ──────────────────────────────────────────────────────
const STEPS = [
  { id: 'context', label: 'Contexto' },
  { id: 'requirements', label: 'Requisitos' },
  { id: 'generate', label: 'Gerar' },
]

function ComposerStepper({ contextFilled, requirementsFilled, isGenerated }) {
  const activeIndex = isGenerated ? 3 : requirementsFilled ? 2 : contextFilled ? 1 : 0
  return (
    <div className="brief-stepper" aria-label="Progresso do brief">
      {STEPS.map((step, i) => {
        const done = i < activeIndex
        const active = i === activeIndex
        return (
          <div key={step.id} className={`brief-stepper__step ${done ? 'brief-stepper__step--done' : ''} ${active ? 'brief-stepper__step--active' : ''}`}>
            <span className="brief-stepper__dot" aria-hidden="true">
              {done ? '✓' : null}
            </span>
            <span className="brief-stepper__label">{step.label}</span>
            {i < STEPS.length - 1 && <span className="brief-stepper__line" aria-hidden="true" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Prompt chips data ────────────────────────────────────────────
const contextPrompts = [
  { label: 'Problema do usuário', text: 'Problema do usuário: ' },
  { label: 'Fluxo atual', text: 'Fluxo atual: ' },
  { label: 'Impacto no negócio', text: 'Impacto no negócio: ' },
]

const requirementPrompts = [
  { label: 'Regra de negócio', text: 'Regra de negócio: ' },
  { label: 'Critério mínimo', text: 'Critério mínimo: ' },
  { label: 'Cenário alternativo', text: 'Cenário alternativo: ' },
]

const adjustmentPrompts = [
  { label: 'Mais objetivo', text: 'Deixe a saída mais objetiva e pronta para refinamento.' },
  { label: 'Mais técnico', text: 'Aprofunde impactos técnicos, integrações e observabilidade.' },
  { label: 'Foco em QA', text: 'Reforce critérios de aceite, exceções e checklist de QA.' },
]

// ── Loading progress animation ───────────────────────────────────
const LOADING_STEPS = [
  { label: 'Analisando contexto…', pct: 30 },
  { label: 'Identificando persona…', pct: 65 },
  { label: 'Montando critérios…', pct: 90 },
]

function LoadingProgress() {
  return (
    <div className="brief-loading" aria-live="polite">
      {LOADING_STEPS.map((s) => (
        <div key={s.label} className="brief-loading__step">
          <span className="brief-loading__label">{s.label}</span>
          <div className="brief-loading__bar">
            <span className="brief-loading__bar-fill brief-loading__bar-fill--animate" style={{ '--target-width': `${s.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
function BriefComposer({
  formValues,
  validationErrors,
  onChange,
  onApplyPrompt,
  onSubmit,
  onReset,
  isSubmitting,
  isEditing,
  isGenerated,
  activeStoryTitle,
  hasAdjustment,
}) {
  const [reqOpen, setReqOpen] = useState(Boolean(formValues.requirements?.trim()))
  const [adjOpen, setAdjOpen] = useState(Boolean(formValues.adjustment?.trim()))

  const contextFilled = formValues.problemContext?.trim().length > 9
  const requirementsFilled = formValues.requirements?.trim().length > 4

  // Auto-open requirements when context has content
  if (contextFilled && !reqOpen && !formValues.requirements?.trim()) {
    // Don't auto-set state during render – handled via useEffect pattern below
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit()
  }

  const submitLabel = isSubmitting
    ? 'Forjando...'
    : isEditing
      ? hasAdjustment
        ? 'Forjar com ajuste'
        : 'Forjar nova versão'
      : 'Forjar Story'

  return (
    <section className="panel brief-composer" id="workspace-composer">
      {/* Stepper */}
      <ComposerStepper contextFilled={contextFilled} requirementsFilled={requirementsFilled} isGenerated={isGenerated} />

      {/* Active story banner (editing mode) */}
      {isEditing && (
        <div className="brief-composer__active-story">
          <span className="brief-composer__active-label">Base ativa</span>
          <strong>{activeStoryTitle || 'User story selecionada'}</strong>
          <button type="button" className="btn btn-ghost btn-small brief-composer__reset-btn" onClick={onReset}>
            <IconPlus />
            Nova
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="brief-composer__form">
        {/* ── Seção 1: Contexto ── */}
        <ComposerSection
          icon={<IconFileText />}
          label="Contexto"
          error={validationErrors.problemContext}
          footer={
            <PromptChips
              label="Sugestões para contexto"
              items={contextPrompts}
              onSelect={(value) => onApplyPrompt('problemContext', value)}
            />
          }
        >
          <label className="sr-only" htmlFor="workspace-context">Contexto do problema</label>
          <textarea
            id="workspace-context"
            value={formValues.problemContext}
            onChange={(event) => onChange('problemContext', event.target.value)}
            placeholder='Ex: "Usuários não conseguem recuperar senha em dispositivos mobile"'
            rows={5}
            className={validationErrors.problemContext ? 'textarea--error' : ''}
          />
        </ComposerSection>

        {/* ── Seção 2: Requisitos (accordion) ── */}
        <div className={`brief-accordion ${reqOpen ? 'brief-accordion--open' : ''}`}>
          <button
            type="button"
            className="brief-accordion__trigger"
            onClick={() => setReqOpen((v) => !v)}
            aria-expanded={reqOpen}
          >
            <span className="brief-accordion__trigger-left">
              <IconListChecks />
              <span className="brief-accordion__label">Requisitos</span>
              {validationErrors.requirements && <span className="brief-accordion__error-dot" aria-label="Campo obrigatório com erro" />}
              {requirementsFilled && !reqOpen && (
                <span className="brief-accordion__preview" aria-hidden="true">
                  {formValues.requirements.slice(0, 32)}…
                </span>
              )}
            </span>
            <span className={`brief-accordion__chevron ${reqOpen ? 'brief-accordion__chevron--open' : ''}`}>
              <IconChevronDown />
            </span>
          </button>

          <div className="brief-accordion__body" aria-hidden={!reqOpen}>
            <ComposerSection
              error={validationErrors.requirements}
              footer={
                <PromptChips
                  label="Sugestões para requisitos"
                  items={requirementPrompts}
                  onSelect={(value) => onApplyPrompt('requirements', value)}
                />
              }
            >
              <label className="sr-only" htmlFor="workspace-requirements">Requisitos e critérios</label>
              <textarea
                id="workspace-requirements"
                value={formValues.requirements}
                onChange={(event) => onChange('requirements', event.target.value)}
                placeholder='Ex: "Fluxo por e-mail, link expira em 24h, compatível com iOS e Android"'
                rows={4}
                tabIndex={reqOpen ? 0 : -1}
                className={validationErrors.requirements ? 'textarea--error' : ''}
              />
            </ComposerSection>
          </div>
        </div>

        {/* ── Seção 3: Ajuste (accordion, opcional) ── */}
        <div className={`brief-accordion ${adjOpen ? 'brief-accordion--open' : ''}`}>
          <button
            type="button"
            className="brief-accordion__trigger brief-accordion__trigger--muted"
            onClick={() => setAdjOpen((v) => !v)}
            aria-expanded={adjOpen}
          >
            <span className="brief-accordion__trigger-left">
              <IconSliders />
              <span className="brief-accordion__label">Ajuste</span>
              <span className="brief-accordion__optional">opcional</span>
            </span>
            <span className={`brief-accordion__chevron ${adjOpen ? 'brief-accordion__chevron--open' : ''}`}>
              <IconChevronDown />
            </span>
          </button>

          <div className="brief-accordion__body" aria-hidden={!adjOpen}>
            <ComposerSection
              footer={
                <PromptChips
                  label="Sugestões para ajuste"
                  items={adjustmentPrompts}
                  onSelect={(value) => onApplyPrompt('adjustment', value)}
                />
              }
            >
              <label className="sr-only" htmlFor="workspace-adjustment">Ajuste para a próxima versão</label>
              <textarea
                id="workspace-adjustment"
                value={formValues.adjustment}
                onChange={(event) => onChange('adjustment', event.target.value)}
                placeholder='Ex: "Foque em critérios de aceite mais detalhados"'
                rows={3}
                tabIndex={adjOpen ? 0 : -1}
              />
            </ComposerSection>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="brief-composer__footer">
          {isSubmitting && <LoadingProgress />}

          <button
            type="submit"
            className="btn btn-primary btn-full brief-composer__submit"
            disabled={isSubmitting}
          >
            <IconSparkles />
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

export default BriefComposer
