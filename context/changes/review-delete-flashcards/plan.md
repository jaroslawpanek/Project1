# Review delete-flashcards Implementation Plan

## Overview

Przegląd kodu zmiany `delete-flashcards` (FR-008, slice S-05), która jest już wdrożona na produkcji i zarchiwizowana w `context/archive/2026-11-24-delete-flashcards/`. `/10x-impl-review` odmawia pracy na planie z `context/archive/`, więc ta zmiana ma własny `plan.md` z `## Progress` i wskazuje przeglądowi dokładny zakres commitów. Zaakceptowane w triage poprawki trafiają do tej zmiany, nie do zarchiwizowanej.

## Current State Analysis

- Zmiana `delete-flashcards` jest zaimplementowana w trzech commitach funkcjonalnych: `6d3eb51` (p1: endpoint `DELETE /api/flashcards`), `2ba969e` (p2: interaktywna lista z usuwaniem pojedynczym i zbiorczym, smoke), `8739c89` (p3: zapis wdrożenia i weryfikacji w `deploy-plan.md`). Commity `756abc0` i `412a3e4` zamykają plan i archiwizują zmianę, nie zawierają kodu.
- Zarchiwizowany plan (`context/archive/2026-11-24-delete-flashcards/plan.md`) jest tylko do odczytu i służy jako wzorzec zamierzeń przy ocenie zgodności z planem.
- `/10x-impl-review` wykrywa zakres po dacie planu (`git log --after`). Wszystkie commity z 2026-11-24 (także `verify-card-isolation` i lekcje) wpadłyby w taki zakres, więc zakres musi być wskazany jawnie.
- Roadmapa nie zawiera elementu z `Change ID` `review-delete-flashcards`, więc nie ma statusów do synchronizacji.

## Desired End State

Raport `context/changes/review-delete-flashcards/reviews/impl-review.md` z werdyktem i wszystkimi ustaleniami rozstrzygniętymi w triage (pola `Decision:` bez `PENDING`). Zaakceptowane poprawki są zastosowane i zacommitowane, a bramki lint/build/smoke przechodzą. `change.md` ma status `impl_reviewed`, a zmiana jest gotowa do `/10x-archive`.

### Key Discoveries:

- Pliki do przeglądu: `src/pages/api/flashcards/index.ts` (`DELETE`, `deleteBodySchema`), `src/types.ts` (`FlashcardDto`, `DeleteFlashcardsResponseDto`), `src/components/hooks/useFlashcardList.ts`, `src/components/FlashcardList.tsx`, `src/pages/dashboard/flashcards.astro`, `scripts/smoke.mjs`, `context/deployment/deploy-plan.md`.
- Własność fiszek egzekwuje wyłącznie RLS (polityka delete tylko dla właściciela); to jest główny punkt przeglądu pod kątem bezpieczeństwa.
- `context/foundation/lessons.md` ma jedną regułę (GRANT w migracjach tworzących tabele). Ta zmiana nie dodawała migracji, więc reguła nie ma tu zastosowania.

## What We're NOT Doing

- Nie zmieniamy ani nie dopisujemy niczego w `context/archive/` (zmiany zarchiwizowane są niezmienne).
- Nie przeglądamy commitów `756abc0` i `412a3e4` (tylko artefakty planu i archiwum).
- Nie dodajemy nowych funkcji ani migracji; poprawki ograniczają się do ustaleń z triage.
- Nie wdrażamy na produkcję w ramach tej zmiany (wdrożenie zatwierdza człowiek; ewentualny deploy poprawek to osobna decyzja).
- Nie dotykamy roadmapy (brak pozycji dla tego Change ID).

## Implementation Approach

Faza 1 jest przeglądem i triage przez `/10x-impl-review` z jawnie podanym zakresem commitów i listą plików; raport trafia do `reviews/`. Faza 2 stosuje poprawki zaakceptowane w triage, z bramkami i commitem. Jeśli triage nie przyniesie poprawek, faza 2 zamyka się jako pusta (pusty diff jest dozwolony przez format Progress).

## Phase 1: Review and triage

### Overview

Przeprowadzić `/10x-impl-review` na zakresie `6d3eb51`, `2ba969e`, `8739c89` i rozstrzygnąć ustalenia z użytkownikiem.

### Changes Required:

#### 1. Raport przeglądu

**File**: `context/changes/review-delete-flashcards/reviews/impl-review.md`

**Intent**: Zapisać raport przeglądu z werdyktami wymiarów i ustaleniami, a w triage uzupełnić pola `Decision:`. Uruchomienie z tym planem wymaga, by skill wziął zakres z poniższego kontraktu zamiast wykrywać go po dacie.

**Contract**: Zakres przeglądu to dokładnie commity `6d3eb51`, `2ba969e`, `8739c89` (np. `git diff 6d3eb51^..8739c89 -- <pliki>`) oraz pliki wymienione w Key Discoveries. Intencję zmian należy porównać z zarchiwizowanym `context/archive/2026-11-24-delete-flashcards/plan.md` (tylko odczyt). Raport zawiera `Reviewed phases: 1` (faza tego planu) i jawnie nazywa przeglądany zakres commitów. Ustalenia odroczone lub kolejkowane trafiają do `follow-ups/review-fixes.md`.

#### 2. Status zmiany

**File**: `context/changes/review-delete-flashcards/change.md`

**Intent**: Skill przeglądu oznacza zmianę jako `impl_reviewed` po zapisaniu raportu.

**Contract**: `status: impl_reviewed`, `updated: <data>`.

### Success Criteria:

#### Automated Verification:

- Raport istnieje: `test -f context/changes/review-delete-flashcards/reviews/impl-review.md`
- Raport nie ma nierozstrzygniętych ustaleń: `! grep -q "Decision\*\*: PENDING" context/changes/review-delete-flashcards/reviews/impl-review.md`
- Zakres przeglądu to właściwe commity: `git log --oneline 6d3eb51^..8739c89 -- src scripts context/deployment`

#### Manual Verification:

- Raport wymienia dokładnie commity `6d3eb51`, `2ba969e`, `8739c89` jako zakres przeglądu
- Triage zakończony: każde ustalenie ma decyzję (naprawić, pominąć, zaakceptować ryzyko albo zapisać jako lekcję)

**Implementation Note**: Po zakończeniu tej fazy i przejściu kontroli automatycznych zatrzymaj się na ręczne potwierdzenie przez człowieka, zanim przejdziesz do kolejnej fazy. Bloki faz używają zwykłych punktorów; odpowiadające im `- [ ]` żyją w sekcji `## Progress` na dole planu.

---

## Phase 2: Apply triage fixes

### Overview

Zastosować poprawki zaakceptowane w triage w fazie 1, zweryfikować i zacommitować. Jeśli nie ma poprawek, faza zamyka się bez zmian w kodzie.

### Changes Required:

#### 1. Poprawki z triage

**File**: pliki wskazane przez ustalenia z `reviews/impl-review.md` (pole `Decision:` = naprawić) i `follow-ups/review-fixes.md`

**Intent**: Wprowadzić minimalne, celowane poprawki ustaleń zaakceptowanych do naprawy, bez refaktoryzacji otoczenia.

**Contract**: Zmieniane są wyłącznie pliki z zakresu przeglądu (Key Discoveries), chyba że ustalenie wskazuje inaczej; zachowanie `DELETE /api/flashcards` (401/400/404/200) i konwencje projektu z `CLAUDE.md` (zod, `cn()`, hooki w `src/components/hooks/`) pozostają bez zmian. Ewentualna poprawka dotykająca `scripts/smoke.mjs` nie zmienia trybów `all|readonly|write`.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `node node_modules/eslint/bin/eslint.js .`
- Build przechodzi: `npm run build`
- Smoke w trybie tylko do odczytu przechodzi na lokalnym buildzie: `SMOKE_READONLY=1 npm run smoke`

#### Manual Verification:

- Każde ustalenie oznaczone do naprawy ma wpis `FIXED` w raporcie przeglądu
- Poprawiona ścieżka usuwania (pojedyncze i zbiorcze) działa na lokalnym buildzie, jeśli poprawki dotknęły UI lub API

**Implementation Note**: Po zakończeniu tej fazy i przejściu kontroli automatycznych zatrzymaj się na ręczne potwierdzenie, zanim przejdziesz dalej. Pełny `npm run smoke` (tryb zapisu) uruchamiaj tylko na buildzie podpiętym do lokalnego Supabase.

---

## Testing Strategy

### Unit Tests:

- Brak frameworka testów jednostkowych w projekcie; poprawki weryfikują lint, build i smoke.

### Integration Tests:

- `scripts/smoke.mjs`: tryb tylko do odczytu (401 na anonimowym DELETE) oraz tryb zapisu lokalnie (zapis, usunięcie, ponowne usunięcie → 404).

### Manual Testing Steps:

1. Lokalny build z podglądem: zaloguj konto demo, usuń jedną fiszkę i kilka zaznaczonych z potwierdzeniem „Na pewno? Tak / Nie”.
2. Sprawdź, że po błędzie sieci lista nie traci stanu i pokazuje komunikat.

## Performance Considerations

Brak. Zmiana to przegląd i ewentualne drobne poprawki.

## Migration Notes

Nie dotyczy (bez zmian schematu). Wdrożenie poprawek na produkcję zatwierdza człowiek (`npx wrangler deploy`, osobna decyzja).

## References

- Zarchiwizowany plan: `context/archive/2026-11-24-delete-flashcards/plan.md`
- Zarchiwizowany brief: `context/archive/2026-11-24-delete-flashcards/plan-brief.md`
- Commity: `6d3eb51`, `2ba969e`, `8739c89`
- Umiejętność przeglądu: `.claude/skills/10x-impl-review/SKILL.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Review and triage

#### Automated

- [x] 1.1 Raport istnieje: `test -f context/changes/review-delete-flashcards/reviews/impl-review.md` — 8b0ab64
- [x] 1.2 Raport nie ma nierozstrzygniętych ustaleń: `! grep -q "Decision\*\*: PENDING" context/changes/review-delete-flashcards/reviews/impl-review.md` — 8b0ab64
- [x] 1.3 Zakres przeglądu to właściwe commity: `git log --oneline 6d3eb51^..8739c89 -- src scripts context/deployment` — 8b0ab64

#### Manual

- [x] 1.4 Raport wymienia dokładnie commity `6d3eb51`, `2ba969e`, `8739c89` jako zakres przeglądu — 8b0ab64
- [x] 1.5 Triage zakończony: każde ustalenie ma decyzję (naprawić, pominąć, zaakceptować ryzyko albo zapisać jako lekcję) — 8b0ab64

### Phase 2: Apply triage fixes

#### Automated

- [x] 2.1 Lint przechodzi: `node node_modules/eslint/bin/eslint.js .`
- [x] 2.2 Build przechodzi: `npm run build`
- [x] 2.3 Smoke w trybie tylko do odczytu przechodzi na lokalnym buildzie: `SMOKE_READONLY=1 npm run smoke`

#### Manual

- [x] 2.4 Każde ustalenie oznaczone do naprawy ma wpis `FIXED` w raporcie przeglądu
- [x] 2.5 Poprawiona ścieżka usuwania (pojedyncze i zbiorcze) działa na lokalnym buildzie, jeśli poprawki dotknęły UI lub API
