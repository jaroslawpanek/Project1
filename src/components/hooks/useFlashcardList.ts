import { useCallback, useState } from "react";
import { readError } from "@/lib/read-error";
import { MAX_DELETE_IDS } from "@/types";
import type { FlashcardDto } from "@/types";

export type Confirming = null | { kind: "single"; id: string } | { kind: "bulk" };

type Status = "idle" | "deleting";

/** Selection cap; equals the API limit (MAX_DELETE_IDS) so a bulk delete is never rejected as too large. */
export const MAX_SELECTED = MAX_DELETE_IDS;

export function useFlashcardList(initialCards: FlashcardDto[]) {
  const [cards, setCards] = useState<FlashcardDto[]>(initialCards);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      // Selecting beyond the cap is ignored.
      return ids.length >= MAX_SELECTED ? ids : [...ids, id];
    });
    // A bulk confirmation names a count, so changing the selection invalidates it.
    setConfirming((current) => (current?.kind === "bulk" ? null : current));
  }, []);

  const requestConfirm = useCallback((next: Exclude<Confirming, null>) => {
    setError(null);
    setConfirming(next);
  }, []);

  const cancelConfirm = useCallback(() => {
    setConfirming(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!confirming) return;
    const ids = confirming.kind === "single" ? [confirming.id] : selectedIds;
    if (ids.length === 0) {
      setConfirming(null);
      return;
    }
    setStatus("deleting");
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      // 404 means the cards are already gone, so the list should drop them as well.
      if (!res.ok && res.status !== 404) {
        setError(await readError(res, "Nie udało się usunąć fiszek. Spróbuj ponownie."));
        setStatus("idle");
        return;
      }
      setCards((items) => items.filter((c) => !ids.includes(c.id)));
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setConfirming(null);
      setStatus("idle");
    } catch {
      setError("Brak połączenia z serwerem. Spróbuj ponownie.");
      setStatus("idle");
    }
  }, [confirming, selectedIds]);

  return {
    cards,
    selectedIds,
    confirming,
    busy: status === "deleting",
    error,
    toggleSelected,
    requestConfirm,
    cancelConfirm,
    confirmDelete,
  };
}
