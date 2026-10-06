// 镜 1–4：暑假 → 今年 3 月 → 2026 只剩不到 90 天 → 问题。时间一律用全片时间 t，动作挂在口播的字上（F.cue）。
(() => {
const W = 1080, H = 1920;
const { clamp, lerp, rng } = U;
const F = FF, C = F.C, E = F.ease, TAU = Math.PI * 2;
const cue = F.cue, glow = F.glow;

// ---------------------------------------------------------------- 镜 1：一个暑假有多长
// 黄昏天空、落日；一条斜着的暖色胶片从上往下流，满满的夏天；「一个暑假」时一把量尺伸出画面两头——长到量不完。
const S1 = { strip: { x: 600, y: 900, ang: -0.14, w: 470 } };
const FIRE = (() => { const r = rng(17), o = []; for (let i = 0; i < 26; i++) o.push({ x: r() * W, y: 700 + r() * 900, ph: r() * TAU, s: 2 + r() * 3 }); return o; })();
SCENES.s01 = { draw: (c, lt, t) => {
  c.fillStyle = TOON.vgrad(c, 0, H, ['#160c46', '#3d1f78', '#a5397e', '#ff7a59', '#ffb347']); c.fillRect(0, 0, W, H);
  const cam = { x: W / 2, y: H / 2 + 20 * Math.sin(t * 0.5), z: 1.0 + 0.02 * t };
  // 远：落日＋云带
  CAM.layer(c, cam, 0.15, g => { glow(g, 330, 1260, 520, '#ffe9a8', 0.55); g.fillStyle = '#fff1c4'; g.beginPath(); g.arc(330, 1270, 170, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,190,150,.35)'; for (const [x, y, w] of [[200, 980, 300], [760, 1080, 380], [420, 1150, 260]]) g.fill(F.rrc(x + Math.sin(t * 0.3 + x) * 20, y, w, 16, 8)); });
  CAM.layer(c, cam, 0.4, g => { g.fillStyle = '#5a2a6e'; g.fill(U.poly([[-200, 1500], [-200, 1330], [120, 1250], [420, 1320], [760, 1230], [1300, 1310], [1300, 1500]]));
    g.fillStyle = '#3a1a5a'; g.fill(U.poly([[-200, 2200], [-200, 1420], [300, 1370], [700, 1430], [1300, 1380], [1300, 2200]])); });
  // 萤火
  for (const f of FIRE) { const x = f.x + Math.sin(t * 0.9 + f.ph) * 26, y = f.y - (t * 18 + f.ph * 30) % 160, a = 0.5 + 0.5 * Math.sin(t * 3 + f.ph); glow(c, x, y, f.s * 6, '#fff3a0', 0.5 * a); c.fillStyle = '#fffbd8'; c.beginPath(); c.arc(x, y, f.s * 0.8, 0, TAU); c.fill(); }
  // 主体：胶片
  CAM.with(c, cam, g => {
    const s = S1.strip; g.save(); g.translate(s.x, s.y); g.rotate(s.ang);
    g.shadowColor = 'rgba(20,6,40,.45)'; g.shadowBlur = 40; g.shadowOffsetX = 18; g.fillStyle = C.film; g.fillRect(-s.w / 2, -1300, s.w, 2600); g.shadowColor = 'transparent';
    F.strip(g, 0, 0, 2600, t, { w: s.w, frames: F.SUMMER, off: t * 170 + 40, alphaFrame: 0 });
    // 只有画面里那几格是活的：逐格画（缓存版图标静止，这里覆盖成会动的）
    const fw = s.w * 0.74, fh = fw * 0.7, pitch = fh * 1.16, off = t * 170 + 40;
    for (let i = Math.floor((-1100 - off) / pitch); i <= Math.ceil((1100 - off) / pitch); i++) {
      const name = F.SUMMER[((i % 12) + 12) % 12]; F.frame(g, name, 0, i * pitch + off, fw, fh, t + i * 0.37, { live: true, bw: 0.035 });
    }
    g.restore();
    // 量尺：「一个暑假」那一刻从胶片中段往上下两头伸出画面
    const q = E.out(MO.seg(t, cue('L01', '一个暑假') - 0.1, cue('L01', '一个暑假') + 1.1));
    if (q > 0) {
      g.save(); g.translate(s.x, s.y); g.rotate(s.ang); g.translate(s.w / 2 + 70, 0);
      const L = 1400 * q;
      g.strokeStyle = C.warmHi; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -L); g.lineTo(0, L); g.stroke();
      for (let k = -30; k <= 30; k++) { const y = k * 46; if (Math.abs(y) > L) continue; g.lineWidth = k % 5 ? 3 : 5; g.beginPath(); g.moveTo(0, y); g.lineTo(k % 5 ? 16 : 30, y); g.stroke(); }
      for (const sg of [-1, 1]) { const y = sg * L; g.fillStyle = C.warmHi; g.beginPath(); g.moveTo(-16, y - sg * 4); g.lineTo(16, y - sg * 4); g.lineTo(0, y + sg * 22); g.closePath(); g.fill(); }
      g.restore();
    }
  });
  // 标签：一个暑假（量尺中段，弹出）
  const lp = F.pop(t, cue('L01', '一个暑假') + 0.15, 0.5);
  if (lp > 0) { c.save(); c.translate(215, 760 + F.alive(t, 0, 6)); c.rotate(-0.14); c.scale(lp, lp);
    c.fillStyle = 'rgba(30,10,50,.35)'; c.fill(F.rrc(6, 10, 290, 104, 52)); c.fillStyle = C.warm; c.fill(F.rrc(0, 0, 290, 104, 52));
    F.text(c, '一个暑假', 0, 4, { size: 54, color: '#4a1a00', shadow: false }); c.restore(); }
  F.vignette(c, 0.35);
}};

// ---------------------------------------------------------------- 镜 2：今年 3 月份，你都做了些什么
// 灰冷色；一页 2026 年 3 月的日历升起来，31 格全是空的；放大镜扫过去，什么都没有；问号弹出。
const MAR = { x: 540, y: 820, w: 900, h: 900 };
SCENES.s02 = { draw: (c, lt, t) => {
  F.bg(c, t, { cols: ['#0b0826', '#191444', '#2a2560'], dust: 0.8 });
  const t0 = F.line('L02').t0 - 0.2;
  const up = E.out(MO.seg(t, t0, t0 + 0.6)), settle = MO.settle(t - t0 - 0.35, 0.03, 2.2, 4);
  const cam = { x: W / 2, y: H / 2, z: 1 + 0.012 * (t - t0) };
  CAM.with(c, cam, g => {
    g.save(); g.translate(MAR.x, MAR.y + (1 - up) * 700); g.rotate(-0.05 * (1 - up) + settle);
    const { w, h } = MAR;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(F.rrc(12, 22, w, h, 40));
    g.fillStyle = '#e9e6f6'; g.fill(F.rrc(0, 0, w, h, 40));
    // 表头：3 月份那一刻表头的「3月」跳一下
    g.save(); g.clip(F.rrc(0, 0, w, h, 40)); g.fillStyle = '#6e6a92'; g.fillRect(-w / 2, -h / 2, w, 170); g.restore();
    for (const x of [-250, 250]) { g.fillStyle = '#e9e6f6'; g.beginPath(); g.arc(x, -h / 2 + 30, 18, 0, TAU); g.fill(); g.fillStyle = '#3e3a5e'; g.fill(F.rrc(x, -h / 2 + 4, 14, 52, 7)); }
    const hp = F.pop(t, cue('L02', '三月份'), 0.5), hs = 1 + 0.12 * Math.sin(Math.PI * clamp((t - cue('L02', '三月份')) / 0.5));
    g.save(); g.translate(0, -h / 2 + 100); g.scale(hs, hs);
    F.text(g, '2026', -150, 0, { size: 50, fam: 'Poppins-700', color: '#d8d4ee', shadow: false });
    F.text(g, '3月', 90, 0, { size: 84, color: '#ffffff', shadow: false });
    g.restore();
    // 星期
    const wk = '日一二三四五六', cw = (w - 80) / 7, gx = -w / 2 + 40, gy = -h / 2 + 200;
    [...wk].forEach((d, i) => F.text(g, d, gx + cw * (i + 0.5), gy + 18, { size: 34, fam: 'PuHui-Bold', color: '#8a86a8', shadow: false }));
    // 31 天：2026-03-01 是星期日
    const r = rng(23);
    for (let d = 0; d < 31; d++) {
      const col = d % 7, row = Math.floor(d / 7), x = gx + cw * (col + 0.5), y = gy + 100 + row * 122;
      const ap = clamp((t - t0 - 0.35 - d * 0.012) / 0.25);
      g.globalAlpha = ap; g.fillStyle = '#d6d2e8'; g.fill(F.rrc(x, y + 10, cw - 16, 108, 16));
      F.text(g, String(d + 1), x - cw / 2 + 26, y - 26, { size: 26, fam: 'Poppins-600', color: '#9a96b8', align: 'left', shadow: false });
      // 格子里本该有画面——一片空白（淡淡的虚线框）
      g.setLineDash([8, 8]); g.strokeStyle = 'rgba(120,116,160,.35)'; g.lineWidth = 3; g.stroke(F.rrc(x, y + 18, cw - 44, 66, 10)); g.setLineDash([]);
      g.globalAlpha = 1;
    }
    // 放大镜：「你都做了些什么」扫过几格，镜下也是空的，冒出问号
    const ms = cue('L02', '你都做了'), mq = MO.seg(t, ms - 0.2, ms + 1.3);
    if (mq > 0) {
      const path = [[gx + cw * 1.5, gy + 222], [gx + cw * 4.5, gy + 344], [gx + cw * 2.5, gy + 466], [gx + cw * 5.5, gy + 588]];
      const k = MO.sineInOut(mq) * (path.length - 1), i0 = Math.min(path.length - 2, Math.floor(k)), f = k - i0;
      const mx = lerp(path[i0][0], path[i0 + 1][0], f), my = lerp(path[i0][1], path[i0 + 1][1], f);
      g.save(); g.globalAlpha = clamp(mq * 6);
      g.save(); g.beginPath(); g.arc(mx, my, 82, 0, TAU); g.clip(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(mx - 90, my - 90, 180, 180);
      F.text(g, '?', mx, my + 4, { size: 92, fam: 'PuHui-Black', color: '#a8a4c8', shadow: false }); g.restore();
      g.strokeStyle = '#3e3a5e'; g.lineWidth = 16; g.beginPath(); g.arc(mx, my, 82, 0, TAU); g.stroke();
      g.lineCap = 'round'; g.lineWidth = 26; g.beginPath(); g.moveTo(mx + 62, my + 62); g.lineTo(mx + 130, my + 130); g.stroke();
      g.restore();
    }
    g.restore();
  });
  // 大问号：句尾落下
  const qp = F.pop(t, cue('L02', '什么'), 0.55);
  if (qp > 0) { c.save(); c.translate(860, 300 + F.alive(t, 1, 8)); c.rotate(0.12); c.scale(qp, qp); glow(c, 0, 0, 200, '#a8a4c8', 0.35); F.text(c, '?', 0, 0, { size: 260, fam: 'PuHui-Black', color: '#ffffff' }); c.restore(); }
  F.vignette(c, 0.45);
}};

// ---------------------------------------------------------------- 镜 3：2026 年，只剩不到 90 天
// 365 个点＝今年的 365 天。先全亮（暖），「只剩不到 90 天」时已经过去的点一路灭成灰；「就过完了」剩下的也一口气灭掉。
const DOTS = { cols: 21, sp: 41, r: 14, x0: 540 - 20 * 41 / 2, y0: 500 };
const TODAY = 278;                                          // 10 月 6 日＝第 279 天（从 0 数是 278）；文案只说「不到 90 天」
const dotXY = d => [DOTS.x0 + (d % DOTS.cols) * DOTS.sp, DOTS.y0 + Math.floor(d / DOTS.cols) * DOTS.sp];
SCENES.s03 = { draw: (c, lt, t) => {
  F.bg(c, t, { dust: 0.9 });
  const t0 = F.line('L03').t0 - 0.2, tGone = cue('L03', '只剩'), tEnd = cue('L04', '就过完'), tPush = cue('L04', '是不是');
  // 相机：「是不是觉得」起慢慢推近灰掉的那一片
  const pk = E.inOut(MO.seg(t, tPush, tEnd + 0.4));
  const cam = { x: lerp(540, 490, pk), y: lerp(860, 810, pk), z: lerp(1.0, 1.06, pk) + 0.004 * (t - t0) };   // 推近也不压进字幕带（网格底 y≈1200）
  // 年份：2026（打出来）
  const yp = F.pop(t, cue('L03', '二零二六'), 0.5);
  if (yp > 0) { c.save(); c.translate(540, 300); c.scale(yp, yp); F.text(c, '2026', 0, 0, { size: 170, fam: 'Poppins-800', color: C.ink, track: 6 }); c.restore(); }
  // 进度条：跟点同步
  const goneP = E.inOut(MO.seg(t, tGone, tGone + 1.3)), endP = E.in(MO.seg(t, tEnd, tEnd + 0.75));
  const frac = lerp(lerp(0, (TODAY + 1) / 365, goneP), 1, endP);
  const ba = F.fadeIn(t, t0 + 0.4, 0.4);
  if (ba > 0) { c.save(); c.globalAlpha = ba; c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(F.rrc(540, 420, 820, 22, 11));
    c.fillStyle = C.gray; c.fill(F.rr(130, 409, Math.max(22, 820 * frac), 22, 11));
    c.fillStyle = C.warm; if (frac < 1) c.fill(F.rr(130 + 820 * frac, 409, 820 * (1 - frac), 22, 11)); c.restore(); }
  CAM.with(c, cam, g => {
    for (let d = 0; d < 365; d++) {
      const [x, y] = dotXY(d);
      const ap = E.back(clamp((t - t0 - 0.25 - d * 0.0016) / 0.35));
      if (ap <= 0) continue;
      // 灭掉的时刻：已过去的天按顺序扫过；剩下的在「就过完了」一口气灭
      const td = d <= TODAY ? tGone + 1.3 * (d / TODAY) : tEnd + 0.75 * ((d - TODAY) / (364 - TODAY));
      const gq = clamp((t - td) / 0.18), warmA = 1 - gq;
      const pulse = 1 + (warmA > 0 && d > TODAY ? 0.08 * Math.sin(t * 5 - d * 0.3) * clamp((t - tGone - 1.3) / 0.3) : 0);
      const r = DOTS.r * ap * pulse * (1 - 0.12 * gq);
      if (warmA > 0.02) glow(g, x, y, r * 2.4, C.warm, 0.22 * warmA);
      g.fillStyle = warmA > 0.5 ? C.warm : C.gray2; g.globalAlpha = 1;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (warmA > 0 && warmA < 1) { g.globalAlpha = warmA; g.fillStyle = C.warmHi; g.beginPath(); g.arc(x, y, r * 0.6, 0, TAU); g.fill(); g.globalAlpha = 1; }
    }
    // 「今天」小旗：灭到今天时插上
    const fp = F.pop(t, tGone + 1.35, 0.4);
    if (fp > 0) {
      const dd = Math.round(lerp(TODAY, 364, endP)), [x, y] = dotXY(dd);
      g.save(); g.translate(x, y - 28); g.scale(fp, fp);
      g.fillStyle = C.ink; g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -18); g.lineTo(12, -18); g.closePath(); g.fill();
      g.fill(F.rrc(0, -46, 104, 52, 26)); F.text(g, '今天', 0, -44, { size: 32, color: '#1b1150', shadow: false });
      g.restore();
    }
  });
  // 「这一年好像什么都没发生」：灰点上浮起同一句「…」，一模一样
  const np = MO.seg(t, cue('L04', '这一年'), cue('L04', '这一年') + 0.4) * (1 - MO.seg(t, tEnd - 0.1, tEnd + 0.2));
  if (np > 0) {
    c.save(); c.globalAlpha = np;
    for (const d of [24, 70, 113, 160, 203, 247]) { const [x, y] = CAM.toScreen(cam, ...dotXY(d)); const b = F.alive(t, d, 4);
      c.fillStyle = 'rgba(168,164,200,.9)'; c.fill(F.rrc(x, y - 52 + b, 74, 40, 20)); for (let k = -1; k <= 1; k++) { c.fillStyle = '#3e3a5e'; c.beginPath(); c.arc(x + k * 16, y - 52 + b, 4.5, 0, TAU); c.fill(); } }
    c.restore();
  }
  // 「就过完了？」——问号
  const qp = F.pop(t, tEnd + 0.55, 0.5);
  if (qp > 0) { c.save(); c.translate(900, 1240); c.rotate(0.1); c.scale(qp, qp); F.text(c, '?', 0, 0, { size: 200, fam: 'PuHui-Black', color: C.warm }); c.restore(); }
  F.vignette(c, 0.4);
}};

// ---------------------------------------------------------------- 镜 4：为什么年纪越大，感觉一年越来越短？
// 大字问题（这一句不出字幕）＋一只越转越快的钟，月历纸从钟后面越撕越快；「两种主流解释」两个标签弹出。
SCENES.s04 = { draw: (c, lt, t) => {
  F.bg(c, t, { dust: 1 });
  const t0 = F.line('L05').t0 - 0.2, tA = cue('L05', '为什么'), tB = cue('L05', '感觉'), tTwo = cue('L06', '两种');
  // 钟：指针角度＝∫速度，速度指数上升（转得越来越快）
  const k = 0.55, u = Math.max(0, t - t0);
  const ang = (Math.exp(k * u) - 1) / k * 1.4;                // 分针累计角度
  const shrink = E.inOut(MO.seg(t, tTwo - 0.3, tTwo + 0.5));
  const cx = 540, cy = lerp(880, 800, shrink), R = lerp(300, 250, shrink);
  const enter = E.back(MO.seg(t, t0 + 0.1, t0 + 0.6), 1.4);
  // 撕下来的月历纸：从钟后飞出，间隔越来越短
  const PAGES = 26; const r = rng(31);
  for (let i = 0; i < PAGES; i++) {
    const ti = t0 + 0.4 + Math.log(1 + i * 0.35) / 0.55 * 1.05, q = (t - ti) / 1.3; const dx = 0.4 + r(), rot0 = (r() - 0.5);
    if (q <= 0 || q >= 1) continue;
    const x = cx + (q * 520 + 60) * dx * (i % 2 ? 1 : -1), y = cy - 120 - q * 520 + q * q * 300, s = 1 - q * 0.3;
    c.save(); c.globalAlpha = 1 - q; c.translate(x, y); c.rotate(rot0 + q * 2.4 * (i % 2 ? 1 : -1)); c.scale(s, s);
    c.fillStyle = '#e9e6f6'; c.fill(F.rrc(0, 0, 120, 140, 12)); c.fillStyle = '#ff6b5a'; c.save(); c.clip(F.rrc(0, 0, 120, 140, 12)); c.fillRect(-60, -70, 120, 32); c.restore();
    F.text(c, `${(i % 12) + 1}月`, 0, 18, { size: 40, fam: 'PuHui-Heavy', color: '#3e3a5e', shadow: false }); c.restore();
  }
  if (enter > 0) {
    c.save(); c.translate(cx, cy); c.scale(enter, enter);
    glow(c, 0, 0, R * 1.6, C.cyan, 0.18 + 0.1 * clamp(u / 5));
    TOON.flat(c, TOON.circle(0, 0, R), '#2a8fd8', '#1d5fa8', '#7fd8ff', [14, 16], [5, 6]);
    c.fillStyle = '#f2f6ff'; c.beginPath(); c.arc(0, 0, R * 0.86, 0, TAU); c.fill();
    for (let i = 0; i < 60; i++) { const a = i * TAU / 60, L = i % 5 ? 0.06 : 0.13; c.strokeStyle = i % 5 ? '#b8c4e8' : '#3e3a5e'; c.lineWidth = i % 5 ? 3 : 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(Math.sin(a) * R * 0.8, -Math.cos(a) * R * 0.8); c.lineTo(Math.sin(a) * R * (0.8 - L), -Math.cos(a) * R * (0.8 - L)); c.stroke(); }
    // 指针：越快拖影越长
    const sp = k * Math.exp(k * u) * 1.4, trail = clamp(sp / 18);
    const hand = (a, len, wdt, col, alpha) => { c.save(); c.globalAlpha = alpha; c.rotate(a); c.strokeStyle = col; c.lineWidth = wdt; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, len * 0.15); c.lineTo(0, -len); c.stroke(); c.restore(); };
    for (let j = 6; j >= 1; j--) hand(ang - j * 0.07 * trail * 6, R * 0.66, 12, C.cyan2, 0.12 * trail);
    for (let j = 6; j >= 1; j--) hand(ang / 12 - j * 0.03 * trail * 3, R * 0.45, 18, '#3e3a5e', 0.1 * trail);
    hand(ang / 12, R * 0.45, 18, '#1f1a3a', 1); hand(ang, R * 0.66, 12, C.cyan2, 1);
    c.fillStyle = C.mag; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill();
    c.restore();
  }
  // 大字问题（两行）
  TY.charsIn(c, '为什么年纪越大', 540, 300, t - tA, { font: '86px "PuHui-Black"', color: C.ink, dur: 0.4, stagger: 0.05, dy: 26, align: 'center', shadow: { color: 'rgba(6,3,24,.55)', y: 6 } });
  TY.charsIn(c, '一年越来越短？', 540, 420, t - tB, { font: '86px "PuHui-Black"', color: C.cyan, dur: 0.4, stagger: 0.05, dy: 26, align: 'center', shadow: { color: 'rgba(6,3,24,.55)', y: 6 } });
  // 两种解释
  F.chip(c, '比例理论', 290, 1240 + F.alive(t, 0, 5), F.pop(t, tTwo + 0.15, 0.5), { col: C.cyan, num: '1', size: 56 });
  F.chip(c, '记忆密度', 790, 1240 + F.alive(t, 1.5, 5), F.pop(t, tTwo + 0.55, 0.5), { col: C.warm, num: '2', size: 56 });
  F.vignette(c, 0.4);
}};
})();
