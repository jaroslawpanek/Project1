# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Always GRANT Data API privileges in migrations that create tables

- **Context**: Supabase migrations that create tables in schema `public` (supabase/migrations/), hosted projects.
- **Problem**: Hosted Supabase does not auto-grant Data API privileges on new `public` tables to authenticated/anon/service_role. RLS policies alone are not enough: queries fail with "permission denied" (42501). Local Supabase grants them by default, so local tests pass and the bug only shows in production (FlashGen: saving and listing flashcards failed on first prod test).
- **Rule**: Every migration that creates a table must explicitly `grant select, insert, update, delete on table public.<table> to authenticated;` (only the roles actually needed). Verify on the hosted project, e.g. `supabase db query --linked` on information_schema.role_table_grants.
- **Applies to**: plan, implement, impl-review
