# Curiosities — naniwadekar.com

A hand-built, non-commercial study site. No framework, no dependencies, no
package manager: plain HTML, one stylesheet per look, and a few Python scripts
that generate the parts which would otherwise have to be kept in step by hand.

## Layout

    index.html                the front page (its own self-contained styles)
    assets/collection.css     the stylesheet the two timeline collections share
    deccan/                   The Deccan, 1336–1875   — data + single-page renderer
    basalt-and-laterite/      Basalt and Laterite     — data + single-page renderer
    atlas/                    one map across the collections
    text/                     the text edition: static pages, generated
    essays/                   essays, generated from Markdown
    more/                     a Greek course and three games
    tools/                    the build scripts

The two collections keep their content in `data/*.js` — JSON behind a
`window.NAME =` wrapper, so the pages also work when opened from a local folder.
**Those files are the single source of truth.** The renderers, the atlas, the
text edition and the search indexes all read them; nothing else holds a
second copy of the prose.

## Building

    python3 tools/build.py

which runs, in order:

1. `tools/shell.py` — writes the `<head>`, masthead and footer of the two
   collections' pages from one table, and copies `assets/collection.css` into
   each collection as `style.css` (each collection needs its own copy so that
   its offline service worker can cache it). To add a section to the navigation
   of every page, edit `SECTIONS` there and run this once.
2. `../european-gaze/build.py` — the map collection's pages, from its own data
   (skipped if that repository is not checked out beside this one).
3. `atlas/tools/make_snapshot.py` — refreshes the atlas's local copies of the
   collections' data, used only when the atlas is opened from a local folder.
4. `atlas/tools/make_gaze.py` — the atlas's map layer, from `european-gaze/data`.
5. `atlas/tools/make_places.py` — the atlas's places index; the spelling rules
   it applies live in `tools/places.py` and are shared with the text edition.
6. `text/build.py` — regenerates the text edition: one page per entry, per
   period, the chronology, the bibliography and the indexes. Its sitemap's
   `lastmod` is the date of the last commit to the data files, so a rebuild
   does not claim every page changed.
7. `essays/build.py` — rebuilds the essay pages, index and feed from Markdown.
   While `UNLISTED = True` at the top of that script the essays carry
   `noindex`, no sitemap is written and the section stays out of the site's
   sitemaps; flip it when there are essays to be found.

Everything those scripts write is derived. Edit the data files, the page bodies,
`assets/collection.css`, or the tables inside the scripts — never the generated
copies (`text/deccan/*.html`, `text/basalt/*.html`, `deccan/style.css`,
`basalt-and-laterite/style.css`, `atlas/data/snapshot/*`, `atlas/data/gaze.js`,
`atlas/data/places.js`).

`tools/data.py` is the one parser for the `window.NAME = {...}` data files;
every generator reads through it.

## Type and third-party requests

The two typefaces, Cormorant Garamond and Spectral (SIL Open Font License),
are served from `assets/fonts/` and imported by every stylesheet as
`/assets/fonts/fonts.css`. No page loads anything from another domain: no
font service, no analytics, no CDN. The companion repositories import the same
file by the same absolute path.

## Unlisted sections

`essays/` and `more/` are live but carry `noindex` and are left out of the
sitemaps and the front page until they are ready. `404.html` at the root is the
site's not-found page (GitHub Pages serves only the root one for this domain).

## Companion repositories

- `european-gaze` — The European Gaze on India (one static page per map)
- `sahyadri-birds` — Birds of the Sahyadris

Both are deployed under the same domain and carry the same navigation.
