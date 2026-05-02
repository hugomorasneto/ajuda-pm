import { Link } from 'react-router-dom'

function LearningGuideHero({ guide }) {
  return (
    <header className="learning-guide-hero">
      <div className="learning-guide-hero__top">
        <Link to="/aprender" className="learning-guide-hero__backlink">
          ← Academia ProdForge
        </Link>
        <div className="learning-guide-hero__chips" aria-label="Metadados do guia">
          <span className="learning-guide-hero__chip">{guide.category}</span>
          <span className="learning-guide-hero__chip">{guide.readingTime}</span>
          <span className="learning-guide-hero__chip learning-guide-hero__chip--level">{guide.level}</span>
        </div>
      </div>

      <div className="learning-guide-hero__copy">
        <span className="badge-pill badge-pill--academy">Guia prático</span>
        <h1>{guide.title}</h1>
        <p>{guide.excerpt}</p>
      </div>
    </header>
  )
}

export default LearningGuideHero
