-- ProdForge - Initial database schema (MVP)
-- Run this script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  story_group_id uuid not null default gen_random_uuid(),
  version_number integer not null default 1,
  previous_version_id uuid null references public.user_stories(id) on delete set null,
  regeneration_instruction text null,
  input_context text not null,
  input_requirements text not null,
  title text not null,
  objective text null,
  user_story text not null,
  acceptance_criteria text null,
  business_rules text null,
  gaps text null,
  qa_checklist text null,
  status text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_stories_status_check check (status in ('generated', 'reviewed', 'approved', 'archived'))
);

create index if not exists idx_user_stories_created_at
  on public.user_stories (created_at desc);

create index if not exists idx_user_stories_user_id
  on public.user_stories (user_id);

create index if not exists idx_user_stories_story_group_id
  on public.user_stories (story_group_id);

create index if not exists idx_user_stories_group_version
  on public.user_stories (story_group_id, version_number desc);

drop trigger if exists trg_user_stories_set_updated_at on public.user_stories;
create trigger trg_user_stories_set_updated_at
before update on public.user_stories
for each row
execute function public.set_updated_at();

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);
