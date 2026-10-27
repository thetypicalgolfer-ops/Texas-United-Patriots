// Texas United Patriots member directory (Bart + Rick, 2026-10-27): "anybody can be a member if they sign up…
// it should be alphabetically ordered… click on their link and automatically get into their webpage", with no
// approval, and a remove button for Bart on the back end. One private blob per member in the tup-members store.
//   GET    /api/members                → public list, A–Z, no emails
//   GET    /api/members?admin=1        → full list with emails (x-admin-key)
//   POST   /api/members                → join (name, email, website, description); listed right away
//   DELETE /api/members?id=<id>        → remove a listing (x-admin-key)
import { del, get, list, put } from "@vercel/blob";
import crypto from "node:crypto";

const PREFIX = "members/";
const isAdmin = (req) => {
  const k = String(req.headers["x-admin-key"] || "");
  const want = process.env.ADMIN_KEY || "";
  return want.length > 0 && k.length === want.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(want));
};
const clean = (v, n) => String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const idFor = (email) => crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 20);

function normalizeUrl(raw) {
  let s = clean(raw, 300);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

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
  return rows.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const rows = await readAll();
      if (req.query.admin) {
        if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "Wrong admin key." });
        return res.json({ ok: true, members: rows });
      }
      return res.json({ ok: true, members: rows.map(({ id, name, website, description, city, joinedAt }) => ({ id, name, website, description, city, joinedAt })) });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (b.company) return res.json({ ok: true }); // honeypot
      const name = clean(b.name, 80);
      const email = clean(b.email, 160).toLowerCase();
      const website = normalizeUrl(b.website);
      if (!name) return res.status(400).json({ ok: false, error: "Please enter your name or your organization's name." });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
      if (website === null) return res.status(400).json({ ok: false, error: "That website address doesn't look right. Example: www.yoursite.com" });
      const id = idFor(email);
      const now = new Date().toISOString();
      const row = { id, name, email, website, description: clean(b.description, 160), city: clean(b.city, 60), joinedAt: now };
      await put(`${PREFIX}${id}.json`, JSON.stringify(row), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
      return res.json({ ok: true, id });
    }
    if (req.method === "DELETE") {
      if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "Wrong admin key." });
      const id = String(req.query.id || "");
      if (!/^[a-f0-9]{20}$/.test(id)) return res.status(400).json({ ok: false, error: "Bad id." });
      const { blobs } = await list({ prefix: `${PREFIX}${id}` });
      if (blobs.length) await del(blobs.map((x) => x.url));
      return res.json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false });
  } catch (err) {
    console.error("members:", err);
    return res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
}
