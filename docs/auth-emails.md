# E-mails de autenticação em português e inglês

Os seis modelos do Supabase Auth usam os catálogos `src/i18n/locales/{pt-BR,en}/authEmails.json`: confirmação de cadastro (também usada no reenvio), convite de conta, link de acesso, recuperação de senha, alteração de e-mail e reautenticação. Não criam novas telas ou fluxos. O convite da Roda é outro serviço, fora desta entrega. Notificações de segurança desativadas não são habilitadas.

## Estado publicado

Os doze campos de assunto/corpo estão ativos no Supabase. O frontend correspondente foi publicado em `d5b47c314c210b0e30b876a55c0a0f39271d831e`; as instruções de permissão foram integradas em `53f1e07`. Na conferência da base `c399940`, o plano somente de leitura confirmou `already_applied=true`, com SHA-256 `2e01cf6113d8e5ef015b6d676b73724f262a56fbf18225c4bfa4a3d9cf85af52`.

Em 21/11/2026, o projeto usa o remetente padrão do Supabase Auth, sem SMTP personalizado, com limite configurado de dois e-mails por hora e intervalo mínimo de 60 segundos. O serviço padrão restringe destinatários aos endereços autorizados da equipe, conforme a [documentação de SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp). Receber na caixa de QA autorizada não comprova entrega de Auth para qualquer usuário. Um SMTP personalizado para envio ao público geral é uma decisão operacional separada desta validação. A configuração do Auth é distinta do SMTP usado pela função de convite da Roda. Não altere provedor, limites ou credenciais para executar a regressão local.

O registro da validação final separa recebimento local, caixa externa e navegação pelos links: [encerramento da internacionalização](i18n-validation.md).

## Idioma e continuidade

O link tem o formato `/check-email?lang=en&from=...` ou `/check-email?lang=pt-BR&from=...`. A ordem no link enviado ao Auth é intencional: os modelos Go comparam o prefixo usando `.SiteURL`, sem analisar nem reconstruir o destino codificado. O formato usa o `site_url` configurado no projeto, sem domínio fixado no modelo. Mantenha `site_url` sem barra final e publique o frontend correspondente junto com os modelos.

O idioma explícito do pedido prevalece sobre `user_metadata.prodforge_email_language`, registrado no cadastro. Uma pessoa pode reenviar a confirmação em outro idioma sem alterar a conta ou o aceite legal. Pedidos antigos sem o novo prefixo usam o idioma do cadastro; contas anteriores podem usar o idioma do aceite registrado no cadastro como fallback. Sem idioma reconhecido, usa-se português brasileiro. Metadados de idioma só controlam apresentação, nunca autorização. O idioma da interface e o conteúdo gerado por IA continuam separados.

Cada ação usa `{{ .ConfirmationURL }}` original, sem remontar o token ou trocar o tipo de verificação. A reautenticação conserva `{{ .Token }}`. O destino com parâmetros duplicados, caracteres codificados e âncora permanece dentro de `from`; a validação de caminhos internos e a aplicação do idioma após o login continuam no fluxo existente.

## Testes

Execute `npm run quality` e `npm run test:auth:release`. O segundo cria Auth, PostgreSQL, PostgREST e SMTP descartáveis, com dados fictícios e build próprio em pasta temporária. Não usa credenciais nem altera o backend remoto. Não deve disputar as portas locais `54321` e `43919` com outra execução. Usa os mesmos assuntos e corpos gerados para produção, incluindo Go Templates reais.

A cobertura inclui os dois idiomas em desktop e celular de 320 pixels: cadastro, troca de idioma antes do reenvio, preservação do formulário, confirmação, login, recarga, aceite e destino original. Também verifica os seis tipos nos dois idiomas, precedência do pedido, código de reautenticação, alteração de e-mail nos dois endereços, contas antigas e metadados não reconhecidos. O recebimento no coletor SMTP local não comprova entrega de um provedor externo.

## Configuração por projeto e publicação

O Supabase Auth é configurado por projeto/ambiente, separadamente dos Times do ProdForge. `site_url`, remetente, SMTP, limites e URLs continuam nas configurações de Auth do projeto no painel do Supabase. A publicação inicial alterou somente os doze campos de assunto/corpo; preservou essas configurações, hooks e notificações. A validação final não alterou a configuração nem as de outros projetos ou clientes.

Antes de cada operação remota, execute `scripts/supabase-doctor.ps1` com o arquivo de ambiente autorizado. O token precisa das permissões de leitura e, para aplicar/restaurar, de **Auth Config e Project Settings em Read-write**, restritas ao projeto (`auth_config_write` e `project_admin_write`). A [referência da API](https://supabase.com/docs/reference/api/v1-update-auth-service-config) exige as duas permissões. `scripts/supabase-auth-emails.ps1` gera o conteúdo dos catálogos; o padrão `-Action Plan` é somente leitura. `-Action Apply -Checkpoint <caminho-absoluto-privado>` guarda os modelos anteriores fora do Git, envia apenas os doze campos e verifica o retorno e as configurações protegidas. A pasta privada deve ter acesso restrito ao operador. O checkpoint não contém token nem senha SMTP. `-Action Verify` confere o candidato; `-Action Rollback -Checkpoint ...` restaura somente esses campos, recusando sobrescrever alterações concorrentes.

Os modelos e o frontend correspondente já estão ativos. Para uma alteração futura dos modelos, passar pelos testes locais e CI, preservar o checkpoint e aplicar somente os campos necessários. Publicar o frontend pelo procedimento FTPS com backup protegido quando seu código ou contrato também mudar. Confirmar o SHA servido e os modelos remotos; uma atualização apenas da documentação não exige reaplicá-los. E-mails já enviados conservam o texto original e seus links continuam válidos; alterar modelos afeta novos envios. Antes de testes reais, verificar o provedor e usar somente destinatários de QA autorizados. Uma mudança de SMTP ou contratação de provedor exige escopo e autorização próprios.
