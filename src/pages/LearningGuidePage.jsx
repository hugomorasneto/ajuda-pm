import { Link, Navigate, useParams } from 'react-router-dom'
import LearningChecklist from '../components/learning/LearningChecklist'
import LearningExampleBlock from '../components/learning/LearningExampleBlock'
import LearningGuideHero from '../components/learning/LearningGuideHero'
import LearningMistakesList from '../components/learning/LearningMistakesList'
import LearningRelatedReads from '../components/learning/LearningRelatedReads'
import LearningSummaryBlock from '../components/learning/LearningSummaryBlock'
import {
  getLearningGuideBySlug,
  getLearningGuidesBySlugs,
  getLearningNotesForGuide,
} from '../content/learningContent'
import { withAcademyGuideMedia } from '../content/academyGuideMedia'
import { useAuth } from '../hooks/useAuth'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { ACADEMIA_IMAGE_ALT, ACADEMIA_IMAGE_URL, buildArticleJsonLd, usePageMetadata } from '../hooks/usePageMetadata'

const GUIDE_NAV_ITEMS = [
  { href: '#resumo', label: 'Resumo' },
  { href: '#quando-importa', label: 'Quando importa' },
  { href: '#exemplo', label: 'Exemplo' },
  { href: '#passo-a-passo', label: 'Passo a passo' },
  { href: '#erros-comuns', label: 'Erros comuns' },
  { href: '#checklist', label: 'Checklist' },
]

function LearningGuidePage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { isCompleted, markCompleted, unmarkCompleted } = useLearningProgress()
  const guide = getLearningGuideBySlug(slug)
  const guideWithMedia = guide ? withAcademyGuideMedia([guide])[0] : null
  const nextGuides = guide ? getLearningGuidesBySlugs(guide.nextReads) : []
  const relatedNotes = guide ? getLearningNotesForGuide(guide.slug) : []
  const metadataPath = guide ? `/aprender/${guide.slug}` : '/aprender'

  usePageMetadata({
    title: guide?.seo.title ?? 'Campo de Treino ProdForge | Aprenda product management na prática',
    description:
      guide?.seo.description ??
      'Guias práticos para PMs e POs iniciantes sobre fundamentos, user stories, backlog, Scrum e discovery.',
    path: metadataPath,
    type: guide ? 'article' : 'website',
    image: ACADEMIA_IMAGE_URL,
    imageAlt: ACADEMIA_IMAGE_ALT,
    jsonLd: guide
      ? buildArticleJsonLd({
          title: guide.title,
          description: guide.seo.description,
          excerpt: guide.excerpt,
          path: metadataPath,
          publishedTime: '2026-05-01',
        })
      : null,
  })

  if (!guide) {
    return <Navigate to="/aprender" replace />
  }

  return (
    <div className="page learning-page learning-guide">
      <LearningGuideHero guide={guideWithMedia} />

      <div className="learning-guide__shell">
        <article className="learning-guide__article">
          <LearningSummaryBlock title="O que você precisa levar desta leitura" items={guide.quickSummary} />

          <section className="learning-guide-block learning-guide-context" id="quando-importa">
            <div className="learning-guide-block__header">
              <p className="landing-section__eyebrow">Quando isso importa</p>
              <h2>O contexto prático por trás do conceito</h2>
            </div>

            <div className="learning-guide-context__grid">
              <div>
                <h3>Problema</h3>
                <p>{guide.problem}</p>
              </div>
              <div>
                <h3>Resultado esperado</h3>
                <p>{guide.outcome}</p>
              </div>
            </div>
          </section>

          <LearningExampleBlock example={guide.exampleScenario} />

          <section className="learning-guide-block learning-guide-steps" id="passo-a-passo">
            <div className="learning-guide-block__header">
              <p className="landing-section__eyebrow">Passo a passo</p>
              <h2>Como aplicar no dia seguinte</h2>
            </div>

            <div className="learning-guide-steps__list">
              {guide.sections.map((section, index) => (
                <article key={section.title} className="learning-guide-step">
                  <div className="learning-guide-step__index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="learning-guide-step__content">
                    <h3>{section.title}</h3>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets?.length ? (
                      <ul>
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {relatedNotes.length > 0 ? (
            <section className="learning-guide-block learning-guide-notes" id="notas-praticas">
              <div className="learning-guide-block__header">
                <p className="landing-section__eyebrow">Notas práticas</p>
                <h2>Conexões úteis para o trabalho diário</h2>
              </div>

              <div className="learning-note-grid">
                {relatedNotes.map((note) => (
                  <article key={note.slug} className="learning-note-card">
                    <p className="learning-note-card__tag">{note.tag}</p>
                    <h3>{note.title}</h3>
                    <p>{note.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <LearningMistakesList items={guide.commonMistakes} />
          <LearningChecklist items={guide.checklist} />
          <LearningRelatedReads guides={nextGuides} />
        </article>

        <aside className="learning-guide__aside">
          <div className="learning-guide-aside__card">
            <p className="learning-guide-aside__eyebrow">Nesta leitura</p>
            <nav aria-label="Sumário do guia">
              <ul>
                {GUIDE_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="learning-guide-aside__apply-card">
            <p className="learning-guide-aside__apply-label">Pronto para praticar?</p>
            <p className="learning-guide-aside__apply-body">
              Aplique o que você acabou de ler. Gere uma user story com contexto real, não um exemplo fictício.
            </p>
            <div className="learning-guide-aside__apply-actions">
              <Link
                className="landing-button landing-button--primary"
                to={user ? '/tool' : '/signup'}
              >
                {user ? 'Aplicar na Bancada →' : 'Criar conta grátis →'}
              </Link>
              {!user && (
                <p className="learning-guide-aside__apply-microcopy">Grátis · Sem cartão de crédito</p>
              )}
            </div>
          </div>

          {user && (
            <div className="learning-guide-aside__progress-card">
              {isCompleted(guide.slug) ? (
                <>
                  <div className="learning-guide-aside__progress-done">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.15" />
                      <path d="M4 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Módulo concluído
                  </div>
                  <button
                    type="button"
                    className="learning-guide-aside__progress-undo"
                    onClick={() => unmarkCompleted(guide.slug)}
                  >
                    Desmarcar conclusão
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="learning-guide-aside__progress-btn"
                  onClick={() => markCompleted(guide.slug)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M4 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Marcar como concluído
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default LearningGuidePage
