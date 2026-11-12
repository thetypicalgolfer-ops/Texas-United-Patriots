# Rebuilds the home page news block from news.html, newest first (Bart, 2026-11-12: "When new articles come in run
# them in the main spot and then continue in order… don't just shove them to the bottom"). Run after adding an
# article to news.html. Slots: 1 lead (with the Join box) · 2 right column · 4 in the row · 6 in Latest.
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
# Kept off the home page (Bart, 2026-11-12: take the election and politician pieces off the front).
SKIP = {"the-2028-race-starts-today", "every-vote-counts-become-a-poll-watcher", "your-precinct-chair-seat-is-empty-take-it",
        "how-tx-23-slipped-away", "texas-woke-up-blue-here-is-who-stayed-home", "governor-hinojosa-what-changes-on-day-one",
        "senator-talarico-what-it-means-for-texas-in-washington", "they-organized-we-complained",
        "district-125-is-open-and-the-landslide-was-not-one", "adrian-reyna-wrong-for-district-125"}
news = open("news.html").read()
A = []
for m in re.finditer(r'<a href="\./articles/([^"]+)\.html" class="group grid grid-cols-\[1fr_104px\](.*?)</a>', news, re.S):
    slug, b = m.group(1), m.group(2)
    if slug in SKIP: continue
    g = lambda p: (re.search(p, b, re.S) or [None, ""])[1].strip()
    A.append(dict(slug=slug, img=g(r'src="\./([^"]+)"'), alt=g(r'<img alt="([^"]*)"'), label=g(r'text-primary">([^<]*)</span>'),
                  title=g(r'<h2[^>]*>(.*?)</h2>'), dek=g(r'<p class="hidden md:block[^"]*">(.*?)</p>'),
                  date=g(r'wide text-on-surface-variant">([^&<]*)'), read=g(r'·&nbsp; (\d+) min read')))
lead, right, row, latest = A[0], A[1:3], A[3:7], A[7:13]
when = lambda a: a["date"] + (f' &nbsp;·&nbsp; {a["read"]} min read' if a["read"] else "")
s = open("index.html").read()
ad = re.search(r'\n\s*<aside class="hidden lg:flex mt-10.*?</aside>', s, re.S).group(0)
out = f'''<div class="mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-y-8">
                    <div class="lg:col-span-8 lg:pr-10">
                    <a href="./articles/{lead["slug"]}.html" class="group block">
                        <div class="overflow-hidden"><img alt="{lead["alt"]}" loading="lazy" class="w-full aspect-[16/10] object-cover group-hover:scale-[1.03] transition-transform duration-500" src="./{lead["img"]}"/></div>
                        <span class="block font-headline font-bold text-xl uppercase tracking-[0.08em] text-primary mt-5">{lead["label"]}</span>
                        <h3 class="mt-2 font-body font-bold text-on-surface group-hover:text-primary transition-colors text-4xl sm:text-5xl lg:text-6xl leading-[1.04] tracking-tight">{lead["title"]}</h3>
                        <p class="mt-4 font-body text-xl md:text-2xl leading-relaxed text-on-surface-variant max-w-3xl">{lead["dek"]}</p>
                        <p class="mt-4 font-headline font-bold text-lg uppercase tracking-wide text-on-surface-variant">{when(lead)}</p>
                    </a>{ad}
                    </div>
                    <div class="lg:col-span-4 lg:pl-10 lg:border-l border-slate-300 divide-y divide-slate-200 border-t lg:border-t-0 pt-6 lg:pt-0">
''' + "".join(f'''                        <a href="./articles/{a["slug"]}.html" class="group grid grid-cols-[1fr_128px] lg:grid-cols-1 gap-4 py-6 first:pt-0 lg:first:pt-0">
                            <div class="min-w-0 lg:order-2">
                                <span class="block font-headline font-bold text-xl uppercase tracking-[0.08em] text-primary">{a["label"]}</span>
                                <h3 class="mt-1.5 font-body font-bold text-on-surface group-hover:text-primary transition-colors text-2xl lg:text-3xl leading-tight">{a["title"]}</h3>
                                <p class="hidden lg:block mt-2 font-body text-xl leading-relaxed text-on-surface-variant">{a["dek"]}</p>
                                <p class="mt-2 font-headline font-bold text-lg uppercase tracking-wide text-on-surface-variant">{a["date"]}</p>
                            </div>
                            <div class="overflow-hidden lg:order-1"><img alt="{a["alt"]}" loading="lazy" class="w-full aspect-square lg:aspect-[16/9] object-cover group-hover:scale-[1.03] transition-transform duration-500" src="./{a["img"]}"/></div>
                        </a>
''' for a in right) + '''                    </div>
                </div>

                <div class="mt-10 border-t-2 border-on-surface pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-slate-200">
''' + "".join(f'''                    <a href="./articles/{a["slug"]}.html" class="group block py-5 lg:py-0 lg:px-6 first:lg:pl-0 last:lg:pr-0">
                        <span class="block font-headline font-bold text-xl uppercase tracking-[0.08em] text-primary">{a["label"]}</span>
                        <h4 class="mt-1.5 font-body font-bold text-on-surface group-hover:text-primary transition-colors text-2xl leading-snug">{a["title"]}</h4>
                        <p class="mt-2 font-headline font-bold text-lg uppercase tracking-wide text-on-surface-variant">{a["date"]}</p>
                    </a>
''' for a in row) + '''                </div>

                <div class="mt-12">
                    <div class="flex items-baseline justify-between border-b-2 border-on-surface pb-2">
                        <h3 class="font-headline font-black text-xl uppercase tracking-[0.08em]">Latest</h3>
                        <a href="./news.html" class="font-headline font-bold text-lg uppercase tracking-wide text-primary hover:underline">See all &rarr;</a>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-12 divide-y divide-slate-200 lg:divide-y-0">
''' + "".join(f'''                    <a href="./articles/{a["slug"]}.html" class="group grid grid-cols-[1fr_128px] gap-5 py-6">
                        <div class="min-w-0">
                            <span class="block font-headline font-bold text-xl uppercase tracking-[0.08em] text-primary">{a["label"]}</span>
                            <h4 class="mt-1.5 font-body font-bold text-on-surface group-hover:text-primary transition-colors text-2xl leading-snug">{a["title"]}</h4>
                            <p class="mt-2 font-headline font-bold text-lg uppercase tracking-wide text-on-surface-variant">{when(a)}</p>
                        </div>
                        <div class="overflow-hidden"><img alt="{a["alt"]}" loading="lazy" class="w-full aspect-square object-cover group-hover:scale-[1.03] transition-transform duration-500" src="./{a["img"]}"/></div>
                    </a>
''' for a in latest) + '''                    </div>
                </div>

                '''
a0 = s.index('<div class="mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-y-8">')
b0 = s.index('<div class="mt-12 text-center">', a0)
open("index.html", "w").write(s[:a0] + out + s[b0:])
print("lead:", lead["slug"]); print("right:", [a["slug"] for a in right]); print("row:", [a["slug"] for a in row]); print("latest:", [a["slug"] for a in latest])
