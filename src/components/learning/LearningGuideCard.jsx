import { useCopy } from '../../i18n/context'
import { useState } from 'react'
import Link from '../../i18n/LocalizedLink'

function LearningGuideCard({ guide, variant = 'default', isCompleted = false }) {
  const t = useCopy('learningTeaser')
  const [isThumbnailUnavailable, setIsThumbnailUnavailable] = useState(false)
  const [thumbnailAttemptIndex, setThumbnailAttemptIndex] = useState(0)
  const hasThumbnail = Boolean(guide.thumbnailSrc)
  const thumbnailSrcCandidates = hasThumbnail
    ? guide.thumbnailSrcCandidates?.filter(Boolean) ?? [guide.thumbnailSrc]
    : []
  const activeThumbnailSrc = thumbnailSrcCandidates[thumbnailAttemptIndex] ?? guide.thumbnailSrc

  const handleThumbnailError = () => {
    const hasAnotherCandidate = thumbnailAttemptIndex < thumbnailSrcCandidates.length - 1

    if (hasAnotherCandidate) {
      setThumbnailAttemptIndex((currentIndex) => currentIndex + 1)
      return
    }

    setIsThumbnailUnavailable(true)
  }

  return (
    <article className={`learning-card learning-card--${variant}${isCompleted ? ' learning-card--completed' : ''}`}>
      {hasThumbnail ? (
        <div className="learning-card__media">
          {isThumbnailUnavailable ? (
            <div
              className="learning-card__image-fallback"
              role="img"
              aria-label={guide.thumbnailAlt ?? t('cover', { title: guide.title })}
            >
              <span className="learning-card__image-badge">{t('trainingGround')}</span>
              <strong>{guide.category}</strong>
            </div>
          ) : (
            <img
              className="learning-card__image"
              src={activeThumbnailSrc}
              alt={guide.thumbnailAlt ?? t('cover', { title: guide.title })}
              loading={variant === 'landing' ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={variant === 'landing' ? 'high' : undefined}
              onError={handleThumbnailError}
            />
          )}
        </div>
      ) : null}

      <div className="learning-card__meta">
        <span>{guide.category}</span>
        <span>{guide.readingTime}</span>
        {isCompleted && (
          <span className="learning-card__done-badge" aria-label={t('completedModule')}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('completed')}
          </span>
        )}
      </div>

      <div className="learning-card__body">
        <h3>{guide.title}</h3>
        <p>{guide.excerpt}</p>
      </div>

      <div className="learning-card__footer">
        <span className="learning-card__level">{guide.level}</span>
        <div className="learning-card__actions">
          <Link to={`/aprender/${guide.slug}`} className="learning-card__action-read">
            {isCompleted ? t('reread') : t('read')}
          </Link>
          <Link to="/signup" className="learning-card__action-practice">
            {t('practice')}
          </Link>
        </div>
      </div>
    </article>
  )
}

export default LearningGuideCard
