#!/usr/bin/env python3
"""Copy the sister collections' data files into atlas/data/snapshot/.

The atlas pages load ../deccan/data/*.js and ../basalt-and-laterite/data/*.js
first (the live files, which is what the published site uses). Safari refuses
a page opened from a local folder anything outside that page's own folder, so
when those globals are missing the pages load these copies instead. Run this
after editing the collections so the copies do not drift; on the web the
copies are never used."""
import shutil, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
out = root / "atlas" / "data" / "snapshot"
out.mkdir(parents=True, exist_ok=True)
pairs = {
    "deccan/data/periods.js": "deccan-periods.js",
    "deccan/data/entries.js": "deccan-entries.js",
    "deccan/data/chronology.js": "deccan-chronology.js",
    "basalt-and-laterite/data/periods.js": "basalt-periods.js",
    "basalt-and-laterite/data/entries.js": "basalt-entries.js",
}
for src, dst in pairs.items():
    shutil.copyfile(root / src, out / dst)
    print("copied", src, "->", "atlas/data/snapshot/" + dst)
