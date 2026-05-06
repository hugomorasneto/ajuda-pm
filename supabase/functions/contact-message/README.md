# contact-message

Recebe mensagens públicas da página `/contato`, registra em `public.contact_messages` com `SUPABASE_SERVICE_ROLE_KEY` dentro da Edge Function e tenta enviar uma notificação interna por e-mail via Resend.

Secrets necessárias nas Supabase Edge Functions:

```bash
RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=
```

Essas variáveis não devem ser configuradas no frontend. Se qualquer uma delas estiver ausente, a mensagem continua sendo registrada e o registro fica com `email_sent = false` e `email_error` preenchido.

Implante esta função como pública, sem verificação de JWT, para que o preflight `OPTIONS` do navegador passe corretamente:

```bash
supabase functions deploy contact-message --no-verify-jwt --project-ref <project-ref>
```
