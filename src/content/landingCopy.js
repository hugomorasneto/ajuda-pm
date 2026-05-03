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
      value: 'Critérios e gaps',
      description: 'Aceite, pontos em aberto e QA no mesmo fluxo.',
    },
    {
      icon: 'unlock',
      value: 'Comece grátis',
      description: 'Teste com contexto real, sem cartão.',
    },
  ],
  hero: {
    eyebrow: 'Feito para PMs e times de produto',
    title: 'Transforme briefings confusos em user stories claras que o time entende na primeira leitura.',
    description:
      'A demanda entra bruta. A IA forja a estrutura com objetivo, critérios de aceite, gaps e checklist de QA prontos para revisão.',
    microcopy: 'Grátis para começar · Sem cartão · Resultado em 60 segundos',
    stats: [
      { value: '60 segundos', label: 'da demanda vaga a uma story pronta para revisão' },
      { value: 'Critérios + gaps', label: 'acabamento e impurezas mapeados no mesmo fluxo' },
      { value: '100% grátis', label: 'para começar sem cartão e validar com contexto real' },
    ],
    preview: {
      imageAlt:
        'Mockup do ProdForge mostrando briefing bruto entrando na forja e saindo como user story estruturada.',
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
          'O ProdForge estrutura objetivo, story, critérios, gaps e checklist de QA no mesmo fluxo.',
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
      'Transforme uma solicitação imprecisa em uma base clara para decidir, construir e testar.',
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
      title: 'User story estruturada',
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
    eyebrow: 'Benefícios por função',
    title: 'Cada papel com menos ruído e mais contexto.',
    description:
      'A mesma saída precisa ser útil para o PM que prioriza, para o dev que implementa e para o QA que valida.',
    items: [
      {
        role: 'PM',
        title: 'Mais contexto para decidir',
        bullets: [
          'Organiza o problema antes de virar tarefa.',
          'Ajuda a identificar gaps, riscos e dependências cedo.',
        ],
      },
      {
        role: 'Dev',
        title: 'Menos ambiguidade na implementação',
        bullets: [
          'Entrega critérios de aceite mais objetivos.',
          'Facilita a leitura do comportamento esperado.',
        ],
      },
      {
        role: 'QA',
        title: 'Mais previsibilidade na validação',
        bullets: [
          'Aponta pontos críticos para teste funcional.',
          'Dá uma base melhor para cenários positivos e alternativos.',
        ],
      },
    ],
  },
  learningTeaser: {
    eyebrow: 'Academia ProdForge',
    title: 'Aprenda enquanto faz.',
    description:
      'Guias práticos que explicam o conceito e te levam direto para a ferramenta, com exemplos reais de backlog.',
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
        `${FREE_GENERATION_LIMIT} gerações de user story por conta.`,
        'Histórico por usuário.',
        'Fluxo básico de revisão na área de trabalho.',
      ],
    },
    pro: {
      name: PRO_PLAN_NAME,
      badge: 'Mais popular',
      description: 'Para times que precisam de mais escala, padrão e profundidade.',
      items: [
        'Mais gerações e mais versões por fluxo.',
        'Comparação de versões e exportações avançadas.',
        'Padrões do time, templates e integrações futuras.',
      ],
    },
  },
  leadCapture: {
    eyebrow: `Interesse no plano ${PRO_PLAN_NAME}`,
    title: 'Cadastre seu interesse para acompanhar a evolução do produto.',
    description:
      `Cadastre-se para acompanhar novidades do plano ${PRO_PLAN_NAME}, exportações avançadas e evoluções do ${APP_NAME}.`,
    note: 'Zero spam. Apenas avisos importantes sobre o produto.',
  },
  finalCta: {
    eyebrow: 'Pronto para começar',
    title: 'Seu próximo sprint começa com uma história melhor.',
    description:
      'Stories mal escritas geram dúvidas, retrabalho e atrasos. O ProdForge estrutura o contexto para que seu time foque no que importa: construir soluções incríveis.',
  },
}
