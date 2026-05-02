const HERO_MOCKUP_SRC = '/images/prodforge/hero-mockup-desktop.webp'

function handleMockupError(event) {
  event.currentTarget.hidden = true
  event.currentTarget.parentElement?.classList.add('hero-transformation-preview__media--missing')
}

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
            onError={handleMockupError}
          />

          <div className="hero-transformation-preview__asset-fallback" aria-hidden="true">
            <span className="hero-transformation-preview__fallback-kicker">Hero mockup</span>
            <strong>Imagem premium do produto</strong>
            <span>/public/images/prodforge/hero-mockup-desktop.webp</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroTransformationPreview
