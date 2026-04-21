import ComposerSection from './ComposerSection'
import PromptChips from './PromptChips'

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

function BriefComposer({
  formValues,
  validationErrors,
  onChange,
  onApplyPrompt,
  onSubmit,
  onReset,
  isSubmitting,
  isEditing,
  activeStoryTitle,
  hasAdjustment,
}) {
  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <section className="panel brief-composer" id="workspace-composer">
      <div className="brief-composer__header">
        <div>
          <p className="brief-composer__eyebrow">{isEditing ? 'Nova versão' : 'Brief de entrada'}</p>
          <h2>{isEditing ? 'Refine a base selecionada' : 'Estruture o contexto antes de gerar'}</h2>
          <p>
            {isEditing
              ? 'Mantenha o contexto principal, ajuste o direcionamento e gere outra versão sem perder o histórico.'
              : 'Traga o contexto, as regras e o resultado esperado. O ProdForge organiza isso em uma user story pronta para revisão.'}
          </p>
        </div>

        {isEditing ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={onReset}>
            Nova user story
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="brief-composer__active-story">
          <span className="brief-composer__active-label">Base ativa</span>
          <strong>{activeStoryTitle || 'User story selecionada'}</strong>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="brief-composer__form">
        <ComposerSection
          eyebrow="1. Contexto"
          title="O que está acontecendo no produto?"
          description="Descreva o problema, a dor do usuário, o fluxo atual ou o objetivo de negócio."
          error={validationErrors.problemContext}
          footer={
            <PromptChips
              label="Sugestões para contexto"
              items={contextPrompts}
              onSelect={(value) => onApplyPrompt('problemContext', value)}
            />
          }
        >
          <label className="sr-only" htmlFor="workspace-context">
            Contexto do problema
          </label>
          <textarea
            id="workspace-context"
            value={formValues.problemContext}
            onChange={(event) => onChange('problemContext', event.target.value)}
            placeholder="Exemplo: empresas B2B abandonam o onboarding quando o domínio não é validado no cadastro inicial."
            rows={6}
          />
        </ComposerSection>

        <ComposerSection
          eyebrow="2. Requisitos"
          title="Quais regras e critérios não podem faltar?"
          description="Liste regras de negócio, critérios de aceite, restrições técnicas ou cenários alternativos."
          error={validationErrors.requirements}
          footer={
            <PromptChips
              label="Sugestões para requisitos"
              items={requirementPrompts}
              onSelect={(value) => onApplyPrompt('requirements', value)}
            />
          }
        >
          <label className="sr-only" htmlFor="workspace-requirements">
            Requisitos e critérios
          </label>
          <textarea
            id="workspace-requirements"
            value={formValues.requirements}
            onChange={(event) => onChange('requirements', event.target.value)}
            placeholder="Exemplo: bloquear avanço com domínio inválido, preservar dados preenchidos e registrar a tentativa para análise do funil."
            rows={6}
          />
        </ComposerSection>

        <ComposerSection
          eyebrow="3. Ajuste opcional"
          title="Como a próxima versão deve evoluir?"
          description="Use este campo para regenerar com outra ênfase, sem alterar o contexto base já selecionado."
          footer={
            <PromptChips
              label="Sugestões para ajuste"
              items={adjustmentPrompts}
              onSelect={(value) => onApplyPrompt('adjustment', value)}
            />
          }
        >
          <label className="sr-only" htmlFor="workspace-adjustment">
            Ajuste para a próxima versão
          </label>
          <textarea
            id="workspace-adjustment"
            value={formValues.adjustment}
            onChange={(event) => onChange('adjustment', event.target.value)}
            placeholder="Exemplo: deixar mais técnico, destacar riscos e ampliar o checklist de QA."
            rows={4}
          />
        </ComposerSection>

        <div className="brief-composer__footer">
          <div className="brief-composer__status">
            {isSubmitting ? (
              <ul className="brief-composer__loading-steps" aria-live="polite">
                <li>Analisando o contexto</li>
                <li>Estruturando a user story</li>
                <li>Revisando critérios de aceite</li>
              </ul>
            ) : (
              <p>
                {isEditing && hasAdjustment
                  ? 'O ajuste será usado para gerar uma nova versão da mesma base.'
                  : 'Os três campos alimentam a mesma geração. Se houver erro, o conteúdo preenchido será preservado.'}
              </p>
            )}
          </div>

          <div className="brief-composer__actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? 'Gerando...'
                : isEditing
                  ? hasAdjustment
                    ? 'Gerar nova versão com ajuste'
                    : 'Gerar nova versão'
                  : 'Gerar user story'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default BriefComposer
