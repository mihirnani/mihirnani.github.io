"""Build atlas/data/gaze.js: the European Gaze map list from the filenames, the page titles and the room pages.
Run: python3 atlas/tools/make_gaze.py  (set GAZE_DIR if the map collection is not checked out beside this repository)"""
import json, re, glob, html
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))                 # the site repository
GAZE = os.environ.get("GAZE_DIR", os.path.abspath(os.path.join(ROOT, "..", "european-gaze")))   # the map collection's repository
EG = GAZE
OUT = os.path.join(ROOT, "atlas", "data", "gaze.js")

rooms = []
room_of = {}
for rp in sorted(glob.glob(f"{EG}/0*_*.html")):
    fn = os.path.basename(rp)
    n = int(fn[:2])
    s = open(rp, encoding="utf-8").read()
    t = re.search(r"<title>(.*?) – The European Gaze", s)
    title = html.unescape(t.group(1)) if t else fn[3:-5].replace("-", " ")
    rooms.append({"n": n, "file": fn, "title": title})
    for m in set(re.findall(r'href="((?:c)?1\d{3}__[^"]+\.html)"', s)):
        room_of.setdefault(m, n)

maps = []
for mp in sorted(glob.glob(f"{EG}/1*.html") + glob.glob(f"{EG}/c1*.html")):
    fn = os.path.basename(mp)
    parts = fn[:-5].split("__")
    y = parts[0]
    approx = y.startswith("c")
    year = int(y.lstrip("c"))
    if len(parts) == 4:
        region, maker, slug = parts[1], parts[2], parts[3]
    elif len(parts) == 3:
        # 1946__Ministerio-das-Colonias__Goa-Daman-Diu: no region slot; the maker is the Portuguese colonial ministry
        region, maker, slug = "Goa", parts[1], parts[2]
    else:
        raise SystemExit("unexpected filename " + fn)
    s = open(mp, encoding="utf-8").read()
    t = re.search(r"<title>(.*?) – The European Gaze", s)
    full = html.unescape(t.group(1)) if t else slug.replace("-", " ")
    m = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", full)
    title, date_label = (m.group(1), m.group(2)) if m else (full, str(year))
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    maps.append({
        "file": fn, "year": year, "approx": approx, "date_label": date_label,
        "region": region, "maker": maker.replace("-", " "), "title": title,
        "room": room_of.get(fn),
    })
maps.sort(key=lambda m: (m["year"], m["file"]))
missing = [m["file"] for m in maps if m["room"] is None]
print("maps", len(maps), "rooms", len(rooms), "no room:", missing)
from collections import Counter
print(Counter(m["region"] for m in maps))

js = ("/* gaze.js – the map list of The European Gaze on India, read from the collection's filenames\n"
      "   (YEAR__Region__Maker__Title.html), page titles and room pages. Generated; regenerate rather than edit. */\n"
      "window.ATLAS_GAZE = " + json.dumps({"base": "https://naniwadekar.com/european-gaze/", "rooms": rooms, "maps": maps},
                                          ensure_ascii=False, indent=1) + ";\n")
open(OUT, "w", encoding="utf-8").write(js)
print("wrote", OUT, len(js.encode()), "bytes")
