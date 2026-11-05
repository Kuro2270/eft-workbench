/* 日本語と英語で URL を分けているページの、共通の道具。役割はこれだけ（2026年11月から）。
   英語版のページの中のリンク（href）を、英語版のページ（<名前>.en.html）へ向ける。
   対象は、日英の両方があるページ（ツール：site/tools.mjs、文章のページ：site/info.mjs）だけ。外のサイト・画像・ページ内のリンクは触らない */
export const SPLIT = ["index", "flip", "loot", "watch", "rat", "settings", "about", "faq", "privacy", "contact"];

export function enLinks(html){
  return html.replace(/href=(\\?)"(\.\/)?([a-z-]+)\.html([?#][^"\\]*)?\1"/g, (all, q, dot, base, rest) =>
    SPLIT.includes(base) ? `href=${q}"${dot || ""}${base}.en.html${rest || ""}${q}"` : all);
}
