# YouTube チャンネル「Rat of Tarkov」のバナーとアイコンを作る。役割はこれだけ（設定は YouTube Studio で手作業）。
#   python3 channel_art.py   … out/channel/banner.png（2560×1440）・icon.png（800×800）
#   コンセプト：「エイムが下手でも、タルコフは勝てる」。待ち伏せ（ラット）で勝つチャンネル
#   バナーは端末で見える範囲が違う。文字とキャラクターは、どの端末でも見える真ん中の 1546×423 に収める
#   文字のフォント：assets/fonts/BlackOpsOne-Regular.ttf（SIL Open Font License）
import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont
from lib import parts as P

OUT = f"{P.OUT}/channel"; os.makedirs(OUT, exist_ok=True)
TITLE_FONT = f"{P.ROOT}/assets/fonts/BlackOpsOne-Regular.ttf"
JA_BLACK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
def tfont(s): return ImageFont.truetype(TITLE_FONT, s)
def jfont(s): return ImageFont.truetype(JA_BLACK, s)
ZUNDA = Image.open(f"{P.ROOT}/assets/zunda/thumb.png").convert("RGBA")
BG = f"{P.ROOT}/assets/spots/streets-zmejskij-tree/view.jpg"

def backdrop(W, H):
    # 背景：木の上からの景色を、暗く・色うすく・少しぼかして（文字とキャラクターが主役）
    im = Image.open(BG).convert("RGB"); r = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    im = ImageEnhance.Color(im.filter(ImageFilter.GaussianBlur(4))).enhance(0.35)
    im = ImageEnhance.Brightness(im).enhance(0.38).convert("RGBA")
    # 周りを暗く（真ん中が見やすいように）
    v = Image.new("L", (W, H), 0); d = ImageDraw.Draw(v)
    d.ellipse((-W * 0.15, -H * 0.35, W * 1.15, H * 1.35), fill=255); v = v.filter(ImageFilter.GaussianBlur(min(W, H) // 5))
    dark = Image.new("RGBA", (W, H), (6, 8, 10, 255)); im = Image.composite(im, dark, v)
    return im

def banner():
    W, H = 2560, 1440; sx, sy, sw, sh = (W - 1546) // 2, (H - 423) // 2, 1546, 423
    im = backdrop(W, H); d = ImageDraw.Draw(im)
    # 左：フードのずんだもん（見える範囲の高さいっぱい。下端は見える範囲の下端で切る）
    ch = sh + 40; cw = round(ZUNDA.width * ch / ZUNDA.height)
    z = ZUNDA.resize((cw, ch), Image.LANCZOS).crop((0, 0, cw, sh + 10))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse((sx + 10, sy + 40, sx + cw + 30, sy + sh + 60), fill=(255, 214, 64, 60)); glow = glow.filter(ImageFilter.GaussianBlur(60))
    im.alpha_composite(glow); im.alpha_composite(z, (sx + 20, sy + sh - z.height + 10))
    # 右：チャンネル名・ひと言（英語と日本語）・中身
    x = sx + cw + 70; right = sx + sw - 10
    title = "RAT OF TARKOV"; fs = 150
    while d.textlength(title, font=tfont(fs)) > right - x: fs -= 4
    d.text((x, sy + 18), title, font=tfont(fs), fill=P.WHITE, stroke_width=3, stroke_fill="#000000")
    d.text((x + 4, sy + 200), "Bad aim? You can still win.", font=P.font(64), fill=P.YELLOW, anchor="lm", stroke_width=2, stroke_fill="#000000")
    d.text((x + 4, sy + 280), "エイムが下手でも、タルコフは勝てる。", font=jfont(52), fill=P.WHITE, anchor="lm", stroke_width=2, stroke_fill="#000000")
    cx = x + 4
    for chip in ["AMBUSH SPOTS", "ROUTE", "MAP", "REAL KILLS"]:
        w = d.textlength(chip, font=P.font(30)) + 40
        d.rounded_rectangle((cx, sy + 340, cx + w, sy + 392), radius=10, outline=P.YELLOW, width=3, fill=(10, 12, 14, 170))
        d.text((cx + w / 2, sy + 366), chip, font=P.font(30), fill=P.YELLOW, anchor="mm"); cx += w + 16
    im.convert("RGB").save(f"{OUT}/banner.png", optimize=True)
    # 確認用：スマートフォン・パソコンで見える範囲に線を引いたもの
    chk = im.copy(); c = ImageDraw.Draw(chk)
    c.rectangle((sx, sy, sx + sw, sy + sh), outline="#FF3B30", width=4); c.rectangle((0, sy, W - 1, sy + sh), outline="#30A0FF", width=4)
    chk.convert("RGB").resize((1280, 720)).save(f"{OUT}/banner-check.jpg", quality=88)

def icon():
    S = 800; im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bg = Image.new("RGBA", (S, S), (26, 30, 35, 255)); g = Image.new("RGBA", (S, S), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.ellipse((90, 80, 710, 700), fill=(255, 214, 64, 150)); g = g.filter(ImageFilter.GaussianBlur(70)); bg.alpha_composite(g)   # 小さく出ても、黒いフードの形が分かるように後ろを明るく
    # ずんだもんの顔が真ん中に来るように。下端はアイコンの下まで届かせる（絵の切れ目が見えないように）
    zw = 760; zh = round(ZUNDA.height * zw / ZUNDA.width); z = ZUNDA.resize((zw, zh), Image.LANCZOS)
    bg.alpha_composite(z, ((S - zw) // 2 + 8, S - zh + 2))
    ring = ImageDraw.Draw(bg); ring.ellipse((14, 14, S - 14, S - 14), outline=P.YELLOW, width=16)
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255)
    im.paste(bg, (0, 0), mask); im.save(f"{OUT}/icon.png", optimize=True)
    prev = Image.new("RGB", (S, S), "#FFFFFF"); prev.paste(im, (0, 0), im); prev.resize((200, 200)).save(f"{OUT}/icon-small-check.png")

banner(); icon(); print(OUT)
