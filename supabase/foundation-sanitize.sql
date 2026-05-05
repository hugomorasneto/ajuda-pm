-- ProdForge - Foundation cleanup before projects and teams.
-- Removes test-only data and enforces authenticated ownership for user stories.

drop table if exists public.test;

delete from public.user_stories
where id in (
  '57eaee0b-448f-43a6-85d3-0a742fb7dd09',
  'df7c6026-f7cc-4111-a0f9-449d97b1f8d0',
  'c1b328e1-404d-4d08-ac91-e3900d0d8d9e'
);

alter table public.user_stories
  alter column user_id set not null;

alter table public.user_stories
  drop constraint if exists user_stories_user_id_fkey;

alter table public.user_stories
  add constraint user_stories_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;
