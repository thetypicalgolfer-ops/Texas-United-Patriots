# TUP gear store (Bart, 2026-11-12: "click Come and Take It… show people in the clothes… look like a merch store…
# quantity, sizes… Nordstrom, Macy's… professional"). One page per collection: gear/<slug>.html, a product page with
# a gallery (model photo when it exists, then the flat lay), product picker, color, size, quantity, Add to Bag,
# details accordions, Complete the Look and More Collections. Bag in localStorage; checkout is a waitlist until a
# payment processor is connected. PRICES ARE DEFAULTS, set below; confirm with Bart.
import html, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
E = lambda t: html.escape(t, quote=True)
APPAREL = ["S", "M", "L", "XL", "2XL", "3XL"]
PRICE = {"tee": 28, "hoodie": 58, "cap": 30, "flag": 35, "patch": 10, "stickers": 8, "tumbler": 32}
TYPE = {"tee": "T-Shirt", "hoodie": "Hoodie", "cap": "Cap", "flag": "Flag", "patch": "Patch", "stickers": "Sticker 3-Pack", "tumbler": "Tumbler"}
SIZES = {"tee": APPAREL, "hoodie": APPAREL, "cap": ["One Size"], "flag": ["2 x 3 ft", "3 x 5 ft"], "patch": ['3" Round'], "stickers": ['3" Round'], "tumbler": ["20 oz"]}
FLAGP = {"2 x 3 ft": 25, "3 x 5 ft": 35}
DETAIL = {"tee": "Soft ringspun cotton tee with a classic unisex fit. Printed design on the front.",
          "hoodie": "Midweight fleece pullover hoodie with a front pouch pocket and drawstring hood. Unisex fit.",
          "cap": "Structured six-panel cap with an adjustable strap back. Embroidered design on the front.",
          "flag": "Printed polyester flag with a canvas header and two brass grommets for hanging, indoors or out.",
          "patch": "Embroidered patch with a merrowed edge. Iron-on backing.",
          "stickers": "Three round vinyl stickers, weatherproof for trucks, coolers and water bottles.",
          "tumbler": "Double-wall insulated stainless steel tumbler with a clear slide lid. Keeps drinks cold or hot for hours."}
C = [
 ("come-and-take-it", "Come and Take It", "The 1835 Gonzales flag: lone star, cannon, three words.", [("tee", "Heather Gray"), ("cap", "Black"), ("flag", "White")]),
 ("dont-tread-on-me", "Don't Tread on Me", "The Gadsden rattlesnake, Texas-made.", [("tee", "Olive"), ("cap", "Coyote Brown"), ("patch", "Yellow")]),
 ("proud-to-be-texan", "Proud to Be Texan", "Lone Star pride, front and center.", [("hoodie", "Navy"), ("tee", "White")]),
 ("keep-texas-clean", "Keep Texas Clean", "The old message, for a new generation.", [("tee", "Sand"), ("stickers", "White")]),
 ("christian-for-texas", "Christian for Texas", "Faith first, Texas always.", [("hoodie", "Cream"), ("tee", "Black")]),
 ("moms-for-texas", "Moms for Texas", "For the mothers holding the line.", [("tee", "Dusty Pink"), ("tumbler", "White")]),
 ("shall-not-be-infringed", "Shall Not Be Infringed", "Second Amendment, Texas style.", [("tee", "Black"), ("cap", "Washed Black")]),
 ("remember-the-alamo", "Remember the Alamo", "1836. Never forget.", [("tee", "Vintage Navy"), ("flag", "White")]),
]
src = open("news.html").read()
head, tail = src[:src.index("<main")], src[src.index("</main>") + 7:]
fix = lambda t: t.replace('href="./', 'href="../').replace('src="./', 'src="../')
head, tail = fix(head), fix(tail)
def shell(slug, title, desc, body):
    h = re.sub(r'<title>.*?</title>', f'<title>{E(title)}</title>', head, count=1, flags=re.S)
    for k in ("description", "og:description", "twitter:description"):
        h = re.sub(rf'(<meta (?:name|property)="{k}" content=")[^"]*', lambda m: m.group(1) + E(desc), h, count=1)
    for k in ("og:title", "twitter:title"):
        h = re.sub(rf'(<meta (?:name|property)="{k}" content=")[^"]*', lambda m: m.group(1) + E(title), h, count=1)
    url = f"https://texasunitedpatriots.org/gear/{slug}.html"
    h = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + url, h, count=1)
    h = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + url, h, count=1)
    h = re.sub(r'(<meta (?:property|name)="(?:og:image|twitter:image)" content=")[^"]*', lambda m: m.group(1) + f"https://texasunitedpatriots.org/gear/gear-{slug}.webp", h)
    return h + '<main class="pt-28 md:pt-32 pb-20 bg-white">\n' + body + "\n</main>" + tail
STORE_JS = open(os.path.join("_drafts", "gear_store.js")).read()
for slug, name, tag, items in C:
    prods = []
    for t, color in items:
        sizes = SIZES[t]
        prods.append(dict(id=f"{slug}-{t}", type=t, name=f"{name} {TYPE[t]}", color=color, sizes=sizes,
                          price=PRICE[t], prices={s: FLAGP[s] for s in sizes} if t == "flag" else {}, detail=DETAIL[t],
                          apparel=t in ("tee", "hoodie")))
    gallery = ([f"model-{slug}.webp"] if os.path.exists(f"gear/model-{slug}.webp") else []) + [f"gear-{slug}.webp"]
    alts = [f"A model wearing {name} gear from Texas United Patriots", f"{name} gear: " + ", ".join(p["name"] for p in prods)]
    if len(gallery) == 1: alts = alts[1:]
    thumbs = "".join(f'<button type="button" data-thumb="{i}" class="w-20 aspect-square overflow-hidden border-2 {"border-on-surface" if i == 0 else "border-transparent"}"><img src="./{g}" alt="" class="w-full h-full object-cover"/></button>' for i, g in enumerate(gallery))
    picker = "".join(f'<button type="button" data-prod="{i}" class="prod-btn text-left border-2 px-4 py-3 {"border-on-surface" if i == 0 else "border-slate-200"}"><span class="block font-headline font-bold text-lg uppercase tracking-wide">{E(TYPE[p["type"]])}</span><span class="block font-body text-base text-on-surface-variant">{E(p["color"])} · {("from $" + str(min(p["prices"].values()))) if p["prices"] else ("$" + str(p["price"]))}</span></button>' for i, p in enumerate(prods))
    others = [c for c in C if c[0] != slug]
    more = "".join(f'<a href="./{c[0]}.html" class="group block"><div class="aspect-[4/3] overflow-hidden bg-[#0a0c10]"><img src="./gear-{c[0]}.webp" alt="{E(c[1])} gear" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"/></div><h3 class="mt-3 font-headline font-black text-lg uppercase tracking-tight group-hover:text-primary">{E(c[1])}</h3><p class="font-body text-base text-on-surface-variant">{E(c[2])}</p></a>' for c in others[:4])
    body = f'''<div class="container mx-auto px-6 md:px-12 max-w-7xl">
  <nav aria-label="Breadcrumb" class="font-headline font-bold text-base uppercase tracking-wider text-on-surface-variant"><a href="../gear.html" class="hover:text-primary">Gear</a> <span class="mx-2">/</span> <span class="text-on-surface">{E(name)}</span></nav>
  <div class="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
    <div class="lg:col-span-7">
      <div class="flex flex-col-reverse md:flex-row gap-4">
        <div class="flex md:flex-col gap-3">{thumbs if len(gallery) > 1 else ""}</div>
        <div class="flex-1 overflow-hidden bg-surface-container-low"><img id="mainImg" src="./{gallery[0]}" alt="{E(alts[0])}" class="w-full aspect-[4/5] object-cover"/></div>
      </div>
    </div>
    <div class="lg:col-span-5 lg:sticky lg:top-32 self-start">
      <span class="font-headline font-bold text-lg uppercase tracking-[0.1em] text-primary">Texas United Patriots</span>
      <h1 id="pName" class="mt-2 font-headline font-black text-4xl md:text-5xl uppercase tracking-tight leading-none">{E(prods[0]["name"])}</h1>
      <p class="mt-3 font-body text-xl text-on-surface-variant">{E(tag)}</p>
      <p id="pPrice" class="mt-5 font-headline font-black text-3xl">${prods[0]["price"]}</p>
      <div class="mt-8"><p class="font-headline font-bold text-base uppercase tracking-[0.1em] mb-3">Item</p><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">{picker}</div></div>
      <p class="mt-6 font-headline font-bold text-base uppercase tracking-[0.1em]">Color: <span id="pColor" class="font-body normal-case tracking-normal text-lg">{E(prods[0]["color"])}</span></p>
      <div class="mt-6"><div class="flex items-baseline justify-between"><p class="font-headline font-bold text-base uppercase tracking-[0.1em]">Size</p><button type="button" id="fitBtn" class="font-headline font-bold text-base uppercase tracking-wider underline">Fit guide</button></div>
        <div id="sizes" class="mt-3 flex flex-wrap gap-2"></div><p id="sizeErr" class="mt-2 font-headline text-lg text-primary hidden">Please choose a size.</p></div>
      <div class="mt-6 flex items-stretch gap-3">
        <div class="flex items-center border-2 border-on-surface"><button type="button" id="qMinus" class="w-12 h-14 text-2xl" aria-label="Fewer">&minus;</button><span id="qty" class="w-10 text-center font-headline font-black text-xl">1</span><button type="button" id="qPlus" class="w-12 h-14 text-2xl" aria-label="More">+</button></div>
        <button type="button" id="addBtn" class="flex-1 bg-primary hover:bg-primary-container text-white font-headline font-black text-lg uppercase tracking-[0.08em] transition-colors">Add to Bag</button>
      </div>
      <p class="mt-4 font-body text-lg text-on-surface-variant">Made for Texans. Every purchase supports the movement.</p>
      <div class="mt-8 divide-y divide-slate-200 border-y border-slate-200">
        <details open class="py-4"><summary class="cursor-pointer font-headline font-bold text-lg uppercase tracking-wide">Details</summary><p id="pDetail" class="mt-3 font-body text-lg text-on-surface-variant">{E(prods[0]["detail"])}</p></details>
        <details class="py-4"><summary class="cursor-pointer font-headline font-bold text-lg uppercase tracking-wide">Fit &amp; Size</summary><p class="mt-3 font-body text-lg text-on-surface-variant">Apparel is a classic unisex fit. If you are between sizes or like a relaxed fit, size up.</p></details>
        <details class="py-4"><summary class="cursor-pointer font-headline font-bold text-lg uppercase tracking-wide">Shipping &amp; Returns</summary><p class="mt-3 font-body text-lg text-on-surface-variant">Shipping, delivery times and returns are confirmed at checkout when the store opens.</p></details>
      </div>
    </div>
  </div>
  <section class="mt-20 border-t-2 border-on-surface pt-6"><h2 class="font-headline font-black text-2xl uppercase tracking-tight">More Collections</h2><div class="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6">{more}</div>
    <div class="mt-10 text-center"><a href="../gear.html" class="inline-flex border-2 border-on-surface px-10 py-4 font-headline font-black text-lg uppercase tracking-[0.08em] hover:bg-on-surface hover:text-white transition-colors">All Gear &rarr;</a></div></section>
</div>
<script>window.TUP_PRODUCTS = {json.dumps(prods)}; window.TUP_GALLERY = {json.dumps(gallery)};</script>
<script>{STORE_JS}</script>'''
    os.makedirs("gear", exist_ok=True)
    open(f"gear/{slug}.html", "w").write(shell(slug, f"{name} Gear — Texas United Patriots", f"{name} gear from Texas United Patriots: {', '.join(TYPE[t] for t, _ in items)}. {tag}", body))
# Link the collection cards on gear.html
g = open("gear.html").read()
for slug, name, _, _ in C:
    g = re.sub(r'(<img src="\./gear/gear-%s\.webp"[^>]*/></div>.*?)<a data-etsy-link href="#notify"([^>]*)>Coming soon</a>' % re.escape(slug),
               lambda m: m.group(1) + f'<a href="./gear/{slug}.html"' + m.group(2) + '>Shop Now</a>', g, count=1, flags=re.S)
    g = g.replace(f'<div class="aspect-[4/3] overflow-hidden bg-[#0a0c10]"><img src="./gear/gear-{slug}.webp"', f'<a href="./gear/{slug}.html" class="block aspect-[4/3] overflow-hidden bg-[#0a0c10]"><img src="./gear/gear-{slug}.webp"', 1)
g = re.sub(r'(<a href="\./gear/[a-z-]+\.html" class="block aspect-\[4/3\] overflow-hidden bg-\[#0a0c10\]"><img [^>]*/>)</div>', r'\1</a>', g)
open("gear.html", "w").write(g)
print("built", len(C), "collection pages")
