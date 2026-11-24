import { Button } from "@/components/ui/button";
import { useFlashcardList } from "@/components/hooks/useFlashcardList";
import { cn } from "@/lib/utils";
import type { FlashcardDto } from "@/types";

interface FlashcardListProps {
  initialCards: FlashcardDto[];
  /** True when the server-side query failed; the page shows its own alert, so the empty state is hidden. */
  loadFailed?: boolean;
}

export default function FlashcardList({ initialCards, loadFailed = false }: FlashcardListProps) {
  const { cards, selectedIds, confirming, busy, error, toggleSelected, requestConfirm, cancelConfirm, confirmDelete } =
    useFlashcardList(initialCards);

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          {confirming?.kind === "bulk" ? (
            <>
              <span className="text-sm text-blue-100">Usunąć {selectedCount} fiszek?</span>
              <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={busy}>
                Tak
              </Button>
              <Button variant="outline" size="sm" onClick={cancelConfirm} disabled={busy}>
                Nie
              </Button>
            </>
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
                  aria-label="Zaznacz fiszkę"
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
                    <>
                      <span className="text-sm text-blue-100">Na pewno?</span>
                      <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={busy}>
                        Tak
                      </Button>
                      <Button variant="outline" size="sm" onClick={cancelConfirm} disabled={busy}>
                        Nie
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
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
