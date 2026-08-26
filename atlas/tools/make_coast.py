"""Build atlas/data/coast.js from Natural Earth 1:50m land and 1:10m rivers (public domain).
Clip to 68-88E, 8-24N; Douglas-Peucker at 0.02 deg. Run: python3 atlas/tools/make_coast.py"""
import json, math, sys, urllib.request
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))                 # the site repository
GAZE = os.environ.get("GAZE_DIR", os.path.abspath(os.path.join(ROOT, "..", "european-gaze")))   # the map collection's repository
import tempfile
SCR = os.environ.get("NE_CACHE", os.path.join(tempfile.gettempdir(), "natural-earth"))   # downloaded GeoJSON is cached here
OUT = os.path.join(ROOT, "atlas", "data", "coast.js")
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
os.makedirs(SCR, exist_ok=True)
for name in ("ne_50m_land", "ne_10m_rivers_lake_centerlines"):
    path = os.path.join(SCR, name + ".geojson")
    if not os.path.exists(path):
        print("fetching", NE + name + ".geojson", file=sys.stderr)
        urllib.request.urlretrieve(NE + name + ".geojson", path)
W, E, S, N = 68.0, 88.0, 8.0, 24.0
EPS = 0.02

# ---- Sutherland-Hodgman polygon clip to the rectangle ----
def clip_poly(pts):
    def inside(p, edge):
        x, y = p
        return {"w": x >= W, "e": x <= E, "s": y >= S, "n": y <= N}[edge]
    def intersect(a, b, edge):
        (x1, y1), (x2, y2) = a, b
        if edge in ("w", "e"):
            xe = W if edge == "w" else E
            t = (xe - x1) / (x2 - x1)
            return (xe, y1 + t * (y2 - y1))
        ye = S if edge == "s" else N
        t = (ye - y1) / (y2 - y1)
        return (x1 + t * (x2 - x1), ye)
    out = list(pts)
    for edge in "wesn":
        inp, out = out, []
        if not inp:
            return []
        prev = inp[-1]
        for cur in inp:
            if inside(cur, edge):
                if not inside(prev, edge):
                    out.append(intersect(prev, cur, edge))
                out.append(cur)
            elif inside(prev, edge):
                out.append(intersect(prev, cur, edge))
            prev = cur
    return out

# ---- Douglas-Peucker ----
def dp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    best, bi = 0.0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L if L else math.hypot(x - x1, y - y1)
        if d > best:
            best, bi = d, i
    if best > eps:
        return dp(pts[:bi + 1], eps)[:-1] + dp(pts[bi:], eps)
    return [pts[0], pts[-1]]

def rnd(p):
    return [round(p[0], 3), round(p[1], 3)]

land = json.load(open(os.path.join(SCR, "ne_50m_land.geojson")))
polys = []
for f in land["features"]:
    g = f["geometry"]
    rings = g["coordinates"] if g["type"] == "Polygon" else [r for p in g["coordinates"] for r in p]
    # only outer rings: MultiPolygon -> each polygon's rings; take ring 0 of each polygon
    if g["type"] == "Polygon":
        outers = [g["coordinates"][0]]
    else:
        outers = [p[0] for p in g["coordinates"]]
    for ring in outers:
        pts = [(x, y) for x, y in ring]
        if not any(W <= x <= E and S <= y <= N for x, y in pts):
            # could still enclose the box entirely; ignore (no such case here)
            continue
        c = clip_poly(pts)
        if len(c) < 3:
            continue
        c = dp(c + [c[0]], EPS)[:-1]
        if len(c) >= 3:
            polys.append([rnd(p) for p in c])
polys.sort(key=lambda r: -len(r))
print("land rings:", len(polys), "points:", sum(len(r) for r in polys), file=sys.stderr)

WANT = {"Godävari": "Godavari", "Krishna": "Krishna", "Narmada": "Narmada", "Tapi": "Tapti",
        "Tungabhadra": "Tungabhadra", "Bhima": "Bhima", "Cauvery": "Kaveri"}
riv = json.load(open(os.path.join(SCR, "ne_10m_rivers_lake_centerlines.geojson")))
rivers = {}
for f in riv["features"]:
    nm = f["properties"].get("name")
    if nm not in WANT:
        continue
    g = f["geometry"]
    lines = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
    for line in lines:
        seg = []
        for x, y in line:
            if W <= x <= E and S <= y <= N:
                seg.append((x, y))
            else:
                if len(seg) > 1:
                    rivers.setdefault(WANT[nm], []).append(seg)
                seg = []
        if len(seg) > 1:
            rivers.setdefault(WANT[nm], []).append(seg)

# merge the pieces of each river head-to-tail where they touch, then simplify
def merge(segs):
    segs = [list(s) for s in segs]
    changed = True
    while changed and len(segs) > 1:
        changed = False
        for i in range(len(segs)):
            for j in range(len(segs)):
                if i == j:
                    continue
                a, b = segs[i], segs[j]
                def close(p, q):
                    return abs(p[0] - q[0]) < 1e-6 and abs(p[1] - q[1]) < 1e-6
                if close(a[-1], b[0]):
                    segs[i] = a + b[1:]; del segs[j]; changed = True; break
                if close(b[-1], a[0]):
                    segs[i] = b + a[1:]; del segs[j]; changed = True; break
            if changed:
                break
    return segs

out_rivers = []
for name, segs in rivers.items():
    for s in merge(segs):
        s = dp(s, EPS)
        if len(s) >= 2:
            out_rivers.append({"name": name, "points": [rnd(p) for p in s]})
out_rivers.sort(key=lambda r: (r["name"], -len(r["points"])))
for r in out_rivers:
    print(" river", r["name"], len(r["points"]), file=sys.stderr)

data = {"bbox": [W, S, E, N], "land": polys, "rivers": out_rivers}
js = ("/* coast.js – coastline and rivers for the atlas, derived from Natural Earth (public domain):\n"
      "   ne_50m_land (1:50m) and ne_10m_rivers_lake_centerlines (1:10m), clipped to 68–88E, 8–24N\n"
      "   and simplified with Douglas–Peucker at 0.02°. Generated; regenerate rather than edit. */\n"
      "window.ATLAS_COAST = " + json.dumps(data, separators=(",", ":")) + ";\n")
open(OUT, "w").write(js)
print("wrote", OUT, len(js), "bytes", file=sys.stderr)
