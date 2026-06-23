/* Smedjan — the forge, on the GPU, in your browser.
   A real-time molten-iron / ember / spark field behind the hero. WebGL2
   fragment shader (the same GPU craft the engine does in Metal/CUDA, now
   client-side). Fallback ladder: WebGL2 → CSS ember gradient. Reduced motion
   renders a single still frame (a poster, not a stripped blank). Lazy: inits
   on idle, never blocks first paint; pauses in a background tab. */
(function () {
  "use strict";
  var cv = document.getElementById("forge-bg");
  if (!cv) return;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function posterFallback() {
    cv.style.background =
      "radial-gradient(120% 80% at 50% 100%, oklch(40% .14 45 / .5), transparent 60%)," +
      "radial-gradient(80% 60% at 70% 20%, oklch(30% .08 252 / .4), transparent 70%)";
  }

  var VS =
    "#version 300 es\n" +
    "const vec2 v[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));\n" +
    "void main(){ gl_Position=vec4(v[gl_VertexID],0.,1.); }";

  var FS =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 uRes; uniform float uTime; uniform vec2 uPtr; uniform float uScroll;\n" +
    "out vec4 frag;\n" +
    "float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }\n" +
    "float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);\n" +
    "  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));\n" +
    "  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }\n" +
    "float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.02+vec2(7.1,3.7); a*=.5; } return s; }\n" +
    "void main(){\n" +
    "  vec2 uv=gl_FragCoord.xy/uRes; vec2 p=uv; p.x*=uRes.x/uRes.y;\n" +
    "  float t=uTime*0.06;\n" +
    "  vec2 q=vec2(fbm(p*3.0+vec2(0.,-t*4.0)), fbm(p*3.0+vec2(5.2,-t*4.0+1.3)));\n" +
    "  float f=fbm(p*3.4 + q*1.5 + vec2(0.,-t*6.0));\n" +
    "  float heat=f;\n" +
    "  heat += smoothstep(0.62,0.0,uv.y)*0.20;\n" +
    "  float d=distance(uv,uPtr); heat += exp(-d*6.0)*0.45;\n" +
    "  heat += (1.0-uScroll)*0.04;\n" +
    "  vec3 col = mix(vec3(0.012,0.015,0.022), vec3(0.40,0.07,0.0), smoothstep(0.46,0.66,heat));\n" +
    "  col = mix(col, vec3(1.0,0.42,0.11), smoothstep(0.66,0.86,heat));\n" +
    "  col = mix(col, vec3(1.0,0.80,0.45), smoothstep(0.86,1.0,heat));\n" +
    "  float sp=fbm(p*9.0+vec2(0.,-t*20.0));\n" +
    "  float spark=smoothstep(0.87,0.93,sp)*smoothstep(0.5,1.0,heat);\n" +
    "  col += vec3(1.0,0.72,0.42)*spark*0.7;\n" +
    "  col *= smoothstep(1.25,0.2,length(uv-0.5));\n" +
    "  frag=vec4(col,1.0);\n" +
    "}";

  function start() {
    var gl = cv.getContext("webgl2", { antialias: false, alpha: true, powerPreference: "low-power" });
    if (!gl) { posterFallback(); return; }
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("forge-bg shader:", gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { posterFallback(); return; }
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { posterFallback(); return; }
    gl.useProgram(pr);
    var uRes = gl.getUniformLocation(pr, "uRes"), uTime = gl.getUniformLocation(pr, "uTime"),
        uPtr = gl.getUniformLocation(pr, "uPtr"), uScroll = gl.getUniformLocation(pr, "uScroll");
    var ptr = [0.5, 0.4], ptrT = [0.5, 0.4], scroll = 0, dpr = Math.min(devicePixelRatio || 1, 1.5);

    function resize() {
      var r = cv.getBoundingClientRect();
      cv.width = Math.max(1, (r.width * dpr) | 0);
      cv.height = Math.max(1, (r.height * dpr) | 0);
      gl.viewport(0, 0, cv.width, cv.height);
    }
    addEventListener("resize", resize, { passive: true });
    resize();

    addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect();
      ptrT = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    }, { passive: true });
    addEventListener("scroll", function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      scroll = h > 0 ? Math.min(1, scrollY / h) : 0;
    }, { passive: true });

    var t0 = performance.now(), raf;
    function frame(now) {
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      ptr[0] += (ptrT[0] - ptr[0]) * 0.06; ptr[1] += (ptrT[1] - ptr[1]) * 0.06;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uPtr, ptr[0], ptr[1]);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    if (RM) {
      // a single still molten frame — a poster, fully legible, no motion
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, 12.0); gl.uniform2f(uPtr, 0.5, 0.35); gl.uniform1f(uScroll, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(frame);
    }
  }

  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
  idle(start);
})();
