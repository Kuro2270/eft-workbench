# 1つのスポットの動画の本編（台本の場面）を、映像とゲームの音だけで作る。役割はこれだけ。
#   終わりの演出は outro.py、セリフの声・BGM は mix.py で重ねる
#   python3 build_clip.py <スポットのid> short   … 縦のショート用 → out/<id>/short/body.mp4
#   python3 build_clip.py <スポットのid> long    … 横の長尺の1章用 → out/<id>/long/body.mp4
#   どちらも、声を出す時刻の一覧 body.json と、最後の場面の情報（outro.py が使う）を書く
#   先に voice.py を実行しておくと、声の長さだけ口が動く
import json, os, sys
from lib import parts as P
from lib.layouts import LAYOUTS

sid, fmt = sys.argv[1], sys.argv[2]
sp, sc = P.spot(sid), P.script(sid); L = LAYOUTS[fmt](sp)
work = f"{P.OUT}/{sid}/{fmt}"; os.makedirs(work, exist_ok=True)
vlen = P.voice_lengths(sid)
parts, events, at = [], [], 0.0
for i, g in enumerate(sc["segments"]):
    dur, src = g["dur"], P.path(sc["sources"][g["src"]])
    under, over = f"{work}/under{i}.png", f"{work}/over{i}.png"
    L.under(g["caption"]).save(under); L.over(g["caption"]).save(over)
    lines = []
    for j, (t, text, *ja) in enumerate(g["lines"]):
        key = f"{i}_{j}"; ln = vlen.get(key, 0.35 + len(text) * 0.055)
        lines.append((t, text, ja[0] if ja else None, ln)); events.append({"at": round(at + t, 3), "voice": f"voice/{key}.wav"})
    zdir = P.zunda_frames(f"{work}/zf{i}", dur, lines, L.zunda["spec"], seed=i)
    game = ["-loop", "1", "-t", str(dur), "-i", src] if g["kind"] == "still" else ["-ss", str(g["start"]), "-t", str(dur), "-i", src]
    audio = ["-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=48000:cl=stereo"] if g["kind"] == "still" else []
    fc = (f"[1:v]{L.game['vf']},fps={P.FPS}[g];[0:v][g]overlay={L.game['x']}:{L.game['y']}:shortest=1[b];"
          f"[b][2:v]overlay=0:0[c];[c][3:v]overlay={L.zunda['x']}:{L.zunda['y']}:eof_action=repeat,format=yuv420p[v]")
    amap = "4:a" if g["kind"] == "still" else "[a]"
    if g["kind"] != "still": fc += ";[1:a]aresample=48000,aformat=channel_layouts=stereo[a]"
    seg = f"{work}/seg{i}.mp4"
    P.ff("-loop", "1", "-t", str(dur), "-i", under, *game, "-loop", "1", "-t", str(dur), "-i", over,
         "-framerate", str(P.FPS), "-i", f"{zdir}/%04d.png", *audio,
         "-filter_complex", fc, "-map", "[v]", "-map", amap, *P.ENC_V, *P.ENC_A, "-t", str(dur), seg)
    parts.append(seg); at += dur
lst = f"{work}/list.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
body = f"{work}/body.mp4"
P.ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", body)     # 音の大きさは、終わりの演出をつないだあとに outro.py でそろえる
last = sc["segments"][-1]
json.dump({"spot": sid, "name": sp["name_en"], "map": sp["map"], "duration": round(P.duration(body), 3), "events": events,
           "last": {"kind": last["kind"], "src": P.path(sc["sources"][last["src"]]), "end": round(last["start"] + last["dur"], 3), "caption": last["caption"]}},
          open(f"{work}/body.json", "w"), indent=1)
print(body)
