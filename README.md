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

## Contribuição

Leia o [guia de contribuição](CONTRIBUTING.md) e as [instruções para relatar problemas de segurança](SECURITY.md).

## Licença

O código próprio e a documentação identificados no [escopo da licença](LICENSE-SCOPE.md) estão sob a [licença MIT](LICENSE). A marca ProdForge, os ativos visuais, o conteúdo editorial e os materiais de terceiros têm tratamento separado.
