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
          <h2>{isEditing ? 'Gerar nova versao' : 'Gerador de User Story'}</h2>
          <p>
            {isEditing
              ? `Base selecionada: ${activeStoryTitle || 'historia selecionada'}. Gere uma nova versao sem sobrescrever as anteriores.`
              : 'Descreva o cenario e gere uma versao mais contextual para priorizacao do backlog.'}
          </p>
        </div>
        {isEditing ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={onReset}>
            Nova historia
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="story-form">
        <label htmlFor="contexto">Contexto do problema</label>
        <textarea
          id="contexto"
          value={formValues.problemContext}
          onChange={(event) => onChange('problemContext', event.target.value)}
          placeholder="Exemplo: usuarios B2B abandonam onboarding por falta de validacao de dominio."
          rows={4}
        />
        {validationErrors.problemContext ? (
          <p className="field-error">{validationErrors.problemContext}</p>
        ) : null}

        <label htmlFor="requisitos">Requisitos</label>
        <textarea
          id="requisitos"
          value={formValues.requirements}
          onChange={(event) => onChange('requirements', event.target.value)}
          placeholder="Descreva regras, resultados esperados e limitacoes tecnicas/negociais."
          rows={4}
        />
        {validationErrors.requirements ? <p className="field-error">{validationErrors.requirements}</p> : null}

        <label htmlFor="ajuste">Regenerar com ajuste (opcional)</label>
        <textarea
          id="ajuste"
          value={formValues.adjustment}
          onChange={(event) => onChange('adjustment', event.target.value)}
          placeholder="Exemplo: deixar mais tecnico, foco backend e observabilidade."
          rows={3}
        />

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting
            ? 'Gerando...'
            : isEditing
              ? hasAdjustment
                ? 'Regenerar com ajuste'
                : 'Gerar nova versao'
              : 'Gerar User Story'}
        </button>
      </form>
    </section>
  )
}

export default FormUserStory

