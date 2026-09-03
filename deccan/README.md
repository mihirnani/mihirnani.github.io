# The Deccan, 1336–1875

A single-page timeline collection. All content lives in `data/`:

- `entries.js` – the entries (a JSON array behind `window.DECCAN_ENTRIES =`)
- `periods.js` – the seven periods and their introductions
- `chronology.js` – the detailed chronology; items with an `e` link to an entry
- `readings.js` – the annotated bibliography, general and by period

Each file is JSON behind a `window.NAME =` wrapper, loaded as a script so the page also works when
opened from a local folder. `app.js` renders the timeline, period pages, entry pages, chronology and
readings from them. Entry URLs take the form `#<entry-id>`, period URLs `#p1` … `#p7`; `#chronology`
and `#readings` are the two list pages. The About page is `about.html`.

Editing the data files is all that is needed to change the content of this page. The page shell
(`<head>`, masthead, footer) and `style.css` are generated from the root by `tools/shell.py`, and the
text edition, atlas snapshot and search indexes are rebuilt from these data files by
`python3 tools/build.py` in the repository root – see the root `README.md`. Do not edit `style.css`
here; edit `assets/collection.css`.
