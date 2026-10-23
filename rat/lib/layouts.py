# 画面の組み立て方。役割はこれだけ（部品は lib/parts.py、動画にするのは build_clip.py）。
#   short … 縦 1080×1920 の YouTube ショート。ゲーム画面は左右を少し切って大きく
#   long  … 横 1920×1080。長尺動画の1章（マップごと・スポットごとにつなぐ）。ゲーム画面は全面
# どちらも、場面ごとに
#   under(caption)  … いちばん下の絵（不透明）
#   game            … ゲーム画面の置き場所と、ffmpeg の大きさの指定
#   over(caption)   … ゲーム画面の上に重ねる絵（透明な部分あり）
#   zunda           … ずんだもんの枠の位置（x, y）と、作り方（parts.zunda_frames の spec）
from PIL import Image, ImageDraw
from . import parts as P

LOOK = "eq=brightness=0.06:gamma=1.15"          # 暗い場面が見えるよう、少し明るく

class Short:
    name, W, H = "short", 1080, 1920
    # ショートでは、右側（いいね等のボタン）と下側（題・説明）に画面の部品が重なるので、
    # 大事なものは 左右 40〜940px・上下 120〜1600px の中に収める
    VY, VH = 385, 760                           # ゲーム画面（16:9 を高さ 760 にして、左右を切って幅 1080）
    CY, CHT = VY + VH + 12, 76                  # 場面の一言の帯
    MY = CY + CHT + 14                          # 地図とずんだもんの枠
    BOTTOM = 1610
    MAPW = 500
    LX, RX = 20, 1060                           # 地図とずんだもんの枠は、画面の横幅いっぱい（左右 20px）。右端はショートのボタンが少しかかる

    def __init__(s, sp):
        s.sp = sp; s.MH = s.BOTTOM - s.MY
        # 地図は横長に切り出して、枠の高さいっぱい・幅 MAPW に（ずんだもんの枠と、横幅を分け合う）
        mw = s.MAPW; s.MAP = P.map_inset(sp, mw, crop=(round(640 * mw / s.MH), 640))
        s.PX0 = s.LX + s.MAP.width + 16; s.PW = s.RX - s.PX0
        s.game = dict(x=0, y=s.VY, vf=f"scale=-2:{s.VH},crop=1080:{s.VH},{LOOK}")
        # ずんだもんは枠の右に大きく。吹き出しは左から、ずんだもんの顔の横へ（ずんだもんの肩に少しかかる）
        cw = 290
        s.zunda = dict(x=s.PX0, y=s.MY, spec=dict(w=s.PW, h=s.MH, cw=cw, cx=s.PW - cw // 2 - 4, drop=24,
                                                    bubble_w=s.PW - cw + 40, bubble_fs=30, tail="right", bubble_xy=(6, 160)))

    def under(s, caption):
        im = Image.new("RGB", (s.W, s.H), P.DARK); d = ImageDraw.Draw(im)
        lg = P.logo(76); im.paste(lg, (40, 120), lg)
        tx = 50 + lg.width + 26
        d.rounded_rectangle((tx, 136, tx + 200, 184), radius=12, fill=P.YELLOW)
        d.text((tx + 100, 160), "RAT SPOT", font=P.font(28), fill=P.INK, anchor="mm")
        d.text((tx + 222, 160), P.map_of(s.sp["map"])["name_en"], font=P.font(30), fill=P.GREY, anchor="lm")
        name = s.sp["name_en"]; fs = P.fit(d, name, 72, 880)
        d.text((50, 246), name, font=P.font(fs), fill=P.WHITE, anchor="lm", stroke_width=4, stroke_fill="#000000")
        P.ratings(d, s.sp, 50, 312, 450, 40, 26, 12, label_w=205)
        fs = P.fit(d, caption, 48, s.RX - s.LX - 60)
        d.rounded_rectangle((s.LX, s.CY, s.RX, s.CY + s.CHT), radius=16, fill="#1F2429")
        d.text(((s.LX + s.RX) // 2, s.CY + s.CHT // 2), caption, font=P.font(fs), fill=P.YELLOW, anchor="mm")
        im.paste(s.MAP, (s.LX, s.MY))
        d.rounded_rectangle((s.PX0, s.MY, s.RX, s.MY + s.MH), radius=18, fill="#1A1F24", outline="#4A5259", width=3)
        return im

    def over(s, caption): return Image.new("RGBA", (s.W, s.H), (0, 0, 0, 0))

    def card(s):
        # 終わりのまとめカード：ゲーム画面の場所に、スポット名・マップ・評価を大きく
        im = Image.new("RGBA", (s.W, s.H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        cy = s.VY + s.VH // 2
        d.rounded_rectangle((30, s.VY + 80, s.W - 30, s.VY + s.VH - 80), radius=24, fill=(14, 17, 20, 190), outline=(255, 214, 64, 160), width=3)
        name = s.sp["name_en"]; fs = P.fit(d, name, 76, 960)
        mp = P.map_of(s.sp["map"])
        d.text((s.W // 2, cy - 250), name, font=P.font(fs), fill=P.WHITE, anchor="mm")
        d.text((s.W // 2, cy - 178), f"（{s.sp['name_ja']}）", font=P.font(28), fill=P.GREY, anchor="mm")
        d.text((s.W // 2, cy - 122), f"{mp['name_en']}（{mp['name_ja']}）", font=P.font(30), fill=P.GREY, anchor="mm")
        P.ratings(d, s.sp, 268, cy - 40, 0, 82, 38, 17, cols=1, label_w=330, ja=True)   # 評価は1列に4段（日本語訳つき）
        return im

class Long:
    name, W, H = "long", 1920, 1080

    def __init__(s, sp):
        s.sp = sp
        s.MAP = P.map_inset(sp, 380)
        s.game = dict(x=0, y=0, vf=f"scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,{LOOK}")
        cw = 300
        s.zunda = dict(x=20, y=s.H - 480, spec=dict(w=520, h=480, cw=cw, cx=170, drop=30,
                                                     bubble_w=380, bubble_fs=32, tail="down", bubble_xy=(0, 0)))

    def under(s, caption): return Image.new("RGB", (s.W, s.H), "#000000")

    def over(s, caption):
        im = Image.new("RGBA", (s.W, s.H), (0, 0, 0, 0))
        band = Image.new("RGBA", (s.W, 190), (0, 0, 0, 0)); bd = ImageDraw.Draw(band)
        for y in range(190): bd.line((0, y, s.W, y), fill=(8, 10, 12, round(215 * (1 - y / 190) ** 0.8)))
        im.alpha_composite(band); d = ImageDraw.Draw(im)
        lg = P.logo(56); im.alpha_composite(lg, (40, 26))
        tx = 40 + lg.width + 24
        d.rounded_rectangle((tx, 32, tx + 180, 76), radius=11, fill=P.YELLOW)
        d.text((tx + 90, 54), "RAT SPOT", font=P.font(26), fill=P.INK, anchor="mm")
        d.text((tx + 200, 54), P.map_of(s.sp["map"])["name_en"], font=P.font(28), fill=P.GREY, anchor="lm")
        name = s.sp["name_en"]; fs = P.fit(d, name, 64, 1100)
        d.text((40, 126), name, font=P.font(fs), fill=P.WHITE, anchor="lm", stroke_width=4, stroke_fill="#000000")
        P.ratings(d, s.sp, 1180, 50, 370, 44, 26, 10, label_w=195)
        fs = P.fit(d, caption, 44, 760)
        d.rounded_rectangle((560, 972, 1360, 1044), radius=16, fill=(20, 24, 28, 215))
        d.text((960, 1008), caption, font=P.font(fs), fill=P.YELLOW, anchor="mm")
        im.alpha_composite(s.MAP.convert("RGBA"), (s.W - 40 - s.MAP.width, s.H - 40 - s.MAP.height))
        return im

def _long_card(s):
    im = Image.new("RGBA", (s.W, s.H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 420, 230, 1500, 800
    d.rounded_rectangle((x0, y0, x1, y1), radius=28, fill=(14, 17, 20, 200), outline=(255, 214, 64, 160), width=3)
    name = s.sp["name_en"]; fs = P.fit(d, name, 84, x1 - x0 - 80); mp = P.map_of(s.sp["map"])
    d.text((960, y0 + 85), name, font=P.font(fs), fill=P.WHITE, anchor="mm")
    d.text((960, y0 + 165), f"（{s.sp['name_ja']}）", font=P.font(32), fill=P.GREY, anchor="mm")
    d.text((960, y0 + 222), f"{mp['name_en']}（{mp['name_ja']}）", font=P.font(34), fill=P.GREY, anchor="mm")
    P.ratings(d, s.sp, x0 + 50, y0 + 330, 500, 110, 40, 15, label_w=290, ja=True)
    return im
Long.card = _long_card

LAYOUTS = {"short": Short, "long": Long}
