-- Migration: grant_flashcards_privileges
-- Purpose : hosted Supabase projects do not auto-grant Data API privileges on new tables in `public`,
--           so RLS policies alone were not enough: `authenticated` got "permission denied".
-- Affects : public.flashcards (privileges only; no schema or data change).
-- Notes   : only `authenticated` is granted. `anon` gets nothing (it has no legitimate access;
--           the explicit deny policies stay as defense in depth). RLS still restricts rows to the owner.
--           Idempotent: safe where the privileges already exist (e.g. local Supabase).

grant select, insert, update, delete on table public.flashcards to authenticated;
