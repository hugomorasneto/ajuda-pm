export const landingCopy = {
  hero: {
    eyebrow: 'Do contexto ao backlog pronto para revisão',
    title: 'Transforme contexto solto em user stories prontas para revisão por produto, dev e QA.',
    description:
      'O ProdForge organiza briefings confusos, regras espalhadas e requisitos incompletos em uma user story clara, completa e pronta para refinamento.',
    highlights: [
      'Objetivo, critérios de aceite, gaps e checklist no mesmo fluxo.',
      'Mais clareza para produto. Menos retrabalho para dev e QA.',
      'Estrutura profissional para sair do texto solto e chegar ao backlog.',
    ],
    stats: [
      { value: '1 fluxo', label: 'do contexto inicial até a versão pronta para revisão' },
      { value: '3 públicos', label: 'PM, dev e QA alinhados na mesma base de trabalho' },
      { value: 'Free e Pro', label: 'entrada simples agora, camadas avançadas na evolução do produto' },
    ],
    preview: {
      problemLabel: 'Contexto bruto',
      problemTitle: 'Briefing espalhado em mensagem, reunião e ticket',
      problemItems: [
        'Onboarding B2B perde conversão quando o domínio da empresa não é validado.',
        'Dev precisa entender regra, exceções e impacto no cadastro.',
        'QA ainda não tem critérios claros para testar o fluxo.',
      ],
      transitionLabel: 'ProdForge estrutura',
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
    title: 'Uma jornada curta para sair do briefing confuso e chegar a uma user story utilizável.',
    description:
      'A landing vende a transformação; o produto entrega um fluxo de trabalho para estruturar, revisar e comparar versões.',
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
          'O ProdForge organiza o objetivo, a user story, os critérios de aceite, os gaps e o checklist de QA.',
      },
      {
        step: '03',
        title: 'Revise antes de enviar ao backlog',
        description:
          'Ajuste a versão final com mais clareza para o squad, evitando ruído entre produto, dev e qualidade.',
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
          'Ajuda a identificar gaps e riscos cedo.',
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
  pricing: {
    eyebrow: 'Planos',
    title: 'Comece no Free e evolua para mais escala quando o fluxo já estiver validado.',
    description:
      'O plano gratuito prova valor no uso real. O plano Pro entra quando o time precisa ganhar velocidade, padrão e profundidade de revisão.',
    free: {
      name: 'Free',
      badge: 'Disponível agora',
      description: 'Para validar o fluxo com contexto real e sair do texto solto.',
      items: [
        'Gerações iniciais para testar o produto.',
        'Histórico por usuário.',
        'Fluxo básico de revisão na área de trabalho.',
      ],
    },
    pro: {
      name: 'Pro',
      badge: 'Evolução planejada',
      description: 'Para times que precisam de mais escala, padrão e colaboração.',
      items: [
        'Mais gerações e mais versões por fluxo.',
        'Comparação de versões e exportações avançadas.',
        'Padrões do time, templates e integrações futuras.',
      ],
    },
  },
  leadCapture: {
    eyebrow: 'Interesse no plano Pro',
    title: 'Cadastre seu interesse para acompanhar a evolução do produto.',
    description:
      'Estamos finalizando a captura pública com segurança. Por enquanto, este bloco mostra como o cadastro de interesse vai funcionar.',
    note: 'Cadastro de interesse em breve.',
  },
  finalCta: {
    eyebrow: 'Pronto para começar',
    title: 'Troque briefing confuso por user stories mais confiáveis para produto, dev e QA.',
    description:
      'Use o ProdForge para estruturar melhor o contexto antes de ele virar backlog, retrabalho e alinhamento manual.',
  },
}
