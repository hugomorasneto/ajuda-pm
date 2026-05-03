import { useState } from 'react'

function buildPublicAssetCandidates(path) {
  const normalizedPath = path.replace(/^\/+/, '')
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return [...new Set([`/${normalizedPath}`, `${basePath}${normalizedPath}`])]
}

const HERO_MOCKUP_SRC_CANDIDATES = buildPublicAssetCandidates(
  'images/prodforge/hero/hero-mockup-desktop.webp?v=20260503-final-v2',
)

function HeroTransformationPreview({ preview }) {
  const [imageAttemptIndex, setImageAttemptIndex] = useState(0)
  const [isImageUnavailable, setIsImageUnavailable] = useState(false)
  const alt =
    preview?.imageAlt ||
    'Mockup do ProdForge transformando briefing bruto em user story estruturada.'
  const activeImageSrc = HERO_MOCKUP_SRC_CANDIDATES[imageAttemptIndex]

  const handleImageError = () => {
    const hasAnotherCandidate = imageAttemptIndex < HERO_MOCKUP_SRC_CANDIDATES.length - 1

    if (hasAnotherCandidate) {
      setImageAttemptIndex((currentIndex) => currentIndex + 1)
      return
    }

    setIsImageUnavailable(true)
  }

  return (
    <div className="hero-transformation-preview" aria-label="Preview visual do workspace ProdForge">
      <div className="hero-transformation-preview__frame">
        <div className="hero-transformation-preview__media">
          {isImageUnavailable ? null : (
            <img
              className="hero-transformation-preview__image"
              src={activeImageSrc}
              alt={alt}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onError={handleImageError}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default HeroTransformationPreview
