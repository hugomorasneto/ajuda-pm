# generate-user-story (Supabase Edge Function)

## Required environment variables

- `GEMINI_API_KEY`: API key for Google Gemini.
- `GEMINI_MODEL` (optional): model primário. Default: `gemini-flash-latest`.
- `GEMINI_FALLBACK_MODELS` (optional): lista separada por vírgula para fallback.
  Exemplo: `gemini-2.5-flash,gemini-2.0-flash`

## Local run

```bash
supabase functions serve generate-user-story
```

## Deploy

```bash
supabase functions deploy generate-user-story
```

## Auth behavior

- The function is intended for authenticated app users only.
- `verify_jwt` stays enabled in the repo config.
- Anonymous requests using only the public anon key must fail.
- For low-level local debugging only, you may temporarily serve with:

```bash
supabase functions serve generate-user-story --no-verify-jwt
```

## Set secrets

```bash
supabase secrets set GEMINI_API_KEY=YOUR_KEY
supabase secrets set GEMINI_MODEL=gemini-flash-latest
supabase secrets set GEMINI_FALLBACK_MODELS=gemini-2.5-flash,gemini-2.0-flash
```
