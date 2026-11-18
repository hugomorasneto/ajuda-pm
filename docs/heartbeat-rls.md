# RLS do monitoramento do ProdForge

A tabela `public.techtupa_heartbeat` é infraestrutura global deste projeto Supabase, sem dados ou configuração por cliente. Não é uma tabela de Times ou Projetos do produto. O acesso de uma conta do produto, inclusive administrativa, não autoriza acesso ao monitor.

## Contrato preservado

O monitor central da TechTupa usa a credencial `service_role` guardada em seu cofre por projeto. Os registros operacionais anteriores à correção confirmam `credential_mode=service_role`, leitura, upsert e confirmação bem-sucedidos. O fluxo existente faz:

1. `GET /rest/v1/techtupa_heartbeat?id=eq.main&select=id,touched_at,source&limit=1`.
2. `POST /rest/v1/techtupa_heartbeat?on_conflict=id`, com `Prefer: resolution=merge-duplicates,return=representation`, atualizando `id`, `touched_at`, `source` e `meta`.
3. Outro GET para confirmar o horário gravado.

A migração `20261118061130_secure_techtupa_heartbeat.sql` habilita RLS, remove os privilégios de `PUBLIC`, `anon` e `authenticated` e garante SELECT/INSERT/UPDATE a `service_role`. Preserva os demais privilégios já existentes do serviço e do proprietário. Não adiciona políticas: o serviço existente tem BYPASSRLS e contas comuns não devem acessar nenhuma linha. A revogação também impede TRUNCATE, que não é protegido por RLS.

A tabela precisa existir: é provisionada pelo monitor externo. A migração falha caso encontre políticas inesperadas, exigindo nova revisão. Não altera dados, colunas, valores padrão, credenciais, frequência, agendamentos ou outros projetos monitorados. Não habilita FORCE RLS, que mudaria o comportamento do proprietário. Chaves de serviço permanecem exclusivamente no servidor/cofre.

## Validação e aplicação

Execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-heartbeat-rls-local.ps1`. O teste cria PostgreSQL e PostgREST descartáveis com credenciais fictícias, usa porta dinâmica local e remove apenas seus próprios containers. Não lê `.env` nem acessa backend remoto. Cobre migração repetida, preservação da linha, privilégios de tabela/coluna, leitura e escrita negadas, RLS mesmo com grants restaurados, duas identidades, upsert repetido e confirmação REST pelo serviço. O CI executa o mesmo teste antes da integração.

Antes da aplicação autorizada em produção, confirmar o contexto com `scripts/supabase-doctor.ps1`, guardar checkpoint privado da linha e ACL e verificar novamente: tabela sem políticas, ausência de grants explícitos por coluna, proprietário `postgres` e serviço com BYPASSRLS. Revalidar o fluxo do monitor central restrito ao projeto do ProdForge; nunca usar `run_all` para este teste.

Aplicar a migração e registrar sua versão em `supabase_migrations.schema_migrations` na mesma transação, com bloqueio curto e verificação de que a linha não mudou. Depois confirmar negação na API pública, executar o monitor real para este projeto e conferir leitura/upsert/confirmação, além do advisor de segurança. Não é necessário publicar novamente o frontend.

## Recuperação

Se o monitor falhar após a aplicação, conferir primeiro credencial/role e grants do serviço. Não criar política pública nem desativar RLS para contornar erro de credencial. Falhas da transação desfazem a migração inteira, incluindo seu registro no histórico. O checkpoint privado anterior guarda os dados e permissões para análise; não restaurar um `touched_at` antigo sobre uma execução mais recente do monitor.
