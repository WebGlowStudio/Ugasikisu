(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const STORE_KEY = "ugasikisu_v1";
  const TOTAL = 10;

  const LEVELS = [
    { name: "Prve kapi", rain: 0.52, gold: 0, sun: 0, wind: 0, lightning: false,
      waves: [{ count: 5, hp: 1, size: 1, speed: 24, stagger: 0.42 }] },
    { name: "Oblačno", rain: 0.6, gold: 0.14, sun: 0, wind: 10, lightning: false,
      waves: [{ count: 7, hp: 1, size: 1, speed: 30, stagger: 0.32 }] },
    { name: "Zlatne kapi", rain: 0.66, gold: 0.22, sun: 0, wind: 12, lightning: false,
      waves: [
        { count: 5, hp: 1, size: 1, speed: 32, stagger: 0.28 },
        { count: 5, hp: 1, size: 1.1, speed: 34, stagger: 0.26 }
      ] },
    { name: "Vetar", rain: 0.72, gold: 0.2, sun: 0, wind: 30, lightning: false,
      waves: [
        { count: 6, hp: 1, size: 1, speed: 38, stagger: 0.22 },
        { count: 5, hp: 2, size: 1.2, speed: 36, stagger: 0.24 }
      ] },
    { name: "Sjaj sunca", rain: 0.76, gold: 0.22, sun: 0.14, wind: 16, lightning: false,
      waves: [
        { count: 5, hp: 1, size: 1, speed: 38, stagger: 0.2 },
        { count: 6, hp: 2, size: 1.1, speed: 40, stagger: 0.2 }
      ] },
    { name: "Grmljavina", rain: 0.82, gold: 0.2, sun: 0.16, wind: 20, lightning: true,
      waves: [
        { count: 6, hp: 2, size: 1.1, speed: 42, stagger: 0.18 },
        { count: 4, hp: 3, size: 1.35, speed: 34, stagger: 0.28 }
      ] },
    { name: "Oluja", rain: 0.88, gold: 0.22, sun: 0.18, wind: 26, lightning: true,
      waves: [
        { count: 6, hp: 2, size: 1.05, speed: 46, stagger: 0.16 },
        { count: 6, hp: 2, size: 1.15, speed: 48, stagger: 0.16 },
        { count: 4, hp: 3, size: 1.28, speed: 38, stagger: 0.22 }
      ] },
    { name: "Temna neba", rain: 0.94, gold: 0.2, sun: 0.18, wind: 36, lightning: true,
      waves: [
        { count: 8, hp: 2, size: 1.05, speed: 50, stagger: 0.14 },
        { count: 6, hp: 3, size: 1.22, speed: 44, stagger: 0.18 }
      ] },
    { name: "Nema predaje", rain: 1.0, gold: 0.22, sun: 0.2, wind: 30, lightning: true,
      waves: [
        { count: 6, hp: 2, size: 1.05, speed: 52, stagger: 0.14 },
        { count: 6, hp: 3, size: 1.18, speed: 48, stagger: 0.16 },
        { count: 5, hp: 3, size: 1.3, speed: 42, stagger: 0.2 }
      ] },
    { name: "Povratak sunca", rain: 1.06, gold: 0.24, sun: 0.26, wind: 22, lightning: true,
      waves: [
        { count: 7, hp: 2, size: 1.08, speed: 48, stagger: 0.14 },
        { count: 6, hp: 3, size: 1.2, speed: 46, stagger: 0.16 },
        { count: 4, hp: 3, size: 1.12, speed: 50, stagger: 0.18, boss: true }
      ] },
  ];

  const defaultStore = () => ({
    unlocked: 1,
    best: Array(TOTAL).fill(0),
    muted: false,
  });

  let store = defaultStore();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (raw && typeof raw === "object") {
      store.unlocked = Math.max(1, Math.min(TOTAL, raw.unlocked | 0 || 1));
      if (Array.isArray(raw.best)) {
        store.best = Array.from({ length: TOTAL }, (_, i) => raw.best[i] | 0 || 0);
      }
      store.muted = !!raw.muted;
    }
  } catch (e) { /* ignore */ }

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }

  const audio = { ctx: null, muted: store.muted, rain: null };

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audio.ctx) audio.ctx = new AC();
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return audio.ctx;
  }

  function tone(freq, dur, type, gain, slide) {
    if (audio.muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, slide), t + dur);
    g.gain.setValueAtTime(Math.max(0.0001, gain || 0.06), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function chord(freqs, dur, gain) {
    freqs.forEach((f, i) => tone(f, dur, "sine", (gain || 0.045) * (1 - i * 0.12)));
  }

  function sfxHit() { tone(520, 0.07, "triangle", 0.05, 280); }
  function sfxCalm() { tone(523, 0.12, "sine", 0.06); setTimeout(() => tone(784, 0.18, "sine", 0.05), 70); }
  function sfxGold() { tone(880, 0.1, "sine", 0.05, 1320); }
  function sfxSun() { chord([392, 523, 659, 784], 0.45, 0.05); }
  function sfxHurt() { tone(180, 0.35, "sawtooth", 0.05, 70); }
  function sfxFail() { tone(160, 0.5, "sine", 0.07, 70); }
  function sfxWin() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, "sine", 0.055), i * 90));
  }
  function sfxEnd() {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.28, "sine", 0.05), i * 110));
  }

  function startRainSound() {
    if (audio.rain || audio.muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const len = 2 * ac.sampleRate;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.65;
    const g = ac.createGain();
    g.gain.value = 0;
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start();
    audio.rain = { src, g, filter };
  }

  function stopRainSound() {
    if (!audio.rain) return;
    try { audio.rain.src.stop(); } catch (e) { /* already stopped */ }
    audio.rain = null;
  }

  function setRainGain(target) {
    if (!audio.rain || !audio.ctx) return;
    const g = audio.rain.g.gain;
    const t = audio.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.linearRampToValueAtTime(Math.max(0, target), t + 0.12);
  }

  function syncMuteIcons() {
    $("icon-on").hidden = audio.muted;
    $("icon-off").hidden = !audio.muted;
    $("btn-mute").setAttribute("aria-pressed", audio.muted ? "true" : "false");
    $("btn-mute").setAttribute("aria-label", audio.muted ? "Uključi zvuk" : "Utišaj zvuk");
  }

  let W = 960, H = 540, dpr = 1;
  let mode = "menu";
  let levelIndex = 0;
  let lives = 3;
  let score = 0;
  let flood = 0;
  let invuln = 0;
  let combo = 0;
  let comboT = 0;
  let hint = true;
  let hintShown = false;
  let waveI = 0;
  let spawnQ = [];
  let clouds = [];
  let drops = [];
  let pickups = [];
  let parts = [];
  let trails = [];
  let popups = [];
  let flashes = 0;
  let shake = 0;
  let winT = 0;
  let time = 0;
  let lastTs = 0;
  let burst = null;
  let birds = [];
  let flowers = [];
  let streaks = [];
  let hills = [];
  let totalClouds = 0;
  let calmed = 0;
  let levelScore = 0;
  let runScore = 0;
  let dropFlood = 0;

  const pointers = new Map();

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function groundY() { return H * 0.78; }

  function resize() {
    const stage = $("stage");
    const rect = stage.getBoundingClientRect();
    const nw = Math.max(280, rect.width);
    const nh = Math.max(220, rect.height);
    const sx = W ? nw / W : 1;
    const sy = H ? nh / H : 1;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = nw;
    H = nh;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sx !== 1 || sy !== 1) remap(sx, sy);
    if (!hills.length) seedWorld();
  }

  function remap(sx, sy) {
    const scale = (o) => { o.x *= sx; o.y *= sy; };
    clouds.forEach((c) => { scale(c); c.r *= (sx + sy) / 2; c.vx *= sx; c.vy *= sy; });
    drops.forEach((d) => { scale(d); d.vy *= sy; });
    pickups.forEach((p) => { scale(p); p.vy *= sy; p.r *= (sx + sy) / 2; });
    parts.forEach(scale);
    popups.forEach(scale);
    trails.forEach((t) => t.pts.forEach(scale));
    birds.forEach(scale);
    flowers.forEach((f) => { f.x *= sx; f.y *= sy; });
    hills.forEach((h) => { h.x *= sx; h.y *= sy; h.w *= sx; h.h *= sy; });
    streaks.forEach((s) => { s.x *= sx; s.y *= sy; s.len *= sy; });
    if (burst) { burst.x *= sx; burst.y *= sy; burst.r *= (sx + sy) / 2; }
  }

  function seedWorld() {
    hills = [
      { x: W * 0.15, y: groundY() + 8, w: W * 0.38, h: H * 0.12, c: "#163226" },
      { x: W * 0.55, y: groundY() + 4, w: W * 0.5, h: H * 0.14, c: "#1E4D32" },
      { x: W * 0.85, y: groundY() + 10, w: W * 0.4, h: H * 0.1, c: "#163226" },
    ];
    flowers = [];
    for (let i = 0; i < 14; i++) {
      flowers.push({
        x: W * (0.08 + i * 0.06 + rand(-0.01, 0.01)),
        y: groundY() + rand(10, 28),
        c: pick(["#E8C54A", "#A3E635", "#22C55E", "#F3E7A8", "#f0a0b0"]),
        s: rand(0.7, 1.2),
        ph: rand(0, 6),
      });
    }
    birds = [];
    streaks = [];
    for (let i = 0; i < 70; i++) {
      streaks.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: rand(10, 22),
        vy: rand(280, 460),
        a: rand(0.15, 0.45),
      });
    }
  }

  function showScreen(id) {
    ["screen-title", "screen-levels", "screen-pause", "screen-dead", "screen-win", "screen-end"].forEach((s) => {
      const el = $(s);
      const on = s === id;
      el.hidden = !on;
      el.classList.toggle("active", on);
    });
    $("hud").hidden = !(mode === "play" || mode === "winseq");
  }

  function updateHud() {
    const lv = LEVELS[levelIndex];
    $("hud-level").textContent = "Nivo " + (levelIndex + 1) + " · " + lv.name;
    $("hud-lives").textContent = "♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, 3 - lives));
    $("hud-score").textContent = String(score);
  }

  function renderLevels() {
    const grid = $("level-grid");
    grid.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lvl";
      const locked = i + 1 > store.unlocked;
      if (locked) b.classList.add("locked");
      if (store.best[i] > 0) b.classList.add("done");
      b.innerHTML = "<span>" + (i + 1) + "</span><small>" + (locked ? "🔒" : lv.name) + "</small>";
      b.disabled = locked;
      b.addEventListener("click", () => { if (!locked) startLevel(i); });
      grid.appendChild(b);
    });
  }

  function angryCount() { return clouds.filter((c) => c.angry).length; }

  function sunshine() {
    if (mode === "menu" || mode === "endseq") return mode === "endseq" ? 1 : 0.35;
    if (mode === "winseq") return clamp(0.45 + winT * 0.7, 0, 1);
    const left = Math.max(0, totalClouds - calmed);
    const clear = totalClouds ? 1 - left / totalClouds : 0;
    return clamp(clear * 0.75 + (1 - flood / 100) * 0.25, 0, 1);
  }

  function placeCloud(spec, isBoss) {
    const base = Math.min(W, H);
    const r = (isBoss ? base * 0.13 : base * 0.075) * (spec.size || 1);
    let x, y, ok = false;
    for (let n = 0; n < 18 && !ok; n++) {
      x = rand(r + 16, W - r - 16);
      y = rand(H * 0.12, H * 0.48);
      ok = clouds.every((c) => Math.hypot(c.x - x, c.y - y) > c.r + r + 8);
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    clouds.push({
      x, y, r,
      vx: dir * spec.speed * rand(0.7, 1.2),
      vy: 0,
      hp: isBoss ? 6 : spec.hp,
      maxHp: isBoss ? 6 : spec.hp,
      angry: true,
      stun: 0,
      ph: rand(0, Math.PI * 2),
      bob: rand(10, 18),
      boss: !!isBoss,
      gone: 0,
    });
  }

  function queueWave(spec) {
    spawnQ = [];
    const extraBoss = spec.boss ? 1 : 0;
    const n = spec.count;
    for (let i = 0; i < n; i++) {
      spawnQ.push({ t: i * spec.stagger, spec, boss: false });
    }
    if (extraBoss) spawnQ.push({ t: n * spec.stagger + 0.4, spec, boss: true });
  }

  function startLevel(i) {
    ensureAudio();
    if (!audio.muted) startRainSound();
    levelIndex = i;
    mode = "play";
    lives = 3;
    flood = 0;
    invuln = 0;
    combo = 0;
    comboT = 0;
    hint = i === 0 && !hintShown;
    waveI = 0;
    clouds = [];
    drops = [];
    pickups = [];
    parts = [];
    trails = [];
    popups = [];
    burst = null;
    flashes = 0;
    shake = 0;
    winT = 0;
    levelScore = 0;
    calmed = 0;
    const lv = LEVELS[i];
    totalClouds = lv.waves.reduce((s, w) => s + w.count + (w.boss ? 1 : 0), 0);
    queueWave(lv.waves[0]);
    if (!birds.length) {
      for (let b = 0; b < 4; b++) {
        birds.push({ x: rand(0, W), y: rand(H * 0.12, H * 0.3), vx: rand(16, 36) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6) });
      }
    }
    updateHud();
    showScreen(null);
    $("hud").hidden = false;
  }

  function addScore(n, x, y, label) {
    score += n;
    levelScore += n;
    runScore += n;
    updateHud();
    if (x != null) popups.push({ x, y, text: label || ("+" + n), life: 0.8, vy: -40 });
  }

  function burstAt(x, y) {
    burst = { x, y, r: 20, max: Math.max(W, H) * 0.7, life: 0.55 };
    sfxSun();
    clouds.forEach((c) => {
      if (c.angry) hitCloud(c, true);
    });
    flood = Math.max(0, flood - 18);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      parts.push({ x, y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, max: 0.6, c: "#E8C54A", s: 4, typ: "spark" });
    }
  }

  function puff(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(20, 90);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: rand(0.3, 0.7), max: 0.7, c: color, s: rand(3, 7), typ: "puff" });
    }
  }

  function hitCloud(c, fromSun) {
    if (!c.angry) return;
    c.hp -= 1;
    c.stun = 0.22;
    c.hitFlash = 0.15;
    if (!fromSun) sfxHit();
    puff(c.x, c.y + c.r * 0.2, "#C5D4C8", 6);
    if (c.hp <= 0) {
      c.angry = false;
      c.gone = 0.001;
      calmed++;
      if (comboT > 0) combo += 1;
      else combo = 1;
      comboT = 1.15;
      const pts = 100 * c.maxHp * combo;
      addScore(pts, c.x, c.y - c.r, combo > 1 ? (combo + "x +" + pts) : ("+" + pts));
      sfxCalm();
      puff(c.x, c.y, "#F3E7A8", 12);
      flood = Math.max(0, flood - 3);
      if (LEVELS[levelIndex].gold > 0 && Math.random() < 0.45) {
        drops.push({ x: c.x, y: c.y, vy: 120, kind: "gold", r: 9, caught: false });
      }
    }
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function tryHitAt(x, y, stroke, prev) {
    if (mode !== "play") return;
    let hit = false;
    for (const p of pickups) {
      if (!p.dead && Math.hypot(p.x - x, p.y - y) < p.r + 18) {
        p.dead = true;
        addScore(200, p.x, p.y, "Sunce!");
        burstAt(p.x, p.y);
        hit = true;
      }
    }
    for (const d of drops) {
      if (!d.caught && d.kind === "gold" && Math.hypot(d.x - x, d.y - y) < d.r + 16) {
        d.caught = true;
        addScore(50 + 10 * (levelIndex + 1), d.x, d.y, "✦");
        sfxGold();
        flood = Math.max(0, flood - 6);
        puff(d.x, d.y, "#E8C54A", 8);
        hit = true;
      }
    }
    for (const c of clouds) {
      if (!c.angry) continue;
      const rad = Math.max(c.r, 36);
      let ok = false;
      if (prev) ok = distToSeg(c.x, c.y, prev.x, prev.y, x, y) < rad;
      else ok = Math.hypot(c.x - x, c.y - y) < rad;
      if (ok && !stroke.hit.has(c)) {
        stroke.hit.add(c);
        hitCloud(c, false);
        hit = true;
        if (hint) { hint = false; hintShown = true; }
      }
    }
    return hit;
  }

  function onPointerDown(e) {
    if (mode !== "play") return;
    if (e.target && e.target.closest && e.target.closest("#btn-menu")) return;
    e.preventDefault();
    ensureAudio();
    if (!audio.muted) startRainSound();
    const p = pointerPos(e);
    const stroke = { hit: new Set(), pts: [{ x: p.x, y: p.y, life: 0.28 }] };
    pointers.set(e.pointerId, { ...p, stroke });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    tryHitAt(p.x, p.y, stroke, null);
    trails.push(stroke);
  }

  function onPointerMove(e) {
    const rec = pointers.get(e.pointerId);
    if (!rec) return;
    e.preventDefault();
    const p = pointerPos(e);
    rec.stroke.pts.push({ x: p.x, y: p.y, life: 0.28 });
    if (rec.stroke.pts.length > 14) rec.stroke.pts.shift();
    tryHitAt(p.x, p.y, rec.stroke, rec);
    rec.x = p.x;
    rec.y = p.y;
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
  }

  function maybeLightning(dt) {
    const lv = LEVELS[levelIndex];
    if (!lv.lightning || mode !== "play") return;
    if (angryCount() && Math.random() < dt * 0.25) {
      flashes = 0.18;
      if (!audio.muted) tone(80, 0.12, "square", 0.02);
    }
  }

  function spawnGoldFrom(c) {
    drops.push({ x: c.x + rand(-c.r * 0.3, c.r * 0.3), y: c.y + c.r * 0.4, vy: rand(140, 200), kind: "gold", r: 9, caught: false });
  }

  function update(dt) {
    time += dt;
    if (comboT > 0) {
      comboT -= dt;
      if (comboT <= 0) combo = 0;
    }
    if (invuln > 0) invuln -= dt;
    if (shake > 0) shake -= dt;
    if (flashes > 0) flashes -= dt;

    trails.forEach((t) => t.pts.forEach((p) => { p.life -= dt; }));
    trails = trails.filter((t) => t.pts.some((p) => p.life > 0));

    parts.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.life -= dt;
    });
    parts = parts.filter((p) => p.life > 0);

    popups.forEach((p) => { p.y += p.vy * dt; p.life -= dt; });
    popups = popups.filter((p) => p.life > 0);

    streaks.forEach((s) => {
      const storm = 1 - sunshine();
      s.y += s.vy * dt * (0.6 + storm);
      if (s.y > groundY() + s.len) {
        s.y = -s.len;
        s.x = Math.random() * W;
      }
    });

    birds.forEach((b) => {
      b.x += b.vx * dt * (0.4 + sunshine());
      b.ph += dt * 8;
      if (b.x < -40) b.x = W + 40;
      if (b.x > W + 40) b.x = -40;
    });

    if (burst) {
      burst.r += burst.max * dt * 2.4;
      burst.life -= dt;
      if (burst.life <= 0) burst = null;
    }

    if (mode === "winseq") {
      winT += dt;
      flood = Math.max(0, flood - dt * 50);
      if (winT > 1.35) finishWin();
      return;
    }

    if (mode !== "play") return;

    const lv = LEVELS[levelIndex];
    const wind = lv.wind;

    spawnQ = spawnQ.filter((item) => {
      item.t -= dt;
      if (item.t <= 0) {
        placeCloud(item.spec, item.boss);
        return false;
      }
      return true;
    });

    clouds.forEach((c) => {
      c.ph += dt * 1.4;
      if (c.stun > 0) c.stun -= dt;
      if (c.hitFlash > 0) c.hitFlash -= dt;
      if (!c.angry) {
        c.gone += dt;
        c.y -= 50 * dt;
        c.x += Math.sin(c.ph) * 18 * dt;
        return;
      }
      c.x += (c.vx + Math.sin(c.ph * 0.6) * wind) * dt;
      c.y += Math.cos(c.ph) * c.bob * dt * 0.35;
      const pad = c.r + 4;
      if (c.x < pad) { c.x = pad; c.vx = Math.abs(c.vx); }
      if (c.x > W - pad) { c.x = W - pad; c.vx = -Math.abs(c.vx); }
      c.y = clamp(c.y, H * 0.1, H * 0.52);

      if (c.stun <= 0) {
        if (lv.gold > 0 && Math.random() < lv.gold * dt * 0.35) spawnGoldFrom(c);
        if (lv.sun > 0 && !pickups.some((p) => !p.dead) && Math.random() < lv.sun * dt * 0.25) {
          pickups.push({ x: rand(W * 0.2, W * 0.8), y: -20, vy: 70, r: 22, dead: false, ph: rand(0, 6) });
        }
      }
    });
    clouds = clouds.filter((c) => c.angry || c.gone < 1.1);

    drops.forEach((d) => {
      d.y += d.vy * dt;
      d.vy += 60 * dt;
    });
    drops = drops.filter((d) => !d.caught && d.y < H + 20);

    pickups.forEach((p) => {
      p.y += p.vy * dt;
      p.ph += dt * 3;
      if (p.y > groundY() + 10) p.dead = true;
    });
    pickups = pickups.filter((p) => !p.dead);

    if (invuln <= 0) {
      const angry = angryCount();
      flood += dt * lv.rain * Math.max(0.35, angry);
      if (angry === 0) flood = Math.max(0, flood - dt * 2);
    }
    flood = clamp(flood, 0, 100);

    if (flood >= 100 && invuln <= 0) {
      lives -= 1;
      updateHud();
      shake = 0.4;
      sfxHurt();
      if (lives <= 0) {
        mode = "dead";
        stopRainSound();
        sfxFail();
        $("dead-msg").textContent = "Kiša je ovaj put pobedila, ali sunce te i dalje čeka.";
        showScreen("screen-dead");
        $("hud").hidden = true;
        return;
      }
      flood = 42;
      invuln = 1.6;
      popups.push({ x: W / 2, y: H * 0.4, text: "Još malo!", life: 1.1, vy: -20 });
    }

    maybeLightning(dt);

    const waveDone = spawnQ.length === 0 && angryCount() === 0;
    if (waveDone) {
      const stillLeaving = clouds.some((c) => !c.angry && c.gone < 0.35);
      if (!stillLeaving) {
        if (waveI + 1 < lv.waves.length) {
          waveI += 1;
          queueWave(lv.waves[waveI]);
        } else if (clouds.length === 0) {
          beginWin();
        }
      }
    }
  }

  function beginWin() {
    mode = "winseq";
    winT = 0;
    dropFlood = flood;
    sfxWin();
    setRainGain(0);
  }
  
  function finishWin() {
    if (mode !== "winseq") return;
    const leftover = Math.round((100 - dropFlood) * 2 + 150);
    addScore(leftover);
    if (levelScore > store.best[levelIndex]) store.best[levelIndex] = levelScore;
    if (store.unlocked < Math.min(TOTAL, levelIndex + 2)) store.unlocked = Math.min(TOTAL, levelIndex + 2);
    saveStore();
    stopRainSound();
    if (levelIndex === TOTAL - 1) {
      mode = "endseq";
      sfxEnd();
      $("end-stats").textContent = "Poeni u ovom nivou: " + levelScore + "  ·  Najbolji: " + store.best[levelIndex];
      showScreen("screen-end");
      $("hud").hidden = true;
    } else {
      mode = "win";
      $("win-msg").textContent = LEVELS[levelIndex].name + " je vedra. Sunce se vratilo!";
      $("win-stats").textContent = "Poeni: " + levelScore + "  ·  Bonus za vedro nebo: " + leftover;
      $("btn-next").textContent = "Dalje";
      showScreen("screen-win");
      $("hud").hidden = true;
    }
  }

  function skyColors(sun) {
    const mix = (a, b, t) => {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const ch = (p, q, s) => Math.round(((p >> s) & 255) * (1 - t) + ((q >> s) & 255) * t);
      const r = ch(pa, pb, 16), g = ch(pa, pb, 8), b2 = ch(pa, pb, 0);
      return "rgb(" + r + "," + g + "," + b2 + ")";
    };
    return {
      top: mix("#1a2a32", "#7ec8e8", sun),
      mid: mix("#243830", "#c8e8a8", sun),
      bot: mix("#0B0F0D", "#F3E7A8", sun),
    };
  }

  function drawCloudShape(c, color, outline) {
    ctx.fillStyle = color;
    const r = c.r;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r * 0.85, r * 0.58, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x - r * 0.45, c.y + r * 0.08, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + r * 0.42, c.y + r * 0.06, r * 0.52, r * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x - r * 0.1, c.y - r * 0.32, r * 0.42, r * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + r * 0.28, c.y - r * 0.22, r * 0.36, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = Math.max(1.5, r * 0.04);
      ctx.stroke();
    }
  }

  function drawFace(c) {
    const r = c.r;
    ctx.save();
    ctx.translate(c.x, c.y + r * 0.04);
    const eyeY = -r * 0.08;
    const eyeD = r * 0.22;
    if (c.angry) {
      ctx.fillStyle = "#163226";
      ctx.beginPath();
      ctx.arc(-eyeD, eyeY, r * 0.09, 0, Math.PI * 2);
      ctx.arc(eyeD, eyeY, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#163226";
      ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-eyeD - r * 0.14, eyeY - r * 0.16);
      ctx.lineTo(-eyeD + r * 0.1, eyeY - r * 0.04);
      ctx.moveTo(eyeD + r * 0.14, eyeY - r * 0.16);
      ctx.lineTo(eyeD - r * 0.1, eyeY - r * 0.04);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, r * 0.22);
      ctx.quadraticCurveTo(0, r * 0.06, r * 0.16, r * 0.22);
      ctx.stroke();
      if (c.boss) {
        ctx.fillStyle = "#E8C54A";
        ctx.beginPath();
        ctx.moveTo(-r * 0.28, -r * 0.52);
        ctx.lineTo(-r * 0.1, -r * 0.72);
        ctx.lineTo(0, -r * 0.52);
        ctx.lineTo(r * 0.1, -r * 0.78);
        ctx.lineTo(r * 0.28, -r * 0.52);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = "#163226";
      ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(-eyeD, eyeY, r * 0.08, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeD, eyeY, r * 0.08, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.16, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHouse() {
    const gy = groundY();
    const hw = Math.min(120, W * 0.22);
    const hh = Math.min(90, H * 0.2);
    const x = W * 0.62;
    const y = gy - hh + 8;
    ctx.fillStyle = "#163226";
    ctx.fillRect(x, y, hw, hh);
    ctx.fillStyle = "#1E4D32";
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 4);
    ctx.lineTo(x + hw / 2, y - hh * 0.45);
    ctx.lineTo(x + hw + 10, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sunshine() > 0.55 ? "#F3E7A8" : "#0B0F0D";
    const ww = hw * 0.18, wh = hh * 0.28;
    ctx.fillRect(x + hw * 0.18, y + hh * 0.28, ww, wh);
    ctx.fillRect(x + hw * 0.62, y + hh * 0.28, ww, wh);
    ctx.fillStyle = "#0B0F0D";
    ctx.fillRect(x + hw * 0.42, y + hh * 0.48, hw * 0.18, hh * 0.52);
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.moveTo(x - 28, gy + 6);
    ctx.quadraticCurveTo(x - 16, gy - 36, x - 4, gy + 6);
    ctx.fill();
  }

  function drawGarden(sun) {
    const gy = groundY();
    ctx.fillStyle = sun > 0.5 ? "#1E4D32" : "#13241c";
    ctx.fillRect(0, gy, W, H - gy);
    hills.forEach((h) => {
      ctx.fillStyle = h.c;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.w, h.h, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    flowers.forEach((f) => {
      const sway = Math.sin(time * 2 + f.ph) * 3;
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x + sway, f.y - 12 * f.s);
      ctx.stroke();
      ctx.fillStyle = sun > 0.35 ? f.c : "#6a7a6c";
      ctx.beginPath();
      ctx.arc(f.x + sway, f.y - 14 * f.s, 3.4 * f.s, 0, Math.PI * 2);
      ctx.fill();
    });
    drawHouse();
  }

  function drawWater() {
    const gy = groundY();
    const maxRise = H * 0.42;
    const rise = (flood / 100) * maxRise;
    if (rise <= 1) return;
    const top = gy + 18 - rise;
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, "rgba(70, 130, 160, 0.55)");
    g.addColorStop(1, "rgba(15, 40, 55, 0.8)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, top);
    const waves = Math.ceil(W / 18) + 2;
    for (let i = 0; i <= waves; i++) {
      const x = i * 18;
      const y = top + Math.sin(time * 3 + i * 0.5) * 3.5 + Math.sin(time * 1.6 + i * 0.9) * 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    if (flood > 70) {
      ctx.fillStyle = "rgba(244,241,232,0.9)";
      ctx.font = "600 16px Jost, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Poplava " + Math.round(flood) + "%", W / 2, top - 10);
    }
  }

  function drawSun(sun) {
    const x = W * 0.18;
    const y = H * (0.55 - sun * 0.38);
    const r = Math.min(W, H) * (0.07 + sun * 0.03);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.15);
    ctx.strokeStyle = "rgba(232, 197, 74, " + (0.25 + sun * 0.65) + ")";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const rays = 12;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
      ctx.lineTo(Math.cos(a) * r * (1.7 + sun * 0.3), Math.sin(a) * r * (1.7 + sun * 0.3));
      ctx.stroke();
    }
    ctx.restore();
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    grd.addColorStop(0, "rgba(243,231,168,0.95)");
    grd.addColorStop(0.5, "rgba(232,197,74,0.9)");
    grd.addColorStop(1, "rgba(232,197,74,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E8C54A";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F3E7A8";
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRainbow(sun) {
    if (sun < 0.85) return;
    ctx.save();
    ctx.globalAlpha = (sun - 0.85) / 0.15 * 0.7;
    const cx = W * 0.5, cy = groundY() + 20, rr = W * 0.55;
    const cols = ["#ef7c7c", "#E8C54A", "#A3E635", "#7ec8e8", "#b39ddb"];
    cols.forEach((col, i) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy, rr - i * 8, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
  }

  function draw() {
    const sun = sunshine();
    const sk = skyColors(sun);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 8 * shake);
    }
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, sk.top);
    bg.addColorStop(0.55, sk.mid);
    bg.addColorStop(1, sk.bot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawSun(sun);
    if (mode === "winseq" || mode === "endseq" || (mode === "win" || (mode === "play" && sun > 0.85))) {
      drawRainbow(Math.max(sun, mode === "endseq" ? 1 : sun));
    }

    birds.forEach((b) => {
      if (sun < 0.4) return;
      ctx.strokeStyle = "rgba(11,15,13," + (0.4 + sun * 0.5) + ")";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      const flap = Math.sin(b.ph) * 5;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + flap);
      ctx.quadraticCurveTo(b.x, b.y - 2, b.x + 8, b.y + flap);
      ctx.stroke();
    });

    const storm = 1 - sun;
    if (storm > 0.08) {
      ctx.strokeStyle = "rgba(200,220,230," + (0.18 + storm * 0.45) + ")";
      ctx.lineWidth = 1.4;
      streaks.forEach((s) => {
        ctx.globalAlpha = s.a * storm;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + 3, s.y + s.len);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    drawGarden(sun);
    drawWater();

    drops.forEach((d) => {
      if (d.kind !== "gold") return;
      ctx.fillStyle = "#E8C54A";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r * 0.7, d.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F3E7A8";
      ctx.beginPath();
      ctx.arc(d.x - 1.5, d.y - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    pickups.forEach((p) => {
      const pulse = 1 + Math.sin(p.ph) * 0.08;
      ctx.fillStyle = "rgba(232,197,74,0.28)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.6 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E8C54A";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F3E7A8";
      ctx.beginPath();
      ctx.arc(p.x - 4, p.y - 4, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });

    if (burst) {
      ctx.strokeStyle = "rgba(232,197,74," + clamp(burst.life * 2, 0, 0.8) + ")";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, burst.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const sorted = clouds.slice().sort((a, b) => a.y - b.y);
    sorted.forEach((c) => {
      ctx.save();
      if (!c.angry) ctx.globalAlpha = clamp(1 - c.gone / 1.1, 0, 1);
      const angryTint = c.boss ? "#6d7380" : "#8b93a1";
      const happyTint = "#F4F1E8";
      let col = c.angry ? angryTint : happyTint;
      if (c.hitFlash > 0) col = "#C5D4C8";
      drawCloudShape(c, col, c.angry ? "#3d4650" : "#9DB2A4");
      if (c.angry && c.maxHp > 1) {
        const ratio = c.hp / c.maxHp;
        const bw = c.r * 1.1, bh = 5;
        ctx.fillStyle = "rgba(11,15,13,0.45)";
        ctx.fillRect(c.x - bw / 2, c.y - c.r - 10, bw, bh);
        ctx.fillStyle = ratio > 0.5 ? "#A3E635" : "#E8C54A";
        ctx.fillRect(c.x - bw / 2, c.y - c.r - 10, bw * ratio, bh);
      }
      drawFace(c);
      ctx.restore();
    });

    parts.forEach((p) => {
      ctx.globalAlpha = clamp(p.life / (p.max || 0.6), 0, 1);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    trails.forEach((t) => {
      if (t.pts.length < 2) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < t.pts.length; i++) {
        const a = t.pts[i - 1], b = t.pts[i];
        const life = Math.max(a.life, b.life);
        if (life <= 0) continue;
        ctx.strokeStyle = "rgba(163,230,53," + clamp(life * 3, 0, 0.7) + ")";
        ctx.lineWidth = 5 * life / 0.28;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });

    popups.forEach((p) => {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      ctx.fillStyle = "#F3E7A8";
      ctx.font = "700 16px Jost, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    if (mode === "play" && hint) {
      ctx.fillStyle = "rgba(11,15,13,0.45)";
      const tw = Math.min(320, W - 40);
      ctx.fillRect(W / 2 - tw / 2, H * 0.58, tw, 36);
      ctx.fillStyle = "#F4F1E8";
      ctx.font = "600 15px Jost, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tapni ljuti oblak! 👆", W / 2, H * 0.58 + 24);
    }

    if (invuln > 0 && mode === "play") {
      ctx.fillStyle = "rgba(232,197,74," + (0.08 + Math.sin(time * 18) * 0.05) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    if (flashes > 0) {
      ctx.fillStyle = "rgba(244,241,232," + (flashes / 0.18) * 0.55 + ")";
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    if (mode === "play" || mode === "winseq" || mode === "menu" || mode === "endseq" || mode === "pause" || mode === "win" || mode === "dead") {
      if (mode !== "pause") update(dt);
      const angry = mode === "play" ? angryCount() : (mode === "menu" ? 2 : 0);
      if (audio.rain) setRainGain(audio.muted ? 0 : Math.min(0.045, 0.012 + angry * 0.006));
    }
    draw();
    requestAnimationFrame(loop);
  }

  function startMenuAmbient() {
    mode = "menu";
    flood = 18;
    clouds = [];
    const spec = { hp: 1, size: 1.1, speed: 18 };
    for (let i = 0; i < 3; i++) placeCloud(spec, false);
    clouds.forEach((c) => { c.y = H * (0.2 + Math.random() * 0.2); });
    showScreen("screen-title");
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  $("btn-play").addEventListener("click", () => {
    ensureAudio();
    let i = 0;
    while (i < TOTAL - 1 && store.best[i] > 0) i++;
    if (i >= store.unlocked) i = Math.max(0, store.unlocked - 1);
    startLevel(i);
  });
  $("btn-levels").addEventListener("click", () => {
    renderLevels();
    showScreen("screen-levels");
  });
  $("btn-levels-back").addEventListener("click", () => showScreen("screen-title"));
  $("btn-menu").addEventListener("click", () => {
    if (mode !== "play") return;
    mode = "pause";
    setRainGain(0);
    showScreen("screen-pause");
    $("hud").hidden = true;
  });
  $("btn-resume").addEventListener("click", () => {
    mode = "play";
    if (!audio.muted) startRainSound();
    showScreen(null);
    $("hud").hidden = false;
  });
  $("btn-restart").addEventListener("click", () => startLevel(levelIndex));
  $("btn-pause-levels").addEventListener("click", () => { stopRainSound(); renderLevels(); mode = "menu"; showScreen("screen-levels"); });
  $("btn-dead-retry").addEventListener("click", () => startLevel(levelIndex));
  $("btn-dead-levels").addEventListener("click", () => { renderLevels(); mode = "menu"; showScreen("screen-levels"); });
  $("btn-next").addEventListener("click", () => startLevel(Math.min(TOTAL - 1, levelIndex + 1)));
  $("btn-win-levels").addEventListener("click", () => { renderLevels(); mode = "menu"; showScreen("screen-levels"); });
  $("btn-end-again").addEventListener("click", () => startLevel(0));
  $("btn-end-levels").addEventListener("click", () => { renderLevels(); mode = "menu"; showScreen("screen-levels"); });
  $("btn-mute").addEventListener("click", () => {
    audio.muted = !audio.muted;
    store.muted = audio.muted;
    saveStore();
    syncMuteIcons();
    if (audio.muted) stopRainSound();
    else if (mode === "play") { ensureAudio(); startRainSound(); }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (mode === "play") $("btn-menu").click();
      else if (mode === "pause") $("btn-resume").click();
    }
    if (e.key === " " && mode === "play") e.preventDefault();
  });

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 80));

  syncMuteIcons();
  resize();
  seedWorld();
  startMenuAmbient();
  requestAnimationFrame(loop);
})();
