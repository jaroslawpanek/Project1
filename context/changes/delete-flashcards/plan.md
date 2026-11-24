# Delete flashcards Implementation Plan

## Overview

Let a signed-in user delete their own flashcards from "Moje fiszki" (PRD FR-008, nice-to-have; roadmap S-05). One endpoint, `DELETE /api/flashcards` with `{ ids }`, serves both single and bulk deletion; the page becomes an interactive React list with inline two-step confirmation.

## Current State Analysis

- The database side is ready: an owner-only delete policy exists (`supabase/migrations/20261123120000_create_flashcards.sql:65-69`) and `delete` is granted to `authenticated` (`supabase/migrations/20261123180000_grant_flashcards_privileges.sql:9`). Cross-account deletion is already proven blocked locally and on production (`scripts/test-rls.mjs`, change `verify-card-isolation`). No migration is needed.
- The API has no delete: `src/pages/api/flashcards/index.ts` exports only `POST` (zod body schema, 401 without session via `context.locals.user`, errors as `ApiErrorDto` in Polish, RLS enforces ownership).
- "Moje fiszki" (`src/pages/dashboard/flashcards.astro:5-9`) is a static Astro page that selects `id, front, back` ordered by `created_at desc`; there is no interactivity and no owner filter in code (RLS only).
- Established pattern for interactivity: a React component mounted with `client:load` plus a hook in `src/components/hooks/` (`FlashcardGenerator.tsx`, `useFlashcardGenerator.ts`); shared DTOs live in `src/types.ts`; Tailwind classes go through `cn()`; the `Button` primitive is `src/components/ui/button.tsx`.
- There is no unit-test framework; verification is `scripts/smoke.mjs` (default 8 steps plus a read-only mode) and `scripts/test-rls.mjs`. Default smoke creates real accounts, so it must run only against a build wired to local Supabase.
- Because RLS makes "not found", "already deleted" and "owned by someone else" indistinguishable (0 rows deleted), the API cannot and need not tell them apart.

## Desired End State

- A signed-in user can delete one card (per-card button) or several (checkbox selection plus a bulk action) in "Moje fiszki", each behind an inline "Na pewno? Tak / Nie" confirmation, with deleted cards disappearing from the list without a page reload.
- `DELETE /api/flashcards` returns 401 without a session, 400 for an invalid body, 404 when nothing was deleted, and 200 `{ deleted: n }` otherwise.
- Smoke covers the endpoint (anonymous 401 in read-only mode; save → delete 200 → delete again 404 in default mode) and the feature is released to production and verified there.

### Key Discoveries:

- `src/pages/api/flashcards/index.ts:23-45` — the route pattern (auth check, zod `safeParse`, `createClient`, `ApiErrorDto`) to copy for `DELETE`.
- `src/pages/dashboard/flashcards.astro:5-9` — list query and RLS-only access; the page already guards `/dashboard/*` through `src/middleware.ts:4`.
- `src/components/hooks/useFlashcardGenerator.ts:11-14` — `readError` helper shape and the fetch/error/status pattern to mirror in the new hook.
- `scripts/smoke.mjs` — the step table, the `json` request option and the read-only mode added in the previous change; `request()` currently returns only status and location, so reading the card id needs a body field.
- `context/foundation/lessons.md` — hosted Supabase needs explicit grants; `delete` is already granted and was exercised on production, so no new grant is required.

## What We're NOT Doing

- No migration, schema or policy change, and no soft delete or undo (hard delete; nothing else references a card).
- No `window.confirm` and no other browser dialog.
- No editing of saved cards, no pagination or search in "Moje fiszki", no spaced-repetition features.
- No filter on `user_id` added in code (RLS remains the single barrier, consistent with the rest of the app) and no new test framework.
- No automated production deploy; deploying stays a human action.

## Implementation Approach

Add the API first so the contract is fixed and testable, then build the UI against it, then release. One endpoint with an `ids` array keeps the surface small: a single delete is a bulk delete of one id. The list UI is a React island fed by server-rendered initial data so the page still renders without waiting for client fetches. Confirmation state is per card and for the bulk action, held in the hook.

## Critical Implementation Details

- **Smoke safety:** default smoke creates accounts, so build and preview with local Supabase values (swap `.dev.vars`/`.env` for the run and restore them afterwards, as CI does), never with production values. Read-only smoke is the only mode allowed against production.

## Phase 1: Delete endpoint

### Overview

Fix the server contract for deletion and cover its anonymous behavior in smoke.

### Changes Required:

#### 1. Response type

**File**: `src/types.ts`

**Intent**: Add the shared DTO for the delete response so client and server agree.

**Contract**: `DeleteFlashcardsResponseDto { deleted: number }`. The request body shape stays local to the route as a zod schema.

#### 2. DELETE route

**File**: `src/pages/api/flashcards/index.ts`

**Intent**: Export `DELETE` next to the existing `POST`, following the same structure: reject unauthenticated callers, validate the body with zod, delete the owner's matching rows through the user's Supabase client, and report how many rows were removed.

**Contract**: Body `{ ids: string[] }` where each id is a UUID, 1 to 50 items, duplicates tolerated. Responses: 401 `{ error: "Musisz być zalogowany." }` without a session; 400 with the first zod issue message for an invalid body; 500 `{ error: … }` on a database error; 404 `{ error: "Nie znaleziono fiszki." }` when zero rows were deleted; 200 `{ deleted: n }` otherwise. The delete must request the deleted rows back (select after delete) so the count is the number actually removed, not the number requested. Ownership is enforced by RLS only.

#### 3. Anonymous check in read-only smoke

**File**: `scripts/smoke.mjs`

**Intent**: Prove the endpoint rejects anonymous callers, safely on production.

**Contract**: A new read-only step "delete API rejects anonymous user" sends `DELETE /api/flashcards` with a JSON body of one valid UUID and expects 401. It uses the existing `json` request option and always sends `Origin`; it runs in read-only mode only, mirroring the existing anonymous generate check.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Build succeeds: `npm run build`
- Read-only smoke passes locally, including the new 401 step: `SMOKE_READONLY=1 npm run smoke` (against a local preview)

#### Manual Verification:

- Read the route: no `user_id` is trusted from the client, the count comes from rows actually deleted, and every status code matches the contract.

---

## Phase 2: Interactive "Moje fiszki" list

### Overview

Make the list interactive: single and bulk delete with inline confirmation, and extend smoke to the full delete path.

### Changes Required:

#### 1. List state hook

**File**: `src/components/hooks/useFlashcardList.ts`

**Intent**: Own the list state and the delete requests so the component stays presentational: the cards, which ones are selected, which confirmation is open, request status and error.

**Contract**: Takes the initial cards (`id`, `front`, `back`). Exposes the cards, the selected ids, the pending confirmation (a single card id, the bulk action, or none), a busy flag, an error message, and actions to toggle a selection, request/cancel a confirmation, and confirm a deletion. Confirming calls `DELETE /api/flashcards` with the affected ids; on 200 or 404 the affected ids are removed from the list and from the selection (404 means they are already gone); on other errors the cards stay and a Polish error message is shown (reuse the `readError` pattern from `useFlashcardGenerator.ts`). Network failure shows "Brak połączenia z serwerem. Spróbuj ponownie."

#### 2. List component

**File**: `src/components/FlashcardList.tsx`

**Intent**: Render the cards with a per-card "Usuń" control, a selection checkbox per card and a bulk "Usuń zaznaczone (N)" control, each opening an inline two-step confirmation.

**Contract**: Props: `initialCards`. Each card's root element carries `data-flashcard-id="<id>"` (server-rendered, used by smoke). Per-card confirmation reads "Na pewno? Tak / Nie" in place of the button; bulk confirmation reads "Usunąć N fiszek? Tak / Nie". While a request is in flight, controls are disabled. Shows the existing empty-state text when no cards remain and an alert for errors. Styling follows the existing glass-card look via `cn()` and the `Button` primitive (destructive variant for the confirm action).

#### 3. Page wiring

**File**: `src/pages/dashboard/flashcards.astro`

**Intent**: Replace the static `<ul>` with the React island, keeping the server-side query, the load-error alert and the "Generuj nowe" link.

**Contract**: Mount `<FlashcardList initialCards={flashcards} client:load />`; the empty-state message and list rendering move into the component. The query and ordering stay unchanged.

#### 4. Delete path in default smoke

**File**: `scripts/smoke.mjs`

**Intent**: Exercise the real delete path end to end against a local build.

**Contract**: The request helper also returns the response body text. After the signed-in dashboard step, default mode adds steps: save a card via `POST /api/flashcards` (expect 201), fetch `/dashboard/flashcards` and read a `data-flashcard-id` from the HTML, `DELETE /api/flashcards` with that id (expect 200), then the same `DELETE` again (expect 404). These run before sign-out and only in default (write) mode; read-only mode is unchanged apart from Phase 1's step.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Build succeeds: `npm run build`
- Default smoke passes against a local-Supabase build, including save → delete 200 → delete 404: `npm run smoke`
- Read-only smoke still passes: `SMOKE_READONLY=1 npm run smoke`
- Local RLS script still passes: `SUPABASE_KEY=<local key> node scripts/test-rls.mjs`

#### Manual Verification:

- In a browser against the local build, deleting one card shows "Na pewno? Tak / Nie", "Nie" cancels, "Tak" removes only that card without a page reload.
- Selecting several cards and using the bulk action asks for confirmation with the correct count and removes exactly the selected cards.
- With no cards left, the empty-state message appears.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Production release and verification

### Overview

Release to production (human-run, per project rules) and verify there.

### Changes Required:

#### 1. Deploy (human)

**File**: none (human procedure)

**Intent**: Ship the new build; production deployments are performed and approved by the human.

**Contract**: Human runs `npm run build` with production values restored in `.dev.vars`, then `npx wrangler deploy` (never `wrangler pages`). The agent does not deploy.

#### 2. Production verification

**File**: none (human procedure with agent-run read-only smoke)

**Intent**: Confirm the feature works on production without creating accounts.

**Contract**: Agent runs `SMOKE_READONLY=1 BASE_URL=https://flashgen.jaroslaw-panek.workers.dev npm run smoke` (includes the new anonymous-delete 401). Human saves a test card with a test account, deletes it singly with confirmation, then saves two more and deletes them in bulk.

#### 3. Record the result

**File**: `context/deployment/deploy-plan.md`

**Intent**: Keep the audit trail current with the new deployed version and what was verified.

**Contract**: Add the new active version ID, the date, the read-only smoke result and the manual delete result to the relevant stage and the "Weryfikacja końcowa" section.

### Success Criteria:

#### Automated Verification:

- Read-only smoke passes against production (3 earlier steps plus the anonymous delete 401): `SMOKE_READONLY=1 BASE_URL=<prod> npm run smoke`

#### Manual Verification:

- Single delete with inline confirmation works on production.
- Bulk delete with inline confirmation works on production and leaves no test cards behind.
- `deploy-plan.md` records the new version and the results.

---

## Testing Strategy

### Unit Tests:

- None added: the repo has no unit-test framework and the logic is thin; behavior is covered end to end by smoke.

### Integration Tests:

- Smoke: anonymous `DELETE` returns 401 (read-only); signed-in save → delete 200 → delete again 404 (default, local Supabase).
- Existing `scripts/test-rls.mjs` keeps proving that another account cannot delete a user's rows, which the endpoint relies on.

### Manual Testing Steps:

1. Locally: delete one card (cancel, then confirm), delete several via selection, reach the empty state.
2. Production: single delete and bulk delete with a test account, no leftover cards.

## Performance Considerations

None. At most 50 ids per request and a single `DELETE … WHERE id IN (…)` per call, within the Workers subrequest limits (one auth check plus one delete).

## Migration Notes

None. No schema, policy or data changes; rollback is a Worker rollback and needs no database action.

## References

- Roadmap item: `context/foundation/roadmap.md` (S-05, `delete-flashcards`)
- Route pattern: `src/pages/api/flashcards/index.ts:23-45`
- List page: `src/pages/dashboard/flashcards.astro:5-9`
- Hook pattern: `src/components/hooks/useFlashcardGenerator.ts:11-14`
- Delete policy and grant: `supabase/migrations/20261123120000_create_flashcards.sql:65-69`, `supabase/migrations/20261123180000_grant_flashcards_privileges.sql:9`
- Prior verification of isolation: `context/archive/2026-11-24-verify-card-isolation/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Delete endpoint

#### Automated

- [x] 1.1 Type checking passes: `npx astro check`
- [x] 1.2 Linting passes: `npm run lint`
- [x] 1.3 Build succeeds: `npm run build`
- [x] 1.4 Read-only smoke passes locally, including the new 401 step: `SMOKE_READONLY=1 npm run smoke` (against a local preview)

#### Manual

- [x] 1.5 Read the route: no `user_id` is trusted from the client, the count comes from rows actually deleted, and every status code matches the contract.

### Phase 2: Interactive "Moje fiszki" list

#### Automated

- [ ] 2.1 Type checking passes: `npx astro check`
- [ ] 2.2 Linting passes: `npm run lint`
- [ ] 2.3 Build succeeds: `npm run build`
- [ ] 2.4 Default smoke passes against a local-Supabase build, including save → delete 200 → delete 404: `npm run smoke`
- [ ] 2.5 Read-only smoke still passes: `SMOKE_READONLY=1 npm run smoke`
- [ ] 2.6 Local RLS script still passes: `SUPABASE_KEY=<local key> node scripts/test-rls.mjs`

#### Manual

- [ ] 2.7 In a browser against the local build, deleting one card shows "Na pewno? Tak / Nie", "Nie" cancels, "Tak" removes only that card without a page reload.
- [ ] 2.8 Selecting several cards and using the bulk action asks for confirmation with the correct count and removes exactly the selected cards.
- [ ] 2.9 With no cards left, the empty-state message appears.

### Phase 3: Production release and verification

#### Automated

- [ ] 3.1 Read-only smoke passes against production (3 earlier steps plus the anonymous delete 401): `SMOKE_READONLY=1 BASE_URL=<prod> npm run smoke`

#### Manual

- [ ] 3.2 Single delete with inline confirmation works on production.
- [ ] 3.3 Bulk delete with inline confirmation works on production and leaves no test cards behind.
- [ ] 3.4 `deploy-plan.md` records the new version and the results.
