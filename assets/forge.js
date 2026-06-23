/* Smedjan — effects layer. No framework, no dependency you don't control.
   Adapted from the Hugin forge grammar: text-scramble, rotating hero, boot
   overlay, auto ghost numerals + parallax, spring reveals, ⌘K palette.
   Every motion path is gated on prefers-reduced-motion. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = matchMedia("(pointer: fine)").matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function io(els, fn, opt) {
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) fn(e.target, o); });
    }, opt || { threshold: 0.14 });
    (els.length !== undefined ? els : [els]).forEach(function (el) { o.observe(el); });
    return o;
  }

  /* ── text scramble ─────────────────────────────────────── */
  var JUNK = "<>/|=+*#%&@$!?;:^~01";
  function scramble(el, charset, dur, done) {
    var fin = el.textContent, n = fin.length, t0 = null;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), lock = Math.floor(p * n), out = "";
      for (var i = 0; i < n; i++) {
        var ch = fin[i];
        out += (i < lock || ch === " ") ? ch : charset[(Math.random() * charset.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else { el.textContent = fin; done && done(); }
    }
    requestAnimationFrame(frame);
  }

  /* ── rotating hero headline (data-rot="L1|L2||L1|L2||…") ── */
  (function () {
    var h1 = $(".hero h1");
    if (!h1) return;
    var spans = h1.querySelectorAll("span");
    /* initial hero scramble disabled — live model crossfades the headline (CLS-safe) */
    if (RM) return;
    var raw = h1.getAttribute("data-rot");
    if (!raw) return;
    var variants = raw.split("||").map(function (v) { return v.split("|"); });
    if (variants.length < 2 || spans.length < 2) return;
    var ri = 0;
    setInterval(function () {
      if (doc.hidden) return;
      if (window.__liveHeadline) return;
      ri = (ri + 1) % variants.length;
      var v = variants[ri];
      spans[0].textContent = v[0]; scramble(spans[0], JUNK, 560);
      spans[1].textContent = v[1]; scramble(spans[1], JUNK, 560);
    }, 4200);
  })();

  /* forge ignition is CSS-only now (see #boot in forge.css) */

  /* ── ghost section numerals + parallax ──────────────────── */
  (function () {
    var ghosts = [];
    $$("section[id]").forEach(function (sec, idx) {
      if ($(".ghost", sec)) { ghosts.push($(".ghost", sec)); return; } // hand-placed wins
      var no = $(".sh .no", sec);
      if (!no) return;
      var digits = (no.textContent.match(/\d+/) || [""])[0];
      if (!digits) return;
      var NS = "http://www.w3.org/2000/svg";
      var rightSide = idx % 2 === 0;
      var g = doc.createElementNS(NS, "svg");
      g.setAttribute("class", "ghost " + (rightSide ? "ghost-right" : "ghost-left")); g.setAttribute("aria-hidden", "true");
      g.setAttribute("viewBox", "0 0 460 230"); g.setAttribute("preserveAspectRatio", (rightSide ? "xMaxYMid" : "xMinYMid") + " meet");
      var tx = doc.createElementNS(NS, "text");
      tx.setAttribute("x", rightSide ? "446" : "14"); tx.setAttribute("y", "188"); tx.setAttribute("text-anchor", rightSide ? "end" : "start"); tx.setAttribute("class", "ghost-t");
      tx.textContent = digits;
      g.appendChild(tx); sec.insertBefore(g, sec.firstChild);
      ghosts.push(g);
    });
    if (RM || !ghosts.length) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ghosts.forEach(function (g) {
          var r = g.parentNode.getBoundingClientRect();
          var off = (r.top + r.height / 2 - innerHeight / 2) * -0.06;
          g.style.transform = "translateY(calc(-50% + " + off.toFixed(1) + "px))";
        });
        ticking = false;
      });
    }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ── spring reveals ─────────────────────────────────────── */
  if (RM) { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }
  else {
    io($$(".rv"), function (el, o) {
      var d = el.getAttribute("data-d");
      if (d) el.style.transitionDelay = d + "ms";
      el.classList.add("in"); o.unobserve(el);
    });
  }

  /* ── scroll progress (nav bar + %) ──────────────────────── */
  (function () {
    var bar = $("#pbar"), pct = $("#pct");
    if (!bar && !pct) return;
    var ticking = false;
    function upd() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var h = doc.documentElement.scrollHeight - innerHeight;
        var p = h > 0 ? scrollY / h : 0;
        if (bar) bar.style.width = (p * 100).toFixed(2) + "%";
        if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, "0") + "%";
        ticking = false;
      });
    }
    addEventListener("scroll", upd, { passive: true }); upd();
  })();

  /* ── nav: highlight current section ─────────────────────── */
  (function () {
    var links = $$(".nav-links a[href^='#']");
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    io($$("section[id]"), function (sec) {
      var a = map[sec.id]; if (!a) return;
      links.forEach(function (l) { l.classList.remove("cur"); });
      a.classList.add("cur");
    }, { threshold: 0.5, rootMargin: "-30% 0px -60% 0px" });
  })();

  /* ── clipboard ──────────────────────────────────────────── */
  $$("[data-copy]").forEach(function (btn) {
    var src = $("#" + btn.getAttribute("data-copy")), t;
    if (!src) return;
    btn.addEventListener("click", function () {
      var text = src.textContent.trim();
      var ok = function () {
        btn.textContent = "copied ✓"; btn.classList.add("ok");
        clearTimeout(t); t = setTimeout(function () { btn.textContent = "copy"; btn.classList.remove("ok"); }, 1400);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, ok); else ok();
    });
  });

  /* ── ⌘K command palette (path-fallback for sub-pages) ───── */
  (function () {
    var pal = $("#palette"), input = $("#paletteinput"), list = $("#palettelist"), openBtn = $("#palettebtn");
    if (!pal || !input || !list) return;
    var ITEMS = [];
    $$("section[id]").forEach(function (sec) {
      var no = $(".sh .no", sec), h = $(".sh h2", sec) || $("h1", sec);
      ITEMS.push({ no: no ? no.textContent.trim() : "", label: h ? h.textContent.trim() : sec.id, sel: "#" + sec.id });
    });
    ITEMS.push({ no: "→", label: "Open the docs", sel: "/docs" });
    var cur = 0, shown = ITEMS.slice();
    function render() {
      list.innerHTML = "";
      shown.forEach(function (it, i) {
        var li = doc.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === cur ? "true" : "false");
        li.innerHTML = '<span class="pno"></span><span class="plb"></span>';
        li.querySelector(".pno").textContent = it.no;
        li.querySelector(".plb").textContent = it.label;
        li.addEventListener("click", function () { go(it); });
        list.appendChild(li);
      });
    }
    function go(it) {
      close();
      if (it.sel.charAt(0) === "#") {
        var el = $(it.sel);
        if (el) el.scrollIntoView({ behavior: RM ? "auto" : "smooth" });
        else location.href = "/" + it.sel;   // sub-page fallback
      } else location.href = it.sel;
    }
    function open() { pal.hidden = false; input.value = ""; shown = ITEMS.slice(); cur = 0; render(); input.focus(); }
    function close() { pal.hidden = true; }
    function filter() {
      var q = input.value.toLowerCase();
      shown = ITEMS.filter(function (it) { return (it.label + " " + it.no).toLowerCase().indexOf(q) >= 0; });
      cur = 0; render();
    }
    if (openBtn) openBtn.addEventListener("click", open);
    addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? open() : close(); }
      else if (!pal.hidden) {
        if (e.key === "Escape") close();
        else if (e.key === "ArrowDown") { e.preventDefault(); cur = Math.min(cur + 1, shown.length - 1); render(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); cur = Math.max(cur - 1, 0); render(); }
        else if (e.key === "Enter") { e.preventDefault(); if (shown[cur]) go(shown[cur]); }
      }
    });
    input.addEventListener("input", filter);
    var scrim = $("#palettescrim"); if (scrim) scrim.addEventListener("click", close);
  })();
window.SmedjanScramble = function (el) { scramble(el, JUNK, 560); };
})();

/* header reveal: hidden over the hero at top, visible once scrolling begins */
(function(){var r=document.documentElement;function s(){r.classList.toggle('scrolled',(window.scrollY||window.pageYOffset||0)>8);}addEventListener('scroll',s,{passive:true});s();})();
