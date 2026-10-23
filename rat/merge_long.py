# スポットごとの長尺の章（build_clip.py → outro.py の long。終わりの演出つき）をつないで、1本の長尺動画にする。役割はこれだけ。
#   python3 merge_long.py [マップのid …]   … 省くと data/maps.json の全マップ。並び順は maps.json → spots.json の順
#   マップが変わるところに、マップの扉（3秒。地図とスポットの★）を入れる
#   BGM は動画全体の長さで1曲作る（music.py c）ので、章のつなぎ目で曲が途切れない
#   出力：out/long/rat-spots.mp4 と、YouTube の説明欄にそのまま貼れる章の一覧 out/long/chapters.txt
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw
from lib import parts as P

MAPS = sys.argv[1:] or [m["id"] for m in P.maps()]
work = f"{P.OUT}/long"; os.makedirs(work, exist_ok=True)
CARD = 3.0

def title_card(mp, sps, dst):
    W, H = 1920, 1080
    im = Image.new("RGB", (W, H), P.DARK); d = ImageDraw.Draw(im)
    m = Image.open(P.path(mp["map_en"])).convert("RGB"); mh = 920; mw = round(m.width * mh / m.height)
    m = m.resize((mw, mh), Image.LANCZOS); mx, my = W - mw - 60, (H - mh) // 2; im.paste(m, (mx, my))
    for k, sp in enumerate(sps, 1):
        x, y = mx + sp["pos_pct"][0] / 100 * mw, my + sp["pos_pct"][1] / 100 * mh
        st = [(x + (22 if i % 2 == 0 else 9) * math.cos(math.radians(-90 + i * 36)), y + (22 if i % 2 == 0 else 9) * math.sin(math.radians(-90 + i * 36))) for i in range(10)]
        d.polygon(st, fill=P.YELLOW, outline=P.INK)
        d.text((x + 26, y), str(k), font=P.font(30), fill=P.YELLOW, anchor="lm", stroke_width=4, stroke_fill="#000000")
    lg = P.logo(70); im.paste(lg, (70, 90), lg)
    d.rounded_rectangle((70, 200, 290, 252), radius=12, fill=P.YELLOW)
    d.text((180, 226), "RAT SPOTS", font=P.font(30), fill=P.INK, anchor="mm")
    name = mp["name_en"]; fs = P.fit(d, name, 76, mx - 120)
    d.text((70, 330), name, font=P.font(fs), fill=P.WHITE, anchor="lm")
    for k, sp in enumerate(sps, 1):
        d.text((70, 430 + (k - 1) * 56), f"{k}.  {sp['name_en']}", font=P.font(fs // 2 + 4), fill=P.GREY, anchor="lm")
    png = dst.replace(".mp4", ".png"); im.save(png)
    P.ff("-loop", "1", "-t", str(CARD), "-i", png, "-f", "lavfi", "-t", str(CARD), "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", f"fps={P.FPS},format=yuv420p", *P.ENC_V, *P.ENC_A, "-t", str(CARD), dst)

parts, events, chapters, at = [], [], [], 0.0
stamp = lambda t: f"{int(t // 60)}:{int(t % 60):02d}"
for mid in MAPS:
    mp = P.map_of(mid)
    chap = lambda sid: (f"{P.OUT}/{sid}/long/clean-{P.outro(sid)['kind']}.mp4", f"{P.OUT}/{sid}/long/timeline-{P.outro(sid)['kind']}.json")
    sps = [s for s in P.spots()["spots"] if s["map"] == mid and P.has_script(s["id"]) and os.path.exists(chap(s["id"])[0])]
    if not sps: continue
    card = f"{work}/card-{mid}.mp4"; title_card(mp, sps, card)
    parts.append(card); chapters.append((at, mp["name_en"])); at += P.duration(card)
    for sp in sps:
        clip, tlp = chap(sp["id"]); tl = json.load(open(tlp)); last_outro = at + tl["outro_at"]
        for e in tl["events"]: events.append({"at": round(at + e["at"], 3), "voice": e["voice"], "base": f"{P.OUT}/{sp['id']}"})
        parts.append(clip); chapters.append((at, sp["name_en"])); at += P.duration(clip)

lst = f"{work}/list.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
joined = f"{work}/joined.mp4"
P.ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", joined)
total = P.duration(joined)
json.dump({"spot": "long", "duration": total, "events": events, "outro_at": last_outro}, open(f"{work}/timeline.json", "w"), indent=1)
bgm = f"{work}/bgm.wav"
# BGM は、最後の章の終わりの演出に入るところで、締めの和音になる
subprocess.run(["python3", f"{P.ROOT}/music.py", "c", str(math.ceil(total) + 1), bgm, str(last_outro)], check=True)
subprocess.run(["python3", f"{P.ROOT}/mix.py", joined, f"{work}/timeline.json", bgm, f"{work}/rat-spots.mp4"], check=True)
open(f"{work}/chapters.txt", "w").write("".join(f"{stamp(t)} {n}\n" for t, n in chapters))
print(open(f"{work}/chapters.txt").read())
