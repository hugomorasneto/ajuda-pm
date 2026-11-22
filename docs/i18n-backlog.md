# Backlog conciliado da internacionalização

Estado em 22/11/2026: **escopo entregue encerrado, sem bloqueadores abertos**. Base integrada de referência: `aa09fc234509771994bba460caeb091ae46d85e1`. Este arquivo registra a conciliação solicitada pelo responsável e mantém as propostas futuras separadas das entregas concluídas. As evidências e os limites de cada validação estão em [i18n-validation.md](i18n-validation.md).

## Fonte e limite da conciliação

Na consulta de 22/11/2026, antes do PR deste fechamento e com base em `aa09fc2`, a API do repositório `hugomorasneto/ajuda-pm` retornou zero issues e os PRs #1 a #15 fechados. A busca no conector não listou PRs conhecidos; a listagem direta da API do GitHub foi usada para conferir o resultado. As buscas por ProdForge e ajuda-pm no Linear não localizaram um backlog correspondente; resultados de outro projeto não foram alterados. Não se presume que essa consulta elimine registros fora dessas fontes ou com outros nomes.

Não havia arquivo de backlog de internacionalização no checkout consultado. Esta conciliação fica versionada junto da documentação e dos PRs, sem criar outro projeto ou migrar tarefas de terceiros. Os IDs abaixo são locais a este documento, não identificadores de issues externas. O [checklist geral do MVP](mvp-launch-checklist.md) mantém seu escopo e seus estados históricos.

## Entregas encerradas

| ID local | Entrega | Estado | Evidência |
| --- | --- | --- | --- |
| I18N-01 | Infraestrutura de idiomas, catálogos, seletor desktop/celular, preferência e URLs equivalentes | Concluído e publicado | [PR #6](https://github.com/hugomorasneto/ajuda-pm/pull/6); [comportamento e navegação](../README.md#idiomas-na-produção-e-na-prévia-local) |
| I18N-02 | Páginas públicas, conteúdo editorial, metadados, sitemap e Campo de Treino | Concluído e publicado | [PR #6](https://github.com/hugomorasneto/ajuda-pm/pull/6); 66 casos de i18n e quatro casos de release registrados no encerramento |
| I18N-03 | Login, cadastro, confirmação, reenvio, saída e preservação do destino | Concluído e publicado | Frontend `d5b47c3`; quatro jornadas locais de Auth e recebimentos externos registrados |
| I18N-04 | Bancada, Histórico, Projetos, detalhes, Times, Roda e Administração | Concluído e publicado | [PR #6](https://github.com/hugomorasneto/ajuda-pm/pull/6); registro de validação desktop/celular |
| I18N-05 | Termos, Privacidade, cookies, planos e aceite no servidor | Concluído e publicado | [PR #6](https://github.com/hugomorasneto/ajuda-pm/pull/6); versão legal `2026-11-18.1`; [manifesto público](../src/content/legalRelease.production.json) |
| I18N-06 | Seis modelos de Auth em português e inglês, idioma e destino nos links | Concluído e publicado | [PR #10](https://github.com/hugomorasneto/ajuda-pm/pull/10), [PR #11](https://github.com/hugomorasneto/ajuda-pm/pull/11); [guia de Auth](auth-emails.md) |
| I18N-07 | Convites da Roda: assunto, texto simples, HTML e continuidade após o login | Concluído e publicado | [PR #12](https://github.com/hugomorasneto/ajuda-pm/pull/12), `c399940`, função versão 2; [guia da Roda](roda-invite-emails.md) |
| I18N-08 | Validação final local e recebimento externo de convites e links de acesso | Concluído | [PR #13](https://github.com/hugomorasneto/ajuda-pm/pull/13), `b200ad9`; [rodada de 21/11](i18n-validation.md#convites-e-links-de-acesso--21112026) |
| I18N-09 | SMTP próprio do Auth, cadastro público e confirmação bilíngue real | Concluído e ativo | [PR #14](https://github.com/hugomorasneto/ajuda-pm/pull/14), [PR #15](https://github.com/hugomorasneto/ajuda-pm/pull/15), `aa09fc2`; [ativação e evidências](auth-smtp.md#ativação-e-evidência-em-produção--22112026) |
| I18N-10 | Conciliação e encerramento documental | Concluído neste fechamento | Este arquivo, [registro consolidado](i18n-validation.md), README e guias operacionais alinhados ao estado entregue; integração rastreada pelo PR e pelo histórico do Git |

“Concluído e publicado” identifica os componentes funcionais já implantados e conferidos nas entregas citadas. Atualizar esta documentação exige validação e integração no Git; não exige novo deploy, migração, reaplicação de modelos ou alteração do SMTP. O SHA do frontend servido permanece distinto dos commits posteriores de configuração e documentação.

## Propostas futuras

Estas propostas não reabrem a internacionalização entregue, não têm implementação aprovada nem prazo assumido. Uma nova tarefa deve definir seu escopo e as autorizações antes da execução.

| ID local | Proposta | Estado e decisão necessária | Critério para uma futura entrega |
| --- | --- | --- | --- |
| FUT-I18N-01 | Idioma próprio para resultados gerados por IA | Aguardando decisão de produto e priorização. Hoje histórias, critérios de aceite e diagnósticos continuam em pt-BR, mesmo com interface em inglês. | Definir seleção e padrão do idioma do resultado, abrangência de histórias/diagnósticos/exportações, persistência e testes; preservar conteúdo existente, cota, idempotência e autorização no servidor. Não traduzir o histórico automaticamente. |
| FUT-I18N-02 | Ampliar a comprovação externa dos e-mails | Reforço opcional, não executado nas rodadas registradas. Definir modelos, clientes e caixas de QA autorizadas. | Conferir os demais modelos no novo SMTP e a renderização em Outlook/Apple Mail, nos dois idiomas, preservando contas e respeitando limites. Os seis modelos já têm cobertura local; confirmação no novo SMTP, link de acesso no transporte anterior e convites da Roda tiveram recebimentos reais. |

Consolidar a documentação deixou de ser proposta futura e foi atendido nesta atualização. Revisões editoriais/legais posteriores seguem o versionamento legal existente; não há nova aprovação de redação pendente registrada para o escopo encerrado.

## Continuidade

- Manter pt-BR como padrão e preservar os dois catálogos e seus parâmetros; novas strings passam por `npm run copy:check` e alterações por `npm run quality`.
- Revalidar as jornadas afetadas em desktop, celular e teclado quando houver mudança funcional. Testes locais e comprovação externa são evidências diferentes.
- Acompanhar a capacidade da caixa compartilhada: Auth com limite inicial de 10 mensagens/hora e intervalo de 60 segundos, configuração por projeto no Supabase; cota total e plano da caixa na Hostinger. Aumentar capacidade ou trocar credenciais é outra operação autorizada.
- Atualizar o estado e as evidências dos itens que forem retomados; não marcar uma proposta como implementada apenas por ter sido registrada no backlog.
