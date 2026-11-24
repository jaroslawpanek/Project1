## Reguły projektu

Komendy: `package.json` (skrypty) i `README.md`. Node: `.nvmrc`. Zmienne środowiskowe: `.env.example`.

### Konwencje

- **Archiwum**: umiejętności nie zapisują do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: „Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`.”
- **Komponenty**: Astro dla treści statycznych i layoutu; React tylko tam, gdzie potrzebna jest interaktywność. Bez dyrektyw Next.js (`"use client"` itp.). Hooki w `src/components/hooks/`.
- **Klasy Tailwind**: warunkowe i łączone przez `cn()` z `@/lib/utils`; nie sklejaj stringów ręcznie.
- **shadcn/ui**: komponenty w `src/components/ui/`, styl „new-york”; nowe dodawaj przez `npx shadcn@latest add [name]`.
- **API routes**: eksporty `GET`/`POST` wielkimi literami, `export const prerender = false`, walidacja wejścia przez zod.
- **Supabase**: migracje w `supabase/migrations/` jako `YYYYMMDDHHmmss_short_description.sql`. Na każdej nowej tabeli włącz RLS z politykami osobno dla operacji i ról (dane fiszek są per użytkownik).
- **Auth**: klient w `src/lib/supabase.ts`, ochrona tras w `src/middleware.ts` (lista `PROTECTED_ROUTES`).
- **Miejsca kodu**: serwisy i helpery w `src/lib/` (logika biznesowa w `src/lib/services/`), współdzielone typy (encje, DTO) w `src/types.ts`.
- **Testy**: `npm run smoke` uruchamiaj po aktualizacji zależności.
- **Wdrożenie**: Cloudflare Workers, wyłącznie `npx wrangler deploy`. Nie używaj `wrangler pages ...`. Wdrożenie na produkcję, rotację sekretów i usuwanie zasobów zatwierdza człowiek. Plan: `context/deployment/deploy-plan.md`.

## Łańcuch umiejętności 10xDevs

```
/10x-init  →  /10x-shape  →  /10x-prd  →  /10x-tech-stack-selector  →  /10x-bootstrapper
```

Opis, wejścia i wyjścia każdej umiejętności są w jej `SKILL.md` w `.claude/skills/<nazwa>/`; wczytuj je dopiero przy uruchamianiu danej umiejętności. Pliki pośrednie (notatki, PRD, wybór stosu, lekcje) leżą w `context/foundation/`.
<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs - Moduł 2, Lekcja 2

Przekształć jeden element roadmapy w pierwszy cykl implementacji za pomocą **łańcucha planowania zmian**:

```
/10x-roadmap -> /10x-new -> /10x-plan -> /10x-plan-review -> /10x-implement
```

`/10x-new`, `/10x-plan`, `/10x-plan-review` i `/10x-implement` są głównym tematem lekcji. `/10x-frame` i `/10x-research` nie są tutaj wymaganymi rytuałami; są ścieżkami eskalacji wprowadzanymi w następnej lekcji.

### Router zadań - od czego zacząć

| Umiejętność | Użyj jej, gdy |
| --- | --- |
| **Konfiguracja zmiany (główny temat lekcji)** | |
| `/10x-new <change-id>` | Wybrano element roadmapy i potrzebny jest stabilny folder zmiany. Tworzy `context/changes/<change-id>/change.md`, aby planowanie, implementacja, postęp, commity i późniejszy przegląd miały wspólną tożsamość. Użyj PO wybraniu elementu roadmapy, PRZED `/10x-plan`. |
| **Planowanie (główny temat lekcji)** | |
| `/10x-plan <change-id>` | Masz folder zmiany i potrzebujesz planu implementacji możliwego do przeglądu. Odczytuje kontekst roadmapy, dokumenty podstawowe, dowody z codebase oraz wszelkie istniejące notatki dotyczące zmiany; zapisuje `plan.md` i `plan-brief.md` z fazami, kontraktami plików, kryteriami sukcesu oraz `## Progress`. |
| **Gotowość planu (główny temat lekcji)** | |
| `/10x-plan-review <change-id>` | Masz `plan.md` i potrzebujesz lekkiej kontroli gotowości przed rozpoczęciem kodowania. Użyj jej, aby wychwycić brakujący stan końcowy, słabe kontrakty, nieprawidłowo sformatowany postęp, dryf zakresu lub martwe punkty, zanim rozpoczną się zmiany w kodzie. |
| **Implementacja (główny temat lekcji)** | |
| `/10x-implement <change-id> phase <n>` | Masz zatwierdzony plan i chcesz wykonać jedną fazę z weryfikacją, ręczną bramką, rytuałem commitu oraz zapisaniem SHA w `## Progress`. |
| **Zamknięcie cyklu życia** | |
| `/10x-archive <change-id>` | Zmiana jest scalona lub celowo zamknięta. Przenieś ją z aktywnego `context/changes/` do stanu archiwalnego. |

### Jak łańcuch przekazuje pracę

- `/10x-new` tworzy trwałą tożsamość zmiany.
- `/10x-plan` przekształca tę tożsamość w kontrakt implementacyjny.
- `/10x-plan-review` sprawdza plan, zanim agent zmodyfikuje kod.
- `/10x-implement` wykonuje jedną zaplanowaną fazę, weryfikuje, prosi o ręczne potwierdzenie, gdy jest potrzebne, wykonuje commit i rejestruje postęp.

### Granice lekcji

- Plan jest domyślnym routerem po wyborze elementu roadmapy. Zacznij od `/10x-plan`, chyba że problem jest niejasny lub blokują Cię dowody zewnętrzne.
- Nie uruchamiaj `/10x-frame + /10x-research` jako ceremonii dla każdej zmiany.
- Nie przekształcaj tej lekcji w pełną, kompleksową budowę produktu. Punkt kontrolny z zaplanowanym i częściowo lub w pełni zaimplementowanym strumieniem jest prawidłowy.
- Przegląd kodu zaimplementowanego diffu należy do Lekcji 3 poprzez `/10x-impl-review`.
- Zamknięcie cyklu życia przez `/10x-archive` po scaleniu lub celowym zamknięciu zmiany.

### Ścieżki używane w tej lekcji

- `context/foundation/roadmap.md` - nadrzędna roadmapa
- `context/changes/<change-id>/change.md` - tożsamość zmiany
- `context/changes/<change-id>/plan.md` - kontrakt implementacyjny
- `context/changes/<change-id>/plan-brief.md` - skompresowane przekazanie
- `context/foundation/lessons.md` - powtarzające się reguły i pułapki
- `docs/reference/contract-surfaces.md` - rejestr nazw kluczowych dla działania systemu

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozstrzygnięta ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
