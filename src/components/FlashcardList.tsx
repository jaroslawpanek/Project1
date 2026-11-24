import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MAX_SELECTED, useFlashcardList } from "@/components/hooks/useFlashcardList";
import { cn } from "@/lib/utils";
import type { FlashcardDto } from "@/types";

interface FlashcardListProps {
  initialCards: FlashcardDto[];
  /** True when the server-side query failed; the page shows its own alert, so the empty state is hidden. */
  loadFailed?: boolean;
}

/** Shortens a card's front so it can be used inside an accessible name. */
function label(front: string): string {
  const text = front.trim().replace(/\s+/g, " ");
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

export default function FlashcardList({ initialCards, loadFailed = false }: FlashcardListProps) {
  const { cards, selectedIds, confirming, busy, error, toggleSelected, requestConfirm, cancelConfirm, confirmDelete } =
    useFlashcardList(initialCards);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Only one confirmation is open at a time, so a single ref serves both the bulk and the per-card "Nie" button.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {confirming?.kind === "bulk" ? (
            <div
              role="group"
              aria-label="Potwierdzenie usunięcia zaznaczonych fiszek"
              className="flex items-center gap-2"
            >
              <span className="text-sm text-blue-100">Usunąć zaznaczone fiszki ({selectedCount})?</span>
              <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={busy}>
                Tak
              </Button>
              <Button ref={cancelRef} variant="outline" size="sm" onClick={cancelConfirm} disabled={busy}>
                Nie
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                requestConfirm({ kind: "bulk" });
              }}
              disabled={busy}
            >
              Usuń zaznaczone ({selectedCount})
            </Button>
          )}
          {selectedCount >= MAX_SELECTED && (
            <span className="text-sm text-blue-100/70">Możesz zaznaczyć maksymalnie {MAX_SELECTED} fiszek naraz.</span>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        !loadFailed && (
          <p className="text-blue-100/70">Nie masz jeszcze fiszek. Wygeneruj pierwsze z wklejonego tekstu.</p>
        )
      ) : (
        <ul className="space-y-3">
          {cards.map((card) => {
            const selected = selectedIds.includes(card.id);
            const confirmingThis = confirming?.kind === "single" && confirming.id === card.id;
            const name = label(card.front);
            return (
              <li
                key={card.id}
                data-flashcard-id={card.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4",
                  selected && "border-white/30 bg-white/10",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={`Zaznacz fiszkę: ${name}`}
                  className="mt-1"
                  checked={selected}
                  disabled={busy}
                  onChange={() => {
                    toggleSelected(card.id);
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{card.front}</p>
                  <p className="mt-2 text-sm text-blue-100/70">{card.back}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {confirmingThis ? (
                    <div
                      role="group"
                      aria-label={`Potwierdzenie usunięcia fiszki: ${name}`}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-blue-100">Na pewno?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Potwierdź usunięcie fiszki: ${name}`}
                        onClick={confirmDelete}
                        disabled={busy}
                      >
                        Tak
                      </Button>
                      <Button
                        ref={cancelRef}
                        variant="outline"
                        size="sm"
                        aria-label={`Anuluj usunięcie fiszki: ${name}`}
                        onClick={cancelConfirm}
                        disabled={busy}
                      >
                        Nie
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Usuń fiszkę: ${name}`}
                      onClick={() => {
                        requestConfirm({ kind: "single", id: card.id });
                      }}
                      disabled={busy}
                    >
                      Usuń
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
