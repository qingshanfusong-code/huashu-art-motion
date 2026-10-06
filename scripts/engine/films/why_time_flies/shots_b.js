// 镜 5–8：① 比例理论（饼图 1/5 → 1/30 → 1/60，形变成胶片盘）→ ② 记忆密度 → 大脑翻画面 → 小时候到处都是第一次。
(() => {
const W = 1080, H = 1920;
const { clamp, lerp, rng } = U;
const F = FF, C = F.C, E = F.ease, TAU = Math.PI * 2;
const cue = F.cue, glow = F.glow;

// ---------------------------------------------------------------- 镜 5：比例理论 → 记忆密度
// 一个饼＝你到目前为止的人生，切成「年龄」份，暖黄那一块＝这一年。年龄滚动时份数连续增加，那一块越来越细（3b1b：一个对象一直在形变，不切）。
// 「但更关键的」起：饼的分割线收掉、变成一卷胶片盘，胶片从盘里拉出来，「记忆密度」砸进来。
const PIE = { x: 540, y: 820, R: 300 };
const ageAt = t => {
  const a5 = cue('L08', '五岁'), a30 = cue('L09', '三十岁'), a60 = cue('L10', '分母');
  if (t < a30 - 0.1) return 5;
  if (t < a60) return lerp(5, 30, E.inOut(MO.seg(t, a30 - 0.1, a30 + 0.8)));
  return lerp(30, 60, E.inOut(MO.seg(t, a60, F.end('L10') - 0.3)));
};
SCENES.s05 = { draw: (c, lt, t) => {
  F.bg(c, t, { dust: 0.9 });
  const tChip = cue('L07', '比例'), tPie = F.line('L07').t0, t5 = cue('L08', '五岁'), tYear = cue('L08', '一年'), tFrac = cue('L08', '五分之一');
  const tMore = cue('L11', '更关键'), tSecond = cue('L11', '第二种'), tMD = cue('L11', '记忆密度');
  const morph = E.inOut(MO.seg(t, tMore, tMore + 0.9));          // 饼 → 胶片盘
  const age = ageAt(t);
  // 章节标签：① 比例理论 → ② 记忆密度（旧的缩走，新的弹出）
  const out1 = 1 - E.in(MO.seg(t, tSecond - 0.2, tSecond + 0.1));
  F.chip(c, '比例理论', 540, 230, F.pop(t, tChip, 0.5) * out1, { col: C.cyan, num: '1', size: 54 });
  F.chip(c, '记忆密度', 540, 230, F.pop(t, tSecond + 0.05, 0.5), { col: C.warm, num: '2', size: 54 });
  const cam = { x: W / 2, y: H / 2, z: 1 + 0.004 * (t - tPie) };
  CAM.with(c, cam, g => {
    const ap = E.back(MO.seg(t, tPie + 0.3, tPie + 0.9), 1.3), R = PIE.R * lerp(1, 0.85, morph), cx = PIE.x, cy = lerp(PIE.y, 700, morph);
    if (ap <= 0) return;
    // 待机：饼轻轻呼吸、缓慢摆动（画面不停），变成胶片盘后转起来
    const br = 1 + 0.012 * Math.sin(t * 2.4);
    g.save(); g.translate(cx, cy + Math.sin(t * 1.3) * 6); g.scale(ap * br, ap * br); g.rotate(Math.sin(t * 0.7) * 0.04 + morph * (t - tMore) * 2.2);
    glow(g, 0, 0, R * 1.5, lerp(0, 1, morph) > 0.5 ? C.warm : C.cyan, 0.16);
    // 饼身：青色→胶片深色
    const body = TOON.circle(0, 0, R);
    TOON.flat(g, body, morph > 0.5 ? C.film : '#2a8fd8', morph > 0.5 ? '#0a0720' : '#1d5fa8', morph > 0.5 ? C.filmHi : '#5fb8f0', [12, 14], [4, 5]);
    // 这一年：暖色扇形（角度 2π/年龄）
    const yp = E.out(MO.seg(t, tYear - 0.1, tYear + 0.5)) * (1 - morph);
    if (yp > 0) {
      const a = TAU / age * yp;
      g.save(); glow(g, Math.cos(-Math.PI / 2 + a / 2) * R * 0.5, Math.sin(-Math.PI / 2 + a / 2) * R * 0.5, R * 0.7, C.warm, 0.35 * yp);
      g.fillStyle = C.warm; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R + 10 * yp, -Math.PI / 2, -Math.PI / 2 + a); g.closePath(); g.fill(); g.restore();
    }
    // 分割线：floor(age) 条，从「五岁」开始一条条画出
    const dp = E.out(MO.seg(t, t5, t5 + 0.6)) * (1 - morph);
    if (dp > 0) {
      const n = Math.floor(age + 1e-6), fr = age - n;
      g.strokeStyle = 'rgba(10,6,40,.75)'; g.lineCap = 'round';
      for (let i = 0; i < n + (fr > 0 ? 1 : 0); i++) {
        const a = -Math.PI / 2 + TAU * i / age; if (i > 0 && TAU * i / age > TAU - 0.02) continue;
        g.globalAlpha = dp * (i === n ? fr : 1); g.lineWidth = lerp(6, 2.5, clamp((age - 5) / 40));
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * clamp(dp * 1.4 - i * 0.03), Math.sin(a) * R * clamp(dp * 1.4 - i * 0.03)); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // 胶片盘：六个孔＋中轴
    if (morph > 0) {
      g.globalAlpha = morph;
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.fillStyle = '#05031a'; g.beginPath(); g.arc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.17, 0, TAU); g.fill(); }
      g.fillStyle = C.filmHi; g.beginPath(); g.arc(0, 0, R * 0.14, 0, TAU); g.fill(); g.fillStyle = C.warm; g.beginPath(); g.arc(0, 0, R * 0.06, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; for (const rr of [0.82, 0.9, 0.96]) { g.beginPath(); g.arc(0, 0, R * rr, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.restore();
    // 胶片从盘底拉出，向右下方伸出画面，满是暖色画格
    const pull = E.out(MO.seg(t, tMore + 0.5, tMD + 0.3));
    if (pull > 0) {
      g.save(); g.translate(cx + R * 0.2, cy + R * 0.98); g.rotate(-0.08);
      const len = 1400 * pull; g.translate(len / 2 - 40, 0);
      g.save(); g.beginPath(); g.rect(-len / 2, -200, len, 400); g.clip();
      F.strip(g, 0, 0, 1500, t, { vertical: false, w: 230, frames: F.CHILD, off: -(t - tMore) * 120 + 700 - len / 2 });
      g.restore(); g.restore();
    }
  });
  // 年龄与分数（屏幕层，不随相机）
  const lab = F.pop(t, t5, 0.5) * (1 - E.in(MO.seg(t, tMore, tMore + 0.35)));
  if (lab > 0) {
    c.save(); c.translate(540, 410); c.scale(lab, lab);
    const ai = Math.round(age);
    F.text(c, String(ai), -24, 0, { size: 120, fam: 'Poppins-800', color: C.ink, align: 'right' });
    F.text(c, '岁', -6, 16, { size: 64, color: C.dim, align: 'left' });
    c.restore();
  }
  const fp = F.pop(t, tFrac, 0.5) * (1 - E.in(MO.seg(t, tMore, tMore + 0.35)));
  if (fp > 0) {
    const den = Math.round(age);
    c.save(); c.translate(540, 1250); c.scale(fp, fp);
    // 分数 1/N：「分母越大」时分母下面划线、标「分母」
    F.text(c, '1', -70, -4, { size: 116, fam: 'Poppins-800', color: C.warm, align: 'right' });
    F.text(c, '/', -46, -4, { size: 116, fam: 'Poppins-800', color: C.warm });
    F.text(c, String(den), -20, -4, { size: 116, fam: 'Poppins-800', color: C.warm, align: 'left' });
    const pct = 100 / age;
    F.text(c, `≈ ${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`, 260, 4, { size: 54, fam: 'Poppins-700', color: C.dim, align: 'left' });
    const up = E.out(MO.seg(t, cue('L10', '分母'), cue('L10', '分母') + 0.4));
    if (up > 0) { c.save(); c.globalAlpha = up; c.strokeStyle = C.cyan; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(-20, 62); c.lineTo(-20 + 170 * up, 62); c.stroke();
      F.text(c, '分母', 65, 112, { size: 40, fam: 'PuHui-Heavy', color: C.cyan }); c.restore(); }
    c.restore();
  }
  // 「记忆密度」砸进来（这一短句不出字幕）
  const sl = t - tMD;
  if (sl > -0.05) {
    const s = sl < 0.12 ? lerp(2.2, 1, E.in(sl / 0.12)) : 1 + MO.settle(sl - 0.12, 0.06, 3, 6);
    c.save(); c.translate(540, 1300); c.scale(s, s); c.globalAlpha = clamp((sl + 0.05) / 0.08);
    glow(c, 0, 0, 380, C.warm, 0.25); F.text(c, '记忆密度', 0, 0, { size: 140, fam: 'PuHui-Black', color: C.warm, track: 8 }); c.restore();
  }
  F.vignette(c, 0.4);
}};

// ---------------------------------------------------------------- 镜 7：大脑靠「翻出多少画面」判断时间长短
// 大脑团子；「回忆时」画面从脑子里一张张飞出来排好，计数跳；下面「感觉时长」的条跟着画面数一起变长。
const SLOTS = (() => { const o = []; for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) o.push([140 + k * 200, 930 + r * 130]); return o; })();
SCENES.s07 = { draw: (c, lt, t) => {
  F.bg(c, t, { dust: 0.9 });
  const t0 = F.line('L12').t0, tJudge = cue('L12', '判断'), tRecall = cue('L12', '回忆'), tMany = cue('L12', '多少画面');
  F.chip(c, '科学家认为', 540, 230, F.pop(t, t0, 0.5), { col: '#e9e6f6', size: 44 });
  const look = Math.sin(t * 0.9) * 0.4 + (t > tRecall ? 0.5 : 0);
  const bp = E.back(MO.seg(t, t0 - 0.15, t0 + 0.45), 1.5);
  if (bp > 0) F.brain(c, 540, 560, 0.95 * bp, t, { look, glowA: 0.28 });
  // 「判断时间长短」：脑袋边上的小钟和问号
  const jp = F.pop(t, tJudge, 0.45) * (1 - E.in(MO.seg(t, tRecall, tRecall + 0.3)));
  if (jp > 0) { c.save(); c.translate(860, 430 + F.alive(t, 2, 6)); c.scale(jp, jp); F.icon(c, 'hourglass', 0, 0, 130, t); F.text(c, '?', 74, -50, { size: 70, fam: 'PuHui-Black', color: C.cyan }); c.restore(); }
  // 画面一张张飞出：回忆时开始，「多少画面」时加速
  const nAt = tt => tt < tRecall ? 0 : tt < tMany ? (tt - tRecall) * 2.6 : (tMany - tRecall) * 2.6 + (tt - tMany) * 9;
  const n = Math.min(SLOTS.length, nAt(t));
  const r = rng(41);
  SLOTS.forEach(([sx, sy], i) => {
    // 第 i 张出发的时刻（nAt 的反函数）
    const nm = (tMany - tRecall) * 2.6, ti = i < nm ? tRecall + i / 2.6 : tMany + (i - nm) / 9;
    const q = clamp((t - ti) / 0.5); if (q <= 0) return;
    const e = E.out(q), name = F.CHILD[(i * 5 + 3) % F.CHILD.length];
    const x = lerp(540, sx, e), y = lerp(600, sy, e) - Math.sin(Math.PI * e) * 120, s = lerp(0.2, 1, e);
    c.save(); c.translate(x, y); c.rotate((1 - e) * (r() - 0.5) * 2); F.frame(c, name, 0, 0, 170 * s, 119 * s, t, { glowA: 0.25 * (1 - q) }); c.restore();
  });
  // 计数＋感觉时长条
  const gp = F.fadeIn(t, tRecall - 0.2, 0.4);
  if (gp > 0) {
    c.save(); c.globalAlpha = gp;
    F.text(c, `画面 × ${Math.floor(n)}`, 540, 845, { size: 46, fam: 'PuHui-Heavy', color: C.warm });
    F.text(c, '感觉时长', 120, 1300, { size: 40, fam: 'PuHui-Bold', color: C.dim, align: 'left' });
    c.fillStyle = 'rgba(255,255,255,.1)'; c.fill(F.rr(300, 1282, 660, 36, 18));
    const L = 660 * clamp(n / SLOTS.length); if (L > 2) { glow(c, 300 + L, 1300, 60, C.cyan, 0.5); c.fillStyle = C.cyan; c.fill(F.rr(300, 1282, Math.max(36, L), 36, 18)); }
    c.restore();
  }
  F.vignette(c, 0.4);
}};

// ---------------------------------------------------------------- 镜 8：小时候到处都是第一次
// 「第一次游泳 / 看海 / 坐公交」：一张大画面弹到正中，上一张缩成缩略图排到上面；
// 「记忆胶片，密密麻麻」：整面墙的小画面一口气铺满。暖色。
const FIRSTS = [['swim', '第一次游泳', 1], ['sea', '第一次看海', 2], ['bus', '第一次坐公交', 3]];   // 第三项＝L13 的第几个短句
const WALL = (() => { const r = rng(57), o = []; const pool = [...F.CHILD, ...F.TRAVEL.slice(0, 4)];
  for (let row = 0; row < 8; row++) for (let k = 0; k < 6; k++) o.push({ x: 105 + k * 174, y: 360 + row * 128, name: pool[(row * 7 + k * 3) % pool.length], d: r() * 0.9, ph: r() * TAU }); return o; })();
SCENES.s08 = { draw: (c, lt, t) => {
  F.bg(c, t, { cols: ['#120a3a', '#2a1660', '#4a2a7a'], dust: 1, tint: '#ffe9a8' });
  glow(c, 540, 900, 900, '#ff9a4a', 0.12);
  const t0 = F.line('L13').t0, tWall = cue('L14', '记忆'), tDense = cue('L14', '密密');
  F.chip(c, '小时候', 540, 230, F.pop(t, t0, 0.5) * (1 - E.in(MO.seg(t, tWall - 0.2, tWall + 0.1))), { col: C.warm, size: 50 });
  // 开场：四周冒出「第一次！」小星
  const r = rng(61);
  for (let i = 0; i < 9; i++) {
    const ti = t0 + 0.15 + i * 0.18, x = 140 + r() * 800, y = 420 + r() * 820, q = clamp((t - ti) / 1.6);
    if (q <= 0 || q >= 1 || t > tWall) continue;
    c.save(); c.globalAlpha = Math.sin(Math.PI * q); c.translate(x, y - q * 40); c.scale(0.5 + 0.5 * MO.backOut(clamp(q * 4), 2), 0.5 + 0.5 * MO.backOut(clamp(q * 4), 2)); F.icon(c, 'spark', 0, 0, 110, t + i); c.restore();
  }
  // 三个「第一次」
  const wallP = E.inOut(MO.seg(t, tWall - 0.1, tWall + 0.6));
  FIRSTS.forEach(([name, label, k], i) => {
    const ti = F.ph('L13', k).t0 - 0.12, nextT = i < 2 ? F.ph('L13', FIRSTS[i + 1][2]).t0 - 0.12 : tWall;
    const p = F.pop(t, ti, 0.5); if (p <= 0) return;
    const go = E.inOut(MO.seg(t, nextT - 0.1, nextT + 0.35));           // 缩成缩略图，排到上面
    const x = lerp(540, 220 + i * 320, go), y = lerp(800, 400, go), w = lerp(760, 280, go) * p;
    const a = 1 - wallP;
    if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    F.frame(c, name, x, y + F.alive(t, i, 6) * (1 - go), w, w * 0.7, t, { live: true, glowA: 0.35 * (1 - go) });
    // 标签：第一次 XX
    const lp = F.pop(t, ti + 0.12, 0.4) * (1 - go);
    if (lp > 0) { c.save(); c.translate(x, y + w * 0.35 + 80); c.scale(lp, lp); c.fillStyle = C.warm; c.fill(F.rrc(0, 0, 420, 100, 50)); F.text(c, label, 0, 4, { size: 54, color: '#4a1a00', shadow: false }); c.restore(); }
    c.restore();
  });
  // 记忆胶片墙：铺满，「密密麻麻」时再铺第二层更小的，整体缓缓上漂
  if (wallP > 0) {
    const drift = (t - tWall) * 14;
    for (const w of WALL) {
      const q = E.back(clamp((t - tWall - w.d * 0.7) / 0.35), 1.8); if (q <= 0) continue;
      F.frame(c, w.name, w.x, w.y - drift + Math.sin(t * 2 + w.ph) * 3, 160 * q, 112 * q, t, { glowA: 0.12 });
    }
    const dense = clamp((t - tDense) / 0.6);
    if (dense > 0) { const r2 = rng(71); const pool = F.CHILD;
      for (let i = 0; i < 70; i++) { const x = 60 + r2() * 960, y = 300 + r2() * 1050 - drift * 1.3, d = r2(); const q = E.back(clamp((t - tDense - d * 0.6) / 0.3), 2);
        if (q > 0) F.frame(c, pool[i % pool.length], x, y, 92 * q, 64 * q, t, { glowA: 0.1 }); } }
    // 计数：密密麻麻
    const cp = F.pop(t, tDense + 0.15, 0.4);
    if (cp > 0) { c.save(); c.translate(540, 230); c.scale(cp, cp); c.fillStyle = 'rgba(12,6,40,.75)'; c.fill(F.rrc(0, 0, 520, 110, 55)); F.text(c, '画面 × 数不清', 0, 4, { size: 56, color: C.warm, shadow: false }); c.restore(); }
  }
  F.vignette(c, 0.4);
}};
})();
