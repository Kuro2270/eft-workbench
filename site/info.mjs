/* プライバシーポリシー（運営者情報・データの出どころ・非公式であることもここにまとめる）・お問い合わせ・404 のページを作る（日本語）。
   運営者情報・非公式・データの出どころは、ほかのページには書かない（このページの1か所だけ）。
   見た目はツールのページ（src/app.html）の色に合わせた、文章だけの簡単なページ。
   お問い合わせのフォームの URL は site/config.mjs の FORM_URL */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, SITE_NAME, FORM_URL } from "./config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function layout({ title, desc, body, file, noindex }){
  const url = `${SITE}/${file.replace(/\.html$/, "")}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${url}">`}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
:root{--bg:#1E2528;--panel:#263034;--line:#3A474C;--text:#E3DDD0;--muted:#98A29F;--tan:#C9A66B}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"BIZ UDPGothic","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif;font-size:15px;line-height:1.85}
header{padding:18px 20px 10px;border-bottom:2px solid var(--tan)}
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
footer{padding:16px 20px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
footer a{color:var(--muted)}
@media (max-width:560px){ table.info th{width:6.5em} }
</style>
</head>
<body>
<header><a class="home" href="index.html">${SITE_NAME}</a></header>
<main>
${body}
</main>
<footer><a href="index.html">トップ</a>・<a href="privacy.html">プライバシーポリシー</a>・<a href="contact.html">お問い合わせ</a></footer>
</body>
</html>
`;
}

const PAGES = [
  {
    file: "privacy.html", title: "プライバシーポリシー",
    desc: "EFT Workbench の運営者情報とプライバシーポリシーです。データの出どころ、ブラウザに保存する情報、アクセス解析、お問い合わせの扱いをまとめています。",
    body: `<h1>プライバシーポリシー</h1>
<h2>運営者情報</h2>
<table class="info">
<tr><th>サイト名</th><td>${SITE_NAME}（Escape from Tarkov の無料ツール集）</td></tr>
<tr><th>URL</th><td>${SITE}</td></tr>
<tr><th>運営者</th><td>Kurokon（個人運営）</td></tr>
<tr><th>開設</th><td>2026年10月</td></tr>
<tr><th>お問い合わせ</th><td><a href="contact.html">お問い合わせフォーム</a></td></tr>
</table>
<h2>データの出どころ</h2>
<p>アイテムの値段・情報は <a href="https://tarkov.dev" target="_blank" rel="noopener">tarkov.dev</a> のデータを使い、当サイトが独自に計算しています。</p>
<h2>非公式のファンサイトです</h2>
<p>当サイトは非公式のファンサイトで、Escape from Tarkov の開発元である Battlestate Games とは関係ありません。ゲーム内のアイテム名・画像などの権利は、Battlestate Games に帰属します。</p>
<h2>ブラウザに保存する情報</h2>
<p>プレイヤー設定（レベル・トレーダーのロイヤリティレベル・インテルセンターなど）、表示の設定、売り時・買い時の「在庫」に記録した品と数量は、お使いのブラウザの<b>ローカルストレージ</b>に保存します。次に開いたときに同じ状態で使えるようにするためのものです。</p>
<p>これらは当サイトの運営者を含む誰かに送信されることはありません。ブラウザの設定から削除できます。</p>
<h2>外部のデータの読み込み</h2>
<p>値動きを表示するときや、当サイトに保存した価格が無いときは、お使いのブラウザから <a href="https://tarkov.dev" target="_blank" rel="noopener">tarkov.dev</a> のデータを直接読み込みます。このとき tarkov.dev に、IPアドレスなどの通信情報が送られます。取り扱いは tarkov.dev の方針に従います。</p>
<h2>動画の埋め込み</h2>
<p>ラットスポットのページでは、YouTube の動画を埋め込んでいます。動画は、再生のボタンを押したときにはじめて YouTube（プライバシー強化モード）から読み込みます。読み込んだあとは、YouTube に通信情報などが送られ、その取り扱いは Google のプライバシーポリシーに従います。</p>
<h2>アクセス解析</h2>
<p>サイトの改善のため、Cloudflare Web Analytics でアクセス数などを集計しています。Cookie を使わず、個人を特定する情報は集めません。</p>
<h2>お問い合わせ</h2>
<p>お問い合わせには <b>Google フォーム</b>を使っています。入力された内容（本文と、任意で入力されたメールアドレス）は、Google のサービス上で保存され、運営者が確認します。いただいた情報は、お返事と、不具合の確認・サイトの改善のためだけに使います。法令に基づく場合を除き、本人の同意なく第三者に提供することはありません。</p>
<h2>免責事項</h2>
<p>当サイトの値段や計算結果は、正確さを保証するものではありません。当サイトの利用によって生じた損害（ゲーム内の損失を含む）について、運営者は責任を負いかねます。</p>
<h2>改定</h2>
<p>本ポリシーは、必要に応じて予告なく改定することがあります。広告を載せるなど、扱う情報が変わるときは、このページを更新してお知らせします。</p>
<p class="lead">最終更新：2026年10月</p>`
  },
  {
    file: "contact.html", title: "お問い合わせ",
    desc: "EFT Workbench へのお問い合わせフォームです。不具合のご連絡、ご質問、ご提案をお待ちしています。",
    body: `<h1>お問い合わせ</h1>
<p class="lead">不具合のご連絡、ご質問、ご提案は、こちらのフォームからどうぞ。</p>
${FORM_URL ? `<p><button type="button" class="btn" id="openForm">フォームを開く</button> <a href="${esc(FORM_URL)}" target="_blank" rel="noopener">別のタブで開く</a></p>
<div class="formbox" id="formBox"></div>
<script>
document.getElementById("openForm").addEventListener("click", function(){
  var f = document.createElement("iframe");
  f.src = ${JSON.stringify(FORM_URL)} + (${JSON.stringify(FORM_URL)}.indexOf("?") < 0 ? "?" : "&") + "embedded=true";
  f.title = "contact"; f.loading = "lazy";
  document.getElementById("formBox").appendChild(f); this.hidden = true;
});
</script>` : `<p class="notice">フォームは準備中です。もうしばらくお待ちください。</p>`}
<h2>送る前に</h2>
<p>不具合のご連絡は、次の内容を添えていただけると、確認しやすくなります。</p>
<ul><li>どのページか（転売ボード、持ち帰りティア表など）</li><li>使っている端末とブラウザ（例：Windows の Chrome）</li><li>モード（PvP・PvE）と、何が起きたか</li></ul>
<h2>返信について</h2>
<p>個人で運営しているため、お返事までお時間をいただくことがあります。内容によっては、お返事できない場合もあります。返信が必要な場合は、フォームにメールアドレスを入力してください。入力いただいた内容の扱いは、<a href="privacy.html">プライバシーポリシー</a>のとおりです。</p>`
  },
  {
    file: "404.html", title: "ページが見つかりません", noindex: true,
    desc: "お探しのページは見つかりませんでした。",
    body: `<h1>ページが見つかりません</h1>
<p class="lead">お探しのページは、移動したか削除された可能性があります。</p>
<p><a class="btn" href="index.html">トップへ戻る</a></p>`
  }
];

/* 以前あった運営者情報（about.html）は、プライバシーポリシーにまとめた。古いリンクやブックマークから来た人は移す */
const MOVED = { "about.html": "privacy.html" };
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
  return PAGES.filter(p => !p.noindex).map(p => ({ file: p.file, priority: "0.3" }));
}
