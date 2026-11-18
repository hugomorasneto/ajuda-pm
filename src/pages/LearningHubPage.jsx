import { Trans } from 'react-i18next'
import Link from '../i18n/LocalizedLink'
import { useCopy, useLanguage } from '../i18n/context'
import { getLearningMetadata } from '../i18n/learningMetadata'
import { useLearningCatalog } from '../hooks/useLearningCatalog'
import LearningGuideCard from '../components/learning/LearningGuideCard'
import {
  getLearningGuideBySlug,
  getLearningGuidesBySlugs,
  getLearningNotes,
  starterGuideSlugs,
} from '../content/learningContent'
import { withAcademyGuideMedia } from '../content/academyGuideMedia'
import { useAuth } from '../hooks/useAuth'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { usePageMetadata } from '../hooks/usePageMetadata'

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrailStep({ guide, index, isDone }) {
  const stepClass = [
    'learning-path-step',
    isDone ? 'learning-path-step--completed' : 'learning-path-step--active',
  ].join(' ')

  const connectorClass = [
    'learning-path-step__connector',
    isDone ? 'learning-path-step__connector--done' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={stepClass} role="listitem">
      {index > 0 && <div className={connectorClass} aria-hidden="true" />}

      <div className="learning-path-step__dot" aria-hidden="true">
        {isDone ? (
          <CheckIcon />
        ) : (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <circle cx="4" cy="4" r="4" />
          </svg>
        )}
      </div>

      <span className="learning-path-step__num">{String(index + 1).padStart(2, '0')}</span>

      <Link to={`/aprender/${guide.slug}`} className="learning-path-step__title">
        {guide.category}
      </Link>
    </div>
  )
}

function LearningHubPage({ route }) {
  const t = useCopy('learning')
  const { language } = useLanguage()
  const catalog = useLearningCatalog()
  const { user } = useAuth()
  const { isCompleted, isLoading } = useLearningProgress()
  const academyModules = withAcademyGuideMedia(getLearningGuidesBySlugs(starterGuideSlugs, catalog))
  const learningNotes = getLearningNotes(catalog)
  const completedCount = starterGuideSlugs.filter(isCompleted).length
  const totalCount = starterGuideSlugs.length
  const progressPercent = (completedCount / totalCount) * 100

  usePageMetadata(getLearningMetadata(route, language, catalog))

  return (
    <div className="page learning-page learning-hub">

      {/* ── Hero ── */}
      <section className="learning-hub-hero">
        <div className="learning-hub-hero__copy">
          <span className="badge-pill badge-pill--academy">{t('title')}</span>
          <h1>{t('title')}</h1>
          <p>{t('intro')}</p>
          <div className="learning-hub-hero__actions">
            <Link className="landing-button landing-button--primary" to="/aprender/fundamentos-produto-agil">{t('start')}</Link>
            <a className="landing-button landing-button--secondary" href="#modulos">{t('modulesLink')}</a>
          </div>
          <p className="learning-hub-hero__microcopy">{t('details', { total: totalCount })}</p>
        </div>
      </section>

      {/* ── Trilha visual ── */}
      <section className="learning-path-section">
        <div className="learning-section__intro">
          <span className="badge-pill badge-pill--academy">{t('pathBadge')}</span>
          <h2>{t('pathTitle')}</h2>
          <p>{t('pathIntro')}</p>
        </div>

        {/* Barra de progresso — só para usuários logados */}
        {user && !isLoading && (
          <div className="learning-trail-progress">
            <div className="learning-trail-progress__header">
              <span className="learning-trail-progress__label">
                {completedCount === 0
                  ? t('emptyProgress')
                  : completedCount === totalCount
                  ? t('fullProgress')
                  : t('progress', { completed: completedCount, total: totalCount })}
              </span>
              <span className="learning-trail-progress__fraction">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="learning-trail-progress__bar" role="progressbar" aria-label={t('progressLabel')} aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={totalCount}>
              <div
                className="learning-trail-progress__fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="learning-path-trail" role="list" aria-label={t('pathLabel')}>
          {academyModules.map((guide, i) => (
            <TrailStep
              key={guide.slug}
              guide={guide}
              index={i}
              isDone={isCompleted(guide.slug)}
            />
          ))}
        </div>
      </section>

      {/* ── Aprenda enquanto faz ── */}
      <section className="learning-section" id="modulos">
        <div className="learning-section__intro">
          <span className="badge-pill">{t('moduleBadge')}</span>
          <h2>{t('moduleTitle')}</h2>
          <p>{t('moduleIntro')}</p>
        </div>

        <div className="learning-guide-grid learning-guide-grid--featured">
          {academyModules.map((guide) => (
            <LearningGuideCard
              key={guide.slug}
              guide={guide}
              variant="featured"
              isCompleted={isCompleted(guide.slug)}
            />
          ))}
        </div>
      </section>

      {/* ── Aprenda e Aplique ── */}
      <section className="learn-apply-block" aria-labelledby="learn-apply-title">
        <div className="learn-apply-block__copy">
          <span className="badge-pill badge-pill--academy">{t('applyBadge')}</span>
          <h2 id="learn-apply-title">{t('applyTitle')}</h2>
          <p>{t('applyIntro')}</p>
          <Link
            className="landing-button landing-button--primary"
            to={user ? '/tool' : '/signup'}
          >
            {user ? t('applyArrow') : t('signUp')}
          </Link>
        </div>

        <div className="learn-apply-block__preview">
          <div className="learn-apply-block__panel learn-apply-block__panel--concept">
            <p className="learn-apply-block__panel-label">{t('concept')}</p>
            <p className="learn-apply-block__panel-text"><Trans t={t} i18nKey="conceptBody" /></p>
            <p className="learn-apply-block__panel-example">{t('conceptExample')}</p>
          </div>

          <div className="learn-apply-block__panel learn-apply-block__panel--output">
            <p className="learn-apply-block__panel-label">{t('practiceExample')}</p>
            <p className="learn-apply-block__panel-story"><Trans t={t} i18nKey="exampleStory" /></p>
            <div className="learn-apply-block__criteria">
              <p>{t('exampleCriteria')}</p>
              <ol>
                <li>{t('exampleCriteriaBlock')}</li>
                <li>{t('exampleCriteriaMessage')}</li>
                <li>{t('exampleCriteriaLog')}</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── Notas rápidas ── */}
      <section className="learning-section">
        <div className="learning-section__intro">
          <span className="badge-pill">{t('quickNotes')}</span>
          <h2>{t('quickTitle')}</h2>
          <p>{t('quickIntro')}</p>
        </div>

        <ul className="quick-notes-strip" role="list">
          {learningNotes.map((note) => {
            const targetGuide = getLearningGuideBySlug(note.targetGuideSlug, catalog)
            return (
              <li key={note.slug} className="quick-note-item">
                <span className="quick-note-item__tag">{note.tag}</span>
                <span className="quick-note-item__title">{note.title}</span>
                {targetGuide ? (
                  <Link
                    to={`/aprender/${targetGuide.slug}`}
                    className="quick-note-item__link"
                    aria-label={t('quickReadTitle', { title: targetGuide.title })}
                  >
                    {t('quickRead')}
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── CTA final ── */}
      <section className="learning-final-cta">
        <div className="learning-final-cta__copy">
          <span className="badge-pill badge-pill--academy">{t('readyBadge')}</span>
          <h2>{t('readyTitle')}</h2>
          <p>{t('readyIntro')}</p>
        </div>

        <div className="learning-final-cta__actions">
          <Link
            className="landing-button landing-button--primary"
            to={user ? '/tool' : '/signup'}
          >
            {user ? t('apply') : t('signUp')}
          </Link>
          <Link className="landing-button landing-button--secondary" to="/">{t('backHome')}</Link>
        </div>
      </section>
    </div>
  )
}

export default LearningHubPage
