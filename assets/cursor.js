/* Smedjan — forge interactions.
   • The cursor is the Mjölnir hammer. On a fine pointer it becomes a DOM element
     that follows the mouse and SWINGS on click (a real strike); on touch/coarse
     or reduced-motion we keep the native CSS hammer cursor.
   • Click = spark burst (the hammer strikes hot metal). __forgeSparks is exposed
     so the copy buttons can throw a bigger ember burst.
   • Opt-in anvil "ting" (default OFF, only on a user gesture). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = matchMedia("(pointer: fine)").matches;

  /* ── spark burst — reusable, exposed for the copy buttons ── */
  function sparkBurst(x, y, n, hot) {
    if (RM) return;
    for (var i = 0; i < n; i++) {
      (function () {
        var s = doc.createElement("div");
        s.className = "spark" + (hot ? " spark-hot" : "");
        s.style.left = x + "px"; s.style.top = y + "px";
        doc.body.appendChild(s);
        var ang = Math.random() * Math.PI * 2, dist = 16 + Math.random() * (hot ? 46 : 32);
        var anim = s.animate(
          [{ transform: "translate(-50%,-50%)", opacity: 1 },
           { transform: "translate(-50%,-50%) translate(" + Math.cos(ang) * dist + "px," + Math.sin(ang) * dist + "px)", opacity: 0 }],
          { duration: 420 + Math.random() * 320, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
        );
        anim.onfinish = function () { s.remove(); };
        setTimeout(function () { if (s.parentNode) s.remove(); }, 1500);
      })();
    }
  }
  window.__forgeSparks = sparkBurst;

  /* ── DOM hammer cursor that swings on click ── */
  var rot = null;
  if (FINE && !RM) {
    try {
      var ham = doc.createElement("div");
      ham.id = "mjolnir"; ham.setAttribute("aria-hidden", "true");
      ham.innerHTML =
        '<div class="mj-rot"><svg width="36" height="36" viewBox="0 0 36 36">' +
        '<g transform="translate(4 2.5) rotate(-33 15 15)">' +
        '<rect x="11.7" y="12" width="5.6" height="18.5" fill="#9aa6b8" stroke="#0d1014" stroke-width="1.2"/>' +
        '<path fill="#9aa6b8" stroke="#0d1014" stroke-width="1.2" stroke-linejoin="round" d="M5 2 L21 2 L24.5 5.5 L24.5 13 L2.5 13 L2.5 5.5 Z"/>' +
        '<path fill="#ff7a2f" stroke="#0d1014" stroke-width="0.5" d="M5 2 L21 2 L24.5 5.5 L24.5 7.6 L2.5 7.6 L2.5 5.5 Z"/>' +
        '</g></svg></div>';
      doc.body.appendChild(ham);
      rot = ham.firstChild;
      root.classList.add("mjolnir-on");
      var raf = 0, px = -100, py = -100;
      function place() { raf = 0; ham.style.transform = "translate(" + px + "px," + py + "px)"; }
      addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        px = e.clientX; py = e.clientY;
        if (ham.style.opacity !== "1") ham.style.opacity = "1";
        if (!raf) raf = requestAnimationFrame(place);
      }, { passive: true });
      doc.addEventListener("mouseleave", function () { ham.style.opacity = "0"; });
      window.addEventListener("blur", function () { ham.style.opacity = "0"; });
    } catch (e) { root.classList.remove("mjolnir-on"); rot = null; }
  }

  function strike() {
    if (!rot) return;
    rot.classList.remove("mj-hit");
    void rot.offsetWidth;        // restart the animation
    rot.classList.add("mj-hit");
  }

  /* ── click = swing + sparks (the hammer strikes the metal) ── */
  if (!RM && FINE) {
    addEventListener("pointerdown", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      strike();
      sparkBurst(e.clientX, e.clientY, 11, false);
      ting();   // anvil ring on every strike (no-op while sound is off)
    }, { passive: true });
  }

  /* ── opt-in anvil audio (default OFF) ── */
  var audioOn = false, actx = null;
  function ting() {
    if (!audioOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime;
      [880, 1320].forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.1 / (i + 1), t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.5);
      });
    } catch (e) {}
  }
  window.__forgeTing = ting;
  function addToggle() {
    var nav = doc.querySelector(".foot-bot") || doc.querySelector("footer nav"); if (!nav) return;
    var b = doc.createElement("button");
    b.type = "button"; b.className = "snd-toggle"; b.textContent = "♪ sound: off"; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () {
      audioOn = !audioOn;
      b.textContent = "♪ sound: " + (audioOn ? "on" : "off");
      b.setAttribute("aria-pressed", audioOn ? "true" : "false");
      if (audioOn) ting();
    });
    nav.appendChild(b);
  }
  if (doc.readyState !== "loading") addToggle(); else addEventListener("DOMContentLoaded", addToggle);
})();
