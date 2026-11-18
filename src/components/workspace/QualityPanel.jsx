import { useCopy } from '../../i18n/context'
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
  'clarity',
  'value',
  'structured_user_story',
  'acceptance_criteria',
  'testability',
  'exceptions_and_rules',
  'gaps_and_open_questions',
  'readiness_for_refinement',
]

function ScoreCriteriaDetails() {
  const t = useCopy('forge')
  return (
    <details className="quality-score-explainer">
      <summary className="quality-score-explainer__summary">
        <span className="quality-score-explainer__eyebrow">{t('criteria_assessed')}</span>
        <strong>{t('how_is_this_score_calculated')}</strong>
      </summary>

      <div className="quality-score-explainer__body">
        <p>{t('the_score_considers_the_story_s')}</p>

        <ul className="quality-score-explainer__list" aria-label={t('criteria_used_to_calculate_the_score')}>
          {scoreCriteria.map((criterion) => (
            <li key={criterion}>{t(criterion)}</li>
          ))}
        </ul>

        <p className="quality-score-explainer__note">{t('references_invest_a_basic_definition_of')}</p>
      </div>
    </details>
  )
}

function buildInspectionSummary(story, t) {
  return {
    panelStatus: story ? t('artifact_summary') : t('waiting_for_the_first_version'),
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
  planningShortcut = null,
  plainCopyMessage,
  isCopyingPlain,
  canRefine = false,
}) {
  const t = useCopy('forge')
  const storyFormat = useCopy('storyFormat')
  const inspectionSummary = buildInspectionSummary(story, t)
  const hasUnlimitedAccess = effectiveForgeLimit === null
  const score = story ? getResolvedQualityScore(story) : 0
  const scoreMeta = getScoreMeta(score, storyFormat)
  const gaps = Array.isArray(story?.gaps) ? story.gaps.filter(Boolean) : []
  const qaChecklist = Array.isArray(story?.qa_checklist) ? story.qa_checklist.filter(Boolean) : []
  const alertasPrincipais = gaps.slice(0, 2)
  const hasCriticalAlerts = Boolean(alertasPrincipais[0])
  const haMaisAlertas = gaps.length > 2

  return (
    <aside className={`panel quality-panel ${!story ? 'quality-panel--empty' : ''}`}>
      <div className="quality-panel__panel-header">
        <div className="quality-panel__panel-copy">
          <p className="quality-panel__panel-eyebrow">{t('summary')}</p>
          <h2>{t('inspection_overview')}</h2>
          <p>{t('quality_alerts_and_next_action')}</p>
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
                  <p className="quality-score__eyebrow">{t('artifact_quality')}</p>
                  <h3 className="quality-score__tone">-</h3>
                </div>
                <strong className="quality-score__value">
                  --<span className="quality-score__denominator">/100</span>
                </strong>
              </div>
              <div className="quality-score__bar" aria-hidden="true">
                <span className="quality-score__bar-fill" style={{ width: '0%' }} />
              </div>
              <p className="quality-score__note">{t('available_after_the_first_version')}</p>
            </section>

            <RailSection
              icon={<IconAlertTriangle />}
              label={t('gaps')}
              description={t('gaps_ambiguities_and_weak_points_in')}
              placeholder
            >
              <p className="quality-panel__empty-note">{t('story_gaps_appear_after_the_first')}</p>
            </RailSection>

            <RailSection
              icon={<IconClipboard />}
              label={t('qa_checks')}
              description={t('qa_checklist_and_validation_scenarios')}
              placeholder
            >
              <p className="quality-panel__empty-note">{t('tests_appear_when_the_story_is')}</p>
            </RailSection>

            <RailSection
              icon={<IconDownload />}
              label={t('deliver_artifact')}
              description={t('copy_when_the_artifact_is_ready')}
              placeholder
            >
              <p className="quality-panel__empty-note">{t('delivery_is_available_after_the_first')}</p>
            </RailSection>
          </>
        ) : (
          <>
            <section className={`quality-panel__executive-score ${scoreMeta.toneClass}`}>
              <p className="quality-panel__summary-label">{t('quality')}</p>
              <strong>{scoreMeta.label} · {score}/100</strong>
              <span>{scoreMeta.note}</span>
            </section>

            <div className="quality-panel__summary-grid">
              <div className={`quality-panel__summary-card ${hasCriticalAlerts ? 'quality-panel__summary-card--warning' : 'quality-panel__summary-card--success'}`}>
                <span className="quality-panel__summary-label">{t('alerts')}</span>
                <strong>{hasCriticalAlerts ? t('gaps_2', { p1: gaps.length }) : t('no_critical_blockers')}</strong>
                <span className="quality-panel__summary-note">
                  {hasCriticalAlerts ? t('review_before_sending_to_the_backlog') : t('the_artifact_is_ready_for_refinement')}
                </span>
              </div>

              <div className="quality-panel__summary-card quality-panel__summary-card--tech">
                <span className="quality-panel__summary-label">{t('qa')}</span>
                <strong>{qaChecklist.length > 0 ? t('checklist_items', { p1: qaChecklist.length }) : t('no_checklist')}</strong>
                <span className="quality-panel__summary-note">
                  {qaChecklist.length > 0 ? t('the_checklist_is_available_in_the') : t('refine_the_story_if_you_need')}
                </span>
              </div>
            </div>

            <RailSection
              icon={<IconClipboard />}
              label={t('next_action')}
              description={t('use_the_artifact_or_refine_the')}
            >
              <div className="quality-panel__quick-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={onCopyPlain}
                  disabled={!story || isCopyingPlain}
                >
                  {isCopyingPlain ? t('copying') : t('copy_artifact')}
                </button>
                {canRefine ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={onRequestRefine}
                    disabled={!story}
                  >{t('refine_story')}</button>
                ) : null}
              </div>
              {planningShortcut ? (
                <div className="quality-panel__planning-shortcut">
                  <span>{t('planning_poker')}</span>
                  <p>{planningShortcut.description}</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={planningShortcut.onClick}
                    disabled={planningShortcut.disabled || planningShortcut.isLoading}
                  >
                    {planningShortcut.isLoading ? t('preparing') : planningShortcut.buttonLabel}
                  </button>
                </div>
              ) : null}
              {plainCopyMessage ? <p className="copy-message">{plainCopyMessage}</p> : null}
            </RailSection>

            <RailSection
              icon={<IconAlertTriangle />}
              label={hasCriticalAlerts ? t('key_alerts') : t('no_critical_blockers')}
              description={hasCriticalAlerts ? t('up_to_two_priorities') : t('the_inspection_found_no_critical_gaps')}
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
                    >{t('view_all')}</button>
                  ) : null}
                </>
              ) : (
                <p className="quality-panel__empty-note">{t('review_copy_or_refine_the_story')}</p>
              )}
            </RailSection>

            <details className="quality-panel__detail">
              <summary>
                <span>{t('more_formats_and_criteria')}</span>
              </summary>
              <div className="quality-panel__detail-body">
                <ScoreCriteriaDetails />
                <RailSection
                  icon={<IconDownload />}
                  label={t('copy_formats')}
                  description={t('additional_formats_for_your_workflow')}
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
                  ? t('pro_plan_active')
                  : hasReachedLimit
                  ? t('generation_limit_reached')
                    : `${remainingGenerations} ${
                        remainingGenerations === 1 ? t('generation_remaining') : t('generations_remaining')
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
