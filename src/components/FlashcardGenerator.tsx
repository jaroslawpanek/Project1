import { Button } from "@/components/ui/button";
import { useFlashcardGenerator } from "@/components/hooks/useFlashcardGenerator";
import { cn } from "@/lib/utils";
import { MAX_SOURCE_TEXT_LENGTH } from "@/types";

const fieldClass =
  "w-full rounded-lg border border-white/20 bg-white/10 p-2 text-sm text-white placeholder:text-blue-100/40 focus:border-white/50 focus:outline-none";

export default function FlashcardGenerator() {
  const { text, setText, proposals, status, error, savedCount, generate, updateProposal, save } =
    useFlashcardGenerator();

  const busy = status === "generating" || status === "saving";
  const tooLong = text.length > MAX_SOURCE_TEXT_LENGTH;
  const selectedCount = proposals.filter((p) => p.selected).length;

  return (
    <div className="space-y-6 text-left text-white">
      <div className="space-y-2">
        <label htmlFor="source-text" className="text-sm font-medium text-blue-100">
          Tekst źródłowy
        </label>
        <textarea
          id="source-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          rows={8}
          disabled={busy}
          placeholder="Wklej notatki, fragment podręcznika lub artykułu…"
          className={cn(fieldClass, "resize-y p-3", tooLong && "border-red-400")}
        />
        <div className="flex items-center justify-between gap-4">
          <span className={cn("text-xs", tooLong ? "text-red-300" : "text-blue-100/50")}>
            {text.length} / {MAX_SOURCE_TEXT_LENGTH}
          </span>
          <Button onClick={generate} disabled={busy || tooLong || text.trim().length === 0}>
            {status === "generating" ? "Generuję… (może potrwać do minuty)" : "Generuj fiszki"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {status === "saved" && (
        <p role="status" className="rounded-lg border border-green-400/40 bg-green-500/10 p-3 text-sm text-green-200">
          Zapisano fiszek: {savedCount}.{" "}
          <a href="/dashboard/flashcards" className="underline">
            Zobacz Moje fiszki
          </a>
        </p>
      )}

      {proposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Propozycje ({proposals.length})</h2>
          <ul className="space-y-3">
            {proposals.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "space-y-2 rounded-xl border border-white/10 bg-white/5 p-3",
                  !p.selected && "opacity-50",
                )}
              >
                <label className="flex items-center gap-2 text-xs text-blue-100/70">
                  <input
                    type="checkbox"
                    checked={p.selected}
                    disabled={busy}
                    onChange={(e) => {
                      updateProposal(p.id, { selected: e.target.checked });
                    }}
                  />
                  Zapisz tę fiszkę
                </label>
                <textarea
                  aria-label="Przód fiszki"
                  value={p.front}
                  rows={2}
                  disabled={busy}
                  onChange={(e) => {
                    updateProposal(p.id, { front: e.target.value });
                  }}
                  className={fieldClass}
                />
                <textarea
                  aria-label="Tył fiszki"
                  value={p.back}
                  rows={2}
                  disabled={busy}
                  onChange={(e) => {
                    updateProposal(p.id, { back: e.target.value });
                  }}
                  className={fieldClass}
                />
              </li>
            ))}
          </ul>
          <Button onClick={save} disabled={busy || selectedCount === 0}>
            {status === "saving" ? "Zapisuję…" : `Zapisz do bazy (${selectedCount})`}
          </Button>
        </div>
      )}
    </div>
  );
}
