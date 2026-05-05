import { Link } from 'react-router-dom'
import LearningGuideCard from '../components/learning/LearningGuideCard'
import {
  getLearningGuideBySlug,
  getLearningGuidesBySlugs,
  learningHub,
  learningNotes,
} from '../content/learningContent'
import { withAcademyGuideMedia } from '../content/academyGuideMedia'
import { useAuth } from '../hooks/useAuth'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { ACADEMIA_IMAGE_ALT, ACADEMIA_IMAGE_URL, usePageMetadata } from '../hooks/usePageMetadata'

const TRAIL_STEPS = [
  { num: '01', title: 'Fundamentos', slug: 'fundamentos-produto-agil' },
  { num: '02', title: 'User Stories', slug: 'user-stories-na-pratica' },
  { num: '03', title: 'Backlog', slug: 'backlog-e-refinamento' },
  { num: '04', title: 'Refinamento', slug: 'refinamento-e-criterios' },
  { num: '05', title: 'Alinhamento', slug: 'alinhamento-com-stakeholders' },
]

const AVAILABLE_STEPS = TRAIL_STEPS.filter((s) => s.slug)

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrailStep({ step, index, isCompleted }) {
  const isActive = Boolean(step.slug)
  const isDone = isActive && isCompleted(step.slug)

  const stepClass = [
    'learning-path-step',
    !isActive ? 'learning-path-step--locked' :
    isDone    ? 'learning-path-step--completed' :
                'learning-path-step--active',
  ].join(' ')

  const connectorClass = [
    'learning-path-step__connector',
    isDone ? 'learning-path-step__connector--done' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={stepClass} role="listitem">
      {index > 0 && <div className={connectorClass} aria-hidden="true" />}

      <div className="learning-path-step__dot" aria-hidden="true">
        {isDone ? (
          <CheckIcon />
        ) : isActive ? (
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
        <span className="learning-path-step__title learning-path-step__title--locked">
          {step.title}
        </span>
      )}
    </div>
  )
}

function LearningHubPage() {
  const { user } = useAuth()
  const { isCompleted, isLoading } = useLearningProgress()
  const academyModules = withAcademyGuideMedia(getLearningGuidesBySlugs(learningHub.starterGuideSlugs))

  const completedCount = AVAILABLE_STEPS.filter((s) => isCompleted(s.slug)).length
  const totalCount = AVAILABLE_STEPS.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  usePageMetadata({
    title: 'Campo de Treino ProdForge | Aprenda product management na prática',
    description:
      'Guias práticos para aprender, aplicar na Bancada e transformar contexto solto em user stories prontas para inspeção.',
    path: '/aprender',
    image: ACADEMIA_IMAGE_URL,
    imageAlt: ACADEMIA_IMAGE_ALT,
  })

  return (
    <div className="page learning-page learning-hub">

      {/* ── Hero ── */}
      <section className="learning-hub-hero">
        <div className="learning-hub-hero__copy">
          <span className="badge-pill badge-pill--academy">Campo de Treino ProdForge</span>
          <h1>Campo de Treino ProdForge</h1>
          <p>
            Guias práticos para aprender, aplicar na Bancada e transformar contexto solto em user
            stories prontas para inspeção.
          </p>
          <div className="learning-hub-hero__actions">
            <Link className="landing-button landing-button--primary" to="/aprender/fundamentos-produto-agil">
              Começar trilha →
            </Link>
            <a className="landing-button landing-button--secondary" href="#modulos">
              Ver módulos
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

        {/* Barra de progresso — só para usuários logados */}
        {user && !isLoading && (
          <div className="learning-trail-progress">
            <div className="learning-trail-progress__header">
              <span className="learning-trail-progress__label">
                {completedCount === 0
                  ? 'Nenhum módulo concluído ainda'
                  : completedCount === totalCount
                  ? '🎉 Trilha concluída!'
                  : `${completedCount} de ${totalCount} módulos concluídos`}
              </span>
              <span className="learning-trail-progress__fraction">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="learning-trail-progress__bar" role="progressbar" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={totalCount}>
              <div
                className="learning-trail-progress__fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="learning-path-trail" role="list" aria-label="Módulos da trilha">
          {TRAIL_STEPS.map((step, i) => (
            <TrailStep
              key={step.num}
              step={step}
              index={i}
              isCompleted={isCompleted}
            />
          ))}
        </div>
      </section>

      {/* ── Aprenda enquanto faz ── */}
      <section className="learning-section" id="modulos">
        <div className="learning-section__intro">
          <span className="badge-pill">Aprenda enquanto faz</span>
          <h2>Módulos do Campo de Treino ProdForge para praticar no backlog real</h2>
          <p>
            Leia na ordem se você está montando base agora. Pule por tema se já estiver vivendo a dor
            de estruturar stories, refinar backlog ou alinhar stakeholders.
          </p>
        </div>

        <div className="learning-guide-grid learning-guide-grid--featured">
          {academyModules.map((guide) => (
            <LearningGuideCard
              key={guide.slug}
              guide={guide}
              variant="featured"
              isCompleted={isCompleted(guide.slug)}
            />
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
            {user ? 'Abrir bancada →' : 'Forjar minha primeira story →'}
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
            Os guias estruturam o repertório. A bancada transforma a matéria-prima em user
            story pronta para inspeção.
          </p>
        </div>

        <div className="learning-final-cta__actions">
          <Link
            className="landing-button landing-button--primary"
            to={user ? '/tool' : '/signup'}
          >
            {user ? 'Abrir bancada' : 'Forjar minha primeira story →'}
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
