# ProdForge — Guia para o Claude Code

## Idioma e ortografia

**Todo texto visível ao usuário deve estar em português brasileiro correto, com acentuação completa.**

### Regra obrigatória
Antes de escrever qualquer string em português — seja em arquivos de conteúdo, JSX, aria-labels, placeholders ou comentários visíveis — revise a acentuação. Nunca escreva português sem acento.

### Palavras que exigem atenção especial

| Errado | Correto |
|--------|---------|
| voce | você |
| nao | não |
| esta / estao | está / estão |
| e (verbo ser) | é |
| agil | ágil |
| area | área |
| gratis | grátis |
| pratico / pratica | prático / prática |
| criterio / criterios | critério / critérios |
| historia / historias | história / histórias |
| hipotese | hipótese |
| decisao | decisão |
| versao | versão |
| excecao / excecoes | exceção / exceções |
| restricao | restrição |
| cerimonia / cerimonias | cerimônia / cerimônias |
| deposito | depósito |
| saida | saída |
| proximas / proximo | próximas / próximo |
| rapido | rápido |
| util / uteis | útil / úteis |
| publico | público |
| hipotese | hipótese |
| duvida / duvidas | dúvida / dúvidas |
| frequencia | frequência |
| proposito | propósito |
| suposicao | suposição |
| verificavel | verificável |
| utilizavel | utilizável |
| revisavel | revisável |
| proposta | proposta ✓ |
| proprio | próprio |
| repertorio | repertório |
| logica | lógica |
| exportacoes | exportações |
| padroes | padrões |
| dependencias | dependências |
| implementacao | implementação |
| execucao | execução |
| conversao | conversão |
| lideranca | liderança |
| friccoes | fricções |
| analise | análise |
| tecnica / tecnico | técnica / técnico |
| basico / basica | básico / básica |
| minimo / minima | mínimo / mínima |
| continuo | contínuo |
| comeco | começo |
| comeca / comecam | começa / começam |

### Aria-labels e textos de acessibilidade
Aria-labels também são texto de interface. Aplicar a mesma regra:
- `aria-label="Navegacao publica"` → `aria-label="Navegação pública"`
- `aria-label="Abrir navegacao"` → `aria-label="Abrir navegação"`

### CTAs e botões
- "Criar conta gratis" → "Criar conta grátis"
- "Abrir area de trabalho" → "Abrir área de trabalho"
- "Saiba mais" ✓ (já correto)
- "Ver exemplo" ✓

---

## Arquitetura do projeto

**Stack:** React 19 + React Router 7 + Vite 8 + CSS Modules/Custom CSS + Supabase

### Estrutura de pastas
```
src/
├── components/
│   ├── landing/        # Componentes da home pública
│   ├── learning/       # Componentes das páginas de aprendizagem
│   ├── navigation/     # Header e Footer públicos
│   └── workspace/      # Componentes da ferramenta (rota /tool)
├── content/
│   ├── landingCopy.js  # Todo o copy da home — edite aqui antes de tocar JSX
│   └── learningContent.js  # Conteúdo dos guias e hub de aprendizagem
├── pages/              # Componentes de página (rota → página)
├── styles/
│   ├── tokens.css      # Design tokens (cores, tipografia, espaçamento)
│   ├── public.css      # Estilos das páginas públicas
│   └── pages.css       # Estilos das páginas de auth e admin
└── hooks/              # useAuth, usePageMetadata
```

### Sistema de design
- **Tokens:** sempre use variáveis CSS de `tokens.css` — nunca valores hardcoded
- **Cor accent:** `--color-accent` (#0A7CFF) — use apenas em CTAs primários e destaques
- **Cor academy:** `--color-academy` (#6E56CF) — seção de aprendizagem
- **Badge pills:** use a classe `.badge-pill` para eyebrows e tags
- **Botões:** `.landing-button--primary` e `.landing-button--secondary`

### Regras de CSS
- Nomeação BEM: `.bloco__elemento--modificador`
- Nunca use Tailwind — o projeto usa CSS puro com tokens
- Mobile-first: breakpoints em `min-width`
- Breakpoints principais: `640px`, `768px`, `900px`

---

## Copy e posicionamento

O ProdForge é uma plataforma para **PMs e POs iniciantes** escreverem user stories mais claras com IA.

**Tom de voz:** direto, prático, confiante — sem jargão desnecessário.

**Headline principal:** "Escreva user stories que devs entendem na primeira leitura."

**CTA primário padrão (não autenticado):** "Gerar minha primeira história →"

**CTA autenticado:** "Abrir área de trabalho →"
