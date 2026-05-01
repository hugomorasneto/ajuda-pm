# ProdForge MVP - Checklist de Validacao

## Acesso e navegacao
- [ ] `https://prodforge.techtupa.com.br/` abre sem erro em aba anonima
- [ ] Landing carrega bem em desktop
- [ ] Landing carrega bem em mobile
- [ ] Header e footer nao levam para paginas placeholder
- [ ] Nao ha erros no console da home, signup, login e tool

## Auth e onboarding
- [ ] Signup com e-mail novo leva para confirmacao ou libera acesso conforme a configuracao atual do Auth
- [ ] Login com conta existente abre `/tool`
- [ ] Signout retorna para login com feedback claro
- [ ] Fluxo com e-mail nao confirmado mostra orientacao correta

## Geracao com IA
- [ ] Geracao com contexto curto funciona
- [ ] Geracao com contexto longo funciona
- [ ] Campo vazio bloqueia envio com mensagem clara
- [ ] Falha da IA preserva o contexto digitado
- [ ] Timeout ou indisponibilidade da function nao quebra a tela

## Resultado e workspace
- [ ] User story gerada aparece estruturada
- [ ] Copiar resultado funciona
- [ ] Story salva no historico
- [ ] Reabrir story do historico funciona
- [ ] Regenerar versao com ajuste continua no mesmo grupo

## Leads e conversao
- [ ] Formulario de lead aceita nome e e-mail validos
- [ ] E-mail duplicado mostra feedback sem quebrar o fluxo
- [ ] Lead invalido nao envia
- [ ] Lead anonimo entra no banco
- [ ] `public.leads` nao pode ser listado anonimamente

## SEO e compartilhamento
- [ ] `title` e `description` corretos no HTML final
- [ ] `canonical` aponta para `https://prodforge.techtupa.com.br/`
- [ ] Open Graph mostra titulo, descricao e imagem corretos
- [ ] Preview no LinkedIn fica apresentavel
- [ ] Favicon carrega corretamente

## Release
- [ ] `npm run lint` passa
- [ ] `npm run build` passa
- [ ] Edge function `generate-user-story` responde em producao
- [ ] Variaveis sensiveis nao estao expostas no frontend
- [ ] Deploy final validado apos publicacao
