import { buildVersionDiff, getVersionDiffLead } from '../../utils/storyVersionUtils'

function DiffList({ title, items, emptyText, tone = 'neutral' }) {
  return (
    <article className={`version-diff-summary__block version-diff-summary__block--${tone}`}>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul className={`version-diff-summary__list version-diff-summary__list--${tone}`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="version-diff-summary__empty">{emptyText}</p>
      )}
    </article>
  )
}

function VersionDiffSummary({ currentVersion, previousVersion, onCopyComparison, isCopying }) {
  const diff = buildVersionDiff(previousVersion, currentVersion)
  const lead = getVersionDiffLead(diff)

  return (
    <section className="panel version-diff-summary">
      <div className="panel-header">
        <p className="version-diff-summary__eyebrow">Comparação</p>
        <h2>Resumo do refino</h2>
        <p>
          {previousVersion
            ? `Diferenças entre a versão ativa e a ${diff?.previousLabel ?? 'versão anterior'}.`
            : 'A primeira versão da peça ainda não tem comparação anterior.'}
        </p>
      </div>

      {!previousVersion || !diff ? (
        <p className="history-status">
          Gere uma nova versão para comparar o que mudou em relação à peça anterior.
        </p>
      ) : (
        <div className="version-diff-summary__content">
          <div className="version-diff-summary__toolbar">
            <p className="version-diff-summary__lead">{lead}</p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={onCopyComparison}
              disabled={isCopying}
            >
              {isCopying ? 'Copiando...' : 'Copiar comparação'}
            </button>
          </div>

          <div className="version-diff-summary__metrics" aria-label="Resumo da comparação entre versões">
            <span>
              <strong>{diff.textChangesCount}</strong>
              campos alterados
            </span>
            <span>
              <strong>{diff.totalAdded}</strong>
              itens adicionados
            </span>
            <span>
              <strong>{diff.totalRemoved}</strong>
              itens removidos
            </span>
            <span>
              <strong>{diff.acceptanceCriteria.unchangedCount}</strong>
              critérios mantidos
            </span>
          </div>

          <div className="version-diff-summary__chips">
            {diff.fieldChanges.map((field) => (
              <span
                key={field.key}
                className={`version-diff-summary__chip ${field.changed ? 'version-diff-summary__chip--changed' : ''}`}
              >
                {field.label} {field.changed ? 'alterado' : 'mantido'}
              </span>
            ))}
          </div>

          <div className="version-diff-summary__grid">
            <DiffList
              title="Critérios adicionados"
              items={diff.acceptanceCriteria.added}
              emptyText="Nenhum critério novo nesta versão."
              tone="positive"
            />

            <DiffList
              title="Critérios removidos"
              items={diff.acceptanceCriteria.removed}
              emptyText="Nenhum critério foi removido."
              tone="muted"
            />

            <DiffList
              title="Regras adicionadas"
              items={diff.businessRules.added}
              emptyText="Nenhuma regra nova nesta versão."
              tone="positive"
            />

            <DiffList
              title="QA e trincas adicionados"
              items={[...diff.qaChecklist.added, ...diff.gaps.added]}
              emptyText="Nenhum novo item de QA ou ponto de atenção."
              tone="neutral"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default VersionDiffSummary
