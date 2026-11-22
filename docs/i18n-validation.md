# Validação e encerramento da internacionalização

**Estado: encerrado em 22/11/2026, sem bloqueadores abertos no escopo entregue.** Base integrada de referência: `aa09fc234509771994bba460caeb091ae46d85e1`, após os PRs #14 e #15. O [backlog conciliado](i18n-backlog.md) relaciona cada grupo de entregas às evidências e separa as propostas futuras.

O encerramento cobre seletor e navegação em Português (Brasil) e English, páginas públicas, conteúdo editorial e legal, autenticação, área logada, Campo de Treino, seis modelos de e-mail do Auth, convites da Roda e SMTP próprio para cadastro público. O idioma dos resultados gerados por IA continua em português (Brasil), como decisão separada da interface. Geração em inglês e ampliação dos testes externos de e-mail são propostas futuras, sem implementação aprovada e sem impedir este encerramento.

Este registro consolida as verificações de 21 e 22/11/2026. As evidências históricas abaixo não são apresentadas como novos testes executados durante a atualização documental, que não exige nova publicação ou alteração do backend.

## Componentes publicados

| Componente | Referência conferida |
| --- | --- |
| Frontend bilíngue, autenticação, páginas públicas e áreas internas | `release.json` servido: `d5b47c314c210b0e30b876a55c0a0f39271d831e` |
| Termos, Privacidade e aceite no servidor | Versão `2026-11-18.1`; SHA-256 `5c455a00be5f0a7d6fc2cbd1cb91870672fae3124d0e79fab6588f89fa9a8a57` |
| Seis modelos de Auth, assunto e HTML | Doze campos correspondentes ao candidato `2e01cf6113d8e5ef015b6d676b73724f262a56fbf18225c4bfa4a3d9cf85af52` |
| Convite da Roda, assunto, texto simples e HTML | `planning-poker-invite` versão 2, ativa, JWT obrigatório; integração `c399940` |
| SMTP próprio do Auth e cadastro público | Hostinger com TLS na porta 465; remetente ProdForge; 10 mensagens/hora e intervalo de 60 segundos; integração até `aa09fc2` |

As referências da tabela vêm das conferências de publicação registradas nas entregas. Uma revisão mais recente da documentação não altera o SHA do frontend servido. As fontes e os catálogos correspondentes já estão publicados; atualizar estes arquivos Markdown não exige repetir FTPS, migrações, publicação de funções, aplicação dos modelos ou configuração SMTP.

## Validação local registrada

As cinco suítes abaixo passaram no fechamento de 21/11/2026. A etapa de SMTP próprio acrescentou as validações de 22/11 descritas na seção seguinte.

| Comando | Cobertura e resultado |
| --- | --- |
| `npm run quality` | PASSOU: lint, copy nos dois idiomas, catálogos, 60 testes unitários e build |
| `npm run test:e2e:release` | PASSOU: quatro casos em desktop e celular; páginas públicas, documentos, preferências e exclusão das minutas |
| `npm run test:e2e:i18n` | PASSOU: 66 casos em desktop e celular, com português e inglês |
| `npm run test:auth:release` | PASSOU: quatro jornadas de cadastro, reenvio, confirmação real, aceite, login e saída; seis modelos × dois idiomas e quatro fallbacks |
| `npm run test:invites:local` | PASSOU: oito testes Deno, oito rejeições sem SMTP, quatro jornadas completas de convite e dois fallbacks |

Os testes de autenticação e convites usam PostgreSQL, GoTrue, PostgREST e SMTP descartáveis; o convite usa TLS com uma CA temporária. As jornadas validam idioma explícito contra preferência salva, destino, parâmetros codificados/duplicados, âncora, teclado, recarga e ausência de exceções JavaScript. Os tamanhos são desktop 1440×900 e celular 320×740. Os testes gerais simulam respostas do backend; os testes de Auth e convite usam serviços locais reais. Nenhum deles consulta o backend remoto.

### SMTP próprio e CI — 22/11/2026

- PASSOU: `node --test scripts/auth-smtp.test.mjs`, com 15 testes no Windows, incluindo DPAPI, adulteração, escopo por projeto, concorrência, idempotência, patch mínimo, recuperação e retorno opaco de segredo pela API. O teste de regressão reproduziu a falha do verificador antes da correção.
- PASSOU: `npm run test:auth:smtp`, com 34 mensagens locais enviadas por TLS e SMTP AUTH obrigatórios; seis modelos nos dois idiomas, quatro jornadas de desktop/celular e fallbacks. Certificado validado com CA temporária restrita ao container de Auth.
- PASSOU: `npm run test:invites:local` e `npm run quality`, preservando os testes da Roda, os catálogos, os 60 testes unitários e o build.
- PASSOU: [CI do PR #15](https://github.com/hugomorasneto/ajuda-pm/actions/runs/45026762282) e [CI de main em aa09fc2](https://github.com/hugomorasneto/ajuda-pm/actions/runs/45027182535), incluindo isolamento do monitoramento, Auth, SMTP TLS, Roda e qualidade. No Linux, apenas o caso específico de DPAPI é omitido; ele passou localmente no Windows.

A ativação alterou sete campos de SMTP/limite, com checkpoint anterior cifrado fora do Git. A API devolveu um valor opaco no campo da senha, causando uma falha inicial de verificação. A correção compara somente configurações conferíveis e exige prova de entrega separada; não foi necessário reaplicar o PATCH. O checkpoint real foi decifrado e sua restauração foi simulada em memória, sem escrita remota. O [guia de SMTP](auth-smtp.md) contém o procedimento e as limitações de recuperação.

## Recebimento externo registrado

### Convites e links de acesso — 21/11/2026

A validação usa somente a caixa de QA indicada pelo responsável, com consulta de recebimento pelo conector Gmail. A conta existente, sua senha e suas outras sessões devem ser preservadas. O projeto, a Roda e a conta facilitadora usados no ensaio são exclusivos de QA. Os dados e recibos privados ficam fora do Git, sem tokens, links de autenticação ou endereços pessoais nesta documentação pública.

PASSOU em 21/11/2026: os quatro e-mails chegaram à caixa de entrada do Gmail, sem classificação como spam. Foram conferidos os assuntos, o idioma do HTML, os botões e os destinos dos links recebidos.

| Mensagem | Idioma | Recebimento e link |
| --- | --- | --- |
| Convite da Roda | Português (Brasil) | Recebido; botão pelo teclado → login com código e idioma preservados |
| Link de acesso do Auth | Português (Brasil) | Recebido; link original → autenticação real → Roda correta → recarga |
| Convite da Roda | English | Recebido; botão pelo teclado → login com destino direto, parâmetros duplicados, valor codificado e âncora preservados |
| Link de acesso do Auth | English | Recebido; link original → autenticação real → Roda correta → recarga |

A navegação externa usou desktop para português e celular para inglês, além das quatro jornadas locais de cada fluxo nos dois idiomas e tamanhos. A preferência salva contrária ao convite não sobrepôs o idioma explícito. As capturas dos corpos recebidos e das páginas confirmaram conteúdo visível e ausência de cortes horizontais; as jornadas não tiveram exceções JavaScript.

Uma conferência adicional do login publicado, nos dois idiomas em 1440 e 320 pixels de largura, não registrou erros nem avisos de console.

O teste externo de Auth usou somente o modelo de link de acesso, preservando a senha da conta existente. Os outros cinco modelos têm cobertura local, não uma comprovação de entrega externa nesta rodada. Foram usados dois envios de Auth, respeitando o intervalo do projeto, e dois de convite da Roda. Limites, SMTP, hooks, configurações de Auth, versões das funções e frontend servido foram preservados e comparados antes e depois. A conta facilitadora, o projeto e a Roda de QA foram removidos com conferência de ausência. Somente as sessões criadas pelo teste foram revogadas; a conta existente e suas outras sessões foram preservadas.

O provedor padrão usado nessa rodada tinha restrições de entrega, detalhadas em [auth-emails.md](auth-emails.md). Essa condição histórica foi superada pela ativação de SMTP próprio em 22/11/2026, com configuração e validação próprias abaixo.

### Cadastro público com SMTP próprio — 22/11/2026

PASSOU: dois cadastros novos, usando aliases exclusivos da caixa de QA autorizada, sem inclusão na equipe do projeto Supabase. A confirmação em português foi validada no desktop (1440×900) e a confirmação em inglês no celular (320×740). As duas mensagens chegaram à caixa de entrada do Gmail com SPF, DKIM e DMARC aprovados.

Os links originais foram acionados por teclado e mantiveram o idioma, o destino `/times`, parâmetros repetidos, valores escapados e âncora. A recarga manteve o idioma e a sessão. Foram conferidos o bloqueio do login antes da confirmação e o recibo do aceite legal no idioma apresentado, sem erros de console ou exceções JavaScript. As quatro combinações de idioma/tamanho também têm cobertura local.

As sessões das duas contas de QA foram encerradas antes de removê-las; propriedade e ausência foram conferidas por ID. A conta habitual do responsável foi preservada. A comparação antes/depois confirmou a preservação dos modelos, callbacks, políticas, funções e release do frontend. A caixa de envio, sua senha e a configuração da Roda não foram alteradas.

### Limites da comprovação externa

O modelo de confirmação foi recebido pelo novo SMTP nos dois idiomas; o modelo de link de acesso teve recebimento externo no transporte anterior, além dos convites da Roda pelo SMTP próprio da função. Convite de conta, recuperação de senha, alteração de e-mail e reautenticação têm cobertura local, sem comprovação de entrega externa nessas rodadas. O recebimento no Gmail não comprova renderização em Outlook, Apple Mail ou em todos os dispositivos. Os testes de layout usam Chromium/Playwright, pois o plugin Browser não estava disponível nas validações registradas.

Esses reforços estão separados como propostas opcionais no [backlog](i18n-backlog.md#propostas-futuras). A capacidade da caixa e seus limites compartilhados exigem acompanhamento operacional: os 10 envios/hora do Auth não garantem capacidade ilimitada nem reservam a cota da Hostinger para o ProdForge.

## Fechamento documental — 22/11/2026

Esta atualização concilia o backlog, corrige referências ao SMTP ainda no futuro e alinha os guias de contribuição e idiomas à produção bilíngue. As únicas alterações são em arquivos Markdown.

- PASSOU nesta atualização: `npm run quality` (lint, copy nos dois idiomas, catálogos, 60 testes unitários e build), `git diff --check` e conferência dos 48 links locais e suas âncoras nos nove arquivos alterados.
- PASSOU: `npm audit --omit=dev --audit-level=high`, com zero vulnerabilidades nas dependências de produção.
- Avisos preexistentes: `npm ci` informa 13 vulnerabilidades em dependências de desenvolvimento (uma baixa, três moderadas e nove altas); o build informa um chunk acima de 500 kB. Não foram corrigidos nem atribuídos à internacionalização por este fechamento documental.
- NÃO EXECUTADO localmente nesta atualização: repetição das suítes de navegador e recebimento externo. Seus registros anteriores permanecem válidos para o código inalterado; o CI existente revalida Auth, SMTP TLS e Roda no PR e em `main`.
- NÃO EXECUTADO: novo deploy, migração ou alteração do backend remoto. O pedido de encerramento documental não exige essas operações.

O commit e a integração desta atualização ficam no histórico do Git e no PR do fechamento. A referência `aa09fc2` identifica a base funcional encerrada; não deve ser confundida com o SHA do frontend servido ou com os commits posteriores desta documentação.

## Continuidade operacional

Português brasileiro permanece como padrão. Novas traduções precisam passar por `npm run copy:check`; PRs e publicações precisam passar por `npm run quality`. Conteúdo já criado mantém seu idioma. Alterar textos legais exige uma nova versão e arquivo imutável, preservando os aceites anteriores. Os procedimentos de publicação e recuperação estão em [publicacao-ftps.md](publicacao-ftps.md), [auth-emails.md](auth-emails.md) e [roda-invite-emails.md](roda-invite-emails.md).

O [backlog conciliado](i18n-backlog.md) registra o que foi encerrado e o que depende de nova decisão. O checklist geral de lançamento do MVP é outro escopo e não foi marcado como concluído por esta entrega. A manutenção documental não reabre a versão legal, não traduz conteúdo existente, não contrata capacidade de envio nem autoriza novas chamadas de IA ou mensagens reais.
