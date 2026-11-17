import { useCopy } from '../../i18n/context'
import Link from '../../i18n/LocalizedLink'

function LearningRelatedReads({ guides }) {
  const t = useCopy('learning')
  const teaserCopy = useCopy('learningTeaser')
  return (
    <section className="learning-guide-block learning-guide-related" id="proximas-leituras">
      <div className="learning-guide-block__header">
        <span className="badge-pill badge-pill--academy">{t('related')}</span>
        <h2>{t('relatedTitle')}</h2>
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
              <Link to={`/aprender/${guide.slug}`} className="learning-guide-related__read">{t('readGuideArrow')}</Link>
              <Link to="/signup" className="learning-guide-related__practice">{teaserCopy('practice')}</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default LearningRelatedReads
