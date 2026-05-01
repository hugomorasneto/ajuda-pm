import { Link } from 'react-router-dom'

function LearningGuideHero({ guide }) {
  return (
    <header className="learning-guide-hero">
      <div className="learning-guide-hero__top">
        <Link to="/aprender" className="learning-guide-hero__backlink">
          Voltar para Aprender
        </Link>
        <div className="learning-guide-hero__meta">
          <span>{guide.category}</span>
          <span>{guide.readingTime}</span>
          <span>{guide.level}</span>
        </div>
      </div>

      <div className="learning-guide-hero__copy">
        <p className="landing-section__eyebrow">Guia pratico</p>
        <h1>{guide.title}</h1>
        <p>{guide.excerpt}</p>
      </div>
    </header>
  )
}

export default LearningGuideHero
