#!/usr/bin/env node
/*
 * Bluesky で、タルコフ（Escape from Tarkov）についての最近の投稿を探して、いいねを付ける（1回に付ける数の上限つき）。
 *   役割はこれだけ。投稿はしない（動画の告知は bsky-post-video.mjs）。MTG サイトの同じ仕組みを、タルコフ向けにしたもの。
 *
 *   node sns/bsky-like.mjs                 … いいねを付ける
 *   DRY_RUN=1 node sns/bsky-like.mjs       … 付ける候補を見るだけ（いいねはしない）
 *
 * 環境変数：BSKY_HANDLE, BSKY_APP_PASSWORD（無ければ何もしない）
 *           LIKE_LIMIT … 1回の実行で付ける数。既定 50。50〜200 の間で使う（50 より小さい数は 50、200 より大きい数は 200）。
 *                        その日に手で付けたいいねや、手で押した実行の分は数えない。自動の実行が1日1回だけ動くようにするのは bsky-like-done.mjs
 *           LIKE_LIMIT_SRC … 件数をどこから取ったか（input / var / default。Summary に出すだけ）
 *           MANUAL     … 1 なら手で押した実行（手で入れた件数は 1〜200 で試せる）
 *
 * 付けない投稿：自分の投稿、もう付けた投稿、返信、ラベル（成人向け・スパムなど）の付いた投稿や人、
 *               ミュート・ブロックの関係にある人、短すぎる投稿、タルコフの話ではない投稿、2日より前の投稿。
 * 同じ人には、きのう・きょう（日本時間）にいいねを付けていたら付けない（毎日同じ人に付かないよう、1日以上あける。手で付けたいいねも含む）。
 * 1回の実行で、同じ人には1つだけ。いいねとの間は「20秒〜75秒のランダム」あける。
 *   確認用に LIKE_WAIT_MS（固定の分）・LIKE_JITTER_MIN_MS / LIKE_JITTER_MAX_MS（ランダムの幅）で変えられる。
 */
import { login, sleep, summary } from "./bsky.mjs";

const DRY = process.env.DRY_RUN === "1";
const MANUAL = process.env.MANUAL === "1";
// 全角の数字（「５０」）や「50件」のような書き方でも読めるようにする
const RAW_LIMIT = String(process.env.LIKE_LIMIT || "").replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).trim();
const LIMIT_MIN = 50, LIMIT_MAX = 200;
const LIMIT = (() => {
  const n = parseInt(RAW_LIMIT || String(LIMIT_MIN), 10) || LIMIT_MIN;
  return Math.min(LIMIT_MAX, Math.max(MANUAL && process.env.LIKE_LIMIT_SRC === "input" ? 1 : LIMIT_MIN, n));
})();
const LIMIT_FROM = { input: "手で押したときの入力", var: "設定（Variables の BSKY_LIKE_LIMIT）", default: "既定（BSKY_LIKE_LIMIT が Variables に無い）" }[process.env.LIKE_LIMIT_SRC] || "";
const WAIT_MS = +(process.env.LIKE_WAIT_MS ?? 0);
const JITTER_MIN = +(process.env.LIKE_JITTER_MIN_MS ?? 20000), JITTER_MAX = +(process.env.LIKE_JITTER_MAX_MS ?? 75000);
const waitMs = () => WAIT_MS + JITTER_MIN + Math.random() * Math.max(0, JITTER_MAX - JITTER_MIN);
const MAX_AGE_H = 48, MIN_TEXT = 20;
const SEARCH_PAGES = 3;          // 言葉ごとに探す回数（1回 100 件まで）
/* タルコフの話をしている投稿か（本文にタルコフの言葉があるか）。「EFT」だけだと送金（電子資金移動）などの投稿も混ざるので、使わない */
const ON_TOPIC = /tarkov|タルコフ/i;

/* 探す言葉。英語と日本語。上から順に1件ずつ交互に選ぶ */
const QUERIES = [
  { q: "\"Escape from Tarkov\"", lang: "en" },
  { q: "#Tarkov", lang: "en" },
  { q: "#EscapeFromTarkov" },
  { q: "タルコフ", lang: "ja" },
  { q: "#タルコフ" },
  { q: "Tarkov PvE" }
];

const jstMidnight = () => { const d = new Date(Date.now() + 9 * 3600000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 9 * 3600000; };
const postUrl = p => `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split("/").pop()}`;
const oneLine = s => String(s || "").replace(/\s+/g, " ").slice(0, 80);

/* 自分のいいねの記録を新しい順に見て、きのう・きょう（日本時間）にいいねを付けた投稿の人（did）を返す（手で付けたいいねも含む） */
async function recentAuthors(bs){
  const from = jstMidnight() - 24 * 3600000, out = new Set();
  let cursor = "";
  for(let page = 0; page < 10; page++){
    const d = await bs.api(`com.atproto.repo.listRecords?repo=${encodeURIComponent(bs.did)}&collection=app.bsky.feed.like&limit=100${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
    for(const rec of d.records || []){
      if(!(Date.parse(rec.value && rec.value.createdAt) >= from)) return out;
      const m = String((rec.value.subject || {}).uri || "").match(/^at:\/\/([^/]+)\//);
      if(m) out.add(m[1]);
    }
    if(!d.cursor) return out;
    cursor = d.cursor;
  }
  return out;
}

function suitable(p, me, recent){
  const rec = p.record || {};
  if(p.author.did === me || recent.has(p.author.did)) return false;
  if(p.viewer && p.viewer.like) return false;
  if(rec.reply) return false;
  if((p.labels || []).length || (p.author.labels || []).length) return false;
  const v = p.author.viewer || {};
  if(v.muted || v.blockedBy || v.blocking) return false;
  if(String(rec.text || "").trim().length < MIN_TEXT) return false;
  if(!ON_TOPIC.test(String(rec.text || ""))) return false;
  if(Date.now() - Date.parse(p.indexedAt || rec.createdAt) > MAX_AGE_H * 3600000) return false;
  return true;
}

async function main(){
  const bs = await login();
  if(!bs){ console.log("Bluesky の鍵（BSKY_HANDLE / BSKY_APP_PASSWORD）が無いので、何もしません。"); return; }
  const recent = await recentAuthors(bs);
  console.log(`きのう・きょういいねを付けた人：${recent.size} 人（今日は付けない）`);
  console.log(`${MANUAL ? "手で押した実行" : "自動の実行"}：${LIMIT} 件まで付けます`);

  const since = new Date(Date.now() - MAX_AGE_H * 3600000).toISOString();
  const lists = [];
  for(const { q, lang } of QUERIES){
    try{
      const found = []; let cursor = "";
      for(let page = 0; page < SEARCH_PAGES; page++){
        const d = await bs.api(`app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=100&since=${encodeURIComponent(since)}${lang ? "&lang=" + lang : ""}${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
        found.push(...(d.posts || []));
        if(!d.cursor || !(d.posts || []).length) break;
        cursor = d.cursor;
      }
      lists.push(found.filter(p => suitable(p, bs.did, recent)));
    }catch(e){ console.log(`「${q}」を探せませんでした: ${e.message}`); lists.push([]); }
  }
  const picked = [], seenPost = new Set(), seenAuthor = new Set();
  for(let i = 0; picked.length < LIMIT && lists.some(l => i < l.length); i++){
    for(const l of lists){
      const p = l[i]; if(!p || picked.length >= LIMIT) continue;
      if(seenPost.has(p.uri) || seenAuthor.has(p.author.did)) continue;
      seenPost.add(p.uri); seenAuthor.add(p.author.did); picked.push(p);
    }
  }
  console.log(`候補：${picked.length} 件（付けたい数 ${LIMIT} 件）`);
  if(!picked.length){   // 見つからなかったときも「1件も付けられなかった」として失敗にする（自動の実行は、その日の次の時刻にもう一度探す）
    console.log("いいねを付ける投稿は見つかりませんでした。"); await summary("いいねを付ける投稿は見つかりませんでした。");
    if(!DRY) process.exitCode = 1; return;
  }

  const rows = []; let ok = 0;
  for(const [i, p] of picked.entries()){
    if(i && !DRY){ const w = waitMs(); console.log(`（${Math.round(w / 1000)} 秒待ちます）`); await sleep(w); }
    const line = `@${p.author.handle}：${oneLine(p.record.text)}`;
    if(DRY){ console.log("候補 " + line); rows.push(`| 候補 | [${line.replace(/\|/g, "／")}](${postUrl(p)}) |`); continue; }
    try{
      await bs.create("app.bsky.feed.like", { $type: "app.bsky.feed.like", subject: { uri: p.uri, cid: p.cid }, createdAt: new Date().toISOString() });
      console.log("いいね " + line); rows.push(`| いいね | [${line.replace(/\|/g, "／")}](${postUrl(p)}) |`); ok++;
    }catch(e){ console.log(`いいねに失敗（${line}）: ${e.message}`); rows.push(`| 失敗 | ${line.replace(/\|/g, "／")} |`); }
  }
  /* 1件も付けられなかったときだけ、実行を「失敗」にする（自動の実行は、その日の次の時刻にもう一度動く）。
     一部だけ失敗したときは「成功」のまま（もう一度動くと、その日のいいねが2回分になるため。失敗した投稿は Summary に出る） */
  if(!DRY && !ok) process.exitCode = 1;
  await summary(`## Bluesky のいいね${DRY ? "（候補を見るだけ）" : ""}\n\n${MANUAL ? "手で押した実行" : "自動の実行"}：${DRY ? "" : `${ok} 件 / `}上限 ${LIMIT} 件${LIMIT_FROM ? `（${LIMIT_FROM}）` : ""}\n\n| | 投稿 |\n|---|---|\n${rows.join("\n")}\n`);
}

main().catch(e => { console.error("いいねに失敗しました:", e.message); process.exit(1); });
