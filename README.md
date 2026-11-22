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

## Idiomas na produção e na prévia local

Português (Brasil) e English estão publicados no [ProdForge](https://prodforge.techtupa.com.br), incluindo páginas públicas, Campo de Treino, autenticação, Bancada, Histórico, Projetos, Times, Roda da Fogueira e Administração. A prévia local permite validar mudanças antes de publicar. Use os valores fictícios descritos acima e rode:

```sh
npm run dev:i18n
```

Abra a página inicial em [português](http://127.0.0.1:5173/) ou [inglês](http://127.0.0.1:5173/en/). As áreas internas exigem sessão; a Administração também exige perfil administrador. O seletor mantém a página equivalente e os campos preenchidos. As URLs públicas em português foram preservadas; páginas públicas em inglês usam `/en/`. Nas áreas internas, `lang=pt-BR` ou `lang=en` identifica a escolha. O idioma explícito do link prevalece sobre a preferência salva.

Os links de autenticação retornam por `/check-email`, preservando o destino e o idioma. Os seis modelos de Auth publicados usam os mesmos catálogos dos testes locais; veja [o guia dos e-mails de autenticação](docs/auth-emails.md). Os convites da Roda também foram publicados nos dois idiomas, com assunto, texto simples, HTML e botão localizados; veja [o guia dos convites](docs/roda-invite-emails.md).

O SMTP próprio do Auth está ativo desde 22/11/2026 e permite cadastros do público geral, reutilizando a caixa de envio da Roda. A configuração do Auth é independente da função de convite: o limite inicial é de 10 mensagens por hora, com intervalo de 60 segundos, e a cota da caixa no provedor é compartilhada. A confirmação de cadastro foi recebida e validada nos dois idiomas. Consulte [SMTP do Auth](docs/auth-smtp.md) para as evidências, os parâmetros e a recuperação cifrada; `npm run test:auth:smtp` valida os dois idiomas com SMTP TLS autenticado descartável, sem mensagens externas.

O Campo de Treino tem guias e notas em [português](http://127.0.0.1:5173/aprender) e [inglês](http://127.0.0.1:5173/en/learn), com progresso compartilhado pela conta. A interface e os rótulos da exportação acompanham o idioma escolhido. A geração de histórias, critérios de aceite e diagnósticos por IA continua em português (Brasil), separadamente do idioma da interface. Conteúdo já criado mantém seu idioma original.

Os testes gerais simulam sessão e respostas do Supabase, sem acessar serviços externos. `npm run test:auth:release` e `npm run test:invites:local` usam Auth, banco e SMTP descartáveis para testar os e-mails e seus links. Recebimento externo é uma verificação distinta, que exige uma caixa de QA autorizada. O registro de validação e as limitações estão em [encerramento da internacionalização](docs/i18n-validation.md). Os textos públicos aprovados de Termos, Privacidade, consentimento e planos estão publicados nos dois idiomas; revisões futuras precisam preservar o versionamento legal.

O escopo de internacionalização da interface, dos documentos e dos e-mails foi encerrado em 22/11/2026, com base integrada em `aa09fc2`. O [backlog conciliado](docs/i18n-backlog.md) relaciona as entregas às evidências e separa as propostas futuras. Geração por IA em inglês e testes externos adicionais de e-mail não são bloqueadores desse encerramento nem implementações já aprovadas.

```sh
npx playwright install chromium
npm run test:e2e:i18n
```

Para conferir o HTML da prévia, use `npm run build:i18n` e `npm run preview:i18n`; o resultado fica em `dist-i18n-preview/`, restrito a endereços locais. `npm run build` gera a versão bilíngue de produção em `dist/`; `npm run preview:release` permite conferi-la localmente. Gerar um build não publica o site.

A fonte Inter é servida pelo próprio site na produção e na prévia. O arquivo, a licença SIL Open Font License 1.1 e a origem estão em `public/fonts/inter/`. Os Termos e o cadastro indicam o uso profissional por pessoas com 18 anos ou mais. As minutas em `revisao-de-textos/` preservam o histórico das decisões e não fazem parte do site público.

## Cota do Free no servidor

A migração `20261117171616_free_lifetime_story_generation_quota.sql` exige o esquema de histórias, perfis, Administração e Projetos. Ela registra as versões existentes como uso histórico e mantém o consumo após a exclusão de uma história. Versões apagadas antes da migração não podem ser reconstruídas pelos registros disponíveis.

Cada geração ou regeneração bem-sucedida consome uma unidade ao salvar a versão. O Free inclui 10 unidades por conta, sem renovação mensal. Edições manuais, falhas e diagnósticos de projeto ficam fora da cota. O limite personalizado de cada conta continua disponível na Administração. O plano Pro mantém o padrão sem limite.

A Bancada envia um identificador por tentativa e recebe a versão já salva pela função `generate-user-story`. A migração, a função e o frontend correspondentes estão ativos em produção. Testes locais cobrem concorrência, repetição e isolamento; a publicação também verificou uma geração salva uma vez e um replay sem consumo duplicado. Em outro ambiente, aplique os componentes correspondentes na ordem descrita em Publicação bilíngue.

Com Docker disponível, execute a validação isolada em PowerShell.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-free-quota-local.ps1
```

O script cria e remove containers exclusivos, usa contas fictícias, executa a migração e os testes SQL, e testa a função real com PostgREST e PostgreSQL locais. A autenticação e o Gemini são simulados. O teste cobre a última vaga concorrente, repetição de pedidos, falhas, versões, isolamento de contas e limites personalizados. As imagens Docker precisam estar disponíveis ou ser baixadas na primeira execução.

## Termos, Privacidade e aceite

Termos e Privacidade estão publicados nos dois idiomas na versão `2026-11-18.1`, com manifesto em `src/content/legalRelease.production.json` e arquivo imutável no servidor. A prévia local conserva sua versão separada, `2026-11-17-preview.1`, identificada em `src/content/legalRelease.json`. Hugo Cruz da Silva Moraes Neto e `contato@techtupa.com.br` são a identificação e o contato adotados nos documentos aprovados. O histórico das decisões operacionais permanece em `revisao-de-textos/`, fora da publicação.

Na produção e na prévia, o cadastro envia a versão, o resumo SHA-256 e o idioma apresentados. O gatilho de criação da conta valida esses dados e registra o aceite na mesma transação. Contas existentes consultam o registro do servidor e aceitam a versão atual com uma ação antes de continuar no destino original. O aceite dos Termos e a apresentação da Política são registrados juntos. A escolha opcional de analytics segue seu próprio fluxo.

`src/content/legalRelease.json` identifica a versão e o resumo do conteúdo efetivo dos dois documentos nos dois idiomas. A migração `20261117190539_local_legal_acceptance.sql` conserva esse conteúdo como um arquivo imutável. A checagem de catálogos bloqueia alterações no texto que divergirem da versão registrada. Para uma nova edição, crie uma nova identificação, resumo e migração com o novo conteúdo, preservando as versões anteriores.

Para testar o banco isolado, use Docker e execute em PowerShell.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-legal-consent-local.ps1
```

O teste usa contas fictícias e inclui cadastro, falhas, permissões, isolamento, repetição, quatro solicitações concorrentes e apresentação de uma nova versão. A migração e o frontend correspondentes já foram publicados. Para validar o arquivo público localmente, acrescente `-Production` ao comando; o servidor remoto não é alterado por esse teste.

Para validar o percurso com autenticação real e e-mail capturado localmente, execute `npm run test:auth:local` para a prévia ou `npm run test:auth:release` para a configuração pública. Ambos exigem Docker e Chromium do Playwright. O teste monta PostgreSQL, GoTrue, PostgREST e um coletor SMTP descartáveis, sem consultar um projeto hospedado, e gera seu próprio build temporário com configuração fictícia. Usa as portas locais `54321` e `43919` e falha se estiverem ocupadas. Execute os testes de Auth e de convites em sequência, pois usam essas mesmas portas.

O percurso cobre português e inglês em desktop e celular de 320 pixels: cadastro, reenvio, bloqueio do login antes da confirmação, confirmação pelo link de e-mail real, aceite registrado no cadastro, recarga, conta sem aceite, aceite pelo teclado, saída e novo login com destino, parâmetros e âncora preservados. Também testa os seis modelos de Auth nos dois idiomas e os fallbacks de idioma. Os documentos do cadastro abrem em outra aba para preservar o formulário. As capturas ficam na pasta temporária informada; os containers e a rede exclusivos são removidos ao terminar. Esses testes locais não comprovam entrega em uma caixa externa nem alteram limites do serviço remoto.

## Publicação bilíngue

`npm run build` gera a versão de produção em `dist/`, no modo explícito `i18n-production`. Esse modo ativa os dois idiomas também no domínio público, os textos aprovados, a fonte local, o aceite e a indisponibilidade de marketing. Conserva a escolha anterior de analytics no armazenamento de produção. O modo `i18n-preview` continua restrito a endereços locais e mantém suas próprias escolhas de cookies e versão legal. O campo interno `preview` do contexto de idioma é mantido por compatibilidade e indica as funcionalidades de idiomas habilitadas, inclusive na produção.

A versão legal pública `2026-11-18.1` tem manifesto próprio em `src/content/legalRelease.production.json`, textos em `src/i18n/production-copy/` e arquivo imutável na migração `20261118022243_publish_legal_release.sql`. O arquivo da prévia permanece preservado. A data em seu identificador usa UTC. A versão entra em vigor com sua publicação no serviço.

Na primeira implantação em outro ambiente, aplique as migrações da cota, do arquivo legal local e da versão pública, e implante a função `generate-user-story` correspondente antes de trocar o frontend. No ambiente de produção atual, esses componentes já estão ativos; não os reaplique para atualizar a documentação. Clientes anteriores sem o identificador obrigatório da geração precisam recarregar antes de gerar; pedidos antigos são rejeitados antes de chamar a IA. As migrações preservam os dados existentes. Não desfaça o registro de consumo da cota nem os aceites para recuperar uma publicação do frontend.

Valide a ativação com `npm run test:e2e:release`, `npm run test:auth:release` e `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-legal-consent-local.ps1 -Production`. O primeiro comando confere as páginas públicas, a equivalência dos idiomas e a exclusão das minutas. O segundo usa Auth e SMTP isolados, sem projeto remoto. Os comandos que recompilam o mesmo diretório devem ser executados em sequência. As minutas não fazem parte do build público e seu caminho é bloqueado na hospedagem. As páginas editoriais têm metadados alternativos e sitemap nos dois idiomas; páginas legais, de preferências e autenticação mantêm `noindex`.

O arquivo público `release.json` identifica o commit do build, a ativação dos idiomas e o resumo dos documentos legais. Use-o junto com a conferência FTPS para relacionar o conteúdo servido à revisão validada. O procedimento de cópia protegida e publicação está em `docs/publicacao-ftps.md`.

## Contribuição

Leia o [guia de contribuição](CONTRIBUTING.md) e as [instruções para relatar problemas de segurança](SECURITY.md).

## Licença

O código próprio e a documentação identificados no [escopo da licença](docs/escopo-da-licenca.md) estão sob a [licença MIT](LICENSE). A marca ProdForge, os ativos visuais, o conteúdo editorial e os materiais de terceiros têm tratamento separado.
