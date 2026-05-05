function buildPublicAssetCandidates(path) {
  const normalizedPath = path.replace(/^\/+/, '')
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return [...new Set([`/${normalizedPath}`, `${basePath}${normalizedPath}`])]
}

export const academyGuideMediaBySlug = {
  'fundamentos-produto-agil': {
    src: 'images/prodforge/academy/fundamentos-produto-agil-pm-po-iniciante.webp?v=20260503-final-v2',
    alt: 'Arte de forja representando fundamentos de produto ágil para PMs e POs iniciantes',
    heroPosition: '66% center',
    heroMobilePosition: '58% center',
  },
  'user-stories-na-pratica': {
    src: 'images/prodforge/academy/user-stories-na-pratica.webp?v=20260503-final-v2',
    alt: 'Arte de forja representando a criação prática de user stories',
    heroPosition: '68% center',
    heroMobilePosition: '58% center',
  },
  'backlog-e-refinamento': {
    src: 'images/prodforge/academy/backlog-e-refinamento-sem-caos.webp?v=20260503-final-v2',
    alt: 'Arte de forja representando backlog e refinamento sem caos',
    heroPosition: '65% center',
    heroMobilePosition: '56% center',
  },
  'refinamento-e-criterios': {
    src: 'images/prodforge/academy/como-fazer-refinamento-sem-desperdicio.webp?v=20260503-final-v2',
    alt: 'Arte de forja representando refinamento com critérios de aceite claros',
    heroPosition: '64% center',
    heroMobilePosition: '56% center',
  },
  'alinhamento-com-stakeholders': {
    src: 'images/prodforge/academy/alinhamento-com-stakeholders-sem-virar-telefone-sem-fio.webp?v=20260503-final-v2',
    alt: 'Arte de forja representando alinhamento com stakeholders sem ruído',
    heroPosition: '67% center',
    heroMobilePosition: '58% center',
  },
}

export function getAcademyGuideMediaBySlug(slug) {
  const media = academyGuideMediaBySlug[slug]

  if (!media) {
    return null
  }

  const srcCandidates = buildPublicAssetCandidates(media.src)

  return {
    thumbnailSrc: srcCandidates[0],
    thumbnailSrcCandidates: srcCandidates,
    thumbnailAlt: media.alt,
    heroImageSrc: srcCandidates[0],
    heroImageSrcCandidates: srcCandidates,
    heroImageAlt: media.alt,
    heroImagePosition: media.heroPosition,
    heroImageMobilePosition: media.heroMobilePosition,
  }
}

export function withAcademyGuideMedia(guides) {
  return guides.map((guide) => {
    const media = getAcademyGuideMediaBySlug(guide.slug)

    if (!media) {
      return guide
    }

    return {
      ...guide,
      ...media,
    }
  })
}
