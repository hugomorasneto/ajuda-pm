import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../constants/app'
import { useEffect } from 'react'
import { trackEvent } from '../services/analyticsService'

const steps = [
  {
    title: 'Descreva contexto e requisitos',
    description: 'Informe problema de negocio e regras principais do fluxo.',
  },
  {
    title: 'Receba estrutura pronta',
    description: 'A IA gera titulo, objetivo, user story, criterios, gaps e checklist de QA.',
  },
  {
    title: 'Revise, edite e salve',
    description: 'Ajuste a historia, mantenha historico por conta e evolua com seu time.',
  },
]

const benefits = [
  {
    title: 'Historias mais claras',
    description: 'Menos ambiguidade para desenvolvimento e validacao funcional.',
  },
  {
    title: 'Velocidade no refinamento',
    description: 'Saia de texto solto para estrutura utilizavel em poucos minutos.',
  },
  {
    title: 'Consistencia de qualidade',
    description: 'Criterios observaveis e checklist de QA para reduzir retrabalho.',
  },
]

const audience = [
  'Product Managers que precisam acelerar discovery para entrega.',
  'Product Owners que refinam backlog com squads de engenharia.',
  'Profissionais em inicio de carreira que querem elevar a qualidade das historias.',
  'Times que precisam alinhar negocio, dev e QA com menos ruido.',
]

const aiOutputs = [
  'Titulo e objetivo orientados a valor.',
  'User story no formato ator, necessidade e beneficio.',
  'Criterios de aceitacao testaveis.',
  'Regras de negocio inferidas quando aplicavel.',
  'Gaps de informacao relevantes.',
  'Checklist de QA acionavel.',
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
      <section className="hero-card landing-hero">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>Escreva user stories melhores, com clareza para negocio, dev e QA.</h1>
        <p className="hero-description">
          O {APP_NAME} combina conteudo pratico com geracao assistida para transformar contexto de
          produto em historias estruturadas, revisaveis e prontas para execucao.
        </p>
        <div className="hero-actions">
          {user ? (
            <>
              <Link className="btn btn-primary" to="/tool">
                Acessar Workspace
              </Link>
              <Link className="btn btn-ghost" to="/user-stories">
                Ver Guia de User Stories
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn-primary" to="/signup">
                Criar Conta Gratis
              </Link>
              <Link className="btn btn-ghost" to="/login">
                Entrar
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-header">
          <p className="eyebrow">Como Funciona</p>
          <h2>Do problema ao backlog em um fluxo simples.</h2>
        </div>
        <div className="benefit-grid">
          {steps.map((step) => (
            <article key={step.title} className="benefit-card">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-header">
          <p className="eyebrow">Beneficios</p>
          <h2>Projetado para operacao real de produto.</h2>
        </div>
        <div className="benefit-grid">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="benefit-card">
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section split-section">
        <article className="panel panel-muted">
          <p className="eyebrow">Para Quem E</p>
          <h2>Feito para profissionais que precisam escrever melhor e alinhar rapido.</h2>
          <ul className="landing-list">
            {audience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel panel-muted">
          <p className="eyebrow">O Que A IA Entrega</p>
          <h2>Saida estruturada para apoiar refinamento e priorizacao.</h2>
          <ul className="landing-list">
            {aiOutputs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="landing-section">
        <article className="panel free-plan-panel">
          <p className="eyebrow">Plano Inicial</p>
          <h2>Comece no Free com limite de 10 geracoes por conta.</h2>
          <p>
            O plano gratuito ja permite validar o fluxo de ponta a ponta: gerar, editar, salvar e
            manter historico individual com seguranca por usuario.
          </p>
        </article>
      </section>

      <section className="landing-section final-cta">
        <article className="hero-card">
          <p className="eyebrow">Pronto Para Testar</p>
          <h2>Publique historias com mais consistencia e menos retrabalho.</h2>
          <p className="hero-description">
            Use o {APP_NAME} para estruturar melhores user stories desde ja, enquanto sua operacao de
            produto cresce.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link className="btn btn-primary" to="/tool">
                Ir para o Workspace
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" to="/signup">
                  Criar Conta Gratis
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
