import { formatDateTime } from '../../hooks/useUserStoryWorkspace'

function RecentStoriesPanel({
  items,
  selectedId,
  isLoading,
  onSelect,
  loadErrorMessage,
  reloadRecent,
  filterValue,
  onFilterChange,
}) {
  return (
    <section className="panel recent-stories-panel">
      <div className="panel-header panel-header-row">
        <div className="recent-stories-panel__header-copy">
          <p className="recent-stories-panel__eyebrow">Peças forjadas</p>
          <h2>Peças recentes</h2>
          <p>Acesse stories salvas sem perder a inspeção da peça atual.</p>
        </div>

        <div className="history-controls">
          <span className="recent-stories-panel__count">
            {items.length} {items.length === 1 ? 'peça' : 'peças'}
          </span>
          <select
            className="history-filter"
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value)}
            aria-label="Filtrar peças forjadas recentes"
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="all">Tudo</option>
          </select>
          <button type="button" className="btn btn-ghost btn-small" onClick={reloadRecent}>
            Atualizar
          </button>
        </div>
      </div>

      {isLoading ? <p className="history-status">Buscando peças forjadas...</p> : null}
      {loadErrorMessage ? <p className="history-status history-status-error">{loadErrorMessage}</p> : null}

      {!isLoading && items.length === 0 ? (
        <p className="history-status">
          Nenhuma peça forjada ainda. Gere sua primeira story para iniciar a Bancada.
        </p>
      ) : null}

      <div className="recent-stories-panel__list">
        {items.map((item) => {
          const contextPreview = item.input_context?.trim() || item.input_requirements?.trim() || ''
          const isActive = selectedId === item.id

          return (
            <button
              type="button"
              key={item.id}
              className={`recent-story-card ${isActive ? 'recent-story-card--active' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <div className="recent-story-card__top">
                <p className="recent-story-card__title">{item.title}</p>
                <span className={`recent-story-card__badge ${isActive ? 'recent-story-card__badge--active' : ''}`}>
                  {isActive ? 'Em inspeção' : `V${item.version_number ?? 1}`}
                </span>
              </div>

              {contextPreview ? <p className="recent-story-card__preview">{contextPreview}</p> : null}

              <div className="recent-story-card__meta">
                <span>{formatDateTime(item.created_at)}</span>
                <span>Abrir peça</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default RecentStoriesPanel
