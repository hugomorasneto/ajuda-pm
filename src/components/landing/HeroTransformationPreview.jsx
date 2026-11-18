import { useCopy } from '../../i18n/context'
import heroForgeVertical from '../../assets/landing/hero-forge-vertical.png'

function HeroTransformationPreview({ preview }) {
  const t = useCopy('heroTransformationPreview')
  const alt =
    preview?.imageAlt ||
    t('heroTransformationPreview_forja_tecnologica_transformando_briefing_em')

  return (
    <div className="hero-transformation-preview" aria-label={t('heroTransformationPreview_preview_visual_do_workspace_prodforge')}>
      <div className="hero-transformation-preview__frame">
        <div className="hero-transformation-preview__media hero-art-frame">
          <img
            className="hero-transformation-preview__image"
            src={heroForgeVertical}
            alt={alt}
            width="1122"
            height="1402"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  )
}

export default HeroTransformationPreview
