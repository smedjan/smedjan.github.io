/* Smedjan — the mixer explorer. The §4 feature inventory, made explorable.
   Each AttnKind paints its real attention pattern on a causal query×key grid
   (rows = query position, columns = key position; lower-triangular = causal).
   Patterns are illustrative of how each mixer routes information, with its
   compute complexity and a representative kernel sketch. Motion-safe. */
(function () {
  "use strict";
  var cv = document.getElementById("mx-grid");
  if (!cv) return;
  var ctx = cv.getContext("2d"), N = 12;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 320 * dpr; cv.height = 320 * dpr; cv.style.width = "320px"; cv.style.height = "320px";
  ctx.scale(dpr, dpr);
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var MX = {
    gqa: { cx: "O(N²)", title: "Multi-Head / GQA",
      desc: "Grouped-Query attention via --kv-heads — the default, production path, with Flash Attention on both backends.",
      code: "scores = (q @ kᵀ) * scale\nscores += causal_mask\np = softmax(scores)\nout = p @ v",
      f: function (i, j) { return 0.30 + 0.70 * Math.exp(-(i - j) * 0.11); } },
    linear: { cx: "O(N)", title: "Linear attention",
      desc: "An associative state (Σ φ(k)ᵀv) instead of an N×N score matrix — cheap on long sequences.",
      code: "kv = Σ_i φ(k_i)ᵀ v_i        // running state\nz  = Σ_i φ(k_i)\nout_t = (φ(q_t) @ kv) / (φ(q_t)·z)",
      f: function (i, j) { return 0.42 + 0.12 * Math.exp(-(i - j) * 0.03); } },
    ssm: { cx: "O(N)", title: "SSM · Mamba-2 / SSD",
      desc: "A selective state-space scan (Mamba-2 / SSD), not attention — a recurrent state with a chunked forward path.",
      code: "h_t = A · h_{t-1} + B · x_t    // selective scan\ny_t = C · h_t + D · x_t",
      f: function (i, j) { return Math.exp(-(i - j) * 0.55); } },
    mla: { cx: "O(N²) · tiny KV", title: "MLA — latent attention",
      desc: "DeepSeek-V2/V3 Multi-head Latent Attention — K and V compressed into a shared latent, 10–50× smaller KV-cache.",
      code: "c_kv = W_dkv · h               // latent (small)\nk = W_uk · c_kv ,  v = W_uv · c_kv\nout = softmax(q @ kᵀ) @ v",
      f: function (i, j) { var g = (Math.floor(j / 3) * 3) + 1; return g <= i ? 0.26 + 0.66 * Math.exp(-Math.abs(i - g) * 0.10) : 0.0; } },
    rwkv: { cx: "O(N)", title: "RWKV time-mix", exp: true,
      desc: "A linear-time recurrent mixer (WKV) — an alternative to attention. Experimental in Smedjan.",
      code: "wkv_t = Σ_{i≤t} e^{w·(t-i)+k_i} v_i\n        ──────────────────────\n        Σ_{i≤t} e^{w·(t-i)+k_i}\nout_t = σ(r_t) ⊙ wkv_t",
      f: function (i, j) { return Math.exp(-(i - j) * 0.32); } },
    blocksparse: { cx: "O(N·k)", title: "Block-sparse", exp: true,
      desc: "NSA / MoBA-style learned top-k block routing — attend only to selected key blocks. Experimental.",
      code: "blocks = top_k(router(q), k)\nfor b in blocks:\n    out += attend(q, K[b], V[b])",
      f: function (i, j) { var bi = (i / 3) | 0, bj = (j / 3) | 0; return (bj === bi || bj % 2 === 0) ? 0.34 + 0.55 * Math.exp(-(i - j) * 0.08) : 0.0; } }
  };

  function targetGrid(key) {
    var m = MX[key], g = new Float32Array(N * N);
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var v = (j <= i) ? m.f(i, j) : 0.0;
      g[i * N + j] = Math.max(0, Math.min(1, v));
    }
    return g;
  }
  var cur = new Float32Array(N * N), tgt = targetGrid("gqa");
  cur.set(tgt);

  function draw() {
    var s = 320 / N, pad = 1.4;
    ctx.clearRect(0, 0, 320, 320);
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var x = j * s + pad, y = i * s + pad, w = s - pad * 2;
      if (j <= i) { ctx.fillStyle = "rgba(154,166,184,0.05)"; ctx.fillRect(x, y, w, w); }
      var a = cur[i * N + j];
      if (a > 0.01) { ctx.fillStyle = "rgba(255,122,47," + a.toFixed(3) + ")"; ctx.fillRect(x, y, w, w); }
    }
  }
  draw();

  var raf;
  function animateTo(key) {
    tgt = targetGrid(key);
    if (RM) { cur.set(tgt); draw(); return; }
    cancelAnimationFrame(raf);
    (function step() {
      var done = true;
      for (var k = 0; k < cur.length; k++) {
        var d = tgt[k] - cur[k];
        if (Math.abs(d) > 0.004) { cur[k] += d * 0.18; done = false; } else cur[k] = tgt[k];
      }
      draw();
      if (!done) raf = requestAnimationFrame(step);
    })();
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".mx-tab"));
  function select(key) {
    var m = MX[key]; if (!m) return;
    document.getElementById("mx-title").textContent = m.title;
    document.getElementById("mx-desc").textContent = m.desc;
    document.getElementById("mx-code").textContent = m.code;
    document.getElementById("mx-complexity").textContent = m.cx;
    tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.mx === key ? "true" : "false"); });
    animateTo(key);
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { select(t.dataset.mx); }); });
  select("gqa");
})();
