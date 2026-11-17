import { useCopy } from '../../i18n/context'
import Link from '../../i18n/LocalizedLink'

function LearningGuideHero({ guide }) {
  const t = useCopy('learning')
  const heroStyle = guide.heroImageSrc
    ? {
        '--learning-guide-hero-image': `url("${guide.heroImageSrc}")`,
        '--learning-guide-hero-position': guide.heroImagePosition,
        '--learning-guide-hero-mobile-position': guide.heroImageMobilePosition,
      }
    : undefined

  return (
    <header className="learning-guide-hero" style={heroStyle}>
      <div className="learning-guide-hero__top">
        <Link to="/aprender" className="learning-guide-hero__backlink">{t('backTraining')}</Link>
        <div className="learning-guide-hero__chips" aria-label={t('guideInfo')}>
          <span className="learning-guide-hero__chip">{guide.category}</span>
          <span className="learning-guide-hero__chip">{guide.readingTime}</span>
          <span className="learning-guide-hero__chip learning-guide-hero__chip--level">{guide.level}</span>
        </div>
      </div>

      <div className="learning-guide-hero__copy">
        <span className="badge-pill badge-pill--academy">{t('title')}</span>
        <h1>{guide.title}</h1>
        <p>{guide.excerpt}</p>
      </div>
    </header>
  )
}

export default LearningGuideHero
