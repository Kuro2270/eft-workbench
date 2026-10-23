# ラットスポット動画の部品（データの読み込み・文字・ロゴ・地図・評価・吹き出し・ずんだもん・ffmpeg）。
# 画面の組み立て方（縦のショート／横の長尺）は lib/layouts.py。ここは、どちらの形でも使うものだけ。
import json, math, os, shutil, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f"{ROOT}/out"
FPS = 30
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
YELLOW, WHITE, GREY, INK, DARK = "#FFD640", "#FFFFFF", "#C9D1D8", "#14171A", "#121518"

def font(size): return ImageFont.truetype(FONT, size)
def path(p): return p if os.path.isabs(p) else f"{ROOT}/{p}"
def load(name): return json.load(open(f"{ROOT}/data/{name}", encoding="utf-8"))

# ---------- データ ----------
def spots(): return load("spots.json")
def spot(sid): return next(s for s in spots()["spots"] if s["id"] == sid)
def rating_keys(): return spots()["rating_keys"]
def maps(): return load("maps.json")["maps"]
def map_of(mid): return next(m for m in maps() if m["id"] == mid)
def script(sid): return load(f"scripts/{sid}.json")
def has_script(sid): return os.path.exists(f"{ROOT}/data/scripts/{sid}.json")
def outro(sid):
    # 終わり方の設定（data/outro.json に、台本の outro を上書き）
    o = load("outro.json"); o.update(script(sid).get("outro", {})); return o
def voice_lengths(sid):
    p = f"{OUT}/{sid}/voice/voice.json"
    return json.load(open(p)) if os.path.exists(p) else {}

# ---------- 文字 ----------
def fit(d, text, size, max_w):
    while size > 10 and d.textlength(text, font=font(size)) > max_w: size -= 2
    return size

# ---------- タルコフのロゴ ----------
#   assets/logo/tarkov.png（透明な背景の PNG）を置くと、それを使う。無いあいだは、文字で仮に出す
def logo(height):
    p = f"{ROOT}/assets/logo/tarkov.png"
    if os.path.exists(p):
        im = Image.open(p).convert("RGBA")
        return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    s1, s2 = round(height * 0.30), round(height * 0.58)
    w = round(max(ImageDraw.Draw(Image.new("L", (1, 1))).textlength("TARKOV", font=font(s2)), 10) + 8)
    im = Image.new("RGBA", (w, height), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.text((w // 2, round(height * 0.17)), "ESCAPE FROM", font=font(s1), fill=WHITE, anchor="mm")
    d.text((w // 2, round(height * 0.66)), "TARKOV", font=font(s2), fill=WHITE, anchor="mm")
    return im

# ---------- 地図（スポットのまわりを切り出して、★＝待つ位置、扇＝見る向き） ----------
CROP = (760, 640)            # 切り出す大きさ（地図の画像の px）の基本。★は真ん中より少し左上に来る
def map_inset(sp, width, legend=True, crop=CROP):
    mp = map_of(sp["map"]); im = Image.open(path(mp["map_en"])).convert("RGBA")
    x, y = sp["pos_pct"][0] / 100 * im.width, sp["pos_pct"][1] / 100 * im.height
    cw, chh = crop
    left = min(max(0, round(x - cw * 0.48)), im.width - cw); top = min(max(0, round(y - chh * 0.52)), im.height - chh)
    m = im.crop((left, top, left + cw, top + chh)); px, py = x - left, y - top
    ov = Image.new("RGBA", m.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
    ang, spread, r = sp["facing_deg"], 50, 150
    o.polygon([(px, py)] + [(px + r * math.cos(math.radians(a)), py + r * math.sin(math.radians(a))) for a in range(ang - spread // 2, ang + spread // 2 + 1, 2)],
              fill=(255, 214, 64, 110), outline=(255, 214, 64, 255))
    o.polygon([(px + (24 if i % 2 == 0 else 10) * math.cos(math.radians(-90 + i * 36)), py + (24 if i % 2 == 0 else 10) * math.sin(math.radians(-90 + i * 36))) for i in range(10)],
              fill=(255, 214, 64, 255), outline=(20, 23, 26, 255))
    m = Image.alpha_composite(m, ov)
    m = m.resize((width, round(m.height * width / m.width)), Image.LANCZOS); d = ImageDraw.Draw(m)
    if legend:
        lh = max(30, round(width * 0.085)); fs = round(lh * 0.6)
        d.rectangle((0, m.height - lh, m.width, m.height), fill=DARK)
        d.text((14, m.height - lh // 2), "★ = spot     fan = looking", font=font(fs), fill=GREY, anchor="lm")
    d.rectangle((0, 0, m.width - 1, m.height - 1), outline="#4A5259", width=3)
    return m

# ---------- 評価（●の数） ----------
def ratings(d, sp, x, y, colw, rowh, fs, dot, cols=2, label_w=None, ja=False):
    # ja … 英語の下に（）で日本語訳を小さく出す
    for i, (k, meta) in enumerate(rating_keys().items()):
        cx0, cy = x + (i % cols) * colw, y + (i // cols) * rowh
        if ja:
            d.text((cx0, cy - round(fs * 0.32)), meta["en"], font=font(fs), fill="#E8ECEF", anchor="lm")
            d.text((cx0 - round(fs * 0.3), cy + round(fs * 0.55)), f"（{meta['ja']}）", font=font(round(fs * 0.6)), fill=GREY, anchor="lm")
        else:
            d.text((cx0, cy), meta["en"], font=font(fs), fill="#E8ECEF", anchor="lm")
        lw = label_w or round(fs * 7.6)
        for j in range(5):
            cx = cx0 + lw + j * dot * 2.9
            d.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=YELLOW if j < sp["ratings"][k] else "#3A4249")

# ---------- 吹き出し ----------
#   text … 英語（\n で改行）。ja … 下に（）で小さく出す日本語（\n で改行。入りきらないときは幅で折り返す）
#   tail … "down"（下にいるずんだもんへ）か "right"（右にいるずんだもんへ）
def wrap_ja(text, fs, max_w):
    probe = ImageDraw.Draw(Image.new("L", (1, 1))); lines, cur = [], ""
    for ch in text:
        if cur and probe.textlength(cur + ch, font=font(fs)) > max_w and ch not in "、。！？…）": lines.append(cur); cur = ch
        else: cur += ch
    return lines + ([cur] if cur else [])

def bubble(text, width, fs, tail="down", ja=None):
    lines = text.split("\n"); probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    pad = 22 if tail == "right" else 10
    inner = width - pad - 10 - 24
    while fs > 12 and max(probe.textlength(l, font=font(fs)) for l in lines) > inner: fs -= 2
    js = max(20, round(fs * 0.72))
    jl = [w for part in f"（{ja}）".split("\n") for w in wrap_ja(part, js, inner)] if ja else []
    lh, jh = fs + 10, js + 8
    bh = 24 + len(lines) * lh + (len(jl) * jh + 4 if jl else 0)
    im = Image.new("RGBA", (width, bh + (22 if tail == "down" else 0)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x1 = width - pad if tail == "right" else width - 10
    d.rounded_rectangle((10, 0, x1, bh), radius=18, fill=WHITE)
    if tail == "down": d.polygon([(width // 2 - 18, bh - 2), (width // 2 + 18, bh - 2), (width // 2 + 4, bh + 20)], fill=WHITE)
    else: d.polygon([(x1 - 2, bh // 2 - 14), (x1 - 2, bh // 2 + 14), (width - 1, bh // 2 + 4)], fill=WHITE)
    cx = (10 + x1) // 2
    for i, l in enumerate(lines): d.text((cx, 12 + i * lh + lh // 2), l, font=font(fs), fill=INK, anchor="mm")
    y0 = 12 + len(lines) * lh + 4
    for i, l in enumerate(jl): d.text((cx, y0 + i * jh + jh // 2), l, font=font(js), fill="#5A6470", anchor="mm")
    return im

# ---------- ずんだもん（口パク・まばたき・吹き出し）を、こま送りの透明な画像にする ----------
#   spec … { w, h：枠の大きさ, cw：ずんだもんの幅, cx：ずんだもんの中心の x, drop：下で切る量（手元）,
#            bubble_w, bubble_fs, tail, bubble_xy：吹き出しの左上（tail=right なら縦は真ん中ぞろえの目安） }
def _sprites(cw):
    src = {f"{e}_{m}": Image.open(f"{ROOT}/assets/zunda/{e}_{m}.png").convert("RGBA") for e in ("open", "closed") for m in ("closed", "half", "open")}
    ch = round(cw * 380 / 372)
    return {k: v.resize((cw, ch), Image.LANCZOS) for k, v in src.items()}, ch
TALK = ["half", "open", "half", "closed"]                 # 口パクの順（1こま＝3フレーム）

def zunda_frames(fdir, dur, lines, spec, seed=0):
    # lines … [(出す秒, 英語, 日本語訳, 声の長さ)]
    shutil.rmtree(fdir, ignore_errors=True); os.makedirs(fdir)
    spr, ch = _sprites(spec["cw"])
    bubbles = [(t, bubble(en, spec["bubble_w"], spec["bubble_fs"], spec["tail"], ja), L) for t, en, ja, L in lines]
    for f in range(round(dur * FPS)):
        t = f / FPS
        cur = [b for b in bubbles if b[0] <= t]; cur = cur[-1] if cur else None
        talking = cur and t - cur[0] < cur[2]
        mouth = TALK[(f // 3) % 4] if talking else "closed"
        eye = "closed" if (f + seed * 17) % 96 in (0, 1, 2, 3) else "open"   # 約3秒ごとにまばたき
        im = Image.new("RGBA", (spec["w"], spec["h"]), (0, 0, 0, 0))
        sp = spr[f"{eye}_{mouth}"].crop((0, 0, spec["cw"], ch - spec["drop"]))
        im.alpha_composite(sp, (spec["cx"] - spec["cw"] // 2, spec["h"] - sp.height))
        if cur:
            bx, by = spec["bubble_xy"]
            if spec["tail"] == "right": by = max(0, by - cur[1].height // 2)
            im.alpha_composite(cur[1], (bx, by))
        im.save(f"{fdir}/{f:04d}.png")
    return fdir

# ---------- ffmpeg ----------
ENC_V = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", str(FPS), "-pix_fmt", "yuv420p"]
ENC_A = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
def ff(*args): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)
def duration(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout)
