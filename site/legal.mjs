/* プライバシーポリシー（運営者情報・データの出どころ・非公式であることもここにまとめる）とお問い合わせの文面（日本語・英語）。役割はこれだけ
   （ページの枠・書き出しは site/info.mjs）。運営者情報・非公式・データの出どころは、ほかのページには書かない（プライバシーポリシーの1か所だけ）。
   お問い合わせのフォームは日本語・英語で共通（site/config.mjs の FORM_URL。フォームの中に両方の言葉が入っている） */
import { SITE, SITE_NAME, FORM_URL } from "./config.mjs";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const TD = `<a href="https://tarkov.dev" target="_blank" rel="noopener">tarkov.dev</a>`;

const PRIVACY = {
  ja: { title: "プライバシーポリシー",
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
<p>アイテムの値段・情報は ${TD} のデータを使い、当サイトが独自に計算しています。</p>
<h2>非公式のファンサイトです</h2>
<p>当サイトは非公式のファンサイトで、Escape from Tarkov の開発元である Battlestate Games とは関係ありません。ゲーム内のアイテム名・画像などの権利は、Battlestate Games に帰属します。</p>
<h2>ブラウザに保存する情報</h2>
<p>プレイヤー設定（レベル・トレーダーのロイヤリティレベル・インテルセンターなど）、表示の設定、売り時・買い時の「在庫」に記録した品と数量は、お使いのブラウザの<b>ローカルストレージ</b>に保存します。次に開いたときに同じ状態で使えるようにするためのものです。</p>
<p>これらは当サイトの運営者を含む誰かに送信されることはありません。ブラウザの設定から削除できます。</p>
<h2>外部のデータの読み込み</h2>
<p>値動きを表示するときや、当サイトに保存した価格が無いときは、お使いのブラウザから ${TD} のデータを直接読み込みます。このとき tarkov.dev に、IPアドレスなどの通信情報が送られます。取り扱いは tarkov.dev の方針に従います。</p>
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
<p class="lead">最終更新：2026年10月</p>` },
  en: { title: "Privacy Policy",
    desc: "Who runs EFT Workbench and its privacy policy: where the data comes from, what is stored in your browser, analytics and how contact messages are handled.",
    body: `<h1>Privacy Policy</h1>
<h2>About the operator</h2>
<table class="info">
<tr><th>Site</th><td>${SITE_NAME} (free tools for Escape from Tarkov)</td></tr>
<tr><th>URL</th><td>${SITE}</td></tr>
<tr><th>Operator</th><td>Kurokon (run by an individual)</td></tr>
<tr><th>Launched</th><td>October 2026</td></tr>
<tr><th>Contact</th><td><a href="contact.en.html">Contact form</a></td></tr>
</table>
<h2>Where the data comes from</h2>
<p>Item prices and details come from ${TD}, and this site does its own calculations on top of them.</p>
<h2>An unofficial fan site</h2>
<p>This is an unofficial fan site and is not affiliated with Battlestate Games, the developer of Escape from Tarkov. Item names, images and other game content belong to Battlestate Games.</p>
<h2>What is stored in your browser</h2>
<p>Your player settings (level, trader loyalty levels, Intelligence Center and so on), display settings, and the items and quantities you record as stock in Buy &amp; sell signals are saved in your browser’s <b>local storage</b>, so everything is the same next time you open the site.</p>
<p>None of this is sent to anyone, including the operator. You can delete it from your browser settings.</p>
<h2>Loading data from other sites</h2>
<p>To show price history, or when this site has no saved prices, your browser loads data directly from ${TD}. Your connection details, such as your IP address, are then sent to tarkov.dev and handled under its policies.</p>
<h2>Embedded videos</h2>
<p>The Rat spots page embeds YouTube videos. A video is loaded from YouTube (privacy-enhanced mode) only when you press its play button. After that, connection details are sent to YouTube and handled under Google’s privacy policy.</p>
<h2>Analytics</h2>
<p>To improve the site, visits are counted with Cloudflare Web Analytics. It uses no cookies and collects nothing that identifies you.</p>
<h2>Contact</h2>
<p>The contact form uses <b>Google Forms</b>. What you enter (your message and, if you choose, your email address) is stored on Google’s service and read by the operator. It is used only to reply, to check reported bugs and to improve the site, and is never given to third parties without your consent, except where required by law.</p>
<h2>Disclaimer</h2>
<p>Prices and results on this site are not guaranteed to be accurate. The operator is not responsible for any loss arising from use of the site, including in-game losses.</p>
<h2>Changes</h2>
<p>This policy may change without notice. If the information handled changes, for example if ads are added, this page will be updated.</p>
<p class="lead">Last updated: October 2026</p>` }
};

const CONTACT = {
  ja: { title: "お問い合わせ", desc: "EFT Workbench へのお問い合わせフォームです。不具合のご連絡、ご質問、ご提案をお待ちしています。",
    lead: "不具合のご連絡、ご質問、ご提案は、こちらのフォームからどうぞ。", open: "フォームを開く", tab: "別のタブで開く", soon: "フォームは準備中です。もうしばらくお待ちください。",
    beforeH: "送る前に", before: "不具合のご連絡は、次の内容を添えていただけると、確認しやすくなります。",
    list: ["どのページか（転売ボード、持ち帰りティア表など）", "使っている端末とブラウザ（例：Windows の Chrome）", "モード（PvP・PvE）と、何が起きたか"],
    replyH: "返信について", reply: "個人で運営しているため、お返事までお時間をいただくことがあります。内容によっては、お返事できない場合もあります。返信が必要な場合は、フォームにメールアドレスを入力してください。入力いただいた内容の扱いは、<a href=\"privacy.html\">プライバシーポリシー</a>のとおりです。" },
  en: { title: "Contact", desc: "Contact form for EFT Workbench. Bug reports, questions and suggestions are welcome.",
    lead: "Bug reports, questions and suggestions are welcome through this form. You can write in English or Japanese.", open: "Open the form", tab: "Open in a new tab", soon: "The form is not ready yet. Please check back soon.",
    beforeH: "Before you send", before: "For bug reports, these details help us check quickly:",
    list: ["Which page (Flip board, Loot tier list, …)", "Your device and browser (e.g. Chrome on Windows)", "The mode (PvP or PvE) and what happened"],
    replyH: "About replies", reply: "The site is run by one person, so replies can take a while, and some messages may not get a reply. If you would like an answer, enter your email address in the form. What you send is handled as described in the <a href=\"privacy.en.html\">privacy policy</a>." }
};

export function privacyPage(lang){ return PRIVACY[lang]; }

export function contactPage(lang){
  const T = CONTACT[lang];
  const form = FORM_URL ? `<p><button type="button" class="btn" id="openForm">${T.open}</button> <a href="${esc(FORM_URL)}" target="_blank" rel="noopener">${T.tab}</a></p>
<div class="formbox" id="formBox"></div>
<script>
document.getElementById("openForm").addEventListener("click", function(){
  var f = document.createElement("iframe");
  f.src = ${JSON.stringify(FORM_URL)} + (${JSON.stringify(FORM_URL)}.indexOf("?") < 0 ? "?" : "&") + "embedded=true";
  f.title = "contact"; f.loading = "lazy";
  document.getElementById("formBox").appendChild(f); this.hidden = true;
});
</script>` : `<p class="notice">${T.soon}</p>`;
  const body = `<h1>${T.title}</h1>
<p class="lead">${T.lead}</p>
${form}
<h2>${T.beforeH}</h2>
<p>${T.before}</p>
<ul>${T.list.map(x => `<li>${x}</li>`).join("")}</ul>
<h2>${T.replyH}</h2>
<p>${T.reply}</p>`;
  return { title: T.title, desc: T.desc, body };
}
