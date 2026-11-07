// Reader sign-ups from the article wall (Bart, 2026-11-07): "it's very important that we collect the data —
// the names and the emails." The wall already sends each sign-up to the Google Sheet; it now ALSO lands here,
// one private blob per reader in the same store as the members, so the back end behind the footer © can list
// them. Re-registering with the same email overwrites that reader's row instead of adding a duplicate.
//   POST /api/readers           → record a sign-up (name, email, article, source, referrer)
//   GET  /api/readers?admin=1   → every reader, newest first (x-admin-key)
import { get, list, put } from "@vercel/blob";
import crypto from "node:crypto";

const PREFIX = "readers/";
const isAdmin = (req) => {
  const k = String(req.headers["x-admin-key"] || "");
  const want = process.env.ADMIN_KEY || "";
  return want.length > 0 && k.length === want.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(want));
};
const clean = (v, n) => String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const idFor = (email) => crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 20);

async function readAll() {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  const rows = await Promise.all(
    blobs.map(async (b) => {
      try {
        const r = await get(b.url, { access: "private" });
        if (!r || r.statusCode !== 200) return null;
        return JSON.parse(await new Response(r.stream).text());
      } catch {
        return null;
      }
    }),
  );
  return rows.filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "Wrong admin key." });
      return res.json({ ok: true, readers: await readAll() });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const name = clean(b.name, 80);
      const email = clean(b.email, 160).toLowerCase();
      if (!name) return res.status(400).json({ ok: false, error: "Please enter your first name." });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
      const id = idFor(email);
      const row = {
        id, name, email,
        article: clean(b.article, 200),
        source: clean(b.source, 20) || "form",
        referrer: clean(b.referrer, 300),
        at: new Date().toISOString(),
      };
      await put(`${PREFIX}${id}.json`, JSON.stringify(row), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
      return res.json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false });
  } catch (err) {
    console.error("readers:", err);
    return res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
}
