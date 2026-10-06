// 成片 ·《为什么年纪越大，一年过得越快》竖屏 1080×1920，约 87 秒。文案、分镜、发布信息见同目录 README.md。
//   预览 index.html?film=films/why_time_flies   渲染 render.py --film films/why_time_flies --fps 30 --out 成片.mp4 --audio build/mix.wav
// 画法：Kurzgesagt 式深靛紫底＋发光强调色（y1），比例理论段借 3b1b 的「一个对象形变成下一个」（t1），清单段借动态文字（y5）。
// 颜色＝概念：暖黄＝新鲜的记忆画面，灰紫＝重复的日子，青＝大脑/时间。贯穿全片的物件是「记忆胶片」上的一帧帧画面。
// 时间：镜头边界和画面动作全部挂在口播上（timing.js，由 tools/tts.py ＋ tools/align.py 生成），换口播后重跑两步、画面自动跟着走。
U.setStage(1080, 1920);
window.PUNCH = 0;
(() => {                                                    // 段长要在引擎启动前算好，所以同步读 timing.js
  const x = new XMLHttpRequest(); x.open('GET', 'films/why_time_flies/timing.js', false); x.send();
  if (x.status !== 200) { (window.__bootErrors = window.__bootErrors || []).push('films/why_time_flies/timing.js 不存在：先跑 tools/tts.py 和 tools/align.py'); return; }
  (0, eval)(x.responseText);
})();
window.SCENE_LIBS = ['films/why_time_flies/lib.js', 'films/why_time_flies/shots_a.js', 'films/why_time_flies/shots_b.js', 'films/why_time_flies/shots_c.js'];
(() => {
  const L = {}; for (const l of TIMING.lines) L[l.id] = l;
  const END_HOLD = 2.4;                                     // 最后一句说完后停住的时间（结尾评论引导）
  // 镜头：从这一镜第一句开口前 0.2s 开始（转场在换气里完成，不压在句子中间）
  const SHOTS = [
    ['s01', null],                                          // 暑假：一条长长的暖色记忆胶片
    ['s02', 'L02', { type: 'ffDrain', dur: 0.7 }],          // 今年 3 月：颜色流走，日历一片空白
    ['s03', 'L03', { type: 'ffFade', dur: 0.5 }],           // 2026 年的 365 个点，只剩不到 90 个
    ['s04', 'L05', { type: 'ffFade', dur: 0.5 }],           // 问题＋越转越快的钟
    ['s05', 'L07', { type: 'ffFade', dur: 0.5 }],           // ① 比例理论：饼图 1/5 → 1/30 → 胶片盘（含 ② 记忆密度 章节卡）
    ['s07', 'L12', { type: 'ffFade', dur: 0.45 }],          // 大脑翻画面
    ['s08', 'L13', { type: 'ffFrame', dur: 0.7, from: [540, 1000, 300, 200] }],   // 童年：第一次 ×3，胶片密密麻麻
    ['s09', 'L15', { type: 'ffDrain', dur: 0.6 }],          // 长大：重复的一天 → 365 张卡 → 啪，合并成一帧 → 回头看只剩一张
    ['s11', 'L18', { type: 'ffFade', dur: 0.5 }],           // 假期悖论
    ['s12', 'L20', { type: 'ffFade', dur: 0.5 }],           // 出路：三件小事，灰胶片重新亮起来
    ['s13', 'L25', { type: 'ffFrame', dur: 0.8, from: [540, 380, 160, 110] }],    // 新的一天
  ];
  const ERAS = [];
  SHOTS.forEach(([id, lid, tr], i) => {
    const t0 = lid ? L[lid].t0 - 0.2 : 0, next = SHOTS[i + 1];
    const t1 = next ? L[next[1]].t0 - 0.2 : TIMING.lines[TIMING.lines.length - 1].t1 + END_HOLD;
    ERAS.push({ id, dur: t1 - t0, ...(tr ? { transition: tr } : {}) });
  });
  window.FILM_DURATION = ERAS.reduce((s, e) => s + e.dur, 0);
  ERAS.push({ id: 'cover', dur: 1 });                       // 封面（不在片长内）：render.py --solo cover --stills 0.5
  window.ERAS = ERAS;
})();
