import { Link } from 'react-router-dom'
import LearningGuideCard from '../components/learning/LearningGuideCard'
import {
  getLearningGuideBySlug,
  getLearningGuidesBySlugs,
  learningGuides,
  learningHub,
  learningNotes,
} from '../content/learningContent'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'

const TRAIL_STEPS = [
  { num: '01', title: 'Fundamentos', slug: 'fundamentos-produto-agil' },
  { num: '02', title: 'User Stories', slug: 'user-stories-na-pratica' },
  { num: '03', title: 'Backlog', slug: 'backlog-e-refinamento' },
  { num: '04', title: 'Refinamento', slug: null },
  { num: '05', title: 'Alinhamento', slug: null },
]

function TrailStep({ step, index }) {
  const isActive = Boolean(step.slug)

  return (
    <div className={`learning-path-step${isActive ? ' learning-path-step--active' : ' learning-path-step--locked'}`}>
      {index > 0 && <div className="learning-path-step__connector" aria-hidden="true" />}
      <div className="learning-path-step__dot" aria-hidden="true">
        {isActive ? (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <circle cx="4" cy="4" r="4" />
          </svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </div>
      <span className="learning-path-step__num">{step.num}</span>
      {step.slug ? (
        <Link to={`/aprender/${step.slug}`} className="learning-path-step__title">
          {step.title}
        </Link>
      ) : (
        <span className="learning-path-step__title learning-path-step__title--locked">{step.title}</span>
      )}
    </div>
  )
}

function LearningHubPage() {
  const { user } = useAuth()
  const starterGuides = getLearningGuidesBySlugs(learningHub.starterGuideSlugs)

  usePageMetadata({
    title: 'Academia ProdForge | Aprenda product management na prática',
    description:
      'Trilha prática para PMs e POs iniciantes aprenderem fundamentos, user stories e backlog — e aplicarem imediatamente na ferramenta.',
    path: '/aprender',
  })

  return (
    <div className="page learning-page learning-hub">

      {/* ── Hero ── */}
      <section className="learning-hub-hero">
        <div className="learning-hub-hero__copy">
          <span className="badge-pill badge-pill--academy">Academia ProdForge</span>
          <h1>De iniciante a PM que entrega com clareza.</h1>
          <p>
            5 módulos práticos. Cada um termina com um exercício real na ferramenta.
            Aprenda o conceito — aplique imediatamente.
          </p>
          <div className="learning-hub-hero__actions">
            <Link className="landing-button landing-button--primary" to="/aprender/fundamentos-produto-agil">
              Começar trilha →
            </Link>
            <a className="landing-button landing-button--secondary" href="#guias">
              Ver todos os guias
            </a>
          </div>
          <p className="learning-hub-hero__microcopy">5 módulos · Nível iniciante · Grátis para começar</p>
        </div>
      </section>

      {/* ── Trilha visual ── */}
      <section className="learning-path-section">
        <div className="learning-section__intro">
          <span className="badge-pill badge-pill--academy">Trilha PM na Prática</span>
          <h2>Aprenda na sequência certa.</h2>
          <p>
            Comece pelo módulo 01 se você está montando base agora.
            Pule por tema se já estiver vivendo a dor no backlog.
          </p>
        </div>

        <div className="learning-path-trail" role="list" aria-label="Módulos da trilha">
          {TRAIL_STEPS.map((step, i) => (
            <TrailStep key={step.num} step={step} index={i} />
          ))}
        </div>
      </section>

      {/* ── Módulos disponíveis ── */}
      <section className="learning-section">
        <div className="learning-section__intro">
          <span className="badge-pill">Módulos disponíveis</span>
          <h2>Por onde um PM iniciante costuma ganhar mais clareza</h2>
          <p>
            Leia na ordem se você está montando base agora. Pule por tema se já estiver
            vivendo a dor no backlog.
          </p>
        </div>

        <div className="learning-guide-grid learning-guide-grid--featured">
          {starterGuides.map((guide) => (
            <LearningGuideCard key={guide.slug} guide={guide} variant="featured" />
          ))}
        </div>
      </section>

      {/* ── Aprenda e Aplique ── */}
      <section className="learn-apply-block" aria-labelledby="learn-apply-title">
        <div className="learn-apply-block__copy">
          <span className="badge-pill badge-pill--academy">Aprenda e aplique</span>
          <h2 id="learn-apply-title">Cada guia termina onde o trabalho começa.</h2>
          <p>
            Não adianta ler sobre user stories sem escrever uma. Cada módulo tem um link
            direto para praticar o conceito na ferramenta — com contexto real, não exercício fictício.
          </p>
          <Link
            className="landing-button landing-button--primary"
            to={user ? '/tool' : '/signup'}
          >
            {user ? 'Abrir área de trabalho →' : 'Gerar minha primeira história →'}
          </Link>
        </div>

        <div className="learn-apply-block__preview">
          <div className="learn-apply-block__panel learn-apply-block__panel--concept">
            <p className="learn-apply-block__panel-label">O conceito</p>
            <p className="learn-apply-block__panel-text">
              User story tem 3 partes: <strong>persona</strong>, <strong>ação</strong> e{' '}
              <strong>resultado</strong>.
            </p>
            <p className="learn-apply-block__panel-example">
              "Como [quem], quero [fazer o quê] para [qual resultado]."
            </p>
          </div>

          <div className="learn-apply-block__panel learn-apply-block__panel--output">
            <p className="learn-apply-block__panel-label">Na prática</p>
            <p className="learn-apply-block__panel-story">
              Como <strong>responsável pelo cadastro</strong>, quero{' '}
              <strong>validar o domínio corporativo</strong> para{' '}
              <strong>concluir o registro com menos retrabalho</strong>.
            </p>
            <div className="learn-apply-block__criteria">
              <p>Critérios de aceite</p>
              <ol>
                <li>Bloquear avanço com domínio inválido</li>
                <li>Exibir mensagem orientando a correção</li>
                <li>Registrar falha para análise do funil</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── Todos os guias ── */}
      <section className="learning-section" id="guias">
        <div className="learning-section__intro">
          <span className="badge-pill">Guias principais</span>
          <h2>Leituras para sair da teoria e voltar para o trabalho real</h2>
          <p>
            Escritos para situações típicas de quem está começando a estruturar produto
            em contexto ágil.
          </p>
        </div>

        <div className="learning-guide-grid">
          {learningGuides.map((guide) => (
            <LearningGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      {/* ── Notas rápidas ── */}
      <section className="learning-section">
        <div className="learning-section__intro">
          <span className="badge-pill">Notas rápidas</span>
          <h2>Conceitos em 2 minutos</h2>
          <p>
            Notas curtas e diretas para resolver dúvidas do dia a dia sem precisar ler
            um guia inteiro.
          </p>
        </div>

        <div className="quick-notes-strip" role="list">
          {learningNotes.map((note) => {
            const targetGuide = getLearningGuideBySlug(note.targetGuideSlug)
            return (
              <article key={note.slug} className="quick-note-item" role="listitem">
                <span className="quick-note-item__tag">{note.tag}</span>
                <span className="quick-note-item__title">{note.title}</span>
                {targetGuide ? (
                  <Link to={`/aprender/${targetGuide.slug}`} className="quick-note-item__link">
                    Ler →
                  </Link>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="learning-final-cta">
        <div className="learning-final-cta__copy">
          <span className="badge-pill badge-pill--academy">Pronto para aplicar</span>
          <h2>Aprenda e execute no mesmo lugar.</h2>
          <p>
            Os guias estruturam o repertório. O workspace transforma o contexto em user
            story pronta para revisão.
          </p>
        </div>

        <div className="learning-final-cta__actions">
          <Link
            className="landing-button landing-button--primary"
            to={user ? '/tool' : '/signup'}
          >
            {user ? 'Abrir área de trabalho' : 'Gerar minha primeira história →'}
          </Link>
          <Link className="landing-button landing-button--secondary" to="/">
            Voltar para a página inicial
          </Link>
        </div>
      </section>
    </div>
  )
}

export default LearningHubPage
