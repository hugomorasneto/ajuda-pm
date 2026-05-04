import RecentStoriesPanel from './RecentStoriesPanel'
import VersionDiffSummary from './VersionDiffSummary'
import VersionTimeline from './VersionTimeline'

function IconChevron({ isCollapsed }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isCollapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  )
}

function SummaryCard({ label, value, note }) {
  return (
    <div className="workspace-history-panel__summary-card">
      <span className="workspace-history-panel__summary-label">{label}</span>
      <strong>{value}</strong>
      <span className="workspace-history-panel__summary-note">{note}</span>
    </div>
  )
}

function getFilterLabel(filterValue) {
  if (filterValue === 'today') return 'Hoje'
  if (filterValue === '7d') return '7 dias'
  return 'Tudo'
}

function getHistoryStatus({ isLoadingRecent, isLoadingVersions, loadErrorMessage, itemCount, isEditing }) {
  if (loadErrorMessage) return 'Atenção'
  if (isLoadingRecent || isLoadingVersions) return 'Atualizando'
  if (itemCount === 0) return 'Vazio'
  return isEditing ? 'Peça ativa' : 'Pronto'
}

function HistoryDrawerPanel({
  items,
  selectedId,
  isLoadingRecent,
  onSelectHistory,
  loadErrorMessage,
  reloadRecent,
  filterValue,
  onFilterChange,
  isEditing,
  versions,
  isLoadingVersions,
  onSelectVersion,
  selectedVersion,
  previousVersion,
  activeStoryTitle,
  isCollapsed = false,
  canCollapse = false,
  onToggleCollapse,
}) {
  const safeItems = Array.isArray(items) ? items : []
  const activeItem = safeItems.find((item) => item.id === selectedId)
  const activeTitle = activeStoryTitle || activeItem?.title || 'Nenhuma peça ativa'
  const activeSummaryNote = selectedId
    ? 'Peça carregada para inspeção'
    : isEditing
      ? 'Peça ativa carregada'
      : 'Abra uma peça salva quando quiser comparar'
  const versionsCount = Array.isArray(versions) ? versions.length : 0
  const historyStatus = getHistoryStatus({
    isLoadingRecent,
    isLoadingVersions,
    loadErrorMessage,
    itemCount: safeItems.length,
    isEditing,
  })

  return (
    <section
      className={`panel workspace-history-panel ${isCollapsed ? 'workspace-history-panel--collapsed' : ''}`}
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <div className="workspace-history-panel__header">
        <div className="workspace-history-panel__copy">
          <p className="workspace-history-panel__eyebrow">Peças forjadas</p>
          <h2>Peças forjadas</h2>
          <p>Peças recentes, versões e comparação da peça ativa no mesmo painel lateral.</p>
        </div>

        <div className="workspace-history-panel__actions">
          <span className="workspace-history-panel__pill">
            {safeItems.length} {safeItems.length === 1 ? 'peça' : 'peças'}
          </span>
          {canCollapse ? (
            <button
              type="button"
              className="btn btn-ghost btn-small workspace-history-panel__collapse-btn"
              onClick={onToggleCollapse}
              aria-expanded={!isCollapsed}
            >
              <IconChevron isCollapsed={isCollapsed} />
              {isCollapsed ? 'Expandir' : 'Recolher'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="workspace-history-panel__collapsed-summary" hidden={!isCollapsed}>
        <div className="workspace-history-panel__summary-grid">
          <SummaryCard label="Peça ativa" value={activeTitle} note={activeSummaryNote} />
          <SummaryCard
            label="Filtro"
            value={getFilterLabel(filterValue)}
            note={safeItems.length === 0 ? 'Nenhum resultado no recorte atual' : 'Recorte aplicado'}
          />
          <SummaryCard
            label="Versões"
            value={versionsCount}
            note={isEditing ? 'Timeline disponível' : 'Sem peça ativa para comparar'}
          />
          <SummaryCard
            label="Estado"
            value={historyStatus}
            note={loadErrorMessage || (isLoadingRecent ? 'Sincronizando peças recentes' : 'Abrir quando quiser explorar')}
          />
        </div>
      </div>

      <div className="workspace-history-panel__body" hidden={isCollapsed}>
        <RecentStoriesPanel
          items={safeItems}
          selectedId={selectedId}
          isLoading={isLoadingRecent}
          onSelect={onSelectHistory}
          loadErrorMessage={loadErrorMessage}
          reloadRecent={reloadRecent}
          filterValue={filterValue}
          onFilterChange={onFilterChange}
        />

        {isEditing ? (
          <div className="story-workspace__versions-stack workspace-history-panel__versions">
            <VersionTimeline
              versions={versions}
              selectedId={selectedId}
              isLoading={isLoadingVersions}
              onSelect={onSelectVersion}
            />
            <VersionDiffSummary
              currentVersion={selectedVersion}
              previousVersion={previousVersion}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default HistoryDrawerPanel
