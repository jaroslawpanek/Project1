# Verify flashcard isolation between accounts — Implementation Plan

## Overview

Prove on production that one account's flashcards are invisible and inaccessible to another account (PRD guardrail; roadmap S-06), and add a production-safe smoke mode. No application code and no schema changes: only verification scripts and one human-run production pass.

## Current State Analysis

- RLS is covered locally: `scripts/test-rls.mjs` runs 13 checks (own insert/select, cross-account select/update/delete, `user_id` spoofing, reassigning ownership, anon, CHECK constraints, `updated_at`, own delete) against a local Supabase only.
- The script refuses any non-local URL (`scripts/test-rls.mjs:9`) and creates its accounts via `signUp` + immediate `signInWithPassword` (`:20-29`), which cannot work on production where "Confirm email" is on.
- Several assertions assume an empty table: "A sees own row" expects exactly 1 row (`:46`) and "B sees 0 rows of A" expects 0 rows (`:50`). On production account A already owns real flashcards, so these must become id/marker-based.
- The app has no application-level owner filter: the list view (`src/pages/dashboard/flashcards.astro:8`) and the save route (`src/pages/api/flashcards/index.ts:38-39`) rely on RLS alone, so RLS is the only barrier.
- Production once differed from local: hosted Supabase did not grant Data API privileges, so saving failed only in prod (`context/foundation/lessons.md`). This is why the check must run against production.
- `scripts/smoke.mjs` signs up a real account and expects immediate sign-in (`:44-54`); on production this creates real accounts and the sign-in step fails (confirmation is on, deploy-plan Stage 2).

## Desired End State

- `scripts/test-rls.mjs` can run against production in an explicit opt-in remote mode using two existing confirmed accounts, with the same cross-account checks, id/marker-based assertions, and own-row cleanup; the default local behavior is unchanged.
- `scripts/smoke.mjs` has a read-only mode that is safe on production and creates no accounts.
- The human has run both against production, confirmed in a browser that account B cannot see A's cards, and the result is recorded in `context/deployment/deploy-plan.md`.

### Key Discoveries:

- `scripts/test-rls.mjs:9` — local-only guard that must be relaxed only behind an unmistakable opt-in.
- `scripts/test-rls.mjs:46`, `:50` — count-based assertions that break on a non-empty production table.
- `scripts/smoke.mjs:38-59` — step table (`name, run, expected`) that a read-only mode can filter without new machinery.
- `supabase/migrations/20261123120000_create_flashcards.sql` — owner-only policies per operation and explicit anon denial; the migration `20261123180000` grants privileges to `authenticated` only, so anon access on prod is expected to fail with `42501`.

## What We're NOT Doing

- No application code, API routes, or schema/migration changes.
- No service-role key, no admin-created users, no toggling "Confirm email" on production.
- No separate staging Supabase project and no sign-up/sign-in smoke on production.
- No CI job and no automated production run; the production run is manual and human-triggered.
- No deletion routes or UI (that is S-05, `delete-flashcards`).

## Implementation Approach

Reuse the existing check set instead of writing a second script. Remote mode is opt-in (explicit flag plus credentials from environment), signs in with two pre-existing confirmed accounts, tags every row it inserts with a unique marker, asserts on ids and the marker rather than on row counts, and removes its own marked rows in a `finally` block. The smoke change reuses the existing step table. Credentials never enter the repo or the conversation; the human runs the production pass.

## Phase 1: Remote mode for the RLS script

### Overview

Make `test-rls.mjs` runnable against production without weakening its default local-only behavior.

### Changes Required:

#### 1. Remote opt-in and account setup

**File**: `scripts/test-rls.mjs`

**Intent**: Keep local mode exactly as is. Add a remote mode that is entered only when an explicit flag is set, and that signs in two existing accounts instead of signing them up; fail fast with a clear message if any required value is missing.

**Contract**: Local (default): unchanged env (`SUPABASE_URL` defaulting to `127.0.0.1`, `SUPABASE_KEY`), local-only guard intact. Remote: requires `RLS_TARGET=remote`, `SUPABASE_URL` (https), `SUPABASE_KEY` (publishable), `RLS_A_EMAIL`, `RLS_A_PASSWORD`, `RLS_B_EMAIL`, `RLS_B_PASSWORD`; A and B must be different accounts. The script prints which mode and host it is using before touching data.

#### 2. Marker- and id-based assertions

**File**: `scripts/test-rls.mjs`

**Intent**: Make every assertion valid on a table that already contains real rows. Tag each inserted row with a unique marker and assert on that row's id, never on total counts.

**Contract**: Inserted `front` values start with a marker built from the run timestamp (e.g. `[rls-test <ts>]`). "A sees own row" = the marked row's id is in A's list. "B cannot see A's rows" = A's marked id is absent from B's list. Cross-account update/delete/spoof/reassign checks keep their current expectations and target the marked row id. The anon check keeps accepting either `42501` or an empty result.

#### 3. Own-row cleanup

**File**: `scripts/test-rls.mjs`

**Intent**: Return production data to its prior state without admin access, even when a check fails or throws.

**Contract**: A `finally` block deletes, as each owning account, only the rows whose `front` starts with this run's marker. Cleanup failures are reported but do not mask check results. The final exit code still reflects the checks.

### Success Criteria:

#### Automated Verification:

- Local run still passes all checks against a local Supabase: `SUPABASE_KEY=<local key> node scripts/test-rls.mjs`
- Remote mode refuses to run without the flag, with a non-https URL, with missing credentials, or when A and B are the same account (negative cases exit non-zero with a clear message).
- Linting passes: `npm run lint`

#### Manual Verification:

- Read the diff: the local-only guard is still the default path and the remote path cannot be entered by accident.

---

## Phase 2: Read-only smoke mode

### Overview

Let `smoke.mjs` run safely against production, creating no accounts.

### Changes Required:

#### 1. Read-only steps

**File**: `scripts/smoke.mjs`

**Intent**: Add an opt-in read-only mode that runs only checks that need no account, and add the unauthenticated API check to it. Default behavior stays unchanged.

**Contract**: `SMOKE_READONLY=1` runs: home renders (200), `/dashboard` redirects anonymous users to `/auth/signin` (302), and `POST /api/flashcards/generate` without a session returns 401. It skips sign-up, sign-in, sign-out and post-sign-in steps. The step table keeps its `name, run, expected` shape; the POST step may need a JSON-compatible request helper but must still send `Origin`. Without the flag the original 8 steps run as before.

### Success Criteria:

#### Automated Verification:

- Default smoke still passes locally after build and preview: `npm run build` then `npm run preview`, then `npm run smoke` (8/8).
- Read-only mode passes locally: `SMOKE_READONLY=1 npm run smoke`.
- Linting passes: `npm run lint`

#### Manual Verification:

- Read-only mode against the production URL passes and creates no new accounts in the Supabase Auth user list.

---

## Phase 3: Production run and recorded result

### Overview

The human-run verification on production, plus the audit trail. Production access stays with the human: credentials are typed into their own shell and never shared with the agent.

### Changes Required:

#### 1. Production pass (human)

**File**: none (human procedure)

**Intent**: Run both scripts against production with two confirmed accounts and confirm the result in a browser.

**Contract**: Human confirms a second account once (e.g. a `+alias` of their mailbox, using the app's sign-up and the emailed link). Human runs, in their own shell with env set: `RLS_TARGET=remote SUPABASE_URL=<prod> SUPABASE_KEY=<publishable> RLS_A_EMAIL=… RLS_A_PASSWORD=… RLS_B_EMAIL=… RLS_B_PASSWORD=… node scripts/test-rls.mjs`, then `BASE_URL=https://flashgen.jaroslaw-panek.workers.dev SMOKE_READONLY=1 npm run smoke`. Browser check: save one card as A, sign in as B in a private window, "Moje fiszki" shows none of A's cards; delete the test card afterwards.

#### 2. Record the result

**File**: `context/deployment/deploy-plan.md`

**Intent**: Close the open "two-account test on prod" and "smoke on prod" items with what was actually observed, so the roadmap and audit trail reflect reality.

**Contract**: Update the Etap 6 smoke item and the "Weryfikacja końcowa" two-account item with the date, the checks that passed, the mode used, and any failure found. If a check fails, record it and open a follow-up instead of marking it done.

### Success Criteria:

#### Automated Verification:

- Remote RLS script exits 0 against production with all checks passing: `RLS_TARGET=remote … node scripts/test-rls.mjs` (run by the human).
- Read-only smoke passes against production: `BASE_URL=<prod> SMOKE_READONLY=1 npm run smoke` (run by the human).

#### Manual Verification:

- Account B's "Moje fiszki" shows none of account A's cards (private window).
- No leftover `[rls-test …]` rows remain in production after the run.
- `deploy-plan.md` is updated with the observed result.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- No new unit tests; the scripts are themselves the checks. Their negative paths (missing flag, missing env, same account, non-https URL) are exercised by running them locally.

### Integration Tests:

- Local RLS run (13 checks) must still pass after the refactor.
- Local default smoke (8/8) and local read-only smoke must pass.

### Manual Testing Steps:

1. Confirm the second account via the app's sign-up and email link.
2. Run the remote RLS script with env credentials; expect all checks PASS and cleanup to report zero leftover rows.
3. Run read-only smoke against the production URL.
4. As A save a card, as B (private window) confirm "Moje fiszki" is empty of A's cards, then remove the test card.

## Performance Considerations

None. The production run issues a few dozen small requests once.

## Migration Notes

No schema or data migration. Production data is left as it was: the script removes only its own marked rows. The second test account remains as a permanent test account.

## References

- Roadmap item: `context/foundation/roadmap.md` (S-06, `verify-card-isolation`)
- Existing RLS script: `scripts/test-rls.mjs:9`, `:20-29`, `:46`, `:50`
- Existing smoke script: `scripts/smoke.mjs:38-59`
- RLS policies: `supabase/migrations/20261123120000_create_flashcards.sql`
- Lesson on hosted grants: `context/foundation/lessons.md`
- Deploy plan items to close: `context/deployment/deploy-plan.md` (Etap 6 smoke, Weryfikacja końcowa)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Remote mode for the RLS script

#### Automated

- [x] 1.1 Local run still passes all checks against a local Supabase: `SUPABASE_KEY=<local key> node scripts/test-rls.mjs` — 9de0d3a
- [x] 1.2 Remote mode refuses to run without the flag, with a non-https URL, with missing credentials, or when A and B are the same account (negative cases exit non-zero with a clear message). — 9de0d3a
- [x] 1.3 Linting passes: `npm run lint` — 9de0d3a

#### Manual

- [x] 1.4 Read the diff: the local-only guard is still the default path and the remote path cannot be entered by accident. — 9de0d3a

### Phase 2: Read-only smoke mode

#### Automated

- [x] 2.1 Default smoke still passes locally after build and preview: `npm run build` then `npm run preview`, then `npm run smoke` (8/8). — 288a945
- [x] 2.2 Read-only mode passes locally: `SMOKE_READONLY=1 npm run smoke`. — 288a945
- [x] 2.3 Linting passes: `npm run lint` — 288a945

#### Manual

- [x] 2.4 Read-only mode against the production URL passes and creates no new accounts in the Supabase Auth user list. — 288a945

### Phase 3: Production run and recorded result

#### Automated

- [x] 3.1 Remote RLS script exits 0 against production with all checks passing: `RLS_TARGET=remote … node scripts/test-rls.mjs` (run by the human).
- [x] 3.2 Read-only smoke passes against production: `BASE_URL=<prod> SMOKE_READONLY=1 npm run smoke` (run by the human).

#### Manual

- [x] 3.3 Account B's "Moje fiszki" shows none of account A's cards (private window).
- [x] 3.4 No leftover `[rls-test …]` rows remain in production after the run.
- [x] 3.5 `deploy-plan.md` is updated with the observed result.
