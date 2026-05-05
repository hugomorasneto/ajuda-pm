import { APP_NAME, FREE_GENERATION_LIMIT, FREE_PLAN_NAME, PRO_PLAN_NAME } from '../constants/app'

export const landingCopy = {
  contextStrip: [
    {
      icon: 'bolt',
      value: '60 segundos',
      description: 'Da demanda vaga a uma primeira story revisável.',
    },
    {
      icon: 'check',
      value: 'Critérios e trincas',
      description: 'Aceite, pontos frágeis e QA no mesmo fluxo.',
    },
    {
      icon: 'unlock',
      value: 'Comece grátis',
      description: 'Teste com contexto real, sem cartão.',
    },
  ],
  hero: {
    eyebrow: 'Feito para PMs e times de produto',
    title: 'Transforme briefing confuso em story clara.',
    description:
      'A IA organiza contexto, objetivo, critérios e riscos para PMs, Devs e QAs trabalharem com menos ruído.',
    microcopy: 'Grátis para começar · Sem cartão · Resultado em 60 segundos',
    trustSignals: [
      'Grátis para começar',
      'Sem cartão',
      'Criado para PMs, POs, Devs e QA',
      'Gera critérios, trincas e checklist de validação',
      'Cópia em Markdown e formato para Jira',
    ],
    stats: [
      { value: '60 segundos', label: 'da demanda vaga a uma story pronta para revisão' },
      { value: 'Critérios + trincas', label: 'acabamento e pontos frágeis mapeados no mesmo fluxo' },
      { value: '100% grátis', label: 'para começar sem cartão e validar com contexto real' },
    ],
    preview: {
      imageAlt:
        'Forja tecnológica transformando briefing em user story clara na ProdForge',
      problemLabel: 'Briefing bruto',
      problemTitle: 'Domínio corporativo no onboarding B2B',
      problemItems: [
        'Usuários avançam com domínio inválido e geram retrabalho.',
        'Dev e QA ainda não têm regras e critérios claros para revisar o fluxo.',
      ],
      problemStatus: 'Entrada vaga',
      transitionLabel: 'A forja trabalha',
      furnaceTitle: 'Forjando...',
      furnaceBody: 'Analisando, estruturando e refinando a entrada para revisão do time.',
      storyLabel: 'Story estruturada',
      storyTitle: 'Validar domínio corporativo no onboarding B2B',
      outputPills: ['Objetivo', 'Critérios', 'QA'],
      objectiveLabel: 'Objetivo',
      objective:
        'Validar domínio elegível antes de concluir o cadastro inicial.',
      criteriaLabel: 'Critérios de aceite',
      criteria: [
        'Bloquear avanço com domínio em formato inválido.',
        'Exibir mensagem orientando a correção sem perder os dados preenchidos.',
      ],
      qualityLabel: 'Nível de refinamento',
      qualityValue: '82%',
      readyLabel: 'Pronta',
      gapsLabel: 'Impurezas para decidir',
      gaps: ['Confirmar exceções para domínios parceiros.'],
      qaLabel: 'Inspeção final',
      qa: [
        'Testar domínio válido, inválido e preservação dos dados.',
      ],
      footerHighlights: ['Objetivo claro', 'Checklist pronto'],
    },
  },
  workflow: {
    eyebrow: 'Como funciona',
    title: 'Do briefing confuso à story pronta em 3 passos.',
    description:
      'Uma sequência curta para organizar contexto, forjar a primeira versão e revisar antes do backlog.',
    steps: [
      {
        step: '01',
        title: 'Cole o contexto real',
        description:
      'Cole a demanda como ela é hoje: regras de negócio, dependências e contexto.',
      },
      {
        step: '02',
        title: 'A forja trabalha',
        description:
          'O ProdForge estrutura objetivo, story, critérios, trincas e teste de resistência no mesmo fluxo.',
      },
      {
        step: '03',
        title: 'Receba a story pronta',
        description:
          'Revise com mais clareza antes de enviar ao backlog e reduzir ruído entre produto, dev e QA.',
      },
    ],
  },
  beforeAfter: {
    eyebrow: 'Antes e depois',
    title: 'Menos ruído. Mais clareza. Entregas melhores.',
    description:
      'Veja como uma demanda solta vira uma story clara, com objetivo, comportamento esperado e critérios de aceite.',
    transition: {
      copy: 'A IA organiza o caos em uma estrutura clara.',
      label: 'Transformação de demanda vaga em user story estruturada',
    },
    before: {
      label: 'Antes',
      title: 'Demanda vaga',
      story: 'Melhorar onboarding para empresas e validar domínio no cadastro.',
      issues: [
        'Não diz qual problema precisa ser resolvido.',
        'Não define o comportamento esperado para o usuário.',
        'Não traz critérios de aceite nem exceções.',
      ],
    },
    after: {
      label: 'Depois',
      statusLabel: 'Pronto para refinamento',
      title: 'User story estruturada',
      indicators: ['Objetivo claro', 'User story', 'Critérios de aceite', 'Gaps identificados'],
      objective:
        'Reduzir cadastros inconsistentes e dar previsibilidade ao time operacional no onboarding B2B.',
      story:
        'Como pessoa responsável pelo cadastro de uma empresa, quero validar o domínio corporativo durante o onboarding para concluir o registro com menos retrabalho.',
      criteria: [
        'Permitir avanço apenas quando o domínio estiver em formato válido.',
        'Exibir mensagem clara quando o domínio não puder ser aceito.',
      ],
      notes: 'Gap visível: confirmar a lista inicial de exceções para parceiros.',
      scoreLabel: 'Pronta para priorizar',
      scoreValue: '91%',
    },
  },
  benefits: {
    eyebrow: 'Produto, desenvolvimento e QA',
    title: 'Cada papel com menos ruído e mais contexto.',
    description:
      'A ProdForge transforma briefing confuso em uma base clara para produto, desenvolvimento e QA trabalharem no mesmo artefato.',
    items: [
      {
        role: 'PM/PO',
        tone: 'pm',
        image: 'pm-strategist-forge',
        imageAlt: 'Estrategista de produto representando clareza e priorização na ProdForge',
        title: 'PM/PO: estratégia sem perder contexto',
        description: 'Organize problema, objetivo, impacto e regras antes da story chegar ao time.',
        benefits: [
          'Menos briefing solto',
          'Mais clareza de decisão',
          'Melhor alinhamento com negócio',
        ],
      },
      {
        role: 'Dev',
        tone: 'dev',
        image: 'dev-forgemaster-blade',
        imageAlt: 'Engenheiro representando implementação clara com apoio da ProdForge',
        title: 'Dev: implementação com menos adivinhação',
        description: 'Receba histórias com comportamento esperado, critérios de aceite e restrições explícitas.',
        benefits: [
          'Menos retrabalho',
          'Menos dúvida no refinamento',
          'Mais previsibilidade técnica',
        ],
      },
      {
        role: 'QA',
        tone: 'qa',
        image: 'qa-guardian-shield',
        imageAlt: 'Guardião de qualidade representando validação e critérios de aceite na ProdForge',
        title: 'QA: validação antes do problema virar bug',
        description: 'Use critérios e cenários mais claros para testar fluxos principais, exceções e regras críticas.',
        benefits: [
          'Critérios mais testáveis',
          'Exceções mais visíveis',
          'Menos falhas escapando',
        ],
      },
    ],
  },
  learningTeaser: {
    eyebrow: 'Campo de Treino ProdForge',
    title: 'Aprenda enquanto faz.',
    description:
      'Guia do ferreiro PM para entender o conceito e ir direto para a ferramenta, com exemplos reais de backlog.',
    footer:
      'Cada guia traz um caminho prático para você sair da teoria e aplicar no seu fluxo real de trabalho.',
  },
  pricing: {
    eyebrow: 'Planos',
    title: 'Comece grátis. Escale quando precisar.',
    description: 'Comece sem cartão. Evolua quando o time precisar de mais padrão e profundidade.',
    free: {
      name: FREE_PLAN_NAME,
      badge: 'Grátis',
      description: 'Para validar o fluxo com contexto real e sair do texto solto.',
      items: [
        `${FREE_GENERATION_LIMIT} forjas de user story por conta.`,
        'Peças forjadas por usuário.',
        'Fluxo básico de inspeção na bancada.',
      ],
    },
    pro: {
      name: PRO_PLAN_NAME,
      badge: 'Mais popular',
      description: 'Para times que precisam de mais escala, padrão e profundidade.',
      items: [
        'Mais forjas e mais versões por fluxo.',
        'Comparação de versões e exportações avançadas.',
        'Padrões do time, templates e integrações futuras.',
      ],
    },
  },
  leadCapture: {
    eyebrow: `Interesse no plano ${PRO_PLAN_NAME}`,
    title: `Quer testar o plano ${PRO_PLAN_NAME}?`,
    description:
      'Construído para PMs e POs que querem sair do briefing solto e chegar em stories claras, revisáveis e prontas para o time.',
    formTitle: 'Entre na lista de interesse',
    formDescription:
      `Cadastre seu e-mail para receber novidades do plano ${PRO_PLAN_NAME}, expansão de integrações e convites de acesso antecipado.`,
    buttonLabel: 'Avise quando abrir',
    note: 'Sem spam. Apenas novidades relevantes sobre o produto.',
  },
  faq: {
    eyebrow: 'Dúvidas rápidas',
    title: 'Antes de abrir a Bancada.',
    description:
      'Respostas diretas para testar a ProdForge com clareza e sem promessas infladas.',
    items: [
      {
        question: 'Preciso cadastrar cartão para testar?',
        answer: 'Não. Você pode começar grátis e testar a Bancada sem cartão.',
      },
      {
        question: 'A ProdForge substitui o PM ou PO?',
        answer:
          'Não. A IA estrutura o raciocínio, sugere critérios e aponta gaps, mas a decisão continua com o time.',
      },
      {
        question: 'Posso usar com Devs e QAs?',
        answer:
          'Sim. A saída da ProdForge foi pensada para facilitar refinamento, desenvolvimento e validação, com critérios de aceite, trincas e testes de resistência.',
      },
      {
        question: 'Meus briefings ficam salvos?',
        answer:
          'As peças geradas podem ser salvas no histórico da sua conta. Evite inserir dados sensíveis em testes iniciais.',
      },
      {
        question: 'A ProdForge já integra com Jira?',
        answer:
          'A ProdForge já entrega uma estrutura pronta para copiar e levar para ferramentas como Jira. Integrações diretas fazem parte do planejamento do produto.',
      },
      {
        question: 'O que é uma peça forjada?',
        answer:
          'É a user story estruturada pela ProdForge a partir da sua matéria-prima: briefing, problema, regras e contexto.',
      },
    ],
  },
  finalCta: {
    eyebrow: 'Pronto para começar',
    title: 'Seu próximo sprint começa com uma história melhor.',
    description:
      'Sua IA organiza briefing, contexto e critérios para transformar ruído em uma story clara antes do time começar a desenvolver.',
  },
}
