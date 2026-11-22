# Convites da Roda em português e inglês

Base da entrega: `53f1e078ecb13acf6dcdf421e485738172e7b7cd`. O frontend já inclui `lang` no `invite_url` enviado a `planning-poker-invite`. A função usa esse link como fonte única do idioma e do destino; o contrato da API permanece igual. Os modelos de autenticação são separados, descritos em [auth-emails.md](auth-emails.md).

## Estado publicado

`planning-poker-invite` está ativa em produção na versão 2, com `verify_jwt=true`, publicada após a integração do [PR #12](https://github.com/hugomorasneto/ajuda-pm/pull/12) em `c3999402cf3294fc14912bb5d920fae3ff1ffa80`. Os quatro arquivos baixados do servidor corresponderam à fonte validada. O frontend existente já era compatível e permaneceu na revisão `d5b47c3`. As configurações de SMTP, Auth e das demais funções foram preservadas.

O registro de recebimento e navegação dos e-mails nos dois idiomas está em [encerramento da internacionalização](i18n-validation.md), com o [backlog conciliado](i18n-backlog.md). A entrega da Roda está concluída. A função usa SMTP próprio do projeto; desde 22/11/2026, o [Auth também usa essa caixa](auth-smtp.md), com configuração e limite próprios. Os limites do serviço padrão do Supabase não descrevem esses transportes, e a cota da caixa na Hostinger é compartilhada pelos consumidores. A ativação do Auth preservou os segredos e a versão desta função.

## Comportamento

- `lang=en` e `lang=pt-BR` selecionam assunto, texto simples, HTML e mensagem de sucesso. Sem idioma reconhecido, a função usa português e explicita `lang=pt-BR` no link para impedir que uma preferência salva contrária altere a chegada.
- Os catálogos ficam em `supabase/functions/planning-poker-invite/locales/{pt-BR,en}.json`, junto da função. `email.ts` renderiza o conteúdo. A verificação de copy inclui esses catálogos e confere chaves, parâmetros e ortografia.
- Nomes do projeto, da sessão e conteúdo criado por pessoas ou IA mantêm o texto original. Convites já enviados continuam válidos e conservam seu conteúdo.
- Links por código e links diretos são aceitos somente nas origens autorizadas existentes. A função confere se o código ou os IDs correspondem à sessão do pedido. O remetente precisa estar autenticado e poder gerenciar o projeto; o destinatário precisa ser membro dele.
- O HTML identifica `lang`, oferece botão acessível por teclado e link alternativo, e escapa os dados do projeto. Parâmetros opacos, valores duplicados e âncora são preservados no link. O login conserva o destino completo. Após resolver um código, o fluxo existente navega à sala equivalente com o idioma; os parâmetros auxiliares da busca não são transportados para a URL da sala. Um link direto mantém seus parâmetros e âncora após o login.

## Configuração e isolamento

SMTP, credenciais e remetente continuam no projeto/ambiente Supabase, separados dos Times do produto. A função mantém `RODA_INVITE_FROM_EMAIL`, com fallback para `CONTACT_FROM_EMAIL`, e `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`. A configuração é administrada no projeto autorizado, em Edge Functions/Secrets; não é uma configuração editável por um membro de Time. Esta entrega não modifica esses valores, não muda as permissões entre projetos e não lê dados de outros clientes. O idioma pertence a cada convite, sem configuração global da conta.

## Validação reproduzível

```sh
npm run quality
npm run test:invites:local
npm run test:e2e:i18n
npm audit --omit=dev --audit-level=high
```

`test:invites:local` estende o ambiente descartável de autenticação existente: PostgreSQL 17.11, GoTrue 2.198.0, PostgREST 16.5, Deno 2.6.9 e SMTP TLS local com uma CA temporária. Requer Docker, Chromium do Playwright e OpenSSL (no Windows, a instalação do Git em `C:/Program Files/Git/usr/bin/openssl.exe`). Não lê `.env.local` nem usa serviços remotos. As portas `54321` e `43919` devem estar livres; o teste falha se estiverem ocupadas. Capturas ficam na pasta temporária indicada no resultado, fora do Git.

A cobertura inclui oito testes do renderizador, oito rejeições sem envio (sem sessão, membro sem gestão, outro projeto, código/sala incorretos, origem externa e destinatário sem acesso), dois fallbacks de idioma e quatro jornadas completas: desktop 1440×900 e celular 320×740, nos dois idiomas. Cada jornada recebe o MIME real no coletor TLS, valida assunto/texto/HTML e percorre botão pelo teclado → login real → sala com RLS real → recarga. A preferência previamente salva contrária ao convite não prevalece. O link direto inclui parâmetros codificados, duplicados e âncora. A suíte geral cobre a composição do convite na interface e as demais páginas. O CI executa a validação dos convites junto da autenticação.

O recebimento no coletor local e a renderização no Chromium não comprovam entrega em caixas externas nem o comportamento de todos os clientes de e-mail (Outlook, Gmail etc.). Não enviar mensagens a usuários reais durante o teste; um ensaio de entrega externa exige uma caixa de QA autorizada.

## Publicação e recuperação

1. Executar o doctor com o arquivo de ambiente autorizado, revisar o diff e passar os testes locais e o CI antes da publicação.
2. Guardar metadados, bundle e fonte remotos em pasta privada restrita. `supabase functions download planning-poker-invite --project-ref <ref> --use-api --workdir <pasta-privada>` permite recuperar a fonte. Preservar `verify_jwt=true` na configuração da recuperação.
3. Publicar **somente** `planning-poker-invite`, usando `scripts/supabase-deploy.ps1 -Functions @('planning-poker-invite') -EnvFile <arquivo-autorizado>`. Não executar migrações nem atualizar segredos. O token exige Edge Functions Read-write para publicar; listar segredos é uma permissão distinta e não é necessário para essa publicação.
4. Confirmar versão ativa, JWT habilitado e conteúdo publicado correspondente ao commit integrado. Verificar rejeição sem autenticação e sem permissão, sem chamar SMTP. Preservar o frontend já publicado, compatível com o mesmo contrato; não há mudança de runtime no cliente nesta entrega.
5. Se necessário, restaurar a fonte do checkpoint apenas dessa função, com JWT habilitado e o contexto explícito do projeto. Não restaurar dados nem configurações de SMTP. Antes de restaurar, conferir que não houve outra publicação concorrente.
