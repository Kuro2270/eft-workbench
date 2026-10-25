/* 公開サイトの /icon/<ファイル名> で、tarkov.dev のアイテムの画像（assets.tarkov.dev）をそのまま返す（Cloudflare Pages Functions）。
   持ち帰りティア表を画像にして共有するとき（src/share-ui.js）、tarkov.dev の画像を直接読んで書き出せない場合にだけ使う
   （同じサイトから読めば、画像として書き出せる）。役割はこれだけ。tarkov.dev の画像のファイル名の形のものだけを通す */
const NAME = /^[\w-]+\.(webp|png|jpe?g)$/i;
const TYPE = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export async function onRequestGet({ params }){
  const name = String(params.name || "");
  const m = name.match(NAME);
  if(!m) return new Response("Not found", { status: 404 });
  const r = await fetch(`https://assets.tarkov.dev/${name}`, { cf: { cacheEverything: true, cacheTtl: 86400 } });
  if(!r.ok) return new Response("Not found", { status: 404 });
  return new Response(r.body, {
    headers: {
      "Content-Type": TYPE[m[1].toLowerCase()],
      "Cache-Control": "public, max-age=86400",   // アイテムの画像はめったに変わらないので、1日は使い回す
      "X-Robots-Tag": "noindex"
    }
  });
}
