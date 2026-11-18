import { useCopy, useLanguage } from '../../i18n/context'
import { formatDateTime } from '../../hooks/useUserStoryWorkspace'
import { getVersionNumberLabel, normalizeVersionList } from '../../utils/storyVersionUtils'

function VersionTimeline({ versions, selectedId, isLoading, onSelect }) {
  const t = useCopy('history')
  const { language } = useLanguage()
  const formatNumber = new Intl.NumberFormat(language).format
  return (
    <section className="panel version-timeline">
      <div className="panel-header panel-header-row">
        <div>
          <p className="version-timeline__eyebrow">{t('versions')}</p>
          <h2>{t('timeline_for_the_active_artifact')}</h2>
          <p>{t('select_a_saved_version_to_compare')}</p>
        </div>

        <div className="version-timeline__meta-group">
          <span className="version-timeline__count">
            {t('version_count', { count: versions.length, value: formatNumber(versions.length) })}
          </span>
          {isLoading ? <p className="result-inline-status">{t('loading_versions')}</p> : null}
        </div>
      </div>

      {!isLoading && versions.length === 0 ? (
        <p className="history-status">{t('the_first_version_appears_here_after')}</p>
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
              aria-pressed={isActive}
            >
              <span className="version-timeline__line" aria-hidden="true" />
              <div className="version-timeline__dot" aria-hidden="true" />

              <div className="version-timeline__content">
                <div className="version-timeline__header">
                  <p className="version-timeline__title">
                    {getVersionNumberLabel(version)} · {version.title}
                  </p>
                  <span className={`version-timeline__badge ${isActive ? 'version-timeline__badge--active' : ''}`}>
                    {isActive ? t('active_version') : getVersionNumberLabel(version, index + 1)}
                  </span>
                </div>

                <p className="version-timeline__meta">{formatDateTime(version.created_at, language)}</p>

                <div className="version-timeline__metrics" aria-label={t('version_summary')}>
                  <span>{t('criteria_count', { count: criteriaCount, value: formatNumber(criteriaCount) })}</span>
                  <span>{formatNumber(qaCount)} {qaCount === 1 ? t('qa_item') : t('qa_items')}</span>
                  <span>{formatNumber(gapCount)} {t('gap', { count: gapCount })}</span>
                </div>

                {version.regeneration_instruction ? (
                  <p className="version-timeline__instruction">{t('refinement_instructions_2')} {version.regeneration_instruction}
                  </p>
                ) : (
                  <p className="version-timeline__instruction">{t('first_saved_version_of_this_artifact')}</p>
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
