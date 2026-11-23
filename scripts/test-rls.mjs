// RLS check for public.flashcards against a LOCAL Supabase (npx supabase start).
// Usage: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_KEY=<publishable key> node scripts/test-rls.mjs
import { setTimeout as sleep } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_KEY;
if (!key) throw new Error("Set SUPABASE_KEY (local publishable key)");
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("Refusing to run against a non-local URL");

const ts = Date.now();
const mk = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) failed++;
};

async function signedIn(label) {
  const c = mk();
  const email = `rls-${label}-${ts}@example.com`;
  const password = "Passw0rd!test";
  const { error: e1 } = await c.auth.signUp({ email, password });
  if (e1) throw e1;
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { c, id: data.user.id };
}

const A = await signedIn("a");
const B = await signedIn("b");
const anon = mk();

// A inserts own row
const ins = await A.c.from("flashcards").insert({ front: "Q-A", back: "A-A" }).select().single();
check(
  "A can insert own row (user_id defaults to auth.uid())",
  !ins.error && ins.data?.user_id === A.id,
  ins.error?.message,
);
const rowId = ins.data?.id;

// A can read own row
const selA = await A.c.from("flashcards").select("id");
check("A sees own row", selA.data?.length === 1);

// B cannot see A's rows
const selB = await B.c.from("flashcards").select("id");
check("B sees 0 rows of A", !selB.error && selB.data.length === 0);

// B cannot update A's row
const updB = await B.c.from("flashcards").update({ front: "hacked" }).eq("id", rowId).select();
check("B cannot update A's row", !updB.error && updB.data.length === 0);

// B cannot delete A's row
const delB = await B.c.from("flashcards").delete().eq("id", rowId).select();
check("B cannot delete A's row", !delB.error && delB.data.length === 0);

// B cannot insert a row owned by A
const spoof = await B.c.from("flashcards").insert({ user_id: A.id, front: "x", back: "y" });
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
const insAnon = await anon.from("flashcards").insert({ front: "x", back: "y" });
check("anon cannot insert", !!insAnon.error, insAnon.error?.code);

// constraints
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

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll RLS checks passed");
process.exit(failed ? 1 : 0);
