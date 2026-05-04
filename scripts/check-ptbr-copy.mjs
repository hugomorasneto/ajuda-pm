import { collectVisibleCopy } from './extract-visible-copy.mjs'

const WORD_RULES = [
  ['voce', 'você'],
  ['voces', 'vocês'],
  ['nao', 'não'],
  ['estao', 'estão'],
  ['agil', 'ágil'],
  ['area', 'área'],
  ['gratis', 'grátis'],
  ['pratico', 'prático'],
  ['pratica', 'prática'],
  ['criterio', 'critério'],
  ['criterios', 'critérios'],
  ['historia', 'história'],
  ['historias', 'histórias'],
  ['hipotese', 'hipótese'],
  ['decisao', 'decisão'],
  ['versao', 'versão'],
  ['excecao', 'exceção'],
  ['excecoes', 'exceções'],
  ['restricao', 'restrição'],
  ['saida', 'saída'],
  ['proximo', 'próximo'],
  ['proximas', 'próximas'],
  ['rapido', 'rápido'],
  ['util', 'útil'],
  ['uteis', 'úteis'],
  ['publico', 'público'],
  ['duvida', 'dúvida'],
  ['duvidas', 'dúvidas'],
  ['frequencia', 'frequência'],
  ['proposito', 'propósito'],
  ['suposicao', 'suposição'],
  ['verificavel', 'verificável'],
  ['utilizavel', 'utilizável'],
  ['revisavel', 'revisável'],
  ['proprio', 'próprio'],
  ['repertorio', 'repertório'],
  ['logica', 'lógica'],
  ['exportacoes', 'exportações'],
  ['padroes', 'padrões'],
  ['dependencias', 'dependências'],
  ['implementacao', 'implementação'],
  ['execucao', 'execução'],
  ['conversao', 'conversão'],
  ['lideranca', 'liderança'],
  ['friccoes', 'fricções'],
  ['analise', 'análise'],
  ['tecnica', 'técnica'],
  ['tecnico', 'técnico'],
  ['basico', 'básico'],
  ['basica', 'básica'],
  ['minimo', 'mínimo'],
  ['minima', 'mínima'],
  ['continuo', 'contínuo'],
  ['comeco', 'começo'],
  ['comeca', 'começa'],
  ['comecam', 'começam'],
  ['usuario', 'usuário'],
  ['usuarios', 'usuários'],
  ['historico', 'histórico'],
  ['revisao', 'revisão'],
  ['navegacao', 'navegação'],
  ['conteudo', 'conteúdo'],
  ['geracao', 'geração'],
  ['geracoes', 'gerações'],
  ['glossario', 'glossário'],
  ['validacao', 'validação'],
  ['dominio', 'domínio'],
  ['negocio', 'negócio'],
  ['cenario', 'cenário'],
  ['tecnicos', 'técnicos'],
  ['integracoes', 'integrações'],
  ['obrigatorio', 'obrigatório'],
  ['paginacao', 'paginação'],
  ['titulo', 'título'],
  ['operacao', 'operação'],
  ['possivel', 'possível'],
  ['apos', 'após'],
  ['ate', 'até'],
  ['acoes', 'ações'],
  ['sera', 'será'],
  ['aparecerao', 'aparecerão'],
  ['disponivel', 'disponível'],
  ['desnecessario', 'desnecessário'],
  ['compativel', 'compatível'],
  ['selecoes', 'seleções'],
  ['botao', 'botão'],
  ['confirmacao', 'confirmação'],
  ['notificacao', 'notificação'],
  ['notificacoes', 'notificações'],
  ['recuperacao', 'recuperação'],
  ['sessao', 'sessão'],
  ['avancar', 'avançar'],
  ['dominios', 'domínios'],
  ['genericos', 'genéricos'],
  ['combinavel', 'combinável'],
  ['combinaveis', 'combináveis'],
  ['preco', 'preço'],
  ['frustracao', 'frustração'],
  ['limitacoes', 'limitações'],
  ['tecnicas', 'técnicas'],
  ['desperdicio', 'desperdício'],
  ['edicoes', 'edições'],
  ['sugestoes', 'sugestões'],
  ['materia', 'matéria'],
  ['atencao', 'atenção'],
  ['versoes', 'versões'],
  ['comparacao', 'comparação'],
  ['restricoes', 'restrições'],
  ['comecar', 'começar'],
  ['praticos', 'práticos'],
  ['inicio', 'início'],
  ['pagina', 'página'],
  ['periodo', 'período'],
  ['proxima', 'próxima'],
  ['aceitacao', 'aceitação'],
  ['faca', 'faça'],
]

const PHRASE_RULES = [
  [/Ajuda PM/gu, 'ProdForge'],
  [/Prod Forge/gu, 'ProdForge'],
  [/\bProdforge\b/gu, 'ProdForge'],
  [/\bGenerated\b/gu, 'Gerado'],
  [/\bReviewed\b/gu, 'Revisado'],
  [/\bApproved\b/gu, 'Aprovado'],
  [/\bArchived\b/gu, 'Arquivado'],
  [/\besta (?=(gerando|recebendo|preparad|disponível|sendo|pronta|pronto))/giu, 'está'],
]

function buildWordPattern(word) {
  return new RegExp(`\\b${word}\\b`, 'giu')
}

function findMatches(item) {
  const matches = []

  for (const [word, suggestion] of WORD_RULES) {
    const pattern = buildWordPattern(word)
    for (const match of item.text.matchAll(pattern)) {
      matches.push({
        term: match[0],
        suggestion,
        index: match.index ?? 0,
      })
    }
  }

  for (const [pattern, suggestion] of PHRASE_RULES) {
    for (const match of item.text.matchAll(pattern)) {
      matches.push({
        term: match[0],
        suggestion,
        index: match.index ?? 0,
      })
    }
  }

  return matches.sort((left, right) => left.index - right.index)
}

const issues = collectVisibleCopy().flatMap((item) =>
  findMatches(item).map((match) => ({ ...item, ...match })),
)

if (issues.length > 0) {
  console.error('Erros de pt-BR encontrados em copy visível:')
  for (const issue of issues) {
    console.error(
      `- ${issue.file}:${issue.line}:${issue.column} "${issue.term}" -> "${issue.suggestion}"`,
    )
    console.error(`  ${issue.text}`)
  }
  process.exit(1)
}

console.log('Copy visível em pt-BR: nenhuma regressão conhecida encontrada.')
