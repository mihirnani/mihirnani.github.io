#!/usr/bin/env python3
"""Build the whole site.  Run from anywhere:  python3 tools/build.py

The site has no framework and no dependencies; it has four small generators, and
this runs them in the right order:

  1. tools/shell.py            the shared <head>, masthead and footer of the two
                               timeline collections, and their copy of the
                               shared stylesheet
  2. atlas/tools/make_snapshot.py   the atlas's local copies of the collections'
                               data, used only when the atlas is opened from a
                               local folder
  3. text/build.py             the text edition: one static page per entry
  4. essays/build.py           the essays, their index and their feed

Run it after editing any data file, any page body, or assets/collection.css.
Everything it writes is derived; the data files and page bodies are the source.
"""
import pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
STEPS = ["tools/shell.py", "atlas/tools/make_snapshot.py", "text/build.py", "essays/build.py"]

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
