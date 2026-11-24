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

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 1

Przejdź od konfiguracji sprintu zerowego do orkiestracji projektu za pomocą **łańcucha roadmapy**:

```
(Module 1 foundation docs) -> /10x-roadmap -> backlog-ready roadmap items
```

`/10x-roadmap` jest tematem lekcji. `/10x-new` zostaje celowo wprowadzone w Module 2, Lesson 2, gdy wybrany element roadmapy staje się folderem zmiany implementacyjnej.

### Router zadań — od czego zacząć

| Skill | Użyj, gdy |
| --- | --- |
| **Roadmap (temat lekcji)** | |
| `/10x-roadmap` | Masz `context/foundation/prd.md` oraz przygotowaną bazę projektu i potrzebujesz roadmapy MVP o priorytecie pionowych przekrojów. Skill odczytuje PRD, analizuje bazę kodu, wykorzystuje dostępne dokumenty podstawowe, takie jak `tech-stack.md`, `infrastructure.md` i `deploy-plan.md`, a następnie zapisuje `context/foundation/roadmap.md`. Użyj go PRZED utworzeniem folderów dla poszczególnych zmian lub planów implementacji. |
| **W razie potrzeby uruchom ponownie etap wcześniejszy** | |
| `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` / `/10x-bootstrapper` / `/10x-agents-md` / `/10x-infra-research` | Zestawione z Module 1, aby kontrakty podstawowe można było poprawić przed ustaleniem kolejności roadmapy. Jeśli generowanie roadmapy ujawni lukę w PRD, popraw PRD, zanim uznasz backlog za gotowy. |

### Jak łańcuch przekazuje pracę dalej

- `/10x-roadmap` łączy produkt z implementacją. Nie wybiera frameworków, nie projektuje schematów ani nie tworzy planu implementacji dla pojedynczej zmiany.
- Wynikiem jest `context/foundation/roadmap.md`: uporządkowane kamienie milowe, pionowe przekroje, ograniczone fundamenty, zależności, niewiadome, ryzyka oraz pola przekazania do backlogu.
- Elementy roadmapy powinny otrzymywać stabilne, czytelne dla ludzi identyfikatory w narzędziach backlogu. Rzeczywisty folder `context/changes/<change-id>/` zostanie utworzony w Lekcji 2 za pomocą `/10x-new`.

### Granice roadmapy

- Domyślnie stosuj pionowe przekroje: widoczne dla użytkownika rezultaty obejmujące UI, dane, logikę biznesową i integracje.
- Praca horyzontalna jest dozwolona tylko jako ograniczony element umożliwiający realizację, który wskazuje docelowy pionowy kamień milowy, jaki odblokowuje.
- Unikaj osieroconej pracy horyzontalnej, takiej jak „zbuduj całą bazę danych”, „zbuduj wszystkie endpointy API” lub „zaprojektuj cały UI” przed pierwszym przepływem widocznym dla użytkownika.
- Roadmapa nie jest estymacją kalendarzową. Nie wymyślaj dat, punktów historyjek ani prędkości sprintu, chyba że użytkownik wyraźnie poprosi o osobny artefakt planowania.

### Ścieżki podstawowe używane przez tę lekcję

- `context/foundation/prd.md` — dane wejściowe
- `context/foundation/tech-stack.md` — opcjonalne dane wejściowe
- `context/foundation/infrastructure.md` — opcjonalne dane wejściowe
- `context/deployment/deploy-plan.md` — opcjonalne dane wejściowe
- `context/foundation/roadmap.md` — dane wyjściowe
- `context/foundation/lessons.md` — powtarzające się reguły i pułapki
- `docs/reference/contract-surfaces.md` — rejestr nazw krytycznych dla działania

Skills nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: „This change is archived. Open a new change with `/10x-new` instead.”

<!-- END @przeprogramowani/10x-cli -->
