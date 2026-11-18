# Publicação do frontend por FTPS

A publicação pelo GitHub Actions exige disparo manual na `main` e o SHA-256 de uma cópia verificada do destino. O processo envia primeiro os ativos novos em `assets/`, preserva os antigos e troca os demais arquivos, deixando o HTML por último. Cada arquivo é baixado e conferido por SHA-256 antes da renomeação para o nome final. A substituição é por arquivo.

## Cópia verificada

Use Python 3.11 ou posterior e FTPS explícito com certificado confiável e nome correspondente. Forneça `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` e `FTP_REMOTE_DIR` ao processo por um canal privado. `FTP_PORT` tem padrão 21. Selecione a raiz do site, onde fica o `index.html`.

```sh
python scripts/ftps-release.py snapshot CAMINHO_PRIVADO_NOVO
```

O comando baixa o conteúdo listado pelo servidor, incluindo arquivos ocultos quando anunciados pelo FTPS, compara os hashes com uma segunda leitura e verifica os arquivos gravados localmente. O diretório precisa ser novo e ficar fora do Git, em armazenamento com acesso restrito. Uma cópia incompleta fica sem manifesto. Guarde o `manifest.json` e a pasta `files/` juntos. Use apenas o hash do manifesto como entrada do workflow. A cópia pode conter informações internas.

## Troca e restauração

### Cópia com os acessos já configurados no GitHub Actions

Quando os acessos FTPS estão disponíveis somente nos secrets do repositório, use o workflow manual `backup-production.yml`, exclusivamente na `main`. Gere localmente um par RSA de pelo menos 3072 bits e mantenha a chave privada fora do Git, em uma pasta privada do responsável pela publicação. Passe somente a chave pública PEM codificada em base64 ao campo `backup_public_key_base64`.

O workflow cria a mesma cópia verificada, registra o hash do manifesto e publica apenas um arquivo cifrado com AES-256-GCM, cuja chave é protegida com RSA-OAEP/SHA-256. O artefato fica disponível por sete dias. Baixe-o e recupere a cópia local antes da publicação, conferindo novamente seu manifesto. Nenhum acesso FTPS ou arquivo do site em texto simples é incluído no artefato.

```sh
node scripts/protect-release-backup.mjs decrypt site-backup.pfgbackup site-backup.tar.gz CAMINHO_PRIVADO_DA_CHAVE
```

Extraia o arquivo recuperado em uma pasta privada nova e guarde a chave, o manifesto e os arquivos para a recuperação. A restauração continua usando `ftps-release.py restore`, com os acessos FTPS por canal privado. O workflow de publicação existente recebe o hash do manifesto verificado e compara novamente o destino antes da primeira escrita. A cópia e a publicação compartilham o mesmo grupo de exclusão mútua no GitHub Actions.

### Publicar ou restaurar

Guarde também o `dist/` exato da revisão candidata em armazenamento privado para recuperação. Antes de autorizar o disparo, confirme a disponibilidade de `MLSD`, a sobrescrita por renomeação na hospedagem e a configuração de cache. Suspenda outras publicações durante a operação. Se o conteúdo do destino divergir do manifesto aprovado, a execução para antes da primeira escrita.

Se a troca falhar durante a execução, o script tenta restaurar os arquivos alterados e mantém os ativos das duas versões. Para recuperar de uma interrupção que impediu a restauração automática, use a cópia verificada e o mesmo build da tentativa, com o acesso FTPS autorizado para escrita.

```sh
python scripts/ftps-release.py restore CAMINHO_PRIVADO_DA_COPIA CAMINHO_DO_DIST_DA_TENTATIVA
```

A restauração retira somente os caminhos novos da tentativa fora de `assets/` e preserva os arquivos alheios à publicação. Confirme a home, as páginas públicas e as referências de abas abertas após a troca ou a restauração. Planeje qualquer limpeza futura de ativos separadamente, após conferir o cache e a versão servida.
