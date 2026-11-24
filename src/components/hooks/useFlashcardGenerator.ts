import { useCallback, useState } from "react";
import { readError } from "@/lib/read-error";
import type { FlashcardProposalDto, GenerateFlashcardsResponseDto } from "@/types";

export interface ProposalItem extends FlashcardProposalDto {
  id: number;
  selected: boolean;
}

type Status = "idle" | "generating" | "saving" | "saved";

export function useFlashcardGenerator() {
  // The source text lives here and is never cleared on error, so the user can retry without pasting again.
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const generate = useCallback(async () => {
    setStatus("generating");
    setError(null);
    try {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setError(await readError(res, "Nie udało się wygenerować fiszek. Spróbuj ponownie."));
        setStatus("idle");
        return;
      }
      const data = (await res.json()) as GenerateFlashcardsResponseDto;
      setProposals(data.proposals.map((p, i) => ({ ...p, id: i, selected: true })));
      setStatus("idle");
    } catch {
      setError("Brak połączenia z serwerem. Spróbuj ponownie.");
      setStatus("idle");
    }
  }, [text]);

  const updateProposal = useCallback((id: number, patch: Partial<Omit<ProposalItem, "id">>) => {
    setProposals((items) => items.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const save = useCallback(async () => {
    const chosen = proposals.filter((p) => p.selected).map(({ front, back }) => ({ front, back }));
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcards: chosen }),
      });
      if (!res.ok) {
        setError(await readError(res, "Nie udało się zapisać fiszek. Spróbuj ponownie."));
        setStatus("idle");
        return;
      }
      setSavedCount(chosen.length);
      setProposals([]);
      setText("");
      setStatus("saved");
    } catch {
      setError("Brak połączenia z serwerem. Spróbuj ponownie.");
      setStatus("idle");
    }
  }, [proposals]);

  return { text, setText, proposals, status, error, savedCount, generate, updateProposal, save };
}
