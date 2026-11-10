// 2026 member cards (Bart, 2026-11-09: "take a look at [Heritage's activate-your-membership page] and
// implement the same thing for us on TUP, make it its own page"). A Texan claims a free 2026 member
// card: name, email, ZIP. One private blob per member in the same store as the readers and members;
// claiming again with the same email keeps the same member number. The page then shows her personal
// card. Listed for Bart in the back end behind the footer ©.
//   POST /api/cards           → claim (firstName, lastName, email, zip) → { memberNo }
//   GET  /api/cards?admin=1   → every card, newest first (x-admin-key)
import { get, list, put } from "@vercel/blob";
import crypto from "node:crypto";

const PREFIX = "cards/";
const isAdmin = (req) => {
  const k = String(req.headers["x-admin-key"] || "");
  const want = process.env.ADMIN_KEY || "";
  return want.length > 0 && k.length === want.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(want));
};
const clean = (v, n) => String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const idFor = (email) => crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 20);

async function listCards() {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function readCard(url) {
  try {
    const r = await get(url, { access: "private" });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "Wrong admin key." });
      const rows = (await Promise.all((await listCards()).map((b) => readCard(b.url)))).filter(Boolean);
      rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      return res.json({ ok: true, cards: rows });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (b.company) return res.json({ ok: true, memberNo: "" }); // honeypot
      const firstName = clean(b.firstName, 40);
      const lastName = clean(b.lastName, 60);
      const email = clean(b.email, 160).toLowerCase();
      const zip = clean(b.zip, 10);
      if (!firstName || !lastName) return res.status(400).json({ ok: false, error: "Please enter your first and last name." });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
      if (!/^\d{5}$/.test(zip)) return res.status(400).json({ ok: false, error: "Please enter your 5-digit ZIP code." });

      const id = idFor(email);
      const all = await listCards();
      const mine = all.find((x) => x.pathname === `${PREFIX}${id}.json`);
      const prev = mine ? await readCard(mine.url) : null;
      // Member numbers start at TX-1776 (the year) and count up; a returning member keeps hers.
      const memberNo = prev?.memberNo || `TX-${1776 + all.length}`;
      const now = new Date().toISOString();
      const row = {
        id, memberNo, firstName, lastName, email, zip,
        referrer: clean(b.referrer, 300),
        at: prev?.at || now,
        updatedAt: now,
      };
      await put(`${PREFIX}${id}.json`, JSON.stringify(row), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
      return res.json({ ok: true, memberNo, firstName, lastName, returning: Boolean(prev) });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false });
  } catch (err) {
    console.error("cards:", err);
    return res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
}
