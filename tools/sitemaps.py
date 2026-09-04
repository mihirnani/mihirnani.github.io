#!/usr/bin/env python3
"""Write the site's sitemaps: the front page's, the two collections', the atlas's, and the
index that points search engines at all of them.  Run: python3 tools/sitemaps.py
(the last step of tools/build.py).

The text edition writes its own (text/build.py), as does the map collection
(european-gaze/build.py); Birds keeps a one-line one by hand.  This script reads those
three, when they are there, for the dates the index reports.

A page's lastmod is the date of the last commit that touched it or what it is built
from, so a rebuild does not claim every page changed today.  Nothing here is edited by
hand.
"""
import pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = "https://naniwadekar.com"

# sitemap file -> [(url path, [files whose last commit dates it])]
SITEMAPS = {
    "sitemap.xml": [("/", ["index.html"])],
    "deccan/sitemap.xml": [("/deccan/", ["deccan", "assets/collection.css", "tools/shell.py"]),
                           ("/deccan/about.html", ["deccan/about.html", "assets/collection.css", "tools/shell.py"])],
    "basalt-and-laterite/sitemap.xml": [
        ("/basalt-and-laterite/", ["basalt-and-laterite", "assets/collection.css", "tools/shell.py"]),
        ("/basalt-and-laterite/about.html", ["basalt-and-laterite/about.html", "assets/collection.css", "tools/shell.py"])],
    "atlas/sitemap.xml": [("/atlas/", ["atlas"]), ("/atlas/chronology.html", ["atlas"]), ("/atlas/places.html", ["atlas"])],
}
# the index, in the order the sitemaps are listed: (url path of the sitemap, where the file is)
INDEX = [("/sitemap.xml", ROOT / "sitemap.xml"),
         ("/deccan/sitemap.xml", ROOT / "deccan/sitemap.xml"),
         ("/basalt-and-laterite/sitemap.xml", ROOT / "basalt-and-laterite/sitemap.xml"),
         ("/atlas/sitemap.xml", ROOT / "atlas/sitemap.xml"),
         ("/text/sitemap.xml", ROOT / "text/sitemap.xml"),
         ("/european-gaze/sitemap.xml", ROOT.parent / "european-gaze/sitemap.xml"),
         ("/sahyadri-birds/sitemap.xml", ROOT.parent / "sahyadri-birds/sitemap.xml")]

HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n'

def git_date(rels):
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--"] + list(rels),
                             cwd=str(ROOT), capture_output=True, text=True, timeout=30)
        d = out.stdout.strip()
        return d if re.match(r"^\d{4}-\d{2}-\d{2}$", d) else None
    except Exception:
        return None

def stamp(d):
    return ("<lastmod>%s</lastmod>" % d) if d else ""

def newest_in(path):
    """The latest lastmod a sitemap file reports, or None."""
    if not path.is_file():
        return None
    dates = re.findall(r"<lastmod>(\d{4}-\d{2}-\d{2})</lastmod>", path.read_text(encoding="utf-8"))
    return max(dates) if dates else None

def main():
    for rel, pages in SITEMAPS.items():
        rows = "".join("  <url><loc>%s%s</loc>%s</url>\n" % (SITE, url, stamp(git_date(files))) for url, files in pages)
        (ROOT / rel).write_text(HEAD + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % rows,
                                encoding="utf-8")
    rows = "".join("  <sitemap><loc>%s%s</loc>%s</sitemap>\n" % (SITE, url, stamp(newest_in(path))) for url, path in INDEX)
    (ROOT / "sitemap-index.xml").write_text(
        HEAD + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</sitemapindex>\n' % rows, encoding="utf-8")
    print("sitemaps: %d written, index lists %d" % (len(SITEMAPS), len(INDEX)))

if __name__ == "__main__":
    main()
