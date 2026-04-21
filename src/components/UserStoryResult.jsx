function UserStoryResult({ result, saveMessage, onCopy, copyMessage, isCopying, isLoadingSelectedStory }) {
  if (!result) {
    return (
      <section className="panel panel-muted">
        <h2>Resultado</h2>
        <p>A user story gerada aparecerá aqui com estrutura pronta para revisão.</p>
      </section>
    )
  }

  return (
    <section className="panel result-panel">
      <div className="panel-header panel-header-row">
        <div className="result-header-meta">
          <h2>Resultado estruturado</h2>
          <p className="result-origin">
            Gerado por IA
            {result?.generation_meta?.model_used ? ` (${result.generation_meta.model_used})` : ''}
            {Number.isFinite(result?.generation_meta?.quality_score) &&
            result.generation_meta.quality_score > 0
              ? ` • Score ${result.generation_meta.quality_score}/100`
              : ''}
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onCopy} disabled={isCopying}>
          {isCopying ? 'Copiando...' : 'Copiar User Story'}
        </button>
      </div>

      {isLoadingSelectedStory ? <p className="result-inline-status">Carregando dados da história...</p> : null}

      <div className="result-section">
        <h3>Título</h3>
        <p>{result.title}</p>
      </div>

      <div className="result-section">
        <h3>Objetivo</h3>
        <p>{result.objective}</p>
      </div>

      <div className="result-section">
        <h3>User Story</h3>
        <p className="user-story-highlight">{result.user_story}</p>
      </div>

      <div className="result-section">
        <h3>Critérios de aceitação</h3>
        <ul className="criteria-list">
          {result.acceptance_criteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
      </div>

      {result.business_rules.length > 0 ? (
        <div className="result-section">
          <h3>Regras de negócio</h3>
          <ul className="criteria-list">
            {result.business_rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.gaps.length > 0 ? (
        <div className="result-section">
          <h3>Gaps identificados</h3>
          <ul className="criteria-list">
            {result.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.qa_checklist.length > 0 ? (
        <div className="result-section">
          <h3>Checklist de QA</h3>
          <ul className="criteria-list">
            {result.qa_checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="result-section">
        <h3>Notas</h3>
        <p>{result.notes}</p>
      </div>

      <div className="result-actions">
        {saveMessage ? (
          <p
            className={`save-message ${saveMessage.toLowerCase().includes('erro') ? 'save-message-error' : 'save-message-success'}`}
          >
            {saveMessage}
          </p>
        ) : null}
        {copyMessage ? <p className="copy-message">{copyMessage}</p> : null}
      </div>
    </section>
  )
}

export default UserStoryResult
