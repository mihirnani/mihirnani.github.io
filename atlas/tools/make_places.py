"""Build atlas/data/places.js: places of the Deccan and Basalt collections, normalised and merged.
Only ids are stored per place; titles and dates are read from the collections' own entries.js at load.
Run: python3 atlas/tools/make_places.py  (needs node to read the data files)"""
import json, re, subprocess
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))                 # the site repository
GAZE = os.environ.get("GAZE_DIR", os.path.abspath(os.path.join(ROOT, "..", "european-gaze")))   # the map collection's repository
OUT = os.path.join(ROOT, "atlas", "data", "places.js")

def load(path, var):
    js = ("const fs=require('fs'),vm=require('vm');const w={};vm.runInNewContext(fs.readFileSync(%r,'utf8'),{window:w});"
          "process.stdout.write(JSON.stringify(w[%r]));" % (path, var))
    return json.loads(subprocess.check_output(["node", "-e", js]))

deccan = load(f"{ROOT}/deccan/data/entries.js", "DECCAN_ENTRIES")
basalt = load(f"{ROOT}/basalt-and-laterite/data/entries.js", "BL_ENTRIES")

# Spelling variants -> one canonical name (the collection's most common modern form, old name in brackets)
ALIAS = {
    "ahmednagar": "Ahmadnagar", "ahmadnagar district": "Ahmadnagar",
    "chennai (madras)": "Chennai", "chennai": "Chennai",
    "gulbarga (kalaburagi)": "Kalaburagi (Gulbarga)", "kalaburagi (gulbarga)": "Kalaburagi (Gulbarga)",
    "mysore": "Mysuru (Mysore)", "mysuru": "Mysuru (Mysore)",
    "vasai (bassein)": "Vasai (Bassein)", "vasai": "Vasai (Bassein)",
    "vijayapura (bijapur)": "Bijapur", "bijapur": "Bijapur",
    "hyderabad and golconda": "Hyderabad", "hyderabad": "Hyderabad",
    "mahabaleshwar crest": "Mahabaleshwar", "mahabaleshwar": "Mahabaleshwar",
    "pollilur": "Pollilur",
    "rakkasagi-tangadagi": "Rakkasagi-Tangadagi (Talikota)",
}
# places that are regions, institutions or abroad rather than points on the peninsula
REGION = {"Berar and the Deccan cotton tracts", "Khandesh and the northern Deccan", "The Konkan edge",
          "The literature", "The Narmada valley", "Victoria and Albert Museum", "Delhi", "Réunion"}
STATES = {"Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh", "Tamil Nadu", "Kerala", "Goa", "Gujarat",
          "Madhya Pradesh", "Uttar Pradesh", "Haryana", "Delhi", "London", "Indian Ocean"}
QUALIFIER = re.compile(r"^(near |on the |source of the )|\bdistrict$|\bvalley$", re.I)

def split(place):
    parts = [p.strip() for p in place.split(",")]
    state = parts[-1] if len(parts) > 1 and parts[-1] in STATES else ""
    core = parts[:-1] if state else parts
    return core, state

# first pass: collect the names that stand alone, so 'Lalbagh, Bengaluru' can fold into 'Bengaluru'
def canon_name(core):
    """core = the comma parts before the state. Returns (name, locality)"""
    name = core[0]
    key = name.lower()
    if key in ALIAS:
        return ALIAS[key], None
    if len(core) >= 2:
        mid = core[1]
        if not QUALIFIER.search(mid) and mid.lower() in ALIAS_CITIES:
            return ALIAS.get(mid.lower(), mid), name  # locality within a city
    return name, None

all_places = [e.get("place") for e in deccan + basalt if e.get("place")]
plain = set()
for p in all_places:
    core, st = split(p)
    if len(core) == 1:
        plain.add(ALIAS.get(core[0].lower(), core[0]).lower())
        plain.add(core[0].lower())
ALIAS_CITIES = plain

places = {}
def add(e, coll):
    p = e.get("place")
    if not p:
        return
    core, state = split(p)
    name, locality = canon_name(core)
    kind = "region" if name in REGION else "place"
    key = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    rec = places.setdefault(key, {"key": key, "name": name, "state": state, "kind": kind,
                                  "aliases": [], "lat": [], "lon": [], "deccan": [], "basalt": []})
    if not rec["state"] and state:
        rec["state"] = state
    if p not in rec["aliases"]:
        rec["aliases"].append(p)
    if e.get("lat") is not None:
        rec["lat"].append(e["lat"]); rec["lon"].append(e["lon"])
    rec[coll].append(e["id"])

for e in deccan:
    add(e, "deccan")
for e in basalt:
    add(e, "basalt")

out = []
for rec in places.values():
    la, lo = rec.pop("lat"), rec.pop("lon")
    rec["lat"] = round(sum(la) / len(la), 3) if la else None
    rec["lon"] = round(sum(lo) / len(lo), 3) if lo else None
    rec["spread"] = round(max(max(la) - min(la), max(lo) - min(lo)), 3) if len(la) > 1 else 0
    out.append(rec)
out.sort(key=lambda r: (r["kind"] != "place", r["name"].lower()))

for r in out:
    if r["spread"] > 0.05 or len(r["aliases"]) > 1:
        print(f'{r["name"]:34} {r["state"]:16} spread={r["spread"]:<6} {r["aliases"]}')
print(len(out), "places;", sum(len(r["deccan"]) for r in out), "deccan refs;", sum(len(r["basalt"]) for r in out), "basalt refs")
both = [r["name"] for r in out if r["deccan"] and r["basalt"]]
print("in both collections:", both)

js = ("/* places.js – the places of the Deccan and Basalt & Laterite collections, normalised from each entry's\n"
      "   `place` field ('X, State' -> X; spelling variants merged; localities folded into their city; the state kept).\n"
      "   Only entry ids are stored here; titles, dates and each entry's own place label come from the collections' data files at load.\n"
      "   Generated by a script over deccan/data/entries.js and basalt-and-laterite/data/entries.js; regenerate rather than edit. */\n"
      "window.ATLAS_PLACES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
open(OUT, "w", encoding="utf-8").write(js)
print("wrote", OUT, len(js.encode()), "bytes")
