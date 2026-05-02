import { Link } from 'react-router-dom'

function LearningGuideCard({ guide, variant = 'default' }) {
  return (
    <article className={`learning-card learning-card--${variant}`}>
      <div className="learning-card__meta">
        <span>{guide.category}</span>
        <span>{guide.readingTime}</span>
      </div>

      <div className="learning-card__body">
        <h3>{guide.title}</h3>
        <p>{guide.excerpt}</p>
      </div>

      <div className="learning-card__footer">
        <span className="learning-card__level">{guide.level}</span>
        <div className="learning-card__actions">
          <Link to={`/aprender/${guide.slug}`} className="learning-card__action-read">
            Ler guia
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
