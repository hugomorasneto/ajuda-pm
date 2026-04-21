-- ProdForge - User story versioning (MVP evolution)
-- Run this script in Supabase SQL Editor.

alter table public.user_stories
  add column if not exists story_group_id uuid,
  add column if not exists version_number integer,
  add column if not exists previous_version_id uuid null references public.user_stories(id) on delete set null,
  add column if not exists regeneration_instruction text null;

update public.user_stories
set story_group_id = coalesce(story_group_id, id),
    version_number = coalesce(version_number, 1)
where story_group_id is null
   or version_number is null;

alter table public.user_stories
  alter column story_group_id set not null,
  alter column version_number set not null;

create index if not exists idx_user_stories_story_group_id
  on public.user_stories (story_group_id);

create index if not exists idx_user_stories_group_version
  on public.user_stories (story_group_id, version_number desc);

