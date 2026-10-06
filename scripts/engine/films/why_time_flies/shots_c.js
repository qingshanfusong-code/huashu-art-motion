// 镜 9–13：长大以后（365 张一模一样的日历卡「啪」地压成一张）→ 假期悖论 → 三件小事 → 新的一天；另有封面。
(() => {
const W = 1080, H = 1920;
const { clamp, lerp, rng } = U;
const F = FF, C = F.C, E = F.ease, TAU = Math.PI * 2;
const cue = F.cue, glow = F.glow;

// 只有底板、不带图标的一天（图标在镜 9 开头逐个弹出来）
const dayBase = () => F.sprite('daybase', 640, 400, (g, w, h) => {
  g.fillStyle = '#6e6a92'; g.fill(F.rr(0, 0, w, h, 34));
  g.save(); g.clip(F.rr(0, 0, w, h, 34)); g.fillStyle = '#57537a'; g.fillRect(0, 0, w, 86); g.restore();
  g.fillStyle = '#8f8bb0'; for (const x of [130, w - 130]) { g.beginPath(); g.arc(x, 43, 14, 0, TAU); g.fill(); }
  g.fillStyle = '#4a466e'; g.fill(F.rr(30, 112, w - 60, h - 142, 22));
});

// 摞起来的卡：7 档亮度的底板（brightness 0.75–1.0），缓存
const shadeSprite = k => F.sprite('dayshade:' + k, 640, 400, g => { g.filter = `brightness(${0.75 + 0.25 * k / 6})`; g.drawImage(dayBase(), 0, 0); });

// ---------------------------------------------------------------- 镜 9：长大以后 → 合并成一帧 → 回头看只剩一张
// 灰色。一天＝起床、通勤、上班、刷手机；这一天翻倒成俯视，一张张一模一样的卡往上摞到 365 张；
// 「合并成」先往上一提（预备），「一帧」那个字：0.12s 拍扁成一张——闪白、震屏、尘土、×1 盖章。全片的记忆点。
const CARD = { w: 760, x: 540, yFront: 780, base: 1190, tilt: 0.42, step: 2.2 };
SCENES.s09 = { draw: (c, lt, t) => {
  const tGrow = cue('L15', '长大'), tSame = cue('L16', '日子'), tMerge = cue('L16', '合并'), tHit = cue('L16', '一帧');
  const tYear = cue('L17', '一整年'), tThin = cue('L17', '薄薄');
  const ICONT = [cue('L15', '起床'), cue('L15', '通勤'), cue('L15', '上班'), cue('L15', '刷手机')];
  // 震屏：撞击后 0.45s 衰减
  const sh = t > tHit ? Math.exp(-(t - tHit) * 9) * 22 : 0;
  c.save(); c.translate(Math.sin(t * 97) * sh, Math.cos(t * 83) * sh);
  F.bg(c, t, { cols: ['#0b0920', '#1a1838', '#2c2a4e'], dust: 0.7, tint: '#c8c4e0' });
  const outA = 1 - E.in(MO.seg(t, tYear - 0.1, tYear + 0.25));
  F.chip(c, '长大以后', 540, 230, F.pop(t, tGrow, 0.5) * outA, { col: '#a8a4c8', size: 50 });
  // 一天的卡：正面 → 俯视
  const tilt = E.inOut(MO.seg(t, tSame - 0.1, tSame + 0.45));
  const sy = lerp(1, CARD.tilt, tilt), cy = lerp(CARD.yFront, CARD.base, tilt), ch = CARD.w * 400 / 640;
  // 张数：从 1 摞到 365，越来越快
  const grow = E.in(MO.seg(t, tSame + 0.35, tMerge - 0.05));
  const nF = 1 + 364 * grow, n = Math.floor(nF);
  // 拍扁：合并 → 一帧前 0.12s 往上提一下；之后 0.12s 拍到底
  const lift = MO.sineInOut(MO.seg(t, tMerge, tHit - 0.12)), slam = E.in(MO.seg(t, tHit - 0.12, tHit));
  const step = CARD.step * (1 + 0.06 * lift) * (1 - slam) + 0.0;
  const post = t >= tHit;
  // 镜 10 的部分：「一整年」卡片飞到右栏、左栏升起童年的胶片
  const yr = E.inOut(MO.seg(t, tYear - 0.05, tYear + 0.7));
  if (yr < 1) {
    c.save(); c.globalAlpha = 1 - clamp(yr * 2.2);
    // 底下的影子（翻倒成俯视之后才有）
    if (tilt > 0) { c.fillStyle = `rgba(0,0,0,${0.35 * tilt})`; c.beginPath(); c.ellipse(CARD.x, cy + ch * sy * 0.5 + 10, CARD.w * 0.55, 26 * sy + 8, 0, 0, TAU); c.fill(); }
    const count = post ? 1 : n;
    const sp = dayBase(), full = F.dayCardSprite(1);
    for (let k = 0; k < count; k++) {
      const top = k === count - 1;
      let y = cy - k * step;
      if (top && !post && n > 1) y -= (1 - (nF - n)) * 0;          // 新卡落下：用整数摞，不抖
      const shade = 0.75 + 0.25 * ((k * 37) % 7) / 7;
      c.save(); c.translate(CARD.x, y); c.scale(1, sy);
      if (top || count === 1) {
        c.drawImage(tilt > 0.02 || t > ICONT[3] + 0.3 ? full : sp, -CARD.w / 2, -ch / 2, CARD.w, ch);
      } else c.drawImage(shadeSprite(Math.round((shade - 0.75) / 0.25 * 6)), -CARD.w / 2, -ch / 2, CARD.w, ch);   // 预先压暗的 7 档底板（逐张 filter 太慢）
      c.restore();
    }
    // 正面时四件事逐个弹出（之后用带图标的整卡）
    if (tilt <= 0.02 && t <= ICONT[3] + 0.3) {
      F.DAY.forEach((k, i) => { const p = F.pop(t, ICONT[i] - 0.05, 0.35); if (p <= 0) return;
        const x = CARD.x - CARD.w / 2 + 30 * CARD.w / 640 + (CARD.w - 60 * CARD.w / 640) * (i + 0.5) / 4, y = CARD.yFront - ch / 2 + (112 + 129) * CARD.w / 640;
        F.icon(c, k, x, y, 132 * p, t, { gray: 0.85 }); });
    }
    // 循环箭头：「刷手机」之后又回到「起床」
    const lp = E.out(MO.seg(t, ICONT[3] + 0.25, ICONT[3] + 0.8)) * (1 - tilt);
    if (lp > 0) { c.save(); c.strokeStyle = C.grayHi; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath();
      const a0 = 0.15 * Math.PI, a1 = lerp(a0, 0.85 * Math.PI, lp); c.ellipse(CARD.x, CARD.yFront + ch / 2 + 20, 300, 110, 0, a0, a1); c.stroke();
      const ax = CARD.x + 300 * Math.cos(a1), ay = CARD.yFront + ch / 2 + 20 + 110 * Math.sin(a1);
      c.fillStyle = C.grayHi; c.translate(ax, ay); c.rotate(a1 + Math.PI / 2 - 0.3); c.beginPath(); c.moveTo(-6, -22); c.lineTo(22, 0); c.lineTo(-6, 22); c.closePath(); c.fill(); c.restore(); }
    // 张数计数
    if (tilt > 0.5) {
      const topY = cy - (post ? 0 : (n - 1) * step) - ch * sy / 2;
      const cnt = post ? 1 : n;
      if (!post) F.text(c, `×${cnt}`, 990, Math.max(330, topY - 10), { size: 64, fam: 'Poppins-800', color: C.grayHi, align: 'right' });
      const tp = t - tHit;
      if (post) {
        const s = tp < 0.1 ? lerp(2.4, 1, E.in(tp / 0.1)) : 1 + MO.settle(tp - 0.1, 0.08, 3, 6);
        c.save(); c.translate(540, 900); c.rotate(-0.08); c.scale(s, s); c.globalAlpha *= clamp(tp / 0.06);
        c.strokeStyle = C.warm; c.lineWidth = 12; c.stroke(F.rrc(0, 0, 330, 180, 30));
        F.text(c, '×1', 0, 6, { size: 140, fam: 'Poppins-800', color: C.warm }); c.restore();
      }
    }
    // 撞击：冲击环＋尘土
    if (post && t < tHit + 0.9) {
      const q = (t - tHit) / 0.9, r = rng(91);
      c.save(); c.globalAlpha = 1 - q; c.strokeStyle = '#e8e4ff'; c.lineWidth = 10 * (1 - q); c.beginPath(); c.ellipse(CARD.x, CARD.base + 40, 420 + q * 500, 60 + q * 70, 0, 0, TAU); c.stroke();
      for (let i = 0; i < 26; i++) { const dir = r() < 0.5 ? -1 : 1, sp = 300 + r() * 600, x = CARD.x + dir * (CARD.w * 0.4 + q * sp), y = CARD.base + 40 - Math.sin(q * Math.PI) * (40 + r() * 120), s = (10 + r() * 22) * (1 - q * 0.6);
        c.fillStyle = 'rgba(200,196,230,.7)'; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }
      c.restore();
    }
    c.restore();
  }
  // 镜 10：童年的一年 vs 现在的一年
  if (yr > 0) {
    const L = 920;                                          // 左栏胶片长度
    c.save();
    const lx = 300, ly = lerp(1800, 840, yr);
    c.save(); c.beginPath(); c.rect(lx - 200, ly - L / 2, 400, L); c.clip();
    F.strip(c, lx, ly, L, t, { w: 290, frames: F.CHILD, off: (t - tYear) * 60, glowA: 0.15 });
    c.restore();
    // 右栏：那一张（从中间飞过来，变成一格灰画面）；「薄薄一张」时侧过来，只剩一条线
    const rx = lerp(540, 780, yr), ry = lerp(CARD.base, 840, yr), rw = lerp(CARD.w, 300, yr);
    const flip = MO.seg(t, tThin, tThin + 1.0), thin = flip <= 0 ? 1 : flip < 0.3 ? lerp(1, 0.04, E.inOut(flip / 0.3)) : flip < 0.7 ? 0.04 : lerp(0.04, 1, E.inOut((flip - 0.7) / 0.3));
    c.save(); c.translate(rx, ry); c.scale(thin, lerp(CARD.tilt, 1, yr)); F.dayCard(c, 0, 0, rw, t); c.restore();
    // 标签
    const la = F.fadeIn(t, tYear + 0.35, 0.3);
    F.text(c, '小时候的一年', lx, 300, { size: 52, color: C.warm, alpha: la });
    F.text(c, '现在的一年', 780, 300, { size: 52, color: C.grayHi, alpha: la });
    // 长度对比括号
    const bp = E.out(MO.seg(t, cue('L17', '回头看'), cue('L17', '回头看') + 0.6));
    if (bp > 0) { c.strokeStyle = C.warm; c.lineWidth = 6; c.lineCap = 'round'; c.globalAlpha = bp;
      c.beginPath(); c.moveTo(480, 840 - L / 2 * bp); c.lineTo(480, 840 + L / 2 * bp); c.stroke();
      c.strokeStyle = C.grayHi; const hh = 300 * 400 / 640 / 2; c.beginPath(); c.moveTo(960, 840 - hh); c.lineTo(960, 840 + hh); c.stroke(); c.globalAlpha = 1; }
    c.restore();
  }
  F.vignette(c, 0.45);
  c.restore();
  // 闪白（不跟着震）
  if (t >= tHit && t < tHit + 0.3) { c.fillStyle = `rgba(255,255,255,${0.55 * (1 - (t - tHit) / 0.3)})`; c.fillRect(0, 0, W, H); }
}};

// ---------------------------------------------------------------- 镜 11：假期悖论
// 上半「旅行时」：沙漏狂漏、飞机嗖地过去——过得飞快；下半「回头看」：一条塞满画面的胶片长到出画。
// 「因为每一天」：其中一天放大，「都塞满了新画面」：裂成九格。
SCENES.s11 = { draw: (c, lt, t) => {
  F.bg(c, t, { dust: 0.9 });
  const tChip = F.line('L18').t0, tTrip = F.ph('L18', 1).t0, tBack = F.ph('L18', 2).t0, tLong = F.ph('L18', 3).t0, tEach = F.ph('L19', 0).t0, tFull = F.ph('L19', 1).t0;
  F.chip(c, '假期悖论', 540, 230, F.pop(t, tChip, 0.5), { col: C.mag, ink: '#2a0a1a', size: 52 });
  const zoom = E.inOut(MO.seg(t, tEach - 0.1, tEach + 0.5));
  // 开场（「这也解释了假期悖论」）：正中一只行李箱蹦跶，「旅行时」面板出来时缩走
  const sp = F.pop(t, tChip + 0.1, 0.5) * (1 - E.in(MO.seg(t, tTrip - 0.35, tTrip)));
  if (sp > 0) { c.save(); c.translate(540, 820 - Math.abs(Math.sin(t * 4)) * 30); c.scale(sp, sp); glow(c, 0, 0, 340, C.mag, 0.18); F.icon(c, 'suitcase', 0, 0, 380, t); c.restore(); }
  // 上半：旅行时
  const ta = F.pop(t, tTrip - 0.1, 0.5) * (1 - zoom);
  if (ta > 0) {
    c.save(); c.globalAlpha = clamp(ta); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(F.rrc(540, 560, 940, 400, 40));
    F.chip(c, '旅行时', 210, 410, ta, { col: '#e9e6f6', size: 38 });
    const fast = t * 5;
    F.icon(c, 'hourglass', 330, 600, 210, fast);
    const px = 1180 - ((t - tTrip) * 520) % 900;
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { const y = 520 + i * 34; c.beginPath(); c.moveTo(px + 70 + i * 20, y); c.lineTo(px + 220 + i * 30, y); c.stroke(); }
    c.save(); c.beginPath(); c.rect(80, 360, 920, 400); c.clip(); F.icon(c, 'plane', px, 560, 190, t); c.restore();
    F.text(c, '飞快!', 800, 690, { size: 70, fam: 'PuHui-Black', color: C.mag, alpha: F.fadeIn(t, tTrip + 0.6, 0.2) });
    c.restore();
  }
  // 下半：回头看
  const tb = F.pop(t, tBack - 0.1, 0.5);
  if (tb > 0) {
    const y = lerp(1060, 820, zoom);
    c.save(); c.globalAlpha = clamp(tb) * (1 - zoom * 0.6);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(F.rrc(540, 1060, 940, 400, 40) );
    F.chip(c, '回头看', 210, 910, tb * (1 - zoom), { col: C.warm, size: 38 });
    const stretch = E.inOut(MO.seg(t, tLong - 0.1, tLong + 1.0));
    const len = lerp(900, 2600, stretch);
    F.strip(c, 540, y + 40, len, t, { vertical: false, w: 230, frames: F.TRAVEL, off: -(t - tBack) * 40 });
    // 量长度：两头箭头伸出画面
    if (stretch > 0) { const L = lerp(420, 1300, stretch); c.strokeStyle = C.warm; c.fillStyle = C.warm; c.lineWidth = 6; c.beginPath(); c.moveTo(540 - L, y + 200); c.lineTo(540 + L, y + 200); c.stroke();
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(540 + s * L + s * 20, y + 200); c.lineTo(540 + s * L - s * 6, y + 184); c.lineTo(540 + s * L - s * 6, y + 216); c.closePath(); c.fill(); } }
    c.restore();
  }
  // 一天放大，裂成九格新画面
  if (zoom > 0) {
    const w = lerp(260, 840, zoom), h = w * 0.7, cx = 540, cy = lerp(1100, 800, zoom);
    c.save(); c.globalAlpha = clamp(zoom * 2);
    glow(c, cx, cy, w, C.warm, 0.25 * zoom);
    c.fillStyle = '#fff8ea'; c.fill(F.rrc(cx, cy, w + 24, h + 24, 30)); c.fillStyle = '#271a68'; c.fill(F.rrc(cx, cy, w, h, 22));
    // 裂开之前，这一天是一整格画面（山）
    const split = E.out(MO.seg(t, tFull - 0.3, tFull + 0.1));
    if (split < 1) F.frame(c, 'mountain', cx, cy, w, h, t, { live: true, alpha: 1 - split, bw: 0.001 });
    F.text(c, '第 2 天', cx - w / 2 + 20, cy - h / 2 - 50, { size: 44, fam: 'PuHui-Heavy', color: C.warmHi, align: 'left' });
    const r = rng(101);
    for (let i = 0; i < 9; i++) {
      const p = F.pop(t, tFull - 0.25 + i * 0.09 + r() * 0.04, 0.35); if (p <= 0) continue;
      const gx = cx + ((i % 3) - 1) * w / 3, gy = cy + (Math.floor(i / 3) - 1) * h / 3;
      F.frame(c, F.TRAVEL[(i * 3) % F.TRAVEL.length], gx, gy, (w / 3 - 18) * p, (h / 3 - 14) * p, t + i, { live: true });
    }
    c.restore();
  }
  F.vignette(c, 0.4);
}};

// ---------------------------------------------------------------- 镜 12：不是命运，是重复 → 三件小事
// 「不是命运」被划掉；四件事在一个转不停的圈里（生活重复）。
// 「三件小事」：上面一条灰胶片（重复的日子），每说一件，就有一格翻成暖色的新画面；下面三张卡依次滑进来。
const TIPS = [['road', '换一条路回家', 'L22'], ['spark', '每月做一件「第一次」的事', 'L23'], ['note', '每天记一句话', 'L24']];
const SLOTS12 = ['alarm', 'subway', 'laptop', 'phone', 'alarm', 'subway'];
const NEWF = { 1: 'sunset', 3: 'mountain', 5: 'note' };
SCENES.s12 = { draw: (c, lt, t) => {
  F.bg(c, t, { dust: 0.9 });
  const t0 = F.line('L20').t0, tNot = cue('L20', '不是命运'), tFate = cue('L20', '命运'), tRep = cue('L20', '重复'), tWant = F.ph('L21', 0).t0, tThree = cue('L21', '三件');
  const A = 1 - E.inOut(MO.seg(t, tWant - 0.1, tWant + 0.35));
  if (A > 0) {
    c.save(); c.globalAlpha = A;
    const np = F.pop(t, tNot - 0.05, 0.45);
    if (np > 0) { c.save(); c.translate(540, 420); c.scale(np, np); F.text(c, '不是命运', 0, 0, { size: 120, fam: 'PuHui-Black', color: C.dim });
      const sp = E.out(MO.seg(t, tFate + 0.25, tFate + 0.6)); if (sp > 0) { c.strokeStyle = C.mag; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(-270, 6); c.lineTo(-270 + 540 * sp, -4); c.stroke(); } c.restore(); }
    const rp = E.back(MO.seg(t, t0 + 0.2, t0 + 0.8), 1.3);
    if (rp > 0) {
      const R = 230 * rp, cx = 540, cy = 880, rot = t * 0.9;
      c.save(); c.translate(cx, cy);
      c.strokeStyle = 'rgba(168,164,200,.55)'; c.lineWidth = 12; c.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const a0 = rot + k * TAU / 4 + 0.32, a1 = a0 + TAU / 4 - 0.64; c.beginPath(); c.arc(0, 0, R, a0, a1); c.stroke();
        c.save(); c.rotate(a1); c.translate(R, 0); c.fillStyle = 'rgba(168,164,200,.75)'; c.beginPath(); c.moveTo(-18, -6); c.lineTo(18, -6); c.lineTo(0, 22); c.closePath(); c.fill(); c.restore(); }
      F.DAY.forEach((name, k) => { const a = rot + k * TAU / 4; F.frame(c, name, Math.cos(a) * R, Math.sin(a) * R, 180 * rp, 126 * rp, t, { gray: 0.85 }); });
      c.restore();
      const gp = F.pop(t, tRep - 0.1, 0.45);
      if (gp > 0) { c.save(); c.translate(540, 1240); c.scale(gp, gp); F.text(c, '生活重复', 0, 0, { size: 96, fam: 'PuHui-Black', color: C.grayHi }); c.restore(); }
    }
    c.restore();
  }
  const B = E.inOut(MO.seg(t, tWant, tWant + 0.4));
  if (B > 0) {
    c.save(); c.globalAlpha = B;
    F.chip(c, '三件小事', 540, 230, F.pop(t, tThree - 0.1, 0.5), { col: C.warm, ink: '#3a1800', size: 52 });
    // 灰胶片
    c.fillStyle = C.film; c.fillRect(0, 360, W, 170);
    c.fillStyle = 'rgba(255,255,255,.2)'; for (let x = -((t * 30) % 46); x < W; x += 46) { c.fill(F.rr(x, 368, 22, 14, 3)); c.fill(F.rr(x, 508, 22, 14, 3)); }
    SLOTS12.forEach((name, i) => {
      const x = 540 + (i - 2.5) * 176, tipI = [1, 3, 5].indexOf(i);
      const tf = tipI >= 0 ? F.line(TIPS[tipI][2]).t0 + 0.1 : 1e9, fq = clamp((t - tf) / 0.5);
      const sx = fq <= 0 ? 1 : Math.abs(Math.cos(fq * Math.PI)), warm = fq > 0.5;
      c.save(); c.translate(x, 445); c.scale(sx, 1);
      F.frame(c, warm ? NEWF[i] : name, 0, 0, 158, 110, t, { gray: warm ? 0 : 0.85, glowA: warm ? 0.45 : 0, live: warm });
      c.restore();
    });
    // 三张卡
    TIPS.forEach(([icon, text, lid], i) => {
      const ti = F.line(lid).t0 - 0.1, p = E.back(MO.seg(t, ti, ti + 0.45), 1.4); if (p <= 0) return;
      const y = 700 + i * 220, x = lerp(1400, 540, p);
      c.save(); c.translate(x, y + F.alive(t, i, 3));
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(F.rrc(6, 10, 940, 190, 40));
      c.fillStyle = '#231a5a'; c.fill(F.rrc(0, 0, 940, 190, 40)); c.strokeStyle = C.warm; c.lineWidth = 4; c.stroke(F.rrc(0, 0, 940, 190, 40));
      glow(c, -360, 0, 120, C.warm, 0.35); c.fillStyle = '#d8d2f4'; c.beginPath(); c.arc(-360, 0, 72, 0, TAU); c.fill();
      F.icon(c, icon, -360, 0, 118, t);
      F.text(c, text, -260, 4, { size: text.length > 8 ? 50 : 58, fam: 'PuHui-Heavy', color: C.ink, align: 'left' });
      c.restore();
    });
    c.restore();
  }
  F.vignette(c, 0.4);
}};

// ---------------------------------------------------------------- 镜 13：新的一天
// 一帧画面里，太阳在「新的一天」升起来，暖光漫出画框；最后停在评论区问题上。
const sunrise = (c, x, y, w, h, t, p) => {
  c.save(); c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 26); c.clip();
  const sky = [lerp(0, 1, p)];
  const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  const mix = (a, b) => { const A = PAINT.hex(a), B = PAINT.hex(b); return PAINT.rgb([lerp(A[0], B[0], p), lerp(A[1], B[1], p), lerp(A[2], B[2], p)], 1); };
  g.addColorStop(0, mix('#0e0631', '#5b8ef0')); g.addColorStop(0.55, mix('#271a68', '#ffb37a')); g.addColorStop(1, mix('#3a2a7a', '#ffe0a0'));
  c.fillStyle = g; c.fillRect(x - w / 2, y - h / 2, w, h);
  const sy = lerp(y + h * 0.38, y - h * 0.02, p), hz = y + h * 0.18;
  if (p > 0.1) { c.save(); c.translate(x, sy); c.rotate(t * 0.15); c.fillStyle = `rgba(255,236,170,${0.18 * p})`; for (let k = 0; k < 12; k++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -900); c.lineTo(40, -900); c.closePath(); c.fill(); } c.restore(); }
  glow(c, x, sy, 260, '#fff1b8', 0.7 * p + 0.15); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(x, sy, 78, 0, TAU); c.fill();
  c.fillStyle = mix('#1a1250', '#5a4aa0'); c.beginPath(); c.moveTo(x - w / 2, y + h / 2); c.lineTo(x - w / 2, hz); c.quadraticCurveTo(x - w * 0.2, hz - 60, x + w * 0.05, hz + 10); c.quadraticCurveTo(x + w * 0.3, hz - 50, x + w / 2, hz - 10); c.lineTo(x + w / 2, y + h / 2); c.closePath(); c.fill();
  c.fillStyle = mix('#120c3a', '#3a2a7a'); c.beginPath(); c.moveTo(x - w / 2, y + h / 2); c.lineTo(x - w / 2, hz + 80); c.quadraticCurveTo(x, hz + 40, x + w / 2, hz + 90); c.lineTo(x + w / 2, y + h / 2); c.closePath(); c.fill();
  // 鸟
  for (const [bx, by, ph] of [[-0.2, -0.25, 0], [-0.1, -0.3, 1.2], [0.05, -0.22, 2.1]]) { const X = x + bx * w + (t - 80) * 22, Y = y + by * h, f = Math.sin(t * 7 + ph) * 8; c.globalAlpha = p; c.strokeStyle = '#2a1b6e'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(X - 16, Y + f * 0.3); c.quadraticCurveTo(X - 8, Y - 8 - f, X, Y); c.quadraticCurveTo(X + 8, Y - 8 - f, X + 16, Y + f * 0.3); c.stroke(); c.globalAlpha = 1; }
  c.restore();
};
SCENES.s13 = { draw: (c, lt, t) => {
  const tNew = cue('L25', '新的一天'), tEnd = F.end('L25');
  const p = E.inOut(MO.seg(t, tNew - 0.7, tNew + 1.3));
  F.bg(c, t, { cols: ['#090522', '#1d1250', lerp(0, 1, p) > 0.5 ? '#5a2f6e' : '#2a1b68'], dust: 0.8 });
  glow(c, 540, 820, 900, '#ffb35c', 0.32 * p);
  const fw = 840, fh = 600, cy = 800 + F.alive(t, 0, 5);
  glow(c, 540, cy, 700, '#ffe9a8', 0.2 + 0.25 * p);
  c.fillStyle = '#fff8ea'; c.fill(F.rrc(540, cy, fw + 36, fh + 36, 44));
  sunrise(c, 540, cy, fw, fh, t, p);
  TY.charsIn(c, '新的一天', 540, 1240, t - tNew - 0.2, { font: '120px "PuHui-Black"', color: C.warm, dur: 0.5, stagger: 0.09, dy: 30, align: 'center', shadow: { color: 'rgba(6,3,24,.5)', y: 8 } });
  // 结尾：评论区问题
  const qa = F.fadeIn(t, tEnd + 0.45, 0.4);
  if (qa > 0) { c.save(); c.globalAlpha = qa; c.fillStyle = 'rgba(8,4,28,.62)'; c.fill(F.rrc(540, F.SUB_Y, 960, 104, 52));
    F.text(c, '你觉得人生中哪一年过得最慢？', 540, F.SUB_Y + 2, { size: 54, color: C.ink, shadow: false });
    F.text(c, '评论区聊聊', 540, F.SUB_Y + 100, { size: 40, fam: 'PuHui-Bold', color: C.dim }); c.restore(); }
  F.vignette(c, 0.35);
}};

// ---------------------------------------------------------------- 封面（render.py --solo cover --stills 0.5）
// 封面字「为什么长大后，一年越来越短？」；左边童年的长胶片、右边现在只剩一张灰卡。字放在 3:4 安全区（y 240–1680）里。
SCENES.cover = { draw: (c, lt) => {
  const t = 3.3;
  F.bg(c, t, { dust: 1 });
  glow(c, 300, 1000, 700, '#ff9a4a', 0.18);
  F.text(c, '为什么长大后，', 540, 400, { size: 118, fam: 'PuHui-Black', color: C.ink });
  F.text(c, '一年越来越短？', 540, 560, { size: 128, fam: 'PuHui-Black', color: C.warm });
  c.save(); c.beginPath(); c.rect(80, 700, 460, 900); c.clip(); F.strip(c, 310, 1150, 900, t, { w: 300, frames: F.CHILD, off: 30, glowA: 0.2 }); c.restore();
  F.text(c, '小时候的一年', 310, 1650, { size: 50, color: C.warm });
  F.dayCard(c, 790, 1150, 330, t);
  F.text(c, '现在的一年', 790, 1650, { size: 50, color: C.grayHi });
  c.strokeStyle = C.warm; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(500, 700); c.lineTo(500, 1600); c.stroke();
  c.strokeStyle = C.grayHi; c.beginPath(); c.moveTo(985, 1047); c.lineTo(985, 1253); c.stroke();
  F.vignette(c, 0.35);
}};
})();
