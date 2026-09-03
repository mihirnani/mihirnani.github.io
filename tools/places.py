#!/usr/bin/env python3
"""One reading of the collections' `place` fields.

Entries write their place as free text – 'Vasai (Bassein, Baçaim), Maharashtra',
'Ahmednagar, Maharashtra', 'Lalbagh, Bengaluru, Karnataka' – and the same town
appears under several spellings.  The atlas's places index and the text
edition's by-place index both need to fold those into one name each, so the
rules live here and both read them.

    from places import Places
    P = Places(deccan_entries + basalt_entries)
    name, state, locality = P.canon(entry["place"])
"""
import re

# Spelling variants -> one canonical name (the collection's most common modern form, old name in brackets)
ALIAS = {
    "ahmednagar": "Ahmadnagar", "ahmadnagar district": "Ahmadnagar",
    "chennai (madras)": "Chennai", "chennai": "Chennai",
    "gulbarga (kalaburagi)": "Kalaburagi (Gulbarga)", "kalaburagi (gulbarga)": "Kalaburagi (Gulbarga)",
    "mysore": "Mysuru (Mysore)", "mysuru": "Mysuru (Mysore)",
    "vasai (bassein)": "Vasai (Bassein)", "vasai": "Vasai (Bassein)",
    "vasai (bassein, baçaim)": "Vasai (Bassein)",
    "vijayapura (bijapur)": "Bijapur", "bijapur": "Bijapur",
    "bijapur (vijayapura)": "Bijapur",
    "hyderabad and golconda": "Hyderabad", "hyderabad": "Hyderabad",
    "bombay (mumbai)": "Mumbai", "mumbai": "Mumbai",
    "achalpur (elichpur)": "Achalpur", "achalpur": "Achalpur",
    "mahabaleshwar crest": "Mahabaleshwar", "mahabaleshwar": "Mahabaleshwar",
    "pollilur": "Pollilur",
    "rakkasagi-tangadagi": "Rakkasagi-Tangadagi (Talikota)",
}
# places that are regions, institutions or abroad rather than points on the peninsula
REGION = {"Berar and the Deccan cotton tracts", "Khandesh and the northern Deccan", "The Konkan edge",
          "The literature", "The Narmada valley", "Victoria and Albert Museum", "Delhi", "Réunion"}
STATES = {"Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh", "Tamil Nadu", "Kerala", "Goa", "Gujarat",
          "Madhya Pradesh", "Uttar Pradesh", "Haryana", "Delhi", "London", "Indian Ocean"}
QUALIFIER = re.compile(r"^(near |on the |source of the )|\bdistrict$|\bvalley$", re.I)

def split(place):
    """'Vasai (Bassein, Baçaim), Maharashtra' -> (['Vasai (Bassein, Baçaim)'], 'Maharashtra').
    Commas inside brackets belong to the name, not to the address."""
    parts, depth, buf = [], 0, ""
    for ch in place:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append(buf.strip()); buf = ""
        else:
            buf += ch
    parts.append(buf.strip())
    state = parts[-1] if len(parts) > 1 and parts[-1] in STATES else ""
    core = parts[:-1] if state else parts
    return core, state

def key_of(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

class Places:
    """Knows which names stand alone in the data, so 'Lalbagh, Bengaluru' can fold into 'Bengaluru'."""
    def __init__(self, entries):
        plain = set()
        for e in entries:
            p = e.get("place")
            if not p:
                continue
            core, _ = split(p)
            if len(core) == 1:
                plain.add(ALIAS.get(core[0].lower(), core[0]).lower())
                plain.add(core[0].lower())
        self.cities = plain

    def canon(self, place):
        """place text -> (canonical name, state, locality-or-None)."""
        core, state = split(place)
        name = core[0]
        key = name.lower()
        if key in ALIAS:
            return ALIAS[key], state, None
        if len(core) >= 2:
            mid = core[1]
            if not QUALIFIER.search(mid) and mid.lower() in self.cities:
                return ALIAS.get(mid.lower(), mid), state, name   # locality within a city
        return name, state, None
