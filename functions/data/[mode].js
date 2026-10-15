/* 公開サイトの /data/<モード>.json を返す（Cloudflare Pages Functions）。
   中身は GitHub Actions「価格｜価格を取って保存する」が 1 時間おきに Workers KV（このページに SNAPSHOTS という名前でつないだ保存場所）へ置いたもの。
   画面（src/app.html の loadSnapshot）は開いたときにまずこれを読み、無ければその場で tarkov.dev から取る。役割はこれだけ */
const MODES = new Set(["regular", "pvp-season", "pve"]);

export async function onRequestGet({ params, env }){
  const name = String(params.mode || "");
  const mode = name.replace(/\.json$/, "");
  if(!name.endsWith(".json") || !MODES.has(mode)) return new Response("Not found", { status: 404 });
  if(!env.SNAPSHOTS) return new Response("SNAPSHOTS is not bound", { status: 503 });
  const body = await env.SNAPSHOTS.get(`${mode}.json`, { type: "stream" });
  if(!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",   // 5 分は使い回す（1 時間おきにしか変わらないため）
      "X-Robots-Tag": "noindex"
    }
  });
}
