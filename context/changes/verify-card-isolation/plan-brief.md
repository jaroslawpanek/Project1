# Verify flashcard isolation between accounts — Plan Brief

> Full plan: `context/changes/verify-card-isolation/plan.md`

## What & Why

Prove on production that one account's flashcards are invisible and inaccessible to another account, which is a PRD guardrail. RLS has only been verified locally, and production already differed from local once (missing Data API grants), so a production check is the honest evidence. Also make the smoke test safe to run on production.

## Starting Point

`scripts/test-rls.mjs` runs 13 cross-account checks but refuses any non-local URL and signs users up on the fly, which cannot work on production (email confirmation on). Its assertions assume an empty table, while the production account already owns real cards. The app has no owner filter in code, so RLS is the only barrier. `scripts/smoke.mjs` creates real accounts and expects instant sign-in.

## Desired End State

The RLS script can run against production in an explicit opt-in mode with two existing confirmed accounts, asserting on ids and a marker and cleaning up its own rows. Smoke has a read-only mode that creates no accounts. You have run both on production, confirmed in a browser that account B cannot see A's cards, and the result is recorded in `deploy-plan.md`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| -------- | ------ | ---------------- |
| Test accounts | Two real confirmed accounts via env | No service-role key and no prod settings touched; tests the real auth path. |
| Method | Extend `test-rls.mjs` with opt-in remote mode | Reuses the 13 existing checks instead of a drifting second script. |
| Smoke on prod | Read-only mode (`/`, `/dashboard` redirect, API 401) | Creates no prod accounts; matches the deploy-plan's own fallback. |
| Cleanup | Script deletes its own marked rows | Restores prod data without admin access; accounts stay. |
| Assertions | Id/marker-based, not counts | Account A already has real cards on production. |

## Scope

**In scope:** remote mode for the RLS script; read-only smoke mode; a human-run production pass; recording the result in `deploy-plan.md`.

**Out of scope:** application code or schema changes; service-role key; toggling email confirmation; staging project; CI job; delete routes or UI (S-05).

## Architecture / Approach

Reuse the existing scripts. Remote mode is entered only by an explicit flag plus env credentials, signs in two existing accounts, tags inserted rows with a run marker, asserts on ids, and deletes its own rows in `finally`. Smoke reuses its step table with a read-only filter. You run the production pass in your own shell; credentials never reach the repo or the conversation.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Remote RLS mode | `test-rls.mjs` runnable on prod, local default unchanged | Loosening the local-only guard; must be unmistakably opt-in |
| 2. Read-only smoke | `SMOKE_READONLY=1` mode safe on prod | Breaking the default 8-step smoke |
| 3. Production run | Passing prod run, browser check, `deploy-plan.md` updated | A real isolation failure would surface and need a follow-up |

**Prerequisites:** a second confirmed account (e.g. a `+alias` of your mailbox), prod publishable key and both accounts' credentials in your shell env.
**Estimated effort:** ~2 sessions across 3 phases; Phase 3 is a short human-run step.

## Open Risks & Assumptions

- The check could reveal a real isolation gap on prod; then the fix becomes its own change and S-06 stays open.
- Assumes the production publishable key and both accounts' credentials can be placed in your local env without sharing them.
- A crash mid-run could leave a few marked rows until the next run's cleanup.

## Success Criteria (Summary)

- Remote RLS run on production passes all checks and leaves no marked rows.
- Read-only smoke passes against production without creating accounts.
- In a browser, account B sees none of account A's cards, and `deploy-plan.md` records the result.
