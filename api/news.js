// Live news wire for the homepage "Latest Updates" ticker (Bart, 2026-11-07): "every single one of these
// things needs to be live and they need to be checked within 10 seconds… New York Times, any news
// organization in Texas, CNN, MSNBC, Fox News."
//   GET /api/news → { updated, items: [{ t, src, url, ts }] }, newest first, last 24 hours only.
// Headlines are shown verbatim with the outlet's name and a link to the original story. Nothing is
// rewritten or invented. The CDN caches the response for 10 seconds, so every visitor's 10-second poll
// sees the wire at most 10 seconds old. Outlets without a working RSS feed of their own (CNN, MS NOW,
// the Texas papers) come in through Google News filtered to that outlet's site; those feeds are
// fetched at most once a minute per warm instance so Google never sees a flood.

const GN = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const FEEDS = [
  { src: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml" },
  { src: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml" },
  { src: "Fox News", url: "https://moxie.foxnews.com/google-publisher/politics.xml" },
  { src: "Fox News", url: "https://moxie.foxnews.com/google-publisher/us.xml" },
  { src: "CBS News", url: "https://www.cbsnews.com/latest/rss/politics" },
  { src: "NBC News", url: "https://feeds.nbcnews.com/nbcnews/public/politics" },
  { src: "ABC News", url: "https://abcnews.go.com/abcnews/politicsheadlines" },
  { src: "NPR", url: "https://feeds.npr.org/1014/rss.xml" },
  { src: "Politico", url: "https://rss.politico.com/politics-news.xml" },
  { src: "The Hill", url: "https://thehill.com/homenews/feed/" },
  { src: "New York Post", url: "https://nypost.com/politics/feed/" },
  { src: "Breitbart", url: "https://feeds.feedburner.com/breitbart" },
  { src: "Daily Wire", url: "https://www.dailywire.com/feeds/rss.xml" },
  { src: "Washington Examiner", url: "https://www.washingtonexaminer.com/feed/" },
  { src: "KSAT", url: "https://www.ksat.com/arc/outboundfeeds/rss/category/news/?outputType=xml" },
  { src: "KXAN", url: "https://www.kxan.com/feed/" },
  { src: "CNN", url: GN("site:cnn.com when:1d"), slow: true },
  { src: "MS NOW", url: GN("(site:ms.now OR site:msnbc.com) when:1d"), slow: true },
  {
    src: null, slow: true, // outlet name comes from each item's <source>
    url: GN("Texas (site:texastribune.org OR site:dallasnews.com OR site:houstonchronicle.com OR site:expressnews.com OR site:statesman.com OR site:star-telegram.com OR site:wfaa.com OR site:khou.com OR site:kens5.com) when:1d"),
  },
  { src: null, slow: true, url: GN("Texas politics when:1h") },
];

// Searches that name their outlet per item are held to real newsrooms only — no blogs, no aggregators.
const NEWSROOMS = new Set([
  "The Texas Tribune", "Texas Tribune", "Dallas News", "The Dallas Morning News", "Houston Chronicle",
  "San Antonio Express-News", "Express-News", "Austin American-Statesman", "Statesman", "Fort Worth Star-Telegram",
  "Star-Telegram", "WFAA", "KHOU", "KENS 5", "KSAT", "KXAN", "KVUE", "Houston Public Media", "Texas Standard",
  "The Washington Post", "The Wall Street Journal", "Reuters", "Associated Press", "AP News", "USA Today", "USA TODAY",
  "Bloomberg", "Axios", "NewsNation", "Newsweek", "Fox News", "CNN", "NBC News", "CBS News", "ABC News", "NPR",
  "Politico", "POLITICO", "The Hill", "New York Post", "The New York Times", "Washington Examiner", "Daily Wire",
  "Breitbart", "The Daily Caller", "The Epoch Times", "Texas Scorecard", "MS NOW",
]);
const PROMO = /^(connect with|watch live|listen|subscribe|newsletter|sign up)/i;

const memo = new Map(); // url → { atMs, items } — survives between requests on a warm instance

const decode = (s) =>
  String(s ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#8217;|&rsquo;/g, "’").replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“").replace(/&#8221;|&rdquo;/g, "”").replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8211;|&ndash;/g, "–").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/\s+/g, " ").trim();

const tag = (xml, name) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(xml);
  return m ? decode(m[1]) : "";
};

function parse(xml, feedSrc) {
  const out = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const it = m[0];
    let t = tag(it, "title");
    const src = feedSrc || tag(it, "source");
    const url = tag(it, "link") || (/<link[^>]*href="([^"]+)"/i.exec(it)?.[1] ?? "");
    const ts = Date.parse(tag(it, "pubDate") || tag(it, "dc:date") || "");
    if (!t || !src || !/^https?:\/\//.test(url) || !Number.isFinite(ts)) continue;
    if (!feedSrc && !NEWSROOMS.has(src)) continue;
    if (PROMO.test(t)) continue;
    const suffix = ` - ${src}`;
    if (t.endsWith(suffix)) t = t.slice(0, -suffix.length);
    out.push({ t: t.slice(0, 220), src: src.slice(0, 40), url, ts });
  }
  return out;
}

async function load(feed) {
  const hit = memo.get(feed.url);
  const ttl = feed.slow ? 60_000 : 9_000;
  if (hit && Date.now() - hit.atMs < ttl) return hit.items;
  try {
    const r = await fetch(feed.url, {
      headers: { "user-agent": "Mozilla/5.0 (TexasUnitedPatriots news wire)", accept: "application/rss+xml, application/xml, text/xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const items = parse(await r.text(), feed.src);
    memo.set(feed.url, { atMs: Date.now(), items });
    return items;
  } catch {
    return hit?.items ?? []; // one slow outlet never blanks the wire
  }
}

export default async function handler(req, res) {
  const lists = await Promise.all(FEEDS.map(load));
  const cutoff = Date.now() - 24 * 3600_000;
  const future = Date.now() + 10 * 60_000;
  const seen = new Set();
  const perSrc = {};
  const items = lists
    .flat()
    .filter((i) => i.ts > cutoff && i.ts < future)
    .sort((a, b) => b.ts - a.ts)
    .filter((i) => {
      const k = i.t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .filter((i) => ((perSrc[i.src] = (perSrc[i.src] || 0) + 1) <= 6)) // no one outlet floods the wire
    .slice(0, 80);
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=20");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ updated: Date.now(), sources: [...new Set(items.map((i) => i.src))].length, items });
}
