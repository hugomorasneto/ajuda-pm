import Link from '../i18n/LocalizedLink'
import { useCopy, useLanguage } from '../i18n/context'
import { getLearningMetadata } from '../i18n/learningMetadata'
import { useLearningCatalog } from '../hooks/useLearningCatalog'
import LearningChecklist from '../components/learning/LearningChecklist'
import LearningExampleBlock from '../components/learning/LearningExampleBlock'
import LearningGuideHero from '../components/learning/LearningGuideHero'
import LearningMistakesList from '../components/learning/LearningMistakesList'
import LearningRelatedReads from '../components/learning/LearningRelatedReads'
import LearningSummaryBlock from '../components/learning/LearningSummaryBlock'
import {
  getLearningGuideBySlug,
  getLearningGuidesBySlugs,
  getLearningNotes,
} from '../content/learningContent'
import { withAcademyGuideMedia } from '../content/academyGuideMedia'
import { useAuth } from '../hooks/useAuth'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { usePageMetadata } from '../hooks/usePageMetadata'

const GUIDE_NAV_ITEMS = [
  { href: '#resumo', label: 'summary' },
  { href: '#quando-importa', label: 'context' },
  { href: '#exemplo', label: 'example' },
  { href: '#passo-a-passo', label: 'steps' },
  { href: '#erros-comuns', label: 'mistakes' },
  { href: '#checklist', label: 'checklist' },
]

function LearningGuidePage({ route }) {
  const { language } = useLanguage()
  const t = useCopy('learning')
  const catalog = useLearningCatalog()
  const { user } = useAuth()
  const { isCompleted, isLoading, markCompleted, unmarkCompleted } = useLearningProgress()
  const guide = getLearningGuideBySlug(route.guideSlug, catalog)
  const [guideWithMedia] = withAcademyGuideMedia([guide])
  const nextGuides = getLearningGuidesBySlugs(guide.nextReads, catalog)
  const relatedNotes = getLearningNotes(catalog).filter((note) => note.targetGuideSlug === guide.slug)

  usePageMetadata(getLearningMetadata(route, language, catalog))

  return (
    <div className="page learning-page learning-guide">
      <LearningGuideHero guide={guideWithMedia} />

      <div className="learning-guide__shell">
        <article className="learning-guide__article">
          <LearningSummaryBlock title={t('summaryTitle')} items={guide.quickSummary} />

          <section className="learning-guide-block learning-guide-context" id="quando-importa">
            <div className="learning-guide-block__header">
              <p className="landing-section__eyebrow">{t('contextBadge')}</p>
              <h2>{t('contextTitle')}</h2>
            </div>

            <div className="learning-guide-context__grid">
              <div>
                <h3>{t('problem')}</h3>
                <p>{guide.problem}</p>
              </div>
              <div>
                <h3>{t('outcome')}</h3>
                <p>{guide.outcome}</p>
              </div>
            </div>
          </section>

          <LearningExampleBlock example={guide.exampleScenario} />

          <section className="learning-guide-block learning-guide-steps" id="passo-a-passo">
            <div className="learning-guide-block__header">
              <p className="landing-section__eyebrow">{t('steps')}</p>
              <h2>{t('stepsTitle')}</h2>
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
                <p className="landing-section__eyebrow">{t('practicalNotes')}</p>
                <h2>{t('notesTitle')}</h2>
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
            <p className="learning-guide-aside__eyebrow">{t('inThisGuide')}</p>
            <nav aria-label={t('guideContents')}>
              <ul>
                {GUIDE_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{t(item.label)}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="learning-guide-aside__apply-card">
            <p className="learning-guide-aside__apply-label">{t('readyToPractice')}</p>
            <p className="learning-guide-aside__apply-body">{t('applyGuide')}</p>
            <div className="learning-guide-aside__apply-actions">
              <Link
                className="landing-button landing-button--primary"
                to={user ? '/tool' : '/signup'}
              >
                {user ? t('applyArrow') : t('signUp')}
              </Link>
              {!user && (
                <p className="learning-guide-aside__apply-microcopy">{t('signupNote')}</p>
              )}
            </div>
          </div>

          {user && !isLoading && (
            <div className="learning-guide-aside__progress-card">
              {isCompleted(guide.slug) ? (
                <>
                  <div className="learning-guide-aside__progress-done">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.15" />
                      <path d="M4 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('done')}
                  </div>
                  <button
                    type="button"
                    className="learning-guide-aside__progress-undo"
                    onClick={() => unmarkCompleted(guide.slug)}
                  >{t('undo')}</button>
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
                  {t('markDone')}
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
