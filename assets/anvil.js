/* Smedjan — the model writes the hero headline, live.
   Loads the real trained title-model (wasm32, ~295K params) on idle and
   generates the hero headline in the browser: newline-seeded titles, swapped
   with the scramble effect every ~5s. No server, no API, no click. Reduced
   motion / reduced data keep the static headline. */
(function () {
  "use strict";
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ForgeClass = null, forgeReady = false, forgeLoading = null, forgeFailed = false;
  function loadForge() {
    if (forgeReady) return Promise.resolve(true);
    if (forgeFailed) return Promise.resolve(false);
    if (forgeLoading) return forgeLoading;
    forgeLoading = import("/assets/wasm/smedjan_forge.js")
      .then(function (m) {
        return m.default().then(function () { ForgeClass = m.Forge; forgeReady = true; return true; });
      })
      .catch(function () { forgeFailed = true; return false; });
    return forgeLoading;
  }
  if (!matchMedia("(prefers-reduced-data: reduce)").matches && !RM) {
    (window.requestIdleCallback || function (f) { setTimeout(f, 900); })(function () {
      loadForge().then(function (ok) { if (ok) startHeroTitles(); });
    });
  }

  var titleForge = null;
  function genOneTitle() {
    if (!ForgeClass) return null;
    if (!titleForge) titleForge = new ForgeClass(Math.floor(Math.random() * 1e9) + 1);
    titleForge.start("\n", 0.8);
    var str = "";
    for (var i = 0; i < 34; i++) { var c = titleForge.next(); if (c === "\n") break; str += c; }
    str = str.replace(/[^a-z0-9 '-]/g, "").replace(/\s+/g, " ").trim();
    return str.length >= 5 && str.length <= 14 ? str.toUpperCase() + "." : null;
  }
  function genPair() {
    var a = null, b = null, t = 0;
    while (!a && t++ < 10) a = genOneTitle();
    t = 0;
    while ((!b || b === a) && t++ < 10) b = genOneTitle();
    return [a || "OWN THE STACK.", b || "ZERO PYTHON."];
  }
  function startHeroTitles() {
    var h1 = document.querySelector(".hero h1"); if (!h1) return;
    var spans = h1.querySelectorAll("span"); if (spans.length < 2) return;
    window.__liveHeadline = true;
    var nextPair = genPair();
    function swap(el, txt) {
      el.style.transition = "opacity .32s ease";
      el.style.opacity = "0";
      setTimeout(function () { el.textContent = txt; el.style.opacity = "1"; }, 320);
    }
    function tick() {
      if (document.hidden) { setTimeout(tick, 2500); return; }
      var p = nextPair;
      swap(spans[0], p[0]); swap(spans[1], p[1]);
      setTimeout(function () { nextPair = genPair(); }, 1400);
      setTimeout(tick, 5200);
    }
    tick();
  }
})();
