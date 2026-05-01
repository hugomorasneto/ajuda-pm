-- ProdForge - Protect public leads capture with insert-only access
-- Apply after init.sql when the table already exists.

alter table if exists public.leads enable row level security;

revoke all on table public.leads from anon, authenticated;
grant insert on table public.leads to anon, authenticated;

drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public"
on public.leads
for insert
to anon, authenticated
with check (
  nullif(btrim(name), '') is not null
  and nullif(btrim(email), '') is not null
);
