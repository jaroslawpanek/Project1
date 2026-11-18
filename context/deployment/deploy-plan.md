# Plan: integracja i pierwsze wdrożenie FlashGen na Cloudflare Workers

Legenda: `[ ]` do zrobienia · `[x]` zrobione · 👤 = bramka ręczna (człowiek) · 🤖 = agent · 🛑 = wymaga zatwierdzenia przed produkcją

## Kontekst

`context/foundation/infrastructure.md` rekomenduje **Cloudflare Workers (Workers + static assets)**, nie Pages. Adapter `@astrojs/cloudflare` ^14.4.3 i `wrangler.jsonc` już istnieją, więc wdrożenie to głównie konfiguracja, sekrety i weryfikacja. Plan zapisać po zatwierdzeniu w `context/deployment/deploy-plan.md` (wymóg lekcji; ścieżka spoza `context/archive/`).

### Stan zastany (zweryfikowany w repo)
- `wrangler.jsonc`: `name` nadal `10x-astro-starter` (do zmiany na `flashgen`), `nodejs_compat`, `observability.enabled`, `assets` -> `./dist`.
- `package.json` `name` też `10x-astro-starter`.
- Sekrety w kodzie: tylko `SUPABASE_URL`, `SUPABASE_KEY` (`astro.config.mjs` `env.schema`, `src/lib/supabase.ts` przez `astro:env/server`). **Klucza LLM jeszcze nie ma** w schemacie, `.env.example` ani w kodzie (brak trasy generowania).
- `src/middleware.ts` woła `supabase.auth.getUser()` przy każdym żądaniu (sieciowy round-trip do Supabase).
- CI (`.github/workflows/ci.yml`): lint, check, build, smoke na lokalnym Supabase. **Brak joba deploy.**
- `scripts/smoke.mjs` tworzy konto `smoke-<ts>@example.com` i oczekuje natychmiastowego logowania po rejestracji.
- `tech-stack.md` ma `deployment_target: cloudflare-pages` — **niezgodne** z `infrastructure.md` (Workers).
- `signUp()` bez `emailRedirectTo`; brak trasy `/auth/callback`.

## Integracje zewnętrzne

| Integracja | Rola | Co trzeba ustawić |
|---|---|---|
| Cloudflare (Workers) | hosting SSR + assets | konto, `wrangler login`/token, nazwa Workera |
| Supabase (hosted) | auth + Postgres + RLS | projekt prod, URL/anon key, Site URL, Redirect URLs, migracje |
| Dostawca LLM | generowanie fiszek (jedno krótkie żądanie) | klucz API jako sekret; do wyboru dostawca/model |
| GitHub Actions | CI/CD | sekrety repo, job deploy (poza zakresem infra-research, tu minimalnie) |

## Etapy

### Etap 0 — Spójność kontraktów (🤖, bez zmian na platformie)
- [x] Zmienić `name` w `wrangler.jsonc` i `package.json` na `flashgen` (przed pierwszym deployem; zmiana nazwy później = nowy Worker, osierocony stary).
- [x] Poprawić `deployment_target` w `tech-stack.md` na Workers (albo odnotować rozbieżność) — żeby agent nie użył `wrangler pages`.
- [x] Dopisać do `CLAUDE.md` regułę: wdrażamy **tylko** `npx wrangler deploy`; `wrangler pages ...` zabronione (ryzyko z rejestru, M/H).
- [x] Dodać `SUPABASE_*` i przyszły `LLM_API_KEY` do `.env.example`; dodać `.dev.vars` do `.gitignore` (sprawdzić, czy już jest).
- [ ] Sprawdzić `site` w `astro.config.mjs` (`@astrojs/sitemap` wymaga go; ustawić po poznaniu domeny `*.workers.dev`).

### Etap 1 — Konto i dostęp Cloudflare (👤 + 🤖)
- [ ] 👤 Założyć/zalogować konto Cloudflare, zanotować subdomenę `workers.dev`.
- [ ] 👤 `npx wrangler login` (lokalnie) **albo** utworzyć token API ograniczony do jednego projektu Workers (Workers Scripts: Edit; bez DNS, bez rozliczeń) — trzymać w zmiennej env, nie w repo ani `.mcp.json`.
- [ ] 🤖 `npx wrangler whoami` — potwierdzić konto i zakres.

### Etap 2 — Supabase produkcyjny (👤 + 🤖)
- [ ] 👤 Utworzyć projekt prod (region możliwie blisko użytkownika; Workers i tak idą z edge'u — ograniczyć liczbę zapytań).
- [ ] 🤖 Przygotować migracje w `supabase/migrations/` dla tabeli fiszek z **RLS** i politykami osobno per operacja/rola (guardrail PRD: fiszki jednego użytkownika niewidoczne dla innych). Dziś w repo nie ma migracji.
- [ ] 🛑 Zastosować migracje na prod (`supabase db push`) po przeglądzie; wiadomo, że rollback Workera ich nie cofa — każda migracja musi być wstecznie kompatybilna z poprzednią wersją Workera.
- [ ] 👤 Auth → URL Configuration: **Site URL = adres prod** (nie localhost, bez wildcardów); dodać dokładne Redirect URLs. Źródło: [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
- [ ] 🤖 Zdecydować o `emailRedirectTo` w `signup.ts` i trasie `/auth/callback` z `exchangeCodeForSession` (dziś link z maila trafia na Site URL, użytkownik potwierdzony, ale niezalogowany — akceptowalne w MVP, ale świadomie).
- [ ] 👤 Zdecydować, czy potwierdzenie e-mail jest włączone na prod (wpływa na smoke, patrz Etap 6).

### Etap 3 — Integracja LLM (🤖 kod + 👤 klucz)
- [ ] 👤 Wybrać dostawcę/model i założyć klucz z limitem wydatków (PRD: ochrona budżetu).
- [ ] 🤖 Dodać `LLM_API_KEY` (secret, server) do `env.schema` w `astro.config.mjs`.
- [ ] 🤖 Trasa `src/pages/api/...` (`POST`, `prerender = false`, walidacja zod): limit 5000 znaków (NFR), **jedno** żądanie do LLM, timeout (`AbortSignal.timeout`), parsowanie odpowiedzi z walidacją zod.
- [ ] 🤖 Zachować tekst po stronie klienta i umożliwić ponowienie po błędzie (guardrail PRD, ryzyko H z rejestru).
- [ ] 🤖 Zadbać o budżet CPU 10 ms (Free): bez ciężkiego parsowania w Workerze; czas oczekiwania na `fetch` nie liczy się jako CPU, ale parsowanie/serializacja tak.
- [ ] 🤖 Limit subrequestów Free = 50/wywołanie: policzyć (getUser + zapisy + LLM) — z zapasem.

### Etap 4 — Sekrety i zmienne (👤 + 🤖)
- [ ] 🤖 Lokalnie: `.dev.vars` z `SUPABASE_URL`, `SUPABASE_KEY`, `LLM_API_KEY` (nie commitować).
- [ ] 👤 `npx wrangler secret put SUPABASE_URL`, `SUPABASE_KEY`, `LLM_API_KEY` (wartości wpisuje człowiek; agent nie widzi sekretów).
- [ ] 🤖 `npx wrangler secret list` — potwierdzić nazwy w docelowym Workerze (dopiero po utworzeniu Workera pierwszym deployem; patrz uwaga niżej).
- [ ] 🤖 Zbudować z sekretami w środowisku builda (CI już przekazuje `SUPABASE_*` do `npm run build`).
- [ ] GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_KEY`.

**Uwaga (znana usterka, do zweryfikowania):** otwarty issue [withastro/astro#16790](https://github.com/withastro/astro/issues/16790) zgłasza, że `astro:env/server` nie widzi zmiennych runtime'owych Workera (widoczne przez `cloudflare:workers`). Projekt używa `astro:env/server`. Plan: po pierwszym deployu sprawdzić, czy `/auth/signin` faktycznie działa na prod. Jeśli nie — w `src/lib/supabase.ts` (i `config-status.ts`) przełączyć odczyt na `import { env } from "cloudflare:workers"`. Kolejność: pierwszy deploy bez sekretów utworzy Workera, więc `secret put` robić po nim (albo użyć `wrangler secret put` — tworzy Workera, jeśli go brak; potwierdzić na `--help`).

### Etap 5 — Weryfikacja przed produkcją (🤖, bez wpływu na platformę)
- [ ] `npm ci && npx astro sync && npm run lint && npx astro check`
- [ ] `npm run build` (z `SUPABASE_*`)
- [ ] `npx wrangler deploy --dry-run` — sprawdzić rozmiar paczki i wykryte bindingi (czy dodaje KV `SESSION`).
- [ ] `npm run preview` (workerd) + `BASE_URL=http://localhost:4321 npm run smoke` na lokalnym Supabase.
- [ ] Zdecydować o KV `SESSION`: adapter auto-provisionuje namespace przy deployu ([docs adaptera](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)); sesje Astro nie są używane (auth to cookies Supabase) -> ustawić `session: false` / `cloudflare({ ... })` zgodnie z dokumentacją adaptera, aby nie tworzyć zbędnego zasobu.

### Etap 6 — Pierwsze wdrożenie 🛑 (wymaga zatwierdzenia człowieka)
- [ ] 🛑 Zatwierdzenie planu i uruchomienia wdrożenia prod.
- [ ] 🤖 `npm run build` → `npx wrangler deploy` (**nie** `wrangler pages deploy`).
- [ ] 🤖 Zanotować URL `https://flashgen.<subdomena>.workers.dev`, wpisać do Site URL w Supabase (Etap 2) i do `site` w `astro.config.mjs`.
- [ ] 🤖 `npx wrangler deployments list --json` — zapisać ID wersji jako punkt rollbacku.
- [ ] 🤖 Ręcznie przejść ścieżkę: `/` → rejestracja → login → `/dashboard` → generowanie → zapis → "Moje fiszki".
- [ ] 🤖 Smoke na prod: `BASE_URL=<adres> npm run smoke`. **Uwaga brzegowa:** smoke tworzy prawdziwe konta w prod Supabase i zakłada brak potwierdzenia e-mail; przy włączonym potwierdzeniu krok „signin accepts correct password” zawiedzie. Rozwiązanie: osobny projekt Supabase „staging” dla smoke, albo wariant smoke tylko-do-odczytu na prod (`/`, redirect `/dashboard`) i sprzątanie kont testowych.
- [ ] 🤖 `npx wrangler tail --format json --status error` podczas testu — brak błędów CPU/subrequest.

### Etap 7 — Operacje i przypadki brzegowe (🤖 + 👤)
- [ ] **Przekroczenie CPU 10 ms (Free):** po wdrożeniu zmierzyć w Workers Logs/metrykach; jeśli błędy 1102 → plan Paid (5 USD/mies.). 👤 decyzja.
- [ ] **Opóźnienia edge→Supabase:** middleware robi `getUser()` na każdym żądaniu, także dla stron publicznych. Rozważyć wywołanie tylko dla tras chronionych i `/api`; rozważyć Smart Placement.
- [ ] **Rollback:** `npx wrangler rollback <VERSION_ID>`; pamiętać, że nie cofa migracji Supabase. 👤 rollback prod zatwierdza człowiek.
- [ ] **Logi:** Free = 3 dni retencji, 200k zdarzeń/dzień; wycena obserwowalności zmienia się od 2026-12-01 → 👤 sprawdzić nowy cennik w grudniu; ustawić przypomnienie.
- [ ] **Awaria LLM/timeout:** test ręczny — wymusić błąd (zły klucz) i potwierdzić zachowanie wklejonego tekstu.
- [ ] **Cookies/Origin:** sprawdzić `Secure` i `SameSite` na HTTPS oraz kontrolę Origin Astro (POST formularzy) na domenie `workers.dev` i ewentualnej własnej domenie.
- [ ] **Sekret w złym środowisku:** nie używamy `CLOUDFLARE_ENV` na MVP; gdyby się pojawiło środowisko, sekrety i build muszą wskazywać to samo (środowisko wybiera się w czasie builda).
- [ ] **Wersje:** po aktualizacji zależności `npm run smoke` (reguła z `CLAUDE.md`); para Astro 7 + adapter 14 niepotwierdzona w docs — build i preview są dowodem.
- [ ] Dostęp agenta: tylko build, `deploy --dry-run`, odczyt logów; 👤 deploy prod, rotacja sekretów, usunięcie Workera/bazy.

### Etap 8 — CI/CD (opcjonalnie, osobny krok)
- [ ] Dodać job `deploy` do `ci.yml` na `push` do `main` (po przejściu `ci` i `smoke`) z `npx wrangler deploy` i sekretami z Etapu 4; środowisko GitHub z ręcznym zatwierdzeniem dla prod (🛑).
- [ ] Podgląd PR (`wrangler versions upload`) — poza zakresem MVP, odłożone.

## Pliki do zmiany
- `wrangler.jsonc`, `package.json` (nazwa), `astro.config.mjs` (`env.schema`, `site`, ewentualnie opcje adaptera/sesji), `.env.example`, `.gitignore`
- `src/lib/supabase.ts`, `src/lib/config-status.ts` (tylko jeśli #16790 się potwierdzi)
- `src/middleware.ts` (ograniczenie `getUser()` — opcjonalnie), `src/pages/api/auth/signup.ts` (`emailRedirectTo`, opcjonalnie)
- nowe: `src/lib/services/` (usługa LLM), trasa API generowania, `supabase/migrations/*`
- `.github/workflows/ci.yml` (Etap 8), `CLAUDE.md`, `context/foundation/tech-stack.md`
- wynik: `context/deployment/deploy-plan.md` (kopia zatwierdzonego planu)

## Weryfikacja końcowa
- [ ] `https://flashgen.<sub>.workers.dev/` zwraca 200; `/dashboard` bez sesji → 302 `/auth/signin`.
- [ ] Pełna ścieżka US-01 działa na prod; fiszki widoczne tylko dla właściciela (test dwoma kontami → RLS).
- [ ] `wrangler tail` bez błędów; `wrangler deployments list` pokazuje aktywną wersję.
- [ ] Rollback przećwiczony (na dry-runie lub wersji testowej) i udokumentowany.

Źródła: [withastro/astro#16790](https://github.com/withastro/astro/issues/16790), [Astro: @astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/), [Cloudflare: Astro on Workers](https://developers.cloudflare.com/workers/frameworks/framework-guides/astro/), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
