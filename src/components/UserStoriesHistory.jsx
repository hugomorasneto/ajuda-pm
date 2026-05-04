function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const timeLabel = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  return `${dateLabel} as ${timeLabel}`
}

function UserStoriesHistory({
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
    <section className="panel history-panel">
      <div className="panel-header panel-header-row">
        <h2>Peças forjadas recentes</h2>
        <div className="history-controls">
          <select
            className="history-filter"
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value)}
            aria-label="Filtrar peças forjadas"
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
        <p className="history-status">Nenhuma peça forjada ainda.</p>
      ) : null}

      <div className="history-list">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`history-item ${selectedId === item.id ? 'history-item-active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <p className="history-title">{item.title}</p>
            <p className="history-meta">
              V{item.version_number ?? 1} - {formatDateTime(item.created_at)}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}

export default UserStoriesHistory
