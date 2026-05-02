const HERO_MOCKUP_SRC = '/images/prodforge/hero-mockup-desktop.webp'

function HeroTransformationPreview({ preview }) {
  const alt =
    preview?.imageAlt ||
    'Mockup do ProdForge transformando briefing bruto em user story estruturada.'

  return (
    <div className="hero-transformation-preview" aria-label="Preview visual do workspace ProdForge">
      <div className="hero-transformation-preview__frame">
        <div className="hero-transformation-preview__media">
          <img
            className="hero-transformation-preview__image"
            src={HERO_MOCKUP_SRC}
            alt={alt}
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
