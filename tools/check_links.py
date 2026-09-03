#!/usr/bin/env python3
"""Check every external link on the site.  Run from anywhere, on a machine with ordinary
internet access (it needs nothing installed):

    python3 tools/check_links.py            # all four repositories beside this one
    python3 tools/check_links.py --slow     # wait longer for slow archives

It gathers every http(s) link in the hub, the map collection, the bird guide and the
Markdown text, asks each server for the page once (a HEAD request, then GET if the
server refuses HEAD), and prints only the links that look dead, with the file that
carries them.  What it does not report: 2xx of any kind; 403 and 429, which are sites
refusing scripts rather than dead pages (WorldCat, most publishers, Hansard); and a
certificate error, which is this machine's Python lacking root certificates, not the
link.  Expect a few minutes: there are several hundred links.
"""
import concurrent.futures, pathlib, re, ssl, sys, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
PARENT = ROOT.parent
REPOS = [ROOT, PARENT / "european-gaze", PARENT / "sahyadri-birds", PARENT / "curiosities-text"]
SKIP_DIRS = {".git", "img", "node_modules", ".obsidian", "__pycache__", "osd-images"}
SKIP_FILES = {"openseadragon.min.js", "extract.py", "check_links.py", "make_coast.py"}
EXTS = {".html", ".js", ".json", ".md", ".xml", ".py"}
TIMEOUT = 30 if "--slow" in sys.argv else 15
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0 Safari/537.36")
# a URL may contain one level of balanced parentheses (Wikipedia and Commons titles do)
LINK = re.compile(r'https?://(?:[^\s"\'<>()\]\\]|\([^\s()]*\))+')
IGNORE_HOSTS = ("naniwadekar.com", "localhost", "schema.org", "w3.org", "schemas.microsoft.com",
                "fonts.googleapis.com", "fonts.gstatic.com", "creativecommons.org", "purl.org", "example.")

def gather():
    found = {}
    for repo in REPOS:
        if not repo.exists():
            continue
        for p in repo.rglob("*"):
            if p.suffix not in EXTS or p.name in SKIP_FILES or any(d in p.parts for d in SKIP_DIRS):
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for url in LINK.findall(text):
                url = url.rstrip(".,;:").replace("&amp;", "&")
                if not url.isascii() or url.endswith("://") or url.endswith("/…"):
                    continue
                if any(h in url for h in IGNORE_HOSTS):
                    continue
                found.setdefault(url, set()).add(str(p.relative_to(PARENT)))
    return found

def fetch(url, method, context=None):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, "Accept": "*/*",
                                                              "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=context) as r:
        return r.status

WIKI = re.compile(r"^https?://([a-z]+)\.wikipedia\.org/wiki/([^#?]+)")

def check(url):
    """A status code, or a short word for what went wrong."""
    m = WIKI.match(url)
    if m and not m.group(2).startswith("File:"):
        # Wikipedia answers ordinary page requests from scripts unreliably; its REST summary
        # endpoint gives a clean 200 or 404 for a title.
        url = "https://%s.wikipedia.org/api/rest_v1/page/summary/%s" % (m.group(1), m.group(2))
    for method in ("HEAD", "GET"):
        try:
            return fetch(url, method)
        except urllib.error.HTTPError as e:
            if method == "HEAD":
                continue              # many servers answer HEAD badly; the GET decides
            return e.code
        except ssl.SSLError:
            try:
                ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
                return fetch(url, "GET", ctx)
            except Exception:
                return "certificate"
        except Exception as e:
            if method == "HEAD":
                continue
            msg = str(e)
            return "timeout" if "timed out" in msg else "unreachable"
    return "?"

def main():
    links = gather()
    print("%d distinct external links; checking…" % len(links), flush=True)
    dead, refused, unsure = [], [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for url, status in zip(links, ex.map(check, links)):
            if isinstance(status, int) and 200 <= status < 300:
                continue
            if status in (403, 429) or status == "certificate":
                refused.append((status, url))
            elif status in ("timeout", "unreachable"):
                unsure.append((status, url, sorted(links[url])))
            else:
                dead.append((status, url, sorted(links[url])))
    def show(items):
        for status, url, files in items:
            print("\n%s  %s\n    in %s" % (status, url, ", ".join(files[:3]) + (" …" if len(files) > 3 else "")))
    print("\n== Probably dead (%d) — fix these" % len(dead)); show(sorted(dead, key=lambda b: str(b[0])))
    print("\n== Did not answer in time (%d) — try again later, or open by hand" % len(unsure)); show(unsure)
    print("\n== Refused a script or a certificate check (%d) — almost always fine; open one or two by hand if in doubt" % len(refused))
    for status, url in refused[:12]:
        print("   %s  %s" % (status, url[:110]))
    if len(refused) > 12:
        print("   … and %d more" % (len(refused) - 12))

if __name__ == "__main__":
    main()
