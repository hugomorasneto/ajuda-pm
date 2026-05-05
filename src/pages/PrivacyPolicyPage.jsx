import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'

const POLICY_LAST_UPDATED = '05/05/2026'
// TODO: revisar este e-mail quando o canal oficial de privacidade estiver definido.
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const policySummary = [
  'Dados de conta, autenticação e uso da plataforma',
  'Briefings, histórias de usuário e critérios de aceite inseridos na Bancada',
  'Dados técnicos de navegação, segurança e analytics',
  'Processamento por serviços de IA para apoiar a geração de artefatos',
]

const policySections = [
  {
    id: 'quem-somos',
    title: 'Quem somos',
    paragraphs: [
      'O ProdForge é uma plataforma web com IA para ajudar Product Managers, POs e times de produto a criarem, melhorarem e padronizarem histórias de usuário, critérios de aceite, insights técnicos e sugestões de melhoria.',
      'Esta Política de Privacidade descreve como o ProdForge coleta, usa, armazena e protege dados durante o uso do site, da área pública, da Bancada, dos formulários e dos recursos relacionados ao produto.',
    ],
  },
  {
    id: 'quais-dados-podemos-coletar',
    title: 'Quais dados podemos coletar',
    paragraphs: [
      'Podemos coletar dados informados diretamente por você, dados gerados pelo uso do produto e dados técnicos necessários para manter a plataforma funcionando com segurança.',
    ],
    bullets: [
      'Dados de cadastro e autenticação, como nome, e-mail, senha protegida pelo provedor de autenticação, plano, função e identificadores de conta.',
      'Conteúdos inseridos nos formulários, como briefings, problemas de negócio, regras, restrições, histórias de usuário, critérios de aceite, observações técnicas e contexto de projeto.',
      'Histórico de uso, versões geradas, preferências, projetos, membros convidados e ações realizadas na Bancada.',
      'Dados técnicos de navegação, como páginas acessadas, eventos de interação, dispositivo, navegador, endereço IP aproximado, data, hora e registros necessários para segurança e diagnóstico.',
      'Dados de comunicação, como mensagens enviadas por formulários, cadastros em listas de interesse e solicitações feitas por e-mail.',
      'Informações necessárias para eventual monetização, assinatura, limite de uso, faturamento, prevenção a fraude e gestão de plano, quando esses recursos estiverem disponíveis.',
    ],
  },
  {
    id: 'como-usamos-os-dados',
    title: 'Como usamos os dados',
    paragraphs: [
      'Usamos os dados para entregar a experiência principal do ProdForge, manter a plataforma segura e melhorar a qualidade do produto.',
    ],
    bullets: [
      'Criar e manter sua conta, autenticar acesso e liberar recursos da Bancada.',
      'Gerar, revisar, salvar, versionar e organizar histórias de usuário, critérios de aceite, insights técnicos e sugestões de melhoria.',
      'Entender uso, desempenho, erros e pontos de fricção para melhorar fluxos, copy, interface, modelos e recursos do produto.',
      'Enviar comunicações relacionadas à conta, confirmação de e-mail, novidades do produto, respostas a solicitações e avisos importantes.',
      'Proteger a plataforma contra abuso, fraude, acesso indevido, falhas operacionais e uso que prejudique outros usuários.',
      'Gerenciar limites de uso, planos, recursos pagos ou experimentais, quando aplicável.',
    ],
  },
  {
    id: 'uso-de-inteligencia-artificial',
    title: 'Uso de inteligência artificial',
    paragraphs: [
      'Dados inseridos pelo usuário podem ser processados por serviços de IA para gerar, melhorar ou complementar histórias de usuário, critérios de aceite, insights técnicos, perguntas de refinamento e sugestões de melhoria.',
      'A qualidade das respostas depende do contexto enviado. Por isso, revise todo conteúdo gerado antes de usar em backlog, documentação, Jira, discovery, refinamento ou comunicação com stakeholders.',
      'Você não deve inserir informações sensíveis, confidenciais, segredos comerciais, credenciais, dados financeiros restritos, dados de saúde, dados de menores ou dados pessoais de terceiros sem autorização.',
    ],
    note: 'Sempre que possível, remova ou anonimize informações pessoais antes de enviar um briefing para processamento por IA.',
  },
  {
    id: 'cookies-analytics-e-tecnologias-semelhantes',
    title: 'Arquivos de navegação, analytics e tecnologias semelhantes',
    paragraphs: [
      'Podemos usar arquivos de navegação, armazenamento local, identificadores técnicos, eventos de analytics e tecnologias semelhantes para autenticação, segurança, manutenção de sessão, medição de uso e melhoria da experiência.',
      'Essas tecnologias ajudam a entender quais páginas e fluxos são mais usados, identificar erros, medir conversões e evoluir o produto com base em sinais agregados. Você pode controlar esses arquivos e permissões pelo seu navegador, embora alguns recursos essenciais possam deixar de funcionar corretamente.',
    ],
  },
  {
    id: 'compartilhamento-de-dados',
    title: 'Compartilhamento de dados',
    paragraphs: [
      'Não usamos dados pessoais como produto para venda de bases a terceiros. Podemos compartilhar dados apenas quando isso for necessário para operar, proteger, analisar ou melhorar o ProdForge.',
    ],
    bullets: [
      'Provedores de infraestrutura, hospedagem, banco de dados, autenticação, envio de e-mail, monitoramento e analytics.',
      'Serviços de IA usados para processar instruções, briefings e respostas necessárias às funcionalidades da plataforma.',
      'Ferramentas de pagamento, faturamento, prevenção a fraude e gestão de planos, quando recursos pagos estiverem disponíveis.',
      'Autoridades públicas, quando houver obrigação legal, ordem válida ou necessidade de proteção de direitos, segurança e integridade do produto.',
    ],
  },
  {
    id: 'seguranca-das-informacoes',
    title: 'Segurança das informações',
    paragraphs: [
      'Adotamos medidas técnicas e organizacionais compatíveis com o estágio do produto para proteger informações contra acesso não autorizado, perda, uso indevido, alteração ou divulgação indevida.',
      'Essas medidas podem incluir autenticação, controle de acesso, registros de auditoria, políticas de permissão, isolamento por usuário ou projeto, monitoramento de erros e uso de provedores reconhecidos de infraestrutura. Nenhuma plataforma, porém, consegue prometer segurança absoluta.',
    ],
  },
  {
    id: 'retencao-dos-dados',
    title: 'Retenção dos dados',
    paragraphs: [
      'Mantemos dados pelo tempo necessário para fornecer o produto, cumprir obrigações operacionais, preservar histórico solicitado pelo usuário, resolver disputas, prevenir abuso e atender requisitos legais ou regulatórios quando aplicável.',
      'Conteúdos salvos na Bancada, versões e histórico podem permanecer associados à conta enquanto forem úteis para a experiência do produto. Quando uma exclusão for solicitada, avaliaremos o pedido conforme a viabilidade técnica, obrigações aplicáveis e necessidade de preservar registros mínimos de segurança.',
    ],
  },
  {
    id: 'direitos-do-usuario',
    title: 'Direitos do usuário',
    paragraphs: [
      'Você pode solicitar informações sobre dados associados à sua conta e, quando aplicável, pedir correção, atualização, exclusão, restrição de uso ou esclarecimentos sobre o tratamento realizado pelo ProdForge.',
      'Também pode deixar de usar a plataforma, cancelar comunicações opcionais e solicitar orientação sobre dados inseridos na Bancada. Alguns pedidos podem depender de validação de identidade ou de limitações técnicas, operacionais e legais.',
    ],
  },
  {
    id: 'contato',
    title: 'Contato',
    paragraphs: [
      'Para dúvidas, solicitações ou comentários sobre privacidade e uso de dados no ProdForge, entre em contato pelo e-mail abaixo.',
    ],
    contact: CONTACT_EMAIL,
  },
  {
    id: 'atualizacoes-desta-politica',
    title: 'Atualizações desta política',
    paragraphs: [
      'Esta política pode ser atualizada para refletir mudanças no produto, em fornecedores, funcionalidades, práticas de segurança, analytics, IA, monetização ou requisitos legais aplicáveis.',
      'Quando houver mudanças relevantes, poderemos destacar a atualização no site, na Bancada ou por outro canal apropriado. A versão publicada nesta página indica a data da última atualização.',
    ],
  },
]

function PrivacySection({ section, index }) {
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

function PrivacyPolicyPage() {
  const pageDescription =
    'Entenda como o ProdForge coleta, usa, armazena e protege dados em formulários, autenticação, analytics, recursos de IA e fluxos da Bancada.'

  usePageMetadata({
    title: 'Política de Privacidade | ProdForge',
    description: pageDescription,
    path: '/politica-de-privacidade',
    ogTitle: 'Política de Privacidade | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Política de Privacidade | ProdForge',
    twitterDescription: pageDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Política de Privacidade',
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
    <div className="page privacy-policy-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Privacidade e dados</p>
          <h1>Política de Privacidade</h1>
          <p>
            Esta página descreve como o ProdForge coleta, usa, armazena e protege dados ao transformar
            briefings, regras e contexto de produto em histórias de usuário, critérios de aceite,
            insights técnicos e sugestões de melhoria.
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--metal forge-button--md" to="/">
              Voltar para a página inicial
            </Link>
            <a className="forge-button forge-button--ghost forge-button--md" href={`mailto:${CONTACT_EMAIL}`}>
              Falar sobre dados
            </a>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary" aria-label="Resumo da política">
          <p className="privacy-policy-hero__summary-label">Última atualização</p>
          <p className="privacy-policy-hero__summary-date">{POLICY_LAST_UPDATED}</p>
          <ul>
            {policySummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="privacy-policy-content">
        <aside className="privacy-policy-toc" aria-label="Seções da Política de Privacidade">
          <p className="privacy-policy-toc__title">Nesta política</p>
          <nav>
            {policySections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="privacy-policy-sections">
          <p className="privacy-policy-intro">
            A política foi escrita em linguagem direta para explicar práticas atuais e esperadas do
            produto. Ela não promete conformidade jurídica absoluta nem substitui avaliação jurídica
            específica para casos sensíveis, contratos ou exigências regulatórias do seu negócio.
          </p>

          {policySections.map((section, index) => (
            <PrivacySection key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
