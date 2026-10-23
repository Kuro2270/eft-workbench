# 映像（ゲームの音つき）に、セリフの声と BGM を重ねて仕上げる。役割はこれだけ。
#   python3 mix.py <clean.mp4> <timeline.json> <bgm.wav> <出力.mp4>
#   timeline.json の events（at＝秒, voice＝out/<スポット>/ からの場所。base があればそこから）に声を置く
#   events に se（効果音。rat/ からの場所）があれば、それも置く（効果音では、ゲームの音や BGM を下げない）
#   声が出ている間は、ゲームの音と BGM を少し下げる。BGM は最後に消えていく（終わりの演出があるときは、締めの和音の響きのまま）。最後に -14 LUFS（YouTube の目安）にそろえてから、全体を MASTER 倍にする
import json, os, sys
from lib import parts as P
video, tl, bgm, dst = sys.argv[1:5]
T = json.load(open(tl)); dur = P.duration(video)
fade = 0.5 if "outro_at" in T else 2.5                  # 終わりの演出があるときは、BGM が締めの和音で終わるので、最後にほんの少しだけ
BGM_DB, GAME_VOL, VOICE_VOL = -12, 0.9, 1.1             # BGM は控えめに（ゲームの足音・銃声が主役）
MASTER = 0.75                                           # 仕上げの全体の音量（-14 LUFS にそろえたあと、少し下げる）
base = lambda e: e.get("base") or f"{P.OUT}/{T['spot']}"
inputs = ["-i", video, "-i", bgm]
fc = [f"[0:a]volume={GAME_VOL}[game]", f"[1:a]atrim=0:{dur},asetpts=N/SR/TB,volume={BGM_DB}dB,afade=t=out:st={max(0, dur - fade)}:d={fade}[bgm]"]
voices = [e for e in T["events"] if "voice" in e]; ses = [e for e in T["events"] if "se" in e]
for k, e in enumerate(voices):
    inputs += ["-i", f"{base(e)}/{e['voice']}"]; ms = round(e["at"] * 1000)
    fc.append(f"[{k + 2}:a]aresample=48000,aformat=channel_layouts=stereo,volume={VOICE_VOL},adelay={ms}|{ms}[v{k}]")
n = len(voices)
fc.append("".join(f"[v{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad,atrim=0:{dur},asplit[vk][vo]")
for k, e in enumerate(ses):
    inputs += ["-i", P.path(e["se"])]; ms = round(e["at"] * 1000)
    fc.append(f"[{n + k + 2}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms},apad,atrim=0:{dur}[s{k}]")
fc.append("[game][bgm]amix=inputs=2:normalize=0[bed]")
fc.append("[bed][vk]sidechaincompress=threshold=0.02:ratio=5:attack=15:release=350[duck]")
fc.append(f"[duck][vo]{''.join(f'[s{k}]' for k in range(len(ses)))}amix=inputs={2 + len(ses)}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,volume={MASTER},aresample=48000[a]")
P.ff(*inputs, "-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[a]", "-c:v", "copy", *P.ENC_A, "-movflags", "+faststart", "-t", str(dur), dst)
print(dst)
