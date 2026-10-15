/* 保存データ（snapshot.mjs）と「開いたらすぐ出る」の確認
   1) 作り物の API を立てて snapshot.mjs を走らせ、data/*.json ができること
   2) その data を置いたサーバーで loot.html / flip.html を開くと、ボタンを押さずに出ること（tarkov.dev には行かない）
   3) 保存データが無いときは、その場で取りに行って出ること */
import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
import http from "node:http";
import { execFile } from "node:child_process";
/* 作り物の API が同じプロセスにいるので、待つあいだも止めない（同期で呼ぶと応答できずに固まる） */
const run = (args, env) => new Promise((ok, ng) => execFile("node", args, {env: {...process.env, ...env}}, (e, so, se) => { process.stdout.write(so); e ? ng(e) : ok(); }));
import { readFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { ITEMS, TRADERS, FLEA } from "./fixture.mjs";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (c, m) => { console.log((c ? "  ok " : "  NG ") + m); if (!c) fail++; };

/* 作り物の tarkov.dev */
let apiHits = 0;
const api = http.createServer((req, res) => {
  apiHits++;
  const m = req.url.match(/^\/(regular|pve|pvp-season)\/(.+)$/), p = m ? m[2] : "";
  const send = d => { res.writeHead(200, {"content-type": "application/json", "access-control-allow-origin": "*"}); res.end(JSON.stringify({data: d})); };
  if (p === "items") return send({items: ITEMS, fleaMarket: FLEA});
  if (/^(items|traders)_(ja|en)$/.test(p)) return send({});
  if (p === "traders") return send(TRADERS);
  if (/^(tasks|hideout|barters|crafts)$/.test(p)) return send(null);
  res.writeHead(404); res.end();
}).listen(0);
const API = `http://127.0.0.1:${api.address().port}/`;

console.log("snapshot.mjs");
const out = mkdtempSync(join(tmpdir(), "eft-snap-"));
await run([join(ROOT, "snapshot.mjs"), "regular", "pve"], {EFT_JSON_API: API, EFT_OUT: out});
ok(existsSync(join(out, "regular.json")) && existsSync(join(out, "pve.json")), "モードごとに data/<モード>.json ができる");
const snap = JSON.parse(readFileSync(join(out, "regular.json"), "utf8"));
ok(snap.v === 1 && snap.items.length === Object.keys(ITEMS).length && !isNaN(Date.parse(snap.at)), `中身と時刻が入る / ${snap.items.length} 品目`);
let bad = false;
await run([join(ROOT, "snapshot.mjs"), "regular"], {EFT_JSON_API: "http://127.0.0.1:1/", EFT_OUT: out}).catch(() => { bad = true; });
ok(bad && JSON.parse(readFileSync(join(out, "regular.json"), "utf8")).at === snap.at, "取れないときは失敗で終わり、前回のファイルは残る");

/* 画面を置くサーバー（data/ だけ差し替えられるように） */
let dataDir = out;
const TYPES = {".html": "text/html; charset=utf-8", ".json": "application/json"};
const site = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = u.startsWith("/data/") ? join(dataDir, u.slice(6)) : join(ROOT, "public", u === "/" ? "index.html" : u.slice(1));
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {"content-type": TYPES[extname(f)] || "application/octet-stream"}); res.end(readFileSync(f));
}).listen(0);
const SITE = `http://127.0.0.1:${site.address().port}/`;

const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
async function open(file){
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  /* 本物の tarkov.dev へは行かせない。行ったら作り物の API に回して、回数を数える */
  await page.route("https://json.tarkov.dev/**", async r => { const res = await fetch(r.request().url().replace("https://json.tarkov.dev/", API)); await r.fulfill({ status: res.status, contentType: "application/json", headers: {"access-control-allow-origin": "*"}, body: await res.text() }); });
  await page.addInitScript(() => { try { localStorage.setItem("eftflip.settings", JSON.stringify({ lang: "ja", mode: "regular", playerLevel: 40 })); } catch (e) {} });
  await page.goto(SITE + file, { waitUntil: "load" });
  return { page, errs };
}

console.log("開いたらすぐ出る（保存データあり）");
for (const file of ["loot.html", "flip.html"]) {
  apiHits = 0;
  const { page, errs } = await open(file);
  const sel = file === "loot.html" ? "#tierBoard .ti" : "#tbl tbody tr";
  const shown = await page.waitForSelector(sel, { timeout: 10000 }).then(() => true, () => false);
  ok(shown, `${file}：ボタンを押さずに表示される`);
  const st = await page.$eval("#status", n => n.textContent);
  ok(/時点のデータ/.test(st), `${file}：保存データの時刻が出る / ${st}`);
  if (file === "loot.html") ok(apiHits === 0, `${file}：tarkov.dev には取りに行かない / ${apiHits} 回`);
  ok(errs.length === 0, `${file}：エラーなし ${errs.join(" / ")}`);
  if (file === "loot.html") {
    await page.click("#loadBtn");
    await page.waitForFunction(() => /取得（/.test(document.getElementById("status").textContent), null, { timeout: 10000 }).catch(() => {});
    ok(/取得（/.test(await page.$eval("#status", n => n.textContent)) && apiHits > 0, "「最新の価格に更新」でその場の価格に切り替わる");
  }
  await page.close();
}

console.log("保存データが無いとき");
dataDir = mkdtempSync(join(tmpdir(), "eft-empty-"));
{
  apiHits = 0;
  const { page, errs } = await open("loot.html");
  const shown = await page.waitForSelector("#tierBoard .ti", { timeout: 10000 }).then(() => true, () => false);
  ok(shown && apiHits > 0, `その場で取りに行って表示される / API ${apiHits} 回`);
  ok(errs.length === 0, "エラーなし " + errs.join(" / "));
  await page.close();
}

await browser.close(); api.close(); site.close();
rmSync(out, { recursive: true, force: true }); rmSync(dataDir, { recursive: true, force: true });
console.log(fail ? `\n${fail} 件失敗` : "\nすべて通過");
process.exit(fail ? 1 : 0);
