# COPY_GUIDE_PT_BR.md — ProdForge

## Objetivo

Este guia define o padrão de idioma, tom e revisão de textos visíveis no ProdForge.

A interface deve reforçar a promessa do produto: transformar contexto solto em user stories claras, completas e prontas para revisão com dev e QA.

## Regra principal

Todo texto visível ao usuário deve estar em português do Brasil, com ortografia, acentuação, concordância e pontuação corretas.

Não finalize uma alteração de UI se houver texto visível com erro de português.

## Nome e marca

- Nome oficial do produto: ProdForge.
- Não usar “Ajuda PM” na interface pública.
- Não misturar nomes de marca.
- Não usar variações como “Prod Forge”, “Prodforge” ou “ProdForge App” sem necessidade.

## Tom de voz

O tom deve ser:

- Claro.
- Profissional.
- Direto.
- Confiável.
- Premium sem exagero.
- Focado em resultado prático.

Evite:

- Tom artificial de IA.
- Promessas infladas.
- Frases genéricas.
- Mistura desnecessária de inglês e português.
- Jargões que não ajudam a tomada de decisão.

## Vocabulário preferido

Use estes termos de forma consistente:

- user story
- história de usuário
- critérios de aceite
- backlog
- contexto
- objetivo
- regra de negócio
- cenário alternativo
- gap
- risco
- checklist de QA
- dev
- QA
- PM
- PO
- produto
- squad
- exportar
- copiar em Markdown
- formato Jira

Escolha um padrão por tela. Por exemplo: não misture “user story”, “história”, “estória”, “story” e “história do usuário” no mesmo bloco sem motivo.

## Termos proibidos ou a evitar

Evite frases como:

- “Potencialize sua produtividade com IA.”
- “Eleve seu fluxo de trabalho.”
- “Desbloqueie o poder da inteligência artificial.”
- “Crie histórias incríveis em segundos.”
- “Workspace revolucionário.”
- “Solução definitiva.”
- “Mágica com IA.”

Evite erros comuns:

- “desenvovlimento” → desenvolvimento
- “proficional” → profissional
- “critérios de aceitação” quando o padrão da tela é “critérios de aceite”
- “estória” → preferir “história de usuário” ou “user story”
- “usuario” → usuário
- “historico” → histórico
- “versao” → versão
- “criterios” → critérios
- “objetivo” sem contexto quando o usuário precisa entender o resultado

## Padrão de CTA

CTAs devem ser claros e orientados à ação.

Bons exemplos:

- Criar user story
- Gerar história
- Revisar critérios
- Copiar em Markdown
- Copiar para Jira
- Salvar versão
- Comparar versões
- Testar grátis
- Começar agora

Evite:

- Enviar
- Submeter
- Avançar sem contexto
- Clique aqui
- Vamos nessa

## Padrão de mensagens

### Estado vazio

Explique o que o usuário deve fazer e dê um exemplo curto.

Exemplo:

“Cole um contexto de produto, uma dor do usuário ou uma demanda do backlog. O ProdForge transforma isso em uma user story estruturada com critérios de aceite.”

### Loading

Mostre progresso percebido, não apenas spinner.

Exemplos:

- Analisando o contexto
- Estruturando a user story
- Revisando critérios de aceite
- Buscando gaps e riscos

### Erro

Mantenha o tom calmo e útil.

Exemplo:

“Não foi possível gerar a user story agora. Seu contexto foi preservado. Tente novamente em alguns instantes.”

### Sucesso

Mostre o próximo passo.

Exemplo:

“User story gerada. Revise os critérios de aceite antes de copiar para o backlog.”

## Checklist obrigatório antes de finalizar UI

Antes de concluir uma tarefa visual, revise:

- O nome ProdForge está consistente?
- Existe qualquer texto visível com erro de ortografia?
- Os acentos estão corretos?
- A concordância está correta?
- A pontuação ajuda a leitura?
- O CTA diz exatamente o que acontece?
- O texto parece humano e profissional?
- Há mistura desnecessária de inglês e português?
- A promessa da tela é clara em poucos segundos?
- A interface reforça clareza, padronização e redução de retrabalho?

## Regra de implementação

Sempre que possível, centralize textos importantes em arquivos de conteúdo, por exemplo:

- `src/content/landingCopy.js`
- `src/content/workspaceCopy.js`
- `src/content/navigationCopy.js`

Evite espalhar frases longas em muitos componentes. Isso reduz erro de português e facilita revisão futura.
