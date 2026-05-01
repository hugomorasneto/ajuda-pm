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
import { buildArticleJsonLd, usePageMetadata } from '../hooks/usePageMetadata'

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
  const guide = getLearningGuideBySlug(slug)
  const nextGuides = guide ? getLearningGuidesBySlugs(guide.nextReads) : []
  const relatedNotes = guide ? getLearningNotesForGuide(guide.slug) : []
  const metadataPath = guide ? `/aprender/${guide.slug}` : '/aprender'

  usePageMetadata({
    title: guide?.seo.title ?? 'Aprender produto agil na pratica | ProdForge',
    description:
      guide?.seo.description ??
      'Centro de aprendizado pratico para PMs e POs iniciantes com guias sobre fundamentos, user stories, backlog, Scrum e discovery.',
    path: metadataPath,
    type: guide ? 'article' : 'website',
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
      <LearningGuideHero guide={guide} />

      <div className="learning-guide__shell">
        <article className="learning-guide__article">
          <LearningSummaryBlock title="O que voce precisa levar desta leitura" items={guide.quickSummary} />

          <section className="learning-guide-block learning-guide-context" id="quando-importa">
            <div className="learning-guide-block__header">
              <p className="landing-section__eyebrow">Quando isso importa</p>
              <h2>O contexto pratico por tras do conceito</h2>
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
                <p className="landing-section__eyebrow">Notas praticas</p>
                <h2>Conexoes uteis para o trabalho diario</h2>
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
            <nav aria-label="Sumario do guia">
              <ul>
                {GUIDE_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="learning-guide-aside__card">
            <p className="learning-guide-aside__eyebrow">Aplicar agora</p>
            <p>Quando quiser transformar contexto em uma primeira versao estruturada, use o workspace.</p>
            <div className="learning-guide-aside__actions">
              <Link className="landing-button landing-button--primary" to="/signup">
                Criar conta gratis
              </Link>
              <Link className="landing-button landing-button--secondary" to="/tool">
                Abrir area de trabalho
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default LearningGuidePage
