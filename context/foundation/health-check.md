---
project: 10x-astro-starter
checked_at: 2026-11-17T19:10:00Z
health_status: needs-attention
context_type: brownfield
language_family: js
stack_assessment_available: false
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 18
  moderate: 8
  low: 0
test_runner_detected: false
ci_provider: GitHub Actions
recommended_fixes: 6
---

## Dependency Health

### Lockfile

Status: present (package-lock.json)
Package manager: npm

### Security Audit

Tool: npm audit --json
Summary: 0 CRITICAL, 18 HIGH, 8 MODERATE, 0 LOW
Direct vs transitive: direct HIGH — `astro`, `@astrojs/check`, `@astrojs/cloudflare`, `@astrojs/react`, `eslint-plugin-astro`, `lint-staged`; direct MODERATE — `eslint`, `typescript-eslint`. The rest is transitive (vite, picomatch, tinyglobby, fdir, unstorage, anymatch, @typescript-eslint/*, minimatch and others).

#### HIGH findings

- **astro** (direct) — advisory details: run `npm audit`. `fixAvailable: true`.
- **@astrojs/cloudflare, @astrojs/react, @astrojs/check, eslint-plugin-astro, lint-staged** (direct) — `npm audit` proposes these only as *older major versions* (e.g. `@astrojs/cloudflare@12.6.13` while 14.x is installed). These are downgrade suggestions, not real fixes. Do not run `npm audit fix --force` blindly.
- **vite, picomatch, tinyglobby, fdir, unstorage, anymatch, @typescript-eslint/typescript-estree, astro-eslint-parser, @astrojs/markdown-satteri, @astrojs/internal-helpers, @astrojs/language-server, @vitejs/plugin-react** (transitive) — advisory only; resolved by updating their parents.

MODERATE: 8 findings — `eslint`, `typescript-eslint`, `@eslint/config-array`, `@typescript-eslint/{eslint-plugin,parser,type-utils,utils}`, `minimatch`.

Note: right after scaffolding the same audit showed 0 HIGH / 10 MODERATE. The advisory database changed in between; the project's dependencies did not.

### Outdated Dependencies

Packages with major version gaps: 2 (no package is 2+ majors behind)

- **supabase** (CLI): 2.122.0 → 3.2.0 (1 major version behind)
- **typescript**: 6.0.3 → 7.0.2 (1 major version behind)

Minor/patch updates available (informational): astro 7.4.4 → 7.4.12, @astrojs/cloudflare 14.4.3 → 14.4.8, @astrojs/react 7.1.2 → 7.1.9, eslint, prettier, tailwindcss, wrangler and others.

## Test Suite

Test runner: not detected
Tests found: not applicable
Test execution: not attempted

⚠ No test runner detected. The agent cannot verify its own changes with unit tests.
Recommended: `npm install -D vitest` and add `"test": "vitest run"` to `package.json` scripts.

Partial coverage exists: `npm run smoke` (`scripts/smoke.mjs`) runs a smoke test against a built preview, and CI runs `astro check` (type check) and `eslint`.

## CI/CD

Provider: GitHub Actions
Configuration: .github/workflows/ci.yml

| Stage      | Status | Notes                                                        |
|------------|--------|--------------------------------------------------------------|
| Lint       | ✓      | `npm run lint` (eslint)                                      |
| Test       | ✗      | no unit test step; a smoke job runs against local Supabase   |
| Build      | ✓      | `npm run build`                                              |
| Type check | ✓      | `npx astro check`                                            |
| Security   | ✗      | not configured (no audit step, no Dependabot/CodeQL)         |

⚠ The workflow triggers on `push` / `pull_request` to branch `master`, but this repository's branch is `main`. As configured, CI will not run on pushes or pull requests to `main`.

## Configuration

### High severity

None. `tsconfig.json` extends `astro/tsconfigs/strict`, `.gitignore` is present.

### Medium severity

None. ESLint (`eslint.config.js`) and Prettier (`.prettierrc.json`) are configured; husky is installed.

### Low severity

- **.editorconfig** — consistent formatting across editors. Fix: add a basic `.editorconfig` (indent, charset, final newline).

Present: `.gitignore`, `.env.example`, `.nvmrc`, `tsconfig.json` (strict), `AGENTS.md`, `CLAUDE.md`.

## Stack Assessment Cross-Reference

No stack-assessment.md found. Run /10x-stack-assess for quality-gate analysis.

## Recommended Fixes

### Fix before agent work (Category A)

### 1. Update Astro and the Astro integrations

**Impact**: Most HIGH advisories sit in `astro`, `@astrojs/*` and their build-tool dependencies (vite etc.). An agent building features on top of them inherits the exposure.
**Severity**: high
**Effort**: moderate (15–30 min)
**Fix**:

```bash
npx @astrojs/upgrade
npm audit
```

Do not use `npm audit fix --force`: it proposes downgrades to older majors (e.g. `@astrojs/cloudflare@12`).

### 2. Update lint tooling and re-audit

**Impact**: `eslint-plugin-astro`, `lint-staged` and `typescript-eslint` carry HIGH/MODERATE findings; they run in every commit and in CI.
**Severity**: high
**Effort**: quick (< 5 min)
**Fix**:

```bash
npm update eslint typescript-eslint prettier lint-staged eslint-plugin-astro
npm audit
```

Check the remaining output after each step; findings that stay are advisory-only and can be accepted consciously.

### 3. Add a unit test runner

**Impact**: Without tests the agent can only verify changes through lint, type check and the smoke script, so regressions in logic (e.g. the flashcard generation flow) go unnoticed.
**Severity**: high
**Effort**: moderate (15–30 min)
**Fix**:

```bash
npm install -D vitest
# add to package.json scripts: "test": "vitest run"
```

Then add one test for a pure function in `src/lib/` and add `npm test` to the `ci` job.

### 4. Fix the CI branch trigger

**Impact**: The workflow listens on `master`, the repository uses `main`, so CI never runs. Agent changes would be merged with no automatic checks.
**Severity**: high
**Effort**: quick (< 5 min)
**Fix**: in `.github/workflows/ci.yml` change both `branches: [master]` to `branches: [main]`.

### 5. Add a dependency audit step to CI

**Impact**: New advisories (like the 18 HIGH that appeared since scaffolding) would go unnoticed.
**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**: add `- run: npm audit --audit-level=high` to the `ci` job (or enable Dependabot via `.github/dependabot.yml`).

### 6. Add `.editorconfig`

**Impact**: Minor; keeps agent and editor formatting aligned.
**Severity**: low
**Effort**: quick (< 5 min)
**Fix**: create `.editorconfig` with `root = true`, `indent_style = space`, `indent_size = 2`, `insert_final_newline = true`.

### Addressed in upcoming lessons (Category B)

### Agent instruction files and rules

`AGENTS.md` and `CLAUDE.md` already exist (from the starter and your own `CLAUDE.md`; the starter's version is saved as `CLAUDE.md.scaffold`).

**Lesson**: [Agent Onboarding: Agents.md, AI Rules i feedback loops (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4)
**What you'll do there**: review and shape these files so the agent knows your project conventions.

### Deployment configuration

`wrangler.jsonc` exists for Cloudflare, but no deployment pipeline has been verified yet.

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: choose the platform deliberately and run the first deploy.

## Summary

Health status: needs-attention

The project is in a good structural shape: lockfile, strict TypeScript, ESLint/Prettier, a CI workflow with lint, type check and build, and a smoke test. The main gaps are 18 HIGH advisories concentrated in Astro and its tooling, no unit test runner, and a CI workflow that listens on `master` while the repository uses `main`.

Next step: address fixes 1–4 above, then proceed to agent onboarding.
