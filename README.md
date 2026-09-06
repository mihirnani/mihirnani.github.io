# A Fragmented Peninsula — naniwadekar.com

A hand-built, non-commercial study site. No framework, no dependencies, no
package manager: plain HTML, one stylesheet per look, and a few Python scripts
that generate the parts which would otherwise have to be kept in step by hand.

**`MAINTAINING.md` beside this file is the working document**: the routines for
adding an entry, a map or a photograph, what to run afterwards, and the things
that bite. This file only says what is where.

## Layout

    index.html                the front page (its own self-contained styles; the
                              "Recently added" block in it is written by the build)
    feed.xml                  the Atom feed of additions and rewrites, generated
    404.html                  the not-found page (Pages serves only the root one)
    assets/collection.css     the stylesheet the two timeline collections share
    assets/fonts/             Cormorant Garamond and Spectral, self-hosted (OFL)
    deccan/                   The Deccan, 1336–1875   — data + single-page renderer
    basalt-and-laterite/      Basalt and Laterite     — data + single-page renderer
    atlas/                    one map across the collections
    text/                     the text edition: static pages, generated
    tools/                    the build scripts (all of them)

The text of the two collections lives as Markdown in the `curiosities-text`
repository beside this one. **The Markdown is the source; the data files are
generated.** `deccan/data/*.js` and `basalt-and-laterite/data/*.js` — JSON behind
a `window.NAME =` wrapper, so the pages also work when opened from a local folder —
are written from it by the first step of the build, and the renderers, the atlas,
the text edition and the search indexes all read them; nothing else holds a copy
of the prose.

### The two timeline collections

Each is a single page. `app.js` renders the timeline, the period pages, the entry
pages, the essays and (for the Deccan) the chronology and readings from `data/`.
Entry and essay URLs are `#<id>`, period URLs `#p1` … `#p7`; `#chronology` and
`#readings` are the Deccan's two list pages; `about.html` is hand-written. Photographs, where an
entry has one, are in `img/`. The `<head>`, masthead and footer of these pages and
their `style.css` are written by `tools/shell.py` from `assets/collection.css`
and one table — edit those, not the copies.

### The tools

    tools/build.py            runs everything below, in order
    tools/shell.py            the collections' page shells and stylesheet copies
    tools/atlas_snapshot.py   the atlas's local copies of the collections' data
    tools/atlas_gaze.py       the atlas's map layer, from ../european-gaze/data
    tools/atlas_places.py     the atlas's places index
    tools/atlas_coast.py      the atlas's coastline and rivers (run by hand; needs the network)
    tools/recent.py           the feed, the front page's "Recently added" block and
                              the rewritten-by-hand counts, from dates in the data
    tools/sitemaps.py         the sitemaps and their index, dated from git
    tools/data.py             the one parser for the window.NAME = data files
    tools/places.py           the place-name spelling rules, shared with the text edition
    tools/check_links.py      the external-link check across all four repositories
    text/build.py             the text edition (lives with its output)

## Building

    python3 tools/build.py

assembles the data from `../curiosities-text`, builds this repository and
`../european-gaze`, and writes the sitemaps. Everything it writes is derived and
says so in its first line; a build on a clean tree changes nothing. What to edit
and what to run for each kind of change is in `MAINTAINING.md`.

## Type and third-party requests

The two typefaces, Cormorant Garamond and Spectral (SIL Open Font License),
are served from `assets/fonts/` and imported by every stylesheet as
`/assets/fonts/fonts.css`. No page loads anything from another domain: no
font service, no analytics, no CDN. The companion repositories import the same
file by the same absolute path.

## Companion repositories

- `curiosities-text` — the text of the Deccan, Basalt and the map commentaries, as Markdown; the source
- `european-gaze` — The European Gaze on India (one static page per map)
- `sahyadri-birds` — Birds of the Sahyadris

The two sites are deployed under the same domain and carry the same navigation.
