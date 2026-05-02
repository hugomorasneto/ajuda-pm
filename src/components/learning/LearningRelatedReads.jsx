import { Link } from 'react-router-dom'

function LearningRelatedReads({ guides }) {
  return (
    <section className="learning-guide-block learning-guide-related" id="proximas-leituras">
      <div className="learning-guide-block__header">
        <span className="badge-pill badge-pill--academy">Próximas leituras</span>
        <h2>Continue a trilha</h2>
      </div>

      <div className="learning-guide-related__grid">
        {guides.map((guide) => (
          <article key={guide.slug} className="learning-guide-related__card">
            <div className="learning-guide-related__meta">
              <span>{guide.category}</span>
              <span>{guide.readingTime}</span>
            </div>
            <h3>{guide.title}</h3>
            <p>{guide.excerpt}</p>
            <div className="learning-guide-related__actions">
              <Link to={`/aprender/${guide.slug}`} className="learning-guide-related__read">
                Ler guia →
              </Link>
              <Link to="/signup" className="learning-guide-related__practice">
                Praticar →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default LearningRelatedReads
