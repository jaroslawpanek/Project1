import { z } from "zod";
import type { FlashcardProposalDto } from "@/types";

// Models are tried in order. The fallback is used only when the previous model is overloaded or times out
// (Gemini returns intermittent 503s under high demand). Swap names here if newer models are preferred.
// The lite model is the main one (1-6 s); the full Flash model is the fallback (usually 20-30 s), hence
// different per-attempt timeouts. Worst case (every attempt times out) is the sum, so keep it around 60 s.
const MODELS = [
  { name: "gemini-3.5-flash-lite", timeoutMs: 20_000 },
  { name: "gemini-3.5-flash", timeoutMs: 40_000 },
] as const;
const endpoint = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const MAX_PROPOSALS = 20;
// HTTP statuses that mean "try the next model": rate limit and overload / gateway problems.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const SYSTEM_PROMPT =
  "You create study flashcards from the user's source text. " +
  "Return concise question/answer pairs that each test one fact or idea from the text. " +
  "Write in the same language as the source text. Do not invent facts that are not in the text. " +
  `Return at most ${MAX_PROPOSALS} flashcards.`;

// Validates what the model returns; bounds match the DB CHECK constraints (front <= 1000, back <= 2000).
const proposalsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().trim().min(1).max(1000),
        back: z.string().trim().min(1).max(2000),
      }),
    )
    .max(MAX_PROPOSALS),
});

const geminiResponseSchema = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) }))
    .min(1),
});

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly status: 502 | 504 | 500 = 502,
    /** true when trying another model may help (overload, timeout, network). */
    readonly retryable = false,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

/** One request to one model; returns validated proposals. Throws GenerationError. */
async function requestModel(
  model: (typeof MODELS)[number],
  sourceText: string,
  apiKey: string,
): Promise<FlashcardProposalDto[]> {
  let res: Response;
  try {
    res = await fetch(endpoint(model.name), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: sourceText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              flashcards: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: { front: { type: "STRING" }, back: { type: "STRING" } },
                  required: ["front", "back"],
                },
              },
            },
            required: ["flashcards"],
          },
        },
      }),
      signal: AbortSignal.timeout(model.timeoutMs),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new GenerationError("Generation timed out", 504, true);
    }
    throw new GenerationError("Could not reach the model", 502, true);
  }

  if (!res.ok) {
    // Never forward the provider body to the client (may contain request details).
    throw new GenerationError(`Model returned status ${res.status}`, 502, RETRYABLE_STATUSES.has(res.status));
  }

  const body = geminiResponseSchema.safeParse(await res.json().catch(() => null));
  const text = body.success ? body.data.candidates[0].content.parts[0]?.text : undefined;
  if (!text) throw new GenerationError("Empty response from the model");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GenerationError("Model returned invalid JSON");
  }
  const parsed = proposalsSchema.safeParse(json);
  if (!parsed.success) throw new GenerationError("Model response did not match the expected format");

  return parsed.data.flashcards;
}

/**
 * Generates flashcard proposals. Tries MODELS in order and moves to the next one only on a
 * retryable failure (overload / timeout / network). Throws the last GenerationError otherwise.
 */
export async function generateFlashcards(sourceText: string, apiKey: string): Promise<FlashcardProposalDto[]> {
  let lastError: GenerationError | undefined;
  for (const model of MODELS) {
    try {
      return await requestModel(model, sourceText, apiKey);
    } catch (err) {
      if (!(err instanceof GenerationError)) throw err;
      lastError = err;
      // Visible in `wrangler tail` / Workers Logs; never includes the key or the provider response body.
      // eslint-disable-next-line no-console -- intentional server-side diagnostics
      console.error(`[flashcard-generator] ${model.name}: ${err.message} (retryable=${String(err.retryable)})`);
      if (!err.retryable) break;
    }
  }
  throw lastError ?? new GenerationError("No model available");
}
