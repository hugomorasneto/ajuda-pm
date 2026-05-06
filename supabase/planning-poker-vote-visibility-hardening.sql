-- ProdForge - Roda da Fogueira vote visibility hardening.
-- Ensures nobody can read individual vote values before the round is revealed.

drop policy if exists "planning_poker_votes_select_visible" on public.planning_poker_votes;

create policy "planning_poker_votes_select_visible"
on public.planning_poker_votes
for select
to authenticated
using (
  public.can_view_planning_session(session_id)
  and public.planning_poker_round_is_revealed(round_id)
);
