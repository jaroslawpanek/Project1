import { z } from "zod";
import type { FlashcardProposalDto } from "@/types";

// Gemini model used for generation. Swap here if a newer Flash model is preferred.
const MODEL = "gemini-3.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 60_000;
const MAX_PROPOSALS = 20;

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
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

/** One request to Gemini; returns validated flashcard proposals. Throws GenerationError. */
export async function generateFlashcards(sourceText: string, apiKey: string): Promise<FlashcardProposalDto[]> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new GenerationError("Generation timed out", 504);
    }
    throw new GenerationError("Could not reach the model");
  }

  if (!res.ok) {
    // Never forward the provider body to the client (may contain request details).
    throw new GenerationError(`Model returned status ${res.status}`);
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
