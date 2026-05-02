import { APP_NAME, FREE_GENERATION_LIMIT, FREE_PLAN_NAME, PRO_PLAN_NAME } from '../constants/app'

export const landingCopy = {
  contextStrip: [
    {
      icon: 'bolt',
      value: '60 segundos',
      description: 'Do briefing bruto a uma story utilizável no mesmo fluxo.',
    },
    {
      icon: 'layers',
      value: 'Critérios e gaps',
      description: 'Acabamento, pontos a decidir e QA já entram estruturados.',
    },
    {
      icon: 'unlock',
      value: '100% grátis',
      description: 'Comece sem cartão e valide a clareza antes do backlog.',
    },
  ],
  hero: {
    eyebrow: 'Feito para PMs e times de produto',
    title: 'Transforme briefings confusos em user stories claras que o time entende na primeira leitura.',
    description:
      'O briefing entra como matéria-prima bruta. O ProdForge faz a forja com IA e entrega uma story estruturada, com critérios, gaps e QA prontos para revisão.',
    microcopy: 'Sem cartão · Setup em minutos · Resultado em cerca de 60 segundos',
    stats: [
      { value: '60 segundos', label: 'da demanda vaga a uma story pronta para revisão' },
      { value: 'Critérios + gaps', label: 'acabamento e impurezas mapeados no mesmo fluxo' },
      { value: '100% grátis', label: 'para começar sem cartão e validar com contexto real' },
    ],
    preview: {
      problemLabel: 'Briefing bruto',
      problemTitle: 'Solicitação espalhada entre ticket, mensagem e reunião',
      problemItems: [
        'Onboarding B2B perde conversão quando o domínio da empresa não é validado.',
        'Dev precisa entender regra, exceções e impacto no cadastro.',
        'QA ainda não tem critérios claros para inspecionar o fluxo.',
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
        'Garantir que apenas empresas com domínio elegível concluam o cadastro inicial, reduzindo retrabalho operacional.',
      criteriaLabel: 'Critérios de aceite',
      criteria: [
        'Bloquear avanço quando o domínio não estiver em formato válido.',
        'Exibir mensagem orientando a correção sem perder os dados já preenchidos.',
        'Registrar evento de falha para acompanhamento do funil.',
      ],
      qualityLabel: 'Nível de refinamento',
      qualityValue: '82%',
      readyLabel: 'Pronta para revisão',
      gapsLabel: 'Impurezas para decidir',
      gaps: ['Confirmar quais domínios parceiros devem entrar como exceção inicial.'],
      qaLabel: 'Inspeção final',
      qa: [
        'Testar domínio válido, inválido e domínio bloqueado.',
        'Validar preservação dos dados ao exibir erro.',
      ],
      footerHighlights: ['Objetivo claro', 'Gaps visíveis', 'Checklist pronto'],
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
          'Cole o briefing como ele existe hoje: contexto, regra, dependência e objetivo de negócio.',
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
      'Não é sobre gerar texto bonito. É sobre transformar uma solicitação imprecisa em uma base que ajude o time a decidir, construir e testar.',
    before: {
      label: 'Antes',
      title: 'Demanda vaga',
      story: 'Melhorar onboarding para empresas e validar domínio no cadastro.',
      issues: [
        'Não diz qual problema precisa ser resolvido.',
        'Não define o comportamento esperado para o usuário.',
        'Não traz critérios de aceite nem exceções para dev e QA.',
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
        'Registrar a tentativa inválida para análise do funil.',
      ],
      notes: 'Impureza identificada: confirmar a lista inicial de exceções para parceiros.',
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
      'Cada guia termina com um caminho prático para sair do conceito e aplicar no fluxo real.',
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
      `Deixe seu nome e e-mail para acompanhar novidades do plano ${PRO_PLAN_NAME}, exportações avançadas e próximas evoluções do ${APP_NAME}.`,
    note: 'Usaremos seus dados apenas para avisos sobre a evolução do produto.',
  },
  finalCta: {
    eyebrow: 'Pronto para começar',
    title: 'Seu próximo sprint começa com uma história melhor.',
    description:
      'Cada story mal escrita custa tempo de dev, retrabalho de QA e credibilidade do PM. ProdForge resolve isso antes do planning.',
  },
}
