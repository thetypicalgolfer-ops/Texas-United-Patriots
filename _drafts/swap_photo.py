# Give an article its own hero photo (Bart, 2026-11-12: no photo repeated across articles).
# Usage: python3 _drafts/swap_photo.py <slug> <source.png>  -> writes <slug>.webp + <slug>_og.jpg and repoints the
# article page (hero + og/twitter) and its cards on index.html / news.html.
import os, re, subprocess, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug, src = sys.argv[1], sys.argv[2]
os.chdir(ROOT)
os.makedirs("Media Assets/articles-2026-11-12", exist_ok=True)
shutil.copy(src, f"Media Assets/articles-2026-11-12/{slug}-master.png")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-vf", "scale=1600:-2", "-quality", "82", f"{slug}.webp"], check=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-vf", "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630", "-q:v", "3", f"{slug}_og.jpg"], check=True)
p = f"articles/{slug}.html"; s = open(p).read()
old = re.search(r'class="w-full h-\[50vh\][^"]*" src="\.\./([^"/]+)\.webp"', s).group(1)
s = s.replace(f"../{old}.webp", f"../{slug}.webp").replace(f"/{old}_og.jpg", f"/{slug}_og.jpg")
open(p, "w").write(s)
for f in ("index.html", "news.html"):
    t = open(f).read()
    def fix(m): return m.group(0).replace(f"./{old}.webp", f"./{slug}.webp")
    t2 = re.sub(r'<a href="\./articles/%s\.html".*?</a>' % re.escape(slug), fix, t, flags=re.S)
    if t2 != t: open(f, "w").write(t2)
print(slug, "was", old)
