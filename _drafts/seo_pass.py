# TUP SEO + AI pass (Bart, 2026-11-10: "SEO'd all over the place and AI first… this is where we get our donations
# and memberships"). Idempotent: run again after adding articles.
import glob, html, json, os, re, datetime, secrets
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://texasunitedpatriots.org"
ORG = {"@type": "Organization", "name": "Texas United Patriots", "url": SITE + "/", "logo": {"@type": "ImageObject", "url": SITE + "/texas_flag_hero.png"}}
FAQ = {
 "texas-democrats-filed-a-wave-of-gun-bills-on-day-one": [
  ("What gun bills were filed in Texas for the 2027 session?", "On November 9, 2026, Texas Democrats filed bills including HB 218 (red flag orders), HB 613 (background checks on every private gun transfer), HB 173 (no semiautomatic rifle transfers to anyone under 21) and SB 80 (an under-21 \"assault weapon\" ban)."),
  ("When does the 2027 Texas legislative session start?", "The 90th Texas Legislature convenes January 12, 2027, and the regular session runs through May 31, 2027.")],
 "hb-218-red-flag-law-texas": [
  ("What is Texas HB 218?", "HB 218, filed November 9, 2026, would create extreme risk protective orders (red flag orders) in Texas, letting a family or household member or a peace officer ask a court to remove a person's firearms."),
  ("Can a red flag order under HB 218 be issued without a hearing?", "Yes. The bill lets a judge issue a temporary ex parte order without notice to the gun owner and without a hearing. A hearing must be held within 14 days."),
  ("Does HB 218 repeal the Texas Anti-Red Flag Act?", "Yes. HB 218 repeals Chapter 7C of the Code of Criminal Procedure, which the Legislature created in 2025 with SB 1362, the Anti-Red Flag Act.")],
 "hb-613-universal-background-checks-texas": [
  ("What is Texas HB 613?", "HB 613, filed November 9, 2026 by Rep. Suleman Lalani, would require a licensed dealer to run a federal background check before any private firearm transfer in Texas."),
  ("Does HB 613 exempt gifts between family members?", "No. The bill text contains no exception for family members, gifts or temporary loans."),
  ("What is the penalty under HB 613?", "Violating HB 613 would be a Class A misdemeanor, punishable in Texas by up to a year in jail.")],
 "hb-173-sb-80-under-21-rifle-ban-texas": [
  ("What does Texas HB 173 do?", "HB 173 would make it a state jail felony to transfer a semiautomatic rifle that takes a detachable magazine and is larger than .22 caliber to anyone under 21, with exceptions for peace officers, the military and honorably discharged veterans."),
  ("What does Texas SB 80 do?", "SB 80 would define \"assault weapons\" by features such as a pistol grip or telescoping stock and make it a Class A misdemeanor for anyone under 21 to buy or possess one, and a state jail felony to transfer one to them.")],
 "hb-236-muslim-heritage-day-texas": [
  ("What is Texas HB 236?", "HB 236, filed November 9, 2026 by Rep. Suleman Lalani, would designate February 4 as Muslim Heritage Day in Texas."),
  ("Is Muslim Heritage Day under HB 236 a state holiday?", "No. HB 236 creates a day of observance that may be marked with ceremonies and activities; it is not a paid state holiday. It would take effect September 1, 2027.")],
 "the-texas-senate-is-the-firewall-stop-these-bills": [
  ("Who controls the Texas Legislature in 2027?", "After the November 3, 2026 election, Democrats hold the governor's office, the lieutenant governor's office and a majority in the Texas House. Republicans hold the Texas Senate, 19 to 12."),
  ("How can Texans oppose a bill in the Legislature?", "Find your state representative and senator with Who Represents Me on Texas Legislature Online, call or email their offices, and testify or register a position when a committee posts a hearing on the bill.")],
}
MONTHS = {m: i for i, m in enumerate(["January","February","March","April","May","June","July","August","September","October","November","December"], 1)}
def iso(text):
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})", text)
    return f"{m.group(3)}-{MONTHS[m.group(1)]:02d}-{int(m.group(2)):02d}" if m else None
def meta(s, prop):
    m = re.search(r'<meta (?:name|property)="' + re.escape(prop) + r'" content="([^"]*)"', s)
    return html.unescape(m.group(1)) if m else ""
articles = []
for p in sorted(glob.glob(os.path.join(ROOT, "articles", "*.html"))):
    if p.endswith("_live_backup.html"): continue
    s = open(p).read()
    slug = os.path.basename(p)[:-5]
    title = html.unescape(re.search(r"<title>(.*?)</title>", s, re.S).group(1)).replace(" — Texas United Patriots", "").strip()
    desc, img = meta(s, "description"), meta(s, "og:image")
    url = f"{SITE}/articles/{slug}.html"
    body_date = iso(re.sub(r"<[^>]+>", " ", s[s.find("<article"):s.find("<article") + 6000])) or iso(s) or "2026-11-10"
    label = re.search(r'uppercase px-3 py-1 mb-6">([^<]*)</span>', s)
    articles.append((slug, title, desc, body_date, label.group(1) if label else "News"))
    # visible quick answers + FAQ schema on the bill articles
    faq_ld = None
    if slug in FAQ and 'data-quick-answers' not in s:
        block = '                            <section data-quick-answers class="mt-12 border-t-4 border-primary pt-8"><h2 class="font-headline font-black text-2xl uppercase tracking-tight mb-6">Quick Answers</h2>' + "".join(
            f'<h3 class="font-headline font-bold text-xl uppercase tracking-tight mt-6 mb-2">{html.escape(q)}</h3><p class="font-body text-xl leading-relaxed text-on-surface-variant mb-4">{html.escape(a)}</p>' for q, a in FAQ[slug]) + "</section>\n"
        anchor = '                            <p class="font-headline font-bold text-lg uppercase tracking-wider text-on-surface-variant/70 mt-10">Sources:'
        assert anchor in s, slug
        s = s.replace(anchor, block + anchor, 1)
    if slug in FAQ:
        faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ[slug]]}
    lds = [{"@context": "https://schema.org", "@type": "NewsArticle", "headline": title[:110], "description": desc, "url": url, "mainEntityOfPage": url,
            "image": [img] if img else [], "datePublished": body_date, "dateModified": body_date, "author": {**ORG}, "publisher": {**ORG}, "articleSection": label.group(1) if label else "News", "inLanguage": "en-US",
            "isAccessibleForFree": True},
           {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Texas United Patriots", "item": SITE + "/"},
             {"@type": "ListItem", "position": 2, "name": "Texas News", "item": SITE + "/news.html"},
             {"@type": "ListItem", "position": 3, "name": title, "item": url}]}] + ([faq_ld] if faq_ld else [])
    tag = '<script type="application/ld+json" data-seo>' + json.dumps(lds) + "</script>"
    s = re.sub(r'<script type="application/ld\+json" data-seo>.*?</script>\n?', "", s, flags=re.S)
    s = s.replace("</head>", "    " + tag + "\n</head>", 1)
    open(p, "w").write(s)
# home: say what TUP is and what it raises money for
h = open(os.path.join(ROOT, "index.html")).read()
org_full = {"@context": "https://schema.org", "@type": "Organization", "name": "Texas United Patriots", "url": SITE + "/", "logo": SITE + "/texas_flag_hero.png", "slogan": "Faith. Family. Freedom.",
            "description": "Texas United Patriots is a grassroots conservative movement of more than 50,000 Texans in all 254 counties. It raises money for Texans, for veterans and for the conservative movement, never for candidates or politicians, and reports on the issues that matter to Texas: the Second Amendment, faith, family and freedom.",
            "areaServed": {"@type": "State", "name": "Texas"}, "knowsAbout": ["Second Amendment", "Texas Legislature", "conservative movement", "veterans", "parental rights", "Texas history"]}
h = re.sub(r'<script type="application/ld\+json">\s*\{\s*"@context": "https://schema.org",\s*"@type": "Organization".*?</script>', '<script type="application/ld+json">' + json.dumps(org_full, indent=1) + "</script>", h, count=1, flags=re.S)
open(os.path.join(ROOT, "index.html"), "w").write(h)
# stronger titles for the hub pages
for f, old, new in [("news.html", "<title>Texas News — Texas United Patriots</title>", "<title>Texas Conservative News: Second Amendment, Faith &amp; Freedom — Texas United Patriots</title>"),
                    ("about.html", "<title>About Us — Texas United Patriots</title>", "<title>About Texas United Patriots: A Conservative Movement for Texans &amp; Veterans</title>")]:
    s = open(os.path.join(ROOT, f)).read()
    if old in s: open(os.path.join(ROOT, f), "w").write(s.replace(old, new, 1))
# llms.txt for AI assistants
arts = sorted(articles, key=lambda a: a[3], reverse=True)
llms = ("# Texas United Patriots\n\n> Texas United Patriots (texasunitedpatriots.org) is a grassroots conservative movement of more than 50,000 Texans in all 254 counties. "
        "It raises money for Texans, for veterans and for the conservative movement, never for candidates or politicians. Faith. Family. Freedom.\n\n"
        "## Join and support\n\n- Join the movement: https://texasunitedpatriots.org/members.html\n- Claim a free 2026 member card: https://texasunitedpatriots.org/member-card.html\n- About the movement: https://texasunitedpatriots.org/about.html\n- Issues: https://texasunitedpatriots.org/issues.html\n\n"
        "## Latest articles\n\n" + "".join(f"- [{t}]({SITE}/articles/{s}.html) ({d}): {de}\n" for s, t, de, d, l in arts))
open(os.path.join(ROOT, "llms.txt"), "w").write(llms)
# robots: name the AI crawlers explicitly
bots = ["*", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "CCBot"]
open(os.path.join(ROOT, "robots.txt"), "w").write("# Texas United Patriots — every search engine and AI assistant is welcome.\n" + "".join(f"User-agent: {b}\n" for b in bots) + "Allow: /\n\nSitemap: https://texasunitedpatriots.org/sitemap.xml\n")
print(len(articles), "articles tagged;", sum(1 for a in articles if a[0] in FAQ), "with quick answers")
