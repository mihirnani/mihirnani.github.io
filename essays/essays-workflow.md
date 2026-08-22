# Essays – how to write and publish

Everything lives in `mihirnani.github.io/essays/`. You write Markdown; one script does the rest.

## Write a new essay

1. Copy `_template.md` to `YYYY-MM-DD-slug.md` – e.g. `2026-09-05-on-rennell.md`.
   The date is the publication date and sets the order; the slug becomes the URL
   (`naniwadekar.com/essays/2026-09-05-on-rennell.html`). Keep it short and lower-case.
2. Fill in the front matter at the top:

       ---
       title: On Rennell
       date: 2026-09-05
       description: One sentence, used in the list, on the front page and in the feed.
       byline: Optional line under the title (delete the line if not wanted)
       ---

3. Write the essay below it in ordinary Markdown:
   - paragraphs separated by blank lines; `## Heading` and `### Sub-heading`
   - `*italics*`, `**bold**`, `[link text](https://…)`, `![alt text](picture.jpg)`
   - `> quotation`, `- list item`, `1. numbered item`, ` ``` ` for code
   - footnotes: `[^1]` in the text and `[^1]: The note.` at the end; they become a
     numbered Notes section with back-links
   - `--` becomes an en dash, straight quotes become curly
   Put images in the `essays/` folder (or a subfolder) and link to them relatively.

## Publish

From the repository root:

    python3 essays/build.py
    git add -A && git commit -m "Essay: On Rennell" && git push

The script converts every `.md` to its `.html` page, rebuilds `index.html` (the list),
`feed.xml` (RSS, full text) and `sitemap.xml`, fills in the earlier/later links at the foot
of each essay, and refreshes the latest-essays list on the site's front page. Commit all of it.

## Update an essay

Edit the `.md`, optionally add `updated: YYYY-MM-DD` to its front matter, run the script, commit.
Do not edit the generated `.html` – the next build overwrites it.

## Other things

- A draft you are not ready to publish: give it a name without the date prefix
  (`draft-on-rennell.md`); only files named `YYYY-MM-DD-slug.md` are built. Rename to publish.
- To remove an essay, delete both the `.md` and its `.html`, then run the script.
- `_shell.html` is the page frame (header, footer, theme toggle) and `style.css` the look;
  `_template.html` is only for an essay written in raw HTML, which still works.
- The feed title and description are set at the top of `build.py`.
- The builder uses the Python `markdown` package if it is installed (`pip install markdown`
  adds tables and a few extras); otherwise its own converter handles everything listed above.
