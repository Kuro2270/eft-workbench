# ショート用の BGM（オリジナル曲）を作る。役割はこれだけ（動画に重ねるのは mix_audio.py）。
#   イメージ：タルコフの暗い戦場。落ち着いた、32bit 機（プレステ・サターンの頃）の音
#     ＝ 少しこもった音（22kHz・12bit 相当に落とす）と、深めの残響
#   python3 music.py <曲> <秒数> [出力.wav] [締めの和音の秒]
#     締めの和音の秒 … その時刻で演奏を止めて、最後の和音を鳴らし、響きを残して終わる（動画の終わりの演出に合わせる）
#     曲 … a（Cold Rain）／ b（Silent Watch）／ c（Ashes：ショートで採用）
#     長尺は、動画全体の長さで1曲を作る（つなぎ目のない1本の BGM にするため）
#   出力を省くと out/bgm/<曲の名前>-<秒数>s.wav
import sys, os, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
SR = 44100
D = os.path.dirname(os.path.abspath(__file__))
SONG = sys.argv[1]; LEN = float(sys.argv[2])
END = float(sys.argv[4]) if len(sys.argv) > 4 else None
rng = np.random.default_rng(7)

# ---------- 音の部品 ----------
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)         # MIDI の音の高さ → 周波数
NOTE = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
def n(s):                                               # "D4" → 62
    return 12 * (int(s[-1]) + 1) + NOTE[s[:-1]]
def t_(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.01, r=0.2, sustain=1.0, dec=None):
    t = t_(d); e = np.minimum(1, t / max(a, 1e-4))
    if dec: e = e * (sustain + (1 - sustain) * np.exp(-t / dec))
    rel = np.clip((d - t) / max(r, 1e-4), 0, 1); return e * rel
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def saw(f, d, det=0.0):
    t = t_(d); return 2 * ((t * f * (1 + det)) % 1) - 1
def sq(f, d, duty=0.5):
    t = t_(d); return np.where((t * f) % 1 < duty, 1.0, -1.0)
def tri(f, d):
    t = t_(d); return 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
def sine(f, d, vib=0.0, vr=5.0):
    t = t_(d); return np.sin(2 * np.pi * f * t + vib * np.sin(2 * np.pi * vr * t))
def fm(f, d, ratio=2.0, idx=2.0, dec=0.6):
    t = t_(d); i = idx * np.exp(-t / dec); return np.sin(2 * np.pi * f * t + i * np.sin(2 * np.pi * f * ratio * t))

def pad(notes, d, cut=900, a=1.5, r=1.5, vol=0.12):
    x = sum(saw(hz(m), d, det) for m in notes for det in (-0.004, 0.0, 0.005))
    return lp(x, cut, 2) * env(d, a, r) * vol / len(notes)
def kick(vol=0.9):
    d = 0.45; t = t_(d); f = 45 + 80 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * vol
def snare(vol=0.35, dark=3500):
    d = 0.3; t = t_(d); x = lp(rng.standard_normal(len(t)), dark) * np.exp(-t / 0.07) + 0.4 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05)
    return x * vol
def rim(vol=0.18):
    d = 0.08; t = t_(d); return bp(rng.standard_normal(len(t)), 1500, 4000) * np.exp(-t / 0.015) * vol
def hat(vol=0.05):
    d = 0.06; t = t_(d); return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t / 0.012) * vol
def timpani(m, vol=0.6):
    d = 2.0; t = t_(d); return (np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(2 * np.pi * hz(m) * 1.5 * t)) * np.exp(-t / 0.7) * vol + lp(rng.standard_normal(len(t)), 300) * np.exp(-t / 0.05) * vol * 0.5

class Track:
    def __init__(s, bpm): s.x = np.zeros(int((LEN + 4) * SR)); s.beat = 60 / bpm
    def add(s, sig, at_beats, gain=1.0):
        i = int(at_beats * s.beat * SR); j = min(len(s.x), i + len(sig))
        if i < len(s.x): s.x[i:j] += sig[: j - i] * gain
    def b(s, beats): return beats * s.beat

def reverb(x, sec=2.6, wet=0.32, damp=4000):
    t = t_(sec); ir = rng.standard_normal(len(t)) * np.exp(-t / (sec / 6)); ir = lp(ir, damp); ir /= np.sqrt((ir ** 2).sum())
    pre = int(0.03 * SR); ir = np.concatenate([np.zeros(pre), ir])
    return x * (1 - wet) + fftconvolve(x, ir)[: len(x)] * wet * 1.6

def era32(x):
    # 32bit 機の音：22kHz に落として（折り返しは少し残す）、12bit 相当で丸める
    y = x[::2].repeat(2)[: len(x)]; y = lp(y, 9000, 4)
    q = 2 ** 11; return np.round(y * q) / q

def ending(T, chord, bell=None):
    # 締め：END で演奏をすっと止めて（0.25 秒）、最後の和音を鳴らす。残響は、このあとの reverb で残る
    if END is None: return
    i, k = int(END * SR), int(0.25 * SR)
    T.x[i:i + k] *= np.linspace(1, 0, k); T.x[i + k:] = 0
    at = END / T.beat; d = max(1.5, LEN - END + 0.5)
    T.add(pad([n(c) for c in chord], d, cut=1100, a=0.05, r=d * 0.9, vol=0.16), at)
    T.add(sine(hz(n(chord[0]) - 12), d) * env(d, 0.02, d * 0.9) * 0.3, at)
    if bell: T.add(fm(hz(n(bell)), d, 3.5, 1.4, 0.9) * env(d, 0.005, d * 0.9) * 0.10, at)

def finish(x, dst):
    x = x[: int(LEN * SR)]
    fi, fo = int(1.2 * SR), int((0.4 if END is not None else 3.0) * SR)
    x[:fi] *= np.linspace(0, 1, fi); x[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    st = np.stack([x, np.roll(x, int(0.012 * SR)) * 0.96 + x * 0.04], 1)   # 少しだけ左右に広げる
    import soundfile as sf; os.makedirs(os.path.dirname(dst), exist_ok=True); sf.write(dst, st.astype(np.float32), SR); print(dst)

# ---------- A：Cold Rain（ニ短調・76 BPM）冷たい雨の中で待つ。広いパッドと、ぽつぽつ鳴る鐘 ----------
def song_a():
    T = Track(76); bars = int(LEN / T.b(4)) + 2
    prog = [["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["G2", "Bb2", "D3"], ["A2", "E3", "A3"]]
    for bar in range(0, bars, 2):
        ch = [n(s) for s in prog[(bar // 2) % 4]]
        T.add(pad(ch + [ch[0] + 12], T.b(8) + 1.5, cut=800), bar * 4)
        T.add(sine(hz(ch[0] - 12), T.b(8)) * env(T.b(8), 0.3, 1.0) * 0.32, bar * 4)
    bell = ["A5", None, "F5", None, "D5", None, "E5", "F5", "A5", None, "G5", None, "F5", None, "E5", None]
    for bar in range(2, bars):
        m = bell[(bar - 2) % len(bell)]
        if m: T.add(fm(hz(n(m)), 3.0, 3.5, 1.6, 0.8) * env(3.0, 0.005, 2.5) * 0.10, bar * 4 + 0.5)
    for bar in range(4, bars):
        T.add(kick(0.55), bar * 4); T.add(kick(0.4), bar * 4 + 2.5); T.add(snare(0.16, 2500), bar * 4 + 2)
        for k in range(8): T.add(hat(0.025 if k % 2 else 0.04), bar * 4 + k * 0.5)
    rain = lp(hp(rng.standard_normal(len(T.x)), 1500), 6000) * 0.018
    ending(T, ["D3", "A3", "D4", "F4"], "A5")
    return era32(reverb(T.x + rain, 3.0, 0.35))

# ---------- B：Silent Watch（ホ・フリジア・92 BPM）息をひそめて見張る。低い刻みと、遠くの太鼓 ----------
def song_b():
    T = Track(92); bars = int(LEN / T.b(4)) + 2
    roots = ["E2", "E2", "F2", "E2", "D2", "E2", "F2", "G2"]
    for bar in range(bars):
        r = n(roots[bar % len(roots)])
        for k in range(8):
            acc = 1.0 if k in (0, 3, 6) else 0.6
            T.add(lp(sq(hz(r), T.b(0.45), 0.3), 600) * env(T.b(0.45), 0.003, 0.05) * 0.10 * acc, bar * 4 + k * 0.5)
        if bar % 2 == 0:
            T.add(pad([r + 12, r + 19, r + 25], T.b(8) + 1, cut=1400, a=2.5, r=2.0, vol=0.09), bar * 4)
    for bar in range(0, bars, 4): T.add(timpani(n("E2"), 0.55), bar * 4)
    for bar in range(2, bars):
        for k in range(4): T.add(rim(0.07), bar * 4 + k + 0.5)
    eerie = sine(hz(n("B4")), LEN + 2, vib=0.6, vr=0.3) * 0.5 + sine(hz(n("C5")), LEN + 2, vib=0.5, vr=0.23) * 0.5
    T.add(eerie * env(LEN + 2, 6, 3) * 0.025, 8)
    for bar in range(4, bars): T.add(kick(0.45), bar * 4)
    ending(T, ["E3", "B3", "E4", "G4"], "B5")
    return era32(reverb(T.x, 2.8, 0.38, 3000))

# ---------- C：Ashes（ハ短調・70 BPM）戦いのあとの静けさ。エレピと、ゆっくりしたビート ----------
def song_c():
    T = Track(70); bars = int(LEN / T.b(4)) + 2
    prog = [["C3", "Eb3", "G3", "Bb3", "D4"], ["Ab2", "C3", "Eb3", "G3"], ["F2", "Ab2", "C3", "Eb3", "G3"], ["G2", "C3", "D3", "F3", "Bb3"]]
    for bar in range(bars):
        ch = [n(s) for s in prog[bar % 4]]
        for hit in (0, 2.5):
            d = T.b(2.4)
            T.add(sum(fm(hz(m), d, 1.0, 1.2, 0.5) for m in ch) / len(ch) * env(d, 0.004, 0.6) * 0.16, bar * 4 + hit)
        T.add(tri(hz(ch[0] - 12), T.b(3.5)) * env(T.b(3.5), 0.01, 0.4) * 0.22, bar * 4)
    mel = [("G4", 0, 1.5), ("F4", 1.5, 0.5), ("Eb4", 2, 2), ("C4", 4, 3), (None, 7, 1),
           ("Eb4", 8, 1.5), ("F4", 9.5, 0.5), ("G4", 10, 1), ("Bb4", 11, 1), ("Ab4", 12, 3), ("G4", 15, 1)]
    for start in range(4, bars * 4, 16):
        for m, at, du in mel:
            if m:
                d = T.b(du); v = tri(hz(n(m)), d) * 0.5 + sine(hz(n(m)), d, vib=0.004 * hz(n(m)), vr=5) * 0.5
                v = lp(v, 2500) * env(d, 0.02, 0.25) * 0.10
                T.add(v, start + at); T.add(v * 0.35, start + at + 0.75)   # 付点8分のこだま
    for bar in range(2, bars):
        T.add(kick(0.6), bar * 4); T.add(kick(0.4), bar * 4 + 1.75); T.add(snare(0.22, 3000), bar * 4 + 2)
        for k in range(4): T.add(hat(0.03), bar * 4 + k + 0.5)
    vinyl = lp(rng.standard_normal(len(T.x)), 3000) * 0.006
    ending(T, ["C3", "G3", "Eb4", "D4", "G4"])        # 締めは和音だけ（鐘の音は、おりんのように聞こえて重すぎたので入れない）
    return era32(reverb(T.x + vinyl, 2.4, 0.3))

SONGS = {"a": ("a-cold-rain", song_a), "b": ("b-silent-watch", song_b), "c": ("c-ashes", song_c)}
name, f = SONGS[SONG]
finish(f(), sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else f"{D}/out/bgm/{name}-{round(LEN)}s.wav")
