import ExportActionsBar from './ExportActionsBar'
import { getResolvedQualityScore, getScoreMeta } from './qualityScoreUtils'

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

const scoreCriteria = [
  'Clareza',
  'Valor',
  'User story estruturada',
  'Critérios de aceite',
  'Testabilidade',
  'Exceções e regras',
  'Gaps e trincas',
  'Prontidão para refinamento',
]

function ScoreCriteriaDetails() {
  return (
    <details className="quality-score-explainer">
      <summary className="quality-score-explainer__summary">
        <span className="quality-score-explainer__eyebrow">Critérios avaliados</span>
        <strong>Como este score é calculado?</strong>
      </summary>

      <div className="quality-score-explainer__body">
        <p>
          A nota considera sinais estruturais da story, como objetivo, formato da user story,
          critérios de aceite observáveis e checklist de QA. Ela serve como apoio ao refinamento,
          não como julgamento absoluto.
        </p>

        <ul className="quality-score-explainer__list" aria-label="Critérios avaliados no score">
          {scoreCriteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>

        <p className="quality-score-explainer__note">
          Referências: INVEST, Definition of Ready básica e QA/checklist de validação.
        </p>
      </div>
    </details>
  )
}

function buildInspectionSummary(story) {
  return {
    panelStatus: story ? 'Resumo da peça' : 'Aguardando primeira versão',
  }
}

function QualityPanel({
  story,
  isPremium,
  effectiveForgeLimit,
  remainingGenerations,
  hasReachedLimit,
  onCopyPlain,
  onRequestRefine,
  onShowAllAlerts,
  plainCopyMessage,
  isCopyingPlain,
  canRefine = false,
}) {
  const inspectionSummary = buildInspectionSummary(story)
  const hasUnlimitedAccess = effectiveForgeLimit === null
  const score = story ? getResolvedQualityScore(story) : 0
  const scoreMeta = getScoreMeta(score)
  const gaps = Array.isArray(story?.gaps) ? story.gaps.filter(Boolean) : []
  const qaChecklist = Array.isArray(story?.qa_checklist) ? story.qa_checklist.filter(Boolean) : []
  const alertasPrincipais = gaps.slice(0, 2)
  const hasCriticalAlerts = Boolean(alertasPrincipais[0])
  const haMaisAlertas = gaps.length > 2

  return (
    <aside className={`panel quality-panel ${!story ? 'quality-panel--empty' : ''}`}>
      <div className="quality-panel__panel-header">
        <div className="quality-panel__panel-copy">
          <p className="quality-panel__panel-eyebrow">Resumo</p>
          <h2>Inspeção executiva</h2>
          <p>Qualidade, alertas e próxima ação.</p>
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
                  <p className="quality-score__eyebrow">Qualidade da peça</p>
                  <h3 className="quality-score__tone">-</h3>
                </div>
                <strong className="quality-score__value">
                  --<span className="quality-score__denominator">/100</span>
                </strong>
              </div>
              <div className="quality-score__bar" aria-hidden="true">
                <span className="quality-score__bar-fill" style={{ width: '0%' }} />
              </div>
              <p className="quality-score__note">Disponível após a primeira versão.</p>
            </section>

            <RailSection
              icon={<IconAlertTriangle />}
              label="Trincas"
              description="Gaps, ambiguidades e pontos frágeis da story."
              placeholder
            >
              <p className="quality-panel__empty-note">
                As trincas da story aparecem depois da primeira versão.
              </p>
            </RailSection>

            <RailSection
              icon={<IconClipboard />}
              label="Teste de resistência"
              description="Checklist de QA e cenários de validação."
              placeholder
            >
              <p className="quality-panel__empty-note">
                Os testes aparecem quando a story estiver pronta para inspeção.
              </p>
            </RailSection>

            <RailSection
              icon={<IconDownload />}
              label="Entregar artefato"
              description="Copie quando a peça estiver pronta."
              placeholder
            >
              <p className="quality-panel__empty-note">
                A entrega fica disponível após a primeira versão.
              </p>
            </RailSection>
          </>
        ) : (
          <>
            <section className={`quality-panel__executive-score ${scoreMeta.toneClass}`}>
              <p className="quality-panel__summary-label">Qualidade</p>
              <strong>{scoreMeta.label} · {score}/100</strong>
              <span>{scoreMeta.note}</span>
            </section>

            <div className="quality-panel__summary-grid">
              <div className={`quality-panel__summary-card ${hasCriticalAlerts ? 'quality-panel__summary-card--warning' : 'quality-panel__summary-card--success'}`}>
                <span className="quality-panel__summary-label">Alertas</span>
                <strong>{hasCriticalAlerts ? `${gaps.length} pontos` : 'Sem bloqueios críticos'}</strong>
                <span className="quality-panel__summary-note">
                  {hasCriticalAlerts ? 'Revise antes de encaminhar ao backlog.' : 'A peça está clara para refinamento.'}
                </span>
              </div>

              <div className="quality-panel__summary-card quality-panel__summary-card--tech">
                <span className="quality-panel__summary-label">QA</span>
                <strong>{qaChecklist.length > 0 ? `${qaChecklist.length} itens recolhidos` : 'Sem checklist'}</strong>
                <span className="quality-panel__summary-note">
                  {qaChecklist.length > 0 ? 'Checklist recolhido no artefato.' : 'Refine se precisar de cenários de teste.'}
                </span>
              </div>
            </div>

            <RailSection
              icon={<IconClipboard />}
              label="Próxima ação"
              description="Use o artefato ou refine os pontos abertos."
            >
              <div className="quality-panel__quick-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={onCopyPlain}
                  disabled={!story || isCopyingPlain}
                >
                  {isCopyingPlain ? 'Copiando...' : 'Copiar artefato'}
                </button>
                {canRefine ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={onRequestRefine}
                    disabled={!story}
                  >
                    Refinar story
                  </button>
                ) : null}
              </div>
              {plainCopyMessage ? <p className="copy-message">{plainCopyMessage}</p> : null}
            </RailSection>

            <RailSection
              icon={<IconAlertTriangle />}
              label={hasCriticalAlerts ? 'Principais alertas' : 'Sem bloqueios críticos'}
              description={hasCriticalAlerts ? 'Até 2 pontos prioritários.' : 'A inspeção não encontrou trincas críticas.'}
            >
              {hasCriticalAlerts ? (
                <>
                  <ul className="quality-panel__list quality-panel__list--compact">
                    {alertasPrincipais.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                  {haMaisAlertas ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small quality-panel__inline-action"
                      onClick={onShowAllAlerts}
                    >
                      Ver todos
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="quality-panel__empty-note">Siga para revisão final, cópia ou refino se quiser ajustar o tom.</p>
              )}
            </RailSection>

            <details className="quality-panel__detail">
              <summary>
                <span>Mais formatos e critérios</span>
              </summary>
              <div className="quality-panel__detail-body">
                <ScoreCriteriaDetails />
                <RailSection
                  icon={<IconDownload />}
                  label="Formatos de cópia"
                  description="Opções adicionais preservadas para o fluxo atual."
                >
                  <ExportActionsBar
                    story={story}
                    onCopyPlain={onCopyPlain}
                    plainCopyMessage={plainCopyMessage}
                    isCopyingPlain={isCopyingPlain}
                  />
                </RailSection>
              </div>
            </details>

            <div
              className={`quality-panel__usage-pill ${
                hasReachedLimit ? 'quality-panel__usage-pill--warning' : ''
              }`}
            >
              <span className="quality-panel__plan-label">{isPremium ? 'Pro' : 'Free'}</span>
              <span className="quality-panel__plan-count">
                {hasUnlimitedAccess
                  ? 'Plano Pro ativo'
                  : hasReachedLimit
                  ? 'Limite atingido - Faça upgrade'
                    : `${remainingGenerations} ${
                        remainingGenerations === 1 ? 'geração restante' : 'gerações restantes'
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
