# ProdForge

O ProdForge ajuda profissionais de produto a transformar briefings em histórias de usuário, critérios de aceite e checklists de QA. O frontend usa React e Vite. O Supabase oferece autenticação, persistência e funções de backend.

## Instalação

Use Git e Node.js **24.22.1**, a versão usada no CI.

```sh
git clone https://github.com/hugomorasneto/ajuda-pm.git
cd ajuda-pm
npm ci
npm run quality
```

O comando `quality` executa o lint, verifica o texto visível em português brasileiro, roda os testes unitários e gera o site em `dist/`. Essa validação funciona sem conta no Supabase ou chave de IA.

## Interface local

Para navegar pelas páginas públicas e revisar a aparência dos formulários, crie um arquivo `.env.local` na raiz com valores fictícios.

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=chave-ficticia
```

```sh
npm run dev -- --host 127.0.0.1
```

Abra [a página inicial](http://127.0.0.1:5173/) ou [o Campo de Treino](http://127.0.0.1:5173/aprender/). Os valores fictícios servem para revisar a interface. Para testar cadastro, projetos, times, contato ou geração com IA de ponta a ponta, use um ambiente de teste autorizado, com dados fictícios e a revisão correspondente do backend.

Variáveis `VITE_*` podem aparecer no bundle do frontend. Use apenas a URL e a chave pública do projeto de teste. Mantenha tokens administrativos, senhas SMTP, chaves de serviço e chaves de IA fora do Git e do frontend. Veja o [modelo de configuração](.env.local.example) e o [guia do Supabase](supabase/README.md).

## Prévia de idiomas

As páginas públicas principais, o Campo de Treino, a Bancada, o Histórico, Projetos, Times, a Roda da Fogueira, as telas de autenticação e a Administração têm uma prévia em português brasileiro e inglês, disponível apenas em endereço local. Use os valores fictícios descritos acima e rode:

```sh
npm run dev:i18n
```

Abra a página inicial em [português](http://127.0.0.1:5173/) ou [inglês](http://127.0.0.1:5173/en/). Projetos, Times, a Roda da Fogueira e a Administração exigem sessão. A Administração exige um perfil administrador. O teste automatizado simula a sessão e as respostas do Supabase sem acessar serviços externos. Na prévia, links de confirmação retornam por /check-email para preservar o destino original e o idioma. Os testes simulam esse retorno sem enviar e-mails reais. Os modelos de autenticação usam os mesmos catálogos bilíngues nos testes locais e no Supabase; veja `docs/auth-emails.md`. O Campo de Treino tem guias e notas em [português](http://127.0.0.1:5173/aprender) e [inglês](http://127.0.0.1:5173/en/learn). O progresso da conta é compartilhado entre os idiomas. A Bancada e o Histórico aceitam a troca de idioma da interface. A geração continua em português (Brasil). A exportação acompanha os rótulos da interface e preserva o conteúdo original da história. Projetos e detalhes mantêm os mesmos endereços nos dois idiomas. Os diagnósticos já criados conservam o idioma original ao trocar a interface ou copiar o Markdown. Na Roda, o idioma acompanha os links locais da sala e o texto copiado. A prévia usa respostas simuladas nos testes de convite, sem enviar e-mails. Termos, política, consentimento, planos e demais textos públicos em inglês exigem revisão humana antes da publicação.

```sh
npx playwright install chromium
npm run test:e2e:i18n
```

Para conferir o HTML compilado, use `npm run build:i18n` e `npm run preview:i18n`. O build de prévia fica em `dist-i18n-preview/`. O build normal continua em `dist/` com a prévia desativada.

Na prévia local, a fonte Inter é servida pelo próprio site. O arquivo, a licença SIL Open Font License 1.1 e a origem estão em `public/fonts/inter/`. Os Termos e o aviso de cadastro da prévia indicam o uso profissional por pessoas com 18 anos ou mais. As minutas em `revisao-de-textos/` registram as decisões aprovadas e os dados operacionais que ainda precisam de confirmação.

## Cota do Free no servidor

A migração `20261117171616_free_lifetime_story_generation_quota.sql` exige o esquema de histórias, perfis, Administração e Projetos. Ela registra as versões existentes como uso histórico e mantém o consumo após a exclusão de uma história. Versões apagadas antes da migração não podem ser reconstruídas pelos registros disponíveis.

Cada geração ou regeneração bem-sucedida consome uma unidade ao salvar a versão. O Free inclui 10 unidades por conta, sem renovação mensal. Edições manuais, falhas e diagnósticos de projeto ficam fora da cota. O limite personalizado de cada conta continua disponível na Administração. O plano Pro mantém o padrão sem limite.

A Bancada envia um identificador por tentativa e recebe a versão já salva pela função `generate-user-story`. A migração, a função e o frontend precisam ser ativados em conjunto em uma publicação futura. Esta implementação foi validada somente em ambiente local.

Com Docker disponível, execute a validação isolada em PowerShell.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-free-quota-local.ps1
```

O script cria e remove containers exclusivos, usa contas fictícias, executa a migração e os testes SQL, e testa a função real com PostgREST e PostgreSQL locais. A autenticação e o Gemini são simulados. O teste cobre a última vaga concorrente, repetição de pedidos, falhas, versões, isolamento de contas e limites personalizados. As imagens Docker precisam estar disponíveis ou ser baixadas na primeira execução.

## Termos, Privacidade e aceite na prévia

Os textos legais foram consolidados para a versão local `2026-11-17-preview.1`, com Hugo Cruz da Silva Moraes Neto e `contato@techtupa.com.br` como identificação adotada a partir dos dados disponíveis. A vigência pública começa com a publicação autorizada. As condições operacionais de fornecedores, retenção, exclusão e backups continuam registradas em `revisao-de-textos/`.

Na prévia, o cadastro envia a versão, o resumo SHA-256 e o idioma apresentados. O gatilho de criação da conta valida esses dados e registra o aceite na mesma transação. Contas existentes consultam o registro do servidor e aceitam a versão atual com uma ação antes de continuar no destino original. O aceite dos Termos e a apresentação da Política são registrados juntos. A escolha opcional de analytics segue seu próprio fluxo.

`src/content/legalRelease.json` identifica a versão e o resumo do conteúdo efetivo dos dois documentos nos dois idiomas. A migração `20261117190539_local_legal_acceptance.sql` conserva esse conteúdo como um arquivo imutável. A checagem de catálogos bloqueia alterações no texto que divergirem da versão registrada. Para uma nova edição, crie uma nova identificação, resumo e migração com o novo conteúdo, preservando as versões anteriores.

Para testar o banco isolado, use Docker e execute em PowerShell.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-legal-consent-local.ps1
```

O teste usa contas fictícias e inclui cadastro, falhas, permissões, isolamento, repetição, quatro solicitações concorrentes e apresentação de uma nova versão. A autenticação nos testes de navegador é simulada. A migração e o frontend precisam ser ativados em conjunto em uma futura implantação autorizada.

Para validar o percurso com autenticação real e e-mail capturado localmente, execute `npm run test:auth:local` com Docker e o Chromium do Playwright disponíveis. O teste monta PostgreSQL, GoTrue, PostgREST e um coletor SMTP descartáveis, sem consultar um projeto hospedado. Ele compila a prévia com configuração fictícia, usa exclusivamente as portas locais `54321` e `43919` e falha se estiverem ocupadas. Não execute junto com outro comando que reconstrua `dist-i18n-preview/`.

O percurso cobre português e inglês em desktop e celular de 320 pixels: cadastro, reenvio, bloqueio do login antes da confirmação, confirmação pelo link de e-mail real, aceite registrado no cadastro, recarga, conta sem aceite, aceite pelo teclado, saída e novo login com o destino, parâmetros e âncora preservados. Os documentos do cadastro abrem em outra aba na prévia para preservar o formulário preenchido. As capturas ficam na pasta temporária informada pelo teste; os containers e a rede exclusivos são removidos ao terminar. A validação não cobre os modelos de e-mail, limites ou entrega do serviço remoto, nem as funcionalidades de Times após a autenticação.

## Publicação bilíngue

`npm run build` gera a versão de produção em `dist/`, no modo explícito `i18n-production`. Esse modo ativa os dois idiomas também no domínio público, os textos aprovados, a fonte local, o aceite e a indisponibilidade de marketing. Conserva a escolha anterior de analytics no armazenamento de produção. O modo `i18n-preview` continua restrito a endereços locais e mantém suas próprias escolhas de cookies e versão legal. O campo interno `preview` do contexto de idioma é mantido por compatibilidade e indica as funcionalidades de idiomas habilitadas, inclusive na produção.

A versão legal pública `2026-11-18.1` tem manifesto próprio em `src/content/legalRelease.production.json`, textos em `src/i18n/production-copy/` e arquivo imutável na migração `20261118022243_publish_legal_release.sql`. O arquivo da prévia permanece preservado. A data em seu identificador usa UTC. A versão entra em vigor com sua publicação no serviço.

Antes da troca do frontend, aplique as migrações da cota, do arquivo legal local e da versão pública, e implante a função `generate-user-story` correspondente. Os clientes anteriores não enviam o identificador obrigatório da geração; abas antigas precisam recarregar para gerar, e seus pedidos antigos são rejeitados antes de chamar a IA. As migrações preservam os dados existentes. Não desfaça o registro de consumo da cota nem os aceites para recuperar uma publicação do frontend.

Valide a ativação com `npm run test:e2e:release`, `npm run test:auth:release` e `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-legal-consent-local.ps1 -Production`. O primeiro comando confere as páginas públicas, a equivalência dos idiomas e a exclusão das minutas. O segundo usa Auth e SMTP isolados, sem projeto remoto. Os comandos que recompilam o mesmo diretório devem ser executados em sequência. As minutas não fazem parte do build público e seu caminho é bloqueado na hospedagem. As páginas editoriais têm metadados alternativos e sitemap nos dois idiomas; páginas legais, de preferências e autenticação mantêm `noindex`.

O arquivo público `release.json` identifica o commit do build, a ativação dos idiomas e o resumo dos documentos legais. Use-o junto com a conferência FTPS para relacionar o conteúdo servido à revisão validada. O procedimento de cópia protegida e publicação está em `docs/publicacao-ftps.md`.

## Contribuição

Leia o [guia de contribuição](CONTRIBUTING.md) e as [instruções para relatar problemas de segurança](SECURITY.md).

## Licença

O código próprio e a documentação identificados no [escopo da licença](docs/escopo-da-licenca.md) estão sob a [licença MIT](LICENSE). A marca ProdForge, os ativos visuais, o conteúdo editorial e os materiais de terceiros têm tratamento separado.
