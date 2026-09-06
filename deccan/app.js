/* The Deccan, 1336–1875 – single-page renderer. Reads data/entries.js and data/periods.js (loaded as scripts so the page also works from a local folder).
   Routes: #          home (timeline + periods)
           #p3        period page
           #<entry>   entry page                                                   */
(function () {
  "use strict";
  var EG = "https://naniwadekar.com/european-gaze/";
  var POL = {delhi: "Delhi sultanate", vijayanagara: "Vijayanagara", bahmani: "Bahmani sultanate", sultanates: "Deccan sultanates", mughal: "Mughal empire", maratha: "Marathas",
    mysore: "Mysore", hyderabad: "Hyderabad", company: "East India Company", crown: "British Crown", portuguese: "Portuguese", other: "Other"};
  var KIND = {battle: "Battle", treaty: "Treaty", person: "Person", place: "Place", document: "Document",
    object: "Object", institution: "Institution", event: "Event"};
  var ROWS = [["delhi", "Delhi sultanate", 1327, 1347], ["vijayanagara", "Vijayanagara", 1336, 1646], ["bahmani", "Bahmani sultanate", 1347, 1528], ["sultanates", "Deccan sultanates", 1490, 1687],
    ["mughal", "Mughal empire", 1596, 1761], ["maratha", "Marathas", 1646, 1818], ["mysore", "Mysore", 1761, 1880],
    ["hyderabad", "Hyderabad", 1724, 1880], ["portuguese", "Portuguese", 1510, 1739], ["company", "East India Company", 1611, 1858], ["crown", "British Crown", 1858, 1876]];
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var app = document.getElementById("app");
  var entries = [], periods = [], byId = {}, PER = {};
  var pol = new Set(), kind = new Set(), query = "";

  function mapTitle(fn) {
    var p = fn.replace(".html", "").split("__");
    var yr = p[0].replace(/^c/, ""), name = p[p.length - 1].replace(/-/g, " "), maker = p.length > 3 ? p[2].replace(/-/g, " ") : "";
    return maker ? maker + ", " + name + " (" + yr + ")" : name + " (" + yr + ")";
  }
  /* An entry's picture, when it has one: the image on a mat, the caption and credit beneath. */
  function figure(e) {
    var im = e.image; if (!im) return "";
    var cap = E(im.caption) + ' <span class="credit">' + E(im.credit_label || "Photograph") + ': <a href="' + E(im.source) + '" target="_blank" rel="noopener noreferrer">' + E(im.credit) + '</a>, <a href="' + E(im.license_url) + '" target="_blank" rel="noopener noreferrer">' + E(im.license) + "</a>" + (im.note ? ", " + E(im.note) : "") + ".</span>";
    return '<figure class="entry-fig"><div class="mat"><img src="' + E(im.file) + '" alt="' + E(im.alt) + '" width="' + im.width + '" height="' + im.height + '" loading="lazy"></div><figcaption>' + cap + "</figcaption></figure>";
  }
  function setTitle(t, desc) {
    document.title = t;
    var m = document.querySelector('meta[name="description"]'); if (m && desc) m.setAttribute("content", desc);
  }

  /* ---------- timeline ---------- */
  function timelineSvg() {
    var X0 = 150, X1 = 1380, W = 1400, Y0 = 68, RH = 38, y0 = 1322, y1 = 1880;
    var H = Y0 + RH * ROWS.length + 30;
    var x = function (yr) { return X0 + (yr - y0) / (y1 - y0) * (X1 - X0); };
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Timeline of the Deccan, 1327 to 1876, by polity">'];
    periods.forEach(function (p, i) {
      s.push('<rect class="pband' + (i % 2 ? " alt" : "") + '" x="' + x(p.start).toFixed(1) + '" y="' + (Y0 - 46) + '" width="' + (x(p.end) - x(p.start)).toFixed(1) + '" height="' + (H - Y0 + 46) + '"/>');
      s.push('<text class="ptitle" x="' + (x(p.start) + 6).toFixed(1) + '" y="' + (Y0 - (i % 2 ? 16 : 32)) + '">' + E((p.short || p.title).toUpperCase()) + '</text>');
    });
    for (var yr = 1350; yr <= 1880; yr += 50) {
      s.push('<line class="grid" x1="' + x(yr).toFixed(1) + '" y1="' + (Y0 - 4) + '" x2="' + x(yr).toFixed(1) + '" y2="' + (H - 24) + '"/>');
      s.push('<text class="yr" x="' + x(yr).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + yr + '</text>');
    }
    var rowy = {};
    ROWS.forEach(function (r, i) {
      var y = Y0 + i * RH + RH / 2; rowy[r[0]] = y;
      s.push('<text class="lbl" x="' + (X0 - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + E(r[1]) + '</text>');
      s.push('<rect class="band" x="' + x(r[2]).toFixed(1) + '" y="' + (y - 9).toFixed(1) + '" width="' + (x(Math.min(r[3], y1)) - x(r[2])).toFixed(1) + '" height="18" rx="9"/>');
    });
    var used = {};
    entries.forEach(function (e) {
      if (e.coda) return;
      var k = rowy[e.polities[0]] ? e.polities[0] : "company";
      if (e.polities[0] === "other") k = (e.polities[1] && rowy[e.polities[1]]) ? e.polities[1] : "company";
      var cx = x(Math.max(e.year, y0 + 1)), slot = 0;
      used[k] = used[k] || [];
      while (used[k].some(function (u) { return Math.abs(cx - u[0]) < 12 && u[1] === slot; })) slot++;
      used[k].push([cx, slot]);
      var cy = rowy[k] + Math.pow(-1, slot) * Math.floor((slot + 1) / 2) * 11;
      s.push('<circle class="mk ' + e.kind + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5.5" data-id="' + e.id + '" tabindex="0" role="button" aria-label="' + E(e.title) + ', ' + E(e.date_label) + '"><title>' + E(e.title) + ' · ' + E(e.date_label) + '</title></circle>');
    });
    s.push("</svg>");
    return s.join("\n");
  }

  function card(e) {
    return '<li data-period="' + e.period + '" data-polities="' + e.polities.join(" ") + '" data-kind="' + e.kind + '">' +
      '<span class="d">' + E(e.date_label) + (e.coda ? ' · Coda' : '') + '</span><a class="t" href="#' + e.id + '">' + E(e.title) + '</a>' +
      '<p class="s">' + E(e.strap) + '</p><div class="k">' + KIND[e.kind] + ' · ' + e.polities.map(function (p) { return POL[p]; }).join(" · ") + '</div></li>';
  }

  /* ---------- views ---------- */
  function home() {
    setTitle("The Deccan, 1336–1875 · a timeline from Vijayanagara to the Raj");
    var chipsPol = Object.keys(POL).filter(function (k) { return k !== "other"; }).map(function (k) { return '<button class="chip' + (pol.has(k) ? " on" : "") + '" data-f="pol" data-v="' + k + '" type="button">' + E(POL[k]) + '</button>'; }).join("");
    var chipsKind = Object.keys(KIND).map(function (k) { return '<button class="chip' + (kind.has(k) ? " on" : "") + '" data-f="kind" data-v="' + k + '" type="button">' + E(KIND[k]) + '</button>'; }).join("");
    var sections = periods.map(function (p) {
      var es = entries.filter(function (e) { return e.period === p.n && !e.coda; });
      return '<section class="period" id="sec' + p.n + '" data-period="' + p.n + '">' +
        '<div class="period-head"><span class="no">0' + p.n + '</span><span class="ttl"><a href="#p' + p.n + '">' + E(p.title) + '</a></span><span class="yrs">' + E(p.years) + '</span><p class="desc">' + E(p.desc) + '</p></div>' +
        '<ul class="elist">' + es.map(card).join("") + '</ul></section>';
    }).join("");
    var codas = entries.filter(function (e) { return e.coda; });
    if (codas.length) sections += '<section class="period" id="seccoda" data-period="coda"><div class="period-head"><span class="no">·</span><span class="ttl">Codas</span><span class="yrs">outside the numbered chronology</span><p class="desc">Two entries that sit outside the numbered chronology: the first historians of what had been lost, and the maps on which the Company drew the result.</p></div><ul class="elist">' + codas.map(card).join("") + '</ul></section>';
    app.innerHTML = '<div class="wrap">' +
      '<p class="eyebrow">History</p>' +
      '<h1 class="hero-h1">The Deccan,<br/>1336–1875</h1>' +
      '<div class="rule"></div>' +
      '<p class="lede measure">500 years in the Deccan: from the founding of Vijayanagara and the Bahmani sultanate to the Company takeover and the Deccan Riots of 1875. The story of a plateau where sovereignty was repeatedly shared and inherited, until one power made itself paramount and reduced the rest to a register.</p>' +
      '<p class="measure muted">The story is told through seven periods and eleven polities. Click a marker on the timeline or browse the periods below; every entry has its own page, with sources and links to a companion <a href="' + EG + '">map collection</a>. For the whole span at a glance, read the <a href="#chronology">detailed chronology</a>; for the shelf behind the entries, the <a href="#readings">bibliography</a>.</p>' +
      '<div class="search"><input id="q" type="search" placeholder="Search the entries – a name, a place, a word" aria-label="Search entries" value="' + E(query) + '" autocomplete="off"></div>' +
      '<div class="filters" id="filters"><span class="fl">Polity</span>' + chipsPol + '<span class="sep"></span><span class="fl">Kind</span>' + chipsKind + '<span class="sep"></span><button class="chip" data-f="clear" type="button">Clear</button></div>' +
      '<div class="tl-wrap" id="tl">' + timelineSvg() + '</div>' +
      '<div class="tl-panel" id="tlpanel"><span class="hint">Click a marker for a summary. Markers sit on the row of the entry’s principal polity; the bands show roughly when each power was present in the Deccan.</span></div>' +
      '<div class="entries" id="entries">' + sections + '<p class="empty" id="empty" hidden>No entries match.</p></div>' +
      (function () { var gd = geoData(); var nP = Object.keys(gd.groups).length;
        var farNames = gd.far.map(function (e) { return E((e.place || '').split(',')[0]); }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
        return '<div class="geo-head period-head" style="margin-top:3.5rem"><span class="no">·</span><span class="ttl">The Deccan on the ground</span><span class="yrs">' + nP + ' places</span><p class="desc">Every entry is anchored to a place; the sketch shows where the collection happens. Marker size follows the number of entries.</p></div>' +
          '<div class="tl-wrap" id="geo">' + geoSvg(gd) + '<p class="geonote">This sketch is for illustrative purposes only, and does not claim to accurately reflect any official boundaries.</p></div>' +
          '<div class="tl-panel" id="geopanel"><span class="hint">Click a marker for the entries at that place.' + (farNames.length ? ' Beyond the frame: ' + farNames.join(', ') + '.' : '') + '</span></div>'; })() + '</div>';
    app.querySelectorAll("#filters .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.dataset.f, v = c.dataset.v;
        if (f === "clear") { pol.clear(); kind.clear(); query = ""; var qb = document.getElementById("q"); if (qb) qb.value = ""; app.querySelectorAll("#filters .chip").forEach(function (x) { x.classList.remove("on"); }); applyFilters(); return; }
        var set = f === "pol" ? pol : kind; if (set.has(v)) set.delete(v); else set.add(v); c.classList.toggle("on"); applyFilters();
      });
    });
    var qbox = document.getElementById("q");
    qbox.addEventListener("input", function () { query = qbox.value.trim().toLowerCase(); applyFilters(); });
    var cur = null, panel = document.getElementById("tlpanel");
    function show(id) {
      var e = byId[id]; if (!e) return;
      if (cur) cur.classList.remove("on"); cur = app.querySelector('.mk[data-id="' + id + '"]'); if (cur) cur.classList.add("on");
      panel.innerHTML = '<div class="t"><a href="#' + id + '">' + E(e.title) + '</a></div><div class="d">' + E(e.date_label) + ' · ' + KIND[e.kind] + ' · Period 0' + e.period + '</div><div>' + E(e.strap) + ' <a href="#' + id + '">Read the entry →</a></div>';
    }
    app.querySelectorAll(".mk").forEach(function (m) {
      m.addEventListener("click", function () { show(m.dataset.id); });
      m.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); show(m.dataset.id); } });
    });
    var gpanel = document.getElementById("geopanel"), gcur = null;
    function gshow(k) {
      var gd = geoData(), g = gd.groups[k]; if (!g) return;
      if (gcur) gcur.classList.remove("on"); gcur = app.querySelector('.gmk[data-k="' + k + '"]'); if (gcur) gcur.classList.add("on");
      var links = g.list.slice().sort(function (a, b) { return a.year - b.year; }).map(function (e) { return '<a href="#' + e.id + '">' + E(e.title) + "</a>"; }).join(" · ");
      gpanel.innerHTML = '<div class="t">' + E(g.place || "") + '</div><div class="d">' + g.list.length + (g.list.length > 1 ? " entries" : " entry") + "</div><div>" + links + "</div>";
    }
    app.querySelectorAll(".gmk").forEach(function (m) {
      m.addEventListener("click", function () { gshow(m.dataset.k); });
      m.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); gshow(m.dataset.k); } });
    });
    applyFilters();
  }

  /* ---------- sketch map ---------- */
  function geoData() {
    var groups = {}, far = [];
    entries.forEach(function (e) {
      if (e.lat == null || e.lon == null) return;
      if (e.lat < 7.5 || e.lat > 24.5 || e.lon < 68 || e.lon > 88) { far.push(e); return; }
      var k = e.lat.toFixed(2) + "," + e.lon.toFixed(2);
      (groups[k] = groups[k] || {lat: e.lat, lon: e.lon, place: e.place, list: []}).list.push(e);
    });
    return {groups: groups, far: far};
  }
  function geoSvg(gd) {
    var SX = 50.0, SY = 52.0, H = Math.round((24.5 - 7.5) * SY);
    var gx = function (lon) { return ((lon - 68) * SX).toFixed(1); }, gy = function (lat) { return ((24.5 - lat) * SY).toFixed(1); };
    var pts = function (a) { return a.map(function (p) { return gx(p[0]) + "," + gy(p[1]); }).join(" "); };
    var COAST = [[69.8,24.5],[68.9,23.0],[69.0,22.2],[69.6,21.6],[70.5,20.9],[71.0,20.75],[71.6,21.0],[72.1,21.4],[72.6,21.7],[72.8,21.1],[72.85,20.4],[72.9,19.3],[72.8,18.9],[73.0,17.9],[73.3,17.0],[73.5,16.1],[73.8,15.4],[74.1,14.8],[74.5,13.9],[74.85,12.87],[75.35,11.87],[75.78,11.25],[76.24,9.97],[76.6,8.9],[77.1,8.25],[77.54,8.08],[78.13,8.76],[78.4,9.1],[79.3,9.28],[79.4,9.9],[79.85,10.29],[79.85,10.92],[79.83,11.93],[80.28,13.08],[80.3,13.55],[80.18,14.4],[80.1,15.5],[80.65,15.9],[81.14,16.17],[82.3,16.95],[83.3,17.69],[84.1,18.3],[84.9,19.3],[85.83,19.8],[86.6,20.3],[87.5,21.5],[88.0,21.9],[88.0,24.5]];
    var LANKA = [[79.9,9.75],[80.35,9.5],[80.9,8.6],[81.4,7.5],[79.95,7.5]];
    var RIVERS = [
      ["Narmada", [[72.8,21.7],[74.0,22.0],[75.5,22.25],[77.0,22.4],[78.5,22.55],[80.0,22.65],[81.7,22.67]], 75.2, 21.95],
      ["Tapti", [[72.7,21.15],[73.7,21.15],[74.8,21.3],[76.2,21.3],[77.5,21.35],[78.3,21.6]], 74.6, 20.95],
      ["Godavari", [[73.55,19.95],[74.6,19.6],[75.8,19.3],[77.0,19.1],[78.2,18.85],[79.3,18.8],[80.3,18.3],[80.9,17.4],[81.75,16.75]], 76.1, 18.95],
      ["Krishna", [[73.65,17.95],[74.4,17.35],[75.3,16.9],[76.3,16.65],[77.3,16.35],[78.2,16.1],[78.9,16.65],[79.8,16.4],[80.9,15.85]], 75.5, 16.55],
      ["Tungabhadra", [[75.4,13.95],[75.9,14.5],[76.5,15.3],[77.3,15.7],[78.2,16.05]], 75.6, 14.55],
      ["Kaveri", [[75.5,12.4],[76.3,12.3],[76.9,12.35],[77.6,12.1],[78.2,11.4],[78.7,10.9],[79.3,10.95],[79.85,11.1]], 76.85, 11.95]
    ];
    var s = ['<svg viewBox="0 0 1000 ' + H + '" role="img" aria-label="Sketch map of the Deccan with the places of the entries marked">'];
    s.push('<polygon class="land" points="' + pts(COAST) + '"/>');
    s.push('<polygon class="land lanka" points="' + pts(LANKA) + '"/>');
    RIVERS.forEach(function (r) {
      s.push('<polyline class="river" points="' + pts(r[1]) + '"/>');
      s.push('<text class="rlbl" x="' + gx(r[2]) + '" y="' + gy(r[3]) + '">' + r[0] + '</text>');
    });
    Object.keys(gd.groups).forEach(function (k) {
      var g = gd.groups[k], n = g.list.length;
      var r = Math.min(10, 4 + 1.7 * Math.sqrt(n - 1));
      var name = E((g.place || "").split(",")[0]);
      s.push('<circle class="gmk" cx="' + gx(g.lon) + '" cy="' + gy(g.lat) + '" r="' + r.toFixed(1) + '" data-k="' + k + '" tabindex="0" role="button" aria-label="' + name + ", " + n + (n > 1 ? " entries" : " entry") + '"><title>' + name + " · " + n + (n > 1 ? " entries" : " entry") + "</title></circle>");
      var SPECIAL = {"Mumbai": ["Mumbai", "w"], "Sindhudurg": ["Sindhudurg", "w"], "Old Goa": ["Goa", "w"], "Kozhikode (Calicut)": ["Calicut", "w"], "Raichur": ["Raichur", "e"]};
      var first = (g.place || "").split(",")[0], sp = SPECIAL[first];
      if (n >= 4 || sp) {
        var ltxt = sp ? E(sp[0]) : name, west = sp && sp[1] === "w";
        s.push('<text class="plbl"' + (west ? ' text-anchor="end"' : '') + ' x="' + (parseFloat(gx(g.lon)) + (west ? -(r + 4) : r + 4)).toFixed(1) + '" y="' + (parseFloat(gy(g.lat)) + 4).toFixed(1) + '">' + ltxt + "</text>");
      }
    });
    s.push("</svg>");
    return s.join("\n");
  }
  var hay = {};
  function matches(e) {
    if (!query) return true;
    if (!hay[e.id]) hay[e.id] = (e.title + " " + e.strap + " " + (e.place || "") + " " + e.date_label + " " + e.body.replace(/<[^>]+>/g, " ") + " " + e.story).toLowerCase();
    return query.split(/\s+/).every(function (w) { return hay[e.id].indexOf(w) >= 0; });
  }
  function applyFilters() {
    var any = false;
    app.querySelectorAll(".elist li").forEach(function (li) {
      var id = li.querySelector("a.t").getAttribute("href").slice(1);
      var ok = (!pol.size || Array.from(pol).some(function (p) { return li.dataset.polities.split(" ").indexOf(p) >= 0; })) && (!kind.size || kind.has(li.dataset.kind)) && matches(byId[id]);
      li.classList.toggle("hide", !ok); if (ok) any = true;
    });
    app.querySelectorAll(".period").forEach(function (s) { s.hidden = !s.querySelector(".elist li:not(.hide)"); });
    var em = document.getElementById("empty"); if (em) em.hidden = any;
    app.querySelectorAll(".mk").forEach(function (m) {
      var e = byId[m.dataset.id];
      var ok = (!pol.size || e.polities.some(function (p) { return pol.has(p); })) && (!kind.size || kind.has(e.kind)) && matches(e);
      m.classList.toggle("dim", !ok); m.setAttribute("tabindex", ok ? "0" : "-1");
    });
  }

  function periodView(n) {
    var p = PER[n]; if (!p) return home();
    var i = periods.indexOf(p), prev = periods[i - 1], nxt = periods[i + 1];
    setTitle(p.title + ", " + p.years + " – The Deccan, 1336–1875", p.desc);
    var es = entries.filter(function (e) { return e.period === p.n && !e.coda; });
    var codas = entries.filter(function (e) { return e.period === p.n && e.coda; });
    var nav = '<nav class="mapnav">' + (prev ? '<a class="prev" href="#p' + prev.n + '"><span class="dir">← Previous period</span><span class="nt">' + E(prev.title) + '</span></a>' : "") +
      (nxt ? '<a class="next" href="#p' + nxt.n + '"><span class="dir">Next period →</span><span class="nt">' + E(nxt.title) + '</span></a>' : "") + '</nav>';
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#">← All periods</a></p>' +
      '<div class="chapter-head measure"><p class="eyebrow">Period 0' + p.n + ' · ' + E(p.years) + '</p><h1>' + E(p.title) + '</h1><p class="intro">' + E(p.desc) + '</p></div>' +
      '<div class="prose"><p>' + E(p.intro) + '</p></div>' +
      '<ul class="elist" style="margin-top:2.2rem">' + es.map(card).join("") + '</ul>' +
      (codas.length ? '<p class="subhead" style="margin-top:2rem">Codas</p><ul class="elist">' + codas.map(card).join("") + '</ul>' : '') + nav + '</div>';
  }

  function entryView(id) {
    var e = byId[id]; if (!e) return home();
    var p = PER[e.period], i = entries.indexOf(e), prev = entries[i - 1], nxt = entries[i + 1];
    setTitle(e.title + " (" + e.date_label + ") – The Deccan, 1336–1875", e.strap);
    var nav = '<nav class="mapnav">' + (prev ? '<a class="prev" href="#' + prev.id + '"><span class="dir">← Previous · ' + E(prev.date_label) + '</span><span class="nt">' + E(prev.title) + '</span></a>' : "") +
      (nxt ? '<a class="next" href="#' + nxt.id + '"><span class="dir">Next · ' + E(nxt.date_label) + ' →</span><span class="nt">' + E(nxt.title) + '</span></a>' : "") + '</nav>';
    var maps = e.related_maps && e.related_maps.length ? '<p class="subhead">In the map collection</p><p>' + e.related_maps.map(function (fn) { return '<a href="' + EG + fn + '">' + E(mapTitle(fn)) + '</a>'; }).join(" · ") + '</p>' : "";
    var srcLi = function (s) { return '<li><a href="' + E(s.url) + '" rel="noopener noreferrer" target="_blank">' + E(s.title) + '</a></li>'; };
    var isRef = function (s) { return /^(Wikipedia|Britannica)/.test(s.title); };
    var srcMain = e.sources.filter(function (s) { return !isRef(s); }), srcRef = e.sources.filter(isRef);
    if (!srcMain.length) { srcMain = e.sources; srcRef = []; }
    var srcs = srcMain.map(srcLi).join(""), refs = srcRef.map(srcLi).join("");
    var byline = [e.date_label, KIND[e.kind], e.place || ""].filter(Boolean).join(" · ");
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#p' + p.n + '">← ' + E(p.title) + ', ' + E(p.years) + '</a></p>' +
      '<div class="entry-head"><h1>' + E(e.title) + '</h1><p class="byline">' + E(byline) + '</p><div class="brief">' + E(e.strap) + '</div></div>' + figure(e) +
      '<div class="prose">' + e.body + '</div>' +
      '<div class="story"><p class="subhead">In the story</p><p>' + e.story + '</p></div>' +
      '<div class="prose">' + maps + '</div>' +
      '<div class="sources"><p class="subhead">Sources</p><ul>' + srcs + '</ul>' + (refs ? '<p class="subhead">Quick reference</p><ul>' + refs + '</ul>' : '') + '</div>' +
      '<dl class="meta"><dt>Date</dt><dd>' + E(e.date_label) + '</dd><dt>Period</dt><dd><a href="#p' + p.n + '">' + E(p.title) + ', ' + E(p.years) + '</a></dd>' +
      '<dt>Polities</dt><dd>' + e.polities.map(function (x) { return POL[x]; }).join(" · ") + '</dd><dt>Kind</dt><dd>' + KIND[e.kind] + '</dd>' +
      (e.place ? '<dt>Place</dt><dd>' + E(e.place) + '</dd>' : "") + (e.coda ? '<dt>Status</dt><dd>Coda – outside the numbered chronology</dd>' : '<dt>On the timeline</dt><dd><a href="#" data-show="' + e.id + '">Show on the timeline</a></dd>') + '</dl>' + nav + '</div>';
    var sh = app.querySelector("[data-show]");
    if (sh) sh.addEventListener("click", function (ev) { ev.preventDefault(); pendingShow = e.id; location.hash = ""; });
  }

  function readingsView() {
    setTitle("Readings – The Deccan, 1336–1875", "An annotated bibliography of the standard scholarship on the Deccan, 1336–1875, arranged by period.");
    var R = window.DECCAN_READINGS || {};
    var KINDL = {primary: "Primary source", "source-edition": "Source in translation", early: "Early historiography", book: "Book", article: "Article", reference: "Reference"};
    function item(w) {
      var t = w.url ? '<a href="' + E(w.url) + '" rel="noopener noreferrer" target="_blank">' + E(w.title) + '</a>' : '<em>' + E(w.title) + '</em>';
      var cite = E(w.author) + ', ' + t + (w.publisher ? ' (' + E(w.publisher) + (w.year ? ', ' + E(w.year) : '') + ')' : (w.year ? ' (' + E(w.year) + ')' : '')) + '.';
      return '<li class="rd ' + E(w.kind) + '"><span class="k">' + (KINDL[w.kind] || '') + '</span><p class="c">' + cite + '</p><p class="n">' + E(w.note) + '</p></li>';
    }
    function section(title, sub, list, id) {
      if (!list || !list.length) return '';
      return '<section class="rdsec" id="' + id + '"><div class="period-head"><span class="ttl">' + E(title) + '</span>' + (sub ? '<span class="yrs">' + E(sub) + '</span>' : '') + '</div><ul class="rdlist">' + list.map(item).join('') + '</ul></section>';
    }
    var toc = '<p class="measure muted">' + ['<a href="#readings-general">General</a>'].concat(periods.map(function (p) { return '<a href="#readings-' + p.n + '">' + E(p.title) + '</a>'; })).join(' · ') + '</p>';
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#">← Timeline</a></p>' +
      '<div class="chapter-head measure"><p class="eyebrow">Readings</p><h1>The standard scholarship</h1>' +
      '<p class="intro">What to read on the Deccan between Vijayanagara and the Company: primary sources and their translations first, then the early Company-era histories, then the modern scholarship the entries rest on, period by period.</p></div>' +
      '<div class="prose"><p>Each list begins with primary sources and editions in translation, then the early histories written under the Company – Sewell, Grant Duff, Wilks – which are valuable and often themselves evidence for how the British understood the Deccan, but are not primary sources for the events they narrate; then the modern works in alphabetical order. The notes say what a work is and what it is good for; they are not reviews. Open-access copies are linked where they exist – the older Company-era histories and several Indian reprints are on the Internet Archive and HathiTrust – and the rest are in print or in any university library. Entries on the timeline cite the specific works they draw on; this page is the longer shelf.</p></div>' + toc +
      section("General", "the whole span", R.general, "readings-general") +
      periods.map(function (p) { return section(p.title, p.years, R[String(p.n)], "readings-" + p.n); }).join('') + '</div>';
    var want = location.hash.replace(/^#/, '');
    if (want.indexOf('readings-') === 0) { var el = document.getElementById(want); if (el) el.scrollIntoView(); }
  }
  function chronologyView() {
    setTitle("Chronology – The Deccan, 1336–1875", "A detailed chronology of the Deccan from 1296 to 1900, including context events beyond the collection's entries.");
    var C = window.DECCAN_CHRONOLOGY || [];
    function item(it) {
      return '<li class="rd"><span class="k">' + E(it.d) + '</span><p class="c">' + E(it.t) +
        (it.e && byId[it.e] ? ' <a href="#' + it.e + '">Entry \u2192</a>' : '') + '</p></li>';
    }
    var secs = C.map(function (sec, i) {
      return '<section class="rdsec" id="chr-' + i + '"><div class="period-head"><span class="ttl">' + E(sec.title) + '</span><span class="yrs">' + E(sec.years) + '</span></div><ul class="rdlist">' + sec.items.map(item).join('') + '</ul></section>';
    }).join('');
    var toc = '<p class="measure muted">' + C.map(function (sec, i) { return '<a href="#chr-' + i + '">' + E(sec.title) + '</a>'; }).join(' \u00b7 ') + '</p>';
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#">\u2190 Timeline</a></p>' +
      '<div class="chapter-head measure"><p class="eyebrow">Chronology</p><h1>The Deccan, year by year</h1>' +
      '<p class="intro">A detailed chronology of the whole span, from the Khalji raids to the first histories. Events with an entry in the collection carry a link; the rest are context \u2013 the connective tissue the entries assume.</p></div>' +
      '<div class="prose"><p>Dates follow the collection\u2019s own entries where they exist; disputed dates are marked as such there. The chronology is broader than the collection by design \u2013 an event\u2019s absence from the entries is a curatorial choice, not a verdict on its importance.</p></div>' + toc + secs + '</div>';
  }

  var pendingShow = null;

  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (h === "app") return;                /* the skip link's target, not a route */
    if (!h) { home(); window.scrollTo(0, 0); if (pendingShow) { var m = app.querySelector('.mk[data-id="' + pendingShow + '"]'); if (m) { m.dispatchEvent(new Event("click")); m.scrollIntoView({block: "center"}); } pendingShow = null; } return; }
    if (h === "readings" || h.indexOf("readings-") === 0) { readingsView(); if (h === "readings") window.scrollTo(0, 0); return; }
    if (h === "chronology" || h.indexOf("chr-") === 0) { chronologyView(); if (h === "chronology") window.scrollTo(0, 0); else { var ce = document.getElementById(h); if (ce) ce.scrollIntoView(); } return; }
    var pm = /^p([1-7])$/.exec(h);
    if (pm) { periodView(+pm[1]); window.scrollTo(0, 0); return; }
    if (byId[h]) { entryView(h); window.scrollTo(0, 0); return; }
    home(); window.scrollTo(0, 0);
    var nf = document.createElement("p"); nf.className = "empty notfound"; nf.setAttribute("role", "status");
    nf.textContent = "There is no entry at \u201c#" + h + "\u201d \u2013 it may have been renamed. The list below is the whole collection; the search box finds an entry by name.";
    var wrap = app.querySelector(".wrap"); if (wrap) wrap.insertBefore(nf, wrap.firstChild);
  }
  document.addEventListener("keydown", function (e) {
    var a = document.activeElement; if (a && a !== document.body && a !== document.documentElement) return;
    var p = app.querySelector(".mapnav .prev"), n = app.querySelector(".mapnav .next");
    if (e.key === "ArrowLeft" && p) location.hash = p.getAttribute("href");
    if (e.key === "ArrowRight" && n) location.hash = n.getAttribute("href");
  });
  window.addEventListener("hashchange", route);

  function start(res) {
    entries = res[0]; periods = res[1];
    entries.sort(function (a, b) { return a.period - b.period || (a.coda ? 1 : 0) - (b.coda ? 1 : 0) || (a.coda_order || 0) - (b.coda_order || 0) || a.year - b.year || (a.id < b.id ? -1 : 1); });
    entries.forEach(function (e) { byId[e.id] = e; }); periods.forEach(function (p) { PER[p.n] = p; });
    route();
  }
  if (window.DECCAN_ENTRIES && window.DECCAN_PERIODS) start([window.DECCAN_ENTRIES, window.DECCAN_PERIODS]);
  else app.innerHTML = '<div class="wrap"><p class="empty">The collection could not be loaded: data/entries.js or data/periods.js is missing.</p></div>';
})();
