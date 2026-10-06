// 《为什么年纪越大，一年过得越快》共用：色板、口播时间、背景、图标、记忆胶片、日历卡、大脑、字幕、转场。
// 画法：Kurzgesagt 式扁平无描边（TOON.flat 双色分面）＋深底发光强调色；竖屏 1080×1920。
// 版面：上 140–330 章节标签，主画面 360–1300，字幕带 1380–1520（GLOBAL_OVERLAY 统一画），1560 以下给平台的标题和按钮。
(() => {
const W = 1080, H = 1920;
const { clamp, lerp, rng } = U;
const F = window.FF = { W, H };
const flat = TOON.flat, glow = TOON.glow, circ = TOON.circle, ell = TOON.ellipse;
const TAU = Math.PI * 2;
F.flat = flat; F.glow = glow;

// ---------- 色板：颜色＝概念 ----------
F.C = {
  bg: ['#090522', '#150d40', '#271a68'],
  warm: '#FFC93C', warm2: '#FF8A3D', warmHi: '#FFF1B8', warmSh: '#E0901A',
  cyan: '#45D4FF', cyan2: '#2A8FD8', cyanSh: '#1D5FA8',
  mag: '#FF5DA2', magSh: '#C23A7A',
  gray: '#7A769E', gray2: '#585478', gray3: '#3E3A5E', grayHi: '#A8A4C8',
  ink: '#F7F5FF', dim: '#9C96C8', film: '#120D2C', filmHi: '#2A2252',
};
const C = F.C;

// ---------- 口播时间（timing.js） ----------
const TL = {}; for (const l of TIMING.lines) TL[l.id] = l;
F.line = id => TL[id];
F.ph = (id, k) => TL[id].phrases[k];
const HAN = /[一-鿿]/;
// 这句里某个词第一个字开口的时刻（逐字时间戳）。词不在句子里 → 报错（引擎拒绝渲染），不静默错位。
F.cue = (id, word, nth = 0) => {
  const l = TL[id]; if (!l) { console.error(`F.cue: 没有句子 ${id}`); return 0; }
  const w = [...word].filter(ch => HAN.test(ch)).join(''), s = l.chars.map(c => c[0]).join('');
  let i = -1; for (let k = 0; k <= nth; k++) i = s.indexOf(w, i + 1);
  if (i < 0) { console.error(`F.cue: ${id} 里没有「${word}」`); return l.t0; }
  return l.chars[i][1];
};
F.end = id => TL[id].t1;

// ---------- 小工具 ----------
F.ease = { out: p => MO.cubicOut(clamp(p)), inOut: p => MO.sineInOut(clamp(p)), back: (p, s = 1.6) => MO.backOut(clamp(p), s), expo: p => MO.expoOut(clamp(p)), in: p => MO.cubicIn(clamp(p)), smooth: p => MO.smooth(clamp(p)) };
F.rr = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };
F.rrc = (cx, cy, w, h, r) => F.rr(cx - w / 2, cy - h / 2, w, h, r);
// 弹出：0→1，带过冲（实测 Kurzgesagt 卡片 0.25s 到 90%、过冲 108%、0.5s 回 100%）
F.pop = (t, t0, dur = 0.45) => t < t0 ? 0 : MO.backOut(clamp((t - t0) / dur), 1.7);
F.fadeIn = (t, t0, dur = 0.3) => clamp((t - t0) / dur);
F.alive = (t, ph = 0, a = 1) => Math.sin(t * 2.2 + ph) * a;           // 待机浮动（画面不许停）
F.text = (c, s, x, y, { size = 60, fam = 'PuHui-Heavy', color = C.ink, align = 'center', base = 'middle', alpha = 1, track = 0, shadow = true } = {}) => {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.font = `${size}px "${fam}"`; c.textAlign = align; c.textBaseline = base; c.fillStyle = color;
  if (track) c.letterSpacing = track + 'px';
  if (shadow) { c.shadowColor = 'rgba(6,3,24,.55)'; c.shadowBlur = 0; c.shadowOffsetY = size * 0.06; }
  c.fillText(s, x, y); c.restore();
};
// 离屏缓存（静态的图标帧、卡片画一次反复贴；内容只由 key 决定，确定性不受影响）
const SPR = new Map();
F.sprite = (key, w, h, draw) => {
  let s = SPR.get(key); if (s) return s;
  s = document.createElement('canvas'); s.width = Math.ceil(w); s.height = Math.ceil(h); draw(s.getContext('2d'), w, h); SPR.set(key, s); return s;
};

// ---------- 背景：深靛紫渐变＋漂浮的尘光（视差） ----------
const DUST = (() => { const r = rng(7), o = []; for (let i = 0; i < 90; i++) o.push({ x: r() * W, y: r() * H, r: 0.8 + r() * r() * 3.4, ph: r() * TAU, sp: 0.6 + r() * 1.8, d: 0.2 + r() * 0.6 }); return o; })();
F.bg = (c, t, { cols = C.bg, dust = 1, tint = '#e8e2ff', drift = 1 } = {}) => {
  c.fillStyle = TOON.vgrad(c, 0, H, cols); c.fillRect(0, 0, W, H);
  if (dust <= 0) return;
  c.save(); c.fillStyle = tint;
  for (const s of DUST) {
    const y = ((s.y - t * 14 * s.d * drift) % H + H) % H, x = s.x + Math.sin(t * 0.4 + s.ph) * 18 * s.d;
    c.globalAlpha = dust * (0.18 + 0.4 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * s.d;
    c.beginPath(); c.arc(x, y, s.r, 0, TAU); c.fill();
  }
  c.restore();
};
// 暗角：把视线收到中间
F.vignette = (c, a = 0.5) => { const g = c.createRadialGradient(W / 2, H * 0.42, H * 0.25, W / 2, H * 0.45, H * 0.75); g.addColorStop(0, 'rgba(5,2,20,0)'); g.addColorStop(1, `rgba(5,2,20,${a})`); c.fillStyle = g; c.fillRect(0, 0, W, H); };

// ---------- 章节标签（顶部胶囊） ----------
F.chip = (c, s, x, y, p, { col = C.cyan, ink = '#0b0726', size = 46, num } = {}) => {
  if (p <= 0) return;
  c.save(); c.font = `${size}px "PuHui-Heavy"`; const tw = c.measureText(s).width;
  const nw = num ? size * 1.15 : 0, w = tw + size * 1.2 + nw, h = size * 1.7;
  c.translate(x, y); c.scale(p, p); c.globalAlpha = clamp(p * 1.5);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(F.rrc(4, 8, w, h, h / 2));
  c.fillStyle = col; c.fill(F.rrc(0, 0, w, h, h / 2));
  if (num) { c.fillStyle = ink; c.beginPath(); c.arc(-w / 2 + h / 2 + 2, 0, h * 0.36, 0, TAU); c.fill(); F.text(c, num, -w / 2 + h / 2 + 2, 2, { size: size * 0.78, color: col, fam: 'PuHui-Black', shadow: false }); }
  F.text(c, s, nw / 2, 2, { size, color: ink, shadow: false });
  c.restore();
};

// ======================================================================================
// 图标：100×100 单位框、中心在原点。扁平无描边、双色分面。t 让会动的部件动起来（风扇转、风筝尾巴摆）。
// ======================================================================================
const I = F.ICON = {};
const fl = (c, p, base, sh, hi, k = 1) => flat(c, p, base, sh, hi, [3 * k, 4 * k], [1.4 * k, 1.6 * k]);
I.watermelon = (c, t) => {
  const p = new Path2D(); p.moveTo(-44, -6); p.arc(0, -6, 44, 0, Math.PI); p.closePath();
  fl(c, p, '#3fbf5a', '#2b8f40', '#7fe08f');
  const q = new Path2D(); q.moveTo(-36, -6); q.arc(0, -6, 36, 0, Math.PI); q.closePath(); fl(c, q, '#ff5a6e', '#d63c55', '#ff9aa6');
  c.fillStyle = '#2a1430'; for (const [x, y] of [[-18, 6], [0, 14], [18, 6], [-8, 2], [9, 2]]) { c.beginPath(); c.ellipse(x, y, 2.6, 4, 0, 0, TAU); c.fill(); }
};
I.popsicle = (c, t) => {
  c.fillStyle = '#e8c48a'; c.fill(F.rrc(0, 30, 10, 34, 5));
  const body = F.rrc(0, -8, 44, 66, 20); fl(c, body, '#ff7aa8', '#d9558a', '#ffc2d8');
  c.fillStyle = '#ffd36b'; c.fill(F.rrc(0, -22, 44, 14, 0)); c.fillStyle = '#7fd8ff'; c.fill(F.rrc(0, -8, 44, 12, 0));
  c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(18, -40, 9, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
  const d = (t * 0.7) % 1; c.fillStyle = '#ff7aa8'; c.globalAlpha = 1 - d; c.beginPath(); c.ellipse(-14, 26 + d * 22, 3.5, 5, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
};
const waves = (c, t, y, col, amp = 4, k = 1) => { c.fillStyle = col; c.beginPath(); c.moveTo(-50, 50); c.lineTo(-50, y); for (let x = -50; x <= 50; x += 5) c.lineTo(x, y + Math.sin(x * 0.18 * k + t * 3) * amp); c.lineTo(50, 50); c.closePath(); c.fill(); };
I.swim = (c, t) => {
  waves(c, t, 8, '#2fa8e8', 4); waves(c, t + 1, 22, '#1f86c8', 3);
  const by = Math.sin(t * 2.6) * 3;
  c.save(); c.translate(0, by);
  const ring = new Path2D(); ring.ellipse(0, 10, 34, 14, 0, 0, TAU); ring.ellipse(0, 10, 20, 7, 0, 0, TAU);
  c.fillStyle = '#ff5a5a'; c.fill(ring, 'evenodd');
  c.save(); c.clip(ring, 'evenodd'); c.fillStyle = '#fff'; for (const a of [0.6, 2.2, 3.8, 5.3]) { c.beginPath(); c.moveTo(0, 10); c.arc(0, 10, 40, a, a + 0.45); c.closePath(); c.fill(); } c.restore();
  flat(c, circ(0, -6, 15), '#ffd3b4', '#f0a98a', '#fff', [3, 3], [1, 1]);
  c.fillStyle = '#1f1a3a'; c.beginPath(); c.arc(0, -12, 15, Math.PI, TAU); c.fill();
  c.fillStyle = '#45D4FF'; c.fill(F.rrc(-6, -6, 10, 7, 3)); c.fill(F.rrc(6, -6, 10, 7, 3));
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 4; i++) { const q = (t * 1.3 + i * 0.25) % 1; c.globalAlpha = 1 - q; c.beginPath(); c.arc(-30 + i * 20, -4 - q * 24, 3, 0, TAU); c.fill(); } c.globalAlpha = 1;
};
I.sea = (c, t) => {
  c.fillStyle = '#ffb35c'; c.fillRect(-50, -50, 100, 60);
  glow(c, 0, 4, 46, '#fff1b8', 0.7); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(0, 6, 20, Math.PI, TAU); c.fill();
  waves(c, t, 6, '#2f8fe0', 2.5, 0.8); waves(c, t + 2, 18, '#2573c4', 3, 0.7); waves(c, t + 4, 32, '#1d5fa8', 3.5, 0.6);
  c.fillStyle = '#fff'; c.save(); c.translate(26 + Math.sin(t) * 2, 2); c.beginPath(); c.moveTo(0, -20); c.lineTo(0, 2); c.lineTo(14, 2); c.closePath(); c.fill(); c.fillStyle = '#5a3a2a'; c.fillRect(-8, 2, 22, 4); c.restore();
  c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.lineCap = 'round'; for (const [x, y] of [[-30, -30], [-18, -36]]) { const f = Math.sin(t * 6 + x) * 3; c.beginPath(); c.moveTo(x - 6, y + f * 0.3); c.quadraticCurveTo(x - 3, y - 4 - f, x, y); c.quadraticCurveTo(x + 3, y - 4 - f, x + 6, y + f * 0.3); c.stroke(); }
};
I.bus = (c, t) => {
  const b = Math.abs(Math.sin(t * 9)) * 1.5;
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 36, 44, 5, 0, 0, TAU); c.fill();
  c.save(); c.translate(0, -b);
  fl(c, F.rrc(0, 0, 92, 58, 12), '#3fbf7a', '#2b8f58', '#8fe8b4');
  c.fillStyle = '#e8fbff'; for (let i = 0; i < 4; i++) c.fill(F.rrc(-33 + i * 20, -10, 15, 16, 3));
  c.fillStyle = '#ffd34a'; c.fill(F.rrc(0, 12, 92, 6, 0));
  c.fillStyle = '#1f1a3a'; c.fill(F.rrc(40, 2, 8, 22, 2));
  c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(43, 18, 3, 0, TAU); c.fill();
  c.restore();
  for (const x of [-26, 24]) { c.fillStyle = '#1f1a3a'; c.beginPath(); c.arc(x, 30, 9, 0, TAU); c.fill(); c.fillStyle = '#a8a4c8'; c.beginPath(); c.arc(x, 30, 3.5, 0, TAU); c.fill(); }
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const q = (t * 2 + i / 3) % 1; c.globalAlpha = 1 - q; c.beginPath(); c.moveTo(-50 - q * 10, -12 + i * 12); c.lineTo(-58 - q * 22, -12 + i * 12); c.stroke(); } c.globalAlpha = 1;
};
I.fan = (c, t) => {
  c.fillStyle = '#a8d8ff'; c.fill(F.rrc(0, 36, 40, 10, 5)); c.fillRect(-3, 10, 6, 28);
  glow(c, 0, -8, 44, '#c8f0ff', 0.4);
  c.save(); c.translate(0, -8); c.rotate(t * 14);
  c.fillStyle = '#e8fbff'; for (let k = 0; k < 3; k++) { c.rotate(TAU / 3); c.beginPath(); c.ellipse(0, -17, 10, 17, 0.3, 0, TAU); c.fill(); }
  c.restore();
  c.strokeStyle = '#7fb2ff'; c.lineWidth = 3; c.beginPath(); c.arc(0, -8, 36, 0, TAU); c.stroke();
  c.fillStyle = '#45a0e8'; c.beginPath(); c.arc(0, -8, 6, 0, TAU); c.fill();
};
I.kite = (c, t) => {
  const sw = Math.sin(t * 2.2) * 0.12; c.save(); c.rotate(sw);
  const k = new Path2D(); k.moveTo(0, -42); k.lineTo(26, -8); k.lineTo(0, 22); k.lineTo(-26, -8); k.closePath();
  fl(c, k, '#ff5d8f', '#d63c70', '#ffa3c2');
  c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(0, -42); c.lineTo(26, -8); c.lineTo(0, -8); c.closePath(); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath();
  for (let i = 0; i <= 20; i++) { const q = i / 20; const x = Math.sin(q * 7 - t * 5) * 8 * q, y = 22 + q * 30; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  c.fillStyle = '#45D4FF'; for (const q of [0.35, 0.7]) { const x = Math.sin(q * 7 - t * 5) * 8 * q, y = 22 + q * 30; c.beginPath(); c.moveTo(x - 6, y - 4); c.lineTo(x + 6, y + 4); c.lineTo(x + 6, y - 4); c.lineTo(x - 6, y + 4); c.closePath(); c.fill(); }
  c.restore();
};
I.firefly = (c, t) => {
  c.fillStyle = 'rgba(200,240,255,.18)'; c.fill(F.rrc(0, 6, 54, 70, 14));
  c.strokeStyle = 'rgba(220,250,255,.7)'; c.lineWidth = 3; c.stroke(F.rrc(0, 6, 54, 70, 14));
  c.fillStyle = '#c8a070'; c.fill(F.rrc(0, -32, 44, 10, 4));
  const r = rng(5); for (let i = 0; i < 7; i++) { const x = -18 + r() * 36 + Math.sin(t * 1.7 + i) * 4, y = -14 + r() * 44 + Math.cos(t * 1.3 + i * 2) * 4, a = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7); glow(c, x, y, 10, '#d9ff6b', 0.7 * a); c.fillStyle = '#f4ffc8'; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
};
I.icecream = (c, t) => {
  const cone = new Path2D(); cone.moveTo(-20, -2); cone.lineTo(20, -2); cone.lineTo(0, 44); cone.closePath(); fl(c, cone, '#e8a85a', '#c8803a', '#ffd08a');
  c.strokeStyle = '#c8803a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 8); c.lineTo(8, 30); c.moveTo(12, 8); c.lineTo(-8, 30); c.stroke();
  fl(c, circ(-9, -14, 17), '#ffb3d1', '#e88ab0', '#ffe0ec'); fl(c, circ(10, -16, 17), '#fff3c4', '#e8d08a', '#fff'); fl(c, circ(0, -32, 16), '#9be0ff', '#6cb8e8', '#e0f6ff');
  c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(2, -48 + Math.sin(t * 3) * 1, 5, 0, TAU); c.fill();
};
I.sunflower = (c, t) => {
  c.strokeStyle = '#3f9a4a'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(6, 30, 0, 50); c.stroke();
  c.save(); c.translate(0, -12); c.rotate(Math.sin(t * 1.4) * 0.08);
  c.fillStyle = '#ffd34a'; for (let k = 0; k < 12; k++) { c.save(); c.rotate(k * TAU / 12); c.beginPath(); c.ellipse(0, -24, 7, 14, 0, 0, TAU); c.fill(); c.restore(); }
  fl(c, circ(0, 0, 15), '#8a5a2c', '#6a4220', '#b07a44'); c.restore();
};
I.stars = (c, t) => {
  c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(16, -18, 16, 0, TAU); c.fill(); c.fillStyle = '#271a68'; c.beginPath(); c.arc(24, -24, 14, 0, TAU); c.fill();
  const r = rng(9); for (let i = 0; i < 9; i++) { const x = -44 + r() * 88, y = -44 + r() * 80, a = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.3)); c.globalAlpha = a; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 1.5 + r() * 2, 0, TAU); c.fill(); } c.globalAlpha = 1;
  c.fillStyle = '#1a1250'; c.beginPath(); c.moveTo(-50, 50); c.lineTo(-50, 30); c.quadraticCurveTo(0, 14, 50, 32); c.lineTo(50, 50); c.closePath(); c.fill();
};
I.ball = (c, t) => {
  const y = -Math.abs(Math.sin(t * 3.2)) * 16; c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 40, 26 + y * 0.4, 5, 0, 0, TAU); c.fill();
  c.save(); c.translate(0, y + 4); c.rotate(t * 2);
  const cols = ['#ff5a5a', '#fff', '#ffd34a', '#fff', '#45a0e8', '#fff']; for (let k = 0; k < 6; k++) { c.fillStyle = cols[k]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 30, k * TAU / 6, (k + 1) * TAU / 6); c.closePath(); c.fill(); }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill(); c.restore();
};
I.bike = (c, t) => {
  c.strokeStyle = '#1f1a3a'; c.lineWidth = 5; for (const x of [-26, 26]) { c.beginPath(); c.arc(x, 18, 18, 0, TAU); c.stroke(); c.save(); c.translate(x, 18); c.rotate(t * 6); c.lineWidth = 1.5; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-17, 0); c.lineTo(17, 0); c.stroke(); } c.restore(); }
  c.strokeStyle = '#ff5d8f'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-26, 18); c.lineTo(-6, -8); c.lineTo(18, -8); c.lineTo(26, 18); c.moveTo(-6, -8); c.lineTo(2, 18); c.lineTo(18, -8); c.stroke();
  c.fillStyle = '#1f1a3a'; c.fill(F.rrc(-8, -14, 16, 5, 2)); c.strokeStyle = '#1f1a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(18, -8); c.lineTo(16, -20); c.lineTo(24, -22); c.stroke();
};
// ---- 长大以后的四件事（灰色版在卡片里用同一套） ----
I.alarm = (c, t) => {
  const sh = Math.sin(t * 40) * 2.2 * (0.5 + 0.5 * Math.sign(Math.sin(t * 3)));
  c.save(); c.translate(sh, 0);
  for (const k of [-1, 1]) { c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(k * 22, -30, 11, 0, TAU); c.fill(); }
  c.strokeStyle = '#c8a040'; c.lineWidth = 4; c.beginPath(); c.moveTo(-20, 32); c.lineTo(-26, 42); c.moveTo(20, 32); c.lineTo(26, 42); c.stroke();
  fl(c, circ(0, 4, 34), '#ff6b5a', '#d84a3c', '#ffa898');
  c.fillStyle = '#fff8ea'; c.beginPath(); c.arc(0, 4, 26, 0, TAU); c.fill();
  c.strokeStyle = '#1f1a3a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -12); c.moveTo(0, 4); c.lineTo(12, 10); c.stroke();
  c.restore();
};
I.subway = (c, t) => {
  c.fillStyle = '#3e3a5e'; c.fillRect(-46, 36, 92, 5);
  const b = Math.sin(t * 12) * 1.2; c.save(); c.translate(0, b);
  fl(c, F.rrc(0, -2, 70, 76, 18), '#45a0e8', '#2a74c0', '#9fd4ff');
  c.fillStyle = '#e8fbff'; c.fill(F.rrc(0, -16, 52, 26, 8));
  c.fillStyle = '#ffd34a'; for (const x of [-20, 20]) { c.beginPath(); c.arc(x, 20, 5, 0, TAU); c.fill(); }
  c.fillStyle = '#1f1a3a'; c.fill(F.rrc(0, 30, 50, 6, 3)); c.restore();
};
I.laptop = (c, t) => {
  fl(c, F.rrc(0, -8, 76, 52, 6), '#5a5a8a', '#3e3a6a', '#8a86c8');
  c.fillStyle = '#9fd4ff'; c.fill(F.rrc(0, -8, 66, 42, 3));
  c.fillStyle = '#2a74c0'; const n = Math.floor(t * 4) % 5; for (let i = 0; i < 4; i++) c.fillRect(-26, -22 + i * 9, i === 3 ? 20 + n * 6 : 50 - i * 8, 4);
  c.fillStyle = '#8a86c8'; c.beginPath(); c.moveTo(-46, 20); c.lineTo(46, 20); c.lineTo(52, 30); c.lineTo(-52, 30); c.closePath(); c.fill();
};
I.phone = (c, t) => {
  fl(c, F.rrc(0, 0, 50, 88, 10), '#2a2550', '#1a1638', '#4a4580');
  c.save(); c.beginPath(); c.roundRect(-20, -36, 40, 70, 4); c.clip(); c.fillStyle = '#ff9a6b'; c.fillRect(-20, -36, 40, 70);
  const off = (t * 40) % 24; c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = -1; i < 4; i++) { const y = -36 + i * 24 - off; c.fillRect(-15, y + 4, 30, 12); c.fillRect(-15, y + 18, 20, 3); }
  c.restore();
  const tap = (t * 2) % 1; c.fillStyle = '#ffd3b4'; c.beginPath(); c.ellipse(16, 30 - tap * 12, 8, 10, -0.3, 0, TAU); c.fill();
};
// ---- 旅行 ----
I.mountain = (c, t) => {
  glow(c, 22, -24, 30, '#fff1b8', 0.6); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(22, -24, 11, 0, TAU); c.fill();
  const m1 = U.poly([[-50, 44], [-14, -26], [22, 44]]), m2 = U.poly([[-10, 44], [20, -6], [50, 44]]);
  fl(c, m2, '#6a8ae0', '#4a6ac0', '#9ab4ff'); fl(c, m1, '#5a6ad0', '#3a4ab0', '#8a9aff');
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-14, -26); c.lineTo(-24, -6); c.lineTo(-16, -10); c.lineTo(-10, -4); c.lineTo(-4, -6); c.closePath(); c.fill();
};
I.plane = (c, t) => {
  c.save(); c.translate(Math.sin(t * 1.5) * 4, Math.cos(t * 1.8) * 3); c.rotate(-0.25);
  c.fillStyle = '#e8fbff'; c.beginPath(); c.ellipse(0, 0, 44, 9, 0, 0, TAU); c.fill();
  c.fillStyle = '#9fd4ff'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(10, -34); c.lineTo(20, -34); c.lineTo(12, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-6, 0); c.lineTo(10, 30); c.lineTo(20, 30); c.lineTo(12, 0); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-36, -2); c.lineTo(-44, -18); c.lineTo(-36, -18); c.lineTo(-28, -2); c.closePath(); c.fill();
  c.fillStyle = '#45a0e8'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-14 + i * 9, -2, 2.2, 0, TAU); c.fill(); }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.setLineDash([8, 8]); c.lineDashOffset = -t * 40; c.beginPath(); c.moveTo(-50, 30); c.quadraticCurveTo(-30, 24, -22, 12); c.stroke(); c.setLineDash([]);
};
I.temple = (c, t) => {
  c.fillStyle = '#ff6b5a'; c.fillRect(-30, -8, 8, 52); c.fillRect(22, -8, 8, 52);
  fl(c, U.poly([[-46, -22], [46, -22], [40, -10], [-40, -10]]), '#ff6b5a', '#d84a3c', '#ffa898');
  c.fillStyle = '#1f1a3a'; c.fillRect(-50, -32, 100, 10); c.fillStyle = '#ff6b5a'; c.fillRect(-34, 4, 68, 7);
  const r = rng(3); c.fillStyle = '#ffb3d1'; for (let i = 0; i < 5; i++) { const q = (t * 0.25 + r()) % 1; c.globalAlpha = 1 - q; c.beginPath(); c.ellipse(-40 + r() * 80 + Math.sin(t * 2 + i) * 6, -40 + q * 80, 3.5, 2.2, t + i, 0, TAU); c.fill(); } c.globalAlpha = 1;
};
I.noodle = (c, t) => {
  U.steam(c, t, { x: 0, y: -10, h: 34, n: 3, w: 3, spread: 14, color: 'rgba(255,255,255,.75)', wobble: 5 });
  c.fillStyle = '#ffe9a8'; c.beginPath(); c.ellipse(0, 0, 40, 9, 0, 0, TAU); c.fill();
  const bowl = new Path2D(); bowl.moveTo(-42, 0); bowl.quadraticCurveTo(-38, 38, 0, 40); bowl.quadraticCurveTo(38, 38, 42, 0); bowl.closePath(); fl(c, bowl, '#ff6b5a', '#d84a3c', '#ffa898');
  c.fillStyle = '#fff'; c.fillRect(-30, 14, 60, 5);
  c.strokeStyle = '#c8803a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(6, -4); c.lineTo(36, -40); c.moveTo(14, -2); c.lineTo(44, -34); c.stroke();
};
I.camera = (c, t) => {
  fl(c, F.rrc(0, 6, 84, 56, 10), '#3e3a5e', '#2a2550', '#6a6698'); c.fillStyle = '#3e3a5e'; c.fill(F.rrc(-18, -26, 26, 12, 4));
  fl(c, circ(0, 8, 21), '#1f1a3a', '#120f26', '#4a4580'); c.fillStyle = '#45a0e8'; c.beginPath(); c.arc(0, 8, 12, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(-4, 4, 4, 0, TAU); c.fill();
  const f = (t * 0.8) % 1; if (f < 0.12) { glow(c, 30, -12, 40, '#ffffff', 1 - f / 0.12); }
  c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(30, -12, 5, 0, TAU); c.fill();
};
I.beach = (c, t) => {
  c.fillStyle = '#7fd8ff'; c.fillRect(-50, -50, 100, 64); waves(c, t, 4, '#2f8fe0', 2.5); c.fillStyle = '#ffe0a0'; c.fillRect(-50, 24, 100, 26);
  c.strokeStyle = '#8a5a3c'; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, 40); c.lineTo(6, -18); c.stroke();
  const um = new Path2D(); um.moveTo(-34, -6); um.quadraticCurveTo(2, -60, 44, -26); um.closePath(); c.save(); c.fillStyle = '#ff5d8f'; c.fill(um); c.clip(um); c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(6, -18); c.lineTo(-30 + k * 30, -60); c.lineTo(-18 + k * 30, -60); c.closePath(); c.fill(); } c.restore();
};
I.sunset = (c, t) => {
  c.fillStyle = TOON.vgrad(c, -50, 50, ['#5b2a86', '#ff7a59', '#ffc93c']); c.fillRect(-50, -50, 100, 100);
  glow(c, 0, 14, 40, '#fff1b8', 0.7); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(0, 16 + Math.sin(t * 0.8) * 2, 18, 0, TAU); c.fill();
  c.fillStyle = '#2a1b6e'; c.beginPath(); c.moveTo(-50, 50); c.lineTo(-50, 24); c.lineTo(-24, 6); c.lineTo(-6, 22); c.lineTo(14, 4); c.lineTo(50, 26); c.lineTo(50, 50); c.closePath(); c.fill();
};
I.suitcase = (c, t) => {
  c.strokeStyle = '#3e3a5e'; c.lineWidth = 6; c.beginPath(); c.moveTo(-12, -24); c.lineTo(-12, -36); c.lineTo(12, -36); c.lineTo(12, -24); c.stroke();
  fl(c, F.rrc(0, 8, 70, 64, 10), '#ff8a3d', '#d86a20', '#ffb880'); c.fillStyle = '#ffd34a'; c.fillRect(-35, 0, 70, 8);
  c.fillStyle = '#45D4FF'; c.beginPath(); c.arc(-14, 22, 7, 0, TAU); c.fill(); c.fillStyle = '#ff5d8f'; c.fill(F.rrc(14, 22, 16, 10, 3));
};
// ---- 出路 ----
I.road = (c, t) => {
  c.fillStyle = '#3e3a5e'; c.beginPath(); c.moveTo(-14, 50); c.lineTo(14, 50); c.lineTo(6, 4); c.lineTo(-6, 4); c.closePath(); c.fill();
  c.strokeStyle = '#3e3a5e'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(-4, -16, -34, -36); c.stroke();
  c.strokeStyle = '#ffc93c'; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(6, -16, 34, -36); c.stroke();
  c.fillStyle = '#ffc93c'; c.save(); c.translate(36, -38); c.rotate(-0.6); c.beginPath(); c.moveTo(10, 0); c.lineTo(-6, -10); c.lineTo(-6, 10); c.closePath(); c.fill(); c.restore();
  const q = (t * 0.8) % 1; const px = lerp(0, 34, q), py = lerp(8, -36, q) + Math.sin(q * Math.PI) * -6; glow(c, px, py, 16, '#fff1b8', 0.8);
};
I.spark = (c, t) => {
  c.save(); c.rotate(t * 0.6);
  const st = new Path2D(); for (let k = 0; k < 16; k++) { const r = k % 2 ? 22 : 44, a = k * Math.PI / 8; k ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(r, 0); } st.closePath();
  glow(c, 0, 0, 56, '#ffe9a8', 0.5); fl(c, st, '#ffc93c', '#e0901a', '#fff1b8'); c.restore();
  F.text(c, '1st', 0, 2, { size: 22, fam: 'Poppins-800', color: '#7a3a00', shadow: false });
};
I.note = (c, t) => {
  fl(c, F.rrc(-6, 4, 64, 80, 8), '#fff8ea', '#e0d4bc', '#ffffff');
  c.fillStyle = '#ff5d8f'; c.fillRect(-38, -36, 6, 80);
  const p = (t * 0.5) % 1; c.strokeStyle = '#3e3a5e'; c.lineWidth = 3; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const w = i < 3 ? 40 : 40 * p; c.beginPath(); c.moveTo(-26, -20 + i * 14); c.lineTo(-26 + w, -20 + i * 14); c.stroke(); }
  c.save(); c.translate(-26 + 40 * p + 6, 22 - 8); c.rotate(0.7); c.fillStyle = '#45a0e8'; c.fill(F.rrc(0, -18, 8, 40, 3)); c.fillStyle = '#ffd3b4'; c.beginPath(); c.moveTo(-4, 2); c.lineTo(4, 2); c.lineTo(0, 10); c.closePath(); c.fill(); c.restore();
};
I.hourglass = (c, t) => {
  const r = (t * 0.9) % 1;
  c.save(); c.fillStyle = '#c8a070'; c.fillRect(-30, -44, 60, 8); c.fillRect(-30, 36, 60, 8);
  const g = new Path2D(); g.moveTo(-24, -36); g.lineTo(24, -36); g.lineTo(3, 0); g.lineTo(24, 36); g.lineTo(-24, 36); g.lineTo(-3, 0); g.closePath();
  c.fillStyle = 'rgba(200,240,255,.25)'; c.fill(g); c.clip(g);
  c.fillStyle = '#ffc93c'; c.fillRect(-30, -36 + 30 * r, 60, 36 - 30 * r); c.fillRect(-30, 36 - 30 * r, 60, 30 * r); c.fillRect(-1.5, -4, 3, 40);
  c.restore();
};
F.icon = (c, name, x, y, s, t, { alpha = 1, gray = 0 } = {}) => {
  const fn = I[name]; if (!fn) { console.error('没有图标 ' + name); return; }
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(s / 100, s / 100);
  if (gray) c.filter = `grayscale(${gray}) brightness(${1 - 0.25 * gray})`;
  fn(c, t); c.restore();
};

// ======================================================================================
// 记忆画面：圆角小画框（底色＋图标）。冷/暖两版：暖＝新鲜的记忆，灰＝重复的日子。
// ======================================================================================
F.TINT = { watermelon: '#2a6a5a', popsicle: '#4a2a7a', swim: '#7fd8ff', sea: '#ffb35c', bus: '#ffe9a8', fan: '#2a4a8a', kite: '#7fd8ff', firefly: '#1a1250', icecream: '#ffd8e8', sunflower: '#7fd8ff', stars: '#271a68', ball: '#ffe0a0', bike: '#ffe9a8',
  alarm: '#4a466e', subway: '#4a466e', laptop: '#4a466e', phone: '#4a466e', mountain: '#bfe6ff', plane: '#7fc8ff', temple: '#ffe0c8', noodle: '#ffd8a8', camera: '#ffe9a8', beach: '#7fd8ff', sunset: '#ff7a59', suitcase: '#c8f0ff',
  road: '#2a2252', spark: '#4a2a7a', note: '#c8f0ff', hourglass: '#2a2252' };
F.SUMMER = ['watermelon', 'swim', 'popsicle', 'kite', 'fan', 'firefly', 'icecream', 'sunflower', 'stars', 'ball', 'bike', 'sea'];
F.CHILD = ['swim', 'sea', 'bus', 'kite', 'bike', 'watermelon', 'icecream', 'ball', 'firefly', 'sunflower', 'stars', 'popsicle', 'fan'];
F.TRAVEL = ['mountain', 'plane', 'temple', 'noodle', 'camera', 'beach', 'sunset', 'suitcase'];
// 画一帧记忆（中心 x,y，宽 w，高 h）。live=true 时图标按 t 动；否则走缓存（密集场面上百帧也不卡）。
F.frame = (c, name, x, y, w, h, t, { live = false, gray = 0, alpha = 1, glowA = 0, border = '#fff8ea', bw = 0.045 } = {}) => {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha;
  if (glowA > 0) glow(c, x, y, Math.max(w, h) * 0.95, gray ? '#a8a4c8' : '#ffd36b', glowA);
  const r = Math.min(w, h) * 0.12, b = Math.min(w, h) * bw;
  if (!live) {
    const key = `fr:${name}:${gray}`, S = 300, SH = 210;
    const sp = F.sprite(key, S, SH, (g) => { drawFrame(g, name, S / 2, SH / 2, S, SH, 0.6, gray, border, bw); });
    c.drawImage(sp, x - w / 2, y - h / 2, w, h);
  } else drawFrame(c, name, x, y, w, h, t, gray, border, bw);
  c.restore();
};
function drawFrame(c, name, x, y, w, h, t, gray, border, bw) {
  const r = Math.min(w, h) * 0.12, b = Math.min(w, h) * bw;
  c.save();
  c.fillStyle = gray ? '#8f8bb0' : border; c.fill(F.rrc(x, y, w, h, r));
  const inner = F.rrc(x, y, w - 2 * b, h - 2 * b, r * 0.7);
  c.save(); c.clip(inner);
  c.fillStyle = gray ? '#4a466e' : (F.TINT[name] || '#2a2252'); c.fillRect(x - w / 2, y - h / 2, w, h);
  const s = Math.min(w - 2 * b, (h - 2 * b) * 1.25) * 0.78;
  F.icon(c, name, x, y + s * 0.02, s, t, { gray });
  c.fillStyle = 'rgba(255,255,255,.10)'; c.beginPath(); c.ellipse(x - w * 0.25, y - h * 0.5, w * 0.5, h * 0.25, -0.2, 0, TAU); c.fill();
  c.restore(); c.restore();
}

// 胶片条：竖直（vertical）或水平。frames=[名字…]，按 pitch 循环排；off 是滚动偏移（像素）。
// 胶片身子深色、两侧齿孔。reveal(i) → 0..1 控制第 i 格的显现（默认全显）。
F.strip = (c, x, y, len, t, { vertical = true, w = 300, frames = F.SUMMER, pitch, off = 0, gray = 0, reveal, live = -1, glowA = 0, alphaFrame = 1, film = C.film } = {}) => {
  // 画格在屏幕上的宽高：竖条格宽 0.74w；横条格高 0.62w。pitch＝沿胶片方向的格距
  const fw = vertical ? w * 0.74 : w * 0.62 / 0.7, fh = vertical ? fw * 0.7 : w * 0.62;
  pitch = pitch || (vertical ? fh * 1.16 : fw * 1.12);
  c.save(); c.translate(x, y); if (!vertical) c.rotate(-Math.PI / 2);
  // 身子
  c.fillStyle = film; c.fillRect(-w / 2, -len / 2, w, len);
  c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(-w / 2, -len / 2, w * 0.06, len);
  // 齿孔
  const hp = w * 0.11, ho = ((off % hp) + hp) % hp;
  c.fillStyle = 'rgba(255,255,255,.22)';
  for (let yy = -len / 2 - hp + ho; yy < len / 2 + hp; yy += hp) for (const k of [-1, 1]) c.fill(F.rrc(k * w * 0.43, yy, w * 0.055, hp * 0.5, 3));
  // 画格
  c.save(); c.beginPath(); c.rect(-w / 2, -len / 2, w, len); c.clip();
  const n0 = Math.floor((-len / 2 - off) / pitch) - 1, n1 = Math.ceil((len / 2 - off) / pitch) + 1;
  for (let i = n0; i <= n1; i++) {
    const fy = i * pitch + off, rv = reveal ? reveal(i) : 1; if (rv <= 0) continue;
    const name = frames[((i % frames.length) + frames.length) % frames.length];
    const g = typeof gray === 'function' ? gray(i) : gray;
    c.save(); c.translate(0, fy); if (!vertical) c.rotate(Math.PI / 2);
    const sc = 0.6 + 0.4 * rv;
    F.frame(c, name, 0, 0, fw * sc, fh * sc, t, { gray: g, alpha: clamp(rv * 1.5) * alphaFrame, live: i === live, glowA: glowA * rv, bw: 0.035 });
    c.restore();
  }
  c.restore(); c.restore();
};

// ======================================================================================
// 大脑：粉色团子＋大白眼（Kurzgesagt 式吉祥物），look=-1..1 看向哪边
// ======================================================================================
F.brain = (c, x, y, s, t, { look = 0, squint = 0, glowA = 0.3 } = {}) => {
  c.save(); c.translate(x, y + Math.sin(t * 2.1) * 6 * s); c.scale(s, s);
  const br = 1 + Math.sin(t * 2.6) * 0.015; c.scale(1 + (br - 1), 1 - (br - 1));
  if (glowA) glow(c, 0, 0, 260, '#ff7ab8', glowA);
  const P = RIG.smooth([[-150, 30], [-160, -40], [-120, -100], [-50, -130], [20, -128], [90, -112], [145, -60], [158, 10], [130, 70], [60, 96], [-40, 96], [-120, 80]], true);
  flat(c, P, '#ff8fc0', '#e0629c', '#ffc4de', [-16, 14], [-6, 6]);
  // 沟回：填色的弧（无描边风格里用细色带代替线）
  c.strokeStyle = '#e0629c'; c.lineWidth = 9; c.lineCap = 'round';
  for (const [a, b2, cc, d] of [[[-110, -60], [-70, -90], [-30, -70], [-40, -40]], [[10, -100], [40, -70], [80, -90], [110, -60]], [[-130, 20], [-100, 0], [-80, 30], [-60, 10]], [[90, 0], [120, -10], [130, 30], [110, 50]], [[0, -128], [0, -100], [0, -80], [6, -60]]]) {
    c.beginPath(); c.moveTo(...a); c.bezierCurveTo(...b2, ...cc, ...d); c.stroke();
  }
  // 眼睛
  const bl = (t % 3.3) > 3.18 ? 0.12 : 1 - squint * 0.5;
  for (const ex of [-46, 46]) {
    c.save(); c.translate(ex, 10); c.scale(1, bl);
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, 30, 36, 0, 0, TAU); c.fill();
    c.fillStyle = '#1f1a3a'; c.beginPath(); c.ellipse(look * 12, 6, 16, 21, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(look * 12 - 6, -2, 6, 0, TAU); c.fill();
    c.restore();
  }
  c.fillStyle = 'rgba(255,90,140,.45)'; for (const ex of [-92, 92]) { c.beginPath(); c.ellipse(ex, 52, 18, 10, 0, 0, TAU); c.fill(); }
  c.strokeStyle = '#a03a6a'; c.lineWidth = 6; c.beginPath(); c.arc(0, 52, 14, 0.2, Math.PI - 0.2); c.stroke();
  c.restore();
};

// ======================================================================================
// 一天的日历卡（灰）：顶上一条表头，里面四件事。缓存成位图。
// ======================================================================================
F.DAY = ['alarm', 'subway', 'laptop', 'phone'];
F.dayCardSprite = (gray = 1) => F.sprite('day:' + gray, 640, 400, (g, w, h) => {
  g.fillStyle = gray ? '#6e6a92' : '#fff8ea'; g.fill(F.rr(0, 0, w, h, 34));
  g.fillStyle = gray ? '#57537a' : '#ff6b5a'; g.save(); g.clip(F.rr(0, 0, w, h, 34)); g.fillRect(0, 0, w, 86); g.restore();
  g.fillStyle = gray ? '#8f8bb0' : '#fff'; for (const x of [130, w - 130]) { g.beginPath(); g.arc(x, 43, 14, 0, TAU); g.fill(); }
  g.fillStyle = gray ? '#4a466e' : '#f0e8d8'; g.fill(F.rr(30, 112, w - 60, h - 142, 22));
  F.DAY.forEach((k, i) => F.icon(g, k, 30 + (w - 60) * (i + 0.5) / 4, 112 + (h - 142) / 2, 112, 0.3, { gray: gray ? 0.85 : 0 }));
});
F.dayCard = (c, x, y, w, t, { gray = 1, alpha = 1, rot = 0 } = {}) => {
  const sp = F.dayCardSprite(gray), h = w * 400 / 640;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.rotate(rot); c.drawImage(sp, -w / 2, -h / 2, w, h); c.restore();
};

// ======================================================================================
// 字幕（GLOBAL_OVERLAY）：每个短句一张，从开口前 0.06s 到下一短句开口（句尾多留 0.35s）。
// 关键词按概念着色；画面上已经有同样大字的短句不出字幕（NOSUB）。
// ======================================================================================
F.SUB_Y = 1452;
F.NOSUB = { 'L05:0': 1, 'L05:1': 1, 'L11:2': 1, 'L22:0': 1, 'L23:0': 1, 'L23:1': 1, 'L24:0': 1, 'L24:1': 1 };
F.KEYS = [['比例理论', C.cyan], ['记忆密度', C.warm], ['第一次', C.warm], ['一帧', C.grayHi], ['薄薄一张', C.grayHi], ['重复', C.grayHi], ['假期悖论', C.mag], ['特别长', C.warm], ['新画面', C.warm], ['新的一天', C.warm], ['1/5', C.cyan], ['1/30', C.cyan], ['90天', C.warm], ['画面', C.warm], ['越来越短', C.cyan]];
const SUBS = (() => {
  const o = [], L = TIMING.lines;
  L.forEach((l, li) => l.phrases.forEach((p, k) => {
    const nextP = l.phrases[k + 1] || (L[li + 1] && L[li + 1].phrases[0]);
    const end = k < l.phrases.length - 1 ? nextP.t0 - 0.06 : Math.min(l.t1 + 0.35, nextP ? nextP.t0 - 0.06 : 1e9);
    if (!F.NOSUB[`${l.id}:${k}`]) o.push({ s: p.sub.replace(/[，。；：、]$/, ''), t0: p.t0 - 0.06, t1: end });
  }));
  return o;
})();
F.SUBS = SUBS;
const subRuns = (s) => {                                     // 切成 [文字, 颜色] 段
  const runs = []; let i = 0;
  while (i < s.length) {
    let hit = null; for (const [k, col] of F.KEYS) if (s.startsWith(k, i) && (!hit || k.length > hit[0].length)) hit = [k, col];
    if (hit) { runs.push(hit); i += hit[0].length; } else { const ch = s[i]; if (runs.length && runs[runs.length - 1][1] === C.ink) runs[runs.length - 1][0] += ch; else runs.push([ch, C.ink]); i++; }
  }
  return runs;
};
F.subtitle = (c, t) => {
  const sb = SUBS.find(x => t >= x.t0 && t < x.t1); if (!sb) return;
  const a = clamp((t - sb.t0) / 0.1) * clamp((sb.t1 - t) / 0.08), rise = (1 - F.ease.out(clamp((t - sb.t0) / 0.16))) * 10;
  let size = 60; c.save(); c.font = `${size}px "PuHui-Heavy"`;
  let tw = c.measureText(sb.s).width; if (tw > 960) { size = Math.floor(size * 960 / tw); c.font = `${size}px "PuHui-Heavy"`; tw = c.measureText(sb.s).width; }
  const y = F.SUB_Y + rise;
  c.globalAlpha = a;
  c.fillStyle = 'rgba(8,4,28,.62)'; c.fill(F.rrc(W / 2, y, tw + 64, size * 1.62, size * 0.5));
  c.textBaseline = 'middle'; c.textAlign = 'left'; let x = W / 2 - tw / 2;
  for (const [s, col] of subRuns(sb.s)) { c.fillStyle = col; c.fillText(s, x, y + 2); x += c.measureText(s).width; }
  c.restore();
};
window.GLOBAL_OVERLAY = (c, t) => { if (t < window.FILM_DURATION) F.subtitle(c, t); };

// ======================================================================================
// 转场（竖屏版；引擎自带的 transitions.js 按 1920×1080 写死，这里只用自己的）
// ======================================================================================
// 淡化＋轻推：旧镜放大淡出，新镜从 0.97 浮出
TRANSITIONS.ffFade = (c, A, B, p, o) => {
  const e = MO.sineInOut(p);
  c.drawImage(A, 0, 0);
  c.save(); c.globalAlpha = e; const s = 0.97 + 0.03 * MO.cubicOut(p); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(B, 0, 0); c.restore();
};
// 颜色流走：旧镜先褪成灰再淡到新镜（「再想想」「长大以后」——暖色记忆褪掉）
TRANSITIONS.ffDrain = (c, A, B, p, o) => {
  const g = clamp(p / 0.6);
  c.save(); c.filter = `grayscale(${g}) brightness(${1 - 0.35 * g})`; c.drawImage(A, 0, 0); c.restore();
  const q = MO.sineInOut(clamp((p - 0.35) / 0.65)); if (q > 0) { c.save(); c.globalAlpha = q; c.drawImage(B, 0, 0); c.restore(); }
};
// 画框揭开：新镜出现在一个圆角「记忆画框」里，画框从 from=[cx,cy,w,h] 长到满屏（全片的签名转场：每个镜头都是一帧记忆）
TRANSITIONS.ffFrame = (c, A, B, p, o) => {
  const [cx, cy, w0, h0] = o.from || [W / 2, H / 2, 300, 200];
  const e = MO.k75(clamp(p));
  const x = lerp(cx, W / 2, e), y = lerp(cy, H / 2, e), w = CAM.zlerp(w0, W + 40, e), h = CAM.zlerp(h0, H + 40, e), r = lerp(Math.min(w0, h0) * 0.12, 0, e);
  c.drawImage(A, 0, 0);
  c.save(); c.fillStyle = `rgba(5,2,20,${0.45 * e})`; c.fillRect(0, 0, W, H); c.restore();
  const b = lerp(14, 0, e);
  c.save(); c.fillStyle = '#fff8ea'; c.globalAlpha = 1 - e * 0.6; c.fill(F.rrc(x, y, w + b * 2, h + b * 2, r + b)); c.restore();
  c.save(); c.clip(F.rrc(x, y, w, h, r)); c.drawImage(B, 0, 0); c.restore();
};
})();
