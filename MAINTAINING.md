# Maintaining A Fragmented Peninsula — the routines

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

### Change the wording of an entry, a map commentary, or an introduction

1. Edit the Markdown in `curiosities-text`: `deccan/entries/<id>.md`,
   `basalt/entries/<id>.md` or `maps/<id>.md`; a period's introduction is
   `deccan/periods/NN-<title>.md` or `basalt/periods/…`, a room's is `maps/rooms/NN-<title>.md`
   (one paragraph each, under the front matter). Ordinary Markdown — `*italics*`,
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
   and `related_maps` (the map pages' file names, or `[]`) — then the strap and the body.
   Add a `## In the story` paragraph only when the collection has something to say that the
   body does not; most entries end with the body.
2. If it belongs in the detailed chronology, add a line to `deccan/chronology.md` in the
   right section, ending ` → [Entry](entries/<id>.md)`. If it rests on a work not yet in
   the bibliography, add the work to `deccan/readings.md`.
3. If a map illustrates it, the link is made on both sides: the map page's file name goes
   in the entry's `related_maps`, and the entry goes in the `deccan` list of
   `curiosities-text/maps/<map-id>.md` (the label there is `title (date_label)`, exactly as
   in the entry). The entry page then names the map and the map page names the entry.
   A Basalt entry links to maps the same way — `related_maps` on the entry, a `basalt` list
   on the map — and to Deccan entries through its `deccan` list.
4. If you wrote the entry yourself from the start, give it `rewritten:` with the day you
   added it, so the count of hand-written entries stays truthful; the page then says
   "Written by hand" rather than "Rewritten", and the feed announces it once, as an addition.
5. Build, check, commit, push.

### Add a Basalt entry

The same, in `curiosities-text/basalt/entries/`, with the geology's fields: `age` in years
before present (and `age_end`) instead of `year`, `rocks` (from the list in the About page —
craton, basin, plate, basalt, land, laterite, soil, life, people) instead of `polities`, a
`deccan` list of the Deccan entries it speaks to (`id` and `label`, the label being the
entry's `title (date_label)` exactly), and `related_maps` as in the Deccan. Every Deccan
entry named in a `deccan` list gets an "In Basalt and Laterite" link back, so the link is
made on both sides by that one list. A Deccan entry links *into* Basalt with an ordinary
absolute link in its body (`https://naniwadekar.com/basalt-and-laterite/#<id>`), which the
text edition turns into a local one.

### Remove or rename an entry

Renaming an `id` breaks every link to it (see "Ids are URLs" below), so prefer not to.
To remove an entry: delete its Markdown, then search `curiosities-text` for its id — a
Basalt entry's `deccan` list, a map's `deccan` or `basalt` list, a `[text](id.md)` link in
another entry, a `→ [Entry](entries/id.md)` line in the chronology. The build stops on the
chronology line and warns about body links (`warning: body links to unknown entry`), but a
map's or a Basalt entry's list is not checked, so search. Leave a redirect stub at the old
address if the entry has been live for long.

### Mark an entry as rewritten

When you have rewritten an entry (or a period introduction) by hand, add one line to its
front matter in `curiosities-text`:

    rewritten: 2026-09-14

The date must be written that way and must not be in the future; the build stops otherwise.
Nothing else records the rewrite: an entry with the line shows "Rewritten by hand, 14
September 2026" at the foot of its page, the About pages and the text edition count the
rewritten entries ("12 of 142 so far" — nothing is shown until there is one), the front page
and the text edition name the five most recently rewritten under "Recently added", and the
feed carries a "Rewritten: …" item. Small corrections and link fixes need no mark, and should
not get one: the line means the text is now yours.

### Add an essay

An essay is prose at length beside a collection's entries — the place for an argument that
needs more than an entry's page. `curiosities-text/deccan/essays/the-argument.md` is a
stub waiting to be written; a new one is a file beside it (or in `basalt/essays/`).

1. **The front matter.** `id` matches the file name and is the address
   (`deccan/#the-argument`, `text/deccan/the-argument.html`); it may not be an entry's id.
   `title`; `summary`, one or two plain sentences with no italics or links, shown under the
   title and in the lists; `draft: true` while it is being written; `sources`, optional,
   in the shape an entry uses. No `#` comments.
2. **The body**, below the second `---`, follows an entry's rules with one addition. A blank
   line between every paragraph and every heading — that is how the build tells them apart.
   The first thing is a paragraph, not a heading. Headings are `## ` lines, as many as you
   like, nothing deeper. Italics `*so*`. A link to a Deccan entry is `[the words](entry-id.md)`,
   the id being the file name in `deccan/entries/`; a Basalt entry or a map is linked by its
   full address (`https://naniwadekar.com/basalt-and-laterite/#regur-black-soil`,
   `https://naniwadekar.com/european-gaze/<map-id>.html`). No lists, block quotations,
   footnotes or tables: the reader does not know them. Curly quotes and spaced en dashes as
   in the rest of the collection.
3. **While writing**, commit and push the draft as often as you like; with the `draft` line
   in place the build ignores the file. **To see it**, delete the line, build, open
   `text/deccan/the-argument.html` or `deccan/index.html#the-argument` from the folder, then
   put the line back and build again (which removes it from everything); do not commit
   in between.
4. **To publish**, delete the `draft` line for good, build, look at the two pages and at the
   front page (it is the top item under "Recently added"), and commit the text repository and
   the hub in the same sitting. The essay is dated from that commit — the one that removed
   the line, not the draft's first — and the feed announces it as "Essay: …".
5. **Afterwards**, small fixes need nothing. A substantial revision gets a line
   `revised: YYYY-MM-DD` in the front matter, which the page shows and the feed announces.

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
   in order. (The sitemap, and the strip of thumbnails each room shows on the front page –
   its first four plates in hanging order – are written by the build.)
5. Build (from the hub, so the atlas and text edition see it), check, commit, push —
   `curiosities-text`, this repository and, because its generated files changed, the hub.

### Add or replace a photograph in Birds

1. Save the image as `assets/images/species/<species-id>/main.webp` (further photos
   `main1.webp`, `main2.webp` …), long side about 1600 px.
2. In `assets/data/birds.json`, find the species' `photos` list. Fill in the pending record
   (or add one): `file`, its `width` and `height` in pixels (the page reserves the space and
   never upscales a small picture), a `caption` (a sentence, sentence case, no square brackets),
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
refreshes only their masthead and footer, and fills two marked places that must be left in:
the front page's block between `<!-- recent -->` and `<!-- /recent -->` ("Recently added",
written by `tools/recent.py`), and the empty `<span class="rewritten-count"></span>` in the
About paragraph of the front page and both About pages, which becomes " (12 of 142 so far)"
once an entry carries a `rewritten` date. The "last updated" date is in the front page's
footer.

When the rewrite is finished, the sentence "first drafted with AI and is being rewritten by
hand" is no longer true in any of the four places (front page, both About pages, and the
colophon in `text/build.py`); rewrite it by hand then, and take the span out — the count will
read "(142 of 142 so far)", which is your cue.

### A place spelled two ways

The atlas's places index and the text edition's by-place index fold spellings of one town
into one heading, by the table `ALIAS` in `tools/places.py` (Bijapur/Vijayapura,
Mysore/Mysuru …). A new entry whose `place` spells a known town differently appears as a
second heading until its spelling is added there. The build prints only the places it has
folded (with their spread, in degrees), not the ones it has not, so after adding an entry at
a known town glance at `text/deccan/by-place.html` or `text/basalt/by-place.html` for a
doubled heading.

### The feed and "Recently added"

`feed.xml` at the root is an Atom feed of additions — new entries, essays and map
commentaries — and of entries rewritten by hand, newest first, the last forty; every page's
`<head>` points a feed reader at it. The front page and the text edition's front page list the
most recent additions. All of it is built by `tools/recent.py` from dates that travel with
the data: an entry's `added` date is the date of the commit that brought its Markdown into
`curiosities-text` (files from the first import, 3 September 2026, have none and never count
as recent; a file not yet committed is dated today, and takes its commit's date at the next
build), and `rewritten` and `revised` are the hand-written dates above. Nothing is edited by
hand; to keep something out of the feed, do not date it.

## Build, check, commit, push

    cd mihirnani.github.io
    python3 tools/build.py          # assembles the data from ../curiosities-text, then
                                    # builds this repository and ../european-gaze; a few seconds

Every sitemap except Birds' one-liner is written by the build and never edited by hand.
Each page is dated from the last commit that touched it, so the dates run one commit
behind your latest edit; that is harmless.

Then look at what changed before committing:

    git status --short              # in each repository you touched

A build after a text edit should change only the data file for that collection and the
pages derived from it. If it touches
two hundred text-edition pages when you changed one entry, something upstream changed (a template,
the date rule) — look before you commit. A build made the day after a commit rewrites the
feed and the "Recently added" block when a new entry's date moves from "today" to the
commit's date; that is expected. Open the changed page locally (double-click the
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
- **Front-matter comments.** The YAML reader takes no `#` comments after a value; the
  commented examples in the READMEs and here are for reading. A comment left in a file
  becomes part of the value (`id: x   # …` fails as "id does not match the file name").
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
