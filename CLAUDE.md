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

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 3

Przejrzyj kod wygenerowany przez AI przed scaleniem, korzystając z **łańcucha przeglądu implementacji**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` jest głównym tematem lekcji. Przegląd jest bramką jakości, a nie poleceniem naprawienia każdego znaleziska.

### Router zadań — od czego zacząć

| Umiejętność | Użyj jej, gdy |
| --- | --- |
| **Przegląd kodu (główny temat lekcji)** | |
| `/10x-impl-review <change-id>` | Zaimplementowano kod i chcesz przeprowadzić ustrukturyzowany przegląd przed scaleniem. Umiejętność sprawdza zgodność z planem, dyscyplinę zakresu, bezpieczeństwo i jakość, architekturę, spójność wzorców oraz kryteria sukcesu, a następnie przedstawia ustalenia do selekcji. |
| **Wynik powtarzającej się lekcji** | |
| `/10x-lesson` | Ustalenie ujawnia powtarzającą się regułę projektu lub wzorzec błędów agenta. Zapisz je w `context/foundation/lessons.md` zamiast traktować je jako jednorazową notatkę. |

### Dyscyplina selekcji

- Dotkliwość określa, jak poważne jest ustalenie. Wpływ określa, jak duże znaczenie ma teraz decyzja.
- Prawidłowe wyniki: napraw teraz, napraw inaczej, pomiń, zaakceptuj jako ryzyko, zapisz jako powtarzającą się regułę (`/10x-lesson`), nie zgódź się.
- Naprawiaj krytyczne ustalenia. Nie poświęcaj godzin na obserwacje o niskim wpływie tylko dlatego, że agent je znalazł.
- Świadome pomijanie ustaleń o niskim wpływie jest prawidłowym wynikiem przeglądu, a nie zaniedbaniem.
- Jeśli nie zgadzasz się z ustaleniem, zapisz dlaczego. Błędne rozumowanie agenta również jest sygnałem.

### Granice przeglądu

- Ta lekcja dotyczy przeglądu zaimplementowanego kodu. Nie tworzy planu, nie wykonuje nowych faz ani nie uczy przeglądu CI.
- Strategia testowania i bramki jakości zostaną wprowadzone w Module 3.
- Nie używaj `/10x-contract` jako wyniku selekcji w tej lekcji.

### Ścieżki używane przez tę lekcję

- `context/changes/<change-id>/plan.md` — oczekiwany kontrakt implementacji
- `context/changes/<change-id>/reviews/` — wynik przeglądu
- `context/foundation/lessons.md` — powtarzające się lekcje

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
