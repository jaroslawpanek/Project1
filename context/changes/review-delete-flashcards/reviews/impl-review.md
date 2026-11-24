<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Review delete-flashcards

- **Plan**: context/changes/review-delete-flashcards/plan.md
- **Scope**: Phase 1 of 2 — review of the archived change `delete-flashcards`, commits 6d3eb51, 2ba969e, 8739c89 (`git diff 6d3eb51^..8739c89 -- src scripts context/deployment`)
- **Reviewed phases**: 1
- **Date**: 2026-11-24
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Zaznaczenie więcej niż 50 fiszek kończy się błędem 400

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/hooks/useFlashcardList.ts (toggleSelected / confirmDelete), src/pages/api/flashcards/index.ts (deleteBodySchema, max 50)
- **Detail**: API przyjmuje 1–50 identyfikatorów, a UI pozwala zaznaczyć dowolnie wiele fiszek. Przy >50 żądanie zwraca 400 „Zbyt wiele fiszek naraz.”, komunikat pokazuje się tylko w banerze na górze listy, a potwierdzenie zbiorcze pozostaje otwarte. Brief planu zakładał, że użytkownik z >50 fiszkami usuwa je partiami, ale UI tego nie umożliwia.
- **Fix A ⭐ Recommended**: Ogranicz zaznaczenie do 50 w hooku (kolejne zaznaczenie ignorowane, z podpowiedzią przy przycisku zbiorczym).
  - Strength: Najmniejsza zmiana, spójna z limitem API i z limitem zapisu.
  - Tradeoff: Użytkownik z większą liczbą fiszek usuwa partiami.
  - Confidence: HIGH — limit 50 jest stały w API (deleteBodySchema).
  - Blind spot: Czy podpowiedź wymaga nowego tekstu po polsku.
- **Fix B**: Dziel usuwanie zbiorcze na partie po 50 w hooku.
  - Strength: Brak limitu z punktu widzenia użytkownika.
  - Tradeoff: Częściowy sukces między partiami wymaga obsługi błędów i rozbudowuje hook.
  - Confidence: MEDIUM — nie sprawdzono zachowania przy błędzie w środku serii.
  - Blind spot: Stan UI po nieudanej partii.
- **Decision**: FIXED via Fix A (Phase 2): selection capped at 50 + hint

### F2 — Kontrolki usuwania nie mają odróżnialnych nazw, focus ginie

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/FlashcardList.tsx:71-106 (checkbox, „Tak/Nie”, „Usuń”)
- **Detail**: Każdy wiersz ma identyczne nazwy dostępne: checkbox `Zaznacz fiszkę`, przycisk `Usuń`, `Tak`, `Nie`. Użytkownik czytnika ekranu nie wie, której fiszki dotyczy operacja destrukcyjna. Po kliknięciu „Usuń” przycisk znika (zastępują go „Tak/Nie”), więc focus klawiatury wraca do `body`, a pytanie „Na pewno?” nie jest ogłaszane.
- **Fix**: Dodaj `aria-label` z początkiem treści fiszki do checkboxa i przycisków (np. `Usuń fiszkę: …`), przenieś focus na „Nie” po otwarciu potwierdzenia i dodaj `role="group"` lub `aria-live="polite"` do kontenera potwierdzenia.
  - Strength: Naprawia operowalność z klawiatury i czytnika bez zmiany przepływu.
  - Tradeoff: Kilka drobnych edycji w jednym komponencie.
  - Confidence: HIGH — nazwy i usuwanie przycisku widać w kodzie.
  - Blind spot: Nie sprawdzono z prawdziwym czytnikiem ekranu.
- **Decision**: FIXED (Phase 2)

### F3 — Smoke w trybie zapisu nie ma zabezpieczenia przed produkcją

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: scripts/smoke.mjs:4 (BASE_URL), scripts/smoke.mjs:51 (READONLY)
- **Detail**: Tryb domyślny zakłada konto, zapisuje i usuwa fiszkę. `BASE_URL` może wskazywać cokolwiek, a `npm run smoke` bez `SMOKE_READONLY=1` uruchomiony na produkcji utworzy konta w produkcyjnym Supabase. Bezpieczeństwo opiera się wyłącznie na tym, że ktoś pamięta o fladze (deploy-plan potwierdza, że tym razem użyto jej poprawnie).
- **Fix**: Odmów trybu zapisu, gdy `BASE_URL` nie jest localhost/127.0.0.1, chyba że ustawiono jawne `SMOKE_ALLOW_WRITE=1`.
  - Strength: Jak guard w `test-rls.mjs` i `seed-local.mjs`; blokuje pomyłkę, nie wymaga zmiany procesu.
  - Tradeoff: Jedna dodatkowa flaga dla świadomego zapisu na zdalnym środowisku.
  - Confidence: HIGH — wzorzec już istnieje w `test-rls.mjs`.
  - Blind spot: Czy README opisuje tryby i wymaga uzupełnienia.
- **Decision**: FIXED (Phase 2)

### F4 — „Usunąć N fiszek?” bez odmiany

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/FlashcardList.tsx:30
- **Detail**: Tekst potwierdzenia zbiorczego to stałe „Usunąć {N} fiszek?”, więc dla 1 wychodzi „1 fiszek”, a dla 2–4 „2 fiszek” zamiast „fiszki”. To komunikat przy operacji destrukcyjnej. Plan opisywał ten tekst dosłownie, więc to wada planu, nie odchylenie.
- **Fix**: Neutralne sformułowanie „Usunąć zaznaczone fiszki ({N})?” albo mały helper odmiany.
- **Decision**: FIXED (Phase 2)

### F5 — Brak sprawdzania Origin/Content-Type w DELETE

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/flashcards/index.ts (DELETE)
- **Detail**: Handler używa `request.json()` niezależnie od Content-Type, a Astro `checkOrigin` obejmuje tylko typy formularzy. Ryzyko jest niskie (ciasteczka Supabase SSR mają SameSite=Lax, a cross-site DELETE z JSON wymaga preflightu), ale obrona opiera się na atrybutach ciasteczek.
- **Fix**: Opcjonalnie odrzucaj żądania, których Content-Type nie jest `application/json` lub Origin różni się od `url.origin`.
- **Decision**: FIXED (Phase 2)

### F6 — Smoke nie sprawdza usuwania cudzej fiszki przez API

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: scripts/smoke.mjs:56-136
- **Detail**: Smoke pokrywa usunięcie własnej fiszki i ponowne usunięcie (404). Brak przypadku „konto B próbuje usunąć fiszkę konta A” na poziomie API; centralne twierdzenie „tylko RLS” jest sprawdzone na poziomie bazy w `scripts/test-rls.mjs`. Anonimowe 401 dla generate i delete działają tylko w trybie readonly.
- **Fix**: Zostaw, jeśli pokrycie z `test-rls.mjs` wystarcza; ewentualnie oznacz kroki anonimowego 401 trybem `all`.
- **Decision**: SKIPPED (covered at DB level by scripts/test-rls.mjs)

### F7 — Zduplikowane `readError` i niejednoznaczne `bodySchema`

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/hooks/useFlashcardList.ts:8, src/pages/api/flashcards/index.ts:8, :27
- **Detail**: `readError` jest skopiowane słowo w słowo z `useFlashcardGenerator.ts:11`. Obok `deleteBodySchema` istniejące `bodySchema` jest niejednoznaczne, a `json()` ma w typie inline `{ saved: number }` bez DTO w `types.ts`, w przeciwieństwie do `DeleteFlashcardsResponseDto`.
- **Fix**: Wyciągnij `readError` do `src/lib/`, zmień `bodySchema` na `saveBodySchema` i dodaj `SaveFlashcardsResponseDto`.
- **Decision**: FIXED (Phase 2)

### F8 — Po 401 brak przekierowania, ignorowane `deleted`

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/hooks/useFlashcardList.ts:51-58
- **Detail**: Odpowiedź 200 usuwa z listy wszystkie wysłane id, nawet gdy `deleted` jest mniejsze (część wierszy już nie istniała lub nie należała do użytkownika). To akceptowalne. Po wygaśnięciu sesji (401) UI pokazuje „Musisz być zalogowany.” bez przekierowania do logowania, a lista zapytań nie ma limitu ani paginacji (skala MVP).
- **Fix**: Zostaw na dalej; ewentualnie przekieruj na `/auth/signin` przy 401.
- **Decision**: SKIPPED (acceptable at MVP scale)

### F9 — Dodatki spoza planu: `loadFailed`, `FlashcardDto`

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/FlashcardList.tsx:7, src/pages/dashboard/flashcards.astro:32, src/types.ts
- **Detail**: Dodatkowy opcjonalny prop `loadFailed` (ukrywa pusty stan po błędzie zapytania), typ `FlashcardDto` oraz drobne zabezpieczenia w hooku (czyszczenie potwierdzenia zbiorczego przy zmianie zaznaczenia, strażnik pustej listy) nie były opisane w planie. Wszystkie zgodne z intencją i nieszkodliwe.
- **Fix**: Brak zmian w kodzie; wystarczy odnotować, że zarchiwizowany plan jest węższy niż kod.
- **Decision**: SKIPPED (harmless additions; archived plan stays immutable)
