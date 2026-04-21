import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import { trackEvent } from '../services/analyticsService'

const heroHighlights = [
  'User stories com estrutura pronta para refinamento',
  'Historico por usuario, versoes e revisao no mesmo fluxo',
  'Saida orientada a negocio, engenharia e QA',
]

const productMetrics = [
  { value: '3 passos', label: 'do contexto ao backlog estruturado' },
  { value: '1 workspace', label: 'geracao, revisao e historico no mesmo lugar' },
  { value: '10 free', label: 'geracoes iniciais para validar o fluxo real' },
]

const steps = [
  {
    step: '01',
    title: 'Explique o problema com contexto real',
    description: 'Descreva cenario, restricoes e requisitos sem precisar montar a historia manualmente.',
  },
  {
    step: '02',
    title: 'Receba uma primeira versao pronta para avaliacao',
    description: 'O workspace entrega titulo, objetivo, user story, criterios, gaps e checklist de QA.',
  },
  {
    step: '03',
    title: 'Refine, compare versoes e salve a melhor',
    description: 'Use a ferramenta como base de trabalho continuo para alinhar produto, dev e qualidade.',
  },
]

const benefitBands = [
  {
    title: 'Mais clareza para o time',
    description: 'Menos ambiguidade entre intencao de negocio, implementacao e validacao funcional.',
  },
  {
    title: 'Refinamento com ritmo',
    description: 'Sai de texto solto para uma historia escaneavel e pronta para conversa tecnica.',
  },
  {
    title: 'Qualidade mais consistente',
    description: 'Criterios observaveis, gaps relevantes e checklist de QA desde a primeira versao.',
  },
]

const audience = [
  'Product Managers que precisam transformar contexto em backlog com mais velocidade.',
  'Product Owners que refinam historias junto de engenharia e QA.',
  'Profissionais em inicio de carreira que querem elevar o padrao de escrita.',
  'Times que precisam reduzir ruido entre negocio, design, dev e qualidade.',
]

const aiOutputs = [
  'Titulo orientado a valor e nao a tarefa vaga.',
  'Objetivo claro para decisao e priorizacao.',
  'User story no formato ator, necessidade e beneficio.',
  'Criterios de aceitacao testaveis.',
  'Regras de negocio, gaps e checklist de QA quando fizer sentido.',
]

function HomePage() {
  const { user } = useAuth()

  useEffect(() => {
    trackEvent({
      event_name: 'landing_view',
      event_category: 'public',
    })
  }, [])

  return (
    <div className="page home-page">
      <section className="landing-hero-shell">
        <div className="landing-hero-copy">
          <div className="hero-kicker-row">
            <p className="eyebrow">Workspace IA para Product Teams</p>
            <span className="hero-status-pill">Dark SaaS Workflow</span>
          </div>

          <h1 className="landing-hero-title">
            User stories com mais precisao, menos ruído e uma cara real de produto.
          </h1>

          <p className="landing-hero-description">
            O {APP_NAME} transforma contexto de produto em historias estruturadas para refinamento,
            revisao e colaboracao continua. Menos texto solto. Mais clareza para negocio, dev e QA.
          </p>

          <div className="hero-actions landing-hero-actions">
            {user ? (
              <>
                <Link className="btn btn-primary" to="/tool">
                  Abrir Workspace
                </Link>
                <Link className="btn btn-ghost" to="/user-stories">
                  Ver fundamentos
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/signup">
                  Criar conta gratis
                </Link>
                <Link className="btn btn-ghost" to="/login">
                  Entrar
                </Link>
              </>
            )}
          </div>

          <ul className="hero-highlights">
            {heroHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="landing-hero-preview">
          <div className="hero-preview-frame">
            <div className="hero-preview-bar">
              <span />
              <span />
              <span />
            </div>

            <div className="hero-preview-card hero-preview-card-primary">
              <p className="hero-preview-label">Geracao assistida</p>
              <h2>Sangria de ajuste no fechamento de caixa</h2>
              <p>
                Como operador de caixa, quero registrar a retirada de valores excedentes para
                conciliar o saldo final com seguranca e rastreabilidade.
              </p>
            </div>

            <div className="hero-preview-grid">
              <div className="hero-preview-card">
                <p className="hero-preview-label">Criterios</p>
                <ul>
                  <li>Valida valor maximo permitido.</li>
                  <li>Bloqueia operacao sem permissao.</li>
                  <li>Registra evidencia para auditoria.</li>
                </ul>
              </div>

              <div className="hero-preview-card hero-preview-card-accent">
                <p className="hero-preview-label">Revisao</p>
                <p>Nova versao com foco em backend, observabilidade e regra operacional.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-metrics-strip">
        {productMetrics.map((item) => (
          <article key={item.label} className="metric-chip">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </section>

      <section className="landing-section how-it-works-section">
        <div className="landing-section-intro">
          <p className="eyebrow">Como funciona</p>
          <h2>Uma jornada enxuta para sair do problema e chegar a uma historia utilizavel.</h2>
          <p>
            A estrutura foi pensada para ser escaneavel na superficie e detalhada na hora da
            revisao, sem transformar a ferramenta em um formulario pesado.
          </p>
        </div>

        <div className="journey-steps">
          {steps.map((step) => (
            <article key={step.step} className="journey-step">
              <p className="journey-step-index">{step.step}</p>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section value-section">
        <div className="value-section-copy">
          <p className="eyebrow">Beneficios principais</p>
          <h2>Mais sinal de produto. Menos atrito no refinamento.</h2>
          <p>
            O valor do {APP_NAME} nao esta em gerar texto bonito, e sim em organizar melhor a
            conversa entre quem define o problema e quem vai construir e validar a solucao.
          </p>
        </div>

        <div className="benefit-bands">
          {benefitBands.map((benefit) => (
            <article key={benefit.title} className="benefit-band">
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section audience-output-section">
        <article className="audience-panel">
          <p className="eyebrow">Para quem e</p>
          <h2>Feito para times que precisam escrever melhor sem desacelerar a operacao.</h2>
          <ul className="landing-list refined-list">
            {audience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="output-panel">
          <p className="eyebrow">O que a IA entrega</p>
          <h2>Uma base de trabalho pronta para revisao, nao uma resposta generica.</h2>
          <div className="output-list">
            {aiOutputs.map((item) => (
              <div key={item} className="output-list-item">
                <span className="output-bullet" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="landing-section plan-section">
        <article className="plan-highlight">
          <div>
            <p className="eyebrow">Plano inicial</p>
            <h2>Comece no Free para validar o fluxo real antes de qualquer expansao.</h2>
          </div>
          <p>
            O plano gratuito libera as primeiras geracoes, historico por usuario e revisao dentro
            do workspace. O suficiente para testar o produto com contexto real.
          </p>
        </article>
      </section>

      <section className="landing-section final-cta-section">
        <article className="final-cta-panel">
          <div className="final-cta-copy">
            <p className="eyebrow">Pronto para usar</p>
            <h2>Transforme briefing disperso em user stories mais confiaveis para o time inteiro.</h2>
            <p>
              Entre no workspace e comece a estruturar historias com uma experiencia mais proxima
              de produto do que de gerador isolado.
            </p>
          </div>

          <div className="hero-actions final-cta-actions">
            {user ? (
              <Link className="btn btn-primary" to="/tool">
                Ir para o workspace
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" to="/signup">
                  Criar conta gratis
                </Link>
                <Link className="btn btn-ghost" to="/login">
                  Ja tenho conta
                </Link>
              </>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

export default HomePage
