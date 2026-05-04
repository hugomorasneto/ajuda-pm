function FormUserStory({
  formValues,
  validationErrors,
  onChange,
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
    <section className="panel">
      <div className="panel-header panel-header-row">
        <div>
          <h2>{isEditing ? 'Forjar nova versão' : 'Forja de User Story'}</h2>
          <p>
            {isEditing
              ? `Peça selecionada: ${activeStoryTitle || 'história selecionada'}. Forje uma nova versão sem sobrescrever as anteriores.`
              : 'Descreva a matéria-prima e forje uma versão mais contextual para priorização do backlog.'}
          </p>
        </div>
        {isEditing ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={onReset}>
            Nova peça
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="story-form">
        <label htmlFor="contexto">Matéria-prima</label>
        <textarea
          id="contexto"
          value={formValues.problemContext}
          onChange={(event) => onChange('problemContext', event.target.value)}
          placeholder="Exemplo: usuários B2B abandonam onboarding por falta de validação de domínio."
          rows={4}
        />
        {validationErrors.problemContext ? (
          <p className="field-error">{validationErrors.problemContext}</p>
        ) : null}

        <label htmlFor="requisitos">Ligas e regras</label>
        <textarea
          id="requisitos"
          value={formValues.requirements}
          onChange={(event) => onChange('requirements', event.target.value)}
          placeholder="Descreva regras, resultados esperados e limitações técnicas/negociais."
          rows={4}
        />
        {validationErrors.requirements ? <p className="field-error">{validationErrors.requirements}</p> : null}

        <label htmlFor="ajuste">Acabamento (opcional)</label>
        <textarea
          id="ajuste"
          value={formValues.adjustment}
          onChange={(event) => onChange('adjustment', event.target.value)}
          placeholder="Exemplo: deixar mais técnico, foco backend e observabilidade."
          rows={3}
        />

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting
            ? 'Aquecendo a forja...'
            : isEditing
              ? hasAdjustment
                ? 'Refinar na forja'
                : 'Forjar nova versão'
              : 'Forjar primeira versão'}
        </button>
      </form>
    </section>
  )
}

export default FormUserStory
