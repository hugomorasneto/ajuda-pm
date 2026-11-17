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

Abra a página inicial em [português](http://127.0.0.1:5173/) ou [inglês](http://127.0.0.1:5173/en/). Projetos, Times, a Roda da Fogueira e a Administração exigem sessão. A Administração exige um perfil administrador. O teste automatizado simula a sessão e as respostas do Supabase sem acessar serviços externos. Na prévia, links de confirmação retornam por /check-email para preservar o destino original e o idioma. Os testes simulam esse retorno sem enviar e-mails reais. Os modelos de e-mail do Supabase não fazem parte da prévia. O Campo de Treino tem guias e notas em [português](http://127.0.0.1:5173/aprender) e [inglês](http://127.0.0.1:5173/en/learn). O progresso da conta é compartilhado entre os idiomas. A Bancada e o Histórico aceitam a troca de idioma da interface. A geração continua em português (Brasil). A exportação acompanha os rótulos da interface e preserva o conteúdo original da história. Projetos e detalhes mantêm os mesmos endereços nos dois idiomas. Os diagnósticos já criados conservam o idioma original ao trocar a interface ou copiar o Markdown. Na Roda, o idioma acompanha os links locais da sala e o texto copiado. A prévia usa respostas simuladas nos testes de convite, sem enviar e-mails. Termos, política, consentimento, planos e demais textos públicos em inglês exigem revisão humana antes da publicação.

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

## Contribuição

Leia o [guia de contribuição](CONTRIBUTING.md) e as [instruções para relatar problemas de segurança](SECURITY.md).

## Licença

O código próprio e a documentação identificados no [escopo da licença](docs/escopo-da-licenca.md) estão sob a [licença MIT](LICENSE). A marca ProdForge, os ativos visuais, o conteúdo editorial e os materiais de terceiros têm tratamento separado.
