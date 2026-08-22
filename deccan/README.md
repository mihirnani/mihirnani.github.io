# The Deccan, 1336–1875

A single-page timeline collection. All content lives in `data/entries.js` (the 112 entries) and
`data/periods.js` (the five periods and their introductions); `app.js` renders the timeline,
period pages and entry pages from them, each file is a JSON array assigned to a variable, loaded as a script so the page also works when opened from a local folder; editing the JSON is all that is needed – no build step.
The About page is `about.html`. Entry URLs take the form `#<entry-id>`, period URLs `#p1` … `#p7`.
