import { formatDateTime } from '../../hooks/useUserStoryWorkspace'
import { normalizeVersionList } from '../../utils/storyVersionUtils'

function VersionTimeline({ versions, selectedId, isLoading, onSelect }) {
  return (
    <section className="panel version-timeline">
      <div className="panel-header panel-header-row">
        <div>
          <p className="version-timeline__eyebrow">Versões</p>
          <h2>Linha do tempo da peça ativa</h2>
          <p>Selecione uma versão salva para comparar evolução, acabamento e critérios.</p>
        </div>

        <div className="version-timeline__meta-group">
          <span className="version-timeline__count">
            {versions.length} {versions.length === 1 ? 'versão' : 'versões'}
          </span>
          {isLoading ? <p className="result-inline-status">Buscando versões...</p> : null}
        </div>
      </div>

      {!isLoading && versions.length === 0 ? (
        <p className="history-status">A primeira versão aparece aqui depois da primeira geração.</p>
      ) : null}

      <div className="version-timeline__list">
        {versions.map((version, index) => {
          const isActive = version.id === selectedId
          const criteriaCount = normalizeVersionList(version.acceptance_criteria).length
          const qaCount = normalizeVersionList(version.qa_checklist).length
          const gapCount = normalizeVersionList(version.gaps).length

          return (
            <button
              type="button"
              key={version.id}
              className={`version-timeline__item ${isActive ? 'version-timeline__item--active' : ''}`}
              onClick={() => onSelect(version.id)}
            >
              <span className="version-timeline__line" aria-hidden="true" />
              <div className="version-timeline__dot" aria-hidden="true" />

              <div className="version-timeline__content">
                <div className="version-timeline__header">
                  <p className="version-timeline__title">
                    V{version.version_number ?? '?'} · {version.title}
                  </p>
                  <span className={`version-timeline__badge ${isActive ? 'version-timeline__badge--active' : ''}`}>
                    {isActive ? 'Versão ativa' : `V${version.version_number ?? index + 1}`}
                  </span>
                </div>

                <p className="version-timeline__meta">{formatDateTime(version.created_at)}</p>

                <div className="version-timeline__metrics" aria-label="Resumo da versão">
                  <span>{criteriaCount} {criteriaCount === 1 ? 'critério' : 'critérios'}</span>
                  <span>{qaCount} {qaCount === 1 ? 'item de QA' : 'itens de QA'}</span>
                  <span>{gapCount} {gapCount === 1 ? 'trinca' : 'trincas'}</span>
                </div>

                {version.regeneration_instruction ? (
                  <p className="version-timeline__instruction">
                    Acabamento aplicado: {version.regeneration_instruction}
                  </p>
                ) : (
                  <p className="version-timeline__instruction">Primeira estrutura salva para esta peça.</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default VersionTimeline
