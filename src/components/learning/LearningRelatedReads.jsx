import { Link } from 'react-router-dom'

function LearningRelatedReads({ guides }) {
  return (
    <section className="learning-guide-block learning-guide-related" id="proximas-leituras">
      <div className="learning-guide-block__header">
        <p className="landing-section__eyebrow">Proximas leituras</p>
        <h2>Continue a trilha</h2>
      </div>

      <div className="learning-guide-related__grid">
        {guides.map((guide) => (
          <article key={guide.slug} className="learning-guide-related__card">
            <p className="learning-guide-related__meta">
              <span>{guide.category}</span>
              <span>{guide.readingTime}</span>
            </p>
            <h3>{guide.title}</h3>
            <p>{guide.excerpt}</p>
            <Link to={`/aprender/${guide.slug}`}>Ler agora</Link>
          </article>
        ))}
      </div>
    </section>
  )
}

export default LearningRelatedReads
