# Como contribuir com o ProdForge

Comece pela [instalação local](README.md#instalação). Uma primeira contribuição pode melhorar um teste unitário ou corrigir a navegação de uma página pública. Esses cenários podem ser verificados com dados fictícios e sem credenciais de serviços.

1. Procure um relato semelhante nas [issues do projeto](https://github.com/hugomorasneto/ajuda-pm/issues). Para um erro comum, descreva o comportamento esperado, o observado, a revisão usada e os passos para reproduzir. Para uma possível exposição de dados ou falha de acesso, use o [canal de segurança](SECURITY.md).
2. Faça a mudança em uma branch própria. Consulte [AGENTS.md](AGENTS.md) para o vocabulário do produto e mantenha em português brasileiro os textos visíveis, inclusive mensagens, rótulos, metadados e exemplos.
3. Execute `npm run quality`. Para mudanças na interface, confira a jornada afetada em uma janela de celular e outra de computador. Use capturas e exemplos com dados fictícios.
4. Abra um pull request com o que mudou, o motivo, os comandos executados e as limitações dos testes. Se a mudança envolver banco, permissões ou hospedagem, descreva as dependências e a ordem de aplicação para revisão. Use um ambiente de teste autorizado para operações que acessem serviços compartilhados.

Envie somente materiais que você tem permissão para compartilhar. Para o código próprio e a documentação abrangidos pela MIT, confirme que você pode disponibilizar sua contribuição sob essa licença. Para incorporar código ou ativos de terceiros, indique a origem e as condições de uso no PR. Veja o [escopo da licença](docs/escopo-da-licenca.md).

## Onde encontrar cada parte

| Caminho | Conteúdo |
| --- | --- |
| `src/pages/`, `src/components/` e `src/styles/` | Páginas, componentes e estilos |
| `src/content/` e `aprender/` | Conteúdo de aprendizado e páginas estáticas |
| `src/utils/` e `src/services/` | Lógica, integrações do frontend e testes unitários |
| `supabase/functions/` | Edge Functions e testes Deno |
| `supabase/` | Definições de banco, políticas e migrações |

Para mudanças no backend, descreva no PR como verificou a função afetada. Use respostas simuladas ou um ambiente de teste autorizado e consulte o [guia do Supabase](supabase/README.md).
