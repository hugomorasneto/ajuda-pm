import { Link } from 'react-router-dom'
import LearningGuideCard from '../learning/LearningGuideCard'

function LearningTeaser({ content, guides }) {
  return (
    <section className="landing-section landing-learning-teaser" id="aprender">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-learning-teaser__grid">
        {guides.map((guide) => (
          <LearningGuideCard key={guide.slug} guide={guide} variant="landing" />
        ))}
      </div>

      <div className="landing-learning-teaser__footer">
        <p>{content.footer}</p>
        <Link className="landing-button forge-button forge-button--metal" to="/aprender">
          Ver trilha completa →
        </Link>
      </div>
    </section>
  )
}

export default LearningTeaser
