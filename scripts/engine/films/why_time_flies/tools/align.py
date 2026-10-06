#!/usr/bin/env python3
# /// script
# dependencies = ["sherpa-onnx", "soundfile", "numpy", "scipy"]
# ///
"""口播回听＋逐字对时：用 SenseVoice 把 vo.wav 逐句转回文字，
① 和文案逐字比对（字错率），抓读错、吞字、多音字；
② 用识别结果的逐字时间戳，把每个短句、每个字的起点写回 timing.json / timing.js（画面动作和字幕都挂在这上面）。

    uv run tools/align.py --asr <sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17 目录> [--build build] [--check]

--check 只比对不写回。同音字（帧/针、它们/他们）也会算错，看 diff 判断；真正要改的是声母韵母或声调读错（长 zhǎng/cháng、一 的变调）。
时间戳是字的起点，分辨率约 60ms；文案和识别不一致的字按两边对上的字插值。
"""
import argparse, json, re
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
import sherpa_onnx

HERE = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser(); ap.add_argument('--asr', required=True); ap.add_argument('--build', default=str(HERE / 'build')); ap.add_argument('--check', action='store_true')
a = ap.parse_args()
svd, b = Path(a.asr), Path(a.build)
asr = sherpa_onnx.OfflineRecognizer.from_sense_voice(model=str(svd / 'model.int8.onnx'), tokens=str(svd / 'tokens.txt'), use_itn=False, language='zh', num_threads=4)
T = json.loads((b / 'timing.json').read_text()); x, sr = sf.read(b / 'vo.wav', dtype='float32')
HAN = re.compile(r'[一-鿿]')


def align(r, h):
    """编辑距离对齐：返回 (距离, r 每个字对上的 h 下标或 None)。"""
    n, m = len(r), len(h)
    D = np.zeros((n + 1, m + 1), int); D[:, 0] = range(n + 1); D[0, :] = range(m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i, j] = min(D[i - 1, j] + 1, D[i, j - 1] + 1, D[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    i, j, mp = n, m, [None] * n
    while i > 0 and j > 0:
        if D[i, j] == D[i - 1, j - 1] + (r[i - 1] != h[j - 1]): mp[i - 1] = j - 1; i -= 1; j -= 1
        elif D[i, j] == D[i - 1, j] + 1: i -= 1
        else: j -= 1
    return int(D[n, m]), mp


tot = err = 0
for l in T['lines']:
    t0, t1 = l['t0'], l['t1']
    seg = x[int(t0 * sr):int(t1 * sr)]
    st = asr.create_stream(); st.accept_waveform(16000, resample_poly(seg, 2, 3).astype(np.float32)); asr.decode_stream(st)
    res = st.result
    hyp = [(tk, ts) for tk, ts in zip(res.tokens, res.timestamps) if HAN.fullmatch(tk)]
    r = HAN.findall(l['say']); e, mp = align(r, [tk for tk, _ in hyp]); tot += len(r); err += e
    print(f"{l['id']} {'✓' if e == 0 else '✗'} {e}/{len(r)}  {''.join(tk for tk, _ in hyp)}" + ('' if e == 0 else f"\n      文案 {''.join(r)}"))
    # 每个字的起点：对上的取识别时间戳，没对上的在两边之间插值
    known = [(k, t0 + hyp[j][1]) for k, j in enumerate(mp) if j is not None]
    if len(known) < 2: continue
    ks, ts = zip(*known)
    onset = np.interp(range(len(r)), ks, ts)
    onset = np.maximum.accumulate(np.clip(onset, t0, t1 - 0.05))
    l['chars'] = [[ch, round(float(o), 3)] for ch, o in zip(r, onset)]
    # 短句：第一个字的起点（提前 0.04s）到最后一个字起点＋0.2s（不越过下一短句起点和整句终点）
    k = 0
    for p in l['phrases']:
        n = len(HAN.findall(p['say']))
        p['t0'] = round(max(t0, float(onset[k]) - 0.04), 3)
        p['t1'] = round(min(t1, float(onset[k + n - 1]) + 0.2), 3)
        k += n
    for p, q in zip(l['phrases'], l['phrases'][1:]): p['t1'] = min(p['t1'], q['t0'])
print(f'总字错率 {err / tot:.3%}（{err}/{tot}）')
if not a.check:
    (b / 'timing.json').write_text(json.dumps(T, ensure_ascii=False, indent=1))
    (HERE / 'timing.js').write_text('// 由 tools/tts.py 生成、tools/align.py 逐字对时：每句、每个短句、每个字的起点（秒）。改文案或换口播后重跑这两步。\nwindow.TIMING = ' + json.dumps(T, ensure_ascii=False) + ';\n')
    print('timing.json / timing.js 已按逐字时间戳更新')
