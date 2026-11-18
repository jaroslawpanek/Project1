---
project: flashgen
researched_at: 2026-11-18
recommended_platform: Cloudflare Workers (Workers + static assets)
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7 (SSR) + React 19
  runtime: Cloudflare Workers (workerd), adapter @astrojs/cloudflare 14.x
---

## Recommendation

**Deploy on Cloudflare Workers (Workers with static assets), not Cloudflare Pages.**

Projekt ma już adapter `@astrojs/cloudflare` i `wrangler.jsonc` (z `nodejs_compat` i włączonymi logami), więc wdrożenie nie wymaga zmiany kodu ani adaptera. Przy małej skali z PRD (10k–100k żądań/mies.) mieści się w darmowym planie, a pętla operacyjna (`wrangler deploy`, `rollback`, `tail`) działa w całości z CLI. Wagi z wywiadu: minimalny koszt, brak znajomości platform, jeden region, współlokalizacja bez znaczenia (dane w zewnętrznym Supabase).

Odpowiedź „nie wiem” na pytanie o trwałe połączenia potraktowano jako „nie” (PRD opisuje wyłącznie żądanie/odpowiedź). Jeśli to się zmieni, trzeba będzie użyć Durable Objects albo zmienić platformę.

## Platform Comparison

Sprawdzono 2026-11-18 na podstawie oficjalnej dokumentacji. Pozycje oznaczone „niezweryfikowane” nie zostały potwierdzone na pobranych stronach.

| Platforma | CLI-first | Managed | Dokumentacja dla agentów | Stabilne API deployu | MCP / integracja | Koszt przy 10k–100k żądań/mies. |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass (status niepotwierdzony) | 0 USD (Free), 5 USD (Paid) |
| Vercel | Pass | Pass | Pass | Partial | Pass | 0 USD (Hobby, tylko niekomercyjnie), około 20 USD (Pro) |
| Netlify | Partial | Pass | Pass | Partial | Pass | 0 USD (Free, limit 300 kredytów), 9 USD (Personal) |
| Fly.io | Pass | Partial | Pass | Pass | Partial | około 0–4 USD (szacunek) |
| Railway | Partial | Pass | Pass | Partial | Partial | około 5–8 USD (szacunek) |
| Render | Partial | Pass | Pass | Partial | Pass | około 7 USD (Starter) |

Uzasadnienie ocen:
- **Cloudflare**: `wrangler deploy`, `wrangler rollback [VERSION_ID]`, `wrangler tail --format json`, `llms.txt` w dokumentacji, zdalny serwer MCP (`mcp.cloudflare.com`). Flagi `deploy --assets` (beta) i podkomendy `wrangler auth` (experimental) nie są potrzebne w rutynowej pracy.
- **Vercel**: adapter `@astrojs/vercel` 11.x pasuje do Astro 7, dokumentacja jest dostępna jako markdown, MCP działa przez OAuth. Rollback CLI jest w publicznej becie, a Hobby jest tylko do użytku osobistego/niekomercyjnego; po przekroczeniu limitów wdrożenie jest wstrzymywane (503) na około 30 dni.
- **Netlify**: adapter `@astrojs/netlify` 8.x pasuje do Astro 7, `llms.txt` dostępny, zdalny MCP zalecany w dokumentacji. Komendy CLI dla rollbacku i logów funkcji nie zostały potwierdzone (niezweryfikowane). Funkcje synchroniczne mają limit 60 s.
- **Fly.io**: wymaga Dockerfile i adaptera Node. Rollback przez `fly deploy --image <ref>` (brak osobnej komendy), brak stałego darmowego planu, status MCP niepotwierdzony.
- **Railway**: dobre CLI (`railway up`, `logs`), ale rollback tylko z panelu; status zdalnego MCP niepotwierdzony; około 5–8 USD miesięcznie (szacunek agenta).
- **Render**: bardzo dobra dokumentacja (`.md`, `llms-full.txt`), ale rollback tylko z panelu lub API, a darmowy plan usypia usługę (zimny start około 1 minuty) i dokumentacja odradza go do produkcji.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Najmniejsza zmiana względem obecnego projektu, pełna pętla operacyjna w CLI, darmowy plan wystarczający dla skali z PRD. Ryzyka opisano poniżej.

#### 2. Vercel

Drugi wybór (runner-up). Najlepszy DX i potwierdzony adapter dla Astro 7. Luka względem rekomendacji: konieczność zmiany adaptera i konfiguracji, licencja Hobby tylko niekomercyjna, rollback w becie, 1 godzina logów na Hobby.

#### 3. Netlify

Trzeci wybór. Darmowy plan i adapter pasujący do Astro 7. Luka: niepotwierdzone komendy CLI dla rollbacku i logów oraz zmiana adaptera.

Fly.io znalazło się tuż za podium: wymaga Dockerfile i adaptera Node, a z zewnętrznym Supabase wprowadza dodatkowy przeskok między dostawcami.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. Darmowy plan daje 10 ms CPU na żądanie. Render SSR Reacta, middleware z Supabase i parsowanie odpowiedzi LLM mogą to przekroczyć, a wtedy potrzebny jest plan Paid (5 USD/mies.).
2. Workers działają na edge, a Supabase ma jeden region. Każde żądanie (auth, baza, LLM) to kilka podróży przez sieć, więc korzyść z edge’u jest nikła, a opóźnienia mogą wzrosnąć.
3. Dokumentacja adaptera pobrana podczas badania opisuje Astro 6; para Astro 7 + `@astrojs/cloudflare` 14.x nie jest potwierdzona w dokumentacji. Adapter v13 usunął `Astro.locals.runtime`, więc starsze przykłady są błędne.
4. workerd to nie Node: wymaga flagi `nodejs_compat`, nie obsługuje CommonJS, a błędy Wranglera są domyślnie zminifikowane, co utrudnia debugowanie.
5. Komendy Pages i Workers nie są wymienne (`wrangler pages deploy` vs `wrangler deploy`), a starsze tutoriale opisują Pages.

### Pre-Mortem — How This Could Fail

Sześć miesięcy później widok „Moje fiszki” ładował się wolno: trzy sekwencyjne zapytania do Supabase z edge’u dawały po kilkaset milisekund. Na darmowym planie część żądań z renderem SSR kończyła się błędem przekroczenia CPU, a użytkownik widział biały ekran bez wskazówki. Logi trzymane 3 dni znikały, zanim ktoś zbadał zgłoszenie. Agent, kierując się starym tutorialem, użył `wrangler pages deploy`, co wdrożyło projekt w złe miejsce, a zmiana wyceny obserwowalności sprawiła, że rachunek przestał być przewidywalny. Klucz do LLM ustawiono w złym środowisku, więc generowanie padało tylko na produkcji, a przy pierwszym błędzie wklejony tekst nie był zachowany, co łamało gwarancję z PRD. Zespół stracił tygodnie na diagnozę zamiast na funkcje.

### Unknown Unknowns

- Adapter sam tworzy namespace KV o nazwie `SESSION` dla sesji; można go wyłączyć (`session: false`) albo zostawić świadomie.
- Środowiska wybiera się w czasie builda (`CLOUDFLARE_ENV=x astro build && wrangler deploy`), a nie w czasie wdrożenia.
- Wycena obserwowalności Cloudflare zmienia się od 2026-12-01; retencja logów na Free to 3 dni, na Paid 7 dni.
- Od adaptera v13 `astro dev` i `astro preview` działają na workerd, więc osobne `wrangler dev` jest zbędne, a instrukcje z „Getting Started” sprzed v13 mogą wprowadzać w błąd.
- Limit subrequestów na Free to 50 na wywołanie; przy jednym wywołaniu LLM i kilku zapytaniach do Supabase wystarcza, ale trzeba to pilnować.

Decyzja użytkownika po kontroli: kontynuować z Cloudflare Workers, ryzyka odnotowane w rejestrze.

## Operational Story

- **Preview deploys**: nie skonfigurowano. Dla Workers dostępne są `wrangler versions upload` i `versions deploy` (stopniowe wdrażanie). Preview per PR nie jest częścią tego badania i wymaga osobnej konfiguracji w CI.
- **Secrets**: sekrety runtime ustawiane przez `wrangler secret put` (m.in. `SUPABASE_URL`, `SUPABASE_KEY`, klucz API LLM); sekrety CI w GitHub Secrets. Token API Cloudflare ma być ograniczony zakresem do jednego projektu Workers (bez DNS i rozliczeń) i trzymany w zmiennej środowiskowej, nie w repozytorium.
- **Rollback**: `wrangler rollback [VERSION_ID]` działa natychmiast; historia przez `wrangler deployments list --json` (ostatnie 10 wdrożeń). Rollback nie cofa migracji bazy danych w Supabase.
- **Approval**: człowiek zatwierdza wdrożenie na produkcję, rotację głównego sekretu, usunięcie projektu lub bazy. Agent może samodzielnie uruchamiać build, `wrangler deploy --dry-run` i odczyt logów.
- **Logs**: `wrangler tail --format json` (z filtrem `--status`); Workers Logs włączone w `wrangler.jsonc` (`observability.enabled`). Free: 200k zdarzeń/dzień, retencja 3 dni.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Przekroczenie 10 ms CPU/żądanie na planie Free | Devil's advocate | M | M | Mierzyć czas CPU po pierwszym wdrożeniu; w razie błędów przejść na Paid (5 USD/mies.) |
| Opóźnienia z powodu wielu zapytań do Supabase z edge’u | Devil's advocate | M | M | Ograniczyć liczbę zapytań na żądanie; rozważyć Smart Placement i region Supabase blisko użytkowników |
| Niepotwierdzona zgodność Astro 7 z adapterem 14.x w dokumentacji | Devil's advocate / Unknown unknowns | L | M | Projekt już buduje się z tym zestawem; uruchomić `npm run build` i `npm run smoke` przed wdrożeniem |
| Różnice workerd vs Node (`nodejs_compat`, brak CommonJS) | Devil's advocate | M | M | Zostawić `nodejs_compat`; testować w `astro preview` (workerd) przed deployem |
| Pomylenie komend Pages i Workers | Pre-mortem | M | H | W `CLAUDE.md`/planie wdrożenia zapisać wyłącznie `wrangler deploy`; nie używać `wrangler pages` |
| Krótka retencja logów (3 dni na Free) i zmiana wyceny od 2026-12-01 | Unknown unknowns | H | L | Sprawdzić nowy cennik; regularnie czytać logi, w razie potrzeby przejść na Paid |
| Sekret LLM ustawiony w złym środowisku | Pre-mortem | M | M | Ustawiać sekrety przez `wrangler secret put` i weryfikować na produkcji po wdrożeniu |
| Utrata wklejonego tekstu przy błędzie generowania (guardrail z PRD) | Pre-mortem | M | H | Zachować tekst po stronie klienta i umożliwić ponowienie bez wklejania |
| Namespace KV `SESSION` tworzony automatycznie | Unknown unknowns | L | L | Zdecydować świadomie: zostawić lub ustawić `session: false` |
| Status GA części funkcji (Workers Logs, MCP) niepotwierdzony | Research finding | M | L | Traktować jako miękki sygnał; sprawdzić status przed poleganiem na nich |

## Getting Started

Kroki sprawdzone względem wersji z projektu: `astro` ^7.4.4, `@astrojs/cloudflare` ^14.4.3, `wrangler` ^4.156.0. Konfiguracja `wrangler.jsonc` jest już ustawiona pod Workers (`main: @astrojs/cloudflare/entrypoints/server`, `assets`, `nodejs_compat`, `observability`).

1. Lokalnie używaj `npm run dev` (`astro dev`) i `npm run preview` — od adaptera v13 działają na workerd, więc osobne `wrangler dev` nie jest potrzebne.
2. Zmień `name` w `wrangler.jsonc` z `10x-astro-starter` na `flashgen`, zanim powstanie pierwszy Worker.
3. Zaloguj Wranglera (`npx wrangler login`) albo utwórz token API ograniczony do jednego projektu Workers (bez DNS i rozliczeń) i trzymaj go w zmiennej środowiskowej.
4. Ustaw sekrety: `npx wrangler secret put SUPABASE_URL`, `SUPABASE_KEY` oraz klucz API LLM.
5. Zbuduj i wdróż: `npm run build`, potem `npx wrangler deploy` (nie `wrangler pages deploy`). Po wdrożeniu uruchom `BASE_URL=<adres> npm run smoke`.

Plan wdrożenia do zatwierdzenia w trybie Plan Mode: `context/deployment/deploy-plan.md`.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
