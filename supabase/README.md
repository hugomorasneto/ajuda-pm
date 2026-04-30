# Supabase workflow (explicit project context)

This repo does not use the Supabase MCP as the source of truth.
The source of truth for this project is:

- the repo files
- the local env file
- the explicit `project_ref`
- the token env variable for the correct account

## Required contract

Copy [`.env.local.example`](C:/Projetos/ajuda-pm/.env.local.example:1) to `.env.local`
and fill these values:

```dotenv
SUPABASE_PROJECT_REF=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_ACCESS_TOKEN_ENV=SUPABASE_ACCESS_TOKEN_PRODFORGE
```

Important:

- `SUPABASE_ACCESS_TOKEN_ENV` stores the name of the env var, not the token.
- the real token must stay outside the repo.

## Windows token setup

Set the actual token in a user-level environment variable:

```powershell
setx SUPABASE_ACCESS_TOKEN_PRODFORGE "YOUR_SUPABASE_ACCESS_TOKEN"
```

Open a new terminal after running `setx`.

## Validate the project context

Before any remote Supabase command, run:

```bash
npm run supabase:doctor
```

This checks:

- `SUPABASE_PROJECT_REF`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN_ENV`
- whether `supabase/config.toml` matches the declared project

## Link the CLI explicitly

```bash
npm run supabase:link
```

## Serve the function locally

```bash
npm run supabase:functions:serve
```

## Set edge function secrets

```bash
npm run supabase:secrets:set -- GEMINI_API_KEY=YOUR_KEY GEMINI_MODEL=gemini-2.0-flash
```

## Deploy the edge function

```bash
npm run supabase:functions:deploy
```

## Notes

- The scripts no longer hardcode the token env var name.
- The scripts no longer rely on an implicit CLI account selection.
- If the project context is wrong, the scripts fail before calling the Supabase CLI.
