import { APP_NAME, PRO_PLAN_NAME } from '../constants/app'

export const learningHub = {
  eyebrow: 'Aprender',
  title: 'Guias práticos para PMs e POs que ainda estão estruturando o próprio repertório.',
  description:
    'Aqui a proposta não é explicar Agile como teoria solta. Cada guia mostra quando o conceito importa, como aplicar no backlog e quais erros evitar no dia seguinte.',
  starterGuideSlugs: [
    'fundamentos-produto-agil',
    'user-stories-na-pratica',
    'backlog-e-refinamento',
  ],
  relatedProductLinks: [
    {
      title: 'Gerar uma user story com IA',
      description: `Use o ${APP_NAME} para transformar contexto solto em uma primeira versão revisável.`,
      to: '/signup',
      label: 'Criar conta grátis',
    },
    {
      title: 'Ver um exemplo de saída pronta',
      description: 'Compare uma demanda vaga com uma história mais clara para produto, dev e QA.',
      to: '/#antes-depois',
      label: 'Ver exemplo',
      external: true,
    },
    {
      title: `Acompanhar novidades do plano ${PRO_PLAN_NAME}`,
      description: 'Deixe seu e-mail para acompanhar exportações, padrões de time e próximas evoluções.',
      to: '/#lead-capture-title',
      label: 'Receber novidades',
      external: true,
    },
  ],
  finalCta: {
    title: 'Aprenda o suficiente para pensar melhor. Use a ferramenta para executar mais rápido.',
    description:
      'Os guias ajudam você a estruturar repertório. O workspace entra depois, quando for hora de transformar contexto em backlog utilizável.',
  },
}

export const learningGuides = [
  {
    slug: 'fundamentos-produto-agil',
    category: 'Fundamentos',
    title: 'Fundamentos de produto ágil para PM/PO iniciante',
    excerpt:
      'O que realmente importa no começo: problema, decisão, alinhamento e aprendizado contínuo. Sem decorar framework antes da hora.',
    readingTime: '6 min',
    level: 'Iniciante',
    problem:
      'Muita gente começa ouvindo sobre Scrum, discovery e roadmap, mas não entende o que precisa resolver no trabalho de produto do dia a dia.',
    outcome:
      'Ao final, você tem um modelo simples para conectar problema, prioridade e conversa com o time sem depender de jargão.',
    quickSummary: [
      'Produto ágil não é fazer cerimônia; é reduzir risco antes de investir mais construção.',
      'Seu trabalho central é melhorar decisão, não apenas mover card de coluna.',
      'Backlog bom nasce de contexto claro, não de ticket bonito.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'O time recebe a frase "melhorar onboarding". Antes de abrir várias tarefas, o PM precisa entender onde está o problema real.',
      bullets: [
        'Qual etapa do onboarding está derrubando conversão?',
        'Quem está travando: usuário final, operação ou comercial?',
        'O que muda de verdade se resolvermos isso agora?',
      ],
      result:
        'Sem essas respostas, o backlog cresce rápido, mas a chance de atacar a causa errada continua alta.',
    },
    sections: [
      {
        title: 'Comece pelo problema, não pelo formato',
        paragraphs: [
          'Framework ajuda a organizar conversa, mas não substitui clareza sobre o problema.',
          'Se você não consegue explicar qual comportamento precisa mudar, a história nasce fraca independentemente do template.',
        ],
        bullets: [
          'Descreva o problema em linguagem de negócio.',
          'Diga quem sente o impacto.',
          'Explique o que muda se o time resolver isso.',
        ],
      },
      {
        title: 'Use backlog como sistema de decisão',
        paragraphs: [
          'Backlog não é depósito de pedidos. Ele precisa mostrar o que merece conversa agora e o que ainda não entrou em foco.',
          'Quando tudo vira prioridade, o time perde contexto e trabalha por volume.',
        ],
        bullets: [
          'Separe ideia, hipótese e item pronto para refinamento.',
          'Evite detalhar cedo demais o que ainda pode morrer.',
          'Revise frequentemente o que ficou velho ou sem dono.',
        ],
      },
      {
        title: 'Agilidade aparece na qualidade da conversa',
        paragraphs: [
          'O time fica mais ágil quando PM, dev e QA conseguem entender o objetivo da mudança sem reunião demais.',
          'Isso exige artefatos mais claros, critérios melhores e menos ambiguidade.',
        ],
        bullets: [
          'Explique o que precisa ser validado.',
          'Antecipe exceções e dependências.',
          'Leve dúvidas para o refinamento antes de pedir estimativa.',
        ],
      },
    ],
    commonMistakes: [
      'Confundir velocidade com produtividade sem olhar resultado.',
      'Abrir item demais antes de entender o problema.',
      'Falar de framework como se ele resolvesse desalinhamento sozinho.',
    ],
    checklist: [
      'Consigo explicar o problema em uma frase simples.',
      'Sei quem é afetado e por que isso importa agora.',
      'Existe material suficiente para iniciar refinamento sem inventar regra no meio do caminho.',
      'O time entende como vamos perceber se a mudança ajudou.',
    ],
    nextReads: ['user-stories-na-pratica', 'backlog-e-refinamento'],
    seo: {
      title: 'Fundamentos de produto ágil para PM e PO iniciante | ProdForge',
      description:
        'Guia prático para PMs e POs iniciantes entenderem problema, backlog, alinhamento com o time e tomada de decisão em produto ágil.',
    },
  },
  {
    slug: 'user-stories-na-pratica',
    category: 'User Stories',
    title: 'User stories na prática',
    excerpt:
      'Como sair de contexto solto para uma história útil, com objetivo, comportamento esperado, critérios e perguntas de refinamento.',
    readingTime: '7 min',
    level: 'Iniciante',
    problem:
      'Pedidos chegam por mensagem, call ou planilha, e o PM vira tradutor manual de contexto em ticket.',
    outcome:
      'Você ganha um jeito consistente de estruturar histórias que ajudem o squad a decidir, construir e testar com menos retrabalho.',
    quickSummary: [
      'Uma user story boa explica intenção e comportamento, não apenas tela ou campo.',
      'Critério de aceite ruim gera estimativa ruim e teste fraco.',
      'Gaps explicitados cedo evitam descobertas caras no meio do desenvolvimento.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'O comercial pede para validar domínio corporativo durante o onboarding B2B porque há muitos cadastros inconsistentes.',
      bullets: [
        'Objetivo: reduzir retrabalho operacional.',
        'História: validar o domínio antes de concluir o cadastro.',
        'Critérios: bloquear avanços inválidos, preservar dados e registrar falha.',
      ],
      result:
        'A história deixa de ser "melhorar cadastro" e vira uma base concreta para dev e QA.',
    },
    sections: [
      {
        title: 'Capture contexto antes de escrever formato',
        paragraphs: [
          'A história não deve ser a primeira coisa que você escreve. Primeiro vem o contexto: problema, impacto, fluxo atual e regra relevante.',
          'Quando esse material não existe, a história vira adivinhação com linguagem organizada.',
        ],
        bullets: [
          'Qual problema do usuário ou do negócio está por trás do pedido?',
          'Em qual fluxo isso acontece hoje?',
          'Qual regra ou restrição não pode ser esquecida?',
        ],
      },
      {
        title: 'Escreva para comportamento, não para interface',
        paragraphs: [
          'A frase clássica "como, quero, para" pode ajudar, mas só funciona quando aponta o comportamento esperado.',
          'Se a história descreve apenas componente visual, o time ainda precisa descobrir o que deve acontecer.',
        ],
        bullets: [
          'Diga quem executa a ação.',
          'Diga o que precisa acontecer no fluxo.',
          'Diga por que isso importa no contexto do problema.',
        ],
      },
      {
        title: 'Use critérios para alinhar implementação e teste',
        paragraphs: [
          'Critério de aceite é o bloco que mais ajuda dev e QA. Ele precisa cobrir caminho principal, erro relevante e exceção importante.',
          'Não tente escrever tudo. Priorize o que reduz ambiguidade operacional.',
        ],
        bullets: [
          'O que permite avançar?',
          'O que bloqueia o usuário?',
          'O que precisa ser registrado ou preservado?',
        ],
      },
    ],
    commonMistakes: [
      'Trocar contexto por título bonito.',
      'Misturar várias dores diferentes na mesma história.',
      'Escrever critério genérico como "funcionar corretamente".',
    ],
    checklist: [
      'A história explica o objetivo da mudança.',
      'Os critérios cobrem fluxo principal, erro e exceção mais relevante.',
      'Os gaps estão explícitos, não escondidos em comentário.',
      'Dev e QA conseguem iniciar conversa de refinamento com base no documento.',
    ],
    nextReads: ['backlog-e-refinamento', 'discovery-leve'],
    seo: {
      title: 'User stories na prática para PMs e POs | ProdForge',
      description:
        'Aprenda a transformar contexto solto em user stories com objetivo, critérios de aceite, gaps e checklist de refinamento.',
    },
  },
  {
    slug: 'backlog-e-refinamento',
    category: 'Backlog',
    title: 'Backlog e refinamento sem caos',
    excerpt:
      'Como organizar prioridade, maturidade e conversa com o squad sem transformar backlog em depósito de pedidos.',
    readingTime: '6 min',
    level: 'Iniciante',
    problem:
      'O backlog cresce, muda toda semana e mistura ideia crua com item pronto para desenvolvimento.',
    outcome:
      'Você passa a usar backlog como sistema de foco e refinamento, não como arquivo morto de demandas.',
    quickSummary: [
      'Backlog bom mostra o que está pronto, o que ainda é hipótese e o que deve sair de cena.',
      'Refinamento serve para reduzir ambiguidade antes da implementação.',
      'Não refine tudo; refine o que está perto de entrar em execução.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'Um PM tem 40 itens no board, mas só 5 realmente podem entrar no próximo ciclo. O time perde tempo discutindo detalhe de item que nem foi priorizado.',
      bullets: [
        'Separar ideias de itens em preparação reduz ruído.',
        'Trazer contexto mínimo antes do refinamento economiza reunião.',
        'Marcar gaps evita que a conversa vire descoberta improvisada.',
      ],
      result:
        'O refinamento fica mais curto e as decisões ficam melhor documentadas.',
    },
    sections: [
      {
        title: 'Organize backlog por maturidade',
        paragraphs: [
          'Nem tudo no backlog merece o mesmo nível de detalhe.',
          'Separar itens por maturidade ajuda a evitar refinamento precoce e retrabalho documental.',
        ],
        bullets: [
          'Ideia: ainda precisa de contexto.',
          'Em análise: problema mais claro, mas faltam perguntas.',
          'Pronto para refinamento: material suficiente para conversa técnica e de QA.',
        ],
      },
      {
        title: 'Leve insumo suficiente para a conversa',
        paragraphs: [
          'Refinamento bom não nasce do nada. O PM precisa chegar com objetivo, regras conhecidas, restrições e dúvidas abertas.',
          'Se tudo é descoberto ao vivo, a reunião fica longa e rasa ao mesmo tempo.',
        ],
        bullets: [
          'Contexto do problema.',
          'Impacto esperado.',
          'Riscos, exceções e dependências conhecidas.',
        ],
      },
      {
        title: 'Saia com pendências claras, não com falsa certeza',
        paragraphs: [
          'Refinamento não precisa encerrar todas as perguntas, mas precisa mostrar o que ficou em aberto e quem resolve.',
          'Esconder lacuna para "ganhar velocidade" só empurra risco para a sprint.',
        ],
        bullets: [
          'Liste dúvidas abertas explicitamente.',
          'Atribua dono para cada retorno necessário.',
          'Não marque item como pronto se a conversa técnica crítica ainda depende de suposição.',
        ],
      },
    ],
    commonMistakes: [
      'Detalhar item que ainda não foi priorizado.',
      'Usar refinamento como reunião de descoberta do problema.',
      'Guardar perguntas importantes apenas na memória do PM.',
    ],
    checklist: [
      'O backlog separa bem ideia, análise e item pronto.',
      'Os próximos itens do time já têm contexto mínimo para conversa.',
      'As pendências abertas estão registradas com dono.',
      'O refinamento ajuda a decidir, não apenas a preencher campos.',
    ],
    nextReads: ['scrum-para-pm-po', 'user-stories-na-pratica'],
    seo: {
      title: 'Backlog e refinamento sem caos para PM e PO | ProdForge',
      description:
        'Guia prático para organizar backlog, preparar refinamento e reduzir ambiguidade antes do desenvolvimento.',
    },
  },
  {
    slug: 'scrum-para-pm-po',
    category: 'Scrum',
    title: 'Scrum para PMs e POs sem teatrinho',
    excerpt:
      'O que cada cerimônia deve resolver de verdade e como evitar que o ritual esconda a falta de clareza no trabalho.',
    readingTime: '7 min',
    level: 'Iniciante',
    problem:
      'Times fazem daily, planning e review no calendário, mas continuam com desalinhamento, retrabalho e prioridade difusa.',
    outcome:
      'Você passa a usar as cerimônias como ponto de decisão e alinhamento, em vez de cumprir roteiro por hábito.',
    quickSummary: [
      'Cerimônia boa reduz dúvida operacional ou de prioridade.',
      'PM/PO não precisa dominar o palco; precisa deixar o objetivo claro.',
      'Se a reunião não muda a decisão, ela provavelmente está inflada.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'Na planning, o time recebe histórias sem contexto e a conversa vira disputa sobre detalhe técnico. Na review, todos assistem à demo, mas ninguém aprende com o resultado.',
      bullets: [
        'Planning precisa responder o que entra e por que entra.',
        'Daily precisa expor bloqueio relevante, não status recitado.',
        'Review precisa conectar entrega ao problema e ao aprendizado.',
      ],
      result:
        'Quando a cerimônia tem propósito claro, o time fala menos de processo e mais de decisão.',
    },
    sections: [
      {
        title: 'Planning: alinhe expectativa antes de falar de capacidade',
        paragraphs: [
          'Planning ruim começa por horas e pontos sem clareza do que está sendo puxado.',
          'O PM ajuda mais quando explica contexto, prioridade e risco dos itens principais.',
        ],
        bullets: [
          'Quais itens realmente importam neste ciclo?',
          'O que ainda está sensível ou depende de validação?',
          'O que não deve entrar agora?',
        ],
      },
      {
        title: 'Daily: trate bloqueio cedo',
        paragraphs: [
          'Daily não é auditoria de produtividade. Ela existe para tornar impedimento visível cedo o bastante para ser tratado.',
          'Se o time só repete tarefa, a reunião perde valor rápido.',
        ],
        bullets: [
          'Qual bloqueio impede avançar hoje?',
          'Há dúvida de regra, prioridade ou dependência externa?',
          'O PM precisa destravar algo com outro stakeholder?',
        ],
      },
      {
        title: 'Review e retro: feche ciclo de entrega e aprendizado',
        paragraphs: [
          'Review sem contexto vira apenas exibição. Retro sem ação vira catarse.',
          'O PM ajuda quando conecta entrega ao problema e leva para a retro fricções reais do fluxo de produto.',
        ],
        bullets: [
          'O que foi entregue resolveu a dor certa?',
          'O que aprendemos sobre escopo, clareza ou dependência?',
          'Qual ajuste concreto o time vai testar no próximo ciclo?',
        ],
      },
    ],
    commonMistakes: [
      'Tratar cerimônia como prova de maturidade.',
      'Levar item sem contexto para planning.',
      'Sair de retro sem ajuste concreto para o fluxo.',
    ],
    checklist: [
      'Cada cerimônia tem uma decisão clara para produzir.',
      'As histórias que entram em planning já chegam com contexto suficiente.',
      'Bloqueios relevantes aparecem cedo no ciclo.',
      'Review e retro geram aprendizado acionável, não só observação.',
    ],
    nextReads: ['backlog-e-refinamento', 'discovery-leve'],
    seo: {
      title: 'Scrum para PM e PO sem teatrinho | ProdForge',
      description:
        'Veja como usar planning, daily, review e retro para melhorar clareza, prioridade e aprendizado no trabalho de produto.',
    },
  },
  {
    slug: 'discovery-leve',
    category: 'Discovery',
    title: 'Discovery leve para começar bem',
    excerpt:
      'Como validar problema, hipótese e necessidade sem transformar discovery em burocracia paralela ao backlog.',
    readingTime: '6 min',
    level: 'Iniciante',
    problem:
      'No começo, discovery costuma ser tratado como algo grande demais ou é pulado completamente quando a pressão por entrega aumenta.',
    outcome:
      'Você aprende um discovery leve o suficiente para ser prático e forte o bastante para evitar backlog construído em suposição.',
    quickSummary: [
      'Discovery leve serve para reduzir risco de atacar o problema errado.',
      'Nem toda decisão precisa de pesquisa extensa, mas quase toda decisão precisa de uma hipótese explícita.',
      'O objetivo é chegar em backlog melhor, não produzir documento paralelo.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'Uma liderança pede campo novo no cadastro porque "vai ajudar a operação". Antes de implementar, o PM investiga em que momento o time operacional sente falta dessa informação.',
      bullets: [
        'Quem sofre com a falta do dado hoje?',
        'O problema acontece com qual frequência?',
        'Existe alternativa menor para validar a necessidade?',
      ],
      result:
        'Às vezes a descoberta mostra que o problema é de processo interno, não de produto. Isso economiza sprint inteira.',
    },
    sections: [
      {
        title: 'Comece por uma hipótese pequena e verificável',
        paragraphs: [
          'Discovery leve não tenta responder tudo. Ele parte de uma hipótese direta sobre problema, público e impacto.',
          'Quanto mais concreta a hipótese, melhor a conversa com usuário, operação ou dados.',
        ],
        bullets: [
          'Problema: o que está travando hoje?',
          'Público: quem sente isso com mais frequência?',
          'Impacto: o que deve melhorar se a hipótese estiver certa?',
        ],
      },
      {
        title: 'Use evidências proporcionais ao risco',
        paragraphs: [
          'Algumas decisões pedem entrevista. Outras pedem olhar funil, ticket ou sombra de operação.',
          'O ponto não é fazer pesquisa sofisticada; é ter evidência suficiente para não trabalhar no escuro.',
        ],
        bullets: [
          'Conversa com usuários ou stakeholders próximos da dor.',
          'Dados básicos de ocorrência ou conversão.',
          'Leitura de suporte, reclamações e retrabalho operacional.',
        ],
      },
      {
        title: 'Traga discovery de volta para a história',
        paragraphs: [
          'Discovery só fecha ciclo quando muda a qualidade do backlog.',
          'O resultado precisa aparecer em objetivo, critério, risco e decisão de prioridade.',
        ],
        bullets: [
          'Atualize o problema com o que foi confirmado.',
          'Registre a hipótese que continua em aberto.',
          'Transforme o aprendizado em critério ou pergunta de refinamento.',
        ],
      },
    ],
    commonMistakes: [
      'Tratar discovery como fase separada do resto do trabalho.',
      'Pesquisar demais para problema pequeno.',
      'Terminar discovery sem ajustar backlog ou prioridade.',
    ],
    checklist: [
      'A hipótese do item está explícita.',
      'Existe evidência mínima para não decidir no escuro.',
      'O aprendizado já voltou para a história ou para a prioridade.',
      'Ainda sabemos o que falta validar antes de escalar a solução.',
    ],
    nextReads: ['fundamentos-produto-agil', 'user-stories-na-pratica'],
    seo: {
      title: 'Discovery leve para PM e PO iniciante | ProdForge',
      description:
        'Guia prático para validar problema, hipótese e necessidade sem burocracia, conectando discovery ao backlog real.',
    },
  },
]

export const learningNotes = [
  {
    slug: 'ia-para-melhorar-user-stories',
    title: 'IA para melhorar user stories sem terceirizar pensamento',
    tag: 'Novidade prática',
    summary:
      'Use IA para organizar contexto, explicitar gaps e acelerar a primeira versão. Não use para decidir prioridade no seu lugar.',
    ctaLabel: 'Ler guia de user stories',
    targetGuideSlug: 'user-stories-na-pratica',
  },
  {
    slug: 'como-conversar-melhor-com-dev',
    title: 'Como conversar melhor com dev sem virar pseudo-tech lead',
    tag: 'Novidade prática',
    summary:
      'A melhor conversa com dev não é a que tenta desenhar a implementação inteira. É a que deixa claro problema, regra, exceção e restrição.',
    ctaLabel: 'Ler guia de backlog e refinamento',
    targetGuideSlug: 'backlog-e-refinamento',
  },
  {
    slug: 'sinais-de-backlog-mal-definido',
    title: 'Sinais de backlog mal definido antes de virar retrabalho',
    tag: 'Novidade prática',
    summary:
      'Quando várias histórias dependem de reunião extra para entender o básico, o backlog está sinalizando falta de contexto, não falta de velocidade.',
    ctaLabel: 'Ler guia de fundamentos',
    targetGuideSlug: 'fundamentos-produto-agil',
  },
]

export function getLearningGuideBySlug(slug) {
  return learningGuides.find((guide) => guide.slug === slug) ?? null
}

export function getLearningGuidesBySlugs(slugs) {
  return slugs
    .map((slug) => getLearningGuideBySlug(slug))
    .filter(Boolean)
}

export function getLearningNotesForGuide(slug) {
  return learningNotes.filter((note) => note.targetGuideSlug === slug)
}
