/* ツールのページを src/app.html から作る。
   ・public/index.html     … トップ（何ができるかの一覧）
   ・public/flip.html      … 転売ボード
   ・public/loot.html      … 持ち帰りティア表
   ・public/watch.html     … 売り時・買い時
   ・public/rat.html       … ラットスポット（データと画像は site/rat.mjs）
   ・public/settings.html  … プレイヤー設定（全ツール共通）
   ・test/all.html         … 開発・テスト用（全部入り。公開しない）
   中身は同じで、PAGE の値と、検索・SNS 向けの説明だけが違う。どのページも日本語版（.html）と英語版（.en.html）を作る（PAGE_LANG）。
   src/data.js（データの組み立て。snapshot.mjs と共通）、src/market.js（相場の位置の計算）、
   src/market-ui.js（売り時・買い時の画面）、src/stock-ui.js（在庫）、src/rat-ui.js（ラットスポットの画面）、
   src/share-ui.js（持ち帰りティア表を画像で共有）は、ここで画面に埋め込む。
   マップ作成ツール（tools/mapmaker.html）は手元専用なので、公開するトップには入口を出さない */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, SITE_NAME } from "./config.mjs";
import { ratData } from "./rat.mjs";
import { enLinks } from "./lang.mjs";
import { adsHead } from "./ads.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_MARK = 'const PAGE = "all";';
const MAPMAKER_CARD = /\n\s*<a class="card sub" href="mapmaker\.html">[^\n]*<\/a>/;
const PARTS = [["/*@@DATA_JS@@*/", "data.js"], ["/*@@MARKET_JS@@*/", "market.js"], ["/*@@MARKET_UI_JS@@*/", "market-ui.js"], ["/*@@STOCK_UI_JS@@*/", "stock-ui.js"], ["/*@@RAT_UI_JS@@*/", "rat-ui.js"], ["/*@@SHARE_UI_JS@@*/", "share-ui.js"]];
const RAT_MARK = "/*@@RAT_DATA@@*/null";

/* ページごとの題と説明（検索結果や SNS のカードに出る。画面の中の題は src/app.html の言語ごとの文言）。
   日本語版（<名前>.html）と英語版（<名前>.en.html）を別の URL で作る（2026年11月。1つの URL で言語を切り替えていたため、
   英語の設定で見に来る検索エンジンに英語の画面が載っていた）。日本語の題には、検索されやすい「タルコフ」を入れる */
const PAGES = [
  { page: "top", file: "index.html",
    ja: { title: "タルコフ（EFT）ツール", desc: "Escape from Tarkov（タルコフ）のフリマ相場をもとにした無料ツール集。転売ボード、持ち帰りティア表、売り時・買い時のランキング、ラットスポット。" },
    en: { title: "EFT Tools", desc: "Free Escape from Tarkov tools built on live flea market prices: a flip board, a loot tier list, buy & sell signals and rat (ambush) spots." } },
  { page: "flip", file: "flip.html",
    ja: { title: "タルコフ（EFT）転売ボード", desc: "フリマとトレーダーの値段の差で利益が出る品を、売れやすさと一緒に一覧にします。手数料・購入上限・ロイヤリティレベルも計算に入れています。" },
    en: { title: "EFT Flip Board", desc: "Lists items you can flip for profit between the flea market and traders, with how fast they sell. Flea fees, buy limits and loyalty levels are all included." } },
  { page: "loot", file: "loot.html",
    ja: { title: "タルコフ（EFT）持ち帰りティア表", desc: "レイドで持ち帰る品を、1マスあたりの売値で S〜D の段に分けます。何を優先して持ち帰るかの目安に。" },
    en: { title: "EFT Loot Tier List", desc: "Ranks raid loot from S to D by sell price per inventory slot, so you know what to take home first." } },
  { page: "watch", file: "watch.html",
    ja: { title: "タルコフ（EFT）売り時・買い時", desc: "いまの値段が過去の底値付近の品（買い場）と高値付近の品（売り場）をランキングで並べ、おすすめの買値・売値と移動平均のグラフを出します。" },
    en: { title: "EFT Buy & Sell Signals", desc: "Ranks items priced near their past low (buy) and near their past high (sell), with suggested buy and sell prices and moving-average charts." } },
  { page: "rat", file: "rat.html",
    ja: { title: "タルコフ（EFT）ラットスポット", desc: "Escape from Tarkov（タルコフ）で待ち伏せ（ラット）して勝てるスポットを、マップごとに紹介。見取り図の位置・行き方・評価と、実際のキル動画つき。" },
    en: { title: "EFT Rat Spots", desc: "Ambush (rat) spots that win fights in Escape from Tarkov, map by map — position on the map, how to get there, ratings and real kill clips." } },
  { page: "settings", file: "settings.html",
    ja: { title: "タルコフ（EFT）プレイヤー設定", desc: "プレイヤーレベル・トレーダーのロイヤリティレベル・インテルセンターなど、すべてのツールで共通の設定です。" },
    en: { title: "EFT Player Settings", desc: "Player level, trader loyalty levels, Intelligence Center and other settings shared by every tool." } }
];
const LANG_MARK = "const PAGE_LANG = null;";
const fileOf = (p, lang) => lang === "en" ? p.file.replace(/\.html$/, ".en.html") : p.file;
const urlOf = (p, lang) => `${SITE}/${p.file === "index.html" && lang === "ja" ? "" : fileOf(p, lang).replace(/\.html$/, "")}`;   // Cloudflare Pages は .html なしの形で配る

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function headFor(p, lang){
  const { title, desc } = p[lang], url = urlOf(p, lang);
  return `<title>${esc(title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${urlOf(p, "ja")}">
<link rel="alternate" hreflang="en" href="${urlOf(p, "en")}">
<link rel="alternate" hreflang="x-default" href="${urlOf(p, "ja")}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)} | ${SITE_NAME}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${lang === "ja" ? "ja_JP" : "en_US"}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${adsHead()}`;
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
  if(!src.includes(LANG_MARK)) throw new Error("PAGE_LANG の行が見つかりません");
  for(const p of PAGES){
    for(const lang of ["ja", "en"]){
      let html = publicSrc.replace(PAGE_MARK, `const PAGE = "${p.page}";`).replace(LANG_MARK, `const PAGE_LANG = "${lang}";`)
        .replace(titleTag[0], () => headFor(p, lang)).replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
      if(lang === "en") html = enLinks(html);
      writeFileSync(join(ROOT, "public", fileOf(p, lang)), html);
      console.log("作成:", "public/" + fileOf(p, lang));
    }
  }
  // テスト用は全部入り（マップ作成の入口も残す。公開はしない）
  mkdirSync(join(ROOT, "test"), { recursive: true });
  writeFileSync(join(ROOT, "test", "all.html"), src.replace(PAGE_MARK, 'const PAGE = "all";'));
  console.log("作成: test/all.html");
  return PAGES.map(p => ({ file: p.file, en: fileOf(p, "en"), priority: p.page === "top" ? "1.0" : p.page === "settings" ? "0.5" : "0.8" }));
}
