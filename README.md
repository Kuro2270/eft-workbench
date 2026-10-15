# EFT Workbench（https://eft-workbench.com）

Escape from Tarkov の無料ツール集。tarkov.dev のデータを使う。

## ページ（機能ごとに分けている）

| ページ | できること |
| --- | --- |
| `index.html` トップ | 何ができるかの一覧。各ツールへの入口 |
| `flip.html` 転売ボード | フリマ⇔トレーダーの転売。転売の条件（最低利益など）はこのページで |
| `loot.html` 持ち帰りティア表 | レイドで持ち帰る品を 1マスあたりの売値で S〜D に |
| `watch.html` 売り時・買い時 | 底値付近（買い場）・高値付近（売り場）のランキング、おすすめの値段、移動平均のグラフ |
| `settings.html` プレイヤー設定 | レベル・LL・インテルセンターなど。全ツール共通 |
| `about.html`・`privacy.html`・`contact.html`・`404.html` | 運営者情報・プライバシーポリシー・お問い合わせ・見つからないとき |

マップ作成（`tools/mapmaker.html`）は手元専用。公開するサイトには入れない（入口も出さない）。

## フォルダ

| 場所 | 役割 |
| --- | --- |
| `src/` | ツールの画面の本体（直すのはここ）。`app.html` に `data.js`・`market.js`・`market-ui.js`・`stock-ui.js` を埋め込む |
| `site/` | ページを作る処理。`tools.mjs`（ツールの5ページ）・`info.mjs`（運営者情報など）・`seo.mjs`（robots.txt・sitemap.xml）・`config.mjs`（サイト名・URL・お問い合わせフォーム） |
| `build.mjs` | `site/` の3つを順番に呼んで `public/` を作る |
| `public/` | 公開するもの（build.mjs が作る。直接は直さない）。Cloudflare Pages がここを配信する |
| `functions/data/[mode].js` | 公開サイトの `/data/<モード>.json` を返す（Cloudflare の保存場所 Workers KV から） |
| `snapshot.mjs` | 価格を tarkov.dev から取って `public/data/<モード>.json` に保存する |
| `.github/workflows/snapshot.yml` | 「価格｜価格を取って保存する」：1時間おきに snapshot.mjs を動かし、Workers KV に置く |
| `tools/` | 手元専用の道具（マップ作成） |
| `test/` | 確認用（`node test/test.mjs` など） |
| `start.bat` | 手元で開く（Windows。ダブルクリック） |

## 価格データの流れ

1. GitHub Actions「価格｜価格を取って保存する」が、毎時23分に3つのモード（PvP・PvP シーズナル・PvE）の価格を取る
2. Cloudflare の Workers KV（名前 `eft-snapshots`）に `regular.json`・`pvp-season.json`・`pve.json` として置く
3. サイトの `/data/<モード>.json` を開くと、`functions/data/[mode].js` がそれを返す
4. 画面は開いたときにまずこれを読んで、すぐ表示する（無ければその場で tarkov.dev から取る）

リポジトリには価格データをコミットしない（1時間おきに履歴が増えて重くなるため。`public/data/` は .gitignore）。

## 公開の手順（はじめの1回だけ）

1. **GitHub**：新しいリポジトリ `eft-workbench` を作り（非公開でよい）、このフォルダの中身を上げる
2. **Cloudflare Pages**：Workers & Pages → 作成 → Pages → Git に接続 → `eft-workbench` を選ぶ
   - ビルドコマンド：`node build.mjs`
   - ビルドの出力先：`public`
3. **独自ドメイン**：Pages のプロジェクト → カスタムドメイン → `eft-workbench.com` を追加（`www.eft-workbench.com` も足すとよい）
4. **価格の保存場所（Workers KV）**：ストレージとデータベース → Workers KV → 作成 → 名前 `eft-snapshots`。できた ID を控える
   - Pages のプロジェクト → 設定 → バインディング → KV 名前空間を追加 → 変数名 `SNAPSHOTS`、名前空間 `eft-snapshots` → 保存して、デプロイし直す
5. **GitHub に Cloudflare の鍵を登録**（リポジトリの Settings → Secrets and variables → Actions）
   - Secrets：`CLOUDFLARE_API_TOKEN`（Cloudflare → マイプロフィール → API トークン → カスタムトークン：アカウント／Workers KV Storage／編集）
   - Secrets：`CLOUDFLARE_ACCOUNT_ID`（Cloudflare のホーム右側の「アカウント ID」）
   - Variables：`KV_NAMESPACE_ID`（手順4で控えた ID）
6. **動作確認**：Actions の「価格｜価格を取って保存する」を手で1回押す → https://eft-workbench.com/data/regular.json が開ければ完了
7. **アクセス解析**：Pages のプロジェクト → メトリクス → Web Analytics を有効にする（Cookie を使わない）
8. **お問い合わせ**：Google フォームを作ったら、その URL を `site/config.mjs` の `FORM_URL` に入れて、`node build.mjs` で作り直す

## ふだんの起動（Windows・手元）

`start.bat` をダブルクリック → http://localhost:8000/public/index.html が開く。
マップ作成は http://localhost:8000/tools/mapmaker.html 。
手元で価格データを用意したいときは `node snapshot.mjs`（Node が要る。無くても、画面はその場で tarkov.dev から取る）。

## 確認

```
node build.mjs
node test/test.mjs
node test/test-pages.mjs
node test/test-market.mjs
node test/test-snapshot.mjs
```
