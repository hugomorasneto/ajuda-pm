import ExportActionsBar from './ExportActionsBar'
import GapList from './GapList'
import QaChecklist from './QaChecklist'
import QualityScore from './QualityScore'

function IconAlertTriangle() {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconClipboard() {
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
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}

function IconDownload() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function RailSection({ icon, label, description, children, placeholder = false }) {
  return (
    <section
      className={`quality-panel__section ${placeholder ? 'quality-panel__section--placeholder' : ''}`}
    >
      <div className="quality-panel__section-header">
        {icon ? <span className="quality-panel__section-icon">{icon}</span> : null}
        <div className="quality-panel__section-copy">
          <h3 className="quality-panel__section-label">{label}</h3>
          {description ? <p className="quality-panel__section-description">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function buildInspectionSummary(story) {
  return {
    panelStatus: story ? 'Story pronta' : 'Aguardando story',
  }
}

function QualityPanel({
  story,
  isPremium,
  remainingGenerations,
  hasReachedLimit,
  onCopyPlain,
  plainCopyMessage,
  isCopyingPlain,
}) {
  const inspectionSummary = buildInspectionSummary(story)

  return (
    <aside className={`panel quality-panel ${!story ? 'quality-panel--empty' : ''}`}>
      <div className="quality-panel__panel-header">
        <div className="quality-panel__panel-copy">
          <p className="quality-panel__panel-eyebrow">Inspecao</p>
          <h2>Revisao e entrega</h2>
          <p>Score, gaps, QA e exportacao no mesmo trilho de revisao.</p>
        </div>

        <div className="quality-panel__panel-actions">
          <span className="quality-panel__panel-pill">{inspectionSummary.panelStatus}</span>
        </div>
      </div>

      <div className="quality-panel__body">
        {!story ? (
          <>
            <section className="quality-score quality-score--placeholder">
              <div className="quality-score__header">
                <div>
                  <p className="quality-score__eyebrow">Qualidade</p>
                  <h3 className="quality-score__tone">-</h3>
                </div>
                <strong className="quality-score__value">
                  --<span className="quality-score__denominator">/100</span>
                </strong>
              </div>
              <div className="quality-score__bar" aria-hidden="true">
                <span className="quality-score__bar-fill" style={{ width: '0%' }} />
              </div>
              <p className="quality-score__note">Disponivel apos a geracao.</p>
            </section>

            <RailSection
              icon={<IconAlertTriangle />}
              label="Gaps"
              description="Ambiguidades e excecoes aparecem aqui."
              placeholder
            >
              <p className="quality-panel__empty-note">
                O painel de gaps sera preenchido depois da primeira geracao.
              </p>
            </RailSection>

            <RailSection
              icon={<IconClipboard />}
              label="QA"
              description="Checklist de validacao da story."
              placeholder
            >
              <p className="quality-panel__empty-note">
                Os cenarios de validacao aparecerao quando a story estiver pronta.
              </p>
            </RailSection>

            <RailSection
              icon={<IconDownload />}
              label="Exportar"
              description="Copie em Markdown, Jira ou texto."
              placeholder
            >
              <p className="quality-panel__empty-note">
                As acoes de exportacao ficam disponiveis apos a geracao.
              </p>
            </RailSection>
          </>
        ) : (
          <>
            <QualityScore story={story} />

            <RailSection
              icon={<IconAlertTriangle />}
              label="Gaps"
              description="Pontos que ainda pedem decisao antes do refinamento."
            >
              <GapList items={story.gaps} />
            </RailSection>

            <RailSection
              icon={<IconClipboard />}
              label="QA"
              description="Checklist minimo para validar a entrega."
            >
              <QaChecklist items={story.qa_checklist} />
            </RailSection>

            <RailSection
              icon={<IconDownload />}
              label="Exportar"
              description="Leve a story para backlog, Jira ou compartilhamento rapido."
            >
              <ExportActionsBar
                story={story}
                onCopyPlain={onCopyPlain}
                plainCopyMessage={plainCopyMessage}
                isCopyingPlain={isCopyingPlain}
              />
            </RailSection>

            <div
              className={`quality-panel__usage-pill ${
                hasReachedLimit ? 'quality-panel__usage-pill--warning' : ''
              }`}
            >
              <span className="quality-panel__plan-label">{isPremium ? 'Pro' : 'Free'}</span>
              <span className="quality-panel__plan-count">
                {isPremium
                  ? 'Geracoes ilimitadas'
                  : hasReachedLimit
                    ? 'Limite atingido - Faca upgrade'
                    : `${remainingGenerations} ${
                        remainingGenerations === 1 ? 'geracao restante' : 'geracoes restantes'
                      }`}
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

export default QualityPanel
