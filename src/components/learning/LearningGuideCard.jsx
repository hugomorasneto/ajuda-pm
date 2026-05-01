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
        <Link to={`/aprender/${guide.slug}`}>Ler guia</Link>
      </div>
    </article>
  )
}

export default LearningGuideCard
