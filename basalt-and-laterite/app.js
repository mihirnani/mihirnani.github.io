/* Basalt and Laterite – single-page renderer. Reads data/entries.js and data/periods.js (loaded as scripts so the page also works from a local folder).
   Routes: #          home (deep-time band + periods)
           #p3        period page
           #<entry>   entry page                                                   */
(function () {
  "use strict";
  var DEC = "https://naniwadekar.com/deccan/";
  var ROCK = {craton: "The old craton", basin: "Sedimentary basins", plate: "The moving plate", basalt: "The Traps",
    land: "Landforms and rivers", laterite: "Laterite", soil: "Soil", life: "Life", people: "People and stone"};
  var KIND = {formation: "Formation", process: "Process", event: "Event", place: "Place", object: "Object", person: "Person", document: "Document"};
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var app = document.getElementById("app");
  var entries = [], periods = [], byId = {}, PER = {};
  var rockSel = new Set(), kindSel = new Set(), query = "";

  function fmtAge(a) {
    if (a >= 1e9) return (a / 1e9).toFixed(a % 1e9 ? 1 : 0).replace(/\.0$/, "") + " billion years";
    if (a >= 1e6) return Math.round(a / 1e6) + " million years";
    if (a >= 1e4) return Math.round(a / 1e3) + ",000 years";
    return a + " years";
  }
  function setTitle(t, desc) {
    document.title = t;
    var m = document.querySelector('meta[name="description"]'); if (m && desc) m.setAttribute("content", desc);
  }

  /* ---------- deep-time band: one panel per period, log scale within each ---------- */
  function bandSvg() {
    var X0 = 150, X1 = 1380, W = 1400, Y0 = 68, RH = 34;
    var rows = Object.keys(ROCK);
    var H = Y0 + RH * rows.length + 34;
    var PW = (X1 - X0) / periods.length;
    function px(e) {
      var p = PER[e.period];
      var la0 = Math.log(p.a0), la1 = Math.log(Math.max(p.a1, 10));
      var f = (la0 - Math.log(Math.max(e.age, 10))) / (la0 - la1);
      f = Math.max(0.03, Math.min(0.97, f));
      return X0 + PW * (periods.indexOf(p) + f);
    }
    var s = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Deep-time band of the collection, one panel per period, positions on a logarithmic scale">'];
    periods.forEach(function (p, i) {
      var x = X0 + i * PW;
      s.push('<rect class="pband' + (i % 2 ? " alt" : "") + '" x="' + x.toFixed(1) + '" y="' + (Y0 - 46) + '" width="' + PW.toFixed(1) + '" height="' + (H - Y0 + 46) + '"/>');
      s.push('<text class="ptitle" x="' + (x + 6).toFixed(1) + '" y="' + (Y0 - (i % 2 ? 16 : 32)) + '">' + E((p.short || p.title).toUpperCase()) + "</text>");
      s.push('<text class="yr" x="' + (x + 6).toFixed(1) + '" y="' + (H - 8) + '">' + E(p.years) + "</text>");
    });
    var rowy = {};
    rows.forEach(function (r, i) {
      var y = Y0 + i * RH + RH / 2; rowy[r] = y;
      s.push('<text class="lbl" x="' + (X0 - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + E(ROCK[r]) + "</text>");
      s.push('<line class="grid" x1="' + X0 + '" y1="' + y.toFixed(1) + '" x2="' + X1 + '" y2="' + y.toFixed(1) + '"/>');
    });
    var used = {};
    entries.forEach(function (e) {
      if (e.coda) return;
      var k = rowy[e.rocks[0]] ? e.rocks[0] : "people";
      var cx = px(e), slot = 0;
      used[k] = used[k] || [];
      while (used[k].some(function (u) { return Math.abs(cx - u[0]) < 12 && u[1] === slot; })) slot++;
      used[k].push([cx, slot]);
      var cy = rowy[k] + Math.pow(-1, slot) * Math.floor((slot + 1) / 2) * 11;
      s.push('<circle class="mk ' + e.kind + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5.5" data-id="' + e.id + '" tabindex="0" role="button" aria-label="' + E(e.title) + ", " + E(e.date_label) + '"><title>' + E(e.title) + " · " + E(e.date_label) + "</title></circle>");
    });
    s.push("</svg>");
    return s.join("\n");
  }

  function card(e) {
    return '<li data-period="' + e.period + '" data-rocks="' + e.rocks.join(" ") + '" data-kind="' + e.kind + '">' +
      '<span class="d">' + E(e.date_label) + (e.coda ? " · Coda" : "") + '</span><a class="t" href="#' + e.id + '">' + E(e.title) + "</a>" +
      '<p class="s">' + E(e.strap) + '</p><div class="k">' + KIND[e.kind] + " · " + e.rocks.map(function (r) { return ROCK[r]; }).join(" · ") + "</div></li>";
  }

  /* ---------- sketch map (shared design with the Deccan collection) ---------- */
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
      s.push('<text class="rlbl" x="' + gx(r[2]) + '" y="' + gy(r[3]) + '">' + r[0] + "</text>");
    });
    Object.keys(gd.groups).forEach(function (k) {
      var g = gd.groups[k], n = g.list.length;
      var r = Math.min(10, 4 + 1.7 * Math.sqrt(n - 1));
      var name = E((g.place || "").split(",")[0]);
      s.push('<circle class="gmk" cx="' + gx(g.lon) + '" cy="' + gy(g.lat) + '" r="' + r.toFixed(1) + '" data-k="' + k + '" tabindex="0" role="button" aria-label="' + name + ", " + n + (n > 1 ? " entries" : " entry") + '"><title>' + name + " · " + n + (n > 1 ? " entries" : " entry") + "</title></circle>");
      var SPECIAL = {"Trimbak": ["Trimbak", "e"], "Hire Benakal": ["Hire Benakal", "e"], "Kolar Gold Fields": ["Kolar", "e"], "Kollur": ["Kollur", "e"], "Lameta Ghat": ["Lameta Ghat", "e"]};
      var first = (g.place || "").split(",")[0], sp = SPECIAL[first];
      if (n >= 2 || sp) {
        var ltxt = sp ? E(sp[0]) : name, west = sp && sp[1] === "w";
        s.push('<text class="plbl"' + (west ? ' text-anchor="end"' : '') + ' x="' + (parseFloat(gx(g.lon)) + (west ? -(r + 4) : r + 4)).toFixed(1) + '" y="' + (parseFloat(gy(g.lat)) + 4).toFixed(1) + '">' + ltxt + "</text>");
      }
    });
    s.push("</svg>");
    return s.join("\n");
  }

  /* ---------- views ---------- */
  function home() {
    setTitle("Basalt and Laterite · the making of the Deccan");
    var chipsRock = Object.keys(ROCK).map(function (k) { return '<button class="chip' + (rockSel.has(k) ? " on" : "") + '" data-f="rock" data-v="' + k + '" type="button">' + E(ROCK[k]) + "</button>"; }).join("");
    var chipsKind = Object.keys(KIND).map(function (k) { return '<button class="chip' + (kindSel.has(k) ? " on" : "") + '" data-f="kind" data-v="' + k + '" type="button">' + E(KIND[k]) + "</button>"; }).join("");
    var sections = periods.map(function (p) {
      var es = entries.filter(function (e) { return e.period === p.n && !e.coda; });
      return '<section class="period" id="sec' + p.n + '" data-period="' + p.n + '">' +
        '<div class="period-head"><span class="no">0' + p.n + '</span><span class="ttl"><a href="#p' + p.n + '">' + E(p.title) + '</a></span><span class="yrs">' + E(p.years) + '</span><p class="desc">' + E(p.desc) + "</p></div>" +
        '<ul class="elist">' + es.map(card).join("") + "</ul></section>";
    }).join("");
    var codas = entries.filter(function (e) { return e.coda; });
    if (codas.length) sections += '<section class="period" id="seccoda" data-period="coda"><div class="period-head"><span class="no">·</span><span class="ttl">Coda</span><span class="yrs">the present</span><p class="desc">The argument the collection ends inside: the Deccan’s deep history as a live scientific case.</p></div><ul class="elist">' + codas.map(card).join("") + "</ul></section>";
    var gd = geoData(), nP = Object.keys(gd.groups).length;
    var farNames = gd.far.map(function (e) { return E((e.place || "").split(",")[0]); }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
    app.innerHTML = '<div class="wrap">' +
      '<p class="eyebrow">A Deep-Time Collection</p>' +
      '<h1 class="hero-h1">Basalt and<br/>Laterite</h1>' +
      '<div class="rule"></div>' +
      '<p class="lede measure">The making of the Deccan: nearly four billion years of the plateau – craton and covering basins, the breakup of Gondwana, the Trap eruptions, the shaping of scarp, river and soil – ending in the landscape on which the Deccan’s human history was made.</p>' +
      '<p class="measure muted">The story is told through seven periods, from the Peninsular Gneiss to the first geologists. Click a marker on the band or browse the periods below; every entry has its own page, with sources; where the deep history surfaces in the human record, an entry also links into the companion <a href="' + DEC + '">Deccan timeline</a>. Positions on the band are on a logarithmic scale – deep time does not fit a ruler.</p>' +
      '<div class="search"><input id="q" type="search" placeholder="Search the entries – a rock, a place, a word" aria-label="Search entries" value="' + E(query) + '" autocomplete="off"></div>' +
      '<div class="filters" id="filters"><span class="fl">Material</span>' + chipsRock + '<span class="sep"></span><span class="fl">Kind</span>' + chipsKind + '<span class="sep"></span><button class="chip" data-f="clear" type="button">Clear</button></div>' +
      '<div class="tl-wrap band" id="tl">' + bandSvg() + "</div>" +
      '<div class="tl-panel" id="tlpanel"><span class="hint">Click a marker for a summary. Each panel is one period; within a panel, positions run on a logarithmic scale from older (left) to younger (right).</span></div>' +
      '<div class="entries" id="entries">' + sections + '<p class="empty" id="empty" hidden>No entries match.</p></div>' +
      '<div class="geo-head period-head" style="margin-top:3.5rem"><span class="no">·</span><span class="ttl">The Deccan on the ground</span><span class="yrs">' + nP + ' places</span><p class="desc">Every entry is anchored to a place; the sketch shows where the deep history surfaces. Marker size follows the number of entries.</p></div>' +
      '<div class="tl-wrap" id="geo">' + geoSvg(gd) + '<p class="geonote">This sketch is for illustrative purposes only, and does not claim to accurately reflect any official boundaries.</p></div>' +
      '<div class="tl-panel" id="geopanel"><span class="hint">Click a marker for the entries at that place.' + (farNames.length ? " Beyond the frame: " + farNames.join(", ") + "." : "") + "</span></div>" +
      "</div>";
    app.querySelectorAll("#filters .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.dataset.f, v = c.dataset.v;
        if (f === "clear") { rockSel.clear(); kindSel.clear(); query = ""; var qb = document.getElementById("q"); if (qb) qb.value = ""; app.querySelectorAll("#filters .chip").forEach(function (x) { x.classList.remove("on"); }); applyFilters(); return; }
        var set = f === "rock" ? rockSel : kindSel; if (set.has(v)) set.delete(v); else set.add(v); c.classList.toggle("on"); applyFilters();
      });
    });
    var qbox = document.getElementById("q");
    qbox.addEventListener("input", function () { query = qbox.value.trim().toLowerCase(); applyFilters(); });
    var cur = null, panel = document.getElementById("tlpanel");
    function show(id) {
      var e = byId[id]; if (!e) return;
      if (cur) cur.classList.remove("on"); cur = app.querySelector('.mk[data-id="' + id + '"]'); if (cur) cur.classList.add("on");
      panel.innerHTML = '<div class="t"><a href="#' + id + '">' + E(e.title) + '</a></div><div class="d">' + E(e.date_label) + " · " + KIND[e.kind] + " · Period 0" + e.period + '</div><div>' + E(e.strap) + ' <a href="#' + id + '">Read the entry →</a></div>';
    }
    app.querySelectorAll(".mk").forEach(function (m) {
      m.addEventListener("click", function () { show(m.dataset.id); });
      m.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); show(m.dataset.id); } });
    });
    var gpanel = document.getElementById("geopanel"), gcur = null;
    function gshow(k) {
      var gd2 = geoData(), g = gd2.groups[k]; if (!g) return;
      if (gcur) gcur.classList.remove("on"); gcur = app.querySelector('.gmk[data-k="' + k + '"]'); if (gcur) gcur.classList.add("on");
      var links = g.list.slice().sort(function (a, b) { return b.age - a.age; }).map(function (e) { return '<a href="#' + e.id + '">' + E(e.title) + "</a>"; }).join(" · ");
      gpanel.innerHTML = '<div class="t">' + E(g.place || "") + '</div><div class="d">' + g.list.length + (g.list.length > 1 ? " entries" : " entry") + "</div><div>" + links + "</div>";
    }
    app.querySelectorAll(".gmk").forEach(function (m) {
      m.addEventListener("click", function () { gshow(m.dataset.k); });
      m.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); gshow(m.dataset.k); } });
    });
    applyFilters();
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
      var ok = (!rockSel.size || Array.from(rockSel).some(function (p) { return li.dataset.rocks.split(" ").indexOf(p) >= 0; })) && (!kindSel.size || kindSel.has(li.dataset.kind)) && matches(byId[id]);
      li.classList.toggle("hide", !ok); if (ok) any = true;
    });
    app.querySelectorAll(".period").forEach(function (s) { s.hidden = !s.querySelector(".elist li:not(.hide)"); });
    var em = document.getElementById("empty"); if (em) em.hidden = any;
    app.querySelectorAll(".mk").forEach(function (m) {
      var e = byId[m.dataset.id];
      var ok = (!rockSel.size || e.rocks.some(function (p) { return rockSel.has(p); })) && (!kindSel.size || kindSel.has(e.kind)) && matches(e);
      m.classList.toggle("dim", !ok); m.setAttribute("tabindex", ok ? "0" : "-1");
    });
  }

  function periodView(n) {
    var p = PER[n]; if (!p) return home();
    var i = periods.indexOf(p), prev = periods[i - 1], nxt = periods[i + 1];
    setTitle(p.title + ", " + p.years + " – Basalt and Laterite", p.desc);
    var es = entries.filter(function (e) { return e.period === p.n && !e.coda; });
    var codas = entries.filter(function (e) { return e.period === p.n && e.coda; });
    var nav = '<nav class="mapnav">' + (prev ? '<a class="prev" href="#p' + prev.n + '"><span class="dir">← Previous period</span><span class="nt">' + E(prev.title) + "</span></a>" : "") +
      (nxt ? '<a class="next" href="#p' + nxt.n + '"><span class="dir">Next period →</span><span class="nt">' + E(nxt.title) + "</span></a>" : "") + "</nav>";
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#">← All periods</a></p>' +
      '<div class="chapter-head measure"><p class="eyebrow">Period 0' + p.n + " · " + E(p.years) + "</p><h1>" + E(p.title) + '</h1><p class="intro">' + E(p.desc) + "</p></div>" +
      '<div class="prose"><p>' + E(p.intro) + "</p></div>" +
      '<ul class="elist" style="margin-top:2.2rem">' + es.map(card).join("") + "</ul>" +
      (codas.length ? '<p class="subhead" style="margin-top:2rem">Coda</p><ul class="elist">' + codas.map(card).join("") + "</ul>" : "") + nav + "</div>";
  }

  function entryView(id) {
    var e = byId[id]; if (!e) return home();
    var p = PER[e.period], i = entries.indexOf(e), prev = entries[i - 1], nxt = entries[i + 1];
    setTitle(e.title + " (" + e.date_label + ") – Basalt and Laterite", e.strap);
    var nav = '<nav class="mapnav">' + (prev ? '<a class="prev" href="#' + prev.id + '"><span class="dir">← Previous · ' + E(prev.date_label) + '</span><span class="nt">' + E(prev.title) + "</span></a>" : "") +
      (nxt ? '<a class="next" href="#' + nxt.id + '"><span class="dir">Next · ' + E(nxt.date_label) + ' →</span><span class="nt">' + E(nxt.title) + "</span></a>" : "") + "</nav>";
    var dl = e.deccan && e.deccan.length ? '<p class="subhead">In the Deccan timeline</p><p>' + e.deccan.map(function (d) { return '<a href="' + DEC + "#" + d.id + '">' + E(d.label) + "</a>"; }).join(" · ") + "</p>" : "";
    var srcLi = function (s) { return '<li><a href="' + E(s.url) + '" rel="noopener noreferrer" target="_blank">' + E(s.title) + "</a></li>"; };
    var isRef = function (s) { return /^(Wikipedia|Britannica)/.test(s.title); };
    var srcMain = e.sources.filter(function (s) { return !isRef(s); }), srcRef = e.sources.filter(isRef);
    if (!srcMain.length) { srcMain = e.sources; srcRef = []; }
    var srcs = srcMain.map(srcLi).join(""), refs = srcRef.map(srcLi).join("");
    var byline = [e.date_label, KIND[e.kind], e.place || ""].filter(Boolean).join(" · ");
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#p' + p.n + '">← ' + E(p.title) + ", " + E(p.years) + "</a></p>" +
      '<div class="entry-head"><h1>' + E(e.title) + '</h1><p class="byline">' + E(byline) + '</p><div class="brief">' + E(e.strap) + "</div></div>" +
      '<div class="prose">' + e.body + "</div>" +
      '<div class="story"><p class="subhead">In the story</p><p>' + e.story + "</p></div>" +
      '<div class="prose">' + dl + "</div>" +
      '<div class="sources"><p class="subhead">Sources</p><ul>' + srcs + "</ul>" + (refs ? '<p class="subhead">Quick reference</p><ul>' + refs + "</ul>" : "") + "</div>" +
      '<dl class="meta"><dt>Age</dt><dd>' + E(e.date_label) + (e.age >= 1e6 ? " (about " + fmtAge(e.age) + " ago)" : "") + '</dd><dt>Period</dt><dd><a href="#p' + p.n + '">' + E(p.title) + ", " + E(p.years) + "</a></dd>" +
      "<dt>Material</dt><dd>" + e.rocks.map(function (x) { return ROCK[x]; }).join(" · ") + "</dd><dt>Kind</dt><dd>" + KIND[e.kind] + "</dd>" +
      (e.place ? "<dt>Place</dt><dd>" + E(e.place) + "</dd>" : "") + (e.coda ? "<dt>Status</dt><dd>Coda – outside the numbered sequence</dd>" : "") + "</dl>" + nav + "</div>";
  }

  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (!h) { home(); window.scrollTo(0, 0); return; }
    var pm = /^p([1-7])$/.exec(h);
    if (pm) { periodView(+pm[1]); window.scrollTo(0, 0); return; }
    if (byId[h]) { entryView(h); window.scrollTo(0, 0); return; }
    home();
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
    entries.sort(function (a, b) { return a.period - b.period || (a.coda ? 1 : 0) - (b.coda ? 1 : 0) || b.age - a.age || (a.id < b.id ? -1 : 1); });
    entries.forEach(function (e) { byId[e.id] = e; }); periods.forEach(function (p) { PER[p.n] = p; });
    route();
  }
  if (window.BL_ENTRIES && window.BL_PERIODS) start([window.BL_ENTRIES, window.BL_PERIODS]);
  else app.innerHTML = '<div class="wrap"><p class="empty">The collection could not be loaded: data/entries.js or data/periods.js is missing.</p></div>';
})();
