#!/usr/bin/env python3
"""Text edition builder.  Run from anywhere:  python3 text/build.py

Reads the collections' own data files -

    deccan/data/{periods,entries,chronology,readings}.js
    basalt-and-laterite/data/{periods,entries}.js

- and writes a plain, static, JavaScript-free edition of both collections into
this folder: one page per entry, one per period, the chronology, the
bibliography, and indexes by title, date, kind, polity, rock and place.

The data files are the single source of truth.  Nothing in text/deccan/ or
text/basalt/ is ever edited by hand: edit the data, run this script again.
Only style.css and this file are written by a human.

No dependencies beyond the standard library.
"""
import collections, datetime, html, os, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT  = ROOT / "text"
SITE = "https://naniwadekar.com"
EG   = SITE + "/european-gaze/"
GAZE = pathlib.Path(os.environ.get("GAZE_DIR", ROOT.parent / "european-gaze"))   # the map collection's repository
TODAY = datetime.date.today().isoformat()

sys.path.insert(0, str(ROOT / "tools"))
from data import load as load_data          # the one parser for window.NAME = {...} files
from places import Places                   # the one reading of the entries' place fields

DEC_TITLE = "The Deccan, 1336–1875"
BAS_TITLE = "Basalt and Laterite"

POL = {"delhi": "Delhi sultanate", "vijayanagara": "Vijayanagara", "bahmani": "Bahmani sultanate",
       "sultanates": "Deccan sultanates", "mughal": "Mughal empire", "maratha": "Marathas",
       "mysore": "Mysore", "hyderabad": "Hyderabad", "company": "East India Company",
       "crown": "British Crown", "portuguese": "Portuguese", "other": "Other"}
KIND_D = {"battle": "Battle", "treaty": "Treaty", "person": "Person", "place": "Place",
          "document": "Document", "object": "Object", "institution": "Institution", "event": "Event"}
ROCK = {"craton": "The old craton", "basin": "Sedimentary basins", "plate": "The moving plate",
        "basalt": "The Traps", "land": "Landforms and rivers", "laterite": "Laterite",
        "soil": "Soil", "life": "Life", "people": "People and stone"}
KIND_B = {"formation": "Formation", "process": "Process", "event": "Event", "place": "Place",
          "object": "Object", "person": "Person", "document": "Document"}

# ---------------------------------------------------------------- data
def load(rel):
    """Read one of the collections' data files through tools/data.py."""
    return load_data(rel, root=ROOT)

def git_date(*rels):
    """The date of the last commit that touched any of these files, as YYYY-MM-DD;
    None when git or the history is not available.  Used for the sitemap's lastmod,
    so that a rebuild does not claim every page changed today."""
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--"] + [str(r) for r in rels],
                             cwd=str(ROOT), capture_output=True, text=True, timeout=30)
        d = out.stdout.strip()
        return d if re.match(r"^\d{4}-\d{2}-\d{2}$", d) else None
    except Exception:
        return None

def gaze_titles():
    """id -> 'Maker, Title (date)' from the map collection's own data/maps.js, when it is
    checked out beside this repository.  Falls back to the file name otherwise."""
    path = GAZE / "data" / "maps.js"
    if not path.exists():
        return {}
    out = {}
    for m in load_data(path):
        label = "%s, %s (%s)" % (m["maker"], m.get("short") or m["title"], m.get("title_date") or m["date_label"])
        out[m["id"]] = label
        out[m["id"].split("__", 1)[-1]] = label      # the same map if only its year prefix was revised
    return out
GAZE_TITLES = {}

# ---------------------------------------------------------------- helpers
# entry id -> the collection it lives in; filled in by main() and used to turn the
# single-page app's in-page links (href="#some-entry") into real page links.
LINKMAP = {}

def body_html(text, coll):
    """Rewrite the app's hash links inside an entry's body into text-edition links."""
    def sub(m):
        eid = m.group(1)
        home = LINKMAP.get(eid)
        if not home:
            print("  warning: body links to unknown entry #%s" % eid)
            return m.group(0)
        return 'href="%s%s.html"' % ("" if home == coll else "../%s/" % home, eid)
    return re.sub(r'href="#([A-Za-z0-9_-]+)"', sub, text)

def esc(s):
    return html.escape("" if s is None else str(s), quote=True)

def map_title(fn):
    """The map's maker, title and date from european-gaze/data/maps.js; failing that,
    1827__Deccan__Vandermaelen__Guzerate.html -> Vandermaelen, Guzerate (1827)."""
    mid = fn.replace(".html", "")
    hit = GAZE_TITLES.get(mid) or GAZE_TITLES.get(mid.split("__", 1)[-1])
    if hit:
        return hit
    parts = mid.split("__")
    year = re.sub(r"^c", "", parts[0])
    name = parts[-1].replace("-", " ")
    maker = parts[2].replace("-", " ") if len(parts) > 3 else ""
    return "%s, %s (%s)" % (maker, name, year) if maker else "%s (%s)" % (name, year)

def fmt_age(a):
    if a >= 1e9:
        v = a / 1e9
        return ("%.1f" % v).rstrip("0").rstrip(".") + " billion years"
    if a >= 1e6:
        return "%d million years" % round(a / 1e6)
    if a >= 1e4:
        return "%d,000 years" % round(a / 1e3)
    return "%d years" % a

def slug_letter(title):
    t = re.sub(r"^(The|A|An)\s+", "", title, flags=re.I)
    c = t[0].upper()
    return c if c.isalpha() else "#"

def figure(e, coll):
    """An entry's picture, where the illustrated collection has one.  The files stay with that
       collection; the text edition points at them rather than keeping a second copy."""
    im = e.get("image")
    if not im:
        return ""
    base = "../../deccan/" if coll == "deccan" else "../../basalt-and-laterite/"
    credit = ('<span class="credit">%s: <a href="%s">%s</a>, <a href="%s">%s</a>%s.</span>'
              % (esc(im.get("credit_label") or "Photograph"), esc(im["source"]), esc(im["credit"]),
                 esc(im["license_url"]), esc(im["license"]),
                 ", " + esc(im["note"]) if im.get("note") else ""))
    return ('<figure class="entry-fig"><img src="%s%s" alt="%s" width="%d" height="%d" loading="lazy">'
            '<figcaption>%s %s</figcaption></figure>'
            % (base, esc(im["file"]), esc(im["alt"]), im["width"], im["height"],
               esc(im["caption"]), credit))

def sort_title(title):
    return re.sub(r"^(The|A|An)\s+", "", title, flags=re.I).lower()

# ---------------------------------------------------------------- page shell
NAV = [("deccan/index.html", "Deccan"), ("deccan/chronology.html", "Chronology"),
       ("deccan/reading.html", "Reading"), ("basalt/index.html", "Basalt")]

def page(rel, title, desc, body):
    """Write one page.  rel is the path below text/, e.g. deccan/hampi.html."""
    up = "../" * rel.count("/")
    url = SITE + "/text/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
    nav = "".join(
        '<a href="%s%s"%s>%s</a>\n' % (up, href, ' aria-current="page"' if href == rel else "", esc(label))
        for href, label in NAV)
    doc = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ece3d1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#16120e" media="(prefers-color-scheme: dark)">
<title>{title}</title>
<link rel="stylesheet" href="{up}style.css">
<link rel="canonical" href="{url}">
<link rel="icon" href="{up}../curiosities-icon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="{up}../curiosities-icon-192.png" sizes="192x192" type="image/png">
<meta property="og:site_name" content="A Fragmented Peninsula">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary">
</head>
<body>
<header class="mast">
<a class="site" href="{up}index.html">A Fragmented Peninsula <span class="ed">Text edition</span></a>
<nav class="navlinks" aria-label="Text edition">
{nav}</nav>
<a class="outlink" href="{site}/">Illustrated site &rarr;</a>
</header>
<main class="wrap">
{body}
</main>
<footer>
<span class="foot-line">The text edition of <a href="{site}/">A Fragmented Peninsula</a>: every entry as plain HTML, no scripts. The illustrated site has the <a href="{site}/deccan/">timeline</a>, the <a href="{site}/atlas/">atlas</a> and the <a href="{site}/european-gaze/">map collection</a>. A non-commercial study collection.</span>
<span class="foot-line">Errors may be pointed out by writing to mihir [at] naniwadekar [dot] in.</span>
</footer>
</body>
</html>
"""
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(doc.format(desc=esc(desc), title=esc(title), up=up, site=SITE, url=url,
                               nav=nav, body=body), encoding="utf-8")
    return rel

def crumb(items):
    """items: list of (href or None, label)."""
    bits = []
    for href, label in items:
        bits.append('<a href="%s">%s</a>' % (href, esc(label)) if href else "<span>%s</span>" % esc(label))
    return '<nav class="crumb" aria-label="Breadcrumb">' + " &rsaquo; ".join(bits) + "</nav>"

def entry_li(e, href, meta):
    return ('<li><span class="d">%s</span> <a class="t" href="%s">%s</a>'
            '<p class="s">%s</p><p class="k">%s</p></li>'
            % (esc(e["date_label"]), href, esc(e["title"]), esc(e["strap"]), esc(meta)))

def prevnext(prev, nxt, href, label_prev="Previous", label_next="Next"):
    if not prev and not nxt:
        return ""
    out = ['<nav class="pn" aria-label="Neighbouring pages">']
    if prev:
        out.append('<a class="prev" href="%s"><span class="dir">&larr; %s</span><span class="nt">%s</span></a>'
                   % (href(prev), esc(label_prev), esc(prev["title"])))
    if nxt:
        out.append('<a class="next" href="%s"><span class="dir">%s &rarr;</span><span class="nt">%s</span></a>'
                   % (href(nxt), esc(label_next), esc(nxt["title"])))
    out.append("</nav>")
    return "".join(out)

def source_list(sources):
    is_ref = lambda s: re.match(r"^(Wikipedia|Britannica)", s["title"]) is not None
    main = [s for s in sources if not is_ref(s)]
    refs = [s for s in sources if is_ref(s)]
    if not main:
        main, refs = sources, []
    li = lambda s: '<li><a href="%s" rel="noopener noreferrer">%s</a></li>' % (esc(s["url"]), esc(s["title"]))
    out = '<h2 class="subhead">Sources</h2><ul class="src">%s</ul>' % "".join(li(s) for s in main)
    if refs:
        out += '<h2 class="subhead">Quick reference</h2><ul class="src">%s</ul>' % "".join(li(s) for s in refs)
    return out

# ---------------------------------------------------------------- indexes
def index_page(rel, title, desc, crumbs, heading, intro, groups, jump=True):
    """A grouped list page: groups is a list of (anchor, heading, [<li> html])."""
    body = [crumb(crumbs), '<div class="head"><h1>%s</h1>' % esc(heading)]
    if intro:
        body.append('<p class="lede">%s</p>' % intro)
    body.append("</div>")
    groups = [g for g in groups if g[2]]
    if jump and len(groups) > 1:
        body.append('<p class="jump">' + " · ".join(
            '<a href="#%s">%s</a>' % (a, esc(h)) for a, h, _ in groups) + "</p>")
    for anchor, head, items in groups:
        body.append('<section class="group" id="%s"><h2>%s</h2><ul class="elist">%s</ul></section>'
                    % (anchor, esc(head), "".join(items)))
    return page(rel, title, desc, "\n".join(body))

def grouped(entries, key, labels, href, meta):
    """Group entries by a key function returning one or more bucket keys."""
    buckets = collections.OrderedDict((k, []) for k in labels)
    for e in entries:
        ks = key(e)
        for k in (ks if isinstance(ks, list) else [ks]):
            buckets.setdefault(k, []).append(e)
    out = []
    for k, es in buckets.items():
        out.append((re.sub(r"[^a-z0-9]+", "-", str(k).lower()), labels.get(k, str(k)),
                    [entry_li(e, href(e), meta(e)) for e in es]))
    return out

PLACES = None   # tools/places.Places over both collections; set in main()

def place_groups(entries, P, order):
    """Group entries by canonical place: [(anchor, heading, [entries])] alphabetical, plus the unplaced."""
    groups, unplaced = {}, []
    for e in entries:
        if not e.get("place"):
            unplaced.append(e); continue
        name, state, _ = P.canon(e["place"])
        head = name + (", " + state if state else "")
        groups.setdefault(head, []).append(e)
    out = []
    for head in sorted(groups, key=lambda h: h.lower()):
        es = sorted(groups[head], key=order)
        out.append((re.sub(r"[^a-z0-9]+", "-", head.lower()).strip("-"), head, es))
    return out, sorted(unplaced, key=order)

def place_meta(e, meta):
    """The entry's own place label, added to its usual meta line when the heading is the canonical name."""
    return meta(e) + " · " + e["place"]

# ---------------------------------------------------------------- the Deccan
def build_deccan(periods, entries, chron, readings, basalt_entries):
    rels = []
    href = lambda e: e["id"] + ".html"
    per = {p["n"]: p for p in periods}
    meta = lambda e: KIND_D[e["kind"]] + " · " + " · ".join(POL[p] for p in e["polities"])

    # chronology lines that point at an entry, and geology entries that point back
    chron_ref = collections.defaultdict(list)
    for sec in chron:
        for item in sec["items"]:
            if item.get("e"):
                chron_ref[item["e"]].append((sec, item))
    geo_ref = collections.defaultdict(list)
    for b in basalt_entries:
        for link in b.get("deccan", []):
            geo_ref[link["id"]].append(b)

    # ---- entry pages
    for i, e in enumerate(entries):
        p = per[e["period"]]
        prev, nxt = (entries[i - 1] if i else None), (entries[i + 1] if i + 1 < len(entries) else None)
        byline = " · ".join(x for x in [e["date_label"], KIND_D[e["kind"]], e.get("place", "")] if x)
        b = [crumb([("../index.html", "Text edition"), ("index.html", DEC_TITLE),
                    ("period-%d.html" % p["n"], p["title"]), (None, e["title"])])]
        b.append('<article class="entry">')
        b.append('<div class="head"><h1>%s</h1><p class="byline">%s</p><p class="brief">%s</p></div>'
                 % (esc(e["title"]), esc(byline), esc(e["strap"])))
        b.append(figure(e, "deccan"))
        b.append('<div class="prose">%s</div>' % body_html(e["body"], "deccan"))
        b.append('<div class="story"><h2 class="subhead">In the story</h2><p>%s</p></div>' % body_html(e["story"], "deccan"))
        if e.get("related_maps"):
            b.append('<h2 class="subhead">In the map collection</h2><p class="links">%s</p>'
                     % " · ".join('<a href="%s%s">%s</a>' % (EG, esc(fn), esc(map_title(fn)))
                                  for fn in e["related_maps"]))
        if geo_ref.get(e["id"]):
            b.append('<h2 class="subhead">In Basalt and Laterite</h2><p class="links">%s</p>'
                     % " · ".join('<a href="../basalt/%s.html">%s</a>' % (esc(g["id"]), esc(g["title"]))
                                  for g in geo_ref[e["id"]]))
        if chron_ref.get(e["id"]):
            b.append('<h2 class="subhead">In the chronology</h2><ul class="chron">%s</ul>'
                     % "".join('<li><span class="d">%s</span><span class="tx">%s</span></li>'
                               % (esc(it["d"]), esc(it["t"])) for _, it in chron_ref[e["id"]]))
        b.append('<div class="sources">%s</div>' % source_list(e["sources"]))
        dl = ['<dl class="meta">',
              "<dt>Date</dt><dd>%s</dd>" % esc(e["date_label"]),
              '<dt>Period</dt><dd><a href="period-%d.html">%s, %s</a></dd>' % (p["n"], esc(p["title"]), esc(p["years"])),
              "<dt>Polities</dt><dd>%s</dd>" % " · ".join(esc(POL[x]) for x in e["polities"]),
              "<dt>Kind</dt><dd>%s</dd>" % esc(KIND_D[e["kind"]])]
        if e.get("place"):
            dl.append("<dt>Place</dt><dd>%s (%.3f, %.3f)</dd>" % (esc(e["place"]), e["lat"], e["lon"]))
        if e.get("coda"):
            dl.append("<dt>Status</dt><dd>Coda – outside the numbered chronology</dd>")
        dl.append('<dt>Illustrated site</dt><dd><a href="%sdeccan/#%s">This entry with the timeline and sketch map</a></dd>'
                  % (SITE + "/", esc(e["id"])))
        dl.append("</dl>")
        b.append("".join(dl))
        b.append("</article>")
        b.append(prevnext(prev, nxt, href))
        rels.append(page("deccan/" + href(e), "%s (%s) – %s" % (e["title"], e["date_label"], DEC_TITLE),
                         e["strap"], "\n".join(b)))

    # ---- period pages
    for i, p in enumerate(periods):
        es = [e for e in entries if e["period"] == p["n"] and not e.get("coda")]
        codas = [e for e in entries if e["period"] == p["n"] and e.get("coda")]
        prev, nxt = (periods[i - 1] if i else None), (periods[i + 1] if i + 1 < len(periods) else None)
        b = [crumb([("../index.html", "Text edition"), ("index.html", DEC_TITLE), (None, p["title"])])]
        b.append('<div class="head"><p class="eyebrow">Period %02d · %s</p><h1>%s</h1>'
                 '<p class="lede">%s</p></div>' % (p["n"], esc(p["years"]), esc(p["title"]), esc(p["desc"])))
        b.append('<div class="prose"><p>%s</p></div>' % esc(p["intro"]))
        b.append('<ul class="elist">%s</ul>' % "".join(entry_li(e, href(e), meta(e)) for e in es))
        if codas:
            b.append('<h2 class="subhead">Codas</h2><ul class="elist">%s</ul>'
                     % "".join(entry_li(e, href(e), meta(e)) for e in codas))
        b.append(prevnext(prev, nxt, lambda x: "period-%d.html" % x["n"], "Previous period", "Next period"))
        rels.append(page("deccan/period-%d.html" % p["n"], "%s, %s – %s" % (p["title"], p["years"], DEC_TITLE),
                         p["desc"], "\n".join(b)))

    # ---- chronology
    b = [crumb([("../index.html", "Text edition"), ("index.html", DEC_TITLE), (None, "Chronology")])]
    b.append('<div class="head"><p class="eyebrow">Chronology</p><h1>The Deccan, year by year</h1>'
             '<p class="lede">Every dated line in the collection, including context events that have no entry of '
             'their own; where the collection has an entry for a line, it is linked at the end of it.</p></div>')
    for j, sec in enumerate(chron):
        b.append('<section class="group" id="c%d"><h2>%s <span class="yrs">%s</span></h2><ul class="chron">%s</ul></section>'
                 % (j, esc(sec["title"]), esc(sec["years"]),
                    "".join('<li><span class="d">%s</span><span class="tx">%s%s</span></li>'
                            % (esc(it["d"]), esc(it["t"]),
                               ' <a class="more" href="%s.html">Entry &rarr;</a>' % esc(it["e"]) if it.get("e") else "")
                            for it in sec["items"])))
    rels.append(page("deccan/chronology.html", "Chronology – " + DEC_TITLE,
                     "A detailed chronology of the Deccan from 1296 to 1900, including context events beyond the collection's entries.",
                     "\n".join(b)))

    # ---- readings
    b = [crumb([("../index.html", "Text edition"), ("index.html", DEC_TITLE), (None, "Reading")])]
    b.append('<div class="head"><p class="eyebrow">Readings</p><h1>The standard scholarship</h1>'
             '<p class="lede">An annotated bibliography, general first and then by period.</p></div>')
    order = ["general"] + [str(p["n"]) for p in periods]
    for key in order:
        items = readings.get(key)
        if not items:
            continue
        head = "General" if key == "general" else "%s, %s" % (per[int(key)]["title"], per[int(key)]["years"])
        lis = []
        for r in items:
            cite = "%s, <cite>%s</cite> (%s, %s)" % (esc(r["author"]), esc(r["title"]), esc(r["publisher"]), esc(r["year"]))
            lis.append('<li><p class="cite"><a href="%s" rel="noopener noreferrer">%s</a></p><p class="s">%s</p></li>'
                       % (esc(r["url"]), cite, esc(r["note"])))
        b.append('<section class="group" id="r%s"><h2>%s</h2><ul class="reading">%s</ul></section>'
                 % (key, esc(head), "".join(lis)))
    rels.append(page("deccan/reading.html", "Readings – " + DEC_TITLE,
                     "An annotated bibliography of the standard scholarship on the Deccan, 1336–1875, arranged by period.",
                     "\n".join(b)))

    # ---- indexes
    crumbs = lambda label: [("../index.html", "Text edition"), ("index.html", DEC_TITLE), (None, label)]
    letters = collections.OrderedDict()
    for e in sorted(entries, key=lambda e: sort_title(e["title"])):
        letters.setdefault(slug_letter(e["title"]), []).append(e)
    rels.append(index_page("deccan/by-title.html", "Entries A–Z – " + DEC_TITLE,
                           "Every entry in The Deccan, 1336–1875, in alphabetical order.",
                           crumbs("A–Z"), "Entries A–Z", "All %d entries by title." % len(entries),
                           [(k.lower(), k, [entry_li(e, href(e), meta(e)) for e in es]) for k, es in letters.items()]))
    by_year = sorted(entries, key=lambda e: (e["year"], sort_title(e["title"])))
    span = "%d–%d" % (min(e["year"] for e in entries), max(e.get("year_end") or e["year"] for e in entries))
    rels.append(index_page("deccan/by-date.html", "Entries by date – " + DEC_TITLE,
                           "Every entry in The Deccan, 1336–1875, in date order.",
                           crumbs("By date"), "Entries by date",
                           "All %d entries in the order they begin, codas included." % len(entries),
                           [("all", span, [entry_li(e, href(e), meta(e)) for e in by_year])], jump=False))
    rels.append(index_page("deccan/by-kind.html", "Entries by kind – " + DEC_TITLE,
                           "The entries of The Deccan, 1336–1875, grouped by kind: battles, treaties, persons, places, documents, objects, institutions and events.",
                           crumbs("By kind"), "Entries by kind", "",
                           grouped(by_year, lambda e: e["kind"], KIND_D, href, meta)))
    rels.append(index_page("deccan/by-polity.html", "Entries by polity – " + DEC_TITLE,
                           "The entries of The Deccan, 1336–1875, grouped by the polities they concern.",
                           crumbs("By polity"), "Entries by polity",
                           "An entry appears under every polity it concerns.",
                           grouped(by_year, lambda e: e["polities"], POL, href, meta)))
    places, unplaced = place_groups(entries, PLACES, lambda e: e["year"])
    rels.append(index_page("deccan/by-place.html", "Entries by place – " + DEC_TITLE,
                           "The entries of The Deccan, 1336–1875, grouped by the place each is set in.",
                           crumbs("By place"), "Entries by place",
                           "%d places, in alphabetical order; spellings and localities are folded into one name, "
                           "and each entry keeps its own place label." % len(places),
                           [(k, h, [entry_li(e, href(e), place_meta(e, meta)) for e in es]) for k, h, es in places]
                           + ([("unplaced", "No single place", [entry_li(e, href(e), meta(e)) for e in unplaced])] if unplaced else []),
                           jump=False))

    # ---- collection contents
    b = [crumb([("../index.html", "Text edition"), (None, DEC_TITLE)])]
    b.append('<div class="head"><p class="eyebrow">History</p><h1>%s</h1>'
             '<p class="lede">500 years in the Deccan: from the founding of Vijayanagara and the Bahmani sultanate '
             'to the Company takeover and the Deccan Riots of 1875. The story of a plateau where sovereignty was '
             'repeatedly shared and inherited, until one power made itself paramount and reduced the rest to a '
             'register.</p></div>' % esc(DEC_TITLE))
    b.append('<ul class="tools"><li><a href="chronology.html">The chronology, year by year</a></li>'
             '<li><a href="reading.html">Readings – the standard scholarship</a></li>'
             '<li><a href="by-title.html">Entries A–Z</a></li><li><a href="by-date.html">Entries by date</a></li>'
             '<li><a href="by-kind.html">Entries by kind</a></li><li><a href="by-polity.html">Entries by polity</a></li>'
             '<li><a href="by-place.html">Entries by place</a></li></ul>')
    for p in periods:
        es = [e for e in entries if e["period"] == p["n"] and not e.get("coda")]
        codas = [e for e in entries if e["period"] == p["n"] and e.get("coda")]
        b.append('<section class="period" id="p%d"><div class="period-head"><span class="no">%02d</span>'
                 '<h2><a href="period-%d.html">%s</a></h2><span class="yrs">%s</span>'
                 '<p class="desc">%s</p></div><ul class="elist">%s</ul>%s</section>'
                 % (p["n"], p["n"], p["n"], esc(p["title"]), esc(p["years"]), esc(p["desc"]),
                    "".join(entry_li(e, href(e), meta(e)) for e in es),
                    ('<h3 class="subhead">Codas</h3><ul class="elist">%s</ul>'
                     % "".join(entry_li(e, href(e), meta(e)) for e in codas)) if codas else ""))
    rels.append(page("deccan/index.html", DEC_TITLE + " – text edition",
                     "The full text of The Deccan, 1336–1875: %d entries in seven periods, with the chronology and "
                     "bibliography, as plain pages without scripts." % len(entries), "\n".join(b)))
    return rels

# ---------------------------------------------------------------- Basalt and Laterite
def build_basalt(periods, entries, deccan_entries):
    rels = []
    href = lambda e: e["id"] + ".html"
    per = {p["n"]: p for p in periods}
    dec_by_id = {e["id"]: e for e in deccan_entries}
    meta = lambda e: KIND_B[e["kind"]] + " · " + " · ".join(ROCK[r] for r in e["rocks"])

    for i, e in enumerate(entries):
        p = per[e["period"]]
        prev, nxt = (entries[i - 1] if i else None), (entries[i + 1] if i + 1 < len(entries) else None)
        byline = " · ".join(x for x in [e["date_label"], KIND_B[e["kind"]], e.get("place", "")] if x)
        b = [crumb([("../index.html", "Text edition"), ("index.html", BAS_TITLE),
                    ("period-%d.html" % p["n"], p["title"]), (None, e["title"])])]
        b.append('<article class="entry">')
        b.append('<div class="head"><h1>%s</h1><p class="byline">%s</p><p class="brief">%s</p></div>'
                 % (esc(e["title"]), esc(byline), esc(e["strap"])))
        b.append(figure(e, "basalt"))
        b.append('<div class="prose">%s</div>' % body_html(e["body"], "basalt"))
        b.append('<div class="story"><h2 class="subhead">In the story</h2><p>%s</p></div>' % body_html(e["story"], "basalt"))
        if e.get("deccan"):
            b.append('<h2 class="subhead">In the Deccan timeline</h2><p class="links">%s</p>'
                     % " · ".join('<a href="../deccan/%s.html">%s</a>' % (esc(x["id"]), esc(x["label"]))
                                  for x in e["deccan"] if x["id"] in dec_by_id))
        if e.get("related_maps"):
            b.append('<h2 class="subhead">In the map collection</h2><p class="links">%s</p>'
                     % " · ".join('<a href="%s%s">%s</a>' % (EG, esc(fn), esc(map_title(fn)))
                                  for fn in e["related_maps"]))
        b.append('<div class="sources">%s</div>' % source_list(e["sources"]))
        dl = ['<dl class="meta">',
              "<dt>Age</dt><dd>%s</dd>" % esc(e["date_label"]),
              "<dt>Before present</dt><dd>%s%s</dd>" % (fmt_age(e["age"]),
                                                        " to " + fmt_age(e["age_end"]) if e.get("age_end") else ""),
              '<dt>Period</dt><dd><a href="period-%d.html">%s, %s</a></dd>' % (p["n"], esc(p["title"]), esc(p["years"])),
              "<dt>Rocks</dt><dd>%s</dd>" % " · ".join(esc(ROCK[r]) for r in e["rocks"]),
              "<dt>Kind</dt><dd>%s</dd>" % esc(KIND_B[e["kind"]])]
        if e.get("place"):
            dl.append("<dt>Place</dt><dd>%s (%.3f, %.3f)</dd>" % (esc(e["place"]), e["lat"], e["lon"]))
        if e.get("coda"):
            dl.append("<dt>Status</dt><dd>Coda – outside the numbered sequence</dd>")
        dl.append('<dt>Illustrated site</dt><dd><a href="%sbasalt-and-laterite/#%s">This entry with the deep-time band and map</a></dd>'
                  % (SITE + "/", esc(e["id"])))
        dl.append("</dl>")
        b.append("".join(dl))
        b.append("</article>")
        b.append(prevnext(prev, nxt, href))
        rels.append(page("basalt/" + href(e), "%s (%s) – %s" % (e["title"], e["date_label"], BAS_TITLE),
                         e["strap"], "\n".join(b)))

    for i, p in enumerate(periods):
        es = [e for e in entries if e["period"] == p["n"] and not e.get("coda")]
        codas = [e for e in entries if e["period"] == p["n"] and e.get("coda")]
        prev, nxt = (periods[i - 1] if i else None), (periods[i + 1] if i + 1 < len(periods) else None)
        b = [crumb([("../index.html", "Text edition"), ("index.html", BAS_TITLE), (None, p["title"])])]
        b.append('<div class="head"><p class="eyebrow">Period %02d · %s</p><h1>%s</h1><p class="lede">%s</p></div>'
                 % (p["n"], esc(p["years"]), esc(p["title"]), esc(p["desc"])))
        b.append('<div class="prose"><p>%s</p></div>' % esc(p["intro"]))
        b.append('<ul class="elist">%s</ul>' % "".join(entry_li(e, href(e), meta(e)) for e in es))
        if codas:
            b.append('<h2 class="subhead">Codas</h2><ul class="elist">%s</ul>'
                     % "".join(entry_li(e, href(e), meta(e)) for e in codas))
        b.append(prevnext(prev, nxt, lambda x: "period-%d.html" % x["n"], "Previous period", "Next period"))
        rels.append(page("basalt/period-%d.html" % p["n"], "%s, %s – %s" % (p["title"], p["years"], BAS_TITLE),
                         p["desc"], "\n".join(b)))

    crumbs = lambda label: [("../index.html", "Text edition"), ("index.html", BAS_TITLE), (None, label)]
    letters = collections.OrderedDict()
    for e in sorted(entries, key=lambda e: sort_title(e["title"])):
        letters.setdefault(slug_letter(e["title"]), []).append(e)
    rels.append(index_page("basalt/by-title.html", "Entries A–Z – " + BAS_TITLE,
                           "Every entry in Basalt and Laterite, in alphabetical order.",
                           crumbs("A–Z"), "Entries A–Z", "All %d entries by title." % len(entries),
                           [(k.lower(), k, [entry_li(e, href(e), meta(e)) for e in es]) for k, es in letters.items()]))
    by_age = sorted(entries, key=lambda e: -e["age"])
    rels.append(index_page("basalt/by-age.html", "Entries by age – " + BAS_TITLE,
                           "Every entry in Basalt and Laterite, oldest first.",
                           crumbs("By age"), "Entries by age", "All %d entries, oldest first." % len(entries),
                           [("all", "3,400 million years to now",
                             [entry_li(e, href(e), meta(e)) for e in by_age])], jump=False))
    rels.append(index_page("basalt/by-kind.html", "Entries by kind – " + BAS_TITLE,
                           "The entries of Basalt and Laterite grouped by kind: formations, processes, events, places, objects, persons and documents.",
                           crumbs("By kind"), "Entries by kind", "",
                           grouped(by_age, lambda e: e["kind"], KIND_B, href, meta)))
    rels.append(index_page("basalt/by-rock.html", "Entries by rock – " + BAS_TITLE,
                           "The entries of Basalt and Laterite grouped by the ground they concern: the craton, the basins, the plate, the Traps, landforms, laterite, soil, life and people.",
                           crumbs("By rock"), "Entries by rock", "An entry appears under every heading it concerns.",
                           grouped(by_age, lambda e: e["rocks"], ROCK, href, meta)))
    places, unplaced = place_groups(entries, PLACES, lambda e: -e["age"])
    rels.append(index_page("basalt/by-place.html", "Entries by place – " + BAS_TITLE,
                           "The entries of Basalt and Laterite grouped by the place each is set in.",
                           crumbs("By place"), "Entries by place",
                           "%d places where the ground can be seen, in alphabetical order." % len(places),
                           [(k, h, [entry_li(e, href(e), place_meta(e, meta)) for e in es]) for k, h, es in places]
                           + ([("unplaced", "No single place", [entry_li(e, href(e), meta(e)) for e in unplaced])] if unplaced else []),
                           jump=False))

    b = [crumb([("../index.html", "Text edition"), (None, BAS_TITLE)])]
    b.append('<div class="head"><p class="eyebrow">Geology</p><h1>%s</h1>'
             '<p class="lede">The ground under the Deccan and how it came to be: an old craton, a flood of lava, '
             'a laterite crust, and the soils, rivers and stone the plateau’s people have built with.</p></div>'
             % esc(BAS_TITLE))
    b.append('<ul class="tools"><li><a href="by-title.html">Entries A–Z</a></li>'
             '<li><a href="by-age.html">Entries by age</a></li><li><a href="by-kind.html">Entries by kind</a></li>'
             '<li><a href="by-rock.html">Entries by rock</a></li><li><a href="by-place.html">Entries by place</a></li></ul>')
    for p in periods:
        es = [e for e in entries if e["period"] == p["n"] and not e.get("coda")]
        codas = [e for e in entries if e["period"] == p["n"] and e.get("coda")]
        b.append('<section class="period" id="p%d"><div class="period-head"><span class="no">%02d</span>'
                 '<h2><a href="period-%d.html">%s</a></h2><span class="yrs">%s</span><p class="desc">%s</p></div>'
                 '<ul class="elist">%s</ul>%s</section>'
                 % (p["n"], p["n"], p["n"], esc(p["title"]), esc(p["years"]), esc(p["desc"]),
                    "".join(entry_li(e, href(e), meta(e)) for e in es),
                    ('<h3 class="subhead">Codas</h3><ul class="elist">%s</ul>'
                     % "".join(entry_li(e, href(e), meta(e)) for e in codas)) if codas else ""))
    rels.append(page("basalt/index.html", BAS_TITLE + " – text edition",
                     "The full text of Basalt and Laterite: %d entries on the geology of the Deccan, as plain pages "
                     "without scripts." % len(entries), "\n".join(b)))
    return rels

# ---------------------------------------------------------------- front page and sitemap
def build_home(dec_entries, bas_entries, chron, readings):
    lines = sum(len(s["items"]) for s in chron)
    books = sum(len(v) for v in readings.values())
    b = ['<div class="head"><p class="eyebrow">A Fragmented Peninsula</p><h1>The text edition</h1>'
         '<p class="lede">The same collections as the illustrated site, written out as ordinary pages: no scripts, '
         'no maps, no timelines. Every entry has its own address, reads in any browser, prints, and can be saved to '
         'disk and opened again in twenty years.</p></div>']
    b.append('<ul class="tools big">'
             '<li><a href="deccan/index.html">The Deccan, 1336–1875</a><span>%d entries in seven periods, '
             'a chronology of %d dated lines, and a bibliography of %d works.</span></li>'
             '<li><a href="basalt/index.html">Basalt and Laterite</a><span>%d entries on the ground beneath it, '
             'from the Archaean gneiss to the soils of the present.</span></li></ul>' % (len(dec_entries), lines, books, len(bas_entries)))
    b.append('<h2 class="subhead">Ways in</h2><ul class="tools">'
             '<li><a href="deccan/chronology.html">The Deccan year by year</a></li>'
             '<li><a href="deccan/reading.html">The standard scholarship</a></li>'
             '<li><a href="deccan/by-title.html">Deccan entries A–Z</a></li>'
             '<li><a href="deccan/by-polity.html">Deccan entries by polity</a></li>'
             '<li><a href="deccan/by-place.html">Deccan entries by place</a></li>'
             '<li><a href="basalt/by-title.html">Basalt entries A–Z</a></li>'
             '<li><a href="basalt/by-age.html">Basalt entries by age</a></li></ul>')
    b.append('<div class="prose colophon"><h2 class="subhead">About this edition</h2>'
             '<p>These pages are generated from the collections’ own data files by <code>text/build.py</code>, '
             'and are never edited by hand. The illustrated site at <a href="%s/">naniwadekar.com</a> reads the same '
             'data: the timeline, the sketch maps, the atlas and the filters are there, and nothing here is a '
             'different version of the text. The map collection, <a href="%s">The European Gaze on India</a>, is not '
             'included, its subject being the images themselves.</p>'
             '<p>The text itself was first drafted with AI and is being rewritten by hand as time allows; it has been '
             'cross-checked for accuracy, and each collection’s About page says how. No edition of this size can be '
             'guaranteed free of error; corrections are welcome at the address below.</p>'
             '<p>The pages carry no scripts and make no third-party requests: each loads only its own stylesheet '
             'and the site’s two typefaces, served from this domain. Saved to disk, a page falls back to the '
             'reader’s own serif.</p>'
             '<p>Last built %s.</p></div>' % (SITE, EG, TODAY))
    return [page("index.html", "Text edition – A Fragmented Peninsula",
                 "The Deccan, 1336–1875 and Basalt and Laterite as plain HTML pages without scripts: one address per "
                 "entry, a full chronology, a bibliography, and indexes by date, kind, polity, rock and place.",
                 "\n".join(b))]

def write_sitemap(rels, lastmod):
    """lastmod: the date of the last commit to the data files (or None, in which case it is omitted);
    every page here is derived from them, so no page is newer than that."""
    stamp = ("<lastmod>%s</lastmod>" % lastmod) if lastmod else ""
    urls = "".join("  <url><loc>%s/text/%s</loc>%s</url>\n"
                   % (SITE, r.replace("index.html", "") if r.endswith("/index.html") or r == "index.html" else r, stamp)
                   for r in rels)
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls, encoding="utf-8")

def main():
    dec_p, dec_e = load("deccan/data/periods.js"), load("deccan/data/entries.js")
    chron, readings = load("deccan/data/chronology.js"), load("deccan/data/readings.js")
    bas_p, bas_e = load("basalt-and-laterite/data/periods.js"), load("basalt-and-laterite/data/entries.js")

    reserved = {"index", "chronology", "reading", "by-title", "by-date", "by-age", "by-kind",
                "by-polity", "by-rock", "by-place"} | {"period-%d" % p["n"] for p in dec_p + bas_p}
    for e in dec_e + bas_e:
        if e["id"] in reserved:
            raise SystemExit("entry id %r collides with a generated page name" % e["id"])

    LINKMAP.update({e["id"]: "deccan" for e in dec_e})
    LINKMAP.update({e["id"]: "basalt" for e in bas_e})
    global PLACES
    PLACES = Places(dec_e + bas_e)
    GAZE_TITLES.update(gaze_titles())

    for sub in ("deccan", "basalt"):
        if (OUT / sub).exists():
            shutil.rmtree(OUT / sub)

    rels = build_deccan(dec_p, dec_e, chron, readings, bas_e)
    rels += build_basalt(bas_p, bas_e, dec_e)
    rels += build_home(dec_e, bas_e, chron, readings)
    write_sitemap(sorted(rels), git_date("deccan/data", "basalt-and-laterite/data", "text/build.py", "text/style.css"))
    print("text edition: %d pages (%d Deccan entries, %d Basalt entries) written to %s"
          % (len(rels), len(dec_e), len(bas_e), OUT))

if __name__ == "__main__":
    main()
