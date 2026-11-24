# Plan: integracja i pierwsze wdrożenie FlashGen na Cloudflare Workers

Legenda: `[ ]` do zrobienia · `[x]` zrobione · 👤 = bramka ręczna (człowiek) · 🤖 = agent · 🛑 = wymaga zatwierdzenia przed produkcją

## Kontekst

`context/foundation/infrastructure.md` rekomenduje **Cloudflare Workers (Workers + static assets)**, nie Pages. Adapter `@astrojs/cloudflare` ^14.4.3 i `wrangler.jsonc` już istnieją, więc wdrożenie to głównie konfiguracja, sekrety i weryfikacja. Plan zapisać po zatwierdzeniu w `context/deployment/deploy-plan.md` (wymóg lekcji; ścieżka spoza `context/archive/`).

### Stan zastany na początku (zdjęcie historyczne, NIE aktualny stan)
Poniższe punkty opisywały repo przed pracą; większość została już rozwiązana w Etapach 0–6 (nazwa `flashgen`, `LLM_API_KEY`, trasy API, `deployment_target`).
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
| Dostawca LLM | generowanie fiszek (1 żądanie, przy awarii do 2) | Google Gemini; klucz `LLM_API_KEY` jako sekret Workera, limit wydatków w AI Studio |
| GitHub Actions | CI/CD | sekrety repo, job deploy (poza zakresem infra-research, tu minimalnie) |

## Etapy

### Etap 0 — Spójność kontraktów (🤖, bez zmian na platformie)
- [x] Zmienić `name` w `wrangler.jsonc` i `package.json` na `flashgen` (przed pierwszym deployem; zmiana nazwy później = nowy Worker, osierocony stary).
- [x] Poprawić `deployment_target` w `tech-stack.md` na Workers (albo odnotować rozbieżność) — żeby agent nie użył `wrangler pages`.
- [x] Dopisać do `CLAUDE.md` regułę: wdrażamy **tylko** `npx wrangler deploy`; `wrangler pages ...` zabronione (ryzyko z rejestru, M/H).
- [x] Dodać `SUPABASE_*` i przyszły `LLM_API_KEY` do `.env.example`; dodać `.dev.vars` do `.gitignore` (sprawdzić, czy już jest).
- [x] Sprawdzić `site` w `astro.config.mjs` (`@astrojs/sitemap` wymaga go; ustawić po poznaniu domeny `*.workers.dev`). Ustawione: `https://flashgen.jaroslaw-panek.workers.dev`.

### Etap 1 — Konto i dostęp Cloudflare (👤 + 🤖)
- [x] 👤 Założyć/zalogować konto Cloudflare, zanotować subdomenę `workers.dev`. Subdomena: `jaroslaw-panek.workers.dev`.
- [x] 👤 `npx wrangler login` (lokalnie) **albo** utworzyć token API ograniczony do jednego projektu Workers (Workers Scripts: Edit; bez DNS, bez rozliczeń) — trzymać w zmiennej env, nie w repo ani `.mcp.json`.
- [x] 🤖 `npx wrangler whoami` — potwierdzić konto i zakres. Zalogowano OAuth, Account ID `632700f7568b5f638dc54432c2929cda`.

### Etap 2 — Supabase produkcyjny (👤 + 🤖)
- [x] 👤 Utworzyć projekt prod (region możliwie blisko użytkownika; Workers i tak idą z edge'u — ograniczyć liczbę zapytań). Projekt: `qrqrhonibcyfzhxsjqfn`.
- [x] 🤖 Przygotować migracje w `supabase/migrations/` dla tabeli fiszek z **RLS** i politykami osobno per operacja/rola (guardrail PRD: fiszki jednego użytkownika niewidoczne dla innych). Gotowe: `20261123120000_create_flashcards.sql` (przetestowana lokalnie: `scripts/test-rls.mjs`, 13/13).
- [x] 🛑 Zastosować migracje na prod (`supabase db push`) po przeglądzie; wiadomo, że rollback Workera ich nie cofa — każda migracja musi być wstecznie kompatybilna z poprzednią wersją Workera. Zastosowano 2026-11-23 (`db push --linked`), `migration list` potwierdza local = remote.
- [x] 👤 Auth → URL Configuration: **Site URL = adres prod** (nie localhost, bez wildcardów); dodać dokładne Redirect URLs. Źródło: [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). Ustawione i sprawdzone na zrzucie: Site URL i jedyny Redirect URL = `https://flashgen.jaroslaw-panek.workers.dev`.
- [x] 🛑 Migracja `20261123180000_grant_flashcards_privileges.sql`: hostowany Supabase nie nadaje automatycznie uprawnień Data API do nowych tabel `public`, więc po pierwszym teście na prod zapis i lista padały (`permission denied`). Dodano `grant select, insert, update, delete … to authenticated`, zastosowano na prod i zweryfikowano w `information_schema.role_table_grants`. Wpis w `context/foundation/lessons.md`.
- [ ] 🤖 Zdecydować o `emailRedirectTo` w `signup.ts` i trasie `/auth/callback` z `exchangeCodeForSession` (dziś link z maila trafia na Site URL, użytkownik potwierdzony, ale niezalogowany — akceptowalne w MVP, ale świadomie).
- [x] 👤 Zdecydować, czy potwierdzenie e-mail jest włączone na prod (wpływa na smoke, patrz Etap 6). **Włączone** („Confirm email” zaznaczone). Skutek: po rejestracji na prod użytkownik musi kliknąć link z maila, więc automatyczny `npm run smoke` na prod nie przejdzie kroków logowania po rejestracji; pełną ścieżkę testować ręcznie na prawdziwym adresie albo na osobnym projekcie staging.

### Etap 3 — Integracja LLM (🤖 kod + 👤 klucz)
- [x] 👤 Wybrać dostawcę/model i założyć klucz z limitem wydatków (PRD: ochrona budżetu). Limit wydatków w Google AI Studio ustawiony (potwierdził użytkownik). Dostawca: Google Gemini. Aktualnie `gemini-3.5-flash-lite` (główny) i `gemini-3.5-flash` (zapasowy); `gemini-2.5-flash` wycofany, `gemini-3.8-flash` niedostępny dla klucza. Klucz jest w `.dev.vars` i jako sekret Workera.
- [x] 🤖 Dodać `LLM_API_KEY` (secret, server) do `env.schema` w `astro.config.mjs`.
- [x] 🤖 Trasa `src/pages/api/...` (`POST`, `prerender = false`, walidacja zod): limit 5000 znaków (NFR), jedno żądanie do LLM (przy awarii do dwóch, patrz niżej), timeout (`AbortSignal.timeout`), parsowanie odpowiedzi z walidacją zod. Gotowe: `POST /api/flashcards/generate`, `POST /api/flashcards` (zapis). Gemini bywa przeciążony (503, 20–74 s), więc serwis próbuje najpierw `gemini-3.5-flash-lite` (1–6 s, timeout 20 s), a przy 429/5xx/timeout/błędzie sieci jeden raz zapasowego `gemini-3.5-flash` (zwykle 20–30 s, timeout 40 s); najgorszy przypadek ok. 60 s. Każda nieudana próba loguje model i powód (`console.error`, widoczne w `wrangler tail`). Jakość fiszek z `lite` oceniona tylko na jednej próbce (dobra); porównanie z `flash` nie wykonane. Do 2 żądań do LLM na wywołanie zamiast 1; logika sprawdzona na atrapie `fetch` (5 scenariuszy) i na prod. Przy 503 obu modeli naraz użytkownik dostaje komunikat i ponawia ręcznie — **otwarta decyzja**: trzecia próba / inny dostawca / bez zmian.
- [x] 🤖 Zachować tekst po stronie klienta i umożliwić ponowienie po błędzie (guardrail PRD, ryzyko H z rejestru). Stan w `useFlashcardGenerator`; UI przeklikane w Chrome na lokalnym Supabase i na prod; scenariusz błędu LLM (503 Gemini) zaobserwowany na prod: komunikat „Nie udało się wygenerować fiszek” i tekst zostaje w polu.
- [ ] 🤖 Zadbać o budżet CPU 10 ms (Free) — zmierzone na prod wartości 8–79 ms na żądanie (patrz Etap 6 i 7), do weryfikacji limitu planu: bez ciężkiego parsowania w Workerze; czas oczekiwania na `fetch` nie liczy się jako CPU, ale parsowanie/serializacja tak.
- [x] 🤖 Limit subrequestów Free = 50/wywołanie: policzyć (getUser + zapisy + LLM) — z zapasem. Generowanie: getUser + do 2 LLM = max 3; zapis: getUser + 1 insert = 2.

### Etap 4 — Sekrety i zmienne (👤 + 🤖)
- [x] 🤖 Lokalnie: `.dev.vars` z `SUPABASE_URL`, `SUPABASE_KEY`, `LLM_API_KEY` (nie commitować). Plik istnieje, jest w `.gitignore`, zawiera wartości produkcyjne Supabase i klucz Gemini.
- [x] 👤 `npx wrangler secret put SUPABASE_URL`, `SUPABASE_KEY`, `LLM_API_KEY` (wartości wpisuje człowiek; agent nie widzi sekretów). Wgrane przez `wrangler secret bulk .dev.vars` (2026-11-23).
- [x] 🤖 `npx wrangler secret list` — potwierdzić nazwy w docelowym Workerze (dopiero po utworzeniu Workera pierwszym deployem; patrz uwaga niżej). Potwierdzono: `LLM_API_KEY`, `SUPABASE_KEY`, `SUPABASE_URL` (`secret_text`).
- [ ] 🤖 Zbudować z sekretami w środowisku builda (CI już przekazuje `SUPABASE_*` do `npm run build`). Dotyczy CI, odłożone do Etapu 8; lokalnie build działa z `.dev.vars`.
- [ ] GitHub Secrets (Etap 8, nieużywane przy ręcznym deployu): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_KEY`.

**Uwaga (rozwiązana — nie wystąpiła na prod):** otwarty issue [withastro/astro#16790](https://github.com/withastro/astro/issues/16790) zgłasza, że `astro:env/server` nie widzi zmiennych runtime'owych Workera (widoczne przez `cloudflare:workers`). Projekt używa `astro:env/server`. Plan: po pierwszym deployu sprawdzić, czy `/auth/signin` faktycznie działa na prod. Jeśli nie — w `src/lib/supabase.ts` (i `config-status.ts`) przełączyć odczyt na `import { env } from "cloudflare:workers"`. Weryfikacja na prod (2026-11-23): sekrety z `astro:env/server` są widoczne w runtime, obejście `cloudflare:workers` zbędne. Kolejność, która zadziałała: `wrangler secret bulk .dev.vars` utworzył pustego Workera z samymi sekretami, potem pierwszy deploy z kodem.

### Etap 5 — Weryfikacja przed produkcją (🤖, bez wpływu na platformę)
- [x] `npm ci && npx astro sync && npm run lint && npx astro check` — `astro sync` i `astro check`: 0 błędów (`npm ci` nie uruchamiano). Lint: poza ~1000 błędów `␍` (CRLF z Windowsa, istniejące w całym repo) brak błędów; do rozważenia `.gitattributes` z `eol=lf`.
- [x] `npm run build` (z `SUPABASE_*`) — przechodzi.
- [x] `npx wrangler deploy --dry-run` — paczka 1361 KiB (gzip 477 KiB, limit Free 3 MiB). Bindingi po zmianach: `ASSETS`, `IMAGES` (bez KV `SESSION`).
- [x] `npm run preview` (workerd) + `npm run smoke` na lokalnym Supabase — 8/8. Uwaga: preview czyta sekrety z `dist/server/.dev.vars` (kopia z buildu), nie z bieżącego `.dev.vars`; przy buildzie z prod-wartościami smoke trafi w prod Supabase. Sekrety `astro:env/server` w workerd odczytane poprawnie (wpływ na #16790 sprawdzić dopiero na wdrożonym Workerze).
- [x] Zdecydować o KV `SESSION`: **wyłączone** (`session: false` w `astro.config.mjs`; sesje Astro nieużywane). Oryginalna uwaga: adapter auto-provisionuje namespace przy deployu ([docs adaptera](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)); sesje Astro nie są używane (auth to cookies Supabase) -> ustawić `session: false` / `cloudflare({ ... })` zgodnie z dokumentacją adaptera, aby nie tworzyć zbędnego zasobu.

### Etap 6 — Pierwsze wdrożenie 🛑 (wymaga zatwierdzenia człowieka)
- [x] 🛑 Zatwierdzenie planu i uruchomienia wdrożenia prod. Zatwierdził użytkownik; deploy uruchomił użytkownik (`! npm run build && npx wrangler deploy`), bo klasyfikator uprawnień zablokował agentowi `wrangler deploy` (zgodnie z regułą: deploy prod robi człowiek).
- [x] 🤖 `npm run build` → `npx wrangler deploy` (**nie** `wrangler pages deploy`). Wdrożono 2026-11-23, wersja `3661e6b9-25ec-4c65-8d2f-6b2257da7f8a`, start Workera 23 ms, bindingi `ASSETS`, `IMAGES`.
- [x] 🤖 Zanotować URL `https://flashgen.<subdomena>.workers.dev`, wpisać do Site URL w Supabase (Etap 2) i do `site` w `astro.config.mjs`. URL: `https://flashgen.jaroslaw-panek.workers.dev` (`site` już ustawione). Site URL w Supabase ustawiony (Etap 2).
- [x] 🤖 `npx wrangler deployments list --json` — zapisać ID wersji jako punkt rollbacku. Historia wersji: `738abd14-…` (pusty Worker z samymi sekretami — **nie nadaje się do rollbacku**), `3661e6b9-…` (pierwszy deploy z kodem), `c6109828-…` (fallback modelu), `2c8fbbde-5fa2-44c9-92f2-9ebd4cabd44c` (2026-11-23 19:05, poprzednia aktywna; ostatnia wersja bez usuwania fiszek), **`9c47d8e4-8b94-4f8a-a189-703e27f08d04` (aktywna, wdrożona 2026-11-24 przez człowieka; usuwanie fiszek, change `delete-flashcards`)**. Sensowny cel rollbacku: `c6109828-…` lub `3661e6b9-…`, bez migracji (rollback ich nie cofa).
- [x] 🤖 Weryfikacja read-only na prod: `/` 200; `/dashboard` bez sesji 302 `/auth/signin`; `POST /api/flashcards/generate` bez sesji 401; logowanie nieistniejącym użytkownikiem zwraca „Invalid login credentials” z Supabase, czyli sekrety `astro:env/server` są widoczne w runtime (issue #16790 nie wystąpił).
- [x] 🤖 Ostrzeżenie wranglera: `workers_dev` i Preview URLs są domyślnie włączone (brak w `wrangler.jsonc`). Ustawiono `workers_dev: true` i `preview_urls: false` w `wrangler.jsonc` (dry-run bez ostrzeżeń, wartości widoczne w `dist/server/wrangler.json`). Wdrożone w `c6109828-…`; kolejne deploye (`2c8fbbde-…`) nie zgłaszają już ostrzeżenia wranglera. Faktycznego braku Preview URLs nie sprawdzano w panelu.
- [x] 🤖 Ręcznie przejść ścieżkę: `/` → rejestracja → login → `/dashboard` → generowanie → zapis → "Moje fiszki". Przeszło na prod (wersja `2c8fbbde`, konto `jaroslaw.panek@gmail.com`; rejestracja i logowanie wykonał człowiek): generowanie 7 fiszek (200, ~1,3 s, bez wpisów o awarii modelu, czyli obsłużył go `flash-lite`), zapis `POST /api/flashcards` 201, „Moje fiszki” pokazuje 7 fiszek. Wcześniejsze próby: zapis padał bez `GRANT` (migracja `20261123180000`), a generowanie bywało blokowane przez 503 Gemini (oba modele naraz w jednym wywołaniu, widoczne w logach). Przy nieudanej próbie tekst zostaje w polu (sprawdzone). Wygenerowane fiszki z wcześniejszych prób nie zostały zapisane (zapis padał); do sprawdzenia przy kolejnym teście: izolacja RLS dwoma kontami.
- [x] 🤖 Smoke na prod — wykonany 2026-11-24 w trybie read-only (`SMOKE_READONLY=1 BASE_URL=https://flashgen.jaroslaw-panek.workers.dev npm run smoke`, 3/3: `/` 200, anonimowy `/dashboard` 302 → `/auth/signin`, `POST /api/flashcards/generate` bez sesji 401); lista użytkowników w Supabase Auth bez nowych kont. Pełny smoke z rejestracją i logowaniem nadal nie jest uruchamiany na prod (decyzja: tryb read-only zamiast projektu staging; change `verify-card-isolation`). Pierwotna uwaga: **Uwaga brzegowa:** smoke tworzy prawdziwe konta w prod Supabase i zakłada brak potwierdzenia e-mail; przy włączonym potwierdzeniu krok „signin accepts correct password” zawiedzie. Rozwiązanie: osobny projekt Supabase „staging” dla smoke, albo wariant smoke tylko-do-odczytu na prod (`/`, redirect `/dashboard`) i sprzątanie kont testowych.
- [x] 🤖 `npx wrangler tail --format json --status error` podczas testu — brak błędów CPU/subrequest. Tail bez filtra statusu (błędy modelu są obsłużone, więc wywołania kończą się `ok`): wszystkie wywołania `outcome: ok`, odpowiedzi 200/201, brak wyjątków. Zmierzone `cpuTime` z tail: `/dashboard` 79 ms (zimny start) i 33 ms, `POST /api/flashcards/generate` 8–17 ms, `POST /api/flashcards` 10 ms, `/dashboard/flashcards` 14 ms. Część wartości przekracza 10 ms z planu Free, a mimo to brak błędów 1102 — **zweryfikować w panelu Cloudflare, na jakim planie jest konto i jaki limit CPU obowiązuje** (Etap 7).

### Etap 7 — Operacje i przypadki brzegowe (🤖 + 👤)
- [ ] **Przekroczenie CPU 10 ms (Free):** pomiary z tail: 8–79 ms na żądanie (zimny `/dashboard` 79 ms), bez błędów 1102. 👤 sprawdzić w panelu Cloudflare plan konta i obowiązujący limit CPU; jeśli pojawią się 1102 → plan Paid (5 USD/mies.).
- [ ] **Opóźnienia edge→Supabase:** middleware robi `getUser()` na każdym żądaniu, także dla stron publicznych. Rozważyć wywołanie tylko dla tras chronionych i `/api`; rozważyć Smart Placement.
- [ ] **Rollback:** `npx wrangler rollback <VERSION_ID>`; pamiętać, że nie cofa migracji Supabase. 👤 rollback prod zatwierdza człowiek.
- [ ] **Logi:** Free = 3 dni retencji, 200k zdarzeń/dzień; wycena obserwowalności zmienia się od 2026-12-01 → 👤 sprawdzić nowy cennik w grudniu; ustawić przypomnienie.
- [x] **Awaria LLM/timeout:** na prod zaobserwowano realne 503 Gemini (oba modele naraz): komunikat dla użytkownika, tekst zostaje w polu, przyczyna widoczna w logach. Test z celowo złym kluczem nie był wykonywany.
- [ ] **Cookies/Origin:** logowanie i `POST` (wylogowanie, zapis fiszek) działają na HTTPS `workers.dev`, więc kontrola Origin nie blokuje. Nadal do sprawdzenia: flagi `Secure` i `SameSite` na HTTPS oraz kontrolę Origin Astro (POST formularzy) na domenie `workers.dev` i ewentualnej własnej domenie.
- [ ] **Sekret w złym środowisku:** nie używamy `CLOUDFLARE_ENV` na MVP; gdyby się pojawiło środowisko, sekrety i build muszą wskazywać to samo (środowisko wybiera się w czasie builda).
- [ ] **Wersje:** po aktualizacji zależności `npm run smoke` (reguła z `CLAUDE.md`); para Astro 7 + adapter 14 niepotwierdzona w docs — build i preview są dowodem.
- [ ] Dostęp agenta: tylko build, `deploy --dry-run`, odczyt logów; 👤 deploy prod, rotacja sekretów, usunięcie Workera/bazy.

### Etap 8 — CI/CD (opcjonalnie, osobny krok)
- [ ] Dodać job `deploy` do `ci.yml` na `push` do `main` (po przejściu `ci` i `smoke`) z `npx wrangler deploy` i sekretami z Etapu 4; środowisko GitHub z ręcznym zatwierdzeniem dla prod (🛑).
- [ ] Podgląd PR (`wrangler versions upload`) — poza zakresem MVP, odłożone.

## Pliki do zmiany (plan wyjściowy; faktyczne dodatki poniżej)
- `wrangler.jsonc`, `package.json` (nazwa), `astro.config.mjs` (`env.schema`, `site`, ewentualnie opcje adaptera/sesji), `.env.example`, `.gitignore`
- `src/lib/supabase.ts`, `src/lib/config-status.ts` (tylko jeśli #16790 się potwierdzi)
- `src/middleware.ts` (ograniczenie `getUser()` — opcjonalnie), `src/pages/api/auth/signup.ts` (`emailRedirectTo`, opcjonalnie)
- nowe: `src/lib/services/` (usługa LLM), trasa API generowania, `supabase/migrations/*`
- `.github/workflows/ci.yml` (Etap 8), `CLAUDE.md`, `context/foundation/tech-stack.md`
- wynik: `context/deployment/deploy-plan.md` (kopia zatwierdzonego planu)
- faktycznie dodane: `src/types.ts`, `src/lib/services/flashcard-generator.ts`, `src/pages/api/flashcards/{generate,index}.ts`, `src/components/FlashcardGenerator.tsx`, `src/components/hooks/useFlashcardGenerator.ts`, `src/pages/dashboard/flashcards.astro`, migracje `20261123120000_create_flashcards.sql` i `20261123180000_grant_flashcards_privileges.sql`, `scripts/test-rls.mjs`, `context/foundation/lessons.md`

## Weryfikacja końcowa
- [x] `https://flashgen.jaroslaw-panek.workers.dev/` zwraca 200; `/dashboard` bez sesji → 302 `/auth/signin` (sprawdzone na prod).
- [x] Pełna ścieżka US-01 działa na prod (✔ sprawdzone jednym kontem); fiszki widoczne tylko dla właściciela — **test dwoma kontami na prod wykonany 2026-11-24** (change `verify-card-isolation`): `RLS_TARGET=remote node scripts/test-rls.mjs` z dwoma potwierdzonymi kontami, wszystkie kontrole PASS (zapis, odczyt, cross-account update/delete, podszycie `user_id`, zmiana właściciela, anon, ograniczenia CHECK, `updated_at`), bez błędów sprzątania. W przeglądarce konto B (okno prywatne) nie widzi fiszek konta A w „Moje fiszki”. Po teście w tabeli `flashcards` brak wierszy `[rls-test …`, a testowa fiszka z kroku przeglądarkowego została usunięta ręcznie w panelu Supabase.
- [x] `wrangler tail` bez błędów (wszystkie wywołania `ok`); `wrangler deployments list` pokazuje aktywną wersję `9c47d8e4-…` (stan po wdrożeniu usuwania fiszek 2026-11-24; wcześniej `2c8fbbde-…`).
- [x] Usuwanie fiszek (FR-008, change `delete-flashcards`) działa na prod — wersja `9c47d8e4-8b94-4f8a-a189-703e27f08d04`, 2026-11-24. Smoke read-only na prod: 4/4 (`/` 200, anonimowy `/dashboard` 302 → `/auth/signin`, `POST /api/flashcards/generate` bez sesji 401, `DELETE /api/flashcards` bez sesji 401), bez nowych kont. Ręcznie na prod (potwierdził użytkownik): usunięcie pojedynczej fiszki z inline potwierdzeniem „Na pewno? Tak / Nie” oraz usunięcie zbiorcze zaznaczonych fiszek z potwierdzeniem; po teście brak kart testowych. Migracji nie było (polityka RLS i `GRANT delete` istniały i były sprawdzone na prod w change `verify-card-isolation`).
- [ ] Rollback przećwiczony (na dry-runie lub wersji testowej) i udokumentowany.

Źródła: [withastro/astro#16790](https://github.com/withastro/astro/issues/16790), [Astro: @astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/), [Cloudflare: Astro on Workers](https://developers.cloudflare.com/workers/frameworks/framework-guides/astro/), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
