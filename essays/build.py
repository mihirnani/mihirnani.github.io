#!/usr/bin/env python3
"""Essays builder.  Run from anywhere:  python3 essays/build.py

Write each essay as Markdown in this folder, named YYYY-MM-DD-slug.md, beginning with a short
front-matter block (see _template.md).  The script converts every .md to a matching .html page
(using the `markdown` package if installed, else a built-in converter that covers headings,
paragraphs, emphasis, links, images, blockquotes, lists, code and footnotes), then (re)writes:
  index.html   – the list of essays, newest first
  feed.xml     – an RSS 2.0 feed of the same (full text of each essay included)
  sitemap.xml  – one line per essay
and fills in the previous/next links at the foot of every essay.
Hand-written .html essays made from _template.html still work.  Only files named YYYY-MM-DD-slug are treated as essays; anything else (templates, notes) is ignored.
"""
import re, os, glob, html, datetime, email.utils

# ---------------------------------------------------------------- markdown
def md_to_html(text):
    try:
        import markdown  # optional: pip install markdown
        return markdown.markdown(text, extensions=["footnotes", "smarty", "tables", "fenced_code", "attr_list"])
    except ImportError:
        return _mini_md(text)

def _inline(t):
    t = html.escape(t, quote=False)
    # typography first, so that the quotes in generated HTML attributes are left alone
    t = t.replace(" -- ", " – ").replace("---", "—")
    t = re.sub(r'(^|[\s(\[])"', r"\1“", t).replace('"', "”")
    t = re.sub(r"(^|[\s(\[])'", r"\1‘", t).replace("'", "’")
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+[“\"]([^”\"]*)[”\"])?\)", lambda m: '<img src="%s" alt="%s"%s>' % (m.group(2), m.group(1), ' title="%s"' % m.group(3) if m.group(3) else ""), t)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\[\^([^\]]+)\]", r'<sup id="fnref-\1"><a href="#fn-\1">\1</a></sup>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
    t = re.sub(r"(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])", r"<em>\1</em>", t)
    return t

def _mini_md(text):
    lines = text.replace("\r", "").split("\n")
    out, para, i = [], [], 0
    foot = {}
    def flush():
        if para: out.append("<p>" + _inline(" ".join(para)) + "</p>"); para.clear()
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            flush(); j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith("```"): buf.append(lines[j]); j += 1
            out.append("<pre><code>" + html.escape("\n".join(buf)) + "</code></pre>"); i = j + 1; continue
        m = re.match(r"\[\^([^\]]+)\]:\s*(.*)", ln)
        if m: flush(); foot[m.group(1)] = m.group(2); i += 1; continue
        m = re.match(r"(#{1,6})\s+(.*)", ln)
        if m: flush(); lvl = len(m.group(1)); out.append("<h%d>%s</h%d>" % (lvl, _inline(m.group(2)), lvl)); i += 1; continue
        if re.match(r"^(\*\s*){3,}$|^(-\s*){3,}$", ln): flush(); out.append("<hr>"); i += 1; continue
        if ln.startswith(">"):
            flush(); buf = []
            while i < len(lines) and lines[i].startswith(">"): buf.append(lines[i][1:].strip()); i += 1
            out.append("<blockquote>" + _inline(" ".join(buf)) + "</blockquote>"); continue
        m = re.match(r"^(\s*)([-*+]|\d+[.)])\s+", ln)
        if m:
            flush(); ordered = m.group(2)[0].isdigit(); items = []
            while i < len(lines) and re.match(r"^\s*([-*+]|\d+[.)])\s+", lines[i]):
                items.append(re.sub(r"^\s*([-*+]|\d+[.)])\s+", "", lines[i])); i += 1
                while i < len(lines) and lines[i].startswith("  ") and not re.match(r"^\s*([-*+]|\d+[.)])\s+", lines[i]):
                    items[-1] += " " + lines[i].strip(); i += 1
            tag = "ol" if ordered else "ul"
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % _inline(x) for x in items), tag)); continue
        if not ln.strip(): flush(); i += 1; continue
        para.append(ln.strip()); i += 1
    flush()
    if foot:
        out.append('<div class="notes"><ol>' + "".join('<li id="fn-%s">%s <a href="#fnref-%s">↩</a></li>' % (k, _inline(v), k) for k, v in foot.items()) + "</ol></div>")
    return "\n".join(out)

def front_matter(text):
    """--- key: value ... --- at the top of a .md file."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m: return {}, text
    fm = {}
    for ln in m.group(1).split("\n"):
        if ":" in ln:
            k, v = ln.split(":", 1); fm[k.strip().lower()] = v.strip().strip('"').strip("'")
    return fm, text[m.end():]

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://naniwadekar.com"
BASE = SITE + "/essays/"
AUTHOR = "Mihir Naniwadekar"
TITLE = "Essays"
DESC = "Essays from Curiosities."

def nice(d):
    y, m, dd = map(int, d.split("-")); return datetime.date(y, m, dd).strftime("%-d %B %Y")

def meta(s, name):
    m = re.search(r'<meta\s+name="%s"\s+content="([^"]*)"' % name, s) or re.search(r'<meta\s+content="([^"]*)"\s+name="%s"' % name, s)
    return html.unescape(m.group(1)) if m else ""

# ---- convert markdown essays to html pages ----
shell = open(os.path.join(HERE, "_shell.html"), encoding="utf-8").read()
DATED = re.compile(r"^\d{4}-\d{2}-\d{2}-.+")   # only files named YYYY-MM-DD-slug are essays
for f in sorted(glob.glob(os.path.join(HERE, "*.md"))):
    b = os.path.basename(f)
    if not DATED.match(b): continue
    fm, body = front_matter(open(f, encoding="utf-8").read())
    title = fm.get("title", b[11:-3].replace("-", " ").capitalize())
    date = fm.get("date", b[:10]); desc = fm.get("description", fm.get("summary", ""))
    byline = fm.get("byline", "")
    out = b[:-3] + ".html"
    art = '<article>\n<header>\n<p class="eyebrow">Essay · %s</p>\n<h1>%s</h1>\n%s</header>\n%s\n</article>' % (
        nice(date) if re.match(r"\d{4}-\d{2}-\d{2}$", date) else html.escape(date), html.escape(title),
        ('<p class="byline">%s</p>\n' % html.escape(byline)) if byline else "", md_to_html(body))
    page = shell.replace("{{TITLE}}", html.escape(title) + " – Essays – Curiosities").replace("{{DESC}}", html.escape(desc)).replace("{{CANON}}", BASE + out).replace("{{BODY}}", art)
    page = page.replace('  <meta name="color-scheme" content="light dark">', '  <meta name="date" content="%s">\n  <meta name="author" content="%s">\n  <meta name="source" content="%s">\n  <meta name="color-scheme" content="light dark">' % (date, AUTHOR, b))
    if fm.get("updated"): page = page.replace('  <meta name="color-scheme"', '  <meta name="updated" content="%s">\n  <meta name="color-scheme"' % fm["updated"], 1)
    page = page.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">')
    open(os.path.join(HERE, out), "w", encoding="utf-8").write(page)

essays = []
for f in sorted(glob.glob(os.path.join(HERE, "*.html"))):
    b = os.path.basename(f)
    if not DATED.match(b): continue
    s = open(f, encoding="utf-8").read()
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    title = html.unescape(t.group(1)).split(" – Essays")[0].strip() if t else b
    date = meta(s, "date") or b[:10]
    body = re.search(r"<article[^>]*>(.*?)</article>", s, re.S)
    essays.append({"file": b, "url": BASE + b, "title": title, "desc": meta(s, "description"),
                   "date": date, "updated": meta(s, "updated") or date, "html": s, "body": body.group(1) if body else ""})
essays.sort(key=lambda e: e["date"], reverse=True)

# ---- previous / next inside each essay ----
for i, e in enumerate(essays):
    newer = essays[i - 1] if i > 0 else None
    older = essays[i + 1] if i < len(essays) - 1 else None
    nav = '<nav class="pager">'
    if older: nav += '<a class="prev" href="%s"><span class="dir">← Earlier</span>%s</a>' % (older["file"], html.escape(older["title"]))
    if newer: nav += '<a class="next" href="%s"><span class="dir">Later →</span>%s</a>' % (newer["file"], html.escape(newer["title"]))
    nav += '</nav>'
    s = re.sub(r'<nav class="pager">.*?</nav>', nav, e["html"], flags=re.S) if '<nav class="pager">' in e["html"] else e["html"].replace("</article>", "</article>\n" + nav, 1)
    if s != e["html"]:
        open(os.path.join(HERE, e["file"]), "w", encoding="utf-8").write(s); e["html"] = s

# ---- index ----
items = "".join('<li><span class="d">%s</span><h2><a href="%s">%s</a></h2><p>%s</p></li>' %
                (nice(e["date"]), e["file"], html.escape(e["title"]), html.escape(e["desc"])) for e in essays)
index = shell.replace("{{TITLE}}", "Essays – Curiosities").replace("{{DESC}}", DESC).replace("{{CANON}}", BASE).replace("{{BODY}}",
    '<p class="eyebrow">Curiosities</p><h1>Essays</h1><p class="intro">%s <a href="feed.xml">Subscribe by RSS</a>.</p><ul class="essays">%s</ul>' % (DESC, items))
open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(index)

# ---- feed ----
now = email.utils.format_datetime(datetime.datetime.now(datetime.timezone.utc))
def rfc(d):
    y, m, dd = map(int, d.split("-")); return email.utils.format_datetime(datetime.datetime(y, m, dd, 6, 0, tzinfo=datetime.timezone.utc))
def absolutise(h):  # make relative image/link paths absolute for feed readers
    return re.sub(r'(src|href)="(?!https?:|mailto:|#)([^"]+)"', lambda m: '%s="%s%s"' % (m.group(1), BASE, m.group(2)), h)
feed = ['<?xml version="1.0" encoding="UTF-8"?>', '<?xml-stylesheet type="text/xsl" href="feed.xsl"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">', '<channel>',
        '<title>%s – Curiosities</title>' % TITLE, '<link>%s</link>' % BASE, '<description>%s</description>' % html.escape(DESC),
        '<language>en</language>', '<lastBuildDate>%s</lastBuildDate>' % now,
        '<atom:link href="%sfeed.xml" rel="self" type="application/rss+xml"/>' % BASE]
for e in essays:
    feed += ['<item>', '<title>%s</title>' % html.escape(e["title"]), '<link>%s</link>' % e["url"], '<guid isPermaLink="true">%s</guid>' % e["url"],
             '<pubDate>%s</pubDate>' % rfc(e["date"]), '<description>%s</description>' % html.escape(e["desc"]),
             '<content:encoded><![CDATA[%s]]></content:encoded>' % absolutise(e["body"]), '</item>']
feed += ['</channel>', '</rss>', '']
open(os.path.join(HERE, "feed.xml"), "w", encoding="utf-8").write("\n".join(feed))

# ---- sitemap ----
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url><loc>%s</loc><lastmod>%s</lastmod><priority>0.8</priority></url>' % (BASE, datetime.date.today().isoformat())]
sm += ['  <url><loc>%s</loc><lastmod>%s</lastmod><priority>0.7</priority></url>' % (e["url"], e["updated"]) for e in essays]
sm += ['</urlset>', '']
open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(sm))
# ---- latest essays on the site's front page ----
root_index = os.path.join(os.path.dirname(HERE), "index.html")
if os.path.exists(root_index):
    r = open(root_index, encoding="utf-8").read()
    latest = "".join('            <li><span class="d">%s</span><a href="https://naniwadekar.com/essays/%s">%s</a><p>%s</p></li>\n' %
                     (nice(e["date"]), e["file"], html.escape(e["title"]), html.escape(e["desc"])) for e in essays[:4])
    r2 = re.sub(r"<!-- essays:start -->.*?<!-- essays:end -->", "<!-- essays:start -->\n" + latest + "<!-- essays:end -->", r, flags=re.S)
    if r2 != r: open(root_index, "w", encoding="utf-8").write(r2)
print("built %d essay(s): index.html, feed.xml, sitemap.xml, and the front-page list" % len(essays))
