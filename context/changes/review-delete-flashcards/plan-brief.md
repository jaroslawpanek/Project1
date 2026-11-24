# Review delete-flashcards — Plan Brief

> Full plan: `context/changes/review-delete-flashcards/plan.md`

## What & Why

Zrobić przegląd kodu funkcji usuwania fiszek (`delete-flashcards`, FR-008), która jest już na produkcji i zarchiwizowana. Przegląd ma wychwycić odchylenia od planu, ryzyka bezpieczeństwa i niespójności wzorców, zanim dojdzie do kolejnych zmian. `/10x-impl-review` nie pracuje na archiwum, więc ta zmiana ma własny plan i własne miejsce na poprawki.

## Starting Point

Usuwanie jest wdrożone w trzech commitach (`6d3eb51` endpoint, `2ba969e` lista w React, `8739c89` zapis wdrożenia). Zarchiwizowany plan i brief opisują intencje, ale nikt dotąd nie zrobił formalnego przeglądu diffu.

## Desired End State

Jest raport przeglądu z werdyktem, każde ustalenie ma decyzję z triage, a zaakceptowane poprawki są zastosowane i zacommitowane. Zmiana ma status `impl_reviewed` i można ją zarchiwizować.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| -------- | ------ | ---------------- |
| Zakres przeglądu | Kod + `smoke.mjs` + `deploy-plan.md` z commitów `6d3eb51`, `2ba969e`, `8739c89` | Obejmuje wszystko, co zmiana dostarczyła, łącznie z zapisem weryfikacji produkcyjnej. |
| Miejsce poprawek | W tej zmianie, w fazie 2 | Zarchiwizowana zmiana pozostaje niezmienna, a poprawki mają własną historię commitów. |
| Wykrywanie zakresu | Jawna lista commitów zamiast daty planu | Wszystkie commity z dnia (inne zmiany, lekcje) wpadłyby w zakres po dacie. |
| Fazy | 1. Przegląd i triage, 2. Poprawki | Przegląd i naprawy mają osobne bramki; faza 2 może być pusta. |

## Scope

**In scope:** przegląd `src/pages/api/flashcards/index.ts`, `src/types.ts`, hooka listy, komponentu listy, strony „Moje fiszki”, `scripts/smoke.mjs` i `deploy-plan.md`; triage ustaleń; poprawki zaakceptowane do naprawy.

**Out of scope:** zmiany w `context/archive/`; przegląd commitów zamykających (`756abc0`, `412a3e4`); nowe funkcje i migracje; wdrożenie na produkcję; roadmapa.

## Architecture / Approach

Faza 1 uruchamia `/10x-impl-review` z jawnym zakresem commitów i zapisuje raport w `reviews/`. Faza 2 stosuje poprawki z triage, uruchamia bramki (lint, build, smoke tylko do odczytu) i commituje. Własność fiszek pilnuje wyłącznie RLS, więc przegląd zwraca na to szczególną uwagę.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Review and triage | Raport `impl-review.md` z rozstrzygniętymi ustaleniami | Skill domyślnie wykryłby zakres po dacie i objął za dużo |
| 2. Apply triage fixes | Zaakceptowane poprawki, bramki, commit (może być pusta) | Poprawka może zmienić zachowanie API (401/400/404/200) |

**Prerequisites:** brak; potrzebny lokalny build do ręcznej kontroli UI, jeśli poprawki go dotkną.
**Estimated effort:** ~1 sesja, 2 krótkie fazy.

## Open Risks & Assumptions

- Zakładamy, że commity `6d3eb51`, `2ba969e`, `8739c89` są pełnym zbiorem zmian kodu tej funkcji.
- Pełny `npm run smoke` (zapis) wolno uruchamiać tylko na buildzie z lokalnym Supabase; na produkcji tylko tryb do odczytu.
- Poprawka wdrożona na produkcję wymaga osobnej, ludzkiej decyzji o deployu.

## Success Criteria (Summary)

- Raport przeglądu istnieje i żadne ustalenie nie jest `PENDING`.
- Zaakceptowane poprawki są w kodzie, a lint, build i smoke przechodzą.
- Zmiana ma status `impl_reviewed` i jest gotowa do `/10x-archive`.
