import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'

const FAQ_LAST_UPDATED = '05/05/2026'
const FAQ_SCHEMA_QUESTION_TYPE = String.fromCharCode(81, 117, 101, 115, 116, 105, 111, 110)
const FAQ_SCHEMA_ANSWER_TYPE = String.fromCharCode(65, 110, 115, 119, 101, 114)

const faqSummary = [
  'O que o ProdForge faz e para quem foi criado',
  'Como a IA apoia sem substituir análise humana',
  'Privacidade, histórico, planos e próximos passos',
]

const faqCategories = [
  {
    id: 'sobre-o-prodforge',
    title: 'Sobre o ProdForge',
    description: 'Entenda a proposta do produto e quando ele faz sentido no dia a dia de produto.',
    items: [
      {
        id: 'o-que-e-o-prodforge',
        question: 'O que é o ProdForge?',
        answer:
          'O ProdForge é uma plataforma web com IA para ajudar times de produto a transformar ideias, problemas e contextos soltos em histórias de usuário mais claras, critérios de aceite objetivos, insights técnicos e sugestões de melhoria.',
      },
      {
        id: 'para-quem-foi-criado',
        question: 'Para quem o ProdForge foi criado?',
        answer:
          'Ele foi criado para PMs, POs, pessoas fundadoras, times pequenos e profissionais que precisam escrever histórias melhores, reduzir ruído com Dev e QA e organizar melhor o raciocínio de produto.',
      },
      {
        id: 'iniciantes-em-produto',
        question: 'Posso usar o ProdForge mesmo sendo iniciante em produto?',
        answer:
          'Sim. O ProdForge ajuda a estruturar pensamento, perguntas, critérios e próximos passos. Ele não exige domínio avançado, mas funciona melhor quando você revisa as sugestões e aprende com a estrutura gerada.',
      },
    ],
  },
  {
    id: 'uso-da-ia',
    title: 'Uso da IA',
    description: 'Veja como a inteligência artificial entra no processo sem assumir a decisão final.',
    items: [
      {
        id: 'substitui-pm-ou-po',
        question: 'O ProdForge substitui um Product Manager ou Product Owner?',
        answer:
          'Não. A IA funciona como copilota de produto. Ela ajuda a organizar informações e sugerir caminhos, mas não substitui discovery, contato com usuários, priorização, negociação de escopo ou decisão humana.',
      },
      {
        id: 'como-a-ia-ajuda',
        question: 'Como a IA ajuda na criação de histórias de usuário?',
        answer:
          'A IA pode transformar contexto em uma estrutura inicial de história, sugerir critérios de aceite, levantar riscos, apontar lacunas e propor melhorias de clareza para facilitar a revisão com produto, Dev e QA.',
      },
    ],
  },
  {
    id: 'historias-de-usuario',
    title: 'Histórias de usuário',
    description: 'Dúvidas sobre qualidade, revisão e informações necessárias para gerar bons artefatos.',
    items: [
      {
        id: 'prontas-para-desenvolvimento',
        question: 'As histórias geradas pela IA já estão prontas para desenvolvimento?',
        answer:
          'Elas são uma base de apoio, não uma entrega final automática. Antes de usar com Dev ou QA, revise contexto, regras, critérios de aceite, dependências, viabilidade técnica e alinhamento com prioridade do produto.',
      },
      {
        id: 'informacoes-para-boa-historia',
        question: 'Que tipo de informação eu devo inserir para gerar uma boa história?',
        answer:
          'Informe problema, objetivo, usuário impactado, contexto de negócio, comportamento esperado, regras conhecidas, restrições, exemplos e dúvidas em aberto. Quanto melhor o contexto, melhor tende a ser a sugestão.',
      },
    ],
  },
  {
    id: 'conta-e-acesso',
    title: 'Conta e acesso',
    description: 'Informações sobre cadastro, uso autenticado e histórico dentro da plataforma.',
    items: [
      {
        id: 'salva-historico',
        question: 'O ProdForge salva meu histórico?',
        answer:
          'Em áreas autenticadas, o ProdForge pode salvar histórico de gerações e versões para você retomar o trabalho. Algumas preferências públicas, como consentimento de privacidade, ficam salvas apenas no navegador.',
      },
    ],
  },
  {
    id: 'privacidade-e-dados',
    title: 'Privacidade e dados',
    description: 'Orientações rápidas sobre o que inserir, evitar e como revisar preferências.',
    items: [
      {
        id: 'dados-confidenciais',
        question: 'Posso inserir dados confidenciais, estratégicos ou dados pessoais?',
        answer:
          'Evite inserir dados sensíveis, confidenciais, estratégicos, credenciais, segredos comerciais ou dados pessoais de terceiros sem autorização. Use contexto suficiente para a IA ajudar sem expor informações indevidas.',
      },
      {
        id: 'alterar-preferencias',
        question: 'Como altero minhas preferências de privacidade?',
        answer:
          'Acesse a página de Preferências de Privacidade para aceitar todos os recursos, usar apenas essenciais ou redefinir sua escolha salva neste navegador.',
        action: { label: 'Abrir preferências', to: '/preferencias-de-privacidade' },
      },
    ],
  },
  {
    id: 'planos-e-limites',
    title: 'Planos e limites',
    description: 'O que já pode existir como limite e o que pode evoluir em recursos pagos.',
    items: [
      {
        id: 'versao-gratuita',
        question: 'Existe versão gratuita?',
        answer:
          'Sim, o produto pode oferecer uso gratuito com limites para validação. Esses limites podem envolver quantidade de gerações, acesso a histórico, projetos ou recursos avançados, conforme a evolução da plataforma.',
      },
      {
        id: 'recursos-premium',
        question: 'Quais recursos podem ser premium no futuro?',
        answer:
          'Recursos como histórico avançado, projetos, exportações, colaboração, integrações, limites maiores, modelos de análise e automações podem depender de plano pago ou assinatura no futuro.',
      },
      {
        id: 'integracoes',
        question: 'O ProdForge se integra com Jira, Miro ou outras ferramentas?',
        answer:
          'Integrações diretas podem entrar no roadmap, mas não devem ser consideradas disponíveis até serem anunciadas no produto. Hoje, o foco é gerar conteúdo claro para revisão e uso manual nos fluxos do time.',
      },
    ],
  },
  {
    id: 'suporte',
    title: 'Suporte',
    description: 'Canais para tirar dúvidas, enviar sugestões ou falar com o projeto.',
    items: [
      {
        id: 'entrar-em-contato',
        question: 'Como entro em contato em caso de dúvida?',
        answer:
          'Use a página de Contato para falar sobre suporte, privacidade, sugestões, parcerias ou assuntos comerciais. O canal oficial indicado na página é o e-mail de contato do ProdForge.',
        action: { label: 'Ir para contato', to: '/contato' },
      },
    ],
  },
]

const usefulLinks = [
  { label: 'Sobre o ProdForge', to: '/sobre' },
  { label: 'Contato', to: '/contato' },
  { label: 'Política de Privacidade', to: '/politica-de-privacidade' },
  { label: 'Termos de Uso', to: '/termos-de-uso' },
  { label: 'Preferências de Privacidade', to: '/preferencias-de-privacidade' },
]

function getFirstQuestionId() {
  const firstCategory = faqCategories[0]
  const firstItem = firstCategory?.items?.[0]
  return firstCategory && firstItem ? `${firstCategory.id}-${firstItem.id}` : null
}

function FaqItem({ item, categoryId, isOpen, onToggle, baseId }) {
  const itemKey = `${categoryId}-${item.id}`
  const triggerId = `${baseId}-trigger-${itemKey}`
  const panelId = `${baseId}-panel-${itemKey}`

  return (
    <article className="faq-page__item forge-panel forge-panel--metal">
      <button
        type="button"
        className="faq-page__trigger"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(itemKey)}
      >
        <span>{item.question}</span>
        <span className="faq-page__icon" aria-hidden="true">
          {isOpen ? '-' : '+'}
        </span>
      </button>

      <div
        className="faq-page__answer"
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
      >
        <p>{item.answer}</p>
        {item.action ? (
          <Link to={item.action.to} className="faq-page__answer-link">
            {item.action.label}
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function FaqCategory({ category, openItemId, onToggle, baseId }) {
  return (
    <section className="faq-page__category" id={category.id} aria-labelledby={`${category.id}-title`}>
      <div className="faq-page__category-header">
        <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Perguntas frequentes</p>
        <h2 id={`${category.id}-title`}>{category.title}</h2>
        <p>{category.description}</p>
      </div>

      <div className="faq-page__items">
        {category.items.map((item) => {
          const itemKey = `${category.id}-${item.id}`

          return (
            <FaqItem
              key={item.id}
              item={item}
              categoryId={category.id}
              isOpen={openItemId === itemKey}
              onToggle={onToggle}
              baseId={baseId}
            />
          )
        })}
      </div>
    </section>
  )
}

function FaqPage() {
  const baseId = useId()
  const { user } = useAuth()
  const [openItemId, setOpenItemId] = useState(() => getFirstQuestionId())

  const pageDescription =
    'Respostas rápidas sobre o ProdForge, uso de IA, histórias de usuário, conta, privacidade, planos, limites e suporte.'

  usePageMetadata({
    title: 'Perguntas Frequentes | ProdForge',
    description: pageDescription,
    path: '/faq',
    ogTitle: 'Perguntas Frequentes | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Perguntas Frequentes | ProdForge',
    twitterDescription: pageDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      name: 'Perguntas Frequentes',
      description: pageDescription,
      inLanguage: 'pt-BR',
      isPartOf: {
        '@type': 'WebSite',
        name: APP_NAME,
        url: 'https://prodforge.techtupa.com.br/',
      },
      dateModified: '2026-05-05',
      mainEntity: faqCategories.flatMap((category) =>
        category.items.map((item) => ({
          '@type': FAQ_SCHEMA_QUESTION_TYPE,
          name: item.question,
          acceptedAnswer: {
            '@type': FAQ_SCHEMA_ANSWER_TYPE,
            text: item.answer,
          },
        })),
      ),
    },
  })

  function handleToggle(itemId) {
    setOpenItemId((currentItemId) => (currentItemId === itemId ? null : itemId))
  }

  return (
    <div className="page privacy-policy-page faq-page">
      <section className="privacy-policy-hero faq-page__hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Dúvidas rápidas</p>
          <h1>Perguntas Frequentes</h1>
          <p>
            Respostas diretas sobre o ProdForge, uso de IA, histórias de usuário, conta, privacidade,
            planos e suporte para você entender o produto sem ruído.
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : '/signup'}>
              {user ? 'Abrir bancada' : 'Começar agora'}
            </Link>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/sobre">
              Conhecer o ProdForge
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary faq-page__summary" aria-label="Resumo do FAQ">
          <p className="privacy-policy-hero__summary-label">Nesta página</p>
          <p className="faq-page__summary-title">Objeções comuns, respostas claras</p>
          <ul>
            {faqSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">Atualizado em {FAQ_LAST_UPDATED}</p>
        </aside>
      </section>

      <div className="privacy-policy-content faq-page__content">
        <aside className="privacy-policy-toc faq-page__toc" aria-label="Categorias do FAQ">
          <p className="privacy-policy-toc__title">Categorias</p>
          <nav>
            {faqCategories.map((category, index) => (
              <a key={category.id} href={`#${category.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {category.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="faq-page__categories">
          {faqCategories.map((category) => (
            <FaqCategory
              key={category.id}
              category={category}
              openItemId={openItemId}
              onToggle={handleToggle}
              baseId={baseId}
            />
          ))}
        </div>
      </div>

      <section className="faq-page__cta forge-panel forge-panel--metal forge-texture-layer" aria-labelledby="faq-cta-title">
        <div>
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Ainda ficou dúvida?</p>
          <h2 id="faq-cta-title">Leve uma demanda real para a bancada</h2>
          <p>
            A forma mais rápida de entender o ProdForge é testar com um contexto real e revisar a
            história gerada antes de levar para Dev ou QA.
          </p>
        </div>

        <div className="faq-page__cta-actions">
          <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : '/signup'}>
            {user ? 'Abrir bancada' : 'Começar agora'}
          </Link>
          <Link className="forge-button forge-button--metal forge-button--md" to="/contato">
            Falar com contato
          </Link>
        </div>

        <nav className="faq-page__links" aria-label="Links úteis do FAQ">
          {usefulLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  )
}

export default FaqPage
