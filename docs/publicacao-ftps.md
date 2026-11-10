# Publicação do frontend por FTPS

A publicação pelo GitHub Actions exige disparo manual na `main` e o SHA-256 de uma cópia verificada do destino. O processo envia primeiro os ativos novos em `assets/`, preserva os antigos e troca os demais arquivos, deixando o HTML por último. Cada arquivo é baixado e conferido por SHA-256 antes da renomeação para o nome final. A substituição é por arquivo.

## Cópia verificada

Use Python 3.11 ou posterior e FTPS explícito com certificado confiável e nome correspondente. Forneça `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` e `FTP_REMOTE_DIR` ao processo por um canal privado. `FTP_PORT` tem padrão 21. Selecione a raiz do site, onde fica o `index.html`.

```sh
python scripts/ftps-release.py snapshot CAMINHO_PRIVADO_NOVO
```

O comando baixa o conteúdo listado pelo servidor, incluindo arquivos ocultos quando anunciados pelo FTPS, compara os hashes com uma segunda leitura e verifica os arquivos gravados localmente. O diretório precisa ser novo e ficar fora do Git, em armazenamento com acesso restrito. Uma cópia incompleta fica sem manifesto. Guarde o `manifest.json` e a pasta `files/` juntos. Use apenas o hash do manifesto como entrada do workflow. A cópia pode conter informações internas.

## Troca e restauração

Guarde também o `dist/` exato da revisão candidata em armazenamento privado para recuperação. Antes de autorizar o disparo, confirme a disponibilidade de `MLSD`, a sobrescrita por renomeação na hospedagem e a configuração de cache. Suspenda outras publicações durante a operação. Se o conteúdo do destino divergir do manifesto aprovado, a execução para antes da primeira escrita.

Se a troca falhar durante a execução, o script tenta restaurar os arquivos alterados e mantém os ativos das duas versões. Para recuperar de uma interrupção que impediu a restauração automática, use a cópia verificada e o mesmo build da tentativa, com o acesso FTPS autorizado para escrita.

```sh
python scripts/ftps-release.py restore CAMINHO_PRIVADO_DA_COPIA CAMINHO_DO_DIST_DA_TENTATIVA
```

A restauração retira somente os caminhos novos da tentativa fora de `assets/` e preserva os arquivos alheios à publicação. Confirme a home, as páginas públicas e as referências de abas abertas após a troca ou a restauração. Planeje qualquer limpeza futura de ativos separadamente, após conferir o cache e a versão servida.
