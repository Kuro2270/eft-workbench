# ずんだもんのセリフ（終わりのまとめカードの分も）を、英語の音声にする（Kokoro）。役割はこれだけ。
#   python3 voice.py <スポットのid>   … 台本（data/scripts/<id>.json）のセリフ → out/<id>/voice/<場面>_<番号>.wav と voice.json（長さ）
#   モデル：KOKORO_DIR（既定 rat/kokoro。リポジトリには入れない）に kokoro-v1.0.onnx・voices-v1.0.bin。声は KOKORO_VOICE（既定 af_heart＝MTG の英語チャンネルと同じ）
import json, os, sys, soundfile as sf
from kokoro_onnx import Kokoro
from lib import parts as P
sid = sys.argv[1]; out = f"{P.OUT}/{sid}/voice"; os.makedirs(out, exist_ok=True)
model = os.environ.get("KOKORO_DIR", f"{P.ROOT}/kokoro")
voice, speed = os.environ.get("KOKORO_VOICE", "af_heart"), float(os.environ.get("KOKORO_SPEED", "1.05"))
k = Kokoro(f"{model}/kokoro-v1.0.onnx", f"{model}/voices-v1.0.bin"); lengths = {}
for i, g in enumerate(P.script(sid)["segments"]):
    for j, (_, text, *_ja) in enumerate(g["lines"]):
        a, sr = k.create(text.replace("\n", " "), voice=voice, speed=speed, lang="en-us")
        key = f"{i}_{j}"; sf.write(f"{out}/{key}.wav", a, sr); lengths[key] = round(len(a) / sr, 3)
        print(key, lengths[key], text.replace("\n", " "))
# 終わりのまとめカードのセリフ
text = P.outro(sid)["line"][0]
a, sr = k.create(text.replace("\n", " "), voice=voice, speed=speed, lang="en-us")
sf.write(f"{out}/outro.wav", a, sr); lengths["outro"] = round(len(a) / sr, 3); print("outro", lengths["outro"], text.replace("\n", " "))
json.dump(lengths, open(f"{out}/voice.json", "w"), indent=1)
