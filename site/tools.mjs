/* ツールのページを src/app.html から作る。
   ・public/index.html     … トップ（何ができるかの一覧）
   ・public/flip.html      … 転売ボード
   ・public/loot.html      … 持ち帰りティア表
   ・public/watch.html     … 売り時・買い時
   ・public/rat.html       … ラットスポット（データと画像は site/rat.mjs）
   ・public/settings.html  … プレイヤー設定（全ツール共通）
   ・test/all.html         … 開発・テスト用（全部入り。公開しない）
   中身は同じで、PAGE の値と、検索・SNS 向けの説明だけが違う。
   src/data.js（データの組み立て。snapshot.mjs と共通）、src/market.js（相場の位置の計算）、
   src/market-ui.js（売り時・買い時の画面）、src/stock-ui.js（在庫）、src/rat-ui.js（ラットスポットの画面）は、ここで画面に埋め込む。
   マップ作成ツール（tools/mapmaker.html）は手元専用なので、公開するトップには入口を出さない */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, SITE_NAME } from "./config.mjs";
import { ratData } from "./rat.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_MARK = 'const PAGE = "all";';
const MAPMAKER_CARD = /\n\s*<a class="card sub" href="mapmaker\.html">[^\n]*<\/a>/;
const PARTS = [["/*@@DATA_JS@@*/", "data.js"], ["/*@@MARKET_JS@@*/", "market.js"], ["/*@@MARKET_UI_JS@@*/", "market-ui.js"], ["/*@@STOCK_UI_JS@@*/", "stock-ui.js"], ["/*@@RAT_UI_JS@@*/", "rat-ui.js"]];
const RAT_MARK = "/*@@RAT_DATA@@*/null";

/* ページごとの題と説明（検索結果や SNS のカードに出る。画面の中の題は src/app.html の言語ごとの文言） */
const PAGES = [
  { page: "top", file: "index.html", title: "EFT ツール", desc: "Escape from Tarkov（タルコフ）のフリマ相場をもとにした無料ツール集。転売ボード、持ち帰りティア表、売り時・買い時のランキング。" },
  { page: "flip", file: "flip.html", title: "EFT 転売ボード", desc: "フリマとトレーダーの値段の差で利益が出る品を、売れやすさと一緒に一覧にします。手数料・購入上限・ロイヤリティレベルも計算に入れています。" },
  { page: "loot", file: "loot.html", title: "EFT 持ち帰りティア表", desc: "レイドで持ち帰る品を、1マスあたりの売値で S〜D の段に分けます。何を優先して持ち帰るかの目安に。" },
  { page: "watch", file: "watch.html", title: "EFT 売り時・買い時", desc: "いまの値段が過去の底値付近の品（買い場）と高値付近の品（売り場）をランキングで並べ、おすすめの買値・売値と移動平均のグラフを出します。" },
  { page: "rat", file: "rat.html", title: "EFT ラットスポット", desc: "Escape from Tarkov（タルコフ）で待ち伏せ（ラット）して勝てるスポットを、マップごとに紹介。見取り図の位置・行き方・評価と、実際のキル動画つき。" },
  { page: "settings", file: "settings.html", title: "EFT プレイヤー設定", desc: "プレイヤーレベル・トレーダーのロイヤリティレベル・インテルセンターなど、すべてのツールで共通の設定です。" }
];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function headFor(p){
  const url = `${SITE}/${p.file === "index.html" ? "" : p.file.replace(/\.html$/, "")}`;
  return `<title>${esc(p.title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(p.title)} | ${SITE_NAME}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="favicon.svg" type="image/svg+xml">`;
}

export function buildTools(){
  let src = readFileSync(join(ROOT, "src", "app.html"), "utf8");
  for(const [mark, file] of PARTS){
    if(!src.includes(mark)) throw new Error(`${file} を埋め込む印が見つかりません`);
    src = src.replace(mark, () => readFileSync(join(ROOT, "src", file), "utf8"));
  }
  if(!src.includes(RAT_MARK)) throw new Error("ラットスポットのデータを埋め込む印が見つかりません");
  src = src.replace(RAT_MARK, () => JSON.stringify(ratData()));
  if(!src.includes(PAGE_MARK)) throw new Error("PAGE の行が見つかりません");
  const titleTag = src.match(/<title>[^<]*<\/title>/);
  if(!titleTag) throw new Error("<title> が見つかりません");
  mkdirSync(join(ROOT, "public"), { recursive: true });
  const publicSrc = src.replace(MAPMAKER_CARD, "");
  for(const p of PAGES){
    const html = publicSrc.replace(PAGE_MARK, `const PAGE = "${p.page}";`).replace(titleTag[0], () => headFor(p));
    writeFileSync(join(ROOT, "public", p.file), html);
    console.log("作成:", "public/" + p.file);
  }
  // テスト用は全部入り（マップ作成の入口も残す。公開はしない）
  mkdirSync(join(ROOT, "test"), { recursive: true });
  writeFileSync(join(ROOT, "test", "all.html"), src.replace(PAGE_MARK, 'const PAGE = "all";'));
  console.log("作成: test/all.html");
  return PAGES.map(p => ({ file: p.file, priority: p.page === "top" ? "1.0" : p.page === "settings" ? "0.5" : "0.8" }));
}
