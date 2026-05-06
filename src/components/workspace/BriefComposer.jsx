import { useRef, useState } from 'react'
import ComposerSection from './ComposerSection'
import PromptChips from './PromptChips'
import { QUICK_TEMPLATES } from './workspaceTemplates'

function IconFileText() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconListChecks() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <polyline points="3 6 4 7 6 5" />
      <polyline points="3 12 4 13 6 11" />
      <polyline points="3 18 4 19 6 17" />
    </svg>
  )
}

function IconSliders() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

function IconSparkles() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5z" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const contextPrompts = [
  { label: 'Dor do usuário', text: 'Dor do usuário: ' },
  { label: 'Fluxo atual', text: 'Fluxo atual: ' },
  { label: 'Impacto no produto', text: 'Impacto no produto: ' },
]

const requirementPrompts = [
  { label: 'Regra de negócio', text: 'Regra de negócio: ' },
  { label: 'Critério mínimo', text: 'Critério mínimo: ' },
  { label: 'Cenário alternativo', text: 'Cenário alternativo: ' },
]

const adjustmentPrompts = [
  { label: 'Mais objetivo', text: 'Deixe a saída mais objetiva e pronta para refinamento.' },
  { label: 'Mais técnico', text: 'Aprofunde impactos técnicos, integrações e observabilidade.' },
  { label: 'Foco em teste', text: 'Reforce critérios de aceite, exceções e cenários de QA.' },
]

const LOADING_STEPS = [
  { label: 'Organizando briefing...', pct: 30 },
  { label: 'Aplicando regras...', pct: 65 },
  { label: 'Preparando critérios...', pct: 90 },
]

function LoadingProgress() {
  return (
    <div className="brief-loading" aria-live="polite">
      {LOADING_STEPS.map((step) => (
        <div key={step.label} className="brief-loading__step">
          <span className="brief-loading__label">{step.label}</span>
          <div className="brief-loading__bar">
            <span
              className="brief-loading__bar-fill brief-loading__bar-fill--animate"
              style={{ '--target-width': `${step.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function countFilledLines(value) {
  return value
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length ?? 0
}

function getRequirementsSummary(value) {
  const count = countFilledLines(value)
  if (count <= 0) return ''

  return count === 1 ? '1 regra' : `${count} regras`
}

function getAdjustmentSummary(value) {
  const count = countFilledLines(value)
  if (count <= 0) return ''

  return count === 1 ? 'Definido' : `${count} instruções`
}

function getBriefStage({ contextFilled, isGenerated, isSubmitting }) {
  if (isSubmitting) return 'Forjando'
  if (isGenerated) return 'Primeira versão pronta'
  if (contextFilled) return 'Pronto para forjar'
  return 'Matéria-prima obrigatória'
}

function getBriefStageTone({ contextFilled, isGenerated, isSubmitting }) {
  if (isSubmitting) return 'working'
  if (isGenerated || contextFilled) return 'ready'
  return 'required'
}

function BriefComposer({
  formValues,
  validationErrors,
  onChange,
  onApplyPrompt,
  onApplyTemplate,
  onSubmit,
  onReset,
  isSubmitting,
  isEditing,
  isGenerated,
  activeStoryTitle,
  hasAdjustment,
}) {
  const contextTextareaRef = useRef(null)
  const [reqOpen, setReqOpen] = useState(Boolean(formValues.requirements?.trim()))
  const [adjOpen, setAdjOpen] = useState(Boolean(formValues.adjustment?.trim()))

  const contextFilled = formValues.problemContext?.trim().length > 9
  const requirementsSummary = getRequirementsSummary(formValues.requirements)
  const adjustmentSummary = getAdjustmentSummary(formValues.adjustment)
  const requirementsFilled = Boolean(requirementsSummary)
  const adjustmentFilled = Boolean(adjustmentSummary)
  const currentStage = getBriefStage({
    contextFilled,
    isGenerated,
    isSubmitting,
  })
  const currentStageTone = getBriefStageTone({
    contextFilled,
    isGenerated,
    isSubmitting,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit()
  }

  function focusContextTextarea() {
    const focusTextarea = () => {
      const textarea = contextTextareaRef.current
      if (!textarea) return

      const endPosition = textarea.value.length
      textarea.focus()
      textarea.setSelectionRange(endPosition, endPosition)
    }

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(focusTextarea)
      return
    }

    focusTextarea()
  }

  function handleContextPromptSelect(value) {
    onApplyPrompt('problemContext', value)
    focusContextTextarea()
  }

  function handleTemplateSelect(template) {
    onApplyTemplate?.(template)
    focusContextTextarea()
  }

  const submitLabel = isSubmitting
    ? 'Gerando versão...'
    : isEditing
      ? hasAdjustment
        ? 'Gerar versão refinada'
        : 'Gerar nova versão'
      : 'Forjar primeira versão'
  const canSubmit = isEditing ? hasAdjustment || contextFilled : contextFilled
  const submitHelpText = isSubmitting
    ? 'A IA está gerando a versão estruturada da story.'
    : canSubmit
      ? isEditing
        ? 'A IA aplica o acabamento e gera uma nova versão estruturada.'
        : 'A forja gera a primeira versão estruturada da story.'
      : 'Preencha a matéria-prima para liberar a geração.'

  return (
    <section
      className="panel brief-composer"
      id="workspace-composer"
    >
      <header className="brief-composer__panel-header">
        <div className="brief-composer__panel-copy">
          <p className="brief-composer__eyebrow">Bancada</p>
          <h2>Descreva a matéria-prima da story</h2>
          <p>
            Cole o briefing, problema ou demanda inicial. O ProdForge transforma esse contexto em uma user story pronta para refino.
          </p>
        </div>

        <div className="brief-composer__panel-actions">
          <span className={`brief-composer__panel-pill brief-composer__panel-pill--${currentStageTone}`}>
            {currentStage}
          </span>
        </div>
      </header>

      <div className="brief-composer__body" id="workspace-composer-body">
        <div className="brief-composer__quick-start" aria-label="Exemplos rápidos">
          <div className="brief-composer__quick-start-copy">
            <p className="brief-composer__quick-start-label">Exemplos rápidos</p>
            <p>Use um exemplo para preencher a bancada ou cole seu próprio briefing no campo principal.</p>
          </div>
          <div className="brief-composer__template-list">
            {QUICK_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="brief-composer__template-chip"
                onClick={() => handleTemplateSelect(template)}
                disabled={isSubmitting}
              >
                <span className="brief-composer__template-emoji" aria-hidden="true">
                  {template.emoji}
                </span>
                <span className="brief-composer__template-label">{template.label}</span>
              </button>
            ))}
          </div>
        </div>

        {isEditing ? (
          <div className="brief-composer__active-story">
            <span className="brief-composer__active-label">Peça ativa</span>
            <strong>{activeStoryTitle || 'Peça selecionada'}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-small brief-composer__reset-btn"
              onClick={onReset}
            >
              <IconPlus />
              Nova peça
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="brief-composer__form">
          <div className="brief-composer__primary-flow">
            <ComposerSection
              icon={<IconFileText />}
              label="Matéria-prima"
              error={validationErrors.problemContext}
              footer={
                <div className="brief-composer__prompt-shortcuts">
                  <p className="brief-composer__shortcut-help">
                    Matéria-prima: briefing, problema ou demanda inicial. Clique para inserir pontos úteis:
                  </p>
                  <PromptChips
                    label="Atalhos para preencher a matéria-prima"
                    items={contextPrompts}
                    onSelect={handleContextPromptSelect}
                    itemActionLabel="Inserir ponto na matéria-prima"
                  />
                </div>
              }
            >
              <label className="sr-only" htmlFor="workspace-context">Matéria-prima da story</label>
              <textarea
                id="workspace-context"
                ref={contextTextareaRef}
                value={formValues.problemContext}
                onChange={(event) => onChange('problemContext', event.target.value)}
                placeholder="Ex: Usuários esquecem a senha, tentam recuperar pelo celular e abandonam o login quando o e-mail não chega."
                rows={5}
                className={`brief-composer__context-input ${validationErrors.problemContext ? 'textarea--error' : ''}`}
              />
            </ComposerSection>

            <div className="brief-composer__footer">
              {isSubmitting ? <LoadingProgress /> : null}

              <p className="brief-composer__footer-copy">{submitHelpText}</p>

              <button
                type="submit"
                className="btn btn-primary btn-full brief-composer__submit"
                disabled={isSubmitting || !canSubmit}
              >
                <IconSparkles />
                {submitLabel}
              </button>
            </div>
          </div>

          <div className="brief-composer__optional-flow">
            <div className={`brief-accordion ${reqOpen ? 'brief-accordion--open' : ''}`}>
              <button
                type="button"
                className="brief-accordion__trigger"
                onClick={() => setReqOpen((value) => !value)}
                aria-expanded={reqOpen}
              >
                <span className="brief-accordion__trigger-left">
                  <IconListChecks />
                  <span className="brief-accordion__label">Ligas e regras</span>
                  <span className="brief-accordion__optional">opcional</span>
                  {validationErrors.requirements ? (
                    <span
                      className="brief-accordion__error-dot"
                      aria-label="Campo obrigatório com erro"
                    />
                  ) : null}
                  {requirementsFilled && !reqOpen ? (
                    <span className="brief-accordion__preview" aria-hidden="true">
                      {requirementsSummary}
                    </span>
                  ) : null}
                </span>
                <span className={`brief-accordion__chevron ${reqOpen ? 'brief-accordion__chevron--open' : ''}`}>
                  <IconChevronDown />
                </span>
              </button>

              <div className="brief-accordion__body" aria-hidden={!reqOpen}>
                <ComposerSection
                  error={validationErrors.requirements}
                  footer={
                    <div className="brief-composer__prompt-shortcuts">
                      <p className="brief-composer__shortcut-help">
                        Ligas: regras, restrições, exceções e dependências que fortalecem a story.
                      </p>
                      <PromptChips
                        label="Sugestões para ligas"
                        items={requirementPrompts}
                        onSelect={(value) => onApplyPrompt('requirements', value)}
                      />
                    </div>
                  }
                >
                  <label className="sr-only" htmlFor="workspace-requirements">Ligas, regras e critérios</label>
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

            <div className={`brief-accordion ${adjOpen ? 'brief-accordion--open' : ''}`}>
              <button
                type="button"
                className="brief-accordion__trigger brief-accordion__trigger--muted"
                onClick={() => setAdjOpen((value) => !value)}
                aria-expanded={adjOpen}
              >
                <span className="brief-accordion__trigger-left">
                  <IconSliders />
                  <span className="brief-accordion__label">Acabamento</span>
                  <span className="brief-accordion__optional">opcional</span>
                  {adjustmentFilled && !adjOpen ? (
                    <span className="brief-accordion__preview" aria-hidden="true">
                      {adjustmentSummary}
                    </span>
                  ) : null}
                </span>
                <span className={`brief-accordion__chevron ${adjOpen ? 'brief-accordion__chevron--open' : ''}`}>
                  <IconChevronDown />
                </span>
              </button>

              <div className="brief-accordion__body" aria-hidden={!adjOpen}>
                <ComposerSection
                  footer={
                    <div className="brief-composer__prompt-shortcuts">
                      <p className="brief-composer__shortcut-help">
                        Acabamento: formato, tom e nível de detalhe da entrega.
                      </p>
                      <PromptChips
                        label="Sugestões para acabamento"
                        items={adjustmentPrompts}
                        onSelect={(value) => onApplyPrompt('adjustment', value)}
                      />
                    </div>
                  }
                >
                  <label className="sr-only" htmlFor="workspace-adjustment">Acabamento para a próxima versão</label>
                  <textarea
                    id="workspace-adjustment"
                    value={formValues.adjustment}
                    onChange={(event) => onChange('adjustment', event.target.value)}
                    placeholder="Ex: Detalhe melhor os critérios de aceite e deixe o texto mais objetivo."
                    rows={3}
                    tabIndex={adjOpen ? 0 : -1}
                  />
                </ComposerSection>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}

export default BriefComposer
