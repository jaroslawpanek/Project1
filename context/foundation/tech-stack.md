---
starter_id: 10x-astro-starter
package_manager: npm
project_name: flashgen
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
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
---

## Why this stack

Solo builder shipping the FlashGen MVP (paste text, generate flashcard proposals with an LLM, review and save per-user) in 8 after-hours weeks, with auth, per-user persistent storage and an AI generation step in scope. Astro + React + TypeScript + Tailwind on Supabase and Cloudflare is the recommended default for (web, js) and clears all four agent-friendly gates. It ships auth, a Postgres database and edge deploy out of the box, and Supabase row-level security maps directly onto the guardrail that one user's flashcards are never visible to another. Deployment target is Cloudflare Workers (see infrastructure.md; not Pages); CI runs on GitHub Actions with auto-deploy on merge. Bootstrapper confidence is first-class, so expect occasional hiccups. The edge runtime limits long-running tasks, so the LLM call should stay a single short request.
