/* Atlas – one map of the three place-bound collections. Reads the Deccan and Basalt collections' own data files, the European Gaze
   map list (data/gaze.js) and the coastline (data/coast.js), all loaded as scripts so the page works from a folder. */
(function () {
  "use strict";
  var DECCAN = "../deccan/", BASALT = "../basalt-and-laterite/";
  var W_LON = 68, E_LON = 88, S_LAT = 8, N_LAT = 24;
  var SY = 40, SX = SY * Math.cos(16 * Math.PI / 180);
  var W = (E_LON - W_LON) * SX, H = (N_LAT - S_LAT) * SY;
  var Y_MIN = 1330, Y_MAX = 1880, HALO = 10, MAP_HALO = 25;
  var POL = {delhi: "Delhi sultanate", vijayanagara: "Vijayanagara", bahmani: "Bahmani sultanate", sultanates: "Deccan sultanates",
    mughal: "Mughal empire", maratha: "Marathas", mysore: "Mysore", hyderabad: "Hyderabad", portuguese: "Portuguese",
    company: "East India Company", crown: "British Crown", other: "Other"};
  var KIND = {battle: "Battle", treaty: "Treaty", person: "Person", place: "Place", document: "Document", object: "Object",
    institution: "Institution", event: "Event", formation: "Formation", process: "Process"};
  /* representative points for the Gaze region tags; regions not listed are "beyond this frame" */
  var REGION_PT = {India: [20.5, 80.5], Deccan: [17.5, 76], SouthIndia: [12, 78], Bombay: [18.95, 72.83], Malabar: [11, 76], Goa: [15.4, 73.9]};
  var REGION_NAME = {India: "India", Deccan: "The Deccan", SouthIndia: "South India", Bombay: "Bombay", Malabar: "Malabar", Goa: "Goa",
    IndianOcean: "The Indian Ocean", Asia: "Asia", ClassicalAsia: "Classical Asia", "India-Arabia": "India and Arabia", "Persia-India": "Persia and India",
    SEAsia: "India and South-east Asia", BayOfBengal: "The Bay of Bengal", Punjab: "The Punjab", "Punjab-Kashmir": "The Punjab and Kashmir", "CentralAsia-Tibet": "Central Asia and Tibet"};
  /* a few towns for orientation – not entries */
  var TOWNS = [["Surat", 21.17, 72.83, "e"], ["Mumbai", 18.95, 72.83, "w"], ["Pune", 18.52, 73.86, "e"], ["Goa", 15.5, 73.83, "w"], ["Aurangabad", 19.88, 75.34, "e"],
    ["Bijapur", 16.83, 75.72, "e"], ["Bidar", 17.9, 77.52, "e"], ["Hyderabad", 17.38, 78.47, "e"], ["Hampi", 15.33, 76.46, "e"], ["Nagpur", 21.15, 79.09, "e"],
    ["Masulipatnam", 16.18, 81.13, "e"], ["Madras", 13.08, 80.27, "e"], ["Bengaluru", 12.97, 77.59, "e"], ["Mysore", 12.3, 76.65, "w"], ["Calicut", 11.25, 75.78, "w"],
    ["Madurai", 9.93, 78.12, "e"], ["Cuttack", 20.46, 85.88, "w"]];

  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var px = function (lon) { return (lon - W_LON) * SX; }, py = function (lat) { return (N_LAT - lat) * SY; };
  var f1 = function (n) { return (Math.round(n * 10) / 10).toString(); };

  var mapEl = document.getElementById("map"), wrap = document.getElementById("map-wrap"), tip = document.getElementById("tooltip"),
    panel = document.getElementById("panel"), controls = document.getElementById("controls"), beyond = document.getElementById("beyond");
  var deccan = window.DECCAN_ENTRIES || [], basalt = window.BL_ENTRIES || [], coast = window.ATLAS_COAST, gaze = window.ATLAS_GAZE;
  if (!coast || !gaze || !deccan.length || !basalt.length) {
    mapEl.innerHTML = '<p class="note" style="padding:1rem">The atlas could not be loaded: one of the data files is missing (deccan/data, basalt-and-laterite/data, atlas/data).</p>';
    return;
  }

  /* ---------- state ---------- */
  var show = {deccan: true, basalt: true, gaze: true}, year = null, polPick = new Set();
  var items = [];   // {kind, id, x, y, href, title, date, pol, y0, y1, el}
  var selected = null;            // the marker a touch has picked; a second tap on it opens the page
  var lastPointerType = "mouse";  // "mouse", "pen", "touch" or "keyboard" – decides the tooltip's wording and the tap-twice rule
  document.addEventListener("pointerdown", function (ev) { lastPointerType = ev.pointerType || "mouse"; }, true);
  document.addEventListener("keydown", function () { lastPointerType = "keyboard"; }, true);

  function polityOf(e) {
    var p = e.polities[0];
    if (p === "other" && e.polities[1]) p = e.polities[1];
    return POL[p] ? p : "other";
  }
  function inFrame(lat, lon) { return lat >= S_LAT && lat <= N_LAT && lon >= W_LON && lon <= E_LON; }

  /* ---------- layout: keep markers from sitting on one another ---------- */
  var taken = [];
  function free(x, y, r) {
    for (var i = 0; i < taken.length; i++) { var t = taken[i]; var d = r + t[2]; if ((x - t[0]) * (x - t[0]) + (y - t[1]) * (y - t[1]) < d * d) return false; }
    return x >= r && y >= r && x <= W - r && y <= H - r;
  }
  function settle(x, y, r) {
    if (free(x, y, r)) { taken.push([x, y, r]); return [x, y]; }
    var GA = Math.PI * (3 - Math.sqrt(5));
    for (var k = 1; k < 400; k++) {
      var rad = r * 1.1 * Math.sqrt(k), a = k * GA, nx = x + rad * Math.cos(a), ny = y + rad * Math.sin(a);
      if (free(nx, ny, r)) { taken.push([nx, ny, r]); return [nx, ny]; }
    }
    taken.push([x, y, r]); return [x, y];
  }

  /* ---------- build the SVG ---------- */
  function build() {
    var s = ['<svg viewBox="0 0 ' + f1(W) + " " + f1(H) + '" role="group" aria-label="Map of peninsular India, 68 to 88 degrees east and 8 to 24 degrees north, with the entries and maps of the site marked">'];
    s.push('<rect class="frame" x="0.5" y="0.5" width="' + f1(W - 1) + '" height="' + f1(H - 1) + '"/>');
    coast.land.forEach(function (ring) {
      s.push('<polygon class="land" points="' + ring.map(function (p) { return f1(px(p[0])) + "," + f1(py(p[1])); }).join(" ") + '"/>');
    });
    for (var lon = W_LON + 4; lon < E_LON; lon += 4) {
      s.push('<line class="graticule" x1="' + f1(px(lon)) + '" y1="0" x2="' + f1(px(lon)) + '" y2="' + f1(H) + '"/>');
      s.push('<text class="grat-lbl" x="' + f1(px(lon) + 2) + '" y="' + f1(H - 4) + '">' + lon + "°E</text>");
    }
    for (var lat = S_LAT + 4; lat < N_LAT; lat += 4) {
      s.push('<line class="graticule" x1="0" y1="' + f1(py(lat)) + '" x2="' + f1(W) + '" y2="' + f1(py(lat)) + '"/>');
      s.push('<text class="grat-lbl" x="3" y="' + f1(py(lat) - 3) + '">' + lat + "°N</text>");
    }
    var rlbl = {};
    coast.rivers.forEach(function (r) {
      s.push('<polyline class="river" points="' + r.points.map(function (p) { return f1(px(p[0])) + "," + f1(py(p[1])); }).join(" ") + '"/>');
      if (!rlbl[r.name] || rlbl[r.name] < r.points.length) rlbl[r.name] = r.points.length;
    });
    /* river names at a point roughly a third of the way along the longest piece */
    var named = {};
    coast.rivers.forEach(function (r) {
      if (named[r.name] || r.points.length !== rlbl[r.name]) return; named[r.name] = true;
      var p = r.points[Math.floor(r.points.length * 0.38)];
      s.push('<text class="rlbl" x="' + f1(px(p[0]) + 3) + '" y="' + f1(py(p[1]) - 3) + '">' + E(r.name) + "</text>");
    });
    TOWNS.forEach(function (t) {
      var x = px(t[2]), y = py(t[1]), west = t[3] === "w";
      s.push('<circle class="plbl-dot" cx="' + f1(x) + '" cy="' + f1(y) + '" r="1.2"/>');
      s.push('<text class="plbl"' + (west ? ' text-anchor="end"' : "") + ' x="' + f1(x + (west ? -4 : 4)) + '" y="' + f1(y + 3) + '">' + E(t[0]) + "</text>");
    });

    /* Gaze region clusters first, so the entry markers flow around them */
    var byRegion = {};
    gaze.maps.forEach(function (m) { (byRegion[m.region] = byRegion[m.region] || []).push(m); });
    var CELL = 6, GAP = 2.6;   /* tiles small and well spaced, so a big region reads as a cluster, not a slab */
    Object.keys(REGION_PT).forEach(function (reg) {
      var list = byRegion[reg]; if (!list) return;
      var cx = px(REGION_PT[reg][1]), cy = py(REGION_PT[reg][0]);
      var cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
      var x0 = cx - (cols * CELL + (cols - 1) * GAP) / 2, y0 = cy - (rows * CELL + (rows - 1) * GAP) / 2;
      list.forEach(function (m, i) {
        var x = x0 + (i % cols) * (CELL + GAP), y = y0 + Math.floor(i / cols) * (CELL + GAP);
        taken.push([x + CELL / 2, y + CELL / 2, CELL / 2 + 0.5]);
        items.push({kind: "gaze", id: m.file, x: x, y: y, href: gaze.base + m.file, title: m.title, date: m.date_label + " · " + m.maker,
          sub: REGION_NAME[reg] + (m.room ? " · Room " + m.room : ""), y0: m.year, y1: m.year});
      });
      s.push('<text class="region-lbl" text-anchor="middle" x="' + f1(cx) + '" y="' + f1(y0 + rows * (CELL + GAP) + 7) + '">' + E(REGION_NAME[reg]) + " · " + list.length + "</text>");
    });

    /* Deccan circles, then Basalt triangles */
    var R = 4;
    deccan.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (e) {
      if (e.lat == null || !inFrame(e.lat, e.lon)) return;
      var p = settle(px(e.lon), py(e.lat), R + 0.6);
      items.push({kind: "deccan", id: e.id, x: p[0], y: p[1], href: DECCAN + "#" + e.id, title: e.title, date: e.date_label,
        sub: KIND[e.kind] + " · " + e.polities.map(function (k) { return POL[k]; }).join(", ") + (e.place ? " · " + e.place : ""),
        pol: polityOf(e), y0: e.year, y1: e.year_end || e.year});
    });
    basalt.forEach(function (e) {
      if (e.lat == null || !inFrame(e.lat, e.lon)) return;
      var p = settle(px(e.lon), py(e.lat), R + 0.8);
      items.push({kind: "basalt", id: e.id, x: p[0], y: p[1], href: BASALT + "#" + e.id, title: e.title, date: e.date_label,
        sub: (KIND[e.kind] || e.kind) + (e.place ? " · " + e.place : "")});
    });

    items.forEach(function (it, i) {
      var label = it.title + ", " + it.date;
      var open = '<a class="mk ' + it.kind + '" href="' + E(it.href) + '" data-i="' + i + '" tabindex="0" aria-label="' + E(label) + '"' +
        (it.kind === "deccan" ? ' style="--c:var(--pol-' + it.pol + ')"' : "") + ">";
      var glyph;
      if (it.kind === "deccan") glyph = '<circle cx="' + f1(it.x) + '" cy="' + f1(it.y) + '" r="' + R + '"/>';
      else if (it.kind === "basalt") glyph = '<polygon points="' + f1(it.x) + "," + f1(it.y - 5) + " " + f1(it.x + 4.6) + "," + f1(it.y + 3.2) + " " + f1(it.x - 4.6) + "," + f1(it.y + 3.2) + '"/>';
      else glyph = '<rect x="' + f1(it.x) + '" y="' + f1(it.y) + '" width="' + CELL + '" height="' + CELL + '"/>';
      s.push(open + "<title>" + E(label) + "</title>" + glyph + "</a>");
    });
    s.push("</svg>");
    mapEl.innerHTML = s.join("\n");
    wrap.style.setProperty("--ar", (W / H).toFixed(4));   /* style.css caps the height through the width */
    mapEl.querySelectorAll(".mk").forEach(function (a) { items[+a.dataset.i].el = a; });
  }

  /* ---------- controls ---------- */
  function buildControls() {
    var h = '<label><input type="checkbox" id="c-deccan" checked> <span class="swatch" style="--c:var(--deccan)"></span> The Deccan <span class="muted">(' + items.filter(function (i) { return i.kind === "deccan"; }).length + ')</span></label>' +
      '<label><input type="checkbox" id="c-basalt" checked> <span class="swatch swatch--triangle" style="--c:var(--stone)"></span> Basalt and Laterite <span class="muted">(' + items.filter(function (i) { return i.kind === "basalt"; }).length + ')</span></label>' +
      '<label><input type="checkbox" id="c-gaze" checked> <span class="swatch swatch--square" style="--c:var(--map)"></span> European maps <span class="muted">(' + items.filter(function (i) { return i.kind === "gaze"; }).length + ' in the frame)</span></label>' +
      '<div class="year"><button class="btn" id="y-all" type="button" aria-pressed="true">All years</button>' +
      '<label id="y-lab" class="off" style="flex:1 1 260px"><span class="sr" style="position:absolute;left:-9999px">Year</span><input type="range" id="y-range" min="' + Y_MIN + '" max="' + Y_MAX + '" step="1" value="1565" aria-label="Year, ' + Y_MIN + ' to ' + Y_MAX + '"> <output id="y-out" for="y-range">—</output></label>' +
      '<span class="note" style="margin:0;font-size:.8rem">Deccan entries within ±' + HALO + ' years, maps within ±' + MAP_HALO + '</span></div>' +
      '<ul class="legend" id="legend" aria-label="Polities">' + Object.keys(POL).map(function (k) {
        return '<li><button type="button" data-pol="' + k + '" aria-pressed="false"><span class="swatch" style="--c:var(--pol-' + k + ')"></span>' + E(POL[k]) + "</button></li>";
      }).join("") + "</ul>";
    controls.innerHTML = h;
    ["deccan", "basalt", "gaze"].forEach(function (k) {
      document.getElementById("c-" + k).addEventListener("change", function (ev) { show[k] = ev.target.checked; apply(); });
    });
    var range = document.getElementById("y-range"), all = document.getElementById("y-all");
    range.addEventListener("input", function () { setYear(+range.value); });
    all.addEventListener("click", function () { setYear(null); });
    document.getElementById("legend").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-pol]"); if (!b) return;
      var k = b.dataset.pol; if (polPick.has(k)) polPick.delete(k); else polPick.add(k);
      apply();
    });
    /* year keys work only while focus is inside the map section (the map itself is focusable), so they
       do not take the arrow keys away from the rest of the page */
    (document.getElementById("map-section") || document).addEventListener("keydown", function (ev) {
      var a = document.activeElement, tag = a && a.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      var step = 0;
      if (ev.key === "ArrowLeft") step = -1; else if (ev.key === "ArrowRight") step = 1;
      else if (ev.key === "+" || ev.key === "=") step = 10; else if (ev.key === "-" || ev.key === "_") step = -10;
      else if (ev.key === "Escape") { setYear(null); return; }
      if (!step) return;
      ev.preventDefault();
      setYear(Math.max(Y_MIN, Math.min(Y_MAX, (year == null ? +range.value : year) + step)));
    });
  }
  function setYear(y) {
    year = y;
    var range = document.getElementById("y-range"), out = document.getElementById("y-out"), all = document.getElementById("y-all"), lab = document.getElementById("y-lab");
    if (y != null) range.value = y;
    out.textContent = y == null ? "—" : String(y);
    all.setAttribute("aria-pressed", String(y == null));
    lab.classList.toggle("off", y == null);
    apply();
  }
  function apply() {
    var leg = document.getElementById("legend");
    leg.classList.toggle("has-pick", polPick.size > 0);
    leg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(polPick.has(b.dataset.pol))); });
    var n = 0;
    items.forEach(function (it) {
      var el = it.el; if (!el) return;
      var hide = !show[it.kind];
      el.classList.toggle("hide", hide);
      el.setAttribute("aria-hidden", String(hide));
      el.tabIndex = hide ? -1 : 0;
      var dim = false;
      if (it.kind === "deccan") {
        if (polPick.size && !polPick.has(it.pol)) dim = true;
        if (year != null && !(it.y0 - HALO <= year && year <= it.y1 + HALO)) dim = true;
      } else if (it.kind === "gaze") {
        if (year != null && Math.abs(it.y0 - year) > MAP_HALO) dim = true;
      }
      el.classList.toggle("dim", dim);
      if (!hide && !dim) n++;
    });
    if (year != null) {
      var per = (window.DECCAN_PERIODS || []).filter(function (p) { return p.start <= year && year < p.end; })[0];
      panel.innerHTML = '<span class="d">' + year + (per ? " · " + E(per.title) + ", " + E(per.years) : "") + "</span><p>" + n + " markers in this year’s window; the rest are faded. " +
        '<span class="hint">With the map focused: ← → move the year, + − step by ten, Esc shows all years.</span></p>';
    }
  }

  /* ---------- tooltip and panel ---------- */
  function select(it) {
    if (selected && selected.el) selected.el.classList.remove("on");
    selected = it;
    if (it && it.el) it.el.classList.add("on");
  }
  function showTip(it) {
    var el = it.el, r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    var how = lastPointerType === "touch" ? (selected === it ? "tap again to open" : "tap to select, again to open") : "click to open";
    tip.innerHTML = '<div class="t">' + E(it.title) + '</div><span class="d">' + E(it.date) + ' — <span class="how">' + how + "</span></span>";
    tip.hidden = false;
    var x = r.left - wr.left + wrap.scrollLeft + r.width / 2 + 10, y = r.top - wr.top + r.height / 2 - 12;
    if (x + 270 > wrap.scrollLeft + wrap.clientWidth) x = r.left - wr.left + wrap.scrollLeft - 270;
    tip.style.left = Math.max(0, x) + "px"; tip.style.top = Math.max(0, y) + "px";
    var col = it.kind === "deccan" ? "The Deccan" : it.kind === "basalt" ? "Basalt and Laterite" : "The European Gaze";
    panel.innerHTML = '<div class="t"><a href="' + E(it.href) + '"' + ">" + E(it.title) + "</a></div>" +
      '<span class="d">' + E(it.date) + " · " + col + "</span><p>" + E(it.sub) + ' <a href="' + E(it.href) + '"' + ">Open →</a></p>";
  }
  function hideTip() { tip.hidden = true; }
  function wire() {
    mapEl.addEventListener("mouseover", function (ev) { var a = ev.target.closest(".mk"); if (a) showTip(items[+a.dataset.i]); });
    mapEl.addEventListener("mouseout", function (ev) { if (ev.target.closest(".mk")) hideTip(); });
    mapEl.addEventListener("focusin", function (ev) { var a = ev.target.closest(".mk"); if (a) showTip(items[+a.dataset.i]); });
    mapEl.addEventListener("focusout", hideTip);
    /* touch: the first tap on a marker selects it and fills the panel; a second tap on the same marker follows the link.
       Mouse, pen and keyboard (Enter, or Space via the handler below) follow the link at once, as before. */
    mapEl.addEventListener("click", function (ev) {
      var a = ev.target.closest(".mk"); if (!a) return;
      var it = items[+a.dataset.i];
      if (lastPointerType === "touch" && selected !== it) {
        ev.preventDefault();
        select(it);
        showTip(it);
        return;
      }
      select(it);
    });
    mapEl.addEventListener("keydown", function (ev) {
      var a = ev.target.closest(".mk"); if (!a || ev.key !== " ") return;
      ev.preventDefault(); a.click();
    });
  }

  /* ---------- maps beyond the frame ---------- */
  function buildBeyond() {
    var byRegion = {}, order = [];
    gaze.maps.forEach(function (m) { if (REGION_PT[m.region]) return; if (!byRegion[m.region]) { byRegion[m.region] = []; order.push(m.region); } byRegion[m.region].push(m); });
    var n = order.reduce(function (a, r) { return a + byRegion[r].length; }, 0), h = "";
    if (order.length) h += '<h3 class="group-title">Maps beyond this frame · ' + n + "</h3>" +
      '<p class="note">European maps in the collection whose subject lies outside, or far beyond, the peninsula: ocean charts, Asia as a whole, the Punjab and the north.</p>' +
      "<ul>" + order.map(function (r) {
        return byRegion[r].map(function (m) {
          return '<li><span class="d">' + E(m.date_label) + '</span><a href="' + E(gaze.base + m.file) + '">' + E(m.maker) + ", " + E(m.title) + '</a> <span class="r">· ' + E(REGION_NAME[r] || r) + "</span></li>";
        }).join("");
      }).join("") + "</ul>";
    /* entries whose place is off the map, or which have no place at all */
    var far = deccan.filter(function (e) { return e.lat == null || !inFrame(e.lat, e.lon); }).map(function (e) { return [e, DECCAN, "The Deccan"]; })
      .concat(basalt.filter(function (e) { return e.lat == null || !inFrame(e.lat, e.lon); }).map(function (e) { return [e, BASALT, "Basalt"]; }));
    if (far.length) h += '<h3 class="group-title" style="margin-top:1.4rem">Entries beyond this frame · ' + far.length + "</h3>" +
      "<ul>" + far.map(function (x) { var e = x[0];
        return '<li><span class="d">' + E(e.date_label) + '</span><a href="' + x[1] + "#" + E(e.id) + '">' + E(e.title) + '</a> <span class="r">· ' + E(e.place || "no single place") + " · " + x[2] + "</span></li>";
      }).join("") + "</ul>";
    beyond.innerHTML = h;
  }

  build();
  buildControls();
  wire();
  buildBeyond();
  apply();
})();
