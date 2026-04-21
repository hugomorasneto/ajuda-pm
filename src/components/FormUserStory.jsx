function FormUserStory({
  formValues,
  validationErrors,
  onChange,
  onSubmit,
  onReset,
  isSubmitting,
  isEditing,
  activeStoryTitle,
}) {
  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-row">
        <div>
          <h2>{isEditing ? 'Editar User Story' : 'Gerador de User Story'}</h2>
          <p>
            {isEditing
              ? `Você está editando: ${activeStoryTitle || 'história selecionada'}`
              : 'Descreva o cenário e gere uma versão mais contextual para priorização do backlog.'}
          </p>
        </div>
        {isEditing ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={onReset}>
            Nova história
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="story-form">
        <label htmlFor="contexto">Contexto do problema</label>
        <textarea
          id="contexto"
          value={formValues.problemContext}
          onChange={(event) => onChange('problemContext', event.target.value)}
          placeholder="Exemplo: usuários B2B abandonam onboarding por falta de validação de domínio."
          rows={5}
        />
        {validationErrors.problemContext ? (
          <p className="field-error">{validationErrors.problemContext}</p>
        ) : null}

        <label htmlFor="requisitos">Requisitos</label>
        <textarea
          id="requisitos"
          value={formValues.requirements}
          onChange={(event) => onChange('requirements', event.target.value)}
          placeholder="Descreva regras, resultados esperados e limitações técnicas/negociais."
          rows={5}
        />
        {validationErrors.requirements ? (
          <p className="field-error">{validationErrors.requirements}</p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar User Story' : 'Gerar User Story'}
        </button>
      </form>
    </section>
  )
}

export default FormUserStory
