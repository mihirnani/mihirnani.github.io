/* The Deccan, 1500–1830s — single-page renderer. Reads data/entries.js and data/periods.js (loaded as scripts so the page also works from a local folder).
   Routes: #          home (timeline + periods)
           #p3        period page
           #<entry>   entry page                                                   */
(function () {
  "use strict";
  var EG = "https://naniwadekar.com/european-gaze/";
  var POL = {vijayanagara: "Vijayanagara", sultanates: "Deccan sultanates", mughal: "Mughal empire", maratha: "Marathas",
    mysore: "Mysore", hyderabad: "Hyderabad", company: "East India Company", portuguese: "Portuguese", other: "Other"};
  var KIND = {battle: "Battle", treaty: "Treaty", person: "Person", place: "Place", document: "Document",
    object: "Object", institution: "Institution", event: "Event"};
  var ROWS = [["vijayanagara", "Vijayanagara", 1500, 1646], ["sultanates", "Deccan sultanates", 1500, 1687],
    ["mughal", "Mughal empire", 1596, 1761], ["maratha", "Marathas", 1646, 1818], ["mysore", "Mysore", 1761, 1831],
    ["hyderabad", "Hyderabad", 1724, 1840], ["portuguese", "Portuguese", 1510, 1739], ["company", "East India Company", 1611, 1840]];
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var app = document.getElementById("app");
  var entries = [], periods = [], byId = {}, PER = {};
  var pol = new Set(), kind = new Set();

  function mapTitle(fn) {
    var p = fn.replace(".html", "").split("__");
    var yr = p[0].replace(/^c/, ""), name = p[p.length - 1].replace(/-/g, " "), maker = p.length > 2 ? p[2].replace(/-/g, " ") : "";
    return maker ? maker + ", " + name + " (" + yr + ")" : name + " (" + yr + ")";
  }
  function setTitle(t, desc) {
    document.title = t;
    var m = document.querySelector('meta[name="description"]'); if (m && desc) m.setAttribute("content", desc);
  }

  /* ---------- timeline ---------- */
  function timelineSvg() {
    var X0 = 150, X1 = 1380, W = 1400, Y0 = 52, RH = 40, y0 = 1492, y1 = 1840;
    var H = Y0 + RH * ROWS.length + 30;
    var x = function (yr) { return X0 + (yr - y0) / (y1 - y0) * (X1 - X0); };
    var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Timeline of the Deccan, 1500 to 1840, by polity">'];
    periods.forEach(function (p, i) {
      s.push('<rect class="pband' + (i % 2 ? " alt" : "") + '" x="' + x(p.start).toFixed(1) + '" y="' + (Y0 - 30) + '" width="' + (x(p.end) - x(p.start)).toFixed(1) + '" height="' + (H - Y0 + 30) + '"/>');
      s.push('<text class="ptitle" x="' + (x(p.start) + 6).toFixed(1) + '" y="' + (Y0 - 16) + '">' + E((p.short || p.title).toUpperCase()) + '</text>');
    });
    for (var yr = 1500; yr <= 1840; yr += 50) {
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
      '<span class="d">' + E(e.date_label) + '</span><a class="t" href="#' + e.id + '">' + E(e.title) + '</a>' +
      '<p class="s">' + E(e.strap) + '</p><div class="k">' + KIND[e.kind] + ' · ' + e.polities.map(function (p) { return POL[p]; }).join(" · ") + '</div></li>';
  }

  /* ---------- views ---------- */
  function home() {
    setTitle("The Deccan, 1500–1830s · a timeline from Vijayanagara to the Company");
    var chipsPol = Object.keys(POL).filter(function (k) { return k !== "other"; }).map(function (k) { return '<button class="chip' + (pol.has(k) ? " on" : "") + '" data-f="pol" data-v="' + k + '" type="button">' + E(POL[k]) + '</button>'; }).join("");
    var chipsKind = Object.keys(KIND).map(function (k) { return '<button class="chip' + (kind.has(k) ? " on" : "") + '" data-f="kind" data-v="' + k + '" type="button">' + E(KIND[k]) + '</button>'; }).join("");
    var sections = periods.map(function (p) {
      var es = entries.filter(function (e) { return e.period === p.n; });
      return '<section class="period" id="sec' + p.n + '" data-period="' + p.n + '">' +
        '<div class="period-head"><span class="no">0' + p.n + '</span><span class="ttl"><a href="#p' + p.n + '">' + E(p.title) + '</a></span><span class="yrs">' + E(p.years) + '</span><p class="desc">' + E(p.desc) + '</p></div>' +
        '<ul class="elist">' + es.map(card).join("") + '</ul></section>';
    }).join("");
    app.innerHTML = '<div class="wrap">' +
      '<p class="eyebrow">A Timeline Collection</p>' +
      '<h1 class="hero-h1">The Deccan,<br/>1500–1830s</h1>' +
      '<div class="rule"></div>' +
      '<p class="lede measure">Seventy-six entries, from the kings of Vijayanagara to the Company’s commissioners, on a plateau where sovereignty was always shared – until it was not.</p>' +
      '<p class="measure muted">Five periods, eight polities, and a filter for each. Click a marker on the timeline or browse the periods below; every entry has its own page, with sources and links to the companion <a href="' + EG + '">map collection</a>.</p>' +
      '<div class="filters" id="filters"><span class="fl">Polity</span>' + chipsPol + '<span class="sep"></span><span class="fl">Kind</span>' + chipsKind + '<span class="sep"></span><button class="chip" data-f="clear" type="button">Clear</button></div>' +
      '<div class="tl-wrap" id="tl">' + timelineSvg() + '</div>' +
      '<div class="tl-panel" id="tlpanel"><span class="hint">Click a marker for a summary. Markers sit on the row of the entry’s principal polity; the bands show roughly when each power was present in the Deccan.</span></div>' +
      '<div class="entries" id="entries">' + sections + '<p class="empty" id="empty" hidden>No entries match these filters.</p></div></div>';
    app.querySelectorAll("#filters .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.dataset.f, v = c.dataset.v;
        if (f === "clear") { pol.clear(); kind.clear(); app.querySelectorAll("#filters .chip").forEach(function (x) { x.classList.remove("on"); }); applyFilters(); return; }
        var set = f === "pol" ? pol : kind; if (set.has(v)) set.delete(v); else set.add(v); c.classList.toggle("on"); applyFilters();
      });
    });
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
    applyFilters();
  }
  function applyFilters() {
    var any = false;
    app.querySelectorAll(".elist li").forEach(function (li) {
      var ok = (!pol.size || Array.from(pol).some(function (p) { return li.dataset.polities.split(" ").indexOf(p) >= 0; })) && (!kind.size || kind.has(li.dataset.kind));
      li.classList.toggle("hide", !ok); if (ok) any = true;
    });
    app.querySelectorAll(".period").forEach(function (s) { s.hidden = !s.querySelector(".elist li:not(.hide)"); });
    var em = document.getElementById("empty"); if (em) em.hidden = any;
    app.querySelectorAll(".mk").forEach(function (m) {
      var e = byId[m.dataset.id];
      var ok = (!pol.size || e.polities.some(function (p) { return pol.has(p); })) && (!kind.size || kind.has(e.kind));
      m.classList.toggle("dim", !ok);
    });
  }

  function periodView(n) {
    var p = PER[n]; if (!p) return home();
    var i = periods.indexOf(p), prev = periods[i - 1], nxt = periods[i + 1];
    setTitle(p.title + ", " + p.years + " – The Deccan, 1500–1830s", p.desc);
    var es = entries.filter(function (e) { return e.period === p.n; });
    var nav = '<nav class="mapnav">' + (prev ? '<a class="prev" href="#p' + prev.n + '"><span class="dir">← Previous period</span><span class="nt">' + E(prev.title) + '</span></a>' : "") +
      (nxt ? '<a class="next" href="#p' + nxt.n + '"><span class="dir">Next period →</span><span class="nt">' + E(nxt.title) + '</span></a>' : "") + '</nav>';
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#">← All periods</a></p>' +
      '<div class="chapter-head measure"><p class="eyebrow">Period 0' + p.n + ' · ' + E(p.years) + '</p><h1>' + E(p.title) + '</h1><p class="intro">' + E(p.desc) + '</p></div>' +
      '<div class="prose"><p>' + E(p.intro) + '</p></div>' +
      '<ul class="elist" style="margin-top:2.2rem">' + es.map(card).join("") + '</ul>' + nav + '</div>';
  }

  function entryView(id) {
    var e = byId[id]; if (!e) return home();
    var p = PER[e.period], i = entries.indexOf(e), prev = entries[i - 1], nxt = entries[i + 1];
    setTitle(e.title + " (" + e.date_label + ") – The Deccan, 1500–1830s", e.strap);
    var nav = '<nav class="mapnav">' + (prev ? '<a class="prev" href="#' + prev.id + '"><span class="dir">← Previous · ' + E(prev.date_label) + '</span><span class="nt">' + E(prev.title) + '</span></a>' : "") +
      (nxt ? '<a class="next" href="#' + nxt.id + '"><span class="dir">Next · ' + E(nxt.date_label) + ' →</span><span class="nt">' + E(nxt.title) + '</span></a>' : "") + '</nav>';
    var maps = e.related_maps && e.related_maps.length ? '<p class="subhead">In the map collection</p><p>' + e.related_maps.map(function (fn) { return '<a href="' + EG + fn + '">' + E(mapTitle(fn)) + '</a>'; }).join(" · ") + '</p>' : "";
    var srcs = e.sources.map(function (s) { return '<li><a href="' + E(s.url) + '" rel="noopener noreferrer" target="_blank">' + E(s.title) + '</a></li>'; }).join("");
    var byline = [e.date_label, KIND[e.kind], e.place || ""].filter(Boolean).join(" · ");
    app.innerHTML = '<div class="wrap"><p><a class="back" href="#p' + p.n + '">← ' + E(p.title) + ', ' + E(p.years) + '</a></p>' +
      '<div class="entry-head"><h1>' + E(e.title) + '</h1><p class="byline">' + E(byline) + '</p><div class="brief">' + E(e.strap) + '</div></div>' +
      '<div class="prose">' + e.body + '</div>' +
      '<div class="story"><p class="subhead">In the story</p><p>' + E(e.story) + '</p></div>' +
      '<div class="prose">' + maps + '</div>' +
      '<div class="sources"><p class="subhead">Sources</p><ul>' + srcs + '</ul></div>' +
      '<dl class="meta"><dt>Date</dt><dd>' + E(e.date_label) + '</dd><dt>Period</dt><dd><a href="#p' + p.n + '">' + E(p.title) + ', ' + E(p.years) + '</a></dd>' +
      '<dt>Polities</dt><dd>' + e.polities.map(function (x) { return POL[x]; }).join(" · ") + '</dd><dt>Kind</dt><dd>' + KIND[e.kind] + '</dd>' +
      (e.place ? '<dt>Place</dt><dd>' + E(e.place) + '</dd>' : "") + '<dt>On the timeline</dt><dd><a href="#" data-show="' + e.id + '">Show on the timeline</a></dd></dl>' + nav + '</div>';
    var sh = app.querySelector("[data-show]");
    if (sh) sh.addEventListener("click", function (ev) { ev.preventDefault(); pendingShow = e.id; location.hash = ""; });
  }
  var pendingShow = null;

  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (!h) { home(); window.scrollTo(0, 0); if (pendingShow) { var m = app.querySelector('.mk[data-id="' + pendingShow + '"]'); if (m) { m.dispatchEvent(new Event("click")); m.scrollIntoView({block: "center"}); } pendingShow = null; } return; }
    var pm = /^p([1-5])$/.exec(h);
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
    entries.sort(function (a, b) { return a.period - b.period || a.year - b.year || (a.id < b.id ? -1 : 1); });
    entries.forEach(function (e) { byId[e.id] = e; }); periods.forEach(function (p) { PER[p.n] = p; });
    route();
  }
  if (window.DECCAN_ENTRIES && window.DECCAN_PERIODS) start([window.DECCAN_ENTRIES, window.DECCAN_PERIODS]);
  else app.innerHTML = '<div class="wrap"><p class="empty">The collection could not be loaded: data/entries.js or data/periods.js is missing.</p></div>';
})();
