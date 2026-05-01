import { APP_NAME, PRO_PLAN_NAME } from '../constants/app'

export const learningHub = {
  eyebrow: 'Aprender',
  title: 'Guias praticos para PMs e POs que ainda estao estruturando o proprio repertorio.',
  description:
    'Aqui a proposta nao e explicar Agile como teoria solta. Cada guia mostra quando o conceito importa, como aplicar no backlog e quais erros evitar no dia seguinte.',
  starterGuideSlugs: [
    'fundamentos-produto-agil',
    'user-stories-na-pratica',
    'backlog-e-refinamento',
  ],
  relatedProductLinks: [
    {
      title: 'Gerar uma user story com IA',
      description: `Use o ${APP_NAME} para transformar contexto solto em uma primeira versao revisavel.`,
      to: '/signup',
      label: 'Criar conta gratis',
    },
    {
      title: 'Ver um exemplo de saida pronta',
      description: 'Compare uma demanda vaga com uma historia mais clara para produto, dev e QA.',
      to: '/#antes-depois',
      label: 'Ver exemplo',
      external: true,
    },
    {
      title: `Acompanhar novidades do plano ${PRO_PLAN_NAME}`,
      description: 'Deixe seu e-mail para acompanhar exportacoes, padroes de time e proximas evolucoes.',
      to: '/#lead-capture-title',
      label: 'Receber novidades',
      external: true,
    },
  ],
  finalCta: {
    title: 'Aprenda o suficiente para pensar melhor. Use a ferramenta para executar mais rapido.',
    description:
      'Os guias ajudam voce a estruturar repertorio. O workspace entra depois, quando for hora de transformar contexto em backlog utilizavel.',
  },
}

export const learningGuides = [
  {
    slug: 'fundamentos-produto-agil',
    category: 'Fundamentos',
    title: 'Fundamentos de produto agil para PM/PO iniciante',
    excerpt:
      'O que realmente importa no comeco: problema, decisao, alinhamento e aprendizado continuo. Sem decorar framework antes da hora.',
    readingTime: '6 min',
    level: 'Iniciante',
    problem:
      'Muita gente comeca ouvindo sobre Scrum, discovery e roadmap, mas nao entende o que precisa resolver no trabalho de produto do dia a dia.',
    outcome:
      'Ao final, voce tem um modelo simples para conectar problema, prioridade e conversa com o time sem depender de jargao.',
    quickSummary: [
      'Produto agil nao e fazer cerimonia; e reduzir risco antes de investir mais construcao.',
      'Seu trabalho central e melhorar decisao, nao apenas mover card de coluna.',
      'Backlog bom nasce de contexto claro, nao de ticket bonito.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'O time recebe a frase "melhorar onboarding". Antes de abrir varias tarefas, o PM precisa entender onde esta o problema real.',
      bullets: [
        'Qual etapa do onboarding esta derrubando conversao?',
        'Quem esta travando: usuario final, operacao ou comercial?',
        'O que muda de verdade se resolvermos isso agora?',
      ],
      result:
        'Sem essas respostas, o backlog cresce rapido, mas a chance de atacar a causa errada continua alta.',
    },
    sections: [
      {
        title: 'Comece pelo problema, nao pelo formato',
        paragraphs: [
          'Framework ajuda a organizar conversa, mas nao substitui clareza sobre o problema.',
          'Se voce nao consegue explicar qual comportamento precisa mudar, a historia nasce fraca independentemente do template.',
        ],
        bullets: [
          'Descreva o problema em linguagem de negocio.',
          'Diga quem sente o impacto.',
          'Explique o que muda se o time resolver isso.',
        ],
      },
      {
        title: 'Use backlog como sistema de decisao',
        paragraphs: [
          'Backlog nao e deposito de pedidos. Ele precisa mostrar o que merece conversa agora e o que ainda nao entrou em foco.',
          'Quando tudo vira prioridade, o time perde contexto e trabalha por volume.',
        ],
        bullets: [
          'Separe ideia, hipotese e item pronto para refinamento.',
          'Evite detalhar cedo demais o que ainda pode morrer.',
          'Revise frequentemente o que ficou velho ou sem dono.',
        ],
      },
      {
        title: 'Agilidade aparece na qualidade da conversa',
        paragraphs: [
          'O time fica mais agil quando PM, dev e QA conseguem entender o objetivo da mudanca sem reuniao demais.',
          'Isso exige artefatos mais claros, criterios melhores e menos ambiguidade.',
        ],
        bullets: [
          'Explique o que precisa ser validado.',
          'Antecipe excecoes e dependencias.',
          'Leve duvidas para o refinamento antes de pedir estimativa.',
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
      'Sei quem e afetado e por que isso importa agora.',
      'Existe material suficiente para iniciar refinamento sem inventar regra no meio do caminho.',
      'O time entende como vamos perceber se a mudanca ajudou.',
    ],
    nextReads: ['user-stories-na-pratica', 'backlog-e-refinamento'],
    seo: {
      title: 'Fundamentos de produto agil para PM e PO iniciante | ProdForge',
      description:
        'Guia pratico para PMs e POs iniciantes entenderem problema, backlog, alinhamento com o time e tomada de decisao em produto agil.',
    },
  },
  {
    slug: 'user-stories-na-pratica',
    category: 'User Stories',
    title: 'User stories na pratica',
    excerpt:
      'Como sair de contexto solto para uma historia util, com objetivo, comportamento esperado, criterios e perguntas de refinamento.',
    readingTime: '7 min',
    level: 'Iniciante',
    problem:
      'Pedidos chegam por mensagem, call ou planilha, e o PM vira tradutor manual de contexto em ticket.',
    outcome:
      'Voce ganha um jeito consistente de estruturar historias que ajudem o squad a decidir, construir e testar com menos retrabalho.',
    quickSummary: [
      'Uma user story boa explica intencao e comportamento, nao apenas tela ou campo.',
      'Criterio de aceite ruim gera estimativa ruim e teste fraco.',
      'Gaps explicitados cedo evitam descobertas caras no meio do desenvolvimento.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'O comercial pede para validar dominio corporativo durante o onboarding B2B porque ha muitos cadastros inconsistentes.',
      bullets: [
        'Objetivo: reduzir retrabalho operacional.',
        'Historia: validar o dominio antes de concluir o cadastro.',
        'Criterios: bloquear avancos invalidos, preservar dados e registrar falha.',
      ],
      result:
        'A historia deixa de ser "melhorar cadastro" e vira uma base concreta para dev e QA.',
    },
    sections: [
      {
        title: 'Capture contexto antes de escrever formato',
        paragraphs: [
          'A historia nao deve ser a primeira coisa que voce escreve. Primeiro vem o contexto: problema, impacto, fluxo atual e regra relevante.',
          'Quando esse material nao existe, a historia vira adivinhacao com linguagem organizada.',
        ],
        bullets: [
          'Qual problema do usuario ou do negocio esta por tras do pedido?',
          'Em qual fluxo isso acontece hoje?',
          'Qual regra ou restricao nao pode ser esquecida?',
        ],
      },
      {
        title: 'Escreva para comportamento, nao para interface',
        paragraphs: [
          'A frase classica "como, quero, para" pode ajudar, mas so funciona quando aponta o comportamento esperado.',
          'Se a historia descreve apenas componente visual, o time ainda precisa descobrir o que deve acontecer.',
        ],
        bullets: [
          'Diga quem executa a acao.',
          'Diga o que precisa acontecer no fluxo.',
          'Diga por que isso importa no contexto do problema.',
        ],
      },
      {
        title: 'Use criterios para alinhar implementacao e teste',
        paragraphs: [
          'Criterio de aceite e o bloco que mais ajuda dev e QA. Ele precisa cobrir caminho principal, erro relevante e excecao importante.',
          'Nao tente escrever tudo. Priorize o que reduz ambiguidade operacional.',
        ],
        bullets: [
          'O que permite avancar?',
          'O que bloqueia o usuario?',
          'O que precisa ser registrado ou preservado?',
        ],
      },
    ],
    commonMistakes: [
      'Trocar contexto por titulo bonito.',
      'Misturar varias dores diferentes na mesma historia.',
      'Escrever criterio generico como "funcionar corretamente".',
    ],
    checklist: [
      'A historia explica o objetivo da mudanca.',
      'Os criterios cobrem fluxo principal, erro e excecao mais relevante.',
      'Os gaps estao explicitos, nao escondidos em comentario.',
      'Dev e QA conseguem iniciar conversa de refinamento com base no documento.',
    ],
    nextReads: ['backlog-e-refinamento', 'discovery-leve'],
    seo: {
      title: 'User stories na pratica para PMs e POs | ProdForge',
      description:
        'Aprenda a transformar contexto solto em user stories com objetivo, criterios de aceite, gaps e checklist de refinamento.',
    },
  },
  {
    slug: 'backlog-e-refinamento',
    category: 'Backlog',
    title: 'Backlog e refinamento sem caos',
    excerpt:
      'Como organizar prioridade, maturidade e conversa com o squad sem transformar backlog em deposito de pedidos.',
    readingTime: '6 min',
    level: 'Iniciante',
    problem:
      'O backlog cresce, muda toda semana e mistura ideia crua com item pronto para desenvolvimento.',
    outcome:
      'Voce passa a usar backlog como sistema de foco e refinamento, nao como arquivo morto de demandas.',
    quickSummary: [
      'Backlog bom mostra o que esta pronto, o que ainda e hipotese e o que deve sair de cena.',
      'Refinamento serve para reduzir ambiguidade antes da implementacao.',
      'Nao refine tudo; refine o que esta perto de entrar em execucao.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'Um PM tem 40 itens no board, mas so 5 realmente podem entrar no proximo ciclo. O time perde tempo discutindo detalhe de item que nem foi priorizado.',
      bullets: [
        'Separar ideias de itens em preparacao reduz ruido.',
        'Trazer contexto minimo antes do refinamento economiza reuniao.',
        'Marcar gaps evita que a conversa vire descoberta improvisada.',
      ],
      result:
        'O refinamento fica mais curto e as decisoes ficam melhores documentadas.',
    },
    sections: [
      {
        title: 'Organize backlog por maturidade',
        paragraphs: [
          'Nem tudo no backlog merece o mesmo nivel de detalhe.',
          'Separar itens por maturidade ajuda a evitar refinamento precoce e retrabalho documental.',
        ],
        bullets: [
          'Ideia: ainda precisa de contexto.',
          'Em analise: problema mais claro, mas faltam perguntas.',
          'Pronto para refinamento: material suficiente para conversa tecnica e de QA.',
        ],
      },
      {
        title: 'Leve insumo suficiente para a conversa',
        paragraphs: [
          'Refinamento bom nao nasce do nada. O PM precisa chegar com objetivo, regras conhecidas, restricoes e duvidas abertas.',
          'Se tudo e descoberto ao vivo, a reuniao fica longa e rasa ao mesmo tempo.',
        ],
        bullets: [
          'Contexto do problema.',
          'Impacto esperado.',
          'Riscos, excecoes e dependencias conhecidas.',
        ],
      },
      {
        title: 'Saia com pendencias claras, nao com falsa certeza',
        paragraphs: [
          'Refinamento nao precisa encerrar todas as perguntas, mas precisa mostrar o que ficou em aberto e quem resolve.',
          'Esconder lacuna para "ganhar velocidade" so empurra risco para a sprint.',
        ],
        bullets: [
          'Liste duvidas abertas explicitamente.',
          'Atribua dono para cada retorno necessario.',
          'Nao marque item como pronto se a conversa tecnica critica ainda depende de suposicao.',
        ],
      },
    ],
    commonMistakes: [
      'Detalhar item que ainda nao foi priorizado.',
      'Usar refinamento como reuniao de descoberta do problema.',
      'Guardar perguntas importantes apenas na memoria do PM.',
    ],
    checklist: [
      'O backlog separa bem ideia, analise e item pronto.',
      'Os proximos itens do time ja tem contexto minimo para conversa.',
      'As pendencias abertas estao registradas com dono.',
      'O refinamento ajuda a decidir, nao apenas a preencher campos.',
    ],
    nextReads: ['scrum-para-pm-po', 'user-stories-na-pratica'],
    seo: {
      title: 'Backlog e refinamento sem caos para PM e PO | ProdForge',
      description:
        'Guia pratico para organizar backlog, preparar refinamento e reduzir ambiguidade antes do desenvolvimento.',
    },
  },
  {
    slug: 'scrum-para-pm-po',
    category: 'Scrum',
    title: 'Scrum para PMs e POs sem teatrinho',
    excerpt:
      'O que cada cerimonia deve resolver de verdade e como evitar que o ritual esconda a falta de clareza no trabalho.',
    readingTime: '7 min',
    level: 'Iniciante',
    problem:
      'Times fazem daily, planning e review no calendario, mas continuam com desalinhamento, retrabalho e prioridade difusa.',
    outcome:
      'Voce passa a usar as cerimonias como ponto de decisao e alinhamento, em vez de cumprir roteiro por habito.',
    quickSummary: [
      'Cerimonia boa reduz duvida operacional ou de prioridade.',
      'PM/PO nao precisa dominar o palco; precisa deixar o objetivo claro.',
      'Se a reuniao nao muda a decisao, ela provavelmente esta inflada.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'Na planning, o time recebe historias sem contexto e a conversa vira disputa sobre detalhe tecnico. Na review, todos assistem demo, mas ninguem aprende com o resultado.',
      bullets: [
        'Planning precisa responder o que entra e por que entra.',
        'Daily precisa expor bloqueio relevante, nao status recitado.',
        'Review precisa conectar entrega ao problema e ao aprendizado.',
      ],
      result:
        'Quando a cerimonia tem proposito claro, o time fala menos de processo e mais de decisao.',
    },
    sections: [
      {
        title: 'Planning: alinhe expectativa antes de falar de capacidade',
        paragraphs: [
          'Planning ruim comeca por horas e pontos sem clareza do que esta sendo puxado.',
          'O PM ajuda mais quando explica contexto, prioridade e risco dos itens principais.',
        ],
        bullets: [
          'Quais itens realmente importam neste ciclo?',
          'O que ainda esta sensivel ou depende de validacao?',
          'O que nao deve entrar agora?',
        ],
      },
      {
        title: 'Daily: trate bloqueio cedo',
        paragraphs: [
          'Daily nao e auditoria de produtividade. Ela existe para tornar impedimento visivel cedo o bastante para ser tratado.',
          'Se o time so repete tarefa, a reuniao perde valor rapido.',
        ],
        bullets: [
          'Qual bloqueio impede avancar hoje?',
          'Ha duvida de regra, prioridade ou dependencia externa?',
          'O PM precisa destravar algo com outro stakeholder?',
        ],
      },
      {
        title: 'Review e retro: feche ciclo de entrega e aprendizado',
        paragraphs: [
          'Review sem contexto vira apenas exibicao. Retro sem acao vira catarse.',
          'O PM ajuda quando conecta entrega ao problema e leva para a retro friccoes reais do fluxo de produto.',
        ],
        bullets: [
          'O que foi entregue resolveu a dor certa?',
          'O que aprendemos sobre escopo, clareza ou dependencia?',
          'Qual ajuste concreto o time vai testar no proximo ciclo?',
        ],
      },
    ],
    commonMistakes: [
      'Tratar cerimonia como prova de maturidade.',
      'Levar item sem contexto para planning.',
      'Sair de retro sem ajuste concreto para o fluxo.',
    ],
    checklist: [
      'Cada cerimonia tem uma decisao clara para produzir.',
      'As historias que entram em planning ja chegam com contexto suficiente.',
      'Bloqueios relevantes aparecem cedo no ciclo.',
      'Review e retro geram aprendizado acionavel, nao so observacao.',
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
    title: 'Discovery leve para comecar bem',
    excerpt:
      'Como validar problema, hipotese e necessidade sem transformar discovery em burocracia paralela ao backlog.',
    readingTime: '6 min',
    level: 'Iniciante',
    problem:
      'No comeco, discovery costuma ser tratado como algo grande demais ou e pulado completamente quando a pressao por entrega aumenta.',
    outcome:
      'Voce aprende um discovery leve o suficiente para ser pratico e forte o bastante para evitar backlog construido em suposicao.',
    quickSummary: [
      'Discovery leve serve para reduzir risco de atacar o problema errado.',
      'Nem toda decisao precisa de pesquisa extensa, mas quase toda decisao precisa de uma hipotese explicita.',
      'O objetivo e chegar em backlog melhor, nao produzir documento paralelo.',
    ],
    exampleScenario: {
      title: 'Exemplo real',
      summary:
        'Uma lideranca pede campo novo no cadastro porque "vai ajudar a operacao". Antes de implementar, o PM investiga em que momento o time operacional sente falta dessa informacao.',
      bullets: [
        'Quem sofre com a falta do dado hoje?',
        'O problema acontece com qual frequencia?',
        'Existe alternativa menor para validar a necessidade?',
      ],
      result:
        'As vezes a descoberta mostra que o problema e de processo interno, nao de produto. Isso economiza sprint inteira.',
    },
    sections: [
      {
        title: 'Comece por uma hipotese pequena e verificavel',
        paragraphs: [
          'Discovery leve nao tenta responder tudo. Ele parte de uma hipotese direta sobre problema, publico e impacto.',
          'Quanto mais concreta a hipotese, melhor a conversa com usuario, operacao ou dados.',
        ],
        bullets: [
          'Problema: o que esta travando hoje?',
          'Publico: quem sente isso com mais frequencia?',
          'Impacto: o que deve melhorar se a hipotese estiver certa?',
        ],
      },
      {
        title: 'Use evidencias proporcionais ao risco',
        paragraphs: [
          'Algumas decisoes pedem entrevista. Outras pedem olhar funil, ticket ou sombra de operacao.',
          'O ponto nao e fazer pesquisa sofisticada; e ter evidencia suficiente para nao trabalhar no escuro.',
        ],
        bullets: [
          'Conversa com usuarios ou stakeholders proximos da dor.',
          'Dados basicos de ocorrencia ou conversao.',
          'Leitura de suporte, reclamacoes e retrabalho operacional.',
        ],
      },
      {
        title: 'Traga discovery de volta para a historia',
        paragraphs: [
          'Discovery so fecha ciclo quando muda a qualidade do backlog.',
          'O resultado precisa aparecer em objetivo, criterio, risco e decisao de prioridade.',
        ],
        bullets: [
          'Atualize o problema com o que foi confirmado.',
          'Registre a hipotese que continua em aberto.',
          'Transforme o aprendizado em criterio ou pergunta de refinamento.',
        ],
      },
    ],
    commonMistakes: [
      'Tratar discovery como fase separada do resto do trabalho.',
      'Pesquisar demais para problema pequeno.',
      'Terminar discovery sem ajustar backlog ou prioridade.',
    ],
    checklist: [
      'A hipotese do item esta explicita.',
      'Existe evidencia minima para nao decidir no escuro.',
      'O aprendizado ja voltou para a historia ou para a prioridade.',
      'Ainda sabemos o que falta validar antes de escalar a solucao.',
    ],
    nextReads: ['fundamentos-produto-agil', 'user-stories-na-pratica'],
    seo: {
      title: 'Discovery leve para PM e PO iniciante | ProdForge',
      description:
        'Guia pratico para validar problema, hipotese e necessidade sem burocracia, conectando discovery ao backlog real.',
    },
  },
]

export const learningNotes = [
  {
    slug: 'ia-para-melhorar-user-stories',
    title: 'IA para melhorar user stories sem terceirizar pensamento',
    tag: 'Novidade pratica',
    summary:
      'Use IA para organizar contexto, explicitar gaps e acelerar a primeira versao. Nao use para decidir prioridade no seu lugar.',
    ctaLabel: 'Ler guia de user stories',
    targetGuideSlug: 'user-stories-na-pratica',
  },
  {
    slug: 'como-conversar-melhor-com-dev',
    title: 'Como conversar melhor com dev sem virar pseudo-tech lead',
    tag: 'Novidade pratica',
    summary:
      'A melhor conversa com dev nao e a que tenta desenhar a implementacao inteira. E a que deixa claro problema, regra, excecao e restricao.',
    ctaLabel: 'Ler guia de backlog e refinamento',
    targetGuideSlug: 'backlog-e-refinamento',
  },
  {
    slug: 'sinais-de-backlog-mal-definido',
    title: 'Sinais de backlog mal definido antes de virar retrabalho',
    tag: 'Novidade pratica',
    summary:
      'Quando varias historias dependem de reuniao extra para entender o basico, o backlog esta sinalizando falta de contexto, nao falta de velocidade.',
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
