import type { APIRoute } from "astro";
import { LLM_API_KEY } from "astro:env/server";
import { z } from "zod";
import { GenerationError, generateFlashcards } from "@/lib/services/flashcard-generator";
import { MAX_SOURCE_TEXT_LENGTH, type ApiErrorDto, type GenerateFlashcardsResponseDto } from "@/types";

export const prerender = false;

const bodySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Wklej tekst źródłowy.")
    .max(MAX_SOURCE_TEXT_LENGTH, `Tekst może mieć maksymalnie ${MAX_SOURCE_TEXT_LENGTH} znaków.`),
});

const json = (data: GenerateFlashcardsResponseDto | ApiErrorDto, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) {
    return json({ error: "Musisz być zalogowany." }, 401);
  }
  if (!LLM_API_KEY) {
    return json({ error: "Generowanie nie jest skonfigurowane." }, 500);
  }

  const parsed = bodySchema.safeParse(await context.request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." }, 400);
  }

  try {
    const proposals = await generateFlashcards(parsed.data.text, LLM_API_KEY);
    return json({ proposals });
  } catch (err) {
    if (err instanceof GenerationError) {
      return json({ error: "Nie udało się wygenerować fiszek. Spróbuj ponownie." }, err.status);
    }
    throw err;
  }
};
