# スポットの動画のサムネイルを作る。役割はこれだけ。
#   python3 thumb.py <スポットのid>   … out/<id>/thumb-short.jpg（1080×1920、ショート用）と thumb-long.jpg（1280×720、長尺用）
#   見た目は MTG の動画のサムネイルにそろえる：上にロゴと赤い帯、キャラクターと大きな見出し（1行目は黄色）
#   中身は台本の thumbnail（見出し・日本語のひと言・札・背景にする画面）
#   ショートのサムネイルは、一覧では横長（3:2 くらい）に切られて出ることがあるので、見出しとキャラクターは縦の真ん中に集める
import os, sys
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from lib import parts as P

sid = sys.argv[1]; sp, sc = P.spot(sid), P.script(sid); TH = sc["thumbnail"]
work = f"{P.OUT}/{sid}"; os.makedirs(work, exist_ok=True)
TITLE = f"{P.ROOT}/assets/fonts/BlackOpsOne-Regular.ttf"; JA = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
tf = lambda s: ImageFont.truetype(TITLE, s); jf = lambda s: ImageFont.truetype(JA, s)
RED = "#D9412B"
ZUNDA = Image.open(f"{P.ROOT}/assets/zunda/thumb.png").convert("RGBA")

def frame():
    src, at = TH["bg"]; png = f"{work}/thumb-bg.png"
    P.ff("-ss", str(at), "-i", P.path(sc["sources"][src]), "-frames:v", "1", png)
    im = Image.open(png).convert("RGB")
    im = ImageEnhance.Contrast(im).enhance(1.35); im = ImageEnhance.Brightness(im).enhance(1.05)
    return im

def cover(im, W, H, cx=0.5, cy=0.5):
    r = max(W / im.width, H / im.height); im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    l = round((im.width - W) * cx); t = round((im.height - H) * cy); return im.crop((l, t, l + W, t + H)).convert("RGBA")

def shade(im, box, alpha_top, alpha_bottom):
    x0, y0, x1, y1 = box; g = Image.new("RGBA", (x1 - x0, y1 - y0)); d = ImageDraw.Draw(g)
    for y in range(y1 - y0):
        a = alpha_top + (alpha_bottom - alpha_top) * y / max(1, y1 - y0 - 1); d.line((0, y, x1 - x0, y), fill=(5, 8, 12, round(a)))
    im.alpha_composite(g, (x0, y0))

def stroke(s): return dict(stroke_width=max(3, round(s * 0.09)), stroke_fill="#06101C")

def band(d, right, cy, text, size):
    w = d.textlength(text, font=P.font(size)) + 70; h = round(size * 1.55)
    d.rounded_rectangle((right - w, cy - h / 2, right, cy + h / 2), radius=18, fill=RED, outline=P.WHITE, width=6)
    d.text((right - w / 2, cy), text, font=P.font(size), fill=P.WHITE, anchor="mm")

def zunda(im, h, x, bottom, glow=True):
    w = round(ZUNDA.width * h / ZUNDA.height); z = ZUNDA.resize((w, h), Image.LANCZOS)
    if glow:
        g = Image.new("RGBA", im.size, (0, 0, 0, 0)); ImageDraw.Draw(g).ellipse((x - 40, bottom - h - 20, x + w + 40, bottom + 60), fill=(255, 214, 64, 90))
        im.alpha_composite(g.filter(ImageFilter.GaussianBlur(70)))
    im.alpha_composite(z, (x, bottom - h))

def headline(d, x_right, y, lines, sizes, max_w):
    for i, (t, s) in enumerate(zip(lines, sizes)):
        while d.textlength(t, font=tf(s)) > max_w: s -= 4
        d.text((x_right, y), t, font=tf(s), fill=P.YELLOW if i == 0 else P.WHITE, anchor="ra", **stroke(s)); y += round(s * 1.08)
    return y

def short():
    W, H = 1080, 1920; im = cover(frame(), W, H, 0.5); d = ImageDraw.Draw(im)
    shade(im, (0, 0, W, 560), 235, 40); shade(im, (0, 1200, W, H), 40, 235); shade(im, (0, 560, W, 1200), 40, 40)
    # 見出しの後ろ（右側）を、左から右へだんだん暗く。上下の端もぼかして、線が出ないように
    import numpy as np
    xs = np.linspace(0, 1, 760)[None, :]; ys = np.linspace(0, 1, 1000)[:, None]
    a = 150 * xs * np.clip(np.minimum(ys, 1 - ys) / 0.18, 0, 1)
    g = np.zeros((1000, 760, 4), np.uint8); g[..., 0], g[..., 1], g[..., 2], g[..., 3] = 5, 8, 12, a.astype(np.uint8)
    im.alpha_composite(Image.fromarray(g, "RGBA"), (W - 760, 470))
    # 上：ロゴ・赤い帯・マップ名
    lg = P.logo(120); im.alpha_composite(lg, (50, 150)); d = ImageDraw.Draw(im)
    band(d, W - 50, 210, "RAT SPOT", 60)
    d.text((W // 2, 360), P.map_of(sp["map"])["name_en"].upper(), font=tf(64), fill=P.WHITE, anchor="mm", **stroke(64))
    # 真ん中（3:2 で切られても残る範囲 y 600〜1320）：左にずんだもん、右に見出し
    zunda(im, 760, -40, 1330); d = ImageDraw.Draw(im)
    y = headline(d, W - 40, 640, TH["main"], [150, 128, 128], 620)
    d.text((W - 40, y + 30), TH["ja"], font=jf(62), fill=P.WHITE, anchor="ra", **stroke(62))
    # 下：地図と札（縦のまま表示されるときだけ見える）
    m = P.map_inset(sp, 640, legend=False, crop=(900, 560)); im.alpha_composite(m.convert("RGBA"), (40, 1400)); d = ImageDraw.Draw(im)
    bw = d.textlength(TH["badge"], font=tf(70)) + 60
    d.rounded_rectangle((W - 40 - bw, 1460, W - 40, 1580), radius=20, fill=P.YELLOW, outline="#06101C", width=6)
    d.text((W - 40 - bw / 2, 1520), TH["badge"], font=tf(70), fill=P.INK, anchor="mm")
    im.convert("RGB").save(f"{work}/thumb-short.jpg", quality=92)
    # 確認用：3:2 で切られたときの見え方
    im.convert("RGB").crop((0, 600, 1080, 1320)).resize((540, 360)).save(f"{work}/thumb-short-crop-check.jpg", quality=88)

def long():
    W, H = 1920, 1080; TOP = 360; im = cover(frame(), W, H, 0.5); d = ImageDraw.Draw(im)
    shade(im, (0, 0, W, TOP), 245, 205); d = ImageDraw.Draw(im)
    d.line((50, TOP, W - 50, TOP), fill=(255, 255, 255, 64), width=2)
    lg = P.logo(150); im.alpha_composite(lg, (50, 40)); d = ImageDraw.Draw(im)
    d.text((56, 285), P.map_of(sp["map"])["name_en"].upper(), font=tf(66), fill=P.WHITE, anchor="lm", **stroke(66))
    band(d, W - 150, TOP // 2, "RAT SPOT", 96)
    g = Image.new("RGBA", (1250, H - TOP)); gd = ImageDraw.Draw(g)
    for x in range(1250): gd.line((x, 0, x, H - TOP), fill=(5, 8, 12, round(190 * x / 1249)))
    im.alpha_composite(g, (W - 1250, TOP)); d = ImageDraw.Draw(im)
    zunda(im, H - TOP + 20, 10, H + 10); d = ImageDraw.Draw(im)
    y = headline(d, W - 50, TOP + 40, TH["main"], [190, 150, 150], 1150)
    d.text((W - 50, y + 20), TH["ja"], font=jf(76), fill=P.WHITE, anchor="ra", **stroke(76))
    bw = d.textlength(TH["badge"], font=tf(64)) + 56
    d.rounded_rectangle((680, H - 210, 680 + bw, H - 100), radius=18, fill=P.YELLOW, outline="#06101C", width=6)
    d.text((680 + bw / 2, H - 155), TH["badge"], font=tf(64), fill=P.INK, anchor="mm")
    im.convert("RGB").resize((1280, 720), Image.LANCZOS).save(f"{work}/thumb-long.jpg", quality=92)

short(); long(); print(work)
