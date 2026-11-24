---
project: FlashGen
version: 1
status: draft
created: 2026-11-24
updated: 2026-11-24
prd_version: 1
main_goal: low-complexity
top_blocker: time
milestone_id: mvp-close-out
milestone_seq: 1
milestone_status: open
---

# Roadmap: FlashGen

> Wynika z `context/foundation/prd.md` (v1) oraz z automatycznie zbadanego punktu bazowego kodu.
> Edytuj w miejscu; następny kamień milowy kontynuuje ten plik. Archiwizuj dopiero, gdy niezależna roadmapa go zastąpi.
> Wycinki są w kolejności zależności. Tabela „At a glance” jest indeksem.

## Milestone

**M-01: Domknięcie MVP** — Status: open

- **Intent:** Pokazać, że pełny przepływ „wklej tekst → przejrzyj propozycje → zapisz → zobacz swoje fiszki” działa na produkcji i jest bezpieczny dla danych użytkownika, a po drodze dowieźć jedyny brakujący wymóg PRD (usuwanie fiszek). Bez dat.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** każdy F-NN i S-NN poniżej ma status `done`.
- **Scope anchors:** FR-001…FR-008, US-01 (PRD v1).

## Vision recap

Osoba uczy się do egzaminu i ma surowy tekst zamiast gotowych fiszek; ręczne dzielenie go na pytania i odpowiedzi blokuje start nauki. FlashGen przenosi ciężar z „jak to podzielić” na „czy ta propozycja jest dobra”: użytkownik wkleja tekst, dostaje propozycje fiszek od modelu AI, odznacza nietrafione i zapisuje resztę na swoim koncie.

## North star

**S-02: Użytkownik wkleja tekst i dostaje propozycje fiszek** — to najmniejszy przepływ od początku do końca, który dowodzi głównej hipotezy produktu (generowanie z własnego tekstu usuwa paraliż decyzyjny); jest już wdrożony i działa na produkcji, co zgadza się z celem `low-complexity`.

> „North star” oznacza tu najmniejszy kompletny przepływ, którego udane dostarczenie dowodzi, że produkt w ogóle ma sens; reszta ma znaczenie tylko wtedy, gdy on działa.

## At a glance

| ID   | Change ID                 | Outcome (user can …)                                              | Prerequisites | PRD refs                  | Status |
| ---- | ------------------------- | ----------------------------------------------------------------- | ------------- | ------------------------- | ------ |
| S-01 | sign-in-to-own-account    | zalogować się i być rozpoznanym jako właściciel swoich danych     | —             | FR-001                    | done   |
| S-02 | generate-card-proposals   | wkleić tekst źródłowy i dostać propozycje fiszek (przód/tył)      | S-01          | FR-002, FR-003, US-01     | done   |
| S-03 | review-and-save-cards     | przejrzeć propozycje, odznaczyć, poprawić i zapisać wybrane       | S-02          | FR-004, FR-005, FR-006, US-01 | done |
| S-04 | my-flashcards-view        | wejść w „Moje fiszki” i zobaczyć wszystkie swoje fiszki           | S-03          | FR-007                    | done   |
| S-05 | delete-flashcards         | skasować niechciane fiszki                                        | S-04          | FR-008                    | done |
| S-06 | verify-card-isolation     | mieć pewność, że jego fiszki są niewidoczne dla innego konta      | S-04          | US-01, FR-006, FR-007     | done |

## Baseline

Co już jest w kodzie na dzień `2026-11-24` (zbadane automatycznie i potwierdzone przez użytkownika). Foundations nie odtwarzają tych warstw.

- **Frontend:** present — ekrany logowania i rejestracji, dashboard, generator fiszek i widok „Moje fiszki” (`src/components/FlashcardGenerator.tsx`, `src/pages/dashboard/flashcards.astro`).
- **Backend / API:** present — trasy auth oraz generowanie i zapis fiszek (`src/pages/api/auth/*`, `src/pages/api/flashcards/`).
- **Data:** present — tabela fiszek z politykami dostępu per użytkownik i uprawnieniami, zastosowana na produkcji (`supabase/migrations/`).
- **Auth:** present — logowanie i ochrona tras (`src/middleware.ts`, `src/lib/supabase.ts`).
- **Deploy / infra:** present — produkcja działa (`context/deployment/deploy-plan.md`); w CI nie ma joba wdrożenia.
- **Observability:** partial — tylko `console.error` i `wrangler tail`, bez osobnego narzędzia.

Statusy `done` przy S-01…S-04 wynikają z tego punktu bazowego i z przejścia ścieżki na produkcji (deploy-plan, Etap 6); te wycinki nie przeszły przez `/10x-archive`, więc nie mają wpisów w `## Done` (jest tam tylko S-06).

## Foundations

Brak. Wszystkie warstwy istnieją, a żadna praca przekrojowa nie jest potrzebna, by zaplanować S-05 lub S-06.

## Slices

### S-01: Logowanie do własnego konta

- **Outcome:** użytkownik może zalogować się i być rozpoznany jako właściciel swoich danych.
- **Change ID:** sign-in-to-own-account
- **PRD refs:** FR-001
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Pierwszy w kolejności, bo wszystko inne zależy od tożsamości; już wdrożony.
- **Status:** done

### S-02: Propozycje fiszek z wklejonego tekstu

- **Outcome:** użytkownik może wkleić tekst źródłowy i dostać propozycje fiszek jako pary przód/tył.
- **Change ID:** generate-card-proposals
- **PRD refs:** FR-002, FR-003, US-01
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Zależność od zewnętrznego modelu AI (przeciążenia, opóźnienia); złagodzona zachowaniem tekstu po błędzie i zapasowym modelem. Już wdrożony.
- **Status:** done

### S-03: Przegląd i zapis wybranych fiszek

- **Outcome:** użytkownik może przejrzeć propozycje, odznaczyć nietrafione, poprawić treść i zapisać wybrane na swoim koncie.
- **Change ID:** review-and-save-cards
- **PRD refs:** FR-004, FR-005, FR-006, US-01
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Zapis jest nieodwracalny z poziomu tego kroku; krok przeglądu pełni rolę podglądu. Już wdrożony.
- **Status:** done

### S-04: Widok „Moje fiszki”

- **Outcome:** użytkownik może wejść w „Moje fiszki” i zobaczyć listę wszystkich swoich fiszek.
- **Change ID:** my-flashcards-view
- **PRD refs:** FR-007
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Zamyka główne kryterium sukcesu PRD; już wdrożony.
- **Status:** done

### S-05: Usuwanie fiszek

- **Outcome:** użytkownik może skasować niechciane fiszki ze swojej listy.
- **Change ID:** delete-flashcards
- **PRD refs:** FR-008
- **Prerequisites:** S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Jedyny niezaimplementowany wymóg PRD; dotyka danych użytkownika, więc usuwanie musi działać tylko na własnych fiszkach.
- **Status:** done

### S-06: Potwierdzona izolacja fiszek między kontami

- **Outcome:** użytkownik może polegać na tym, że jego fiszki nie są widoczne ani dostępne dla żadnego innego konta (sprawdzone dwoma kontami na produkcji, plus smoke na produkcji).
- **Change ID:** verify-card-isolation
- **PRD refs:** US-01, FR-006, FR-007
- **Prerequisites:** S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Guardrail PRD sprawdzony dotąd tylko lokalnie; weryfikacja na produkcji domyka to ryzyko przed zamknięciem kamienia milowego.
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID               | Suggested issue title                                       | Ready for `/10x-plan` | Notes                                  |
| ---------- | ----------------------- | ----------------------------------------------------------- | --------------------- | -------------------------------------- |
| S-01       | sign-in-to-own-account  | Logowanie do własnego konta                                 | no                    | done, wdrożone                         |
| S-02       | generate-card-proposals | Propozycje fiszek z wklejonego tekstu                       | no                    | done, wdrożone                         |
| S-03       | review-and-save-cards   | Przegląd i zapis wybranych fiszek                           | no                    | done, wdrożone                         |
| S-04       | my-flashcards-view      | Widok „Moje fiszki”                                         | no                    | done, wdrożone                         |
| S-05       | delete-flashcards       | Usuwanie fiszek                                             | no                    | done, zarchiwizowane                   |
| S-06       | verify-card-isolation   | Potwierdzenie izolacji fiszek między kontami na produkcji   | no                    | done, zarchiwizowane                   |

## Open Roadmap Questions

1. **Czy limit CPU obowiązujący na koncie Cloudflare wystarcza (pomiary 8–79 ms przy planie Free)?** — Owner: user. Block: nie blokuje żadnego wycinka; do sprawdzenia w panelu.

## Parked

- **Własny algorytm spaced repetition i tryb nauki** — Why parked: PRD §Non-Goals.
- **Job deploy w CI** — Why parked: niska złożoność; wdrożenie ręczne działa, a deploy produkcyjny zatwierdza człowiek.
- **Obserwowalność poza `wrangler tail`** — Why parked: niska złożoność; mała skala (PRD: garstka użytkowników).
- **`emailRedirectTo` i trasa `/auth/callback`** — Why parked: akceptowalne w MVP (deploy-plan, Etap 2).
- **Ograniczenie `getUser()` do tras chronionych** — Why parked: optymalizacja, nie wymóg PRD.
- **Trzecia próba lub inny dostawca LLM przy 503 obu modeli** — Why parked: użytkownik ponawia ręcznie, a tekst nie ginie (guardrail PRD spełniony).

## Milestone History

## Done

- **S-06: użytkownik może polegać na tym, że jego fiszki nie są widoczne ani dostępne dla żadnego innego konta** — Archived 2026-11-24 → `context/archive/2026-11-24-verify-card-isolation/`. Lesson: —.

- **S-05: użytkownik może skasować niechciane fiszki ze swojej listy** — Archived 2026-11-24 → `context/archive/2026-11-24-delete-flashcards/`. Lesson: —.
