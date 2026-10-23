# 効果音（SE）を作る。役割はこれだけ（動画に重ねるのは mix.py。どこで鳴らすかは outro.py などが timeline に書く）。
#   python3 se.py   … assets/se/ に、次の音を作る（すべてオリジナル）
#     whoosh … 空気を切る「ふわっ」という音（まとめカードに切り替わるとき）
#     chime  … やわらかい2音の「ポロン」（通知のような明るめの音）
#     click  … 「カチャッ」というマガジンをはめるような音（タルコフらしい道具の音）
import os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
SR = 48000; D = os.path.dirname(os.path.abspath(__file__)); OUT = f"{D}/assets/se"; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)
t_ = lambda d: np.arange(int(d * SR)) / SR
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def lp(x, f): return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
def save(name, l, r=None, peak=0.35):
    r = l if r is None else r; st = np.stack([l, r], 1); st = st / (np.abs(st).max() + 1e-9) * peak
    sf.write(f"{OUT}/{name}.wav", st.astype(np.float32), SR); print(f"{OUT}/{name}.wav")

def whoosh():
    d = 0.75; t = t_(d); n = rng.standard_normal(len(t)); out = np.zeros_like(t)
    # 帯域を低→高へ動かしながら、ふくらんで消える
    step = 512
    for i in range(0, len(t), step):
        c = 350 * (9 ** (i / len(t))); seg = bp(n[max(0, i - 2048):i + step], c * 0.7, min(c * 1.6, 20000))[-step:] if i else bp(n[:step], 240, 560)
        out[i:i + len(seg)] = seg[: len(out[i:i + step])]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2.2
    pan = np.clip(t / d, 0, 1)
    save("whoosh", out * env * (1.1 - 0.5 * pan), out * env * (0.6 + 0.5 * pan), 0.32)

def chime():
    d = 1.2; t = t_(d); x = np.zeros_like(t)
    for f, at, g in ((1244.5, 0.0, 1.0), (1568.0, 0.09, 0.9)):          # E♭6 → G6（曲のハ短調になじむ音）
        i = int(at * SR); tt = t[: len(t) - i]
        tone = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 2 * tt) + 0.08 * np.sin(2 * np.pi * f * 3 * tt)
        x[i:] += tone * np.minimum(1, tt / 0.004) * np.exp(-tt / 0.32) * g
    save("chime", x, np.roll(x, int(0.008 * SR)), 0.22)

def click():
    d = 0.5; t = t_(d); x = np.zeros_like(t)
    for at, g in ((0.0, 1.0), (0.11, 0.75)):                             # カチャッ（2回）
        i = int(at * SR); k = int(0.03 * SR); tt = t[:k]
        x[i:i + k] += bp(rng.standard_normal(k), 1800, 7000) * np.exp(-tt / 0.006) * g
        x[i:i + k] += np.sin(2 * np.pi * 900 * tt) * np.exp(-tt / 0.004) * 0.4 * g
    k = int(0.18 * SR); tt = t[:k]; i = int(0.11 * SR)
    x[i:i + k] += np.sin(2 * np.pi * (70 + 60 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.05) * 0.6   # 重みのある「トン」
    save("click", x, None, 0.35)

whoosh(); chime(); click()
