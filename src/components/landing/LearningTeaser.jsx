import { useCopy, useLanguage } from '../../i18n/context'
import Link from '../../i18n/LocalizedLink'
import LearningGuideCard from '../learning/LearningGuideCard'
import { withAcademyGuideMedia } from '../../content/academyGuideMedia'

function LearningTeaser({ content, guides }) {
  const t = useCopy('learningTeaser')
  const { language } = useLanguage()
  const guidesWithMedia = withAcademyGuideMedia(guides).map((guide) => {
    if (language !== 'en') return guide
    return {
      ...guide,
      title: t('guides.' + guide.slug + '.title'),
      excerpt: t('guides.' + guide.slug + '.excerpt'),
      category: t('guides.' + guide.slug + '.category'),
      level: t('beginner'),
      thumbnailAlt: t('cover', { title: t('guides.' + guide.slug + '.title') }),
    }
  })

  return (
    <section className="landing-section landing-learning-teaser" id="aprender">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-learning-teaser__grid">
        {guidesWithMedia.map((guide) => (
          <LearningGuideCard key={guide.slug} guide={guide} variant="landing" />
        ))}
      </div>

      <div className="landing-learning-teaser__footer">
        <p>{content.footer}</p>
        {language === 'en' && <p>{t('guidesInPortuguese')}</p>}
        <Link className="landing-button forge-button forge-button--metal" to="/aprender">
          {t('learningTeaser_ver_trilha_completa')}
        </Link>
      </div>
    </section>
  )
}

export default LearningTeaser
