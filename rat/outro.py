# 動画の終わりの演出を付けて、仕上げ前の動画（映像＋ゲームの音）にする。役割はこれだけ。
#   python3 outro.py <スポットのid> <short|long> [card|fade] [効果音]   … 省くと data/outro.json（台本の outro で上書き）の kind・se
#     card … まとめカード：最後の画面を止めてぼかし、スポット名・マップ・評価を出す。ずんだもんが締めのひと言
#     fade … 余韻：最後の場面をそのまま少し流しながら、黒へ溶けていく（音も一緒に消える）
#   入力：build_clip.py の body.mp4・body.json ／ 出力：clean-<kind>.mp4 と timeline-<kind>.json（mix.py が使う）
#   ゲームの音は、ここでつないだあとに、どの章も同じ大きさ（-18 LUFS）にそろえる
import json, os, sys
from PIL import Image, ImageFilter, ImageEnhance
from lib import parts as P
from lib.layouts import LAYOUTS

sid, fmt = sys.argv[1], sys.argv[2]
cfg = P.outro(sid); kind = sys.argv[3] if len(sys.argv) > 3 else cfg["kind"]
se = sys.argv[4] if len(sys.argv) > 4 else cfg.get("se")
sp = P.spot(sid); L = LAYOUTS[fmt](sp); work = f"{P.OUT}/{sid}/{fmt}"
B = json.load(open(f"{work}/body.json")); last = B["last"]; vlen = P.voice_lengths(sid)
out = f"{work}/outro-{kind}.mp4"
G = L.game

def game_frame(at):
    # 最後の場面の、at 秒の画面（本編と同じ大きさ・明るさにして）
    png = f"{work}/outro-game.png"
    src = ["-i", last["src"]] if last["kind"] == "still" else ["-ss", str(max(0, at)), "-i", last["src"]]
    P.ff(*src, "-frames:v", "1", "-vf", G["vf"], png)
    return Image.open(png).convert("RGB")

def compose(caption, game, card=False):
    im = L.under(caption).convert("RGBA"); im.paste(game, (G["x"], G["y"]))
    im.alpha_composite(L.over(caption))
    if card: im.alpha_composite(L.card())
    return im

if kind == "card":
    dur = cfg["card_sec"]; g = game_frame(last["end"] - 0.04)
    soft = ImageEnhance.Brightness(g.filter(ImageFilter.GaussianBlur(14))).enhance(0.55)
    a, b = f"{work}/outro-a.png", f"{work}/outro-b.png"
    compose(last["caption"], g).save(a); compose(cfg["follow"], soft, True).save(b)
    en, ja = cfg["line"]
    zdir = P.zunda_frames(f"{work}/zf-outro", dur, [(0.45, en, ja, vlen.get("outro", 1.2))], L.zunda["spec"], seed=9)
    fc = (f"[0:v]fps={P.FPS},format=yuv420p[a];[1:v]fps={P.FPS},format=yuv420p[b];[a][b]xfade=transition=fade:duration=0.4:offset=0.05[c];"
          f"[c][2:v]overlay={L.zunda['x']}:{L.zunda['y']}:eof_action=repeat,format=yuv420p[v]")
    P.ff("-loop", "1", "-t", "0.45", "-i", a, "-loop", "1", "-t", str(dur), "-i", b, "-framerate", str(P.FPS), "-i", f"{zdir}/%04d.png",
         "-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=48000:cl=stereo",
         "-filter_complex", fc, "-map", "[v]", "-map", "3:a", *P.ENC_V, *P.ENC_A, "-t", str(dur), out)
    extra = [{"at": round(B["duration"] + 0.45, 3), "voice": "voice/outro.wav"}]
    if se: extra.append({"at": round(max(0, B["duration"] - 0.15), 3), "se": f"assets/se/{se}.wav"})   # カードに切り替わるところで効果音
elif kind == "fade":
    dur = cfg["fade_sec"]
    under, over = f"{work}/outro-under.png", f"{work}/outro-over.png"
    L.under(last["caption"]).save(under); L.over(last["caption"]).save(over)
    zdir = P.zunda_frames(f"{work}/zf-outro", dur, [], L.zunda["spec"], seed=9)
    still = last["kind"] == "still"
    game = ["-loop", "1", "-t", str(dur), "-i", last["src"]] if still else ["-ss", str(last["end"]), "-t", str(dur), "-i", last["src"]]
    left = 0 if still else max(0.0, P.duration(last["src"]) - last["end"])     # 元の動画に、続きがどれだけ残っているか
    pad = f",tpad=stop_mode=clone:stop_duration={dur}" if left < dur else ""   # 足りない分は、最後の画面で止める
    fc = (f"[1:v]{G['vf']},fps={P.FPS}{pad}[g];[0:v][g]overlay={G['x']}:{G['y']}:shortest=1[b];[b][2:v]overlay=0:0[c];"
          f"[c][3:v]overlay={L.zunda['x']}:{L.zunda['y']}:eof_action=repeat,fade=t=out:st=0.2:d={dur - 0.2},format=yuv420p[v]")
    if still or left < 0.2:
        audio, amap = ["-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=48000:cl=stereo"], "4:a"
    else:
        audio, amap = [], "[a]"; fc += f";[1:a]aresample=48000,aformat=channel_layouts=stereo,apad,afade=t=out:st=0:d={dur}[a]"
    P.ff("-loop", "1", "-t", str(dur), "-i", under, *game, "-loop", "1", "-t", str(dur), "-i", over,
         "-framerate", str(P.FPS), "-i", f"{zdir}/%04d.png", *audio,
         "-filter_complex", fc, "-map", "[v]", "-map", amap, *P.ENC_V, *P.ENC_A, "-t", str(dur), out)
    extra = []
else:
    raise SystemExit(f"outro の kind が分かりません: {kind}")

lst = f"{work}/list-{kind}.txt"; open(lst, "w").write(f"file '{work}/body.mp4'\nfile '{out}'\n")
clean = f"{work}/clean-{kind}.mp4"
P.ff("-f", "concat", "-safe", "0", "-i", lst, "-c:v", "copy", "-af", "loudnorm=I=-18:TP=-2:LRA=11,aresample=48000", *P.ENC_A, "-movflags", "+faststart", clean)
json.dump({"spot": sid, "name": B["name"], "map": B["map"], "duration": round(P.duration(clean), 3), "events": B["events"] + extra,
           "outro": kind, "outro_at": B["duration"]}, open(f"{work}/timeline-{kind}.json", "w"), indent=1)
print(clean)
