/* 価格データを tarkov.dev から取って、画面がすぐ読める形で保存する（定期実行用）
     node snapshot.mjs                 … regular（PvP）・pvp-season（PvP シーズナル）・pve の3つ
     node snapshot.mjs regular         … 指定したモードだけ
   書き出し先：public/data/<モード>.json（手元で開いたときに画面がまずこれを読む。リポジトリには入れない）
             公開サイトでは、GitHub Actions がこのファイルを Cloudflare の保存場所（Workers KV）に置き、
             functions/data/[mode].js が /data/<モード>.json として返す（EFT_OUT で書き出し先を変えられる）
   組み立ては src/data.js（画面と共通）。ここは「取ってきて保存する」ことだけをする。
   取れなかったモードは、前回のファイルを残したまま失敗として終わる（壊れたデータで上書きしない） */
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const API = process.env.EFT_JSON_API || "https://json.tarkov.dev/";
const MODES = process.argv.slice(2).length ? process.argv.slice(2) : ["regular", "pvp-season", "pve"];
const OUT = process.env.EFT_OUT || join(dir, "public", "data");

/* src/data.js は画面に埋め込むための普通のスクリプトなので、関数として読み込む */
const { RAW_PATHS, buildData } = new Function(readFileSync(join(dir, "src", "data.js"), "utf8") + "\nreturn {RAW_PATHS, buildData};")();

async function getJson(mode, path){
  const r = await fetch(API + mode + "/" + path, {headers: {Accept: "application/json"}, signal: AbortSignal.timeout(180000)});
  if(!r.ok) throw new Error(`${mode}/${path}: HTTP ${r.status}`);
  return (await r.json()).data;
}
async function snapshot(mode){
  const got = await Promise.all(RAW_PATHS.map(r => getJson(mode, r.path).catch(err => {
    if(!r.soft) throw err;
    console.warn(`  （なくても続ける）${err.message}`); return null;
  })));
  const d = buildData(Object.fromEntries(RAW_PATHS.map((r, i) => [r.key, got[i]])));
  if(!d.items.length) throw new Error(`${mode}: 品目が0件`);
  const json = JSON.stringify({...d, at: new Date().toISOString(), mode});
  mkdirSync(OUT, {recursive: true});
  const file = join(OUT, `${mode}.json`), tmp = file + ".tmp";
  writeFileSync(tmp, json); renameSync(tmp, file);       // 書き終えてから差し替える
  console.log(`${mode}: ${d.items.length} 品目 → ${file}（${(json.length / 1048576).toFixed(1)} MB）`);
}

let failed = 0;
for(const mode of MODES){
  try{ await snapshot(mode); }
  catch(err){ failed++; console.error(`${mode}: 取得できませんでした … ${err.message}`); }
}
process.exit(failed ? 1 : 0);
