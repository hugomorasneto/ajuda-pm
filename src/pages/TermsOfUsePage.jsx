import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'

const TERMS_LAST_UPDATED = '06/05/2026'
// TODO: revisar este e-mail quando o canal oficial de termos e suporte estiver definido.
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const termsSummary = [
  'Plataforma de apoio para histórias de usuário com IA',
  'Uso responsável de briefings, requisitos e artefatos de produto',
  'Respostas da IA como sugestões que exigem revisão humana',
  'Planos, limites, privacidade e canais oficiais de contato',
]

const termsSections = [
  {
    id: 'aceitacao-e-escopo',
    title: 'Aceitação e escopo',
    paragraphs: [
      'Estes Termos de Uso regulam o acesso e o uso do ProdForge, incluindo site, páginas públicas, cadastro, autenticação, Bancada, recursos com IA, histórico, projetos, materiais de aprendizado e funcionalidades relacionadas.',
      'Ao acessar ou usar o ProdForge, você declara que leu, entendeu e concorda com estes termos. Se não concordar com alguma condição, não use a plataforma.',
      'A versão publicada nesta página é a referência atual para o uso do produto. Recursos específicos podem ter regras complementares quando forem disponibilizados.',
    ],
  },
  {
    id: 'o-que-e-o-prodforge',
    title: 'O que é o ProdForge',
    paragraphs: [
      'O ProdForge é uma plataforma de apoio para criação, refinamento e organização de histórias de usuário com IA.',
      'O produto foi pensado para PMs, POs e times de produto, desenvolvimento e QA que precisam transformar contexto solto em artefatos mais claros, padronizados e fáceis de revisar.',
      'A plataforma ajuda a estruturar trabalho de produto, mas não substitui discovery, priorização, alinhamento com stakeholders, revisão técnica, validação de negócio ou decisão profissional do time.',
    ],
  },
  {
    id: 'uso-permitido-da-plataforma',
    title: 'Uso permitido da plataforma',
    paragraphs: [
      'Você pode usar o ProdForge para estruturar briefings, histórias de usuário, critérios de aceite, insights, perguntas de refinamento, riscos técnicos e outros artefatos relacionados a produto.',
      'O uso deve respeitar leis aplicáveis, direitos de terceiros, boas práticas de segurança e as limitações técnicas da plataforma.',
      'Você não deve usar o ProdForge para inserir, processar, armazenar ou gerar conteúdo ilegal, ofensivo, discriminatório, fraudulento, enganoso, sensível sem autorização ou que viole direitos de terceiros.',
    ],
  },
  {
    id: 'conta-e-acesso',
    title: 'Conta e acesso',
    paragraphs: [
      'Para usar algumas funcionalidades, você pode precisar criar uma conta e informar dados como nome, e-mail e senha. Você é responsável por manter essas informações corretas, atualizadas e sob seu controle.',
      'Proteja suas credenciais e não compartilhe acesso com pessoas não autorizadas. Todas as atividades realizadas pela sua conta podem ser atribuídas a você.',
      'O acesso ao ProdForge pode ser limitado, suspenso, alterado ou encerrado em caso de abuso, fraude, tentativa de burlar limites, uso indevido, risco à segurança, violação destes termos ou obrigação legal.',
      'Caso identifique acesso indevido, suspeita de vazamento ou uso não autorizado da sua conta, entre em contato pelo canal indicado nestes termos.',
    ],
  },
  {
    id: 'uso-de-inteligencia-artificial',
    title: 'Uso de inteligência artificial',
    paragraphs: [
      'O ProdForge pode usar serviços de IA para transformar briefings, regras, dores de negócio e contexto técnico em sugestões de histórias de usuário, critérios de aceite, perguntas de refinamento, insights técnicos e melhorias.',
      'As respostas geradas por IA são sugestões de apoio. Elas devem ser revisadas criticamente antes de uso profissional, publicação, envio para Jira, refinamento com stakeholders, entrega para desenvolvimento, QA ou tomada de decisão.',
      'A IA pode gerar respostas incompletas, imprecisas, desatualizadas, inconsistentes ou inadequadas em alguns casos, especialmente quando o contexto enviado estiver ambíguo, insuficiente ou sensível.',
      'O ProdForge não substitui julgamento profissional, discovery, alinhamento com stakeholders, validação com usuários, revisão técnica, análise jurídica, revisão de QA ou governança interna do seu time.',
    ],
    note: 'A decisão final sobre uso, adaptação, descarte e validação de qualquer conteúdo gerado é sempre do usuário.',
  },
  {
    id: 'conteudos-inseridos-pelo-usuario',
    title: 'Conteúdos inseridos pelo usuário',
    paragraphs: [
      'Você é responsável pelos conteúdos que insere na plataforma, incluindo briefings, problemas de negócio, regras, restrições, nomes, exemplos, critérios, arquivos copiados para campos de texto e qualquer informação enviada para geração ou melhoria.',
      'Não insira dados confidenciais, segredos comerciais, credenciais, informações estratégicas restritas, dados pessoais sensíveis ou informações de terceiros sem autorização adequada.',
      'Ao inserir conteúdo no ProdForge, você declara que tem direito ou autorização para usá-lo e que esse conteúdo não viola direitos de terceiros, confidencialidade, contratos, políticas internas ou leis aplicáveis.',
      'Esses conteúdos podem ser armazenados para histórico, continuidade do uso, recuperação de contexto, diagnóstico de falhas, prevenção de abuso e melhoria operacional da experiência, conforme descrito na Política de Privacidade.',
    ],
  },
  {
    id: 'planos-limites-e-recursos',
    title: 'Planos, limites e recursos',
    paragraphs: [
      'O ProdForge pode oferecer plano gratuito, planos pagos, limites de uso e recursos premium. Esses limites podem envolver geração com IA, histórico, projetos, membros, exportações, integrações, funcionalidades avançadas ou recursos experimentais.',
      'Recursos pagos podem depender de assinatura, convite, disponibilidade técnica, regras comerciais, configuração de conta ou integração com provedores de pagamento. Estes termos não prometem preço fixo, cobrança definitiva ou disponibilidade permanente de um recurso específico.',
      'Planos, limites, benefícios, preços, regras de uso e funcionalidades podem mudar conforme a evolução do produto, necessidades operacionais, custos de fornecedores, segurança e direção estratégica do ProdForge.',
    ],
  },
  {
    id: 'disponibilidade-e-mudancas',
    title: 'Disponibilidade e mudanças',
    paragraphs: [
      'Trabalhamos para manter o ProdForge disponível e funcional, mas não prometemos disponibilidade ininterrupta, ausência total de erros ou funcionamento perfeito em todos os dispositivos, navegadores, redes e cenários de uso.',
      'A plataforma pode passar por melhorias, ajustes, manutenção, indisponibilidades temporárias, mudanças técnicas, limitações de fornecedores, falhas externas ou alterações de funcionalidades.',
      'O ProdForge pode alterar estes termos futuramente para refletir mudanças no produto, em recursos, planos, fornecedores, integrações, práticas de segurança, uso de IA, monetização ou requisitos legais.',
      'Quando houver mudanças relevantes, poderemos destacar a atualização no site, na Bancada ou por outro canal apropriado. A data de última atualização indica a versão publicada nesta página.',
    ],
  },
  {
    id: 'responsabilidades-e-limitacoes',
    title: 'Responsabilidades e limitações',
    paragraphs: [
      'O ProdForge busca entregar uma experiência útil, segura e consistente, mas não garante que todo conteúdo gerado será perfeito, completo, correto, suficiente ou adequado para todos os contextos.',
      'O uso profissional de histórias de usuário, critérios de aceite, insights técnicos, perguntas de refinamento, documentos e demais artefatos gerados é responsabilidade do usuário.',
      'Na medida permitida pela legislação aplicável, o ProdForge não se responsabiliza por decisões de negócio, falhas de implementação, uso profissional sem revisão, perda de contexto, resultados indiretos, indisponibilidade temporária ou uso indevido da plataforma.',
    ],
  },
  {
    id: 'privacidade-e-preferencias',
    title: 'Privacidade, cookies e preferências',
    paragraphs: [
      'O tratamento de dados pessoais, dados de conta, conteúdos inseridos, histórico, cookies, analytics e preferências é descrito na Política de Privacidade do ProdForge.',
      'Você também pode revisar e alterar preferências de privacidade e cookies opcionais na página de Preferências de Privacidade, quando esses controles estiverem disponíveis para o seu navegador e contexto de uso.',
      'As escolhas de privacidade não autorizam uso indevido da plataforma nem eliminam a responsabilidade de revisar os dados que você decide inserir no ProdForge.',
    ],
    links: [
      { label: 'Ler a Política de Privacidade', to: '/politica-de-privacidade' },
      { label: 'Abrir Preferências de Privacidade', to: '/preferencias-de-privacidade' },
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

        {section.links?.length ? (
          <div className="privacy-policy-hero__actions" aria-label={`Links de ${section.title}`}>
            {section.links.map((link) => (
              <Link className="forge-button forge-button--tech forge-button--sm" key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

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
