import { Link } from 'react-router-dom'
import LearningGuideCard from '../components/learning/LearningGuideCard'
import {
  getLearningGuideBySlug,
  getLearningGuidesBySlugs,
  learningGuides,
  learningHub,
  learningNotes,
} from '../content/learningContent'
import { usePageMetadata } from '../hooks/usePageMetadata'

function LearningHubPage() {
  const starterGuides = getLearningGuidesBySlugs(learningHub.starterGuideSlugs)

  usePageMetadata({
    title: 'Aprender produto agil na pratica | ProdForge',
    description:
      'Centro de aprendizado pratico para PMs e POs iniciantes com guias sobre fundamentos, user stories, backlog, Scrum e discovery.',
    path: '/aprender',
  })

  return (
    <div className="page learning-page learning-hub">
      <section className="learning-hub-hero">
        <div className="learning-hub-hero__copy">
          <p className="landing-section__eyebrow">{learningHub.eyebrow}</p>
          <h1>{learningHub.title}</h1>
          <p>{learningHub.description}</p>
        </div>

        <div className="learning-hub-hero__rail">
          <div className="learning-rail-card">
            <p className="learning-rail-card__eyebrow">Comece por aqui</p>
            <ol>
              {starterGuides.map((guide) => (
                <li key={guide.slug}>
                  <Link to={`/aprender/${guide.slug}`}>{guide.title}</Link>
                </li>
              ))}
            </ol>
          </div>

          <div className="learning-rail-card">
            <p className="learning-rail-card__eyebrow">Leitura curta</p>
            <p>Guias de 6 a 7 minutos, com exemplo concreto, erros comuns e checklist final.</p>
          </div>
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section__intro">
          <p className="landing-section__eyebrow">Trilha inicial</p>
          <h2>Por onde um PM iniciante costuma ganhar mais clareza</h2>
          <p>Leia na ordem se voce esta montando base agora. Pule por tema se ja estiver vivendo a dor no backlog.</p>
        </div>

        <div className="learning-guide-grid learning-guide-grid--featured">
          {starterGuides.map((guide) => (
            <LearningGuideCard key={guide.slug} guide={guide} variant="featured" />
          ))}
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section__intro">
          <p className="landing-section__eyebrow">Guias principais</p>
          <h2>Leituras para sair da teoria e voltar para o trabalho real</h2>
          <p>Os guias abaixo foram escritos para situacoes tipicas de quem esta comecando a estruturar produto em contexto agil.</p>
        </div>

        <div className="learning-guide-grid">
          {learningGuides.map((guide) => (
            <LearningGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section__intro">
          <p className="landing-section__eyebrow">Novidades praticas</p>
          <h2>Notas curtas para melhorar conversa e criterio no dia a dia</h2>
          <p>Em vez de um feed de noticias, usamos notas curadas e conectadas aos guias principais.</p>
        </div>

        <div className="learning-note-grid">
          {learningNotes.map((note) => {
            const targetGuide = getLearningGuideBySlug(note.targetGuideSlug)

            return (
              <article key={note.slug} className="learning-note-card">
                <p className="learning-note-card__tag">{note.tag}</p>
                <h3>{note.title}</h3>
                <p>{note.summary}</p>
                {targetGuide ? (
                  <Link to={`/aprender/${targetGuide.slug}`}>{note.ctaLabel}</Link>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className="learning-section">
        <div className="learning-section__intro">
          <p className="landing-section__eyebrow">Leituras relacionadas ao ProdForge</p>
          <h2>Conteudo para aprender. Produto para executar.</h2>
          <p>Use os guias para estruturar criterio. Use o workspace quando quiser transformar contexto em historia pronta para revisao.</p>
        </div>

        <div className="learning-related-product">
          {learningHub.relatedProductLinks.map((item) => {
            const action = item.external ? (
              <a href={item.to}>{item.label}</a>
            ) : (
              <Link to={item.to}>{item.label}</Link>
            )

            return (
              <article key={item.title} className="learning-related-product__card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {action}
              </article>
            )
          })}
        </div>
      </section>

      <section className="learning-final-cta">
        <div className="learning-final-cta__copy">
          <p className="landing-section__eyebrow">Pronto para aplicar</p>
          <h2>{learningHub.finalCta.title}</h2>
          <p>{learningHub.finalCta.description}</p>
        </div>

        <div className="learning-final-cta__actions">
          <Link className="landing-button landing-button--primary" to="/signup">
            Criar conta gratis
          </Link>
          <Link className="landing-button landing-button--secondary" to="/">
            Voltar para a pagina inicial
          </Link>
        </div>
      </section>
    </div>
  )
}

export default LearningHubPage
