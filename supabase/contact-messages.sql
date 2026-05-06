-- ProdForge - Public contact messages captured by Edge Function.
-- Apply after init.sql so public.set_updated_at() is available.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  category text not null,
  message text not null,
  source text not null default 'contact_page',
  status text not null default 'new',
  user_agent text null,
  page_url text null,
  ip_hash text null,
  email_sent boolean not null default false,
  email_error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_messages_category_check
    check (category in ('suporte', 'privacidade', 'feedback', 'parceria', 'outro')),
  constraint contact_messages_status_check
    check (status in ('new', 'in_review', 'answered', 'archived')),
  constraint contact_messages_name_not_blank check (nullif(btrim(name), '') is not null),
  constraint contact_messages_email_not_blank check (nullif(btrim(email), '') is not null),
  constraint contact_messages_subject_not_blank check (nullif(btrim(subject), '') is not null),
  constraint contact_messages_message_not_blank check (nullif(btrim(message), '') is not null)
);

create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);

create index if not exists idx_contact_messages_status
  on public.contact_messages (status);

drop trigger if exists trg_contact_messages_set_updated_at on public.contact_messages;
create trigger trg_contact_messages_set_updated_at
before update on public.contact_messages
for each row
execute function public.set_updated_at();

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from anon, authenticated;
grant all on table public.contact_messages to service_role;
