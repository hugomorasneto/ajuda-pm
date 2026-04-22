function parseTextList(value) {
  if (!value) return []
  return String(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildDiffSummary(previousVersion, currentVersion) {
  if (!previousVersion || !currentVersion) return null

  const previousCriteria = parseTextList(previousVersion.acceptance_criteria)
  const currentCriteria = parseTextList(currentVersion.acceptance_criteria)

  return {
    titleChanged: previousVersion.title !== currentVersion.title,
    storyChanged: previousVersion.user_story !== currentVersion.user_story,
    addedCriteria: currentCriteria.filter((item) => !previousCriteria.includes(item)),
    removedCriteria: previousCriteria.filter((item) => !currentCriteria.includes(item)),
    criteriaUnchangedCount: currentCriteria.filter((item) => previousCriteria.includes(item)).length,
  }
}

function VersionDiffSummary({ currentVersion, previousVersion }) {
  const diff = buildDiffSummary(previousVersion, currentVersion)
  const totalCriteriaChanges =
    (diff?.addedCriteria?.length ?? 0) + (diff?.removedCriteria?.length ?? 0)

  return (
    <section className="panel version-diff-summary">
      <div className="panel-header">
        <p className="version-diff-summary__eyebrow">Comparação</p>
        <h2>Resumo das mudanças</h2>
        <p>
          {previousVersion
            ? `Diferenças entre a versão ativa e a V${previousVersion.version_number}.`
            : 'A primeira versão da base ainda não tem comparação anterior.'}
        </p>
      </div>

      {!previousVersion || !diff ? (
        <p className="history-status">
          Gere uma nova versão para comparar o que mudou em relação à base anterior.
        </p>
      ) : (
        <div className="version-diff-summary__content">
          <p className="version-diff-summary__lead">
            {totalCriteriaChanges > 0
              ? `Esta versão trouxe ${totalCriteriaChanges} mudança${totalCriteriaChanges === 1 ? '' : 's'} nos critérios de aceite.`
              : 'Esta versão manteve a estrutura principal dos critérios de aceite.'}
          </p>

          <div className="version-diff-summary__chips">
            <span className={`version-diff-summary__chip ${diff.titleChanged ? 'version-diff-summary__chip--changed' : ''}`}>
              {diff.titleChanged ? 'Título alterado' : 'Título mantido'}
            </span>
            <span className={`version-diff-summary__chip ${diff.storyChanged ? 'version-diff-summary__chip--changed' : ''}`}>
              {diff.storyChanged ? 'User story alterada' : 'User story mantida'}
            </span>
            <span className="version-diff-summary__chip">
              {diff.criteriaUnchangedCount} critérios mantidos
            </span>
          </div>

          <div className="version-diff-summary__grid">
            <article className="version-diff-summary__block version-diff-summary__block--positive">
              <h3>Critérios adicionados</h3>
              {diff.addedCriteria.length > 0 ? (
                <ul className="version-diff-summary__list version-diff-summary__list--positive">
                  {diff.addedCriteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="version-diff-summary__empty">Nenhum critério novo nesta versão.</p>
              )}
            </article>

            <article className="version-diff-summary__block version-diff-summary__block--muted">
              <h3>Critérios removidos</h3>
              {diff.removedCriteria.length > 0 ? (
                <ul className="version-diff-summary__list version-diff-summary__list--muted">
                  {diff.removedCriteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="version-diff-summary__empty">Nenhum critério foi removido.</p>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  )
}

export default VersionDiffSummary
