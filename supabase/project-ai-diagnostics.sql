-- ProdForge - Project AI diagnostics history.
-- Persists generated project diagnostics without changing story generation flow.

create table if not exists public.project_ai_diagnostics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  health_label text not null default 'Em organização',
  risks jsonb not null default '[]'::jsonb,
  refinement_questions jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  estimation_candidates jsonb not null default '[]'::jsonb,
  input_story_count integer not null default 0,
  analyzed_story_count integer not null default 0,
  provider text null,
  model_used text null,
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_ai_diagnostics_summary_not_empty check (nullif(btrim(summary), '') is not null),
  constraint project_ai_diagnostics_health_label_not_empty check (nullif(btrim(health_label), '') is not null),
  constraint project_ai_diagnostics_risks_array check (jsonb_typeof(risks) = 'array'),
  constraint project_ai_diagnostics_refinement_questions_array check (jsonb_typeof(refinement_questions) = 'array'),
  constraint project_ai_diagnostics_next_actions_array check (jsonb_typeof(next_actions) = 'array'),
  constraint project_ai_diagnostics_estimation_candidates_array check (jsonb_typeof(estimation_candidates) = 'array'),
  constraint project_ai_diagnostics_input_story_count_non_negative check (input_story_count >= 0),
  constraint project_ai_diagnostics_analyzed_story_count_non_negative check (analyzed_story_count >= 0)
);

create index if not exists idx_project_ai_diagnostics_project_created_at
  on public.project_ai_diagnostics (project_id, created_at desc);

create index if not exists idx_project_ai_diagnostics_created_by
  on public.project_ai_diagnostics (created_by);

alter table public.project_ai_diagnostics enable row level security;

grant select, insert, delete on public.project_ai_diagnostics to authenticated;

drop policy if exists "project_ai_diagnostics_select_project_member" on public.project_ai_diagnostics;
create policy "project_ai_diagnostics_select_project_member"
on public.project_ai_diagnostics
for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "project_ai_diagnostics_insert_project_member" on public.project_ai_diagnostics;
create policy "project_ai_diagnostics_insert_project_member"
on public.project_ai_diagnostics
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_project_member(project_id)
);

drop policy if exists "project_ai_diagnostics_delete_owner_or_manager" on public.project_ai_diagnostics;
create policy "project_ai_diagnostics_delete_owner_or_manager"
on public.project_ai_diagnostics
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.can_manage_project(project_id)
);
