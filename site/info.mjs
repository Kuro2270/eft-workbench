/* 文章だけのページ（このサイトについて・よくある質問・プライバシーポリシー・お問い合わせは日本語と英語、404 は日本語）を作る。役割はページの枠と書き出し。
   文面は site/about.mjs（このサイトについて・よくある質問）と site/legal.mjs（プライバシーポリシー・お問い合わせ）。
   運営者情報・非公式・データの出どころは、プライバシーポリシーの1か所だけに書く。
   見た目はツールのページ（src/app.html）の色に合わせた、文章だけの簡単なページ */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, SITE_NAME } from "./config.mjs";
import { aboutPage, faqPage } from "./about.mjs";
import { privacyPage, contactPage } from "./legal.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* 言語ごとの、ページの下のリンク */
const FOOT = {
  ja: [["index.html", "トップ"], ["about.html", "このサイトについて"], ["faq.html", "よくある質問"], ["privacy.html", "プライバシーポリシー"], ["contact.html", "お問い合わせ"]],
  en: [["index.html", "Home"], ["about.en.html", "About"], ["faq.en.html", "FAQ"], ["privacy.en.html", "Privacy"], ["contact.en.html", "Contact"]]
};
const page = (base, lang) => `${base}${lang === "en" ? ".en" : ""}.html`;
const urlOf = f => `${SITE}/${f.replace(/\.html$/, "")}`;

function layout({ title, desc, body, file, noindex, lang = "ja", base }){
  const url = urlOf(file);
  const alt = base ? `\n<link rel="alternate" hreflang="ja" href="${urlOf(page(base, "ja"))}">\n<link rel="alternate" hreflang="en" href="${urlOf(page(base, "en"))}">` : "";
  const sw = base ? `<span class="lang">${lang === "en" ? `<a href="${page(base, "ja")}" lang="ja">日本語</a><b>English</b>` : `<b>日本語</b><a href="${page(base, "en")}" lang="en">English</a>`}</span>` : "";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${url}">`}${alt}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
:root{--bg:#1E2528;--panel:#263034;--line:#3A474C;--text:#E3DDD0;--muted:#98A29F;--tan:#C9A66B}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"BIZ UDPGothic","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif;font-size:15px;line-height:1.85}
header{padding:18px 20px 10px;border-bottom:2px solid var(--tan);display:flex;justify-content:space-between;align-items:center;gap:12px}
header .lang{display:inline-flex;border:1px solid var(--line);border-radius:4px;overflow:hidden;font-size:12px}
header .lang a,header .lang b{padding:3px 10px;color:var(--muted);text-decoration:none;font-weight:400}
header .lang b{background:var(--tan);color:#1E2528;font-weight:700}
header a.home{color:var(--tan);text-decoration:none;font-weight:700}
main{max-width:820px;margin:0 auto;padding:24px 20px 56px}
h1{font-size:22px;margin:0 0 6px}
.lead{color:var(--muted);margin:0 0 24px}
h2{font-size:17px;margin:28px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--line)}
a{color:var(--tan)}
table.info{width:100%;border-collapse:collapse}
table.info th,table.info td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
table.info th{width:9em;color:var(--muted);font-weight:400}
ul{padding-left:1.4em}
.btn{display:inline-block;background:var(--tan);color:#1E2528;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:6px;border:0;cursor:pointer;font:inherit}
.formbox iframe{width:100%;height:900px;border:1px solid var(--line);border-radius:6px;background:#fff;margin-top:14px}
.notice{padding:12px 16px;border-left:4px solid var(--tan);background:var(--panel);border-radius:4px}
.tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:10px 0 0}
.tools a{display:block;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px 16px;text-decoration:none;color:var(--text)}
.tools a:hover{border-color:var(--tan)}
.tools b{display:block;color:var(--tan);font-size:16px;margin-bottom:4px}
.tools span{display:block;font-size:13.5px;line-height:1.7}
.tools ul{margin:8px 0 0;padding-left:1.2em;font-size:12.5px;color:var(--muted);line-height:1.7}
ol.steps{list-style:none;padding:0;margin:10px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;counter-reset:s}
ol.steps li{counter-increment:s;background:var(--panel);border-radius:8px;padding:12px 14px 12px 48px;position:relative;font-size:13.5px;line-height:1.7}
ol.steps li::before{content:counter(s);position:absolute;left:14px;top:12px;width:24px;height:24px;border-radius:50%;background:var(--tan);color:#1E2528;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px}
ol.steps b{display:block}
.faq h2{margin-top:30px}
.faq details{border-bottom:1px solid var(--line);padding:10px 2px}
.faq summary{cursor:pointer;font-weight:700}
.faq details p{margin:8px 0 2px;color:var(--text)}
footer{padding:16px 20px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
footer a{color:var(--muted)}
@media (max-width:560px){ table.info th{width:6.5em} }
</style>
</head>
<body>
<header><a class="home" href="index.html">${SITE_NAME}</a>${sw}</header>
<main>
${body}
</main>
<footer>${FOOT[lang].map(([h, l]) => `<a href="${h}">${l}</a>`).join(lang === "en" ? " · " : "・")}</footer>
</body>
</html>
`;
}

/* 日本語と英語の両方があるページ。[ファイルの名前（英語は .en.html）, 文面, サイトマップの優先度] */
const BILINGUAL = [["about", aboutPage, "0.5"], ["faq", faqPage, "0.5"], ["privacy", privacyPage, "0.3"], ["contact", contactPage, "0.3"]];
const PAGES = [
  ...["ja", "en"].flatMap(lang => BILINGUAL.map(([base, make, priority]) => ({ ...make(lang), file: page(base, lang), lang, base, priority }))),
  {
    file: "404.html", title: "ページが見つかりません", noindex: true,
    desc: "お探しのページは見つかりませんでした。",
    body: `<h1>ページが見つかりません</h1>
<p class="lead">お探しのページは、移動したか削除された可能性があります。</p>
<p><a class="btn" href="index.html">トップへ戻る</a></p>`
  }
];

/* 移したページ（古いリンクやブックマークから来た人を移す）。{ "元.html": "先.html" }
   about.html は、以前は運営者情報だった（プライバシーポリシーにまとめた）。今は「このサイトについて」 */
const MOVED = {};
function movedPage(to){
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/${to.replace(/\.html$/, "")}">
<meta http-equiv="refresh" content="0; url=${to}"><title>${SITE_NAME}</title></head>
<body><a href="${to}">${to}</a></body></html>
`;
}

export function buildInfo(){
  mkdirSync(join(ROOT, "public"), { recursive: true });
  for(const p of PAGES){
    writeFileSync(join(ROOT, "public", p.file), layout(p));
    console.log("作成:", "public/" + p.file);
  }
  const redirects = [];
  for(const [from, to] of Object.entries(MOVED)){
    writeFileSync(join(ROOT, "public", from), movedPage(to));
    const a = "/" + from.replace(/\.html$/, ""), b = "/" + to.replace(/\.html$/, "");
    redirects.push(`${a} ${b} 301`, `/${from} ${b} 301`);
  }
  writeFileSync(join(ROOT, "public", "_redirects"), redirects.join("\n") + "\n");   // Cloudflare Pages の転送設定
  console.log("作成: public/_redirects");
  return PAGES.filter(p => !p.noindex).map(p => ({ file: p.file, priority: p.priority || "0.3" }));
}
