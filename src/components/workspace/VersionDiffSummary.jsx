import { useCopy, useLanguage } from '../../i18n/context'
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
  const t = useCopy('history')
  const storyFormat = useCopy('storyFormat')
  const { language } = useLanguage()
  const formatNumber = new Intl.NumberFormat(language).format
  const diff = buildVersionDiff(previousVersion, currentVersion, storyFormat)
  const lead = getVersionDiffLead(diff, storyFormat)

  return (
    <section className="panel version-diff-summary">
      <div className="panel-header">
        <p className="version-diff-summary__eyebrow">{t('comparison')}</p>
        <h2>{t('refinement_summary')}</h2>
        <p>
          {previousVersion
            ? t('differences_between_the_active_version_and', { p1: diff?.previousLabel ?? t('the_previous_version') })
            : t('the_artifact_s_first_version_has')}
        </p>
      </div>

      {!previousVersion || !diff ? (
        <p className="history-status">{t('generate_a_new_version_to_compare_2')}</p>
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
              {isCopying ? t('copying') : t('copy_comparison')}
            </button>
          </div>

          <div className="version-diff-summary__metrics" aria-label={t('version_comparison_summary')}>
            {[
              ['fields_changed', diff.textChangesCount],
              ['items_added', diff.totalAdded],
              ['items_removed', diff.totalRemoved],
              ['criteria_kept', diff.acceptanceCriteria.unchangedCount],
            ].map(([key, count]) => (
              <span key={key}>
                <strong>{formatNumber(count)}</strong>
                {t(key, { count })}
              </span>
            ))}
          </div>

          <div className="version-diff-summary__chips">
            {diff.fieldChanges.map((field) => (
              <span
                key={field.key}
                className={`version-diff-summary__chip ${field.changed ? 'version-diff-summary__chip--changed' : ''}`}
              >
                {t(field.changed ? 'field_changed' : 'field_unchanged', { field: field.label })}
              </span>
            ))}
          </div>

          <div className="version-diff-summary__grid">
            <DiffList
              title={t('criteria_added')}
              items={diff.acceptanceCriteria.added}
              emptyText={t('this_version_adds_no_new_criteria')}
              tone="positive"
            />

            <DiffList
              title={t('criteria_removed')}
              items={diff.acceptanceCriteria.removed}
              emptyText={t('no_criteria_removed')}
              tone="muted"
            />

            <DiffList
              title={t('rules_added')}
              items={diff.businessRules.added}
              emptyText={t('this_version_adds_no_new_rules')}
              tone="positive"
            />

            <DiffList
              title={t('qa_items_and_gaps_added')}
              items={[...diff.qaChecklist.added, ...diff.gaps.added]}
              emptyText={t('no_new_qa_items_or_points')}
              tone="neutral"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default VersionDiffSummary
