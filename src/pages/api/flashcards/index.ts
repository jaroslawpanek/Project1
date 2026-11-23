import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import type { ApiErrorDto } from "@/types";

export const prerender = false;

const bodySchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().trim().min(1, "Przód fiszki nie może być pusty.").max(1000, "Przód: maks. 1000 znaków."),
        back: z.string().trim().min(1, "Tył fiszki nie może być pusty.").max(2000, "Tył: maks. 2000 znaków."),
      }),
    )
    .min(1, "Zaznacz co najmniej jedną fiszkę.")
    .max(50),
});

const json = (data: { saved: number } | ApiErrorDto, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) {
    return json({ error: "Musisz być zalogowany." }, 401);
  }

  const parsed = bodySchema.safeParse(await context.request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Baza danych nie jest skonfigurowana." }, 500);
  }

  // user_id is filled by the column default (auth.uid()); RLS enforces ownership.
  const { error } = await supabase.from("flashcards").insert(parsed.data.flashcards);
  if (error) {
    return json({ error: "Nie udało się zapisać fiszek. Spróbuj ponownie." }, 500);
  }

  return json({ saved: parsed.data.flashcards.length }, 201);
};
