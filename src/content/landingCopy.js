import { APP_NAME, FREE_GENERATION_LIMIT, FREE_PLAN_NAME, PRO_PLAN_NAME } from '../constants/app'

export const landingCopy = {
  hero: {
    eyebrow: 'Do contexto disperso ao backlog pronto para revisão',
    title: 'Transforme contexto solto em user stories prontas para desenvolvimento.',
    description:
      'O ProdForge organiza briefings confusos, regras espalhadas e requisitos incompletos em um documento claro para revisão por produto, dev e QA.',
    highlights: [
      'Objetivo, critérios de aceite, gaps e checklist no mesmo fluxo.',
      'Mais clareza para produto. Menos retrabalho para dev e QA.',
      'Estrutura profissional para sair do texto solto e chegar ao backlog com mais consistência.',
    ],
    stats: [
      { value: '1 fluxo', label: 'do contexto inicial até a versão pronta para revisão' },
      { value: 'PM, dev e QA', label: 'alinhados na mesma base de trabalho' },
      { value: `${FREE_PLAN_NAME} e ${PRO_PLAN_NAME}`, label: 'comece simples e evolua quando o fluxo já estiver validado' },
    ],
    preview: {
      problemLabel: 'Contexto bruto',
      problemTitle: 'Briefing espalhado em mensagem, reunião e ticket',
      problemItems: [
        'Onboarding B2B perde conversão quando o domínio da empresa não é validado.',
        'Dev precisa entender regra, exceções e impacto no cadastro.',
        'QA ainda não tem critérios claros para testar o fluxo.',
      ],
      transitionLabel: 'ProdForge organiza',
      storyTitle: 'Validar domínio corporativo no onboarding B2B',
      objective:
        'Garantir que apenas empresas com domínio elegível concluam o cadastro inicial, reduzindo retrabalho operacional.',
      criteria: [
        'Bloquear avanço quando o domínio não estiver em formato válido.',
        'Exibir mensagem orientando a correção sem perder os dados já preenchidos.',
        'Registrar evento de falha para acompanhamento do funil.',
      ],
      gaps: ['Confirmar quais domínios parceiros devem entrar como exceção inicial.'],
      qa: [
        'Testar domínio válido, inválido e domínio bloqueado.',
        'Validar preservação dos dados ao exibir erro.',
      ],
    },
  },
  workflow: {
    eyebrow: 'Como funciona',
    title: 'Uma sequência curta para sair do briefing confuso e chegar a uma user story utilizável.',
    description:
      'O ProdForge organiza o raciocínio, entrega a primeira versão e apoia a revisão antes de a história entrar no backlog.',
    steps: [
      {
        step: '01',
        title: 'Cole o contexto real',
        description:
          'Traga o briefing como ele existe hoje: contexto, regra solta, dependência, restrição e necessidade de negócio.',
      },
      {
        step: '02',
        title: 'Receba uma primeira versão estruturada',
        description:
          'O ProdForge organiza objetivo, user story, critérios de aceite, gaps e checklist de QA.',
      },
      {
        step: '03',
        title: 'Revise antes de enviar ao backlog',
        description:
          'Revise a versão final com mais clareza para o squad, evitando ruído entre produto, dev e qualidade.',
      },
    ],
  },
  beforeAfter: {
    eyebrow: 'Antes e depois',
    title: 'A diferença entre uma demanda vaga e uma base pronta para refinamento.',
    description:
      'A proposta não é gerar texto bonito. É transformar uma solicitação imprecisa em uma user story que ajude o time a decidir, construir e testar.',
    before: {
      label: 'Antes',
      title: 'Demanda vaga',
      story: 'Melhorar onboarding para empresas e validar domínio no cadastro.',
      issues: [
        'Não diz qual problema precisa ser resolvido.',
        'Não define o comportamento esperado para o usuário.',
        'Não traz critérios de aceite ou exceções para dev e QA.',
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
      notes: 'Gap identificado: confirmar a lista inicial de exceções para parceiros.',
    },
  },
  benefits: {
    eyebrow: 'Benefícios por função',
    title: 'Mais clareza para quem define, constrói e valida.',
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
    eyebrow: 'Aprenda na pratica',
    title: 'Guias curtos para PMs e POs iniciantes estruturarem melhor o trabalho.',
    description:
      'A area Aprender organiza fundamentos, user stories, backlog, Scrum e discovery em leituras diretas, com exemplos e checklist final.',
    footer:
      'Use os guias para ganhar criterio. Use o workspace quando quiser transformar contexto em uma primeira versao revisavel.',
  },
  pricing: {
    eyebrow: 'Planos',
    title: `Comece no ${FREE_PLAN_NAME} e evolua para o ${PRO_PLAN_NAME} quando o processo já estiver validado.`,
    description:
      `O plano gratuito prova valor no uso real com ${FREE_GENERATION_LIMIT} gerações por conta. O ${PRO_PLAN_NAME} entra quando o time precisa de mais escala, padrão e profundidade de revisão.`,
    free: {
      name: FREE_PLAN_NAME,
      badge: 'Disponível agora',
      description: 'Para validar o fluxo com contexto real e sair do texto solto com mais clareza.',
      items: [
        `${FREE_GENERATION_LIMIT} gerações de user story por conta.`,
        'Histórico por usuário.',
        'Fluxo básico de revisão na área de trabalho.',
      ],
    },
    pro: {
      name: PRO_PLAN_NAME,
      badge: 'Evolução planejada',
      description: 'Para times que precisam de mais escala, padrão, versões e colaboração.',
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
    title: 'Troque briefing confuso por user stories mais confiáveis para produto, dev e QA.',
    description:
      'Use o ProdForge para estruturar melhor o contexto antes de ele virar backlog, retrabalho e alinhamento manual.',
  },
}
