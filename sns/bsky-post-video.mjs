#!/usr/bin/env node
/*
 * ラットスポットのショート動画を、Bluesky で告知する（1回に1本）。役割はこれだけ（いいねは bsky-like.mjs）。
 *   中身は rat/data/（spots.json・maps.json。動画を作るときと同じデータ）から作る：
 *     本文 … 英語の見出し・ひと言（summary.en）・日本語の名前・サイトのラットスポットのページ・ハッシュタグ
 *     リンク … YouTube のショート（videos.short）。絵は rat/assets/web/<スポット>-card.jpg（横長のサムネイル）
 *   どれを告知するか：SPOT（スポットの id）を指定すればそれ。空なら、spots.json の並び順で、まだ告知していない動画の最初の1本。
 *   告知したかどうかは、自分の最近の投稿にその動画の URL があるかで見る（同じ動画を2回告知しない。FORCE=1 なら構わず投稿する）。
 *
 *   node sns/bsky-post-video.mjs              … 投稿する
 *   DRY_RUN=1 node sns/bsky-post-video.mjs    … 投稿する内容を見るだけ
 * 環境変数：BSKY_HANDLE, BSKY_APP_PASSWORD、SPOT、FORCE、DRY_RUN
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { login, summary } from "./bsky.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.env.DRY_RUN === "1", FORCE = process.env.FORCE === "1", ONLY = (process.env.SPOT || "").trim();
const SITE_LINK = "eft-workbench.com/rat";            // 本文に出すサイトのページ（押すと https:// 付きで開く）
const TAGS = ["Tarkov", "EscapeFromTarkov", "RatSpot"];
const MAX_GRAPHEMES = 300;                             // Bluesky の1投稿の上限

const readJson = async f => JSON.parse(await readFile(join(ROOT, "rat", "data", f), "utf8"));
const ytId = url => (String(url || "").match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/) || [])[1] || "";
const graphemes = s => [...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(s)].length;
const bytes = s => Buffer.byteLength(s, "utf8");

/* 本文と、リンク・ハッシュタグの位置（facets。Bluesky は文字の位置を UTF-8 のバイト数で数える） */
export function buildPost(sp, map){
  const lines = [
    `New rat spot 🐀 ${sp.name_en} (${map.name_en})`,
    sp.summary && sp.summary.en,
    `新しいラットスポット：${sp.name_ja}（${map.name_ja}）`,
    `Map & route: ${SITE_LINK}`,
    TAGS.map(t => "#" + t).join(" ")
  ].filter(Boolean);
  let text = lines.join("\n");
  if(graphemes(text) > MAX_GRAPHEMES){ lines.splice(1, 1); text = lines.join("\n"); }   // 長すぎるときは、ひと言を外す
  const facets = [];
  const at = sub => { const i = text.indexOf(sub); return i < 0 ? null : { byteStart: bytes(text.slice(0, i)), byteEnd: bytes(text.slice(0, i)) + bytes(sub) }; };
  const link = at(SITE_LINK);
  if(link) facets.push({ index: link, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://${SITE_LINK}` }] });
  for(const t of TAGS){ const r = at("#" + t); if(r) facets.push({ index: r, features: [{ $type: "app.bsky.richtext.facet#tag", tag: t }] }); }
  return { text, facets };
}

/* 自分の最近の投稿に出てくる YouTube の動画の id（本文とリンクの両方を見る） */
async function postedVideos(bs){
  const ids = new Set(); let cursor = "";
  for(let page = 0; page < 5; page++){
    const d = await bs.api(`com.atproto.repo.listRecords?repo=${encodeURIComponent(bs.did)}&collection=app.bsky.feed.post&limit=100${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
    for(const rec of d.records || []){
      const v = rec.value || {}, ext = (v.embed && (v.embed.external || (v.embed.media && v.embed.media.external))) || {};
      for(const s of [v.text, ext.uri]){ const id = ytId(s); if(id) ids.add(id); }
    }
    if(!d.cursor) break;
    cursor = d.cursor;
  }
  return ids;
}

async function main(){
  const { spots } = await readJson("spots.json"), { maps } = await readJson("maps.json");
  const withVideo = spots.filter(s => ytId(s.videos && s.videos.short) && (!ONLY || s.id === ONLY));
  if(ONLY && !withVideo.length) throw new Error(`「${ONLY}」は spots.json に無いか、ショートの URL（videos.short）が入っていません`);
  const bs = await login();
  if(!bs && !DRY){ console.log("Bluesky の鍵（BSKY_HANDLE / BSKY_APP_PASSWORD）が無いので、何もしません。"); return; }
  const posted = bs ? await postedVideos(bs) : new Set();
  const sp = withVideo.find(s => FORCE || !posted.has(ytId(s.videos.short)));
  if(!sp){ const m = "告知していない動画はありません（spots.json のショートは、すべて告知済み）。"; console.log(m); await summary(m); return; }
  const map = maps.find(m => m.id === sp.map) || { name_en: sp.map, name_ja: sp.map };
  const { text, facets } = buildPost(sp, map);
  const url = `https://youtube.com/shorts/${ytId(sp.videos.short)}`;
  const card = { uri: url, title: `${sp.name_en} | ${map.name_en} Rat Spot`, description: (sp.summary && sp.summary.en) || "" };
  const cardImg = join(ROOT, "rat", "assets", "web", `${sp.id}-card.jpg`);
  console.log(`告知する動画：${sp.id}（${url}）\n--- 本文（${graphemes(text)} 文字）---\n${text}\n---`);
  if(DRY){ await summary(`## 動画の告知（内容を見るだけ）\n\n動画：${url}\n\n\`\`\`\n${text}\n\`\`\`\n\nリンクの題：${card.title}\n`); return; }
  if(existsSync(cardImg)) card.thumb = await bs.uploadBlob(await readFile(cardImg), "image/jpeg");
  const r = await bs.create("app.bsky.feed.post", { $type: "app.bsky.feed.post", text, facets, langs: ["en", "ja"], createdAt: new Date().toISOString(),
    embed: { $type: "app.bsky.embed.external", external: card } });
  const link = `https://bsky.app/profile/${bs.handle}/post/${String(r.uri).split("/").pop()}`;
  console.log("投稿しました: " + link);
  await summary(`## 動画の告知\n\n投稿しました：${link}\n\n\`\`\`\n${text}\n\`\`\`\n`);
}

if(import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error("告知に失敗しました:", e.message); process.exit(1); });
