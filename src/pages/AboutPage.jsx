import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'

const ABOUT_LAST_UPDATED = '05/05/2026'

const heroSummary = [
  'Ideias brutas entram como contexto de produto',
  'A IA ajuda a organizar perguntas, riscos e critérios',
  'Histórias mais claras saem prontas para revisão humana',
]

const transformationSteps = [
  {
    title: 'Entrada bruta',
    description:
      'Problemas soltos, pedidos de negócio, mensagens de clientes, regras incompletas ou briefings que ainda precisam ganhar forma.',
  },
  {
    title: 'Forja do raciocínio',
    description:
      'O ProdForge ajuda a separar objetivo, contexto, usuário, comportamento esperado, critérios de aceite e pontos de atenção técnica.',
  },
  {
    title: 'Refino com IA',
    description:
      'A IA sugere histórias, critérios, perguntas e melhorias para acelerar a escrita sem tirar a responsabilidade de revisão do usuário.',
  },
  {
    title: 'História lapidada',
    description:
      'O resultado é uma base mais clara, acionável e consistente para conversar com desenvolvimento, QA, design e negócio.',
  },
]

const audienceCards = [
  {
    title: 'PMs e POs',
    description:
      'Para quem precisa transformar contexto de negócio em histórias de usuário mais objetivas, revisáveis e prontas para refinamento.',
  },
  {
    title: 'Fundadores e times enxutos',
    description:
      'Para equipes pequenas que precisam documentar decisões, alinhar escopo e evitar que cada entrega dependa de explicações soltas.',
  },
  {
    title: 'Times de produto em crescimento',
    description:
      'Para padronizar escrita, reduzir ruído entre áreas e criar uma base comum de critérios de aceite, hipóteses e próximos passos.',
  },
  {
    title: 'Profissionais em evolução',
    description:
      'Para quem está aprendendo a escrever histórias melhores e quer apoio para estruturar raciocínio de produto com mais segurança.',
  },
]

const aboutSections = [
  {
    id: 'o-que-e-o-prodforge',
    title: 'O que é o ProdForge',
    paragraphs: [
      'O ProdForge é uma plataforma web com IA para apoiar a criação, melhoria e padronização de histórias de usuário, critérios de aceite, insights técnicos e sugestões de melhoria.',
      'A proposta é simples: ideias brutas entram como contexto e saem como histórias mais claras, completas e acionáveis, prontas para revisão e conversa com o time.',
    ],
  },
  {
    id: 'por-que-ele-existe',
    title: 'Por que ele existe',
    paragraphs: [
      'Muitos times perdem tempo porque demandas chegam vagas, critérios ficam subjetivos e o alinhamento entre produto, desenvolvimento e QA acontece tarde demais.',
      'O ProdForge existe para reduzir retrabalho, melhorar comunicação e ajudar profissionais de produto a estruturar melhor o que precisa ser entendido antes da entrega.',
    ],
  },
  {
    id: 'para-quem-foi-criado',
    title: 'Para quem foi criado',
    paragraphs: [
      'O produto foi criado para Product Managers, POs, fundadores, times pequenos e profissionais que precisam escrever histórias melhores sem criar burocracia desnecessária.',
      'Ele também ajuda quem está amadurecendo a prática de produto e precisa de uma referência clara para transformar problema, contexto e regra de negócio em artefatos úteis.',
    ],
  },
  {
    id: 'como-a-ia-ajuda',
    title: 'Como a IA ajuda',
    paragraphs: [
      'A IA atua como copiloto de produto. Ela pode sugerir histórias, levantar perguntas, organizar critérios de aceite, destacar riscos técnicos e propor melhorias de clareza.',
      'Esse apoio acelera a escrita e ajuda a revelar lacunas, mas não substitui julgamento, validação com usuários, análise de prioridade ou entendimento real do negócio.',
    ],
  },
  {
    id: 'o-que-o-prodforge-nao-substitui',
    title: 'O que o ProdForge não substitui',
    paragraphs: [
      'O ProdForge não substitui discovery, contato com usuários, priorização humana, decisão de produto, alinhamento com engenharia ou revisão profissional antes de levar uma história para execução.',
      'As sugestões geradas pela IA devem ser tratadas como apoio. O usuário continua responsável por revisar, adaptar e decidir o que faz sentido para seu contexto.',
    ],
  },
  {
    id: 'nossa-visao',
    title: 'Nossa visão',
    paragraphs: [
      'Acreditamos que bons produtos nascem de clareza, contexto e colaboração. Uma história bem escrita não é apenas um texto melhor: é uma conversa mais objetiva entre pessoas que precisam construir juntas.',
      'Nossa visão é tornar a criação de artefatos de produto mais acessível, consistente e útil para quem precisa sair de uma ideia inicial até uma entrega bem compreendida.',
    ],
  },
  {
    id: 'proximos-passos-do-produto',
    title: 'Próximos passos do produto',
    paragraphs: [
      'O ProdForge deve evoluir com recursos de histórico mais robusto, padronização por projetos, melhores fluxos de aprendizado, limites de uso mais claros e possíveis integrações com ferramentas de trabalho.',
      'Essas evoluções serão feitas de forma gradual, preservando a ideia central: menos ruído, mais clareza e mais apoio para transformar contexto em histórias melhores.',
    ],
  },
]

const productPrinciples = [
  'Clareza antes de volume',
  'IA como apoio, não como decisão final',
  'Critérios de aceite mais objetivos',
  'Menos retrabalho entre produto, Dev e QA',
]

function AboutSection({ section, index }) {
  return (
    <article className="privacy-policy-section forge-panel forge-panel--metal" id={section.id}>
      <div className="privacy-policy-section__header">
        <span className="privacy-policy-section__index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2>{section.title}</h2>
      </div>

      <div className="privacy-policy-section__body">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

function AboutPage() {
  const { user } = useAuth()
  const pageDescription =
    'Conheça o ProdForge, plataforma com IA que ajuda times de produto a transformar ideias brutas em histórias de usuário mais claras, completas e acionáveis.'

  usePageMetadata({
    title: 'Sobre o ProdForge | ProdForge',
    description: pageDescription,
    path: '/sobre',
    ogTitle: 'Sobre o ProdForge | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Sobre o ProdForge | ProdForge',
    twitterDescription: pageDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Sobre o ProdForge',
      description: pageDescription,
      inLanguage: 'pt-BR',
      isPartOf: {
        '@type': 'WebSite',
        name: APP_NAME,
        url: 'https://prodforge.techtupa.com.br/',
      },
      dateModified: '2026-05-05',
    },
  })

  return (
    <div className="page privacy-policy-page about-page">
      <section className="privacy-policy-hero about-page__hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Oficina de produto com IA</p>
          <h1>Sobre o ProdForge</h1>
          <p>
            O ProdForge ajuda Product Managers, POs e times de produto a transformar
            ideias, problemas e contextos soltos em histórias de usuário mais claras, completas e
            acionáveis.
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : '/signup'}>
              {user ? 'Abrir bancada' : 'Experimentar a ferramenta'}
            </Link>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/">
              Voltar para a página inicial
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary about-page__summary" aria-label="Resumo sobre o ProdForge">
          <p className="privacy-policy-hero__summary-label">Da ideia à história</p>
          <p className="about-page__summary-title">Forjar clareza para times de produto</p>
          <ul>
            {heroSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">Atualizado em {ABOUT_LAST_UPDATED}</p>
        </aside>
      </section>

      <section className="about-page__flow forge-panel forge-panel--metal" aria-labelledby="about-flow-title">
        <div className="about-page__section-header">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Processo de forja</p>
          <h2 id="about-flow-title">Da ideia bruta à história lapidada</h2>
          <p>
            A página inicial mostra a promessa do produto. Aqui, a ideia é explicar como essa
            transformação acontece na prática, sem transformar IA em resposta definitiva.
          </p>
        </div>

        <div className="about-page__flow-grid">
          {transformationSteps.map((step, index) => (
            <article className="about-page__flow-step" key={step.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-page__audience" aria-labelledby="about-audience-title">
        <div className="about-page__section-header">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Criado para construir melhor</p>
          <h2 id="about-audience-title">Para quem o ProdForge faz sentido</h2>
        </div>

        <div className="about-page__cards">
          {audienceCards.map((card) => (
            <article className="about-page__card forge-panel forge-panel--metal" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="privacy-policy-content about-page__content">
        <aside className="privacy-policy-toc about-page__toc" aria-label="Seções sobre o ProdForge">
          <p className="privacy-policy-toc__title">Nesta página</p>
          <nav>
            {aboutSections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="privacy-policy-sections">
          <p className="privacy-policy-intro">
            O ProdForge não nasceu para trocar conversa por automação. Ele existe para dar forma ao
            raciocínio de produto, reduzir ruído e ajudar pessoas a chegarem mais preparadas ao
            refinamento.
          </p>

          {aboutSections.map((section, index) => (
            <AboutSection key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>

      <section className="about-page__principles forge-panel forge-panel--metal" aria-labelledby="about-principles-title">
        <div className="about-page__section-header">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">Princípios do produto</p>
          <h2 id="about-principles-title">O que guia a construção</h2>
        </div>

        <ul>
          {productPrinciples.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <section className="about-page__cta forge-panel forge-panel--metal forge-texture-layer" aria-labelledby="about-cta-title">
        <div>
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Próximo refinamento</p>
          <h2 id="about-cta-title">Teste a forja com uma demanda real</h2>
          <p>
            Traga um briefing, uma regra de negócio ou uma ideia ainda solta. O ProdForge ajuda a
            transformar esse material em uma base mais clara para discussão.
          </p>
        </div>

        <div className="about-page__cta-actions">
          <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : '/signup'}>
            {user ? 'Abrir bancada' : 'Criar conta grátis'}
          </Link>
          <Link className="forge-button forge-button--metal forge-button--md" to="/contato">
            Falar com o ProdForge
          </Link>
        </div>

        <nav className="about-page__links" aria-label="Links úteis sobre o ProdForge">
          <Link to="/contato">Contato</Link>
          <Link to="/politica-de-privacidade">Política de Privacidade</Link>
          <Link to="/termos-de-uso">Termos de Uso</Link>
        </nav>
      </section>
    </div>
  )
}

export default AboutPage
