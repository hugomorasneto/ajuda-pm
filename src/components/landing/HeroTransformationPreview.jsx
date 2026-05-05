import heroForgeVertical from '../../assets/landing/hero-forge-vertical.png'

function HeroTransformationPreview({ preview }) {
  const alt =
    preview?.imageAlt ||
    'Forja tecnológica transformando briefing em user story clara na ProdForge'

  return (
    <div className="hero-transformation-preview" aria-label="Preview visual do workspace ProdForge">
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
