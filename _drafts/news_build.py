# TUP newsroom builder (Bart, 2026-11-12: "I don't want the news page to just run on… look at New York Times… this
# will turn into thousands of articles and it needs to handle that").
# One source of truth: _drafts/articles.json (newest first). Builds:
#   news.html                 front page: lead + 2 secondary + top headlines, a block per section, Latest, archive link
#   news/<section>.html(-N)   one page per section, 20 stories a page, numbered pages
#   news/all.html(-N)         the full archive, 20 a page
# Then run _drafts/home_news.py. To publish an article: add its dict at the TOP of articles.json and run both.
import html, json, math, os, re, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SITE = "https://texasunitedpatriots.org"; PER = 20
SECTIONS = [  # slug, name, labels that belong to it
 ("second-amendment", "Second Amendment", {"Second Amendment"}),
 ("election-integrity", "Election Integrity", {"Election Integrity", "2026 Election", "2026 Election · TX-23", "2028 Election", "2026 Election &middot; District 125", "Get Involved"}),
 ("faith-and-values", "Faith & Values", {"Faith &amp; Values", "Faith · Family · Freedom", "Faith & Values"}),
 ("education", "Education", {"Education", "Higher Education", "Campus Watch", "Investigation", "Parental Rights"}),
 ("texas-history", "Texas History", {"Texas History"}),
 ("policy-and-analysis", "Policy & Analysis", {"Analysis", "Opinion", "Take Action", "National", "Energy &amp; Economy", "State Sovereignty"}),
]
J = os.path.join("_drafts", "articles.json")
if not os.path.exists(J):  # first run: lift the existing cards out of the old news.html
    old = open("news.html").read(); A = []
    for m in re.finditer(r'<a href="\./articles/([^"]+)\.html" class="group grid grid-cols-\[1fr_104px\](.*?)</a>', old, re.S):
        b = m.group(2); g = lambda p: (re.search(p, b, re.S) or [None, ""])[1].strip()
        A.append(dict(slug=m.group(1), label=html.unescape(g(r'text-primary">([^<]*)</span>')), title=html.unescape(g(r'<h2[^>]*>(.*?)</h2>')),
                      dek=html.unescape(g(r'<p class="hidden md:block[^"]*">(.*?)</p>')), date=g(r'wide text-on-surface-variant">([^&<]*)'),
                      read=g(r'·&nbsp; (\d+) min read'), img=g(r'src="\./([^"]+)"'), alt=html.unescape(g(r'<img alt="([^"]*)"'))))
    json.dump(A, open(J, "w"), indent=1, ensure_ascii=False)
A = json.load(open(J))
E = lambda t: html.escape(t, quote=True)
sec_of = {}
for slug, name, labels in SECTIONS:
    for l in labels: sec_of[html.unescape(l)] = (slug, name)
for a in A: a["sec"] = sec_of.get(a["label"], ("policy-and-analysis", "Policy & Analysis"))
iso = lambda a: datetime.datetime.strptime(a["date"], "%B %d, %Y").date().isoformat()
src = open("news.html").read()
head, tail = src[:src.index("<main")], src[src.index("</main>") + 7:]
def shell(body, path, title, desc, depth):
    h, t = head, tail
    if depth:
        h = h.replace('href="./', 'href="../').replace('src="./', 'src="../'); t = t.replace('href="./', 'href="../').replace('src="./', 'src="../')
    h = re.sub(r'<title>.*?</title>', f'<title>{E(title)}</title>', h, count=1, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + E(desc), h, count=1)
    for k in ("og:title", "twitter:title"): h = re.sub(rf'(<meta (?:property|name)="{k}" content=")[^"]*', lambda m: m.group(1) + E(title), h, count=1)
    for k in ("og:description", "twitter:description"): h = re.sub(rf'(<meta (?:property|name)="{k}" content=")[^"]*', lambda m: m.group(1) + E(desc), h, count=1)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + SITE + "/" + path, h, count=1)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + SITE + "/" + path, h, count=1)
    return h + '<main class="pt-28 md:pt-32 pb-20 bg-white">\n' + body + "\n    </main>" + t
def P(depth): return "../" if depth else "./"
def nav(depth, cur=""):
    items = [("", "Front Page", "news.html")] + [(s, n, f"news/{s}.html") for s, n, _ in SECTIONS] + [("all", "Archive", "news/all.html")]
    return ('<nav aria-label="Sections" class="mt-0 border-b border-slate-300 overflow-x-auto"><ul class="flex md:flex-wrap justify-start md:justify-center gap-x-6 gap-y-2 whitespace-nowrap py-3 px-1">' +
            "".join(f'<li><a href="{P(depth)}{u}" class="font-headline font-bold text-base lg:text-lg uppercase tracking-[0.08em] {"text-primary border-b-2 border-primary pb-1" if k == cur else "text-on-surface hover:text-primary"}">{E(n)}</a></li>' for k, n, u in items) + "</ul></nav>")
def mast(depth, kicker, name, cur=""):
    return f'''        <div class="container mx-auto px-6 md:px-12 max-w-6xl">
            <header class="text-center">
                <div class="border-t-[3px] border-on-surface"></div><div class="border-t border-on-surface mt-[3px]"></div>
                <h1 class="py-5 md:py-7"><span class="block font-headline font-bold text-xl md:text-3xl uppercase tracking-[0.08em] text-primary mb-2">{kicker}</span><span class="font-masthead font-black uppercase tracking-tight {"text-6xl sm:text-8xl md:text-9xl lg:text-[9rem]" if not cur else "text-5xl sm:text-7xl md:text-8xl"} leading-[0.9] text-on-surface">{E(name)}</span></h1>
                <p id="newsDate" class="border-t border-slate-300 py-2.5 font-headline font-bold text-lg uppercase tracking-[0.18em] text-on-surface-variant">Texas United Patriots · Faith · Family · Freedom</p>
                {nav(depth, cur)}
            </header>
'''
def meta(a, rd=True): return f'{E(a["date"])}' + (f' &nbsp;·&nbsp; {E(a["read"])} min read' if rd and a.get("read") else "")
def link(a, d): return f'{P(d)}articles/{a["slug"]}.html'
def img(a, d, cls): return f'<img alt="{E(a["alt"])}" loading="lazy" class="{cls} object-cover group-hover:scale-[1.03] transition-transform duration-500" src="{P(d)}{a["img"]}"/>'
def label(a, d): return f'<a href="{P(d)}news/{a["sec"][0]}.html" class="relative z-10 font-headline font-bold text-lg uppercase tracking-[0.08em] text-primary hover:underline">{E(a["sec"][1])}</a>'
def row(a, d):  # list row for archive and section pages
    return f'''                <article class="group relative grid grid-cols-[1fr_96px] md:grid-cols-[1fr_220px] gap-5 md:gap-8 py-7">
                    <div class="min-w-0">{label(a, d)}
                        <h2 class="mt-1 font-body font-bold text-on-surface group-hover:text-primary transition-colors text-2xl md:text-3xl leading-tight"><a href="{link(a, d)}" class="after:absolute after:inset-0">{E(a["title"])}</a></h2>
                        <p class="hidden md:block mt-2 font-body text-xl leading-relaxed text-on-surface-variant">{E(a["dek"])}</p>
                        <p class="mt-2 font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{meta(a)}</p></div>
                    <div class="overflow-hidden">{img(a, d, "w-full aspect-square md:aspect-[4/3]")}</div>
                </article>'''
def pager(base, n, pages, d):
    if pages < 2: return ""
    u = lambda i: f'{P(d)}news/{base}.html' if i == 1 else f'{P(d)}news/{base}-{i}.html'
    nums = sorted({1, pages, n - 1, n, n + 1} & set(range(1, pages + 1))); out, last = [], 0
    for i in nums:
        if i - last > 1: out.append('<span class="px-2 text-on-surface-variant">…</span>')
        out.append(f'<a href="{u(i)}" class="min-w-11 h-11 px-3 inline-flex items-center justify-center font-headline font-bold text-lg {"bg-on-surface text-white" if i == n else "border border-slate-300 hover:border-primary hover:text-primary"}"{" aria-current=\"page\"" if i == n else ""}>{i}</a>'); last = i
    prev = f'<a href="{u(n - 1)}" class="font-headline font-bold text-lg uppercase tracking-wider hover:text-primary">&larr; Newer</a>' if n > 1 else "<span></span>"
    nxt = f'<a href="{u(n + 1)}" class="font-headline font-bold text-lg uppercase tracking-wider hover:text-primary">Older &rarr;</a>' if n < pages else "<span></span>"
    return f'<nav aria-label="Pages" class="mt-10 flex items-center justify-between gap-4 border-t-2 border-on-surface pt-6">{prev}<div class="flex flex-wrap gap-2">{"".join(out)}</div>{nxt}</nav>'
def listing(items, base, name, kicker, desc, cur):
    pages = max(1, math.ceil(len(items) / PER)); files = []
    for n in range(1, pages + 1):
        chunk = items[(n - 1) * PER: n * PER]; path = f"news/{base}.html" if n == 1 else f"news/{base}-{n}.html"
        body = mast(1, kicker, name, cur) + f'''            <p class="mt-6 font-headline font-bold text-lg uppercase tracking-[0.12em] text-on-surface-variant">{len(items)} stories{f" · Page {n} of {pages}" if pages > 1 else ""}</p>
            <div class="divide-y divide-slate-200 border-t border-slate-200 mt-3">
{chr(10).join(row(a, 1) for a in chunk)}
            </div>
            {pager(base, n, pages, 1)}
        </div>'''
        open(path, "w").write(shell(body, path, f"{name}{f' — Page {n}' if n > 1 else ''} — Texas United Patriots", desc, 1)); files.append(path)
    return files
os.makedirs("news", exist_ok=True)
for f in os.listdir("news"):
    if f.endswith(".html"): os.remove(os.path.join("news", f))
built = listing(A, "all", "The Archive", "★ &nbsp;Every Story&nbsp; ★", "Every Texas United Patriots story, newest first: the Second Amendment, election integrity, faith and values, education and Texas history.", "all")
by = {s: [a for a in A if a["sec"][0] == s] for s, _, _ in SECTIONS}
for s, name, _ in SECTIONS:
    if by[s]: built += listing(by[s], s, name, "★ &nbsp;Texas News&nbsp; ★", f"{name} news from Texas United Patriots: the latest stories, newest first.", s)
# Front page (Bart, 2026-11-12: election and politician pieces stay off the fronts; they remain in the archive)
SKIP = {"the-2028-race-starts-today", "every-vote-counts-become-a-poll-watcher", "your-precinct-chair-seat-is-empty-take-it",
        "how-tx-23-slipped-away", "texas-woke-up-blue-here-is-who-stayed-home", "governor-hinojosa-what-changes-on-day-one",
        "senator-talarico-what-it-means-for-texas-in-washington", "they-organized-we-complained",
        "district-125-is-open-and-the-landslide-was-not-one", "adrian-reyna-wrong-for-district-125"}
F = [a for a in A if a["slug"] not in SKIP]
lead, sec2, tops = F[0], F[1:3], F[3:8]
used = {a["slug"] for a in F[:8]}
def headline(a, d, size="text-xl"):
    return f'<article class="group relative py-4">{label(a, d)}<h3 class="mt-1 font-body font-bold {size} leading-snug text-on-surface group-hover:text-primary"><a href="{link(a, d)}" class="after:absolute after:inset-0">{E(a["title"])}</a></h3><p class="mt-1 font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{meta(a, False)}</p></article>'
front = mast(0, "★ &nbsp;The Lone Star State's&nbsp; ★", "Texas News") + f'''            <section class="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0">
                <div class="lg:col-span-6 lg:pr-8 lg:border-r border-slate-300"><article class="group relative">
                    <div class="overflow-hidden">{img(lead, 0, "w-full aspect-[16/10]")}</div>
                    <div class="mt-4">{label(lead, 0)}</div>
                    <h2 class="mt-1 font-body font-bold text-3xl md:text-5xl leading-[1.05] tracking-tight text-on-surface group-hover:text-primary"><a href="{link(lead, 0)}" class="after:absolute after:inset-0">{E(lead["title"])}</a></h2>
                    <p class="mt-3 font-body text-xl md:text-2xl leading-relaxed text-on-surface-variant">{E(lead["dek"])}</p>
                    <p class="mt-3 font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{meta(lead)}</p>
                </article>
                <aside class="hidden lg:flex mt-8 items-center gap-6 bg-[#002868] text-white px-8 py-7 border-b-4 border-[#BF0A30]" aria-label="Join Texas United Patriots"><svg class="w-12 h-12 shrink-0 fill-white" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l3.1 7 7.6.7-5.8 5 1.8 7.5L12 17.9l-6.7 3.9 1.8-7.5-5.8-5 7.6-.7z"/></svg><div class="min-w-0"><span class="block font-headline font-bold text-base uppercase tracking-[0.12em] text-[#ffb3b3]">A Movement of the People</span><p class="mt-1 font-body font-bold text-2xl leading-tight">50,000+ Texans in all 254 counties. Are you in?</p><div class="mt-4 flex flex-wrap gap-3"><a href="./contact.html" class="relative z-10 inline-flex items-center bg-[#BF0A30] hover:bg-white hover:text-[#002868] transition-colors font-headline font-black uppercase tracking-wider px-6 h-11">Join the Movement &rarr;</a><a href="./members.html" class="relative z-10 inline-flex items-center border-2 border-white/70 hover:bg-white hover:text-[#002868] transition-colors font-headline font-bold uppercase tracking-wider px-5 h-11">Become a Member</a></div></div></aside></div>
                <div class="lg:col-span-3 lg:px-8 lg:border-r border-slate-300 divide-y divide-slate-200 border-t lg:border-t-0 border-slate-300">
{"".join(f'<article class="group relative py-5 first:pt-0"><div class="overflow-hidden">{img(a, 0, "w-full aspect-[16/10]")}</div><div class="mt-3">{label(a, 0)}</div><h3 class="mt-1 font-body font-bold text-2xl leading-snug text-on-surface group-hover:text-primary"><a href="{link(a, 0)}" class="after:absolute after:inset-0">{E(a["title"])}</a></h3><p class="mt-1 font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{meta(a, False)}</p></article>' for a in sec2)}
                </div>
                <div class="lg:col-span-3 lg:pl-8 border-t lg:border-t-0 border-slate-300">
                    <h2 class="font-headline font-black text-xl uppercase tracking-[0.1em] border-b-2 border-on-surface pb-2">Top Stories</h2>
                    <div class="divide-y divide-slate-200">{"".join(headline(a, 0, "text-xl") for a in tops)}</div>
                </div>
            </section>
'''
def filler(s, name, n):
    return f'<a href="./news/{s}.html" class="group block mt-4 bg-surface-container-low border border-slate-200 px-6 py-6 hover:border-primary"><span class="block font-headline font-bold text-base uppercase tracking-[0.12em] text-primary">{E(name)}</span><span class="mt-1 block font-body font-bold text-2xl leading-snug text-on-surface group-hover:text-primary">Every {E(name)} story in one place</span><span class="mt-2 block font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{n} {"story" if n == 1 else "stories"} &nbsp;·&nbsp; Read them all &rarr;</span></a>'
for s, name, _ in SECTIONS:
    fs = [a for a in by[s] if a["slug"] not in SKIP]
    items = [a for a in fs if a["slug"] not in used][:4] or fs[:4]
    if not items: continue
    f0, rest = items[0], items[1:]
    front += f'''            <section class="mt-14">
                <div class="flex items-baseline justify-between border-t-2 border-on-surface pt-3"><h2 class="font-masthead font-black text-3xl md:text-4xl uppercase tracking-tight"><a href="./news/{s}.html" class="hover:text-primary">{E(name)} <span class="text-primary">&rsaquo;</span></a></h2><a href="./news/{s}.html" class="font-headline font-bold text-lg uppercase tracking-wide text-primary hover:underline">More in {E(name)} &rarr;</a></div>
                <div class="mt-5 grid grid-cols-1 md:grid-cols-12 gap-8">
                    <article class="group relative md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5"><div class="overflow-hidden">{img(f0, 0, "w-full aspect-[4/3]")}</div><div><h3 class="font-body font-bold text-2xl md:text-3xl leading-tight text-on-surface group-hover:text-primary"><a href="{link(f0, 0)}" class="after:absolute after:inset-0">{E(f0["title"])}</a></h3><p class="mt-2 font-body text-lg leading-relaxed text-on-surface-variant">{E(f0["dek"])}</p><p class="mt-2 font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{meta(f0)}</p></div></article>
                    <div class="md:col-span-5 divide-y divide-slate-200 md:border-l md:pl-8 border-slate-300">{"".join(f'<article class="group relative py-4 first:pt-0"><h3 class="font-body font-bold text-xl leading-snug text-on-surface group-hover:text-primary"><a href="{link(a, 0)}" class="after:absolute after:inset-0">{E(a["title"])}</a></h3><p class="mt-1 font-headline font-bold text-base uppercase tracking-wide text-on-surface-variant">{meta(a, False)}</p></article>' for a in rest)}{filler(s, name, len(by[s])) if len(rest) < 3 else ''}</div>
                </div>
            </section>
'''
front += f'''            <section class="mt-16 text-center border-t-[3px] border-on-surface pt-10">
                <p class="font-headline font-bold text-lg uppercase tracking-[0.15em] text-on-surface-variant">{len(A)} stories and counting</p>
                <a href="./news/all.html" class="mt-4 inline-flex items-center gap-3 border-2 border-on-surface px-10 py-4 font-headline font-black text-lg uppercase tracking-[0.08em] text-on-surface hover:bg-on-surface hover:text-white transition-colors">Browse the Full Archive <span aria-hidden="true">&rarr;</span></a>
            </section>
        </div>'''
open("news.html", "w").write(shell(front, "news.html", "Texas Conservative News: Second Amendment, Faith &amp; Freedom — Texas United Patriots".replace("&amp;", "&"), "Texas news from Texas United Patriots: the Second Amendment, election integrity, faith and values, education and Texas history.", 0))
# Sitemap: replace any news/ entries with the current set
sm = open("sitemap.xml").read()
sm = re.sub(r'\s*<url>\s*<loc>https://texasunitedpatriots.org/news/[^<]*</loc>.*?</url>', "", sm, flags=re.S)
today = datetime.date.today().isoformat()
sm = sm.replace("</urlset>", "".join(f"  <url>\n    <loc>{SITE}/{p}</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n" for p in built) + "</urlset>")
open("sitemap.xml", "w").write(sm)
print(len(A), "articles ·", len(built), "pages:", ", ".join(built))
