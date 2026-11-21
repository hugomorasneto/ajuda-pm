# Validação e encerramento da internacionalização

Base conferida: `c3999402cf3294fc14912bb5d920fae3ff1ffa80`, em 21/11/2026. O item 3 cobre o recebimento e os links dos e-mails nos dois idiomas e a atualização da documentação operacional. O idioma dos resultados gerados por IA continua em português (Brasil), como decisão separada do idioma da interface.

## Componentes publicados

| Componente | Referência conferida |
| --- | --- |
| Frontend bilíngue, autenticação, páginas públicas e áreas internas | `release.json` servido: `d5b47c314c210b0e30b876a55c0a0f39271d831e` |
| Termos, Privacidade e aceite no servidor | Versão `2026-11-18.1`; SHA-256 `5c455a00be5f0a7d6fc2cbd1cb91870672fae3124d0e79fab6588f89fa9a8a57` |
| Seis modelos de Auth, assunto e HTML | Doze campos correspondentes ao candidato `2e01cf6113d8e5ef015b6d676b73724f262a56fbf18225c4bfa4a3d9cf85af52` |
| Convite da Roda, assunto, texto simples e HTML | `planning-poker-invite` versão 2, ativa, JWT obrigatório; integração `c399940` |

Uma revisão mais recente da documentação não altera o SHA do frontend servido. As fontes e os catálogos correspondentes já estão publicados; atualizar estes arquivos Markdown não exige repetir FTPS, migrações, publicação de funções ou aplicação dos modelos.

## Validação local

| Comando | Cobertura e resultado |
| --- | --- |
| `npm run quality` | PASSOU: lint, copy nos dois idiomas, catálogos, 60 testes unitários e build |
| `npm run test:e2e:release` | PASSOU: quatro casos em desktop e celular; páginas públicas, documentos, preferências e exclusão das minutas |
| `npm run test:e2e:i18n` | PASSOU: 66 casos em desktop e celular, com português e inglês |
| `npm run test:auth:release` | PASSOU: quatro jornadas de cadastro, reenvio, confirmação real, aceite, login e saída; seis modelos × dois idiomas e quatro fallbacks |
| `npm run test:invites:local` | PASSOU: oito testes Deno, oito rejeições sem SMTP, quatro jornadas completas de convite e dois fallbacks |

Os testes de autenticação e convites usam PostgreSQL, GoTrue, PostgREST e SMTP descartáveis; o convite usa TLS com uma CA temporária. As jornadas validam idioma explícito contra preferência salva, destino, parâmetros codificados/duplicados, âncora, teclado, recarga e ausência de exceções JavaScript. Os tamanhos são desktop 1440×900 e celular 320×740. Os testes gerais simulam respostas do backend; os testes de Auth e convite usam serviços locais reais. Nenhum deles consulta o backend remoto.

## Recebimento externo

A validação usa somente a caixa de QA indicada pelo responsável, com consulta de recebimento pelo conector Gmail. A conta existente, sua senha e suas outras sessões devem ser preservadas. O projeto, a Roda e a conta facilitadora usados no ensaio são exclusivos de QA. Os dados e recibos privados ficam fora do Git, sem tokens, links de autenticação ou endereços pessoais nesta documentação pública.

PASSOU em 21/11/2026: os quatro e-mails chegaram à caixa de entrada do Gmail, sem classificação como spam. Foram conferidos os assuntos, o idioma do HTML, os botões e os destinos dos links recebidos.

| Mensagem | Idioma | Recebimento e link |
| --- | --- | --- |
| Convite da Roda | Português (Brasil) | Recebido; botão pelo teclado → login com código e idioma preservados |
| Link de acesso do Auth | Português (Brasil) | Recebido; link original → autenticação real → Roda correta → recarga |
| Convite da Roda | English | Recebido; botão pelo teclado → login com destino direto, parâmetros duplicados, valor codificado e âncora preservados |
| Link de acesso do Auth | English | Recebido; link original → autenticação real → Roda correta → recarga |

A navegação externa usou desktop para português e celular para inglês, além das quatro jornadas locais de cada fluxo nos dois idiomas e tamanhos. A preferência salva contrária ao convite não sobrepôs o idioma explícito. As capturas dos corpos recebidos e das páginas confirmaram conteúdo visível e ausência de cortes horizontais; as jornadas não tiveram exceções JavaScript.

Uma conferência adicional do login publicado, nos dois idiomas em 1440 e 320 pixels de largura, não registrou erros nem avisos de console.

O teste externo de Auth usou somente o modelo de link de acesso, preservando a senha da conta existente. Os outros cinco modelos têm cobertura local, não uma comprovação de entrega externa nesta rodada. Foram usados dois envios de Auth, respeitando o intervalo do projeto, e dois de convite da Roda. Limites, SMTP, hooks, configurações de Auth, versões das funções e frontend servido foram preservados e comparados antes e depois. A conta facilitadora, o projeto e a Roda de QA foram removidos com conferência de ausência. Somente as sessões criadas pelo teste foram revogadas; a conta existente e suas outras sessões foram preservadas.

O recebimento no Gmail não comprova renderização em Outlook, Apple Mail ou em todos os dispositivos. Os testes de layout usam Chromium/Playwright, pois o plugin Browser não está disponível nesta instalação. O provedor padrão de Auth tem restrições de entrega, detalhadas em [auth-emails.md](auth-emails.md).

## Continuidade operacional

Português brasileiro permanece como padrão. Novas traduções precisam passar por `npm run copy:check`; PRs e publicações precisam passar por `npm run quality`. Conteúdo já criado mantém seu idioma. Alterar textos legais exige uma nova versão e arquivo imutável, preservando os aceites anteriores. Os procedimentos de publicação e recuperação estão em [publicacao-ftps.md](publicacao-ftps.md), [auth-emails.md](auth-emails.md) e [roda-invite-emails.md](roda-invite-emails.md).
