#!/usr/bin/env python3
"""One way to read the site's data files.

Every collection keeps its content as JSON behind a `window.NAME =` wrapper, so
that a browser can load it as a plain script and the pages work from a local
folder as well as over the web.  Everything that generates part of this site -
the text edition, the atlas's data, the map collection's pages - reads those
files through this module, so there is one parser to get right and no need for
node to read our own data.

    from data import load
    entries = load("deccan/data/entries.js")
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]

def load(path, root=None):
    """Read one data file and return the JSON value it assigns to window.<NAME>."""
    p = pathlib.Path(path)
    if not p.is_absolute():
        p = pathlib.Path(root or ROOT) / p
    text = p.read_text(encoding="utf-8")
    m = re.search(r"window\.[A-Za-z0-9_]+\s*=\s*", text)
    if not m:
        raise SystemExit("no window.<NAME> = ... assignment in %s" % p)
    body = text[m.end():].strip()
    if body.endswith(";"):
        body = body[:-1]
    try:
        return json.loads(body)
    except json.JSONDecodeError as err:
        raise SystemExit("%s is not valid JSON after the wrapper: %s" % (p, err))

def dump(path, var, value, banner, root=None):
    """Write a data file in the same shape: a banner comment, then the assignment."""
    p = pathlib.Path(path)
    if not p.is_absolute():
        p = pathlib.Path(root or ROOT) / p
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(banner + "window.%s = " % var + json.dumps(value, ensure_ascii=False, indent=1) + ";\n",
                 encoding="utf-8")
    return p
