/* Atlas – one chronology. Deep time from Basalt and Laterite (age in years before present, periods a0..a1),
   then human time 1296–1947 merging the Deccan chronology, the Deccan entries, the youngest Basalt entries and
   the European Gaze maps. Everything is rendered from the collections' own data files at load. */
(function () {
  "use strict";
  var DECCAN = "../deccan/", BASALT = "../basalt-and-laterite/";
  var PRESENT = 2026;                 // Basalt's "years before present" are counted from about now
  var H0 = 1296, H1 = 1947;
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var f1 = function (n) { return (Math.round(n * 10) / 10).toString(); };
  var KIND = {battle: "Battle", treaty: "Treaty", person: "Person", place: "Place", document: "Document", object: "Object",
    institution: "Institution", event: "Event", formation: "Formation", process: "Process"};

  var dEntries = window.DECCAN_ENTRIES || [], dPeriods = window.DECCAN_PERIODS || [], chron = window.DECCAN_CHRONOLOGY || [];
  var bEntries = window.BL_ENTRIES || [], bPeriods = window.BL_PERIODS || [], gaze = window.ATLAS_GAZE;
  if (!dEntries.length || !bEntries.length || !chron.length || !gaze) {
    document.getElementById("deep-list").innerHTML = '<p class="note">The chronology could not be loaded: a data file is missing.</p>';
    return;
  }
  var byId = {}; dEntries.forEach(function (e) { byId[e.id] = e; });

  /* ---------- deep time ---------- */
  function deepBand() {
    var W = 900, X0 = 10, X1 = 890, Y0 = 34, H = 92, PW = (X1 - X0) / bPeriods.length;
    function px(age, p) {
      var la0 = Math.log(p.a0), la1 = Math.log(Math.max(p.a1, 10));
      var f = (la0 - Math.log(Math.max(age, 10))) / (la0 - la1);
      f = Math.max(0.04, Math.min(0.96, f));
      return X0 + PW * (bPeriods.indexOf(p) + f);
    }
    var s = ['<svg class="band-svg" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="Deep-time band, one panel per period of Basalt and Laterite, positions on a logarithmic scale within each panel">'];
    bPeriods.forEach(function (p, i) {
      var x = X0 + i * PW;
      s.push('<rect class="pband' + (i % 2 ? " alt" : "") + '" x="' + f1(x) + '" y="0" width="' + f1(PW) + '" height="' + H + '"/>');
      s.push('<text class="pt" x="' + f1(x + 5) + '" y="13">' + E((p.short || p.title).toUpperCase()) + "</text>");
      s.push('<text x="' + f1(x + 5) + '" y="' + (H - 6) + '">' + E(p.years) + "</text>");
    });
    var used = [];
    bEntries.slice().sort(function (a, b) { return b.age - a.age; }).forEach(function (e) {
      var p = bPeriods[e.period - 1]; if (!p) return;
      var cx = px(e.age, p), slot = 0;
      while (used.some(function (u) { return Math.abs(cx - u[0]) < 9 && u[1] === slot; })) slot++;
      used.push([cx, slot]);
      var cy = Y0 + 14 + slot * 10;
      s.push('<a class="mk" href="#b-' + E(e.id) + '" aria-label="' + E(e.title) + ", " + E(e.date_label) + '"><title>' + E(e.title) + " · " + E(e.date_label) + "</title>" +
        '<polygon points="' + f1(cx) + "," + f1(cy - 4.5) + " " + f1(cx + 4) + "," + f1(cy + 3) + " " + f1(cx - 4) + "," + f1(cy + 3) + '"/></a>');
    });
    s.push("</svg>");
    document.getElementById("deep-band").innerHTML = s.join("\n");
  }
  function deepList() {
    var s = [];
    bPeriods.forEach(function (p, i) {
      var es = bEntries.filter(function (e) { return e.period === p.n; }).sort(function (a, b) { return b.age - a.age; });
      s.push('<section class="era" id="bp' + p.n + '" style="--band:var(--stone)"><div class="band"><div class="sticky"><span class="n">0' + p.n + '</span><span class="ttl">' + E(p.title) + '</span><span class="yrs">' + E(p.years) + "</span></div></div><ol>");
      es.forEach(function (e) {
        s.push('<li class="basalt" id="b-' + E(e.id) + '"><span class="d">' + E(e.date_label) + '</span><span><span class="k">' + E(KIND[e.kind] || e.kind) + '</span><a href="' + BASALT + "#" + E(e.id) + '">' + E(e.title) + '</a> <span class="strap">' + E(e.strap) + "</span></span></li>");
      });
      s.push("</ol></section>");
    });
    document.getElementById("deep-list").innerHTML = s.join("\n");
  }

  /* ---------- human time ---------- */
  function yearOf(label, fallback) {
    var m = /(\d{4})/.exec(label || "");
    if (m) return +m[1];
    if (fallback != null) return fallback;
    m = /(\d{2})(?:th|st|nd|rd)/.exec(label || "");
    if (m) return (+m[1] - 1) * 100 + 50;
    return null;
  }
  var items = [];   // {y, ord, kind, html, id}
  var linked = {};
  chron.forEach(function (sec, si) {
    sec.items.forEach(function (it) {
      var y = yearOf(it.d, it.e && byId[it.e] ? byId[it.e].year : null);
      if (y == null) return;
      if (it.e) linked[it.e] = true;
      items.push({y: y, ord: 0, kind: "chron", d: it.d, text: it.t, e: it.e && byId[it.e] ? it.e : null});
    });
  });
  dEntries.forEach(function (e) {
    if (linked[e.id]) return;
    items.push({y: e.year, ord: 1, kind: "entry", d: e.date_label, text: e.title, e: e.id, strap: e.strap});
  });
  bEntries.forEach(function (e) {
    var y = PRESENT - e.age;
    if (y < H0 || y > H1) return;
    items.push({y: y, ord: 2, kind: "basalt", d: e.date_label, text: e.title, b: e.id, strap: e.strap});
  });
  gaze.maps.forEach(function (m) {
    if (m.year < H0 || m.year > H1) return;
    items.push({y: m.year, ord: 3, kind: "gaze", d: m.date_label, text: m.maker + ", " + m.title, file: m.file, room: m.room});
  });
  items.sort(function (a, b) { return a.y - b.y || a.ord - b.ord || (a.text < b.text ? -1 : 1); });

  /* eras: the backdrop before the collection, the Deccan's seven periods, and the horizon after them */
  var eras = [{n: "·", title: chron[0].title.replace(/ – .*$/, ""), short: "Backdrop", years: H0 + "–" + dPeriods[0].start, start: H0, end: dPeriods[0].start, color: "var(--muted)"}];
  dPeriods.forEach(function (p) { eras.push({n: "0" + p.n, title: p.title, short: p.short, years: p.years, start: p.start, end: p.end, color: "var(--deccan)"}); });
  var last = dPeriods[dPeriods.length - 1].end;
  eras.push({n: "·", title: "After the close", short: "After", years: last + "–" + H1, start: last, end: H1 + 1, color: "var(--muted)"});
  function eraOf(y) { for (var i = eras.length - 1; i >= 0; i--) if (y >= eras[i].start) return i; return 0; }

  var show = {chron: true, entry: true, basalt: true, gaze: true};
  function humanBand() {
    var W = 900, X0 = 10, X1 = 890, H = 108, x = function (y) { return X0 + (y - H0) / (H1 - H0) * (X1 - X0); };
    var s = ['<svg class="band-svg" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="Human-time band, 1296 to 1947, with the periods of the Deccan and a tick for every item">'];
    eras.forEach(function (er, i) {
      s.push('<rect class="pband' + (i % 2 ? " alt" : "") + '" x="' + f1(x(er.start)) + '" y="0" width="' + f1(x(Math.min(er.end, H1 + 1)) - x(er.start)) + '" height="' + H + '"/>');
      s.push('<text class="pt" x="' + f1(x(er.start) + 4) + '" y="' + (i % 2 ? 24 : 12) + '">' + E((er.short || er.title).toUpperCase()) + "</text>");
    });
    for (var y = 1300; y <= 1900; y += 100) {
      s.push('<line class="tick" x1="' + f1(x(y)) + '" y1="30" x2="' + f1(x(y)) + '" y2="' + (H - 16) + '"/>');
      s.push('<text text-anchor="middle" x="' + f1(x(y)) + '" y="' + (H - 5) + '">' + y + "</text>");
    }
    var rows = {chron: 42, entry: 58, gaze: 74, basalt: 58}, used = {};
    items.forEach(function (it, i) {
      var cx = x(it.y), row = rows[it.kind], slot = 0;
      used[row] = used[row] || [];
      while (used[row].some(function (u) { return Math.abs(cx - u[0]) < 5 && u[1] === slot; })) slot++;
      used[row].push([cx, slot]);
      var cy = row + slot * 4.5, id = "h-" + i;
      s.push('<a class="mk ' + it.kind + '" href="#' + id + '" data-kind="' + it.kind + '" aria-label="' + E(it.d) + ", " + E(it.text) + '"><title>' + E(it.d) + " · " + E(it.text) + "</title>" +
        (it.kind === "gaze" ? '<rect x="' + f1(cx - 2.5) + '" y="' + f1(cy - 2.5) + '" width="5" height="5"/>' : it.kind === "basalt" ? '<polygon points="' + f1(cx) + "," + f1(cy - 3.5) + " " + f1(cx + 3.2) + "," + f1(cy + 2.4) + " " + f1(cx - 3.2) + "," + f1(cy + 2.4) + '"/>' : '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="2.6"/>') + "</a>");
    });
    s.push("</svg>");
    document.getElementById("human-band").innerHTML = s.join("\n");
  }
  function humanList() {
    var s = [], cur = -1;
    items.forEach(function (it, i) {
      var ei = eraOf(it.y);
      if (ei !== cur) {
        if (cur >= 0) s.push("</ol></section>");
        var er = eras[ei];
        s.push('<section class="era" id="era-' + ei + '" style="--band:' + er.color + '"><div class="band"><div class="sticky"><span class="n">' + E(er.n) + '</span><span class="ttl">' + E(er.title) + '</span><span class="yrs">' + E(er.years) + "</span></div></div><ol>");
        cur = ei;
      }
      var body;
      if (it.kind === "chron") body = it.e ? '<span class="k">Entry</span><a href="' + DECCAN + "#" + E(it.e) + '">' + E(it.text) + "</a>" : E(it.text);
      else if (it.kind === "entry") body = '<span class="k">Entry</span><a href="' + DECCAN + "#" + E(it.e) + '">' + E(it.text) + '</a> <span class="strap">' + E(it.strap) + "</span>";
      else if (it.kind === "basalt") body = '<span class="k">Basalt</span><a href="' + BASALT + "#" + E(it.b) + '">' + E(it.text) + '</a> <span class="strap">' + E(it.strap) + "</span>";
      else body = '<span class="k">Map</span><a href="' + E(gaze.base + it.file) + '">' + E(it.text) + "</a>" + (it.room ? ' <span class="strap">Room ' + it.room + "</span>" : "");
      s.push('<li class="' + it.kind + '" id="h-' + i + '"><span class="d">' + E(it.d) + "</span><span>" + body + "</span></li>");
    });
    if (cur >= 0) s.push("</ol></section>");
    document.getElementById("human-list").innerHTML = s.join("\n");
  }
  function humanControls() {
    var n = function (k) { return items.filter(function (i) { return i.kind === k; }).length; };
    document.getElementById("human-controls").innerHTML =
      '<label><input type="checkbox" data-k="chron" checked> <span class="swatch" style="--c:var(--muted)"></span> Chronology items <span class="note" style="display:inline;margin:0">(' + n("chron") + ")</span></label>" +
      '<label><input type="checkbox" data-k="entry" checked> <span class="swatch" style="--c:var(--deccan)"></span> Deccan entries <span class="note" style="display:inline;margin:0">(' + n("entry") + " without an item)</span></label>" +
      '<label><input type="checkbox" data-k="basalt" checked> <span class="swatch swatch--triangle" style="--c:var(--stone)"></span> Basalt <span class="note" style="display:inline;margin:0">(' + n("basalt") + ")</span></label>" +
      '<label><input type="checkbox" data-k="gaze" checked> <span class="swatch swatch--square" style="--c:var(--map)"></span> Maps <span class="note" style="display:inline;margin:0">(' + n("gaze") + ")</span></label>";
    document.getElementById("human-controls").addEventListener("change", function (ev) {
      var k = ev.target.dataset.k; if (!k) return;
      show[k] = ev.target.checked;
      document.querySelectorAll("#human-list li." + k).forEach(function (li) { li.hidden = !show[k]; });
      document.querySelectorAll("#human-band .mk." + k).forEach(function (a) { a.style.display = show[k] ? "" : "none"; });
      document.querySelectorAll("#human-list .era").forEach(function (sec) { sec.hidden = !sec.querySelector("li:not([hidden])"); });
    });
  }

  deepBand(); deepList(); humanControls(); humanBand(); humanList();
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
