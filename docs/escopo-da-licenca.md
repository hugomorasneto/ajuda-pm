# Escopo da licença MIT

A [licença MIT](../LICENSE) cobre as partes próprias identificadas abaixo. O titular indicado no aviso é Hugo Cruz da Silva Moraes Neto. Em arquivos que combinam código e outros materiais, a licença cobre somente as partes de código próprio descritas aqui.

| Material | Abrangido pela MIT |
| --- | --- |
| Código do frontend | Implementação, testes e estilos próprios em `src/`, exceto `src/assets/`, `src/content/` e os materiais reservados abaixo. Nos HTML das páginas, a MIT cobre a estrutura e os scripts próprios, com as exceções indicadas abaixo. |
| Código do backend | Edge Functions e testes próprios em `supabase/functions/`, além do SQL próprio em `supabase/*.sql` e `supabase/migrations/`. `supabase/promote-hugo-admin.sql` fica fora desse escopo. |
| Ferramentas e documentação | Scripts próprios em `scripts/`, configuração reutilizável em `vite.config.js`, `eslint.config.js` e `cspell.config.json`, e os guias `README.md`, `CONTRIBUTING.md` e `SECURITY.md`. |

Ficam fora da MIT deste projeto:

- O nome e a marca ProdForge, logotipos, ícones, favicons, imagens, ilustrações, peças de divulgação e ativos Open Graph. Isso inclui os ativos em `public/` e `src/assets/`, bem como elementos de marca incorporados a outros arquivos.
- Textos editoriais e materiais do Campo de Treino, incluindo `aprender/` e `src/content/`. Textos dos termos de uso, da política de privacidade e de outros avisos legais também ficam fora, inclusive quando aparecem em componentes.
- Dependências, fontes, ícones, trechos e outros materiais de terceiros. Esses itens seguem suas próprias licenças e avisos.
- Capturas, arquivos de auditoria, backups, notas e configurações operacionais, incluindo `artifacts/`, `temp/`, `.claude/`, `supabase/.temp/`, `supabase/config.toml`, `.github/workflows/deploy.yml` e `og-generator.html`.
- Dados de contas, conteúdo gerado ou enviado por pessoas usuárias, credenciais e dados de produção.

Qualquer outro material fora da tabela depende da permissão aplicável. A presença de um arquivo no repositório público, no histórico ou no site não concede licença adicional de uso ou redistribuição.
