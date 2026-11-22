# SMTP próprio do Supabase Auth

Base da configuração: `b200ad9`. O Auth e a função `planning-poker-invite` têm configurações independentes. É possível reutilizar a caixa `contato@techtupa.com.br` no servidor `smtp.hostinger.com`, porta 465, com TLS implícito. O certificado e a autenticação foram verificados sem envio de mensagem. As mensagens anteriores da Roda recebidas na caixa de QA passaram em SPF, DKIM e DMARC.

A senha é lida do item específico de SMTP no Bitwarden, dentro de um processo local. Não é a senha do site nem o token de acesso do Supabase. Nenhuma credencial vai para o Git, o frontend, argumentos de linha de comando ou registros públicos. A integração Hostinger Mail atualmente conectada gerencia outra caixa; ela não foi usada para consultar mensagens ou alterar configurações deste projeto.

## Configuração proposta

- Servidor e porta: `smtp.hostinger.com:465`, TLS com validação de certificado.
- Conta e remetente: `contato@techtupa.com.br`; nome público: `ProdForge`.
- Limite inicial do Auth: 10 mensagens por hora, configurável por projeto; intervalo mínimo entre envios ao mesmo destinatário preservado em 60 segundos.
- Cadastro continua exigindo confirmação de e-mail e o aceite da versão legal apresentada. URLs, callbacks, modelos bilíngues, hooks, políticas e outros limites são preservados.

A caixa é compartilhada com a Roda e pode atender outros projetos. Sua cota de envio no provedor é compartilhada por todos esses usos. O limite inicial do Auth não garante capacidade ilimitada nem altera os limites dos outros projetos. O plano e a cota efetiva da caixa devem ser acompanhados no painel da Hostinger; os limites variam por plano. Uma troca de senha futura exige atualizar separadamente os consumidores que usam essa caixa.

A configuração do Auth pertence ao projeto/ambiente Supabase, não a um Time do ProdForge. Pode ser consultada e alterada por um administrador autorizado em Authentication → Email/SMTP do projeto. As configurações das Edge Functions permanecem em Secrets, separadamente. O módulo privado de credenciais declara `projectRef`, que deve coincidir com o contexto autorizado para impedir uso em outro cliente.

## Operação com contexto explícito

`scripts/supabase-auth-smtp.ps1` executa o doctor e valida o projeto e o token antes de qualquer acesso remoto. O padrão é `Plan`, somente de leitura. O token precisa de Auth Config e Project Settings em Read-write para aplicar ou restaurar.

Forneça um módulo privado, fora de qualquer checkout Git, que exporte `getSmtpCredentials()`. O retorno contém `projectRef`, `host`, `port`, `username`, `password`, `from` e `sender`, obtidos de uma fonte segura. Não inclua valores secretos na chamada ao script.

```powershell
./scripts/supabase-auth-smtp.ps1 -Action Plan -EnvFile CAMINHO_DO_AMBIENTE -CredentialsModule CAMINHO_PRIVADO_DO_MODULO
./scripts/supabase-auth-smtp.ps1 -Action Apply -EnvFile CAMINHO_DO_AMBIENTE -CredentialsModule CAMINHO_PRIVADO_DO_MODULO -Checkpoint CAMINHO_PRIVADO_NOVO.dpapi
./scripts/supabase-auth-smtp.ps1 -Action Verify -EnvFile CAMINHO_DO_AMBIENTE -CredentialsModule CAMINHO_PRIVADO_DO_MODULO
./scripts/supabase-auth-smtp.ps1 -Action Rollback -EnvFile CAMINHO_DO_AMBIENTE -Checkpoint CAMINHO_PRIVADO_NOVO.dpapi
```

`Apply` exige Windows e grava o checkpoint antes da primeira alteração, cifrado com DPAPI CurrentUser. O arquivo deve ficar em pasta privada restrita ao responsável e SYSTEM. Não é portátil para outro usuário ou computador. O checkpoint preserva os campos anteriores de SMTP e o limite de envio; falha ao gravá-lo impede a aplicação. A operação modifica somente sete campos, confere mudanças concorrentes durante a preparação e verifica que as outras configurações permaneceram iguais.

`Rollback` restaura apenas os campos de SMTP e o limite anterior. Recusa checkpoints de outro projeto, campos inesperados e mudanças posteriores nos campos SMTP devolvidos pela API. Preserva alterações em campos de Auth que não pertencem à configuração SMTP. Se já houver SMTP próprio cuja senha anterior não possa ser recuperada, a substituição é recusada antes de escrever. O provedor não oferece uma atualização condicional atômica para esse fluxo; quando a senha vier omitida ou mascarada, mudanças somente nela não podem ser detectadas por essa comparação. Evite alterações concorrentes de SMTP durante a operação.

Uma resposta da Management API pode omitir a senha; `Verify` confere os campos disponíveis, mas não comprova entrega. Sempre valide o recebimento e os links após a aplicação. Em caso de falha, use o checkpoint privado e investigue antes de repetir envios.

## Validação antes da produção

```sh
node --test scripts/auth-smtp.test.mjs
npm run test:auth:smtp
npm run test:invites:local
npm run quality
```

Os testes do script cobrem escopo por projeto, patch mínimo, checkpoint antes da escrita, idempotência, concorrência, preservação das configurações e recuperação. No Windows, também exercitam DPAPI e rejeição de adulteração. No CI Linux, somente esse caso específico é omitido; ele é executado localmente no Windows.

`test:auth:smtp` usa PostgreSQL, GoTrue, PostgREST e SMTP TLS autenticado descartáveis. O servidor SMTP exige as credenciais fictícias corretas em conexão cifrada; a CA temporária é confiada apenas no container de Auth. Não desativa a verificação do certificado. Os seis modelos e as quatro jornadas de desktop/celular são testados nos dois idiomas, incluindo confirmação, login, aceite, teclado, recarga e destino preservado. Não lê senhas reais nem envia mensagens externas. Execute em sequência com os testes de convite e de Auth que usam as mesmas portas locais.

## Referências

- [SMTP do Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp).
- [API de configuração de Auth](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
- [Configuração SMTP da Hostinger](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/).
- [Limites por caixa e plano da Hostinger](https://www.hostinger.com/support/4625828-parameters-and-limits-of-hostinger-email/).
