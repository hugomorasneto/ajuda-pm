import { Link } from 'react-router-dom'
import LearningGuideCard from '../learning/LearningGuideCard'

const academyGuideThumbnailsBySlug = {
  'fundamentos-produto-agil': {
    src: '/images/prodforge/academy/fundamentos-produto-agil-pm-po-iniciante.webp',
    alt: 'Capa do guia Fundamentos de produto agil para PM/PO iniciante',
  },
  'user-stories-na-pratica': {
    src: '/images/prodforge/academy/user-stories-na-pratica.webp',
    alt: 'Capa do guia User stories na pratica',
  },
  'backlog-e-refinamento': {
    src: '/images/prodforge/academy/backlog-e-refinamento-sem-caos.webp',
    alt: 'Capa do guia Backlog e refinamento sem caos',
  },
  'refinamento-e-criterios': {
    src: '/images/prodforge/academy/como-fazer-refinamento-sem-desperdicio.webp',
    alt: 'Capa do guia Como fazer refinamento sem desperdicio',
  },
  'alinhamento-com-stakeholders': {
    src: '/images/prodforge/academy/alinhamento-com-stakeholders-sem-virar-telefone-sem-fio.webp',
    alt: 'Capa do guia Alinhamento com stakeholders sem virar telefone sem fio',
  },
}

function LearningTeaser({ content, guides }) {
  const guidesWithThumbnails = guides.map((guide) => {
    const thumbnail = academyGuideThumbnailsBySlug[guide.slug]

    if (!thumbnail) {
      return guide
    }

    return {
      ...guide,
      thumbnailSrc: thumbnail.src,
      thumbnailAlt: thumbnail.alt,
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
        {guidesWithThumbnails.map((guide) => (
          <LearningGuideCard key={guide.slug} guide={guide} variant="landing" />
        ))}
      </div>

      <div className="landing-learning-teaser__footer">
        <p>{content.footer}</p>
        <Link className="landing-button forge-button forge-button--metal" to="/aprender">
          Ver trilha completa →
        </Link>
      </div>
    </section>
  )
}

export default LearningTeaser
