import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'

const TERMS_LAST_UPDATED = '06/05/2026'
// TODO: revisar este e-mail quando o canal oficial de termos e suporte estiver definido.
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const termsSummary = [
  'Uso da Bancada, da área pública e dos recursos com IA',
  'Responsabilidade do usuário pelo conteúdo inserido',
  'Limites de uso gratuitos e recursos pagos futuros',
  'Respostas de IA como sugestões que exigem revisão humana',
]

const termsSections = [
  {
    id: 'aceitacao-dos-termos',
    title: 'Aceitação dos termos',
    paragraphs: [
      'Estes Termos de Uso regulam o acesso e o uso da plataforma ProdForge, incluindo site, páginas públicas, cadastro, autenticação, Bancada, geração com IA, histórico, formulários, materiais de aprendizado e recursos relacionados.',
      'Ao acessar ou usar o ProdForge, você declara que leu, entendeu e concorda com estes termos. Se não concordar com alguma condição, não use a plataforma.',
    ],
  },
  {
    id: 'sobre-o-prodforge',
    title: 'Sobre o ProdForge',
    paragraphs: [
      'O ProdForge é uma plataforma web com IA para ajudar Product Managers, POs e times de produto a criarem, melhorarem e padronizarem histórias de usuário, critérios de aceite, insights técnicos e sugestões de melhoria.',
      'O produto pode incluir recursos gratuitos, recursos pagos, limites de uso, histórico de versões, coleta de leads, materiais de aprendizado, autenticação e futuras integrações com ferramentas de produto, engenharia, atendimento, analytics ou pagamento.',
    ],
  },
  {
    id: 'cadastro-e-responsabilidade-da-conta',
    title: 'Cadastro e responsabilidade da conta',
    paragraphs: [
      'Para usar algumas funcionalidades, você pode precisar criar uma conta e informar dados como nome, e-mail e senha. Você é responsável por manter suas credenciais seguras e por todas as atividades realizadas na sua conta.',
      'Use informações verdadeiras, atualizadas e próprias. Caso identifique acesso indevido, suspeita de vazamento ou uso não autorizado da sua conta, entre em contato pelo canal indicado nestes termos.',
    ],
  },
  {
    id: 'uso-permitido-da-plataforma',
    title: 'Uso permitido da plataforma',
    paragraphs: [
      'Você pode usar o ProdForge para apoiar atividades legítimas de produto, como estruturar briefings, refinar histórias de usuário, revisar critérios de aceite, levantar riscos técnicos, organizar versões e melhorar a clareza de artefatos de backlog.',
      'O uso deve respeitar leis aplicáveis, direitos de terceiros, boas práticas de segurança e as limitações técnicas da plataforma. O ProdForge não deve ser usado para atividades ilícitas, abusivas, fraudulentas ou que prejudiquem outros usuários.',
    ],
  },
  {
    id: 'uso-de-inteligencia-artificial',
    title: 'Uso de inteligência artificial',
    paragraphs: [
      'O ProdForge pode usar serviços de IA para transformar briefings, regras, dores de negócio e contexto técnico em sugestões de histórias de usuário, critérios de aceite, perguntas de refinamento, insights técnicos e melhorias.',
      'As respostas geradas por IA são sugestões de apoio. Elas devem ser revisadas por você antes de uso profissional, publicação, envio para Jira, refinamento com stakeholders, entrega para desenvolvimento, QA ou tomada de decisão.',
      'Você não deve inserir dados sensíveis, confidenciais, estratégicos, credenciais, segredos comerciais, informações financeiras restritas, dados de saúde, dados de menores ou dados pessoais de terceiros sem autorização.',
    ],
    note: 'A IA pode errar, omitir contexto ou sugerir algo inadequado. A decisão final sobre uso, adaptação e validação do conteúdo é sempre do usuário.',
  },
  {
    id: 'conteudos-inseridos-pelo-usuario',
    title: 'Conteúdos inseridos pelo usuário',
    paragraphs: [
      'Você é responsável pelos conteúdos que insere na plataforma, incluindo briefings, problemas de negócio, regras, restrições, nomes, exemplos, critérios, arquivos copiados para campos de texto e qualquer informação enviada para geração ou melhoria.',
      'Ao inserir conteúdo no ProdForge, você declara que tem direito ou autorização para usá-lo e que esse conteúdo não viola direitos de terceiros, confidencialidade, contratos, políticas internas ou leis aplicáveis.',
      'Podemos processar esses conteúdos para entregar funcionalidades, gerar respostas, salvar histórico, melhorar a experiência, diagnosticar falhas, prevenir abuso e evoluir o produto conforme descrito na Política de Privacidade.',
    ],
  },
  {
    id: 'limites-da-versao-gratuita-e-recursos-premium',
    title: 'Limites da versão gratuita e recursos premium',
    paragraphs: [
      'O ProdForge pode oferecer uma versão gratuita com limites de uso, como quantidade de gerações, acesso a histórico, recursos avançados, projetos, membros, exportações, integrações ou funcionalidades experimentais.',
      'Recursos premium podem depender de assinatura, plano pago, convite, disponibilidade técnica, regras comerciais ou configuração específica da conta. Os limites, preços, benefícios e condições podem mudar conforme a evolução do produto.',
      'Funcionalidades gratuitas ou pagas podem ser alteradas, melhoradas, pausadas ou removidas quando necessário para manter a qualidade, segurança, viabilidade e direção do produto.',
    ],
  },
  {
    id: 'disponibilidade-do-servico',
    title: 'Disponibilidade do serviço',
    paragraphs: [
      'Trabalhamos para manter o ProdForge disponível e funcional, mas não prometemos disponibilidade ininterrupta, ausência total de erros ou funcionamento perfeito em todos os dispositivos, navegadores, redes e cenários de uso.',
      'A plataforma pode passar por manutenção, instabilidade, mudanças técnicas, ajustes de infraestrutura, limitações de fornecedores, falhas externas ou interrupções temporárias. Sempre que possível, buscaremos reduzir impacto e restaurar o serviço com agilidade.',
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: 'Propriedade intelectual',
    paragraphs: [
      'A marca ProdForge, identidade visual, interface, textos, fluxos, componentes, estrutura da plataforma, materiais públicos e elementos do produto pertencem aos seus respectivos titulares e são protegidos por direitos aplicáveis.',
      'Você mantém seus direitos sobre conteúdos que inserir na plataforma, respeitando as permissões necessárias para usá-los. Ao usar o ProdForge, você autoriza o processamento desses conteúdos para operação dos recursos solicitados e melhoria do produto, conforme aplicável.',
      'Você não pode copiar, revender, sublicenciar, desmontar, explorar comercialmente ou criar serviço concorrente a partir da plataforma sem autorização expressa.',
    ],
  },
  {
    id: 'condutas-proibidas',
    title: 'Condutas proibidas',
    paragraphs: [
      'Para proteger a experiência de todos, algumas condutas não são permitidas no ProdForge.',
    ],
    bullets: [
      'Tentar acessar contas, dados, projetos, histórico ou áreas administrativas sem autorização.',
      'Usar automações abusivas, engenharia reversa, scraping, sobrecarga, exploração de falhas ou tentativa de burlar limites de uso.',
      'Inserir conteúdo ilegal, discriminatório, ofensivo, violento, fraudulento, enganoso, sigiloso sem autorização ou que viole direitos de terceiros.',
      'Usar a plataforma para gerar spam, golpes, malware, instruções prejudiciais, assédio, violação de privacidade ou qualquer atividade ilícita.',
      'Remover avisos, mascarar identidade, simular relação com o ProdForge ou usar a marca sem permissão.',
    ],
  },
  {
    id: 'limitacao-de-responsabilidade',
    title: 'Limites da IA e ausência de garantia de resultado perfeito',
    paragraphs: [
      'O ProdForge é uma ferramenta de apoio para estruturação, refinamento e melhoria de artefatos de produto. O uso das respostas, sugestões, critérios, insights e materiais gerados depende da revisão e decisão do usuário.',
      'Não garantimos que uma história de usuário, critério de aceite, insight técnico ou sugestão gerada será correta, completa, adequada ao seu negócio, suficiente para implementação ou aceita por stakeholders.',
      'Na medida permitida pela legislação aplicável, o ProdForge não se responsabiliza por decisões de negócio, falhas de implementação, uso profissional sem revisão, perda de contexto, resultados indiretos, indisponibilidade temporária ou uso indevido da plataforma.',
    ],
  },
  {
    id: 'alteracoes-nos-termos',
    title: 'Alterações nos termos',
    paragraphs: [
      'Estes termos podem ser atualizados para refletir mudanças no produto, em recursos, planos, fornecedores, integrações, práticas de segurança, uso de IA, monetização ou requisitos legais aplicáveis.',
      'Quando houver mudanças relevantes, poderemos destacar a atualização no site, na Bancada ou por outro canal apropriado. A versão publicada nesta página indica a data da última atualização.',
    ],
  },
  {
    id: 'encerramento-de-acesso',
    title: 'Encerramento de acesso',
    paragraphs: [
      'Você pode deixar de usar o ProdForge a qualquer momento. Também podemos suspender, limitar ou encerrar acesso quando houver violação destes termos, risco à segurança, abuso, fraude, uso indevido, obrigação legal ou necessidade operacional relevante.',
      'Quando possível e adequado, buscaremos comunicar medidas que afetem o acesso. Algumas ações podem ser imediatas quando necessárias para proteger usuários, dados, infraestrutura ou integridade do produto.',
    ],
  },
  {
    id: 'contato',
    title: 'Contato',
    paragraphs: [
      'Para dúvidas, solicitações ou comentários sobre estes Termos de Uso, entre em contato pelo e-mail abaixo.',
    ],
    contact: CONTACT_EMAIL,
  },
]

function TermsSection({ section, index }) {
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

        {section.bullets?.length ? (
          <ul>
            {section.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {section.note ? <p className="privacy-policy-section__note">{section.note}</p> : null}

        {section.contact ? (
          <p className="privacy-policy-section__contact">
            <a href={`mailto:${section.contact}`}>{section.contact}</a>
          </p>
        ) : null}
      </div>
    </article>
  )
}

function TermsOfUsePage() {
  const pageDescription =
    'Conheça os termos que regulam o uso do ProdForge, incluindo cadastro, uso da Bancada, geração com IA, limites gratuitos e recursos pagos.'

  usePageMetadata({
    title: 'Termos de Uso | ProdForge',
    description: pageDescription,
    path: '/termos-de-uso',
    ogTitle: 'Termos de Uso | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Termos de Uso | ProdForge',
    twitterDescription: pageDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Termos de Uso',
      description: pageDescription,
      inLanguage: 'pt-BR',
      isPartOf: {
        '@type': 'WebSite',
        name: APP_NAME,
        url: 'https://prodforge.techtupa.com.br/',
      },
      dateModified: '2026-05-06',
    },
  })

  return (
    <div className="page privacy-policy-page terms-of-use-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Termos da Bancada</p>
          <h1>Termos de Uso</h1>
          <p>
            Estes termos regulam o uso do ProdForge e ajudam a deixar claro como a plataforma, a
            Bancada, os recursos com IA, os limites gratuitos e os recursos pagos devem ser usados
            com responsabilidade.
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--metal forge-button--md" to="/">
              Voltar para a página inicial
            </Link>
            <a className="forge-button forge-button--ghost forge-button--md" href={`mailto:${CONTACT_EMAIL}`}>
              Falar sobre os termos
            </a>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary" aria-label="Resumo dos termos">
          <p className="privacy-policy-hero__summary-label">Última atualização</p>
          <p className="privacy-policy-hero__summary-date">{TERMS_LAST_UPDATED}</p>
          <ul>
            {termsSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="privacy-policy-content">
        <aside className="privacy-policy-toc" aria-label="Seções dos Termos de Uso">
          <p className="privacy-policy-toc__title">Nestes termos</p>
          <nav>
            {termsSections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="privacy-policy-sections">
          <p className="privacy-policy-intro">
            Estes termos foram escritos em linguagem direta para orientar o uso do produto. Eles não
            substituem avaliação jurídica específica para contratos, exigências regulatórias ou regras
            internas da sua organização.
          </p>

          {termsSections.map((section, index) => (
            <TermsSection key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TermsOfUsePage
