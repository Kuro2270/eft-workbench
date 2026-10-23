# ラットスポット（動画とサイトの元データ）

ラットスポット（待ち伏せのポイント）の、動画を作る道具と、サイトのラットスポットのページの元データ。
スポットごとに、縦のショート（1080×1920）と長尺の1章（1920×1080）を同じ台本から作る。長尺は、章をマップごとにつないで1本にする。
このフォルダは公開されない（サイトに出るのは、site/rat.mjs が public/rat/ に写す画像と、rat.html に埋め込むデータだけ）。

## 置き場所
| 場所 | 中身 |
| --- | --- |
| `data/maps.json` | マップの一覧（サイト・長尺動画では、この順に並べる）。見取り図の画像（日本語・英語） |
| `data/spots.json` | スポットの一覧：名前・位置（見取り図の左上からの %）・向き・評価・行き方・ショート動画の URL（`videos.short`） |
| `data/scripts/<スポット>.json` | 動画の台本（元の動画・場面・画面下の一言・セリフ［出す秒, 英語, 日本語訳］・サムネイル）。台本があるスポットだけがサイトに載る |
| `data/outro.json` | 動画の終わり方（まとめカード・効果音） |
| `assets/` | 見取り図、ずんだもん、スポットの静止画、ロゴ、フォント（Black Ops One：SIL Open Font License）、効果音 |
| `assets/web/` | サイトに出す画像（`site_images.py` が作る） |
| `sources/` | 元の動画（大きいのでリポジトリには入れない。手元だけ） |
| `kokoro/` | 英語の読み上げのモデル（リポジトリには入れない） |
| `out/` | できた動画など（リポジトリには入れない。長尺はできあがるまで公開しない） |

必要なもの：Python（Pillow・numpy・scipy・opencv-python・soundfile・kokoro-onnx）、ffmpeg、日本語フォント（Noto Sans CJK JP）

## スポットを1つ足すとき
1. `sources/<スポット>/` に元の動画を置き、`data/scripts/<スポット>.json`（台本）を書き、`data/spots.json` に1件足す
2. 動画を作る
```
python3 se.py                               # 効果音（最初に1回だけ）
python3 voice.py <id>                       # セリフの声（終わりのひと言も）
python3 build_clip.py <id> short            # ショートの本編（映像＋ゲームの音）
python3 outro.py <id> short                 # 終わりの演出をつなぐ → clean-card.mp4・timeline-card.json
python3 music.py c <秒数> out/<id>/short/bgm.wav <締めの和音の秒>   # 秒数＝timeline の duration、締め＝outro_at
python3 mix.py out/<id>/short/clean-card.mp4 out/<id>/short/timeline-card.json out/<id>/short/bgm.wav out/<id>/short/rat-<id>.mp4
python3 thumb.py <id>                       # サムネイル（ショート用・長尺用）
```
3. YouTube に上げたら、ショートの URL を `data/spots.json` の `videos.short` に、SNS で告知するときのひと言を `summary`（英語・日本語）に入れる
4. サイト用の画像を作る：`python3 site_images.py`
5. リポジトリの一番上で `node build.mjs`（サイトのラットスポットのページに出る）
6. GitHub に上げたら、Actions の「SNS｜動画を Bluesky で告知する」を押す（まだ告知していない動画を1本告知する）

## 長尺（作業中は公開しない）
長尺の章は、上の 2 の `short` を `long` にして `build_clip.py` → `outro.py` まで。そのあと
```
python3 merge_long.py [マップのid …]        # → out/long/rat-spots.mp4 と chapters.txt（説明欄に貼る章の一覧）
```

## チャンネルの画像
`python3 channel_art.py` … YouTube のバナーとアイコン（out/channel/）
