# ProdForge

ProdForge is a React + Vite web app for PMs and POs to turn loose product
context into structured user stories with acceptance criteria, gaps, and QA
checklists.

## Local app

```bash
npm install
npm run dev
```

## Environment contract

Copy [`.env.local.example`](C:/Projetos/ajuda-pm/.env.local.example:1) to
`.env.local` and define:

```dotenv
SUPABASE_PROJECT_REF=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_ACCESS_TOKEN_ENV=SUPABASE_ACCESS_TOKEN_PRODFORGE
```

The real access token must stay outside the repo in the env var named by
`SUPABASE_ACCESS_TOKEN_ENV`.

## Supabase workflow

This repo intentionally ignores the Supabase MCP as the source of truth.
All Supabase operations are bound to the explicit project context declared in
the repo and local envs.

Useful commands:

```bash
npm run supabase:doctor
npm run supabase:link
npm run supabase:functions:serve
npm run supabase:secrets:set -- GEMINI_API_KEY=YOUR_KEY
npm run supabase:functions:deploy
```

More details live in [supabase/README.md](C:/Projetos/ajuda-pm/supabase/README.md:1).
