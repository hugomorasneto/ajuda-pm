import { formatDateTime } from '../../hooks/useUserStoryWorkspace'

function VersionTimeline({ versions, selectedId, isLoading, onSelect }) {
  return (
    <section className="panel version-timeline">
      <div className="panel-header panel-header-row">
        <div>
          <p className="version-timeline__eyebrow">Versões</p>
          <h2>Linha do tempo da mesma base</h2>
          <p>Selecione uma versão salva para comparar evolução, ajustes e critérios.</p>
        </div>
        {isLoading ? <p className="result-inline-status">Carregando versões...</p> : null}
      </div>

      <div className="version-timeline__list">
        {versions.map((version, index) => {
          const isActive = version.id === selectedId

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

                {version.regeneration_instruction ? (
                  <p className="version-timeline__instruction">
                    Ajuste: {version.regeneration_instruction}
                  </p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default VersionTimeline
