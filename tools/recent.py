#!/usr/bin/env python3
"""What is new: the site's feed, the front page's "Recently added" block, and the count of
entries rewritten by hand.  Run: python3 tools/recent.py  (a late step of tools/build.py,
after the text edition, which it links to).

The dates come with the data.  assemble.py stamps every entry, essay and map commentary
with `added`, the date of the commit that brought its Markdown into curiosities-text (the
first import does not count); an entry or period introduction carries `rewritten`, and an
essay `revised`, when a hand has written that date into its front matter.  From those:

    feed.xml                  Atom: additions and rewrites, newest first, the last 40
    index.html                the block between <!-- recent --> and <!-- /recent -->,
                              and the text inside <span class="rewritten-count">
    deccan/about.html         the text inside <span class="rewritten-count">
    basalt-and-laterite/about.html      ,,

Nothing else on those pages is touched; the markers stay, so a rebuild is idempotent and a
page without them is left alone.  Links go to the text edition, the address the site
gives for citing an entry.
"""
import datetime, html, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = "https://naniwadekar.com"
GAZE = ROOT.parent / "european-gaze"
sys.path.insert(0, str(ROOT / "tools"))
from data import load

FEED_ITEMS = 40
HUB_ITEMS = 6

def esc(s):
    return html.escape("" if s is None else str(s), quote=True)

def plain(s):
    """Text without tags, for a summary."""
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()

def nice_date(iso):
    d = datetime.date.fromisoformat(iso)
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)

def sort_title(t):
    return re.sub(r"^(The|A|An)\s+", "", t, flags=re.I).lower()

# ---------------------------------------------------------------- the items
def items():
    """Every dated event, newest first: dicts with date, kind, coll, title, href, summary, key."""
    out = []
    def add(date, kind, coll, title, href, summary, key):
        out.append(dict(date=date, kind=kind, coll=coll, title=title, href=href, summary=summary, key=key))

    for coll, folder, name in (("deccan", "deccan", "The Deccan"), ("basalt", "basalt-and-laterite", "Basalt and Laterite")):
        entries = load("%s/data/entries.js" % folder, root=ROOT)
        periods = load("%s/data/periods.js" % folder, root=ROOT)
        essays = load("%s/data/essays.js" % folder, root=ROOT)
        for e in entries:
            href = "%s/text/%s/%s.html" % (SITE, coll, e["id"])
            if e.get("added"):
                add(e["added"], "entry", name, e["title"], href, e["strap"], "%s/%s/added" % (coll, e["id"]))
            if e.get("rewritten") and e["rewritten"] != e.get("added"):     # an entry written by hand from the start is an addition, not a rewrite
                add(e["rewritten"], "rewritten", name, e["title"], href, e["strap"], "%s/%s/rewritten/%s" % (coll, e["id"], e["rewritten"]))
        for p in periods:
            if p.get("rewritten"):
                add(p["rewritten"], "rewritten", name, "%s, %s – the period introduction" % (p["title"], p["years"]),
                    "%s/text/%s/period-%d.html" % (SITE, coll, p["n"]), p["desc"], "%s/period-%d/rewritten/%s" % (coll, p["n"], p["rewritten"]))
        for x in essays:
            href = "%s/text/%s/%s.html" % (SITE, coll, x["id"])
            if x.get("added"):
                add(x["added"], "essay", name, x["title"], href, x["summary"], "%s/%s/added" % (coll, x["id"]))
            if x.get("revised"):
                add(x["revised"], "revised", name, x["title"], href, x["summary"], "%s/%s/revised/%s" % (coll, x["id"], x["revised"]))

    maps_js = GAZE / "data" / "maps.js"
    if maps_js.exists():
        for m in load(maps_js):
            if m.get("added"):
                title = "%s, %s (%s)" % (m["maker"], m.get("short") or m["title"], m.get("title_date") or m["date_label"])
                add(m["added"], "map", "The European Gaze on India", title, "%s/european-gaze/%s.html" % (SITE, m["id"]),
                    plain(m["brief"]), "gaze/%s/added" % m["id"])

    out.sort(key=lambda i: (i["coll"], sort_title(i["title"])))      # within a day: by collection, then title
    out.sort(key=lambda i: i["date"], reverse=True)                     # newest day first (a stable sort keeps the order above)
    return out

KIND_LABEL = {"entry": "New entry", "essay": "Essay", "map": "Map", "rewritten": "Rewritten", "revised": "Essay revised"}

# ---------------------------------------------------------------- the feed
def feed(all_items):
    picked = all_items[:FEED_ITEMS]
    updated = picked[0]["date"] if picked else datetime.date.today().isoformat()
    rows = []
    for i in picked:
        title = "%s: %s" % (KIND_LABEL[i["kind"]], i["title"])
        rows.append("  <entry>\n    <title>%s</title>\n    <link href=\"%s\"/>\n    <id>tag:naniwadekar.com,2026:%s</id>\n"
                    "    <updated>%sT00:00:00Z</updated>\n    <category term=\"%s\"/>\n    <summary>%s</summary>\n  </entry>\n"
                    % (esc(title), esc(i["href"]), esc(i["key"]), i["date"], esc(i["coll"]), esc(i["summary"])))
    text = ('<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n'
            '  <title>A Fragmented Peninsula</title>\n'
            '  <subtitle>Additions to the collections – new entries, essays and maps – and the entries rewritten by hand.</subtitle>\n'
            '  <link href="%s/"/>\n  <link rel="self" href="%s/feed.xml"/>\n  <id>%s/</id>\n'
            '  <updated>%sT00:00:00Z</updated>\n  <author><name>Mihir Naniwadekar</name></author>\n%s</feed>\n'
            % (SITE, SITE, SITE, updated, "".join(rows)))
    path = ROOT / "feed.xml"
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")
        return True
    return False

# ---------------------------------------------------------------- the front page and the About pages
def hub_block(all_items):
    recent = [i for i in all_items if i["kind"] in ("entry", "essay", "map")][:HUB_ITEMS]
    if not recent:
        return ""
    lis = "".join('\n          <li><span class="when">%s</span><span class="what"><a href="%s">%s</a> <span class="where">%s%s</span></span></li>'
                  % (esc(nice_date(i["date"])), esc(i["href"]), esc(i["title"]), esc(i["coll"]),
                     "" if i["kind"] == "entry" else " · " + KIND_LABEL[i["kind"]].lower())
                  for i in recent)
    return ('\n      <section aria-labelledby="recent-title" class="project-group recent">\n'
            '        <h2 class="group-title" id="recent-title">Recently added</h2>\n'
            '        <ul>%s\n        </ul>\n%s'
            '        <p class="feedline">To follow additions, give a feed reader this page’s address, or the <a href="%s/feed.xml">feed</a>’s.</p>\n'
            '      </section>\n      ' % (lis, rewritten_line(all_items), SITE))

def rewritten_line(all_items, limit=5):
    """One line naming the entries most recently rewritten by hand; nothing until there is one."""
    rows = [i for i in all_items if i["kind"] == "rewritten"][:limit]
    if not rows:
        return ""
    return ('        <p class="feedline">Rewritten by hand most recently: %s.</p>\n'
            % ", ".join('<a href="%s">%s</a>' % (esc(i["href"]), esc(i["title"])) for i in rows))

def rewritten_clause(folders):
    entries = []
    for f in folders:
        entries += load("%s/data/entries.js" % f, root=ROOT)
    n = sum(1 for e in entries if e.get("rewritten"))
    return " (%d of %d so far)" % (n, len(entries)) if n else ""

def rewrite(rel, block, clause):
    path = ROOT / rel
    text = original = path.read_text(encoding="utf-8")
    if block is not None:
        text, n = re.subn(r"<!-- recent -->.*?<!-- /recent -->", lambda m: "<!-- recent -->" + block + "<!-- /recent -->", text, count=1, flags=re.S)
        if n != 1:
            raise SystemExit("%s: no <!-- recent --> … <!-- /recent --> markers" % rel)
    text, n = re.subn(r'(<span class="rewritten-count">)[^<]*(</span>)', lambda m: m.group(1) + esc(clause) + m.group(2), text, count=1)
    if n != 1:
        raise SystemExit('%s: no <span class="rewritten-count"> to fill' % rel)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def main():
    all_items = items()
    changed = []
    if feed(all_items): changed.append("feed.xml")
    if rewrite("index.html", hub_block(all_items), rewritten_clause(["deccan", "basalt-and-laterite"])): changed.append("index.html")
    if rewrite("deccan/about.html", None, rewritten_clause(["deccan"])): changed.append("deccan/about.html")
    if rewrite("basalt-and-laterite/about.html", None, rewritten_clause(["basalt-and-laterite"])): changed.append("basalt-and-laterite/about.html")
    print("recent: %d dated items, feed lists %d%s" % (len(all_items), min(len(all_items), FEED_ITEMS),
                                                     (", rewrote " + ", ".join(changed)) if changed else ""))

if __name__ == "__main__":
    main()
