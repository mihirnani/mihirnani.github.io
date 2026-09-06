#!/usr/bin/env python3
"""Build the whole site.  Run from anywhere:  python3 tools/build.py

The site has no framework and no dependencies; it has a few small generators, and
this runs them in the right order:

  0. ../curiosities-text/tools/assemble.py   the collections' data files, from the
                               Markdown in the curiosities-text repository beside
                               this one (that repository is the source of the text)
  1. tools/shell.py            the shared <head>, masthead and footer of the two
                               timeline collections, and their copy of the
                               shared stylesheet
  2. ../european-gaze/build.py the map collection's pages, from its own data
                               files (skipped if that repository is not beside
                               this one)
  3. tools/atlas_snapshot.py   the atlas's local copies of the collections'
                               data, used only when the atlas is opened from a
                               local folder
  4. tools/atlas_gaze.py       the atlas's map layer, from the map collection's data
  5. tools/atlas_places.py     the atlas's places index
  6. text/build.py             the text edition: one static page per entry
  7. tools/recent.py           the feed, the front page's "Recently added" block, and
                               the count of entries rewritten by hand
  8. tools/sitemaps.py         the sitemaps and their index, dated from git

Run it after editing the text (in ../curiosities-text), any page body, or
assets/collection.css.  Everything it writes is derived, the data files included;
the Markdown and the page bodies are the source.
"""
import pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
STEPS = ["../curiosities-text/tools/assemble.py", "tools/shell.py", "../european-gaze/build.py", "tools/atlas_snapshot.py",
         "tools/atlas_gaze.py", "tools/atlas_places.py", "text/build.py", "tools/recent.py", "tools/sitemaps.py"]

def main():
    failed = []
    for step in STEPS:
        path = ROOT / step
        if not path.exists():
            print("skipped (missing): " + step)
            continue
        print("--- " + step)
        result = subprocess.run([sys.executable, str(path)], cwd=str(ROOT))
        if result.returncode:
            failed.append(step)
    if failed:
        raise SystemExit("failed: " + ", ".join(failed))
    print("--- done")

if __name__ == "__main__":
    main()
