# Maintaining Curiosities — the routines

The root `README.md` says what each folder is and what the build does. This file is the
other half: what to actually do, in order, for the changes you are likely to make. Every
recipe ends the same way — build, check, commit, push — so that part is written once, at the
end.

The one rule behind all of it: **content lives in data files and hand-written pages; anything
whose first line says "generated" or "do not edit" is rebuilt from them.** If you edit a
generated file, the next build overwrites your edit.

## The three repositories

    mihirnani.github.io/   the hub: front page, Deccan, Basalt and Laterite, atlas, text edition, essays
    european-gaze/         the map collection (deployed at /european-gaze/)
    sahyadri-birds/        the bird guide (deployed at /sahyadri-birds/)

They must sit beside one another in one folder: the hub's build reads `../european-gaze/`.
Each is its own git repository and is pushed separately; GitHub Pages deploys each on push,
usually within a minute or two.

## Recipes

### Change the wording of a Deccan or Basalt entry

1. Edit the entry in `deccan/data/entries.js` (or `basalt-and-laterite/data/entries.js`).
   The prose fields hold HTML: `<em>` for italics, `<a href>` for links, curly quotes and
   spaced en dashes ( – ) as in the rest of the collection. Keep the file valid JSON behind
   the `window.NAME =` wrapper — a stray comma breaks the whole page.
2. Build, check, commit, push (below). The text edition and the atlas pick the change up
   from the build; the illustrated page reads the data file directly.

### Add a Deccan entry

1. Copy an existing record in `deccan/data/entries.js` and give it a new `id` (lower-case,
   hyphens; it becomes the URL `#<id>`), a `title`, `period`, `polities`, `kind`, `place`
   with `lat`/`lon` for the atlas, `date_label` with `year` (and `year_end`) for the
   timeline, a `strap`, the `body`, the `story` paragraph, `sources`, and `related_maps`
   (a list of map ids from `european-gaze/data/maps.js`, or `[]`).
2. If it belongs in the detailed chronology, add an item to `deccan/data/chronology.js`
   with `"e": "<id>"` so the item links to it. If it rests on a work not yet in the
   bibliography, add the work to `deccan/data/readings.js`.
3. If a map illustrates it, the link is made on both sides: the map's id goes in the
   entry's `related_maps`, and the entry goes in that map's `deccan` list in
   `../european-gaze/data/maps.js` (the label there is `title (date_label)`, exactly as in
   the entry). The entry page then names the map and the map page names the entry.
4. Build, check, commit, push.

### Add a map to The European Gaze

1. Get the image. From Rumsey, download the full-resolution export; note the List No. and
   the record URL. Anything published after 1929 needs a rights check first (see the
   collection's About page).
2. Make the three derived images, named by the record's `id`
   (`YYYY__Region__Maker__Short-Title`):
       img/display/<id>.jpg     1800 px on the long side, quality ~85
       img/thumb/<id>.jpg       700 px on the long side
       img/dzi/<id>.dzi + <id>_files/     deep-zoom tiles, e.g.
           vips dzsave master.jpg img/dzi/<id> --suffix .jpg[Q=85] --tile-size 510 --overlap 1
   Keep the master in `img/` — it is ignored by git and stays on this machine only.
   (Without tiles the page simply shows the display image; the viewer is optional.)
3. Add a record to `data/maps.js`: copy the nearest existing one and fill in `id`, `year`,
   `region`, `maker` (a display name, e.g. `d’Anville`), `date_label`, `title`, `short`,
   `byline`, `brief`, the `image` and `thumb` blocks with the pixel sizes, `room`, the
   `deccan` links, the `prose` (subheads as `<p class="subhead">…</p>`, ending with
   "The gaze"), and the `meta` rows. The build adds the Rumsey credit row itself whenever
   a `Source record` row links to davidrumsey.com.
4. Hang it: add the `id` to the right room's list in `data/rooms.js`, in order.
5. Add the page to `sitemap.xml`.
6. Build (from the hub, so the atlas and text edition see it), check, commit, push — this
   repository and, because its generated files changed, the hub too.

### Add or replace a photograph in Birds

1. Save the image as `assets/images/species/<species-id>/main.webp` (further photos
   `main1.webp`, `main2.webp` …), long side about 1600 px.
2. In `assets/data/birds.json`, find the species' `photos` list. Fill in the pending record
   (or add one): `file`, a `caption` (a sentence, sentence case, no square brackets),
   `photographer` and `license` as HTML links exactly as the live records have them, and
   `source_note` ("via Wikimedia Commons, resized" for Commons images; leave it out for your
   own). Remove `"pending": true`. For a Commons image, copy the author and licence from the
   file page itself, not from memory.
3. No build: the page reads the JSON directly. Check, commit, push.

### Add a bird species

Copy a record in `birds.json`, give it a new `id` (the URL hash), and fill in every field;
`order_id`, `family_id` and `group_id` must exist in `families.json`. Names follow the
AviList version named on the About page; use its spelling and hyphenation.

### Write or update an essay

See `essays/essays-workflow.md` — Markdown in, everything else generated. While
`UNLISTED = True` at the top of `essays/build.py` the section is live but hidden from
search engines, sitemaps and the front page; flip it, rebuild, and follow the three steps in
that file when the first essay is ready.

### Change the navigation or the footer on every page

Edit `SECTIONS`, `FOOTER` or the masthead template in `tools/shell.py`; mirror the same change
in `european-gaze/build.py` (which owns the map collection's shell) and by hand in
`sahyadri-birds/index.html` and the atlas pages, which keep their own mastheads. Build.

### Change the look

Timeline collections: `assets/collection.css` (copied to each collection's `style.css` by the
build). The map collection, the atlas, the text edition, the essays and Birds each have
their own stylesheet, edited in place. The typefaces are in `assets/fonts/`; every
stylesheet imports `/assets/fonts/fonts.css`.

### Update the About text or the front page

`index.html`, `deccan/about.html`, `basalt-and-laterite/about.html`,
`european-gaze/about.html` and the `about_html` string in
`sahyadri-birds/assets/data/site-meta.json` are hand-written; edit them directly. The build
refreshes only their masthead and footer. The "last updated" date is in the front page's
footer.

## Build, check, commit, push

    cd mihirnani.github.io
    python3 tools/build.py          # also builds ../european-gaze; ~10 s

Then look at what changed before committing:

    git status --short              # in each repository you touched

A build after a data edit should change only files derived from that data. If it touches
193 text-edition pages when you changed one entry, something upstream changed (a template,
the date rule) — look before you commit. Open the changed page locally (double-click the
HTML; every collection works from a folder, without the fonts) or wait for the push and look
at it live.

    git add -A && git commit -m "Deccan: add the entry on X" && git push

Commit the generated files together with the data that produced them, so a checkout is
always consistent. If you changed the Gaze data, push both repositories.

## Things that bite

- **Caching.** There are no service workers; the pages are ordinary static files and a
  reload shows the current version. If a stylesheet or data file looks stale, it is the
  browser's own cache — a hard reload clears it.
- **Valid JSON.** The data files are JSON. A missing comma or a stray straight quote inside
  a string takes the whole page down; the build will tell you the line.
- **HTML inside strings.** Quotes inside the prose fields must be curly (’ “ ”) or escaped;
  attribute quotes inside links must be `\"`.
- **Ids are URLs.** Renaming an `id` breaks every link to it — in the other collections,
  the atlas, the text edition and anyone's bookmarks. If you must, leave a redirect stub at
  the old address, as was done for two maps in September 2026.
- **The Rumsey licence.** Non-commercial, share-alike, credit line required; the build adds
  the credit, but keep the site non-commercial and keep the source record on every page.
- **Size.** The Gaze repository deploys under GitHub Pages' 1 GB limit only because the
  masters are not tracked. Never `git add img/*.jpg`; the `.gitignore` prevents it, but a
  `git add -f` would not.
