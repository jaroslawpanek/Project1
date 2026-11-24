// RLS check for public.flashcards.
//
// Local (default), against a LOCAL Supabase (npx supabase start); signs up two throwaway accounts:
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_KEY=<publishable key> node scripts/test-rls.mjs
//
// Remote (opt-in), against a hosted project; signs in two EXISTING accounts (A and B, different):
//   RLS_TARGET=remote SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<publishable key> \
//   RLS_A_EMAIL=... RLS_A_PASSWORD=... RLS_B_EMAIL=... RLS_B_PASSWORD=... node scripts/test-rls.mjs
//
// Every inserted row carries a unique marker and all assertions target that row's id (never totals),
// so the script is safe on a table that already holds real data. Marked rows are removed in `finally`.
import { setTimeout as sleep } from "node:timers/promises";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const remote = process.env.RLS_TARGET === "remote";
if (process.env.RLS_TARGET && !remote) {
  throw new Error('RLS_TARGET must be unset (local) or "remote"');
}

const key = process.env.SUPABASE_KEY;
let url;
let creds = null;

if (remote) {
  url = process.env.SUPABASE_URL;
  const required = ["SUPABASE_URL", "SUPABASE_KEY", "RLS_A_EMAIL", "RLS_A_PASSWORD", "RLS_B_EMAIL", "RLS_B_PASSWORD"];
  const missing = required.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Remote mode: missing env: ${missing.join(", ")}`);
  if (!/^https:\/\//.test(url)) throw new Error("Remote mode: SUPABASE_URL must be https");
  const aEmail = process.env.RLS_A_EMAIL;
  const bEmail = process.env.RLS_B_EMAIL;
  if (aEmail.trim().toLowerCase() === bEmail.trim().toLowerCase()) {
    throw new Error("Remote mode: A and B must be different accounts");
  }
  creds = {
    a: { email: aEmail, password: process.env.RLS_A_PASSWORD },
    b: { email: bEmail, password: process.env.RLS_B_PASSWORD },
  };
} else {
  url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  if (!key) throw new Error("Set SUPABASE_KEY (local publishable key)");
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("Refusing to run against a non-local URL");
}

console.log(`Mode: ${remote ? "remote" : "local"}, host: ${new URL(url).host}`);

const ts = Date.now();
const marker = `[rls-test ${ts}]`;
const mk = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) failed++;
};

async function signedIn(label) {
  const c = mk();
  let email;
  let password;
  if (remote) {
    ({ email, password } = creds[label]);
  } else {
    email = `rls-${label}-${ts}@example.com`;
    password = "Passw0rd!test";
    const { error: e1 } = await c.auth.signUp({ email, password });
    if (e1) throw e1;
  }
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { c, id: data.user.id };
}

let A;
let B;

try {
  A = await signedIn("a");
  B = await signedIn("b");
  const anon = mk();

  // A inserts own (marked) row
  const ins = await A.c
    .from("flashcards")
    .insert({ front: `${marker} Q-A`, back: "A-A" })
    .select()
    .single();
  check(
    "A can insert own row (user_id defaults to auth.uid())",
    !ins.error && ins.data?.user_id === A.id,
    ins.error?.message,
  );
  const rowId = ins.data?.id;
  if (!rowId) throw new Error("Setup insert failed; cannot continue");

  // A can read own row
  const selA = await A.c.from("flashcards").select("id");
  check("A sees own row", !selA.error && !!selA.data?.some((r) => r.id === rowId), selA.error?.message);

  // B cannot see A's rows
  const selB = await B.c.from("flashcards").select("id");
  check("B does not see A's row", !selB.error && !selB.data.some((r) => r.id === rowId), selB.error?.message);

  // B cannot update A's row
  const updB = await B.c
    .from("flashcards")
    .update({ front: `${marker} hacked` })
    .eq("id", rowId)
    .select();
  check("B cannot update A's row", !updB.error && updB.data.length === 0);

  // B cannot delete A's row
  const delB = await B.c.from("flashcards").delete().eq("id", rowId).select();
  check("B cannot delete A's row", !delB.error && delB.data.length === 0);

  // B cannot insert a row owned by A
  const spoof = await B.c.from("flashcards").insert({ user_id: A.id, front: `${marker} spoof`, back: "y" });
  check("B cannot insert a row with user_id = A", !!spoof.error, spoof.error?.code);

  // A cannot reassign own row to B
  const steal = await A.c.from("flashcards").update({ user_id: B.id }).eq("id", rowId);
  check("A cannot reassign row to B", !!steal.error, steal.error?.code);

  // anon: no read, no insert
  const selAnon = await anon.from("flashcards").select("id");
  // Either no privilege at all (42501, hosted default) or RLS returning no rows (local default) is safe.
  check(
    "anon sees no rows",
    selAnon.error?.code === "42501" || (!selAnon.error && selAnon.data.length === 0),
    selAnon.error?.code,
  );
  const insAnon = await anon.from("flashcards").insert({ front: `${marker} anon`, back: "y" });
  check("anon cannot insert", !!insAnon.error, insAnon.error?.code);

  // constraints (rejected inserts create no rows)
  const empty = await A.c.from("flashcards").insert({ front: "   ", back: "y" });
  check("blank front rejected by CHECK", !!empty.error, empty.error?.code);
  const long = await A.c.from("flashcards").insert({ front: "x".repeat(1001), back: "y" });
  check("front > 1000 chars rejected", !!long.error, long.error?.code);

  // updated_at trigger
  const before = ins.data.updated_at;
  await sleep(50);
  const upd = await A.c.from("flashcards").update({ back: "A-A2" }).eq("id", rowId).select().single();
  check("updated_at advances on update", upd.data && upd.data.updated_at > before);

  // A can delete own row
  const delA = await A.c.from("flashcards").delete().eq("id", rowId).select();
  check("A can delete own row", !delA.error && delA.data.length === 1);
} catch (e) {
  console.error(`ERROR  ${e?.message ?? e}`);
  failed++;
} finally {
  // Remove only rows created by this run (front starts with the marker), as each owning account.
  for (const [label, acct] of [
    ["A", A],
    ["B", B],
  ]) {
    if (!acct) continue;
    try {
      const { error } = await acct.c.from("flashcards").delete().like("front", `${marker}%`);
      if (error) console.error(`CLEANUP FAILED (${label}): ${error.message}`);
    } catch (e) {
      console.error(`CLEANUP FAILED (${label}): ${e?.message ?? e}`);
    }
  }
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll RLS checks passed");
process.exit(failed ? 1 : 0);
