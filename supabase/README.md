# Supabase setup (ProdForge)

Este projeto está fixado no `project_ref`:

- `bkuizdxdmnneyjsjydtm`

## 1) Login na conta correta

Use um token da conta que possui acesso ao projeto:

```bash
supabase login
```

ou

```bash
supabase login --token <SEU_SUPABASE_ACCESS_TOKEN>
```

## 1.1) Token persistente por projeto (Windows)

```powershell
setx SUPABASE_ACCESS_TOKEN_AJUDA_PM "SEU_TOKEN_DA_CONTA_CORRETA"
```

Abra um novo terminal após rodar esse comando.

## 2) Configurar secrets da Edge Function

```bash
npm run supabase:secrets:set -- GEMINI_API_KEY=YOUR_KEY GEMINI_MODEL=gemini-2.0-flash
```

## 3) Rodar localmente a function

```bash
npm run supabase:functions:serve
```

## 4) Deploy sem seletor interativo

```bash
npm run supabase:functions:deploy
```

Esses scripts já carregam automaticamente:

- `SUPABASE_ACCESS_TOKEN_AJUDA_PM` -> `SUPABASE_ACCESS_TOKEN`

## Diagnóstico rápido

Se aparecer lista de projetos ao dar deploy, o token logado não tem acesso ao
`project_ref` deste repositório.
