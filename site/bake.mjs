/* ツールのページの HTML そのものに、文言と、そのページの形を書き込む。役割はこれだけ（2026年11月）。
   それまでは、題も説明もメニューも、開いたあとにスクリプトが入れていた。スクリプトを動かさずに読む相手（広告の審査など）には、
   どのページも題1行だけの空のページに見えていた。
   ・文言 … src/app.html の I18N（data-i18n の付いた所・題・フッター）
   ・ページの形 … src/app.html の PAGE_PARTS（そのページで出さない部品・出す部品・開いておく部品）。画面のスクリプトと同じ表を読む
   ・ラットスポット … 最初に出るマップの見取り図とスポットの一覧（src/rat-ui.js の paintRat をそのまま動かす）
   開いたあとは、これまでどおり画面のスクリプトが同じ内容を入れ直す（設定や価格など、その場で決まるものはスクリプトが出す） */
import vm from "node:vm";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PAGE_TITLE = { top: "titleTop", flip: "title", loot: "titleLoot", watch: "titleWatch", rat: "titleRat", settings: "titleSettings" };
const PAGE_NAV = { top: "pgTop", flip: "pgFlip", loot: "pgLoot", watch: "pgWatch", rat: "pgRat", settings: "pgSettings" };

/* src/app.html から、文言の表（I18N）とページの形の表（PAGE_PARTS）を読む */
export function readTables(appSrc){
  const a = appSrc.indexOf("const I18N = {"), b = appSrc.indexOf("\n};", a);
  if(a < 0 || b < 0) throw new Error("src/app.html の I18N が見つかりません");
  const m = appSrc.match(/\/\*@@PAGE_PARTS:start@@\*\/\s*const PAGE_PARTS = (\{[\s\S]*?\});\s*\/\*@@PAGE_PARTS:end@@\*\//);
  if(!m) throw new Error("src/app.html の PAGE_PARTS が見つかりません");
  return { I18N: vm.runInNewContext("(" + appSrc.slice(a + "const I18N = ".length, b + 2) + ")"), PARTS: vm.runInNewContext("(" + m[1] + ")") };
}
const textOf = (I18N, lang) => key => {
  const get = o => key.split(".").reduce((x, k) => x && x[k], o);
  return get(I18N[lang]) ?? get(I18N.ja) ?? key;
};

/* id の付いた開始タグを書き換える（fn は「タグの中身」を受け取って返す） */
function editTag(body, sel, fn){
  if(!/^#[\w-]+$/.test(sel)) throw new Error(`PAGE_PARTS は #id で書きます: ${sel}`);
  const re = new RegExp(`<(\\w+)((?:\\s[^>]*)?\\sid="${sel.slice(1)}"[^>]*)>`);
  if(!re.test(body)) throw new Error(`PAGE_PARTS の ${sel} が src/app.html にありません`);
  return body.replace(re, (all, tag, attrs) => `<${tag}${fn(attrs)}>`);
}
const drop = (attrs, name) => attrs.replace(new RegExp(`\\s${name}(="[^"]*")?(?=\\s|$)`, "g"), "");

/* page（top・flip・loot・watch・rat・settings）と言語を決めて、HTML に書き込む。ratHtml はラットスポットの中身（rat のページだけ） */
export function bake(html, page, lang, { I18N, PARTS }, ratHtml = ""){
  const start = html.indexOf("<body>"), end = html.indexOf("<script>", start);
  if(start < 0 || end < 0) throw new Error("ページの本体（<body>〜<script>）が見つかりません");
  const t = textOf(I18N, lang), parts = PARTS[page];
  if(!parts) throw new Error(`PAGE_PARTS に ${page} がありません`);
  let body = html.slice(start, end);

  // ページの形
  body = editTag(body, "#pages", a => drop(a, "hidden"));
  body = editTag(body, "#" + PAGE_NAV[page], a => `${a} aria-current="page"`);
  for(const sel of parts.hide) body = editTag(body, sel, a => `${drop(drop(a, "hidden"), "data-off")} hidden data-off="1"`);
  for(const sel of parts.show) body = editTag(body, sel, a => drop(drop(a, "hidden"), "data-off"));
  for(const sel of parts.open) body = editTag(body, sel, a => `${drop(a, "open")} open`);

  // 文言（題は、そのページの題に）
  body = body.replace(/(<h1 data-i18n=")title(">)[^<]*(<\/h1>)/, `$1${PAGE_TITLE[page]}$2$3`);
  body = body.replace(/(<(\w+)(?:\s[^>]*)?\sdata-i18n="([\w.]+)"[^>]*>)[^<]*(<\/\2>)/g, (all, open, tag, key, close) => open + esc(t(key)) + close);
  body = body.replace('<footer id="footer"></footer>', () => `<footer id="footer">${t("footer")}</footer>`);
  body = body.replace(/(<button type="button" data-lang="(ja|en)")(>)/g, (all, a, l, c) => `${a} aria-pressed="${l === lang}"${c}`);

  // ラットスポット
  if(ratHtml) body = body.replace(/(<section id="ratPanel"[^>]*>)(<\/section>)/, (all, a, c) => a + ratHtml + c);
  return html.slice(0, start) + body + html.slice(end);
}

/* ラットスポットのページの中身（最初に出るマップ）。画面と同じ処理（src/rat-ui.js の paintRat）を、ここで動かして HTML を受け取る */
export function ratHtml(ratUiSrc, ratData, lang, { I18N }){
  const box = { hidden: false, innerHTML: "", addEventListener(){} };
  const ctx = { RAT_BOX: box, document: { getElementById: () => box }, S: { lang }, t: textOf(I18N, lang), esc };
  vm.runInNewContext(ratUiSrc.replace("/*@@RAT_DATA@@*/null", () => JSON.stringify(ratData)) + "\npaintRat();", ctx);
  return box.innerHTML;
}
