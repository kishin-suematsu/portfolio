/* ============================================================
   KS://PORTFOLIO v3 — 3D scroll world
   Particle morph: KSグリフ(canvasテキストサンプリング)
     → トーラスノット(SYSTEMS) → ニューラル球殻(STACK) → ポータル(CONNECT)
   スクロール速度リアクティブ: パーティクルストリーク + FOVキック
   ※ three.js は動的import — CDN障害時もDOM機能はすべて動く
   ============================================================ */

/* ---------- DOM（three.jsに依存しない） ---------- */
document.documentElement.dataset.build = "p3-v2";
const loader = document.getElementById("loader");
const head = document.getElementById("siteHead");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer:fine)").matches;

// Reveal
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
  { threshold: 0.16 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// デモ動画: 遅延ロード＋画面内のみ再生（手動停止は尊重）
const vidIo = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
        if (reduceMotion) {
          v.addEventListener("loadeddata", () => { try { v.currentTime = 0.1; } catch (_) {} }, { once: true });
        } else if (!v.dataset.userPaused) {
          v.play().catch(() => {});
        }
      } else {
        v.pause();
      }
    });
  },
  { rootMargin: "240px" }
);
document.querySelectorAll("video.lazy-vid").forEach((v) => vidIo.observe(v));

// 動画の一時停止トグル（WCAG 2.2.2: クリック/Enter/Spaceで停止できる）
document.querySelectorAll(".proj-media").forEach((m) => {
  const v = m.querySelector("video");
  if (!v) return;
  const tag = m.querySelector(".media-tag");
  const toggle = () => {
    if (v.paused) {
      delete v.dataset.userPaused;
      if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
      v.play().catch(() => {});
      m.classList.remove("paused");
      if (tag) tag.textContent = "▶ LIVE DEMO";
    } else {
      v.dataset.userPaused = "1";
      v.pause();
      m.classList.add("paused");
      if (tag) tag.textContent = "❚❚ PAUSED";
    }
  };
  m.tabIndex = 0;
  m.setAttribute("role", "button");
  m.setAttribute("aria-label", (v.getAttribute("aria-label") || "demo video") + " — 再生/一時停止 (play/pause)");
  m.addEventListener("click", toggle);
  m.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
  });
});

// Header scrolled
const onHeadScroll = () => head.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onHeadScroll, { passive: true });
onHeadScroll();

// Rail active
const sectionIds = ["hero", "projects", "stack", "contact"];
const railLinks = Object.fromEntries(
  [...document.querySelectorAll(".rail a")].map((a) => [a.dataset.rail, a])
);
const secIo = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        Object.values(railLinks).forEach((a) => a.classList.remove("active"));
        railLinks[e.target.id]?.classList.add("active");
      }
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);
sectionIds.forEach((id) => { const el = document.getElementById(id); if (el) secIo.observe(el); });

// 進捗（トップバー + %表示）
const progressBar = document.getElementById("scrollProgress");
const railPct = document.getElementById("railPct");
let pctTick = false;
function updateProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  progressBar.style.transform = `scaleX(${p})`;
  railPct.textContent = String(Math.round(p * 100)).padStart(3, "0") + "%";
  pctTick = false;
}
window.addEventListener("scroll", () => {
  if (!pctTick) { pctTick = true; requestAnimationFrame(updateProgress); }
}, { passive: true });
updateProgress();

// ターミナル復号（スクランブル）— HTML安全な文字のみ / 言語切替でキャンセル可能
const DECODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%@+_";
function decode(el) {
  if (el.dataset.decoded || reduceMotion) { el.dataset.decoded = "1"; return; }
  el.dataset.decoded = "1";
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  let frame = 0;
  const total = 24;
  const iv = setInterval(() => {
    frame++;
    el.innerHTML = parts.map((line) => {
      const n = Math.floor(line.length * (frame / total));
      let s = line.slice(0, n);
      for (let i = n; i < line.length; i++) {
        s += line[i] === " " ? " " : DECODE_CHARS[(Math.random() * DECODE_CHARS.length) | 0];
      }
      return s;
    }).join("<br>");
    if (frame >= total) { clearInterval(iv); el._decodeIv = null; el.innerHTML = parts.join("<br>"); }
  }, 34);
  el._decodeIv = iv;
}
const decIo = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { decode(e.target); decIo.unobserve(e.target); } }),
  { threshold: 0.6 }
);
document.querySelectorAll(".decode").forEach((el) => decIo.observe(el));

// JA / EN 切替（localStorage永続化・title/aria-pressed連動・decode中断）
const TITLES = {
  ja: document.title,
  en: "KS://PORTFOLIO — Kishin Suematsu / AI Automation Engineer",
};
const langBtns = document.querySelectorAll(".lang-switch button");
function setLang(l) {
  document.body.classList.toggle("lang-en", l === "en");
  document.documentElement.lang = l;
  document.title = TITLES[l] || document.title;
  langBtns.forEach((b) => {
    const on = b.dataset.lang === l;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  document.querySelectorAll("[data-en]").forEach((el) => {
    const v = el.dataset[l];
    if (v != null) {
      if (el._decodeIv) { clearInterval(el._decodeIv); el._decodeIv = null; }
      el.innerHTML = v;
      el.dataset.decoded = "1";
    }
  });
  try { localStorage.setItem("ks-lang", l); } catch (_) {}
}
langBtns.forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
try { if (localStorage.getItem("ks-lang") === "en") setLang("en"); } catch (_) {}

// 3Dチルトカード + グレア（デスクトップのみ）
if (finePointer && !reduceMotion) {
  document.querySelectorAll(".proj").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transition = "";
      card.style.transform = `rotateX(${(py - 0.5) * -4}deg) rotateY(${(px - 0.5) * 6}deg)`;
      const media = card.querySelector(".proj-media");
      if (media) {
        media.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        media.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      }
    });
    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform .5s cubic-bezier(.2,.65,.25,1)";
      card.style.transform = "";
    });
  });
}

// カスタムカーソル（デスクトップのみ）
const cursor = document.getElementById("cursor");
if (finePointer && !reduceMotion && cursor) {
  document.body.classList.add("has-cursor");
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
  window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function cursorLoop() {
    cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
    const s = cursor.classList.contains("hot") ? 1.6 : 1;
    cursor.style.transform = `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) scale(${s})`;
    requestAnimationFrame(cursorLoop);
  })();
  document.querySelectorAll("a, button, .proj-media").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("hot"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("hot"));
  });
}

// お問い合わせフォーム（Formspree）
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formStatus.className = "form-status mono";
    formStatus.textContent = "> sending…";
    try {
      const resp = await fetch(contactForm.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(contactForm),
      });
      if (resp.ok) {
        contactForm.reset();
        formStatus.className = "form-status mono ok";
        formStatus.textContent = "> sent. thank you — reply within 24h on weekdays.";
      } else {
        formStatus.className = "form-status mono err";
        formStatus.textContent = "> error — please try again or email suematsu0987@gmail.com";
      }
    } catch (_) {
      formStatus.className = "form-status mono err";
      formStatus.textContent = "> network error — please retry.";
    }
  });
}

// Loader hide
window.addEventListener("load", () => setTimeout(() => loader.classList.add("done"), 600));
setTimeout(() => loader.classList.add("done"), 4000); // フォールバック

/* ============================================================
   3D WORLD（動的import — 失敗してもページは機能する）
   ============================================================ */
(async () => {
  const canvas = document.getElementById("bg");
  const isMobile = window.innerWidth < 768;

  let THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, renderer;
  try {
    THREE = await import("three");
    ({ EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js"));
    ({ RenderPass } = await import("three/addons/postprocessing/RenderPass.js"));
    ({ UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js"));
    ({ OutputPass } = await import("three/addons/postprocessing/OutputPass.js"));
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  } catch (e) {
    console.warn("3D disabled (CDN/WebGL unavailable):", e);
    canvas.style.display = "none";
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070c);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 0.6, 15);

  const dpr = () => Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr());
  renderer.setSize(innerWidth, innerHeight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    isMobile ? 0.4 : 0.78,
    0.55,
    isMobile ? 0.3 : 0.2
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- 形状生成 ---------- */
  const N = isMobile ? 8000 : 16000;
  const rand = (a, b) => a + Math.random() * (b - a);

  function fibPoint(i, n, r) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ];
  }

  // 0: "KS" グリフ — オフスクリーンcanvasに描いた文字をピクセルサンプリング
  function shapeGlyph() {
    const W = 360, H = 180;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.font = "900 150px Arial, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("KS", W / 2, H / 2 + 8);
    const px = x.getImageData(0, 0, W, H).data;
    const pts = [];
    for (let y = 0; y < H; y += 2) {
      for (let xx = 0; xx < W; xx += 2) {
        if (px[(y * W + xx) * 4 + 3] > 128) pts.push([xx, y]);
      }
    }
    const a = new Float32Array(N * 3);
    if (!pts.length) { // フォールバック: 球
      for (let i = 0; i < N; i++) {
        const [X, Y, Z] = fibPoint(i, N, 6);
        a[i * 3] = X; a[i * 3 + 1] = Y; a[i * 3 + 2] = Z;
      }
      return a;
    }
    for (let i = 0; i < N; i++) {
      const [gx, gy] = pts[i % pts.length];
      a[i * 3]     = ((gx - W / 2) / (W / 2)) * 10.5 + rand(-0.12, 0.12) + 2.2; // 右寄せ
      a[i * 3 + 1] = (-(gy - H / 2) / (H / 2)) * 5.2 + rand(-0.12, 0.12) + 0.4;
      a[i * 3 + 2] = rand(-0.9, 0.9);
    }
    return a;
  }

  // 1: トーラスノット (p=2, q=3) — 動き続ける機械のコア
  function shapeKnot() {
    const a = new Float32Array(N * 3);
    const S = 2.05;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const cx = (2 + Math.cos(3 * t)) * Math.cos(2 * t);
      const cy = (2 + Math.cos(3 * t)) * Math.sin(2 * t);
      const cz = Math.sin(3 * t);
      a[i * 3]     = cx * S + rand(-0.4, 0.4);
      a[i * 3 + 1] = cy * S + rand(-0.4, 0.4);
      a[i * 3 + 2] = cz * S * 1.6 + rand(-0.4, 0.4);
    }
    return a;
  }

  // 2: ニューラル球殻 — 3層シェル + シナプス(弦)
  function shapeNeural() {
    const a = new Float32Array(N * 3);
    const shells = [3.2, 5.2, 7.2];
    const nShell = Math.floor(N * 0.7);
    for (let i = 0; i < nShell; i++) {
      const s = shells[i % 3];
      const [X, Y, Z] = fibPoint(Math.floor(i / 3), Math.ceil(nShell / 3), s + rand(-0.12, 0.12));
      a[i * 3] = X; a[i * 3 + 1] = Y; a[i * 3 + 2] = Z;
    }
    const chords = [];
    for (let cI = 0; cI < 90; cI++) {
      const r1 = shells[(Math.random() * 3) | 0], r2 = shells[(Math.random() * 3) | 0];
      const p1 = fibPoint((Math.random() * 500) | 0, 500, r1);
      const p2 = fibPoint((Math.random() * 500) | 0, 500, r2);
      chords.push([p1, p2]);
    }
    for (let i = nShell; i < N; i++) {
      const [p1, p2] = chords[(i - nShell) % chords.length];
      const s = Math.random();
      a[i * 3]     = p1[0] + (p2[0] - p1[0]) * s + rand(-0.08, 0.08);
      a[i * 3 + 1] = p1[1] + (p2[1] - p1[1]) * s + rand(-0.08, 0.08);
      a[i * 3 + 2] = p1[2] + (p2[2] - p1[2]) * s + rand(-0.08, 0.08);
    }
    return a;
  }

  // 3: ポータル — 二重リング + 奥へ吸い込まれる渦
  function shapePortal() {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const m = i % 9;
      if (m < 3) {
        const t = rand(0, Math.PI * 2);
        const R = rand(6.1, 6.5);
        a[i * 3] = Math.cos(t) * R;
        a[i * 3 + 1] = Math.sin(t) * R;
        a[i * 3 + 2] = rand(-0.3, 0.3);
      } else if (m < 5) {
        const t = rand(0, Math.PI * 2);
        const R = rand(4.1, 4.4);
        const x0 = Math.cos(t) * R, y0 = Math.sin(t) * R;
        a[i * 3] = x0;
        a[i * 3 + 1] = y0 * 0.92 + x0 * 0.18;
        a[i * 3 + 2] = rand(-0.3, 0.3) + y0 * 0.14;
      } else {
        const s = Math.random();
        const ang = s * Math.PI * 7 + rand(-0.15, 0.15);
        const R = 6.4 * (1 - s) + rand(-0.2, 0.2);
        a[i * 3] = Math.cos(ang) * R;
        a[i * 3 + 1] = Math.sin(ang) * R;
        a[i * 3 + 2] = -s * 15;
      }
    }
    return a;
  }

  const SHAPES = [shapeGlyph(), shapeKnot(), shapeNeural(), shapePortal()];

  /* ---------- パーティクル本体 ---------- */
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(SHAPES[0].slice(), 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);

  const aMix = new Float32Array(N);
  const aRand = new Float32Array(N);
  for (let i = 0; i < N; i++) { aMix[i] = Math.random(); aRand[i] = Math.random(); }
  geo.setAttribute("aMix", new THREE.BufferAttribute(aMix, 1));
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));

  const uniforms = {
    uTime: { value: 0 },
    uWaveAmp: { value: 0.4 },
    uSize: { value: isMobile ? 2.1 : 2.5 },
    uVel: { value: 0 },
    uColA: { value: new THREE.Color("#63FFA8") },
    uColB: { value: new THREE.Color("#0E5A38") },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aMix;
      attribute float aRand;
      uniform float uTime;
      uniform float uWaveAmp;
      uniform float uSize;
      uniform float uVel;
      varying float vMix;
      varying float vFade;
      void main(){
        vec3 p = position;
        float w = sin(p.x * 0.4 + uTime * 0.9 + aRand * 6.2831)
                * cos(p.z * 0.35 + uTime * 0.7);
        p.y += w * uWaveAmp * (0.5 + aRand * 0.9);
        p.x += sin(uTime * 0.5 + aRand * 6.2831) * 0.05;
        p.y -= uVel * (0.35 + aRand) * 4.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        float ps = uSize * (0.75 + aRand * 0.7) * (300.0 / max(dist, 1.0));
        ps *= 1.0 + abs(uVel) * 0.5;
        gl_PointSize = clamp(ps, 1.0, 11.0);
        vMix = aMix;
        vFade = smoothstep(95.0, 12.0, dist);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColA;
      uniform vec3 uColB;
      varying float vMix;
      varying float vFade;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.06, d);
        vec3 col = mix(uColA, uColB, vMix);
        gl_FragColor = vec4(col, a * vFade * 0.52);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; // 動的モーフのためカリング無効
  scene.add(points);

  /* ---------- セクション別キーフレーム ---------- */
  const KEYS = [
    { pos: [0, 0.6, 15],    look: [1.6, 0.3, 0],  wave: 0.42, colA: "#63FFA8", colB: "#0E5A38", size: 2.6 }, // hero: KS
    { pos: [4.2, 2.4, 15.5],look: [0, 0, 0],      wave: 0.24, colA: "#7CFFB9", colB: "#4D3D9E", size: 2.4 }, // projects: knot
    { pos: [0, 1.6, 17],    look: [0, 0, 0],      wave: 0.30, colA: "#B48CFF", colB: "#1F8A5B", size: 2.3 }, // stack: neural
    { pos: [0, 0.4, 17.5],  look: [0, 0, -3],     wave: 0.20, colA: "#B9F2D4", colB: "#8A4DE8", size: 2.0 }, // contact: portal
  ];
  KEYS.forEach((k) => { k.colA = new THREE.Color(k.colA); k.colB = new THREE.Color(k.colB); });
  if (isMobile) KEYS.forEach((k) => { k.pos[2] += 4; k.size *= 0.9; }); // モバイル: 引きで全体を収める

  const anchorIds = ["hero", "projects", "stack", "contact"];
  let anchors = [];
  function measureAnchors() {
    anchors = anchorIds.map((id) => {
      const el = document.getElementById(id);
      return el ? el.offsetTop + el.offsetHeight / 2 : 0;
    });
  }
  measureAnchors();
  window.addEventListener("load", measureAnchors);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAnchors);

  function scrollProgressF() {
    const y = window.scrollY + innerHeight / 2;
    if (y <= anchors[0]) return 0;
    const last = anchors.length - 1;
    if (y >= anchors[last]) return last;
    let k = 0;
    while (k < last && y > anchors[k + 1]) k++;
    const span = anchors[k + 1] - anchors[k];
    const f = span > 0 ? (y - anchors[k]) / span : 0;
    return k + f;
  }

  /* ---------- マウスパララックス（reduced-motion時は無効） ---------- */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- ヘルパー ---------- */
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const v3 = (arr) => new THREE.Vector3(arr[0], arr[1], arr[2]);
  const camPos = new THREE.Vector3().copy(v3(KEYS[0].pos));
  const camLook = new THREE.Vector3().copy(v3(KEYS[0].look));
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  let progSmooth = 0;
  let lastY = window.scrollY;
  let vel = 0;
  let lastK = -1, lastF = -1;

  /* ---------- メインループ ---------- */
  const clock = new THREE.Clock();

  function tick() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // スクロール速度（スムージング）
    const yNow = window.scrollY;
    vel = lerp(vel, yNow - lastY, 0.12);
    lastY = yNow;
    const v = reduceMotion ? 0 : Math.max(-1.4, Math.min(1.4, vel * 0.004));
    uniforms.uVel.value = v;

    // FOVキック（reduced-motion時は固定）
    if (!reduceMotion) {
      camera.fov = 55 + Math.min(14, Math.abs(vel) * 0.04);
      camera.updateProjectionMatrix();
    }

    // 進捗（forceProgressはデバッグ用・範囲クランプ）
    const forced = parseFloat(document.body.dataset.forceProgress);
    if (Number.isFinite(forced)) {
      progSmooth = Math.min(KEYS.length - 1, Math.max(0, forced));
    } else {
      progSmooth = lerp(progSmooth, scrollProgressF(), 0.06);
    }
    document.body.dataset.p = progSmooth.toFixed(2);
    const k = Math.min(KEYS.length - 2, Math.floor(progSmooth));
    const f = smooth(Math.min(1, Math.max(0, progSmooth - k)));
    const A = KEYS[k], B = KEYS[k + 1];

    // 形状モーフ（収束後はバッファ再送しない）
    if (k !== lastK || Math.abs(f - lastF) > 0.0004) {
      const src = SHAPES[k], dst = SHAPES[k + 1];
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = src[i] + (dst[i] - src[i]) * f;
      }
      posAttr.needsUpdate = true;
      lastK = k; lastF = f;
    }

    // ユニフォーム補間
    uniforms.uWaveAmp.value = lerp(A.wave, B.wave, f) * (reduceMotion ? 0.35 : 1);
    uniforms.uSize.value = lerp(A.size, B.size, f) * (isMobile ? 0.85 : 1);
    uniforms.uColA.value.lerpColors(A.colA, B.colA, f);
    uniforms.uColB.value.lerpColors(A.colB, B.colB, f);

    // カメラ補間 + パララックス
    mouse.sx = lerp(mouse.sx, mouse.x, 0.04);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.04);
    tmpA.copy(v3(A.pos)); tmpB.copy(v3(B.pos));
    camPos.lerpVectors(tmpA, tmpB, f);
    camPos.x += mouse.sx * 1.1;
    camPos.y += -mouse.sy * 0.7;
    camera.position.copy(camPos);
    tmpA.copy(v3(A.look)); tmpB.copy(v3(B.look));
    camLook.lerpVectors(tmpA, tmpB, f);
    camera.lookAt(camLook);

    // 回転（KSグリフ=正面固定 → 中盤ゆっくり回転 → ポータルで正面にロックオン）
    const spinIn = Math.min(1, progSmooth * 1.4);
    const spinOut = 1 - smooth(Math.min(1, Math.max(0, (progSmooth - 2.1) / 0.8)));
    const spin = spinIn * spinOut;
    points.rotation.y = (t * (reduceMotion ? 0.008 : 0.05) + progSmooth * 0.7) * spin;
    points.rotation.z = lerp(points.rotation.z, v * 0.12, 0.08);

    composer.render();
    requestAnimationFrame(tick);
  }
  tick();

  /* ---------- リサイズ（debounce・DPR追従） ---------- */
  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr());
      renderer.setSize(innerWidth, innerHeight);
      composer.setSize(innerWidth, innerHeight);
      measureAnchors();
      updateProgress();
    }, 150);
  });
})();
