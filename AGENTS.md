# AGENTS.md — ProdForge

## Regra obrigatória de pt-BR

Todo texto visível ao usuário deve estar em português brasileiro correto, com acentuação completa, concordância, pontuação e vocabulário consistente.

Antes de finalizar qualquer mudança em UI, SEO, JSON-LD, aria-labels, placeholders, alt text, mensagens de status, mensagens de erro ou exemplos exibidos ao usuário, rode:

```bash
npm run copy:check
```

Para uma validação completa antes de PR ou deploy, rode:

```bash
npm run quality
```

## Escopo da regra

Aplica-se a:

- textos em JSX;
- conteúdo em `src/content`;
- páginas estáticas em `aprender/**/*.html`;
- `index.html`, meta tags, Open Graph, Twitter cards e JSON-LD;
- manifestos públicos com nome ou descrição do produto;
- labels, botões, placeholders, aria-labels e alt text;
- exemplos carregados na interface.

Não altere slugs, rotas, URLs, ids, nomes de arquivos, nomes técnicos ou chaves de API para “acentuar” texto que não é visível ao usuário.

## Vocabulário e marca

- Nome público do produto: `ProdForge`.
- Não usar `Ajuda PM`, `Prod Forge` ou `Prodforge` na interface pública.
- Termos técnicos permitidos quando fizerem sentido: `user story`, `user stories`, `backlog`, `sprint`, `brief`, `workspace`, `PM`, `PO`, `QA`, `Jira`, `Supabase`.
- Preferir `história de usuário` ou `user story`; não usar `estória`.
- Preferir `critérios de aceite`; não trocar por `critérios de aceitação` sem motivo de contexto.

## Erros recorrentes que devem bloquear a entrega

Corrija sempre palavras sem acento como:

`voce`, `nao`, `agil`, `area`, `gratis`, `pratico`, `pratica`, `criterios`, `historia`, `versao`, `decisao`, `revisao`, `historico`, `navegacao`, `conteudo`, `geracao`, `validacao`, `dominio`, `negocio`, `cenario`, `tecnico`, `usuario`, `usuarios`, `possivel`, `apos`, `ate`, `disponivel`.

O checker automatizado cobre esses casos comuns, mas ele não substitui revisão humana de gramática e clareza.
