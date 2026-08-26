/* Atlas – the places index. Reads data/places.js (the normalised place table: names, states, coordinates and
   entry ids) and the Deccan and Basalt collections' own entries.js for titles and dates. Renders at load.

   GAZE HOOK: the European Gaze collection's own places index, european-gaze/js/places.js (window.GAZE_PLACES),
   is loaded when reachable and lists, under each place, the maps that show it. See applyGaze() below for the
   shape it reads; nothing here is written to that repository. */
(function () {
  "use strict";
  var DECCAN = "../deccan/", BASALT = "../basalt-and-laterite/";
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var norm = function (s) { return String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); };

  var places = window.ATLAS_PLACES || [], gaze = window.ATLAS_GAZE;
  var dById = {}, bById = {};
  (window.DECCAN_ENTRIES || []).forEach(function (e) { dById[e.id] = e; });
  (window.BL_ENTRIES || []).forEach(function (e) { bById[e.id] = e; });
  var root = document.getElementById("places"), toc = document.getElementById("toc"), q = document.getElementById("q");
  if (!places.length || !Object.keys(dById).length || !Object.keys(bById).length) {
    root.innerHTML = '<p class="note">The index could not be loaded: a data file is missing (atlas/data/places.js, deccan/data, basalt-and-laterite/data).</p>';
    return;
  }

  function fmtLL(lat, lon) {
    if (lat == null) return "";
    return Math.abs(lat).toFixed(2) + "°" + (lat < 0 ? "S" : "N") + " " + Math.abs(lon).toFixed(2) + "°" + (lon < 0 ? "W" : "E");
  }
  function locality(e, p) {
    var parts = (e.place || "").split(",").map(function (s) { return s.trim(); });
    var first = parts[0];
    if (!first) return "";
    if (parts.length >= 3 && norm(first) !== norm(p.name)) return first;
    if (/district|crest|near /i.test(first) && norm(first) !== norm(p.name)) return first;
    return "";
  }
  function row(kind, href, title, date, loc, blank) {
    return '<li class="' + kind + '"><span class="k">' + (kind === "deccan" ? "Deccan" : kind === "basalt" ? "Basalt" : "Map") + '</span><a href="' + E(href) + '"' + (blank ? ' target="_blank" rel="noopener"' : "") + ">" + E(title) + "</a>" +
      (date ? ' <span class="d">· ' + E(date) + "</span>" : "") + (loc ? ' <span class="loc">' + E(loc) + "</span>" : "") + "</li>";
  }
  function placeHtml(p) {
    var d = p.deccan.map(function (id) { return dById[id]; }).filter(Boolean).sort(function (a, b) { return a.year - b.year; });
    var b = p.basalt.map(function (id) { return bById[id]; }).filter(Boolean).sort(function (a, b) { return b.age - a.age; });
    var rows = b.map(function (e) { return row("basalt", BASALT + "#" + e.id, e.title, e.date_label, locality(e, p)); })
      .concat(d.map(function (e) { return row("deccan", DECCAN + "#" + e.id, e.title, e.date_label, locality(e, p)); }));
    var aka = p.aliases.map(function (a) { return a.split(",")[0].trim(); }).filter(function (a, i, arr) { return arr.indexOf(a) === i && norm(a).indexOf(norm(p.name)) < 0 && !/district|crest/i.test(a) && a.split(" ").length < 4; });
    var hay = [p.name, p.state].concat(p.aliases, d.map(function (e) { return e.title; }), b.map(function (e) { return e.title; })).join(" ").toLowerCase();
    return '<section class="place" id="pl-' + E(p.key) + '" data-hay="' + E(hay) + '"><div><h3>' + E(p.name) + "</h3>" +
      '<p class="where">' + (p.state ? E(p.state) + " · " : "") + '<span class="ll">' + fmtLL(p.lat, p.lon) + "</span>" + (p.kind === "region" ? " · region" : "") + "</p>" +
      (aka.length ? '<p class="aka">also as ' + E(aka.join(", ")) + "</p>" : "") + '</div><ul data-key="' + E(p.key) + '">' + rows.join("") + "</ul></section>";
  }

  /* ---------- render ---------- */
  var groups = {}, order = [];
  places.forEach(function (p) {
    var g = p.kind === "region" ? "Regions and elsewhere" : (p.state || "Elsewhere");
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(p);
  });
  order.sort(function (a, b) { return (a === "Regions and elsewhere") - (b === "Regions and elsewhere") || groups[b].length - groups[a].length || (a < b ? -1 : 1); });
  root.innerHTML = order.map(function (g) {
    return '<h3 class="group-title" id="st-' + E(norm(g).replace(/ /g, "-")) + '" style="margin-top:2rem">' + E(g) + ' <span style="letter-spacing:0">· ' + groups[g].length + "</span></h3>" + groups[g].map(placeHtml).join("");
  }).join("");
  toc.innerHTML = order.map(function (g) { return '<li><a href="#st-' + E(norm(g).replace(/ /g, "-")) + '">' + E(g) + "</a></li>"; }).join("");
  var nD = places.reduce(function (a, p) { return a + p.deccan.length; }, 0), nB = places.reduce(function (a, p) { return a + p.basalt.length; }, 0);
  document.getElementById("places-note").insertAdjacentHTML("beforeend", " " + places.length + " places; " + nD + " Deccan and " + nB + " Basalt entries.");

  q.addEventListener("input", function () {
    var words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    root.querySelectorAll(".place").forEach(function (sec) {
      var hay = sec.dataset.hay;
      sec.classList.toggle("hide", !words.every(function (w) { return hay.indexOf(w) >= 0; }));
    });
    root.querySelectorAll("h3.group-title").forEach(function (h) {
      var n = h.nextElementSibling, any = false;
      while (n && n.classList.contains("place")) { if (!n.classList.contains("hide")) any = true; n = n.nextElementSibling; }
      h.hidden = !any;
    });
  });
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

  /* ---------- GAZE HOOK ----------
     european-gaze/js/places.js defines window.GAZE_PLACES: an array of
       {id, name, modern, kind, variants:[spellings], deccan:[{id,title,date}], maps:[{file,title,year,date,room,sources,via,matched}]}
     (rivers and regions included; no coordinates). A Gaze place is matched to an atlas place by name – its name,
     its "A / B" halves, its variants and the first part of its modern name – against the atlas place's name,
     bracketed old name and aliases; failing that, a town is matched by the Deccan entry ids the two share.
     Unmatched Gaze places (rivers, regions, towns outside the two collections) are simply not shown here. */
  function mapTitle(file) {
    var m = gaze && gaze.maps.filter(function (x) { return x.file === file; })[0];
    if (m) return {t: m.maker + ", " + m.title, d: m.date_label};
    var p = String(file).replace(/\.html$/, "").split("__");
    return {t: (p[2] ? p[2].replace(/-/g, " ") + ", " : "") + (p[p.length - 1] || file).replace(/-/g, " "), d: (p[0] || "").replace(/^c/, "c.")};
  }
  function nameKeys(p) {
    var keys = [norm(p.name)];
    var br = /\(([^)]+)\)/.exec(p.name); if (br) keys.push(norm(br[1]));
    keys.push(norm(p.name.replace(/\(.*?\)/g, "")));
    p.aliases.forEach(function (a) { var f = a.split(",")[0]; keys.push(norm(f)); var b = /\(([^)]+)\)/.exec(f); if (b) keys.push(norm(b[1])); keys.push(norm(f.replace(/\(.*?\)/g, ""))); });
    return keys.filter(function (k, i, arr) { return k && arr.indexOf(k) === i; });
  }
  function applyGaze(GP) {
    var list = Array.isArray(GP) ? GP : Object.keys(GP || {}).map(function (k) { var v = GP[k]; return Array.isArray(v) ? {name: k, maps: v} : Object.assign({name: k}, v); });
    var byName = {}, byEntry = {};
    places.forEach(function (p) {
      nameKeys(p).forEach(function (k) { byName[k] = byName[k] || p; });
      p.deccan.forEach(function (id) { byEntry[id] = p; });
    });
    var added = 0, matched = 0;
    list.forEach(function (gp) {
      var maps = gp.maps || gp.files || [];
      if (!maps.length) return;
      var p = null, votes = {};
      var cands = [gp.name || gp.place || ""].concat(String(gp.name || "").split(" / "), gp.variants || [], [String(gp.modern || "").split(",")[0]]);
      for (var i = 0; i < cands.length && !p; i++) p = byName[norm(cands[i])] || null;
      /* rivers, regions, coasts and the like are not points: match those by name only */
      if (!p && !/region|river|range|coast|island|cape|presidency|province|state/i.test(gp.kind || "")) {
        (gp.deccan || []).forEach(function (d) { var id = typeof d === "string" ? d : d.id; var c = byEntry[id]; if (c) votes[c.key] = (votes[c.key] || 0) + 1; });
        var best = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; })[0];
        if (best) p = places.filter(function (c) { return c.key === best; })[0];
      }
      if (!p && gp.lat != null && gp.lon != null) places.forEach(function (c) { if (!p && c.lat != null && Math.abs(c.lat - gp.lat) < 0.15 && Math.abs(c.lon - gp.lon) < 0.15) p = c; });
      if (!p) return;
      matched++;
      var ul = root.querySelector('ul[data-key="' + p.key + '"]'); if (!ul) return;
      maps.slice().sort(function (a, b) { return (a.year || 0) - (b.year || 0); }).forEach(function (m) {
        var file = typeof m === "string" ? m : (m.file || m.href || m.id);
        if (!file || ul.querySelector('a[href$="' + file + '"]')) return;
        var mt = mapTitle(file), base = (gaze && gaze.base) || "https://naniwadekar.com/european-gaze/";
        var src = m.sources || [], how = src.indexOf("notes") >= 0 ? "" : src.indexOf("deccan") >= 0 ? "via the Deccan entries" : src.indexOf("region") >= 0 ? "within the sheet’s region" : "";
        ul.insertAdjacentHTML("beforeend", row("gaze", /^https?:/.test(file) ? file : base + file, mt.t, m.date || mt.d, how, true));
        added++;
      });
      var sec = ul.closest(".place"); if (sec) sec.dataset.hay += " " + ul.textContent.toLowerCase() + " " + (gp.variants || []).join(" ").toLowerCase();
    });
    if (added) document.getElementById("places-note").insertAdjacentHTML("beforeend", " Map references from The European Gaze: " + added + ", at " + matched + " places.");
  }
  function loadGaze() {
    if (window.GAZE_PLACES) { applyGaze(window.GAZE_PLACES); return; }
    /* on the site the map collection sits beside this one; in a local checkout it may be a sibling repository */
    var srcs = ["../european-gaze/js/places.js", "../../european-gaze/js/places.js"];
    (function tryNext(i) {
      if (i >= srcs.length) return;   // no Gaze places index reachable – the page stands without it
      var s = document.createElement("script");
      s.src = srcs[i]; s.async = true;
      s.onload = function () { if (window.GAZE_PLACES) applyGaze(window.GAZE_PLACES); };
      s.onerror = function () { s.remove(); tryNext(i + 1); };
      document.body.appendChild(s);
    })(0);
  }
  loadGaze();
})();
