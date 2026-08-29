#!/usr/bin/env python3
"""Build atlas/data/gaze.js: the map layer of the atlas.

Reads the map collection's own data files - european-gaze/data/maps.js and
rooms.js - and keeps only what the atlas needs: a year, a region, a maker, a
title and a room per map.  (Until August 2026 this script recovered those facts
by parsing the collection's HTML pages; the collection now keeps them as data.)

Run: python3 atlas/tools/make_gaze.py   (set GAZE_DIR if the map collection is
not checked out beside this repository)
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
GAZE = os.environ.get("GAZE_DIR", os.path.abspath(os.path.join(ROOT, "..", "european-gaze")))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from data import load, dump

BASE = "https://naniwadekar.com/european-gaze/"

def main():
    maps_in = load(os.path.join(GAZE, "data", "maps.js"))
    rooms_in = load(os.path.join(GAZE, "data", "rooms.js"))
    rooms = [{"n": r["n"], "file": r["file"], "title": r["title"]} for r in rooms_in]
    maps = sorted(({"file": m["id"] + ".html", "year": m["year"], "approx": m["approx"],
                    "date_label": m.get("title_date", m["date_label"]), "region": m["region"], "maker": m["maker"],
                    "title": m["title"], "room": m["room"]} for m in maps_in),
                  key=lambda m: (m["year"], m["file"]))
    missing = [m["file"] for m in maps if m["room"] is None]
    if missing:
        print("warning: no room for", missing, file=sys.stderr)
    out = dump(os.path.join(ROOT, "atlas", "data", "gaze.js"), "ATLAS_GAZE",
               {"base": BASE, "rooms": rooms, "maps": maps},
               "/* gaze.js – the map list of The European Gaze on India, taken from that collection's\n"
               "   data/maps.js and data/rooms.js. Generated; regenerate rather than edit. */\n")
    print("wrote %s: %d maps in %d rooms" % (out, len(maps), len(rooms)))

if __name__ == "__main__":
    main()
