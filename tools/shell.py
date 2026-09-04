#!/usr/bin/env python3
"""Shared shell builder.  Run from anywhere:  python3 tools/shell.py

The two timeline collections - The Deccan, 1336-1875 and Basalt and Laterite -
are the same page furniture around different data: the same <head>, the same
masthead, the same footer, the same three inline scripts, and (byte for byte)
the same stylesheet.  This script owns that furniture.  Each page keeps its own
body; everything from <head> to </head>, the masthead block, and everything
from <footer> to </body> is written from the tables below.

So: to add a section to the navigation of every page, edit SECTIONS here and run
this once.  To change a page's title or description, edit PAGES.  The bodies are
never touched.

The collections' stylesheet is written once, at assets/collection.css, and this
script copies it into each collection folder as style.css.  The stylesheet imports
the site's self-hosted type by absolute path (/assets/fonts/fonts.css), so the copy
needs no rewriting and the fonts are fetched once for the whole domain.  Each collection keeps its
own copy so that it can be opened from a local folder on its own; the copies are
generated, never edited: change assets/collection.css and run this script.  A collection that later needs rules
of its own adds a second <link> to its config below.

No dependencies beyond the standard library.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = "https://naniwadekar.com"

# Every section of the site, in masthead order.  A page omits its own section.
SECTIONS = [
    ("deccan",  "Deccan", SITE + "/deccan/"),
    ("gaze",    "Maps",   SITE + "/european-gaze/"),
    ("basalt",  "Basalt", SITE + "/basalt-and-laterite/"),
    ("birds",   "Birds",  SITE + "/sahyadri-birds/"),
    ("atlas",   "Atlas",  SITE + "/atlas/"),
    ("text",    "Text",   SITE + "/text/"),
]

THEME_BOOT = """<script>(function(){
  var theme='light';
  try {
    var saved=localStorage.getItem('root-theme');
    if(saved==='light'||saved==='dark') theme=saved;
    else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches) theme='dark';
  } catch(e) {}
  document.documentElement.setAttribute('data-theme',theme);
})();</script>"""

MAIL_SCRIPT = """<script>(function(){var l=document.querySelectorAll("a.mail");for(var i=0;i<l.length;i++){var a=l[i],m=a.getAttribute("data-u")+"@"+a.getAttribute("data-d");a.href="mailto:"+m;a.textContent=m;}})();</script>"""

THEME_SCRIPT = """<script>(function(){
  var b=document.getElementById('themeBtn');
  if(!b) return;
  function sync(){
    var dark=document.documentElement.getAttribute('data-theme')==='dark';
    b.textContent=dark?'Light':'Dark';
    b.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
  }
  b.addEventListener('click',function(){
    var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    try { localStorage.setItem('root-theme',next); } catch(e) {}
    sync();
  });
  sync();
})();</script>"""

FOOTER = ('<footer><span class="foot-line">Part of <a href="%s/">Curiosities</a>. A non-commercial study '
          'collection.</span> <span class="foot-line">Errors may be pointed out by writing to '
          '<a class="mail" href="#" data-u="mihir" data-d="naniwadekar.in">mihir [at] naniwadekar [dot] in</a>.'
          '</span></footer>') % SITE

# ---- the collections that share the shell
# Both collections use the site's icons; neither is an installable app of its own.
COLLECTION_HEAD = ('<link href="../curiosities-icon-32.png" rel="icon" sizes="32x32" type="image/png"/>'
                   '<link href="../curiosities-icon-192.png" rel="icon" sizes="192x192" type="image/png"/>'
                   '<link href="../curiosities-icon-180.png" rel="apple-touch-icon"/>'
                   '<meta content="#ece3d1" media="(prefers-color-scheme: light)" name="theme-color"/>'
                   '<meta content="#16120e" media="(prefers-color-scheme: dark)" name="theme-color"/>')
COLLECTIONS = {
    "deccan": dict(
        key="deccan", name="The Deccan, 1336–1875", tagline="Vijayanagara to the Raj",
        css=["style.css"], head_extra=COLLECTION_HEAD, og_image=SITE + "/curiosities-icon-512.png"),
    "basalt-and-laterite": dict(
        key="basalt", name="Basalt and Laterite", tagline="The making of the Deccan",
        css=["style.css"], head_extra=COLLECTION_HEAD, og_image=SITE + "/curiosities-icon-512.png"),
}

# ---- the pages the shell owns: path -> collection, title, description, url
PAGES = {
    "deccan/index.html": dict(
        collection="deccan", url=SITE + "/deccan/",
        title="The Deccan, 1336–1875 · a timeline from Vijayanagara to the Raj",
        desc="A timeline of the Deccan from Vijayanagara to the Raj: entries on Vijayanagara, the Bahmanis "
             "and their successors, the Mughals, the Marathas, Mysore, Hyderabad, the colonial takeover and the "
             "settlement that followed it, 1336 to 1875."),
    "deccan/about.html": dict(
        collection="deccan", url=SITE + "/deccan/about.html",
        title="About – The Deccan, 1336–1875",
        desc="What the Deccan timeline collection is, how it is arranged, and how the entries were written and checked."),
    "basalt-and-laterite/index.html": dict(
        collection="basalt-and-laterite", url=SITE + "/basalt-and-laterite/",
        title="Basalt and Laterite · the making of the Deccan",
        desc="Basalt and Laterite: the making of the Deccan. Nearly four billion years of the plateau – craton, "
             "Gondwana, the Trap eruptions, escarpment, laterite and black soil – ending in the landscape on which "
             "the Deccan’s human history was made."),
    "basalt-and-laterite/about.html": dict(
        collection="basalt-and-laterite", url=SITE + "/basalt-and-laterite/about.html",
        title="About – Basalt and Laterite",
        desc="About Basalt and Laterite: what the collection is, how it is arranged, and how its deep-time claims "
             "are sourced and hedged."),
}

def head(cfg, coll):
    css = "".join('<link href="%s" rel="stylesheet"/>' % h for h in coll["css"])
    og_image = ('<meta content="%s" property="og:image"/>' % coll["og_image"]) if coll.get("og_image") else ""
    return """<head>
<meta charset="utf-8"/><meta content="width=device-width,initial-scale=1.0" name="viewport"/>
<meta content="{desc}" name="description"/>
<meta content="light dark" name="color-scheme"/>
<title>{title}</title>
{boot}{css}
<link href="{url}" rel="canonical"/><meta content="{title}" property="og:title"/><meta name="twitter:card" content="summary"><meta property="og:site_name" content="Curiosities"><meta content="{desc}" property="og:description"/><meta content="website" property="og:type"/><meta content="{url}" property="og:url"/>{og_image}
{extra}</head>""".format(desc=cfg["desc"], title=cfg["title"], boot=THEME_BOOT, css=css,
                         url=cfg["url"], og_image=og_image, extra=coll["head_extra"])

def masthead(coll):
    links = "".join('<a class="navlink" href="%s">%s</a>\n' % (href, label)
                    for key, label, href in SECTIONS if key != coll["key"])
    # Two groups, marked as such: the family of collections (muted) and this collection's own pages.
    return ('<div class="masthead"><a class="site" href="index.html">%s</a>\n'
            '<span class="yrs">%s</span>\n'
            '<span class="nav-break" aria-hidden="true"></span>\n'
            '<nav class="nav-family" aria-label="Curiosities"><a class="navlink home" href="%s/">Curiosities</a>\n'
            '%s</nav>\n'
            '<nav class="nav-local" aria-label="This collection"><a class="navlink" href="about.html">About</a></nav>\n'
            '<button class="theme-toggle" id="themeBtn" type="button" aria-label="Switch to dark theme">Dark</button></div>') % (coll["name"], coll["tagline"], SITE, links)

def tail(coll):
    parts = [FOOTER, MAIL_SCRIPT, THEME_SCRIPT]
    return "\n".join(parts) + "</body></html>\n"

CSS_BANNER = ("/* Generated by tools/shell.py from assets/collection.css - do not edit this copy.\n"
              "   Each collection keeps its own copy so that it can be opened from a folder on its own. */\n")

def copy_css():
    src = (ROOT / "assets" / "collection.css").read_text(encoding="utf-8")
    copied = []
    for folder, coll in COLLECTIONS.items():
        if "style.css" not in coll["css"]:
            continue
        dest = ROOT / folder / "style.css"
        text = CSS_BANNER + src
        if not dest.exists() or dest.read_text(encoding="utf-8") != text:
            dest.write_text(text, encoding="utf-8")
            copied.append(folder + "/style.css")
    return copied

def build():
    changed = copy_css()
    for rel, cfg in sorted(PAGES.items()):
        coll = COLLECTIONS[cfg["collection"]]
        path = ROOT / rel
        text = original = path.read_text(encoding="utf-8")
        for pattern, replacement, what in (
                (r"<head>.*?</head>", head(cfg, coll), "head"),
                (r'<div class="masthead">.*?</div>', masthead(coll), "masthead"),
                (r"<footer>.*?</html>\s*$", tail(coll), "footer")):
            text, n = re.subn(pattern, lambda m: replacement, text, count=1, flags=re.S)
            if n != 1:
                raise SystemExit("%s: could not find the %s to replace" % (rel, what))
        if text != original:
            path.write_text(text, encoding="utf-8")
            changed.append(rel)
    print("shell: %d pages checked, %d files rewritten%s"
          % (len(PAGES), len(changed), (" (" + ", ".join(changed) + ")") if changed else ""))

if __name__ == "__main__":
    build()
