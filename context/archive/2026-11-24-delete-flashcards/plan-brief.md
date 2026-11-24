# Delete flashcards — Plan Brief

> Full plan: `context/changes/delete-flashcards/plan.md`

## What & Why

Let a signed-in user delete their own flashcards from "Moje fiszki", one at a time or several at once (PRD FR-008, nice-to-have; the last open slice S-05 of milestone M-01). Today saved cards can never be removed, so a bad or outdated card stays in the list forever.

## Starting Point

The database is ready: an owner-only delete policy and the `delete` grant already exist and are proven on production, so no migration is needed. The API only has `POST /api/flashcards`, and "Moje fiszki" is a static Astro list with no interactivity.

## Desired End State

In "Moje fiszki" each card has a delete button and a checkbox; a bulk action deletes the selected cards. Both ask "Na pewno? Tak / Nie" inline and the cards vanish without a page reload. `DELETE /api/flashcards` is covered by smoke and the feature runs on production.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| -------- | ------ | ---------------- |
| Scope | Single and bulk delete | PRD says "niechciane fiszki" (plural), so both readings are covered. |
| Endpoint | One `DELETE /api/flashcards` with `{ ids }` (1–50 UUIDs) | A single delete is a bulk delete of one id, so one surface serves both. |
| Confirmation | Inline two-step "Na pewno? Tak / Nie" | Deletion is permanent; no browser dialog, which also keeps browser automation from hanging. |
| UI mechanism | React list + hook, fetch `DELETE` | Same pattern as the generator; supports inline confirm and errors without a reload. |
| Nothing deleted | 404 only when zero rows removed, else 200 `{ deleted }` | RLS makes missing, already-deleted and foreign ids indistinguishable and does not leak existence. |
| Data model | Hard delete, no migration | Nothing references a card and the policy and grant already exist. |

## Scope

**In scope:** `DELETE /api/flashcards`; interactive list with single and bulk delete and inline confirmation; smoke steps for the endpoint and the delete path; production release and verification; deploy-plan update.

**Out of scope:** schema, policy or grant changes; soft delete or undo; editing saved cards, search or pagination; a unit-test framework; automated production deploys.

## Architecture / Approach

Fix the server contract first, then build a React island fed by server-rendered initial data, with confirmation state held in a hook. Ownership is enforced by RLS alone, as everywhere else in the app: another account's id simply deletes nothing. The save → delete → delete-again path is exercised by default smoke against a local Supabase build; production only ever gets the read-only smoke.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Delete endpoint | `DELETE /api/flashcards` (401/400/404/200), response type, anonymous 401 smoke step | Wrong count if the delete does not return the removed rows |
| 2. Interactive list | React list and hook, single and bulk delete, inline confirm, smoke delete-path steps | Running default smoke against production values would create real accounts |
| 3. Production release | You deploy, read-only smoke on prod, manual delete check, `deploy-plan.md` updated | Deploy is a human action and cannot be done by the agent |

**Prerequisites:** local Supabase running (Docker); production values restored in `.dev.vars` before the final deploy build; a test account on production.
**Estimated effort:** ~2 sessions across 3 phases; Phase 3 is a short human-run step.

## Open Risks & Assumptions

- Assumes the `delete` grant that works for the owner on production (shown by the earlier remote RLS run) is the same one the Worker's user-scoped client uses.
- Default smoke must run only against a build wired to local Supabase; the plan swaps `.dev.vars` for the run and restores it.
- A bulk request is capped at 50 ids (same cap as saving); a user with more cards deletes in several batches.

## Success Criteria (Summary)

- A user can delete one card or several in "Moje fiszki", each with an inline confirmation, and the list updates without reload.
- `DELETE /api/flashcards` returns 401/400/404/200 as specified and smoke covers it (anonymous 401, and save → delete → delete again locally).
- The feature works on production, verified by read-only smoke and a manual single and bulk delete, and `deploy-plan.md` records it.
