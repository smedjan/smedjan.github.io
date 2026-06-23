/* Smedjan — forge interactions: spark bursts when you click (the hammer strikes)
   + an opt-in anvil "ting". The cursor itself is the Mjolnir (set in CSS).
   Sparks are gated on a fine pointer with motion allowed; audio is default-off
   and only ever plays on a user gesture. */
(function () {
  "use strict";
  var doc = document;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = matchMedia("(pointer: fine)").matches;

  /* ── opt-in anvil audio (default OFF) ── */
  var audioOn = false, actx = null;
  function ting() {
    if (!audioOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
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
    var nav = doc.querySelector("footer nav"); if (!nav) return;
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

  /* ── spark bursts on click — the hammer strikes the metal ── */
  if (RM || !FINE) return;
  addEventListener("pointerdown", function (e) {
    for (var i = 0; i < 11; i++) {
      (function (x, y) {
        var s = doc.createElement("div"); s.className = "spark";
        s.style.left = x + "px"; s.style.top = y + "px"; doc.body.appendChild(s);
        var ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 30;
        var anim = s.animate(
          [{ transform: "translate(-50%,-50%)", opacity: 1 },
           { transform: "translate(-50%,-50%) translate(" + Math.cos(ang) * dist + "px," + Math.sin(ang) * dist + "px)", opacity: 0 }],
          { duration: 440 + Math.random() * 260, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
        );
        anim.onfinish = function () { s.remove(); };
        setTimeout(function () { if (s.parentNode) s.remove(); }, 1400);
      })(e.clientX, e.clientY);
    }
  }, { passive: true });
})();
