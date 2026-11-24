// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const email = `smoke-${Date.now()}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(response) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
    if (expired) jar.delete(name.trim());
    else jar.set(name.trim(), rest.join("="));
  }
}

async function request(path, { method = "GET", form, json } = {}) {
  let body;
  let contentType;
  if (json !== undefined) {
    body = JSON.stringify(json);
    contentType = "application/json";
  } else if (form) {
    body = new URLSearchParams(form).toString();
    contentType = "application/x-www-form-urlencoded";
  }
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(),
      Origin: BASE_URL,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body,
  });
  storeCookies(response);
  return { status: response.status, location: response.headers.get("location") ?? "", body: await response.text() };
}

// Id of the card saved during the write-mode steps; read from the rendered list and reused by the delete steps.
let cardId;

// SMOKE_READONLY=1 runs only the steps that need no account (safe against production).
const READONLY = process.env.SMOKE_READONLY === "1";

// Each step: [name, run, expected, mode] where mode is "all" (default), "readonly" (read-only mode only) or
// "write" (default mode only; creates an account).
const allSteps = [
  ["home renders", () => request("/"), { status: 200 }, "all"],
  ["dashboard redirects anonymous user", () => request("/dashboard"), { status: 302, location: "/auth/signin" }, "all"],
  [
    "generate API rejects anonymous user",
    () => request("/api/flashcards/generate", { method: "POST", json: { text: "smoke" } }),
    { status: 401 },
    "readonly",
  ],
  [
    "delete API rejects anonymous user",
    () =>
      request("/api/flashcards", {
        method: "DELETE",
        json: { ids: ["00000000-0000-4000-8000-000000000000"] },
      }),
    { status: 401 },
    "readonly",
  ],
  [
    "signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email, password } }),
    { status: 302, location: "/auth/confirm-email" },
    "write",
  ],
  [
    "signin rejects wrong password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
    { status: 302, location: "/auth/signin?error=" },
    "write",
  ],
  [
    "signin accepts correct password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/" },
    "write",
  ],
  ["dashboard renders for signed-in user", () => request("/dashboard"), { status: 200 }, "write"],
  [
    "save API stores a flashcard",
    () =>
      request("/api/flashcards", {
        method: "POST",
        json: { flashcards: [{ front: "smoke front", back: "smoke back" }] },
      }),
    { status: 201 },
    "write",
  ],
  [
    "my flashcards lists the saved card",
    async () => {
      const res = await request("/dashboard/flashcards");
      cardId = /data-flashcard-id="([0-9a-f-]{36})"/.exec(res.body)?.[1];
      // Report an impossible status when no card id was found, so the delete steps below fail loudly.
      return cardId ? res : { ...res, status: 0 };
    },
    { status: 200 },
    "write",
  ],
  [
    "delete API deletes the card",
    () => request("/api/flashcards", { method: "DELETE", json: { ids: [cardId] } }),
    { status: 200 },
    "write",
  ],
  [
    "delete API returns 404 for the deleted card",
    () => request("/api/flashcards", { method: "DELETE", json: { ids: [cardId] } }),
    { status: 404 },
    "write",
  ],
  [
    "signout clears session",
    () => request("/api/auth/signout", { method: "POST" }),
    { status: 302, location: "/" },
    "write",
  ],
  [
    "dashboard redirects after signout",
    () => request("/dashboard"),
    { status: 302, location: "/auth/signin" },
    "write",
  ],
];

const steps = allSteps.filter(([, , , mode]) => mode === "all" || mode === (READONLY ? "readonly" : "write"));

console.log(`Smoke mode: ${READONLY ? "read-only (no accounts created)" : "default"}  target: ${BASE_URL}`);

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  const ok =
    actual.status === expected.status &&
    (expected.location === undefined || actual.location.startsWith(expected.location));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    console.log(`      expected ${expected.status} ${expected.location ?? ""}`);
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
