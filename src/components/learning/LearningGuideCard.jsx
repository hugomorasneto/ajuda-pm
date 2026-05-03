import { useState } from 'react'
import { Link } from 'react-router-dom'

function LearningGuideCard({ guide, variant = 'default', isCompleted = false }) {
  const [isThumbnailUnavailable, setIsThumbnailUnavailable] = useState(false)
  const hasLandingThumbnail = variant === 'landing' && Boolean(guide.thumbnailSrc)

  return (
    <article className={`learning-card learning-card--${variant}${isCompleted ? ' learning-card--completed' : ''}`}>
      {hasLandingThumbnail ? (
        <div className="learning-card__media">
          {isThumbnailUnavailable ? (
            <div
              className="learning-card__image-fallback"
              role="img"
              aria-label={guide.thumbnailAlt ?? `Capa do guia ${guide.title}`}
            >
              <span className="learning-card__image-badge">Academia ProdForge</span>
              <strong>{guide.category}</strong>
            </div>
          ) : (
            <img
              className="learning-card__image"
              src={guide.thumbnailSrc}
              alt={guide.thumbnailAlt ?? `Capa do guia ${guide.title}`}
              loading="lazy"
              decoding="async"
              onError={() => setIsThumbnailUnavailable(true)}
            />
          )}
        </div>
      ) : null}

      <div className="learning-card__meta">
        <span>{guide.category}</span>
        <span>{guide.readingTime}</span>
        {isCompleted && (
          <span className="learning-card__done-badge" aria-label="Módulo concluído">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Concluído
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
            {isCompleted ? 'Reler guia' : 'Ler guia'}
          </Link>
          <Link to="/signup" className="learning-card__action-practice">
            Praticar →
          </Link>
        </div>
      </div>
    </article>
  )
}

export default LearningGuideCard
