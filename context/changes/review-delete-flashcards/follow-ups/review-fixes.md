# Review fixes queued from impl-review (applied in Phase 2)

Source: `reviews/impl-review.md` (2026-11-24). Apply as minimal, targeted edits.

- **F1** `src/components/hooks/useFlashcardList.ts`, `src/components/FlashcardList.tsx`: cap selection at 50 (API limit), with a short Polish hint near the bulk button.
- **F2** `src/components/FlashcardList.tsx`: `aria-label` with the start of the card text on checkbox, "Usuń", "Tak", "Nie"; move focus to "Nie" when a confirmation opens; `role="group"` or `aria-live="polite"` on the confirmation container.
- **F3** `scripts/smoke.mjs`: refuse write mode when `BASE_URL` is not localhost/127.0.0.1 unless `SMOKE_ALLOW_WRITE=1`; mention it in the README if smoke modes are documented there.
- **F4** `src/components/FlashcardList.tsx:30`: replace "Usunąć N fiszek?" with "Usunąć zaznaczone fiszki (N)?".
- **F5** `src/pages/api/flashcards/index.ts` (DELETE): reject non-`application/json` Content-Type and an `Origin` that differs from `url.origin`. Check that smoke (sends `Origin: BASE_URL`) and production still pass.
- **F7** extract `readError` (duplicated in `useFlashcardList.ts` and `useFlashcardGenerator.ts`) to `src/lib/`; rename `bodySchema` to `saveBodySchema`; add `SaveFlashcardsResponseDto` to `src/types.ts`.
