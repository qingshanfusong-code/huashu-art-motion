#!/usr/bin/env python3
# /// script
# dependencies = ["sherpa-onnx", "soundfile", "numpy"]
# ///
"""口播：script.json → 逐句 TTS → vo.wav ＋ timing.json ＋ timing.js（画面按它对口型、出字幕）。

    uv run tools/tts.py --model <kokoro-multi-lang-v1_1 目录> [--sid 50] [--speed 1.12] [--out build]

用 sherpa-onnx 跑 Kokoro v1.1-zh（Apache-2.0，可商用；模型在 k2-fsa/sherpa-onnx 的 GitHub release「tts-models」里）。
自己录口播时：把 vo.wav 换成自己的录音，再用 --align-only 按新录音重算每句起止（要求句子顺序、句间停顿和 script.json 一致）。

读音：词典里查不到的词按单字读，「长」默认读 zhǎng、「一」不变调。OVERRIDES 里补了本片用到的多音字和「一」的变调，
写进模型目录的副本（不改原模型）。

时间：每句单独合成，切掉首尾静音，句后停 gap 秒；句内按标点切短句，用句内最长的几段静音定短句边界
（找不到就按字数比例分），字幕和画面动作都挂在短句上。
"""
import argparse, json, re, shutil
from pathlib import Path
import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent.parent
PUNCT = r'[，、；：？。！]'

# 本片读音修正：词 → 每个字的（取音的词, 第几个字, 改成第几声 or None）
OVERRIDES = {
    '多长': [('多少', 0, None), ('长度', 0, None)],
    '特别长': [('特别', 0, None), ('特别', 1, None), ('长度', 0, None)],
    '变长': [('变', 0, None), ('长度', 0, None)],
    '一年': [('一', 0, 4), ('年', 0, None)],
    '这一年': [('这', 0, None), ('一', 0, 4), ('年', 0, None)],
    '每一年': [('每', 0, None), ('一', 0, 4), ('年', 0, None)],
    '一整年': [('一', 0, 4), ('整', 0, None), ('年', 0, None)],
    '一天': [('一', 0, 4), ('天', 0, None)],
    '每一天': [('每', 0, None), ('一', 0, 4), ('天', 0, None)],
    '一张': [('一', 0, 4), ('张', 0, None)],
    '一帧': [('一', 0, 4), ('帧', 0, None)],
    '一件': [('一', 0, 2), ('件', 0, None)],
    '只占': [('只', 0, None), ('占', 0, None)],
    '过得': [('过', 0, None), ('觉得', 1, None)],
    '占比': [('占', 0, None), ('比', 0, None)],
    '只剩': [('只', 0, None), ('剩', 0, None)],
}


def syllables(tokens):
    out, cur = [], []
    for t in tokens:
        cur.append(t)
        if t.isdigit(): out.append(cur); cur = []
    return out


def patch_model(src: Path, dst: Path):
    """复制模型目录（大文件用软链），往 lexicon-zh 和 jieba 用户词典里加 OVERRIDES。"""
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    for f in src.iterdir():
        if f.name in ('lexicon-zh.txt', 'dict'): continue
        (dst / f.name).symlink_to(f.resolve())
    shutil.copytree(src / 'dict', dst / 'dict')
    lex = {}
    for line in (src / 'lexicon-zh.txt').read_text().splitlines():
        p = line.split()
        if p and p[0] not in lex: lex[p[0]] = p[1:]
    add = []
    for w, parts in OVERRIDES.items():
        toks = []
        for srcw, i, tone in parts:
            syl = list(syllables(lex[srcw])[i])
            if tone: syl[-1] = str(tone)
            toks += syl
        add.append(f'{w} {" ".join(toks)}')
    (dst / 'lexicon-zh.txt').write_text('\n'.join(add) + '\n' + (src / 'lexicon-zh.txt').read_text())
    with open(dst / 'dict' / 'user.dict.utf8', 'a') as f:
        for w in OVERRIDES: f.write(f'{w} 100000 n\n')
    return add


def make_tts(model: Path, threads=4):
    import sherpa_onnx
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=str(model / 'model.onnx'), voices=str(model / 'voices.bin'), tokens=str(model / 'tokens.txt'),
                data_dir=str(model / 'espeak-ng-data'), dict_dir=str(model / 'dict'),
                lexicon=f"{model / 'lexicon-us-en.txt'},{model / 'lexicon-zh.txt'}"),
            num_threads=threads),
        rule_fsts=f"{model / 'phone-zh.fst'},{model / 'date-zh.fst'},{model / 'number-zh.fst'}",
        max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)


def rms_frames(x, sr, hop=0.01):
    n = int(sr * hop); m = len(x) // n
    return np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(axis=1) + 1e-12), hop


def trim(x, sr, th_db=-42):
    r, hop = rms_frames(x, sr)
    on = np.where(20 * np.log10(r / (r.max() + 1e-9)) > th_db)[0]
    a = max(0, int((on[0] * hop - 0.03) * sr)); b = min(len(x), int(((on[-1] + 1) * hop + 0.06) * sr))
    return x[a:b]


def phrase_bounds(x, sr, phrases):
    """短句边界：句内静音段（≥70ms）里挑最长的 n−1 段，按时间排序；不够就按字数比例。返回每个短句的 [t0, t1]（句内秒）。"""
    n = len(phrases); dur = len(x) / sr
    lens = [max(1, len(re.sub(r'[「」]', '', p))) for p in phrases]
    if n == 1: return [[0, dur]]
    r, hop = rms_frames(x, sr)
    db = 20 * np.log10(r / (r.max() + 1e-9)); quiet = db < -32
    gaps, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * hop >= 0.07 and i > 5 and j < len(quiet) - 5: gaps.append((i * hop, j * hop))
            i = j
        else: i += 1
    if len(gaps) >= n - 1:
        # 优先挑「靠近按字数估计的边界」又够长的静音
        est = np.cumsum(lens)[:-1] / sum(lens) * dur
        chosen = []
        for e in est:
            best = min((g for g in gaps if g not in chosen), key=lambda g: abs((g[0] + g[1]) / 2 - e) - 0.6 * (g[1] - g[0]))
            chosen.append(best)
        chosen.sort()
        out, t = [], 0.0
        for g in chosen: out.append([t, g[0]]); t = g[1]
        out.append([t, dur])
        if all(b > a for a, b in out): return out
    cum = np.concatenate([[0], np.cumsum(lens)]) / sum(lens) * dur
    return [[float(cum[k]), float(cum[k + 1])] for k in range(n)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=False)
    ap.add_argument('--sid', type=int, default=50)
    ap.add_argument('--speed', type=float, default=1.12)
    ap.add_argument('--out', default=str(HERE / 'build'))
    ap.add_argument('--lead', type=float, default=0.15, help='片头第一句前留白（秒）')
    ap.add_argument('--only', help='只合成这几句（逗号分隔 id），试音用')
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    S = json.loads((HERE / 'script.json').read_text())
    model = out / 'kokoro_patched'
    print('读音修正：', *patch_model(Path(a.model), model), sep='\n  ')
    tts = make_tts(model)
    lines = [l for l in S['lines'] if not a.only or l['id'] in a.only.split(',')]
    segs, t, sr = [], a.lead, None
    timing = {'sid': a.sid, 'speed': a.speed, 'lines': []}
    for l in lines:
        g = tts.generate(re.sub(r'[「」]', '', l['say']), sid=a.sid, speed=a.speed * l.get('speed', 1))   # 个别句子读得含糊时在 script.json 里给 speed（相对倍数）放慢
        sr = g.sample_rate
        x = trim(np.asarray(g.samples, dtype=np.float32), sr)
        say_p = [p for p in re.split(PUNCT, l['say']) if p]
        sub_p = [p for p in re.split(PUNCT, l.get('sub', l['say'])) if p]
        # 字幕短句带上原来的标点（句末的句号逗号去掉，问号保留）
        sub_full = re.findall(r'[^，、；：？。！]+[，、；：？。！]?', l.get('sub', l['say']))
        pb = phrase_bounds(x, sr, say_p)
        dur = len(x) / sr
        timing['lines'].append({'id': l['id'], 'shot': l['shot'], 'say': l['say'], 'sub': l.get('sub', l['say']), 't0': round(t, 3), 't1': round(t + dur, 3),
                                'phrases': [{'say': sp, 'sub': su.strip(), 't0': round(t + b0, 3), 't1': round(t + b1, 3)} for sp, su, (b0, b1) in zip(say_p, sub_full, pb)]})
        print(f"{l['id']} {t:6.2f}–{t + dur:6.2f}  {dur:4.2f}s  {len(re.sub(PUNCT, '', l['say'])) / dur:4.1f}字/秒  {l['say']}")
        segs.append(x); t += dur
        gap = l.get('gap', 0.3); segs.append(np.zeros(int(gap * sr), np.float32)); t += gap
    vo = np.concatenate([np.zeros(int(a.lead * sr), np.float32)] + segs)
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.89
    sf.write(out / 'vo.wav', vo, sr)
    timing['duration'] = round(len(vo) / sr, 3)
    (out / 'timing.json').write_text(json.dumps(timing, ensure_ascii=False, indent=1))
    if not a.only:
        (HERE / 'timing.js').write_text('// 由 tools/tts.py 生成：每句、每个短句的起止（秒）。改文案或换口播后重跑。\nwindow.TIMING = ' + json.dumps(timing, ensure_ascii=False) + ';\n')
    print(f'vo.wav {timing["duration"]:.2f}s  sr={sr}  →', out)


if __name__ == '__main__':
    main()
