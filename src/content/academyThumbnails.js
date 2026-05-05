function buildPublicAssetCandidates(path) {
  const normalizedPath = path.replace(/^\/+/, '')
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return [...new Set([`/${normalizedPath}`, `${basePath}${normalizedPath}`])]
}

export const academyGuideThumbnailsBySlug = {
  'fundamentos-produto-agil': {
    src: 'images/prodforge/academy/fundamentos-produto-agil-pm-po-iniciante.webp?v=20260503-final-v2',
    alt: 'Capa do módulo Fundamentos de produto ágil para PM/PO iniciante',
  },
  'user-stories-na-pratica': {
    src: 'images/prodforge/academy/user-stories-na-pratica.webp?v=20260503-final-v2',
    alt: 'Capa do módulo Stories na prática',
  },
  'backlog-e-refinamento': {
    src: 'images/prodforge/academy/backlog-e-refinamento-sem-caos.webp?v=20260503-final-v2',
    alt: 'Capa do módulo Backlog e refinamento sem caos',
  },
  'refinamento-e-criterios': {
    src: 'images/prodforge/academy/como-fazer-refinamento-sem-desperdicio.webp?v=20260503-final-v2',
    alt: 'Capa do módulo Como fazer refinamento sem desperdiçar reunião',
  },
  'alinhamento-com-stakeholders': {
    src: 'images/prodforge/academy/alinhamento-com-stakeholders-sem-virar-telefone-sem-fio.webp?v=20260503-final-v2',
    alt: 'Capa do módulo Alinhamento com stakeholders sem virar telefone sem fio',
  },
}

export function withAcademyGuideThumbnails(guides) {
  return guides.map((guide) => {
    const thumbnail = academyGuideThumbnailsBySlug[guide.slug]

    if (!thumbnail) {
      return guide
    }

    const thumbnailSrcCandidates = buildPublicAssetCandidates(thumbnail.src)

    return {
      ...guide,
      thumbnailSrc: thumbnailSrcCandidates[0],
      thumbnailSrcCandidates,
      thumbnailAlt: thumbnail.alt,
    }
  })
}
