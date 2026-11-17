---
bootstrapped_at: 2026-11-17T18:30:00Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: flashgen
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: flashgen
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

### Why this stack

Solo builder shipping the FlashGen MVP (paste text, generate flashcard proposals with an LLM, review and save per-user) in 8 after-hours weeks, with auth, per-user persistent storage and an AI generation step in scope. Astro + React + TypeScript + Tailwind on Supabase and Cloudflare is the recommended default for (web, js) and clears all four agent-friendly gates. It ships auth, a Postgres database and edge deploy out of the box, and Supabase row-level security maps directly onto the guardrail that one user's flashcards are never visible to another. Deployment defaults to cloudflare-pages; CI runs on GitHub Actions with auto-deploy on merge. Bootstrapper confidence is first-class, so expect occasional hiccups. The edge runtime limits long-running tasks, so the LLM call should stay a single short request.

## Pre-scaffold verification

| Signal      | Value                                                        | Severity | Notes                                              |
| ----------- | ------------------------------------------------------------ | -------- | -------------------------------------------------- |
| npm package | not run                                                      | n/a      | cmd_template is `git clone`; no npm CLI to check   |
| GitHub repo | not run                                                      | n/a      | `gh` not installed in PATH (recency check unavailable). Card `last_updated`: 2026-09-12 |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 20 (+ 1 sidelined as `.scaffold` sibling)
**Conflicts (.scaffold siblings)**: CLAUDE.md.scaffold
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted (`.git/` removed before move-up)

Notes: npm warned `EBADENGINE` — starter requires node >=22.22.1, current is v22.21.1. Install completed anyway. The starter's `README.md` and `AGENTS.md` had no counterpart in cwd and were moved silently.

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 10 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/3/0 direct of total 0/0/10/0

#### CRITICAL findings

none

#### HIGH findings

none

#### MODERATE findings

- Direct: `astro`, `eslint`, `typescript-eslint`
- Transitive: `@eslint/config-array`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `minimatch`
- Detail (advisory ids, fix versions): run `npm audit`.

#### LOW / INFO findings

none

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | true                 |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep (`diff CLAUDE.md CLAUDE.md.scaffold`).
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
