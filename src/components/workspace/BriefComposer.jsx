import { useCopy } from '../../i18n/context'
import { useRef, useState } from 'react'
import ComposerSection from './ComposerSection'
import PromptChips from './PromptChips'
import { getQuickTemplates } from './workspaceTemplates'

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
  { label: 'user_pain_point', text: 'user_pain_point_2' },
  { label: 'current_flow', text: 'current_flow_2' },
  { label: 'product_impact', text: 'product_impact_2' },
]

const requirementPrompts = [
  { label: 'business_rule', text: 'business_rule_2' },
  { label: 'minimum_criterion', text: 'minimum_criterion_2' },
  { label: 'alternative_scenario', text: 'alternative_scenario_2' },
]

const adjustmentPrompts = [
  { label: 'more_concise', text: 'make_the_output_more_concise_and' },
  { label: 'more_technical_detail', text: 'expand_on_technical_impacts_integrations_and' },
  { label: 'focus_on_testing', text: 'strengthen_the_acceptance_criteria_exceptions_and' },
]

const LOADING_STEPS = [
  { label: 'organizing_the_brief', pct: 30 },
  { label: 'applying_rules', pct: 65 },
  { label: 'preparing_criteria', pct: 90 },
]

function LoadingProgress() {
  const t = useCopy('forge')
  return (
    <div className="brief-loading" aria-live="polite">
      {LOADING_STEPS.map((step) => (
        <div key={step.label} className="brief-loading__step">
          <span className="brief-loading__label">{t(step.label)}</span>
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

function getRequirementsSummary(value, t) {
  const count = countFilledLines(value)
  if (count <= 0) return ''

  return count === 1 ? t('1_rule') : t('rules', { p1: count })
}

function getAdjustmentSummary(value, t) {
  const count = countFilledLines(value)
  if (count <= 0) return ''

  return count === 1 ? t('set') : t('instructions', { p1: count })
}

function getBriefPreview(value, t) {
  const cleanValue = value?.trim().replace(/\s+/g, ' ') ?? ''
  if (!cleanValue) return t('the_brief_used_to_generate_the')
  if (cleanValue.length <= 112) return cleanValue
  return `${cleanValue.slice(0, 112).trim()}...`
}

function getBriefStage({ contextFilled, isGenerated, isSubmitting }, t) {
  if (isSubmitting) return t('generating')
  if (isGenerated) return t('first_version_ready')
  if (contextFilled) return t('ready_to_generate')
  return t('brief_required')
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
  const t = useCopy('forge')
  const templateCopy = useCopy('workspaceTemplates')
  const contextTextareaRef = useRef(null)
  const [reqOpen, setReqOpen] = useState(Boolean(formValues.requirements?.trim()))
  const [adjOpen, setAdjOpen] = useState(Boolean(formValues.adjustment?.trim()))

  const isPostForge = isGenerated || isEditing
  const contextFilled = formValues.problemContext?.trim().length > 9
  const briefPreview = getBriefPreview(formValues.problemContext, t)
  const requirementsSummary = getRequirementsSummary(formValues.requirements, t)
  const adjustmentSummary = getAdjustmentSummary(formValues.adjustment, t)
  const requirementsFilled = Boolean(requirementsSummary)
  const adjustmentFilled = Boolean(adjustmentSummary)
  const currentStage = getBriefStage({
    contextFilled,
    isGenerated,
    isSubmitting,
  }, t)
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
    ? t('generating_version')
    : isEditing
      ? hasAdjustment
        ? t('generate_refined_version')
        : t('generate_new_version')
      : t('generate_first_version')
  const canSubmit = isEditing ? hasAdjustment || contextFilled : contextFilled
  const submitHelpText = isSubmitting
    ? t('ai_is_generating_a_structured_version')
    : canSubmit
      ? isEditing
        ? t('ai_applies_your_instructions_and_generates')
        : t('generate_the_first_structured_version_of')
      : t('enter_a_brief_to_enable_generation')

  return (
    <section
      className={`panel brief-composer ${isPostForge ? 'brief-composer--post-forge' : ''}`}
      id="workspace-composer"
    >
      <header className="brief-composer__panel-header">
        <div className="brief-composer__panel-copy">
          <p className="brief-composer__eyebrow">{t('workspace')}</p>
          <h2>{t('describe_the_story_s_brief')}</h2>
          <p>{t('paste_your_brief_problem_statement_or')}</p>
        </div>

        <div className="brief-composer__panel-actions">
          <span className={`brief-composer__panel-pill brief-composer__panel-pill--${currentStageTone}`}>
            {currentStage}
          </span>
        </div>
      </header>

      <div className="brief-composer__body" id="workspace-composer-body">
        <div className="brief-composer__quick-start" aria-label={t('quick_examples')}>
          <div className="brief-composer__quick-start-copy">
            <p className="brief-composer__quick-start-label">{t('quick_examples')}</p>
            <p>{t('use_an_example_to_fill_the')}</p>
          </div>
          <div className="brief-composer__template-list">
            {getQuickTemplates(templateCopy).map((template) => (
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
            <span className="brief-composer__active-label">{t('active_artifact')}</span>
            <strong>{activeStoryTitle || t('selected_artifact')}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-small brief-composer__reset-btn"
              onClick={onReset}
            >
              <IconPlus />{t('new_artifact')}</button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="brief-composer__form">
          <details
            className={`brief-composer__entry-details ${isPostForge ? '' : 'brief-composer__entry-details--plain'}`}
            open={!isPostForge}
          >
            <summary className="brief-composer__entry-summary">
              <span className="brief-composer__entry-copy">
                <span className="brief-composer__entry-eyebrow">{t('original_input')}</span>
                <strong>{t('brief_used_to_generate_the_story')}</strong>
                <span className="brief-composer__entry-preview">{briefPreview}</span>
              </span>
              <span className="brief-composer__entry-action">{t('view_or_edit_input')}</span>
            </summary>

            <div className="brief-composer__entry-body">
          <div className="brief-composer__primary-flow">
            <ComposerSection
              icon={<IconFileText />}
              label={isPostForge ? t('original_input') : t('brief')}
              error={validationErrors.problemContext && t(validationErrors.problemContext)}
              errorId="workspace-context-error"
              footer={
                <div className="brief-composer__prompt-shortcuts">
                  <p className="brief-composer__shortcut-help">{t('brief_the_problem_request_or_starting')}</p>
                  <PromptChips
                    label={t('shortcuts_for_drafting_the_brief')}
                    items={contextPrompts}
                    onSelect={handleContextPromptSelect}
                    itemActionLabel={t('insert_a_prompt_into_the_brief')}
                  />
                </div>
              }
            >
              <label className="sr-only" htmlFor="workspace-context">{t('story_brief')}</label>
              <textarea
                id="workspace-context"
                aria-invalid={Boolean(validationErrors.problemContext)}
                aria-describedby={validationErrors.problemContext ? 'workspace-context-error' : undefined}
                ref={contextTextareaRef}
                value={formValues.problemContext}
                onChange={(event) => onChange('problemContext', event.target.value)}
                placeholder={t('for_example_users_forget_their_password')}
                rows={5}
                className={`brief-composer__context-input ${validationErrors.problemContext ? 'textarea--error' : ''}`}
              />
            </ComposerSection>

            <div className="brief-composer__footer">
              {isSubmitting ? <LoadingProgress /> : null}

              <p className="brief-composer__footer-copy">{submitHelpText}</p>

              <button
                type="submit"
                className={`btn ${isPostForge ? 'btn-secondary' : 'btn-primary'} btn-full brief-composer__submit`}
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
                  <span className="brief-accordion__label">{t('rules_and_constraints')}</span>
                  <span className="brief-accordion__optional">{t('optional')}</span>
                  {validationErrors.requirements ? (
                    <span
                      className="brief-accordion__error-dot"
                      aria-label={t('required_field_with_an_error')}
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

              <div className="brief-accordion__body" aria-hidden={!reqOpen} inert={!reqOpen}>
                <ComposerSection
                  error={validationErrors.requirements && t(validationErrors.requirements)}
                  errorId="workspace-requirements-error"
                  footer={
                    <div className="brief-composer__prompt-shortcuts">
                      <p className="brief-composer__shortcut-help">{t('add_rules_constraints_exceptions_and_dependencies')}</p>
                      <PromptChips
                        label={t('suggestions_for_rules_and_constraints')}
                        items={requirementPrompts}
                        onSelect={(value) => onApplyPrompt('requirements', value)}
                      />
                    </div>
                  }
                >
                  <label className="sr-only" htmlFor="workspace-requirements">{t('rules_constraints_and_criteria')}</label>
                  <textarea
                    id="workspace-requirements"
                    aria-invalid={Boolean(validationErrors.requirements)}
                    aria-describedby={validationErrors.requirements ? 'workspace-requirements-error' : undefined}
                    value={formValues.requirements}
                    onChange={(event) => onChange('requirements', event.target.value)}
                    placeholder={t('for_example_send_a_reset_email')}
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
                  <span className="brief-accordion__label">{t('refinement_instructions')}</span>
                  <span className="brief-accordion__optional">{t('optional')}</span>
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

              <div className="brief-accordion__body" aria-hidden={!adjOpen} inert={!adjOpen}>
                <ComposerSection
                  footer={
                    <div className="brief-composer__prompt-shortcuts">
                      <p className="brief-composer__shortcut-help">{t('specify_the_format_tone_and_level')}</p>
                      <PromptChips
                        label={t('suggestions_for_refinement')}
                        items={adjustmentPrompts}
                        onSelect={(value) => onApplyPrompt('adjustment', value)}
                      />
                    </div>
                  }
                >
                  <label className="sr-only" htmlFor="workspace-adjustment">{t('instructions_for_the_next_version')}</label>
                  <textarea
                    id="workspace-adjustment"
                    value={formValues.adjustment}
                    onChange={(event) => onChange('adjustment', event.target.value)}
                    placeholder={t('for_example_make_the_acceptance_criteria')}
                    rows={3}
                    tabIndex={adjOpen ? 0 : -1}
                  />
                </ComposerSection>
              </div>
            </div>
          </div>
            </div>
          </details>
        </form>
      </div>
    </section>
  )
}

export default BriefComposer
