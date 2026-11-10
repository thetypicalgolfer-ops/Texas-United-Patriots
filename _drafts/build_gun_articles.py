import html, os, re, sys, importlib.util
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("g", os.path.join(ROOT, "_drafts", "gun_bills_2027.py")); g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
E = lambda t: html.escape(t, quote=True)
TPL = open(os.path.join(ROOT, "articles", "the-legislature-is-still-ours-now-it-has-to-fight.html")).read()
OLD_T = "The Legislature Is Still Ours. Now It Has to Fight."
OLD_D = "With a Democratic governor, the Texas Legislature is the last line of defense. Lawmakers who got comfortable need to get uncomfortable."
DATE = "November 10, 2026"
for a in g.ARTICLES:
    s = TPL
    s = s.replace(f"{OLD_T} — Texas United Patriots", f"{E(a['title'])} — Texas United Patriots")
    s = s.replace(OLD_D, E(a["desc"]))
    s = s.replace("the-legislature-is-still-ours-now-it-has-to-fight.html", f"{a['slug']}.html")
    s = s.replace("board-room-hero_og.jpg", f"{a['img']}_og.jpg")
    s = s.replace('<img alt="A legislative chamber with rows of desks" class="w-full h-[50vh] object-cover" src="../board-room-hero.webp"/>', f'<img alt="{E(a["alt"])}" class="w-full h-[50vh] object-cover" src="../{a["img"]}.webp"/>')
    s = s.replace('uppercase px-3 py-1 mb-6">Opinion</span>', f'uppercase px-3 py-1 mb-6">{E(a["label"])}</span>')
    s = s.replace(f'uppercase mb-6">{OLD_T}</h1>', f'uppercase mb-6">{E(a["title"])}</h1>')
    s = s.replace('November 7, 2026</span>\n                            <span class="text-slate-300">|</span>\n                            <span class="font-headline font-bold text-lg uppercase tracking-wider text-on-surface-variant">4 min read</span>',
                  f'{DATE}</span>\n                            <span class="text-slate-300">|</span>\n                            <span class="font-headline font-bold text-lg uppercase tracking-wider text-on-surface-variant">{a["read"]} min read</span>')
    body = f'                            <p class="font-body text-xl leading-relaxed text-on-surface mb-6 italic">{E(a["lead"])}</p>\n'
    for h, t in a["body"]:
        body += f'                            <h2 class="font-headline font-black text-2xl uppercase tracking-tight mt-12 mb-4">{E(h)}</h2>\n'
        body += f'                            <p class="font-body text-xl leading-relaxed text-on-surface-variant mb-6">{E(t)}</p>\n'
    body += '                            <p class="font-headline font-bold text-lg uppercase tracking-wider text-on-surface-variant/70 mt-10">Sources: ' + " · ".join(f'<a class="text-primary underline" href="{u}" rel="noopener" target="_blank">{E(n)}</a>' for n, u in a["sources"]) + "</p>\n"
    m = re.search(r'(<div class="prose prose-lg max-w-none">\n)(.*?)(</div>\n\n                    </div>\n                </div>)', s, re.S)
    assert m, a["slug"]
    s = s[:m.start(2)] + body + s[m.end(2):]
    assert OLD_T not in s and "4 min read" not in s or a["read"] == 4, a["slug"]
    open(os.path.join(ROOT, "articles", f"{a['slug']}.html"), "w").write(s)
    print("wrote", a["slug"], len(" ".join(t for _, t in a["body"]).split()) + len(a["lead"].split()), "words")
