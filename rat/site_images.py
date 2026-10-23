# サイト（ラットスポットのページ）に出す画像を、Web 用の大きさにして assets/web/ に置く。役割はこれだけ。
#   python3 site_images.py   … スポットを足したとき・見取り図やサムネイルを作り直したときに1回
#   作るもの（サイトを作るとき site/rat.mjs が public/rat/ に写す）
#     map-<マップ>-<ja|en>.jpg … 見取り図（幅 1600）
#     <スポット>-view.jpg      … 待つ位置から見える景色（幅 960）
#     <スポット>-thumb.jpg     … ショート動画のサムネイル（thumb.py の thumb-short.jpg を 540×960 に。動画を押す前に見せる絵）
#     <スポット>-card.jpg      … SNS で動画を告知するときのリンクの絵（thumb.py の thumb-long.jpg。横長）
import os
from PIL import Image
from lib import parts as P

OUT = f"{P.ROOT}/assets/web"; os.makedirs(OUT, exist_ok=True)
def save(src, dst, width):
    im = Image.open(src).convert("RGB")
    if im.width > width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(f"{OUT}/{dst}", quality=84, optimize=True, progressive=True); print(f"{OUT}/{dst}", im.size)

for m in P.maps():
    for lang in ("ja", "en"): save(P.path(m[f"map_{lang}"]), f"map-{m['id']}-{lang}.jpg", 1600)
for sp in P.spots()["spots"]:
    if not P.has_script(sp["id"]): continue
    save(P.path(P.script(sp["id"])["sources"]["view"]), f"{sp['id']}-view.jpg", 960)
    th = f"{P.OUT}/{sp['id']}/thumb-short.jpg"
    if os.path.exists(th): save(th, f"{sp['id']}-thumb.jpg", 540)
    card = f"{P.OUT}/{sp['id']}/thumb-long.jpg"
    if os.path.exists(card): save(card, f"{sp['id']}-card.jpg", 1200)
