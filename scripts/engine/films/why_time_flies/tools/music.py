#!/usr/bin/env python3
# /// script
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""配乐＋音效（纯代码合成，原创）＋混音：build/timing.json ＋ build/vo.wav → build/music.wav、build/mix.wav。

    uv run tools/music.py [--build build]

和画面同一套时间：镜头边界、动作都从口播逐字时间戳算（和 eras.js / F.cue 一致）。
- 和声：84 BPM，F–G–Em–Am（4-5-3-6，怀旧）。钢琴分解和弦＋柔和铺底＋低音。
- 段落：暑假暖→今年 3 月冷（只剩铺底和稀疏单音）→钟表滴答越来越快→比例理论轻拨→记忆密度暖起来，「第一次」叮叮→
  长大以后变闷、单音重复、卡片翻摞声越来越密→「合并成」吸气→「一帧」砸下、全静 1 秒只剩余响→假期悖论轻快→三件小事每件一声→日出整段铺满、落在 C 大三和弦。
- 混音：口播在的地方配乐自动压低（侧链），整体响度 −14 LUFS（短视频平台常用值，用 ffmpeg loudnorm）。
"""
import argparse, json, re, subprocess
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt, resample_poly

HERE = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser(); ap.add_argument('--build', default=str(HERE / 'build')); a = ap.parse_args()
B = Path(a.build)
T = json.loads((B / 'timing.json').read_text()); L = {l['id']: l for l in T['lines']}
SR = 48000
END_HOLD = 2.4
DUR = T['lines'][-1]['t1'] + END_HOLD
N = int(DUR * SR) + SR
HAN = re.compile(r'[一-鿿]')


def cue(lid, word, nth=0):
    l = L[lid]; s = ''.join(c[0] for c in l['chars']); w = ''.join(HAN.findall(word)); i = -1
    for _ in range(nth + 1): i = s.index(w, i + 1)
    return l['chars'][i][1]


shot = lambda lid: L[lid]['t0'] - 0.2
S = {k: shot(v) for k, v in dict(s02='L02', s03='L03', s04='L05', s05='L07', s07='L12', s08='L13', s09='L15', s11='L18', s12='L20', s13='L25').items()}
tHit, tMerge, tYear = cue('L16', '一帧'), cue('L16', '合并'), cue('L17', '一整年')
rng = np.random.default_rng(7)
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2))


def add(buf, t, x, gain=1.0, pan=0.0):
    i = int(t * SR); x = np.asarray(x)
    if x.ndim == 1: x = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], 1) * np.sqrt(2)
    j = min(N, i + len(x));
    if j > i >= 0: buf[i:j] += x[:j - i] * gain


def env_adsr(n, a=0.005, d=0.3, s=0.0, r=0.05):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4))
    e = np.where(t > a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)), e)
    e[-int(r * SR):] *= np.linspace(1, 0, int(r * SR)); return e


def piano(f, dur=1.6, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for h, amp in enumerate([1, 0.45, 0.22, 0.12, 0.06, 0.03], 1):
        fh = f * h * (1 + 0.0004 * h * h); x += amp * bright ** (h - 1) * np.sin(2 * np.pi * fh * t) * np.exp(-t * (1.6 + 0.9 * h))
    return x * env_adsr(n, 0.003, 10, 1, 0.08) * 0.5


def pad(freqs, dur, bright=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in freqs:
        for d in (-0.15, 0.0, 0.17):
            ph = rng.random() * 6.28; ff = f * 2 ** (d / 12)
            x += sum(np.sin(2 * np.pi * ff * k * t + ph * k) / k for k in range(1, 6))
    sos = butter(2, 400 + 2200 * bright, 'low', fs=SR, output='sos'); x = sosfilt(sos, x)
    e = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.8); return x * e / (len(freqs) * 6)


def bell(f, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9)) * np.exp(-t * 3.2) * 0.4


def noise(dur, lo=None, hi=None):
    x = rng.standard_normal(int(dur * SR))
    if lo: x = sosfilt(butter(2, lo, 'high', fs=SR, output='sos'), x)
    if hi: x = sosfilt(butter(2, hi, 'low', fs=SR, output='sos'), x)
    return x


def tick(hi=True):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (noise(0.05, 2500) * 0.5 + np.sin(2 * np.pi * (3200 if hi else 2400) * t)) * np.exp(-t * 160) * 0.35


def pop(f=880):
    n = int(0.18 * SR); t = np.arange(n) / SR
    fr = f * (1 + 1.2 * np.exp(-t * 40)); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 26) * 0.5


def whoosh(dur=0.6, up=True):
    x = noise(dur); t = np.arange(len(x)) / SR; out = np.zeros_like(x)
    # 扫频带通：用一阶滤波分块近似
    nb = 24
    for k in range(nb):
        i0, i1 = k * len(x) // nb, (k + 1) * len(x) // nb; q = k / (nb - 1)
        fc = 300 * (12 ** (q if up else 1 - q)); seg = sosfilt(butter(2, [fc * 0.7, fc * 1.4], 'band', fs=SR, output='sos'), x[max(0, i0 - 2000):i1])[-(i1 - i0):]
        out[i0:i1] = seg
    e = np.sin(np.pi * t / dur) ** 1.5; return out * e * 0.6


def riffle(dur=0.07):
    return noise(dur, 1500, 7000) * np.exp(-np.arange(int(dur * SR)) / SR * 70) * 0.25


def thump():
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t * 18); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    crack = noise(1.6, 200, 6000) * np.exp(-t * 22) * 0.8
    return (body * 1.1 + crack) * 0.9


def reverb(x, sec=2.2, mix=0.25):
    n = int(sec * SR); ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 3.2)[:, None]
    ir[:, 0] = sosfilt(butter(1, 5000, 'low', fs=SR, output='sos'), ir[:, 0]); ir[:, 1] = sosfilt(butter(1, 5000, 'low', fs=SR, output='sos'), ir[:, 1])
    wet = np.stack([fftconvolve(x[:, 0], ir[:, 0])[:len(x)], fftconvolve(x[:, 1], ir[:, 1])[:len(x)]], 1)
    wet *= np.abs(x).max() / (np.abs(wet).max() + 1e-9)
    return x * (1 - mix) + wet * mix


# ------------------------------------------------------------ 配乐
BPM = 84; BEAT = 60 / BPM; BAR = BEAT * 4
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
CH = [[53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 62], [57, 60, 64, 69]]     # Fmaj7 G Em7 Am
BASS = [41, 43, 40, 45]


def section(t):
    """各段的配乐密度/亮度：(arp 0..1, pad 0..1, bright 0..1)"""
    if t < S['s02']: return 0.9, 0.7, 0.8
    if t < S['s05']: return 0.12, 0.6, 0.25
    if t < S['s07'] - 3.4: return 0.45, 0.6, 0.45
    if t < S['s09']: return 0.85, 0.75, 0.75
    if t < tYear: return 0.0, 0.45, 0.12
    if t < S['s12']: return 0.8, 0.7, 0.7
    if t < S['s13']: return 0.6, 0.75, 0.6
    return 1.0, 1.0, 0.9


bar = 0; tb = 0.0
while tb < DUR:
    k = bar % 4; arp, pd, br = section(tb + 0.01)
    if pd > 0: add(mus, tb, pad([hz(m) for m in CH[k][:3]], BAR + 0.9, br), 0.55 * pd)
    add(mus, tb, piano(hz(BASS[k]), BAR, 0.5), 0.45 * (0.6 + 0.4 * pd))
    seq = [CH[k][0] + 12, CH[k][1] + 12, CH[k][2] + 12, CH[k][3] + 12, CH[k][2] + 12, CH[k][1] + 12, CH[k][3] + 12, CH[k][2] + 24]
    for j, m in enumerate(seq):
        t = tb + j * BEAT / 2; a_, _, b_ = section(t)
        if a_ <= 0: continue
        if a_ < 0.3 and j % 4: continue                     # 冷段：每小节两个音
        if a_ < 0.6 and j % 2: continue
        add(mus, t, piano(hz(m), 1.4, 0.4 + 0.5 * b_), 0.32 * a_, pan=(j % 4 - 1.5) * 0.25)
    bar += 1; tb += BAR
# 长大以后：闷住的单音重复（同一个音，不换）
t = S['s09'] + 0.1
while t < tMerge:
    add(mus, t, piano(hz(64), 0.5, 0.25), 0.22); t += BEAT / 2
# 「一帧」前 0.12s 起全静，撞击后只剩余响；「一整年」再回来
cut = np.ones(N); i0, i1, i2 = int((tHit - 0.12) * SR), int(tHit * SR), int((tYear - 0.6) * SR)
cut[i0:i2] = 0; ramp = int(0.6 * SR); cut[i2:i2 + ramp] = np.linspace(0, 1, ramp)
cut[int((tMerge) * SR):i0] *= np.linspace(1, 0.5, i0 - int(tMerge * SR))
mus *= cut[:, None]
# 结尾：日出铺满、落在 C 大三和弦
tEnd = L['L25']['t1']
add(mus, cue('L25', '新的一天') - 0.4, pad([hz(m) for m in (48, 55, 60, 64, 67, 72)], DUR - cue('L25', '新的一天') + 0.4, 0.8), 0.9)
for j, m in enumerate([72, 76, 79, 84]): add(mus, cue('L25', '新的一天') + j * 0.12, bell(hz(m), 2.5), 0.25, pan=(j - 1.5) * 0.3)
mus = reverb(mus, 2.4, 0.3)

# ------------------------------------------------------------ 音效
add(sfx, cue('L01', '一个暑假') + 0.1, whoosh(0.7, True), 0.25)                 # 量尺伸出去
for t in (S['s02'], S['s09']): add(sfx, t, whoosh(0.8, False), 0.3)             # 颜色流走
for t in (S['s03'], S['s04'], S['s05'], S['s07'], S['s11'], S['s12']): add(sfx, t, whoosh(0.5, True), 0.16)
for t in (S['s08'], S['s13']): add(sfx, t, whoosh(0.9, True), 0.3)              # 画框揭开
add(sfx, cue('L02', '什么') + 0.05, pop(520), 0.4)                               # 问号
add(sfx, cue('L03', '只剩') + 1.35, pop(990), 0.3)                               # 今天小旗
add(sfx, cue('L04', '就过完') + 0.55, pop(520), 0.4)
# 钟：镜 4 指针越转越快 → 滴答越来越密（和画面同一条指数）
t0 = S['s04']; k = 0.55; m = 0
while True:
    u = np.log(1 + k * (m * np.pi / 6) / 1.4) / k                   # 分针每转 30° 一声
    t = t0 + u
    if t > S['s05'] - 0.2: break
    add(sfx, t, tick(m % 2 == 0), 0.22 * min(1, 0.4 + u / 6)); m += 1
for t in (cue('L06', '两种') + 0.15, cue('L06', '两种') + 0.55): add(sfx, t, pop(780), 0.35)
add(sfx, cue('L07', '比例'), pop(700), 0.3)
add(sfx, cue('L08', '五岁'), pop(660), 0.25); add(sfx, cue('L08', '一年') - 0.1, bell(hz(79)), 0.2)
add(sfx, cue('L08', '五分之一'), pop(880), 0.3); add(sfx, cue('L09', '三十分之一'), pop(990), 0.3)
add(sfx, cue('L11', '第二种') + 0.05, pop(700), 0.3)
add(sfx, cue('L11', '记忆密度'), thump()[:int(0.5 * SR)] * 0.35, 1.0); add(sfx, cue('L11', '记忆密度'), bell(hz(84)), 0.25)
# 大脑翻画面：一张一声，越来越快
tR, tM = cue('L12', '回忆'), cue('L12', '多少画面'); nm = (tM - tR) * 2.6
for i in range(15):
    t = tR + i / 2.6 if i < nm else tM + (i - nm) / 9
    add(sfx, t, riffle(), 0.5, pan=(i % 5 - 2) * 0.3)
# 小时候：每个「第一次」一声叮
for kk, mm in zip((1, 2, 3), (84, 88, 91)): add(sfx, L['L13']['phrases'][kk]['t0'] - 0.1, bell(hz(mm)), 0.3)
for i in range(18): add(sfx, cue('L14', '记忆') + i * 0.06, pop(900 + (i * 137) % 700), 0.08, pan=((i * 7) % 5 - 2) * 0.35)
add(sfx, cue('L14', '密密') + 0.1, bell(hz(96)), 0.15)
# 长大：四件事各一声闷的
for w in ('起床', '通勤', '上班', '刷手机'): add(sfx, cue('L15', w) - 0.05, pop(330), 0.3)
# 365 张卡越摞越快（和画面同一条 easeIn 曲线：n = 1 + 364·p³）
a0, a1 = cue('L16', '日子') + 0.35, tMerge - 0.05
last = 1
for i in range(2000):
    t = a0 + (a1 - a0) * i / 2000; n = int(1 + 364 * ((t - a0) / (a1 - a0)) ** 3)
    if n > last and (n - last >= max(1, n // 40)): add(sfx, t, riffle(0.05), 0.35, pan=rng.uniform(-0.4, 0.4)); last = n
# 「合并成」：吸气（反向噪声上扬）→「一帧」：砸
rise = whoosh(tHit - tMerge, True); add(sfx, tMerge, rise * np.linspace(0.3, 1, len(rise)), 0.45)
add(sfx, tHit, thump(), 1.0)
add(sfx, tHit + 0.05, bell(hz(60), 2.0), 0.15)
add(sfx, cue('L17', '薄薄') + 0.05, whoosh(0.35, True), 0.2)
# 假期悖论：飞机嗖、塞满画面
add(sfx, L['L18']['phrases'][1]['t0'], whoosh(0.9, True), 0.3)
for i in range(9): add(sfx, L['L19']['phrases'][1]['t0'] - 0.25 + i * 0.09, pop(800 + i * 60), 0.12, pan=((i % 3) - 1) * 0.4)
# 不是命运：划掉
add(sfx, cue('L20', '命运') + 0.25, noise(0.3, 800, 5000) * np.exp(-np.arange(int(0.3 * SR)) / SR * 12) * 0.3, 1.0)
# 三件小事：每件一声上行叮
for lid, mm in zip(('L22', 'L23', 'L24'), (79, 83, 86)): add(sfx, L[lid]['t0'] - 0.05, bell(hz(mm)), 0.3); add(sfx, L[lid]['t0'] + 0.1, whoosh(0.3, True), 0.12)
sfx = reverb(sfx, 1.4, 0.18)

# ------------------------------------------------------------ 混音
vo, vsr = sf.read(B / 'vo.wav', dtype='float32')
vo = resample_poly(vo, SR // 1000, vsr // 1000) if vsr != SR else vo
v = np.zeros(N); v[:len(vo)] = vo[:N]
# 侧链：口播包络（40ms 窗）→ 配乐压到 0.38，起 60ms、放 350ms
envv = np.sqrt(np.convolve(v ** 2, np.ones(int(0.04 * SR)) / int(0.04 * SR), 'same'))
on = (envv > 0.02).astype(float); g = np.empty(N); cur = 1.0
att, rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.35 * SR))
for i in range(N):
    target = 0.38 if on[i] else 1.0; c_ = att if target < cur else rel; cur = target + (cur - target) * c_; g[i] = cur
mus_n = mus / (np.abs(mus).max() + 1e-9); sfx_n = sfx / (np.abs(sfx).max() + 1e-9)
music = mus_n * 0.30 * g[:, None]
mix = music + sfx_n * 0.42 + np.stack([v, v], 1) * 0.9
L_ = int(DUR * SR); fade = int(0.8 * SR)
mix = mix[:L_]; mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
music_only = (mus_n * 0.30 + sfx_n * 0.42)[:L_]; music_only[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(B / 'music.wav', music_only / (np.abs(music_only).max() + 1e-9) * 0.9, SR)
sf.write(B / 'mix_raw.wav', mix / (np.abs(mix).max() + 1e-9) * 0.95, SR)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(B / 'mix_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), str(B / 'mix.wav')], check=True)
print(f'mix.wav {DUR:.2f}s（−14 LUFS）、music.wav（配乐＋音效，无口播）→', B)
