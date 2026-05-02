-- ProdForge — Learning Progress
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql)

create table if not exists public.learning_progress (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  guide_slug   text        not null,
  completed_at timestamptz not null default now(),
  constraint learning_progress_user_guide_unique unique (user_id, guide_slug)
);

create index if not exists idx_learning_progress_user_id
  on public.learning_progress (user_id);

alter table public.learning_progress enable row level security;

drop policy if exists "learning_progress_select_own" on public.learning_progress;
create policy "learning_progress_select_own"
  on public.learning_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "learning_progress_insert_own" on public.learning_progress;
create policy "learning_progress_insert_own"
  on public.learning_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "learning_progress_delete_own" on public.learning_progress;
create policy "learning_progress_delete_own"
  on public.learning_progress for delete
  to authenticated
  using (auth.uid() = user_id);
