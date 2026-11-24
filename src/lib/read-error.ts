import type { ApiErrorDto } from "@/types";

/** Extracts the API error message from a failed response, falling back to a generic message. */
export async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as ApiErrorDto | null;
  return body?.error ?? fallback;
}
