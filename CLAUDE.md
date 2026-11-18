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

## Łańcuch umiejętności 10xDevs

```
/10x-init  →  /10x-shape  →  /10x-prd  →  /10x-tech-stack-selector  →  /10x-bootstrapper
```

Opis, wejścia i wyjścia każdej umiejętności są w jej `SKILL.md` w `.claude/skills/<nazwa>/`; wczytuj je dopiero przy uruchamianiu danej umiejętności. Pliki pośrednie (notatki, PRD, wybór stosu, lekcje) leżą w `context/foundation/`.
