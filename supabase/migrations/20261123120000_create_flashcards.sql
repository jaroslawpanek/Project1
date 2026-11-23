-- Migration: create_flashcards
-- Purpose : per-user flashcard storage (PRD: FR-006, FR-007, FR-005, FR-008).
-- Affects : new table public.flashcards, index, updated_at trigger, RLS policies.
-- Notes   : every user sees and manages only their own rows (PRD guardrail).
--           The anon role gets no policies, so it has no access at all.
--           Backwards compatible: a new table only (a Worker rollback does not undo migrations).

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  front text not null check (char_length(btrim(front)) between 1 and 1000),
  back text not null check (char_length(btrim(back)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flashcards is 'User flashcards (front = question, back = answer). RLS: owner only.';

-- "My flashcards" view: filter by owner, newest first.
create index flashcards_user_id_created_at_idx
  on public.flashcards (user_id, created_at desc);

-- keep updated_at current on edits
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger flashcards_set_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at();

-- row level security
alter table public.flashcards enable row level security;

-- authenticated: select own rows
create policy "flashcards_select_own_authenticated"
  on public.flashcards
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- authenticated: insert only rows owned by the caller
create policy "flashcards_insert_own_authenticated"
  on public.flashcards
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- authenticated: update own rows, and the row must stay owned by the caller
create policy "flashcards_update_own_authenticated"
  on public.flashcards
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- authenticated: delete own rows
create policy "flashcards_delete_own_authenticated"
  on public.flashcards
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- anon: explicit deny (defense in depth; the absence of a policy already denies)
create policy "flashcards_select_anon_denied"
  on public.flashcards
  for select
  to anon
  using (false);

create policy "flashcards_insert_anon_denied"
  on public.flashcards
  for insert
  to anon
  with check (false);

create policy "flashcards_update_anon_denied"
  on public.flashcards
  for update
  to anon
  using (false)
  with check (false);

create policy "flashcards_delete_anon_denied"
  on public.flashcards
  for delete
  to anon
  using (false);
