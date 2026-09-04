# Maintaining Curiosities — the routines

The root `README.md` says what is where. This file is the other half: what to actually do, in order, for the changes you are likely to make. Every
recipe ends the same way — build, check, commit, push — so that part is written once, at the
end.

The one rule behind all of it: **the text lives as Markdown in `curiosities-text`, the
Birds data in its JSON, and the page shells in hand-written HTML; anything whose first line
says "generated" or "do not edit" is rebuilt from those.** The collections' `data/*.js`
files are generated too. If you edit a generated file, the next build overwrites your edit.

## The four repositories

    curiosities-text/      the text: one Markdown file per entry, period, map and room (an Obsidian vault)
    mihirnani.github.io/   the hub: front page, Deccan, Basalt and Laterite, atlas, text edition
    european-gaze/         the map collection (deployed at /european-gaze/)
    sahyadri-birds/        the bird guide (deployed at /sahyadri-birds/)

They must sit beside one another in one folder: the builds read `../curiosities-text/` and
`../european-gaze/`. Each is its own git repository and is pushed separately; GitHub Pages
deploys the three site repositories on push, usually within a minute or two;
`curiosities-text` is not deployed, only read at build time.

## Recipes

### Change the wording of an entry or a map commentary

1. Edit the Markdown in `curiosities-text`: `deccan/entries/<id>.md`,
   `basalt/entries/<id>.md` or `maps/<id>.md`. Ordinary Markdown — `*italics*`,
   `[text](other-entry.md)` for a link to another entry, blank lines between paragraphs,
   curly quotes and spaced en dashes ( – ) as in the rest of the collection. The strap
   (first paragraph) is plain text. `curiosities-text/README.md` shows the shape.
2. Build, check, commit, push (below) — the build assembles the data files from the
   Markdown, then everything derived from them. Commit `curiosities-text` too.

### Add a Deccan entry

1. In `curiosities-text/deccan/entries/`, copy the nearest existing file to `<id>.md`
   (lower-case, hyphens; it becomes the URL `#<id>`) and fill in the front matter — `id`
   (matching the file name), `title`, `period`, `polities`, `kind`, `place` with `lat`/`lon`
   for the atlas, `date_label` with `year` (and `year_end`) for the timeline, `sources`,
   and `related_maps` (the map pages' file names, or `[]`) — then the strap, the body and
   the `## In the story` paragraph.
2. If it belongs in the detailed chronology, add a line to `deccan/chronology.md` in the
   right section, ending ` → [Entry](entries/<id>.md)`. If it rests on a work not yet in
   the bibliography, add the work to `deccan/readings.md`.
3. If a map illustrates it, the link is made on both sides: the map page's file name goes
   in the entry's `related_maps`, and the entry goes in the `deccan` list of
   `curiosities-text/maps/<map-id>.md` (the label there is `title (date_label)`, exactly as
   in the entry). The entry page then names the map and the map page names the entry.
   A Basalt entry links to maps the same way — `related_maps` on the entry, a `basalt` list
   on the map — and to Deccan entries through its `deccan` list.
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
3. In `curiosities-text/maps/`, copy the nearest existing file to `<id>.md` and fill in
   the front matter — `id`, `year` and `approx` (true when the year is a guess), `region`,
   `maker` (a display name, e.g. `d’Anville`), `date_label`, `title`, `short`, `byline`,
   the `image` and `thumb` blocks with the pixel sizes, `room`, the `deccan` links (and
   `basalt`, if any) and the `meta` rows — then the brief as the first
   paragraph and the commentary under `##` subheads, ending with `## The gaze`. The build
   adds the Rumsey credit row itself whenever a `Source record` row links to
   davidrumsey.com.
4. Hang it: add the `id` to the right room's `maps` list in `curiosities-text/maps/rooms/`,
   in order. (The sitemap is written by the build.)
5. Build (from the hub, so the atlas and text edition see it), check, commit, push —
   `curiosities-text`, this repository and, because its generated files changed, the hub.

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

### Add a picture to a Deccan or Basalt entry

1. Save the image in the site repository as `deccan/img/<id>.jpg` or
   `basalt-and-laterite/img/<id>.jpg`, about 1,600 px on the long side (never upscale a
   small one). Note its pixel width and height.
2. In the entry's Markdown, add an `image` block to the front matter — copy one from a
   Basalt entry that has one: `file` (`img/<id>.jpg`), `width`, `height`, `alt`, `caption`,
   `credit` (the photographer), `source` (the Commons file page or wherever it came from),
   `license` and `license_url`, and `note` ("via Wikimedia Commons, resized"). For a
   Commons image, take the author and licence from the file page itself.
3. Build, check, commit, push — the text repo and the hub. The build refuses an entry
   whose image block is incomplete or whose file is not in the repository. The text edition
   shows the picture too, pointing at the same file in the illustrated collection; what it
   leaves out, by design, is the scripts and the maps.

### Add a bird species

Copy a record in `birds.json`, give it a new `id` (the URL hash), and fill in every field;
`order_id`, `family_id` and `group_id` must exist in `families.json`. Names follow the
AviList version named on the About page; use its spelling and hyphenation.

### Change the navigation or the footer on every page

Edit `SECTIONS`, `FOOTER` or the masthead template in `tools/shell.py`; mirror the same change
in `european-gaze/build.py` (which owns the map collection's shell) and by hand in
`sahyadri-birds/index.html` and the atlas pages, which keep their own mastheads. The text
edition has a masthead of its own, without the family navigation, in `text/build.py`. Build.

### Change the look

Timeline collections: `assets/collection.css` (copied to each collection's `style.css` by the
build). The map collection, the atlas, the text edition and Birds each have
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
    python3 tools/build.py          # assembles the data from ../curiosities-text, then
                                    # builds this repository and ../european-gaze; ~10 s

Every sitemap except Birds' one-liner is written by the build and never edited by hand.
Each page is dated from the last commit that touched it, so the dates run one commit
behind your latest edit; that is harmless.

Then look at what changed before committing:

    git status --short              # in each repository you touched

A build after a text edit should change only the data file for that collection and the
pages derived from it. If it touches
193 text-edition pages when you changed one entry, something upstream changed (a template,
the date rule) — look before you commit. Open the changed page locally (double-click the
HTML; every collection works from a folder, without the fonts) or wait for the push and look
at it live.

    git add -A && git commit -m "Deccan: add the entry on X" && git push

Commit the generated files together with the Markdown that produced them — the text repo
and the site repo in the same sitting — so a checkout is always consistent.

## Checking the links

Internal links are checked by the build's own consistency rules (a room hangs only maps
that exist, a chronology item names a real entry). External links — the source records,
the bibliography, the photograph credits — go stale on their own, so once or twice a year:

    python3 tools/check_links.py

runs every external link across all four repositories and prints the ones that no
longer answer, with the file that carries them. A 403 or 429 is usually a site that
dislikes scripts rather than a dead link; open those by hand.

## Things that bite

- **Caching.** There are no service workers; the pages are ordinary static files and a
  reload shows the current version. If a stylesheet or data file looks stale, it is the
  browser's own cache — a hard reload clears it.
- **Front matter.** The build reads the plain YAML the files use; if Obsidian or a hand
  edit writes something it cannot read, the build stops and names the file and line.
  A colon-and-space inside an unquoted value is the usual cause — quote the value.
- **Birds is still JSON.** A missing comma in `birds.json` takes the page down; check the
  file parses before committing.
- **Ids are URLs.** Renaming an `id` breaks every link to it — in the other collections,
  the atlas, the text edition and anyone's bookmarks. If you must, leave a redirect stub at
  the old address: a page with `<meta http-equiv="refresh">` to the new one and
  `<meta name="robots" content="noindex">`, kept for a few months.
- **The Rumsey licence.** Non-commercial, share-alike, credit line required; the build adds
  the credit, but keep the site non-commercial and keep the source record on every page.
- **Size.** The Gaze repository deploys under GitHub Pages' 1 GB limit only because the
  masters are not tracked. Never `git add img/*.jpg`; the `.gitignore` prevents it, but a
  `git add -f` would not.
