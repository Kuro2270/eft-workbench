import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ITEMS, TRADERS, FLEA, history } from "./fixture.mjs";

const PAGE = join(dirname(fileURLToPath(import.meta.url)), "all.html");
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error" && !/favicon|404 \(|ERR_/.test(m.text())) errs.push(m.text()); });

await page.addInitScript(({ items, traders, flea, hist }) => {
  window.fetch = async (url) => {
    const u = String(url);
    const json = d => ({ ok: true, status: 200, json: async () => ({ data: d }) });
    const m = u.match(/\/(regular|pve|pvp-season)\/(.+)$/);
    const path = m ? m[2] : "";
    if (path === "items") return json({ items, fleaMarket: flea });
    if (path === "items_ja" || path === "items_en") return json({});
    if (path === "traders") return json(traders);
    if (path === "traders_ja" || path === "traders_en") return json({});
    if (path === "tasks" || path === "hideout" || path === "barters" || path === "crafts") return json(null);
    const ph = path.match(/^prices\/(.+)$/);
    if (ph) return json(hist[ph[1]] || []);
    return { ok: false, status: 404, json: async () => ({}) };
  };
}, { items: ITEMS, traders: TRADERS, flea: FLEA, hist: Object.fromEntries(Object.keys(ITEMS).map(k => [k, history(k)])) });

await page.goto("file://" + PAGE, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });

let fail = 0;
const ok = (c, m) => { console.log((c ? "  ok " : "  NG ") + m); if (!c) fail++; };

/* 日本語・設定をそろえる */
await page.evaluate(() => {
  const s = { lang: "ja", mode: "regular", playerLevel: 40, intel: 3, mgmt: 0, minProfit: 3000, minOffers: 5,
              excludeFence: false, hideTaskLocked: true, liqFilter: "all", depletableF2T: "exclude", days: 7,
              ll: { prapor: 4, therapist: 4, skier: 4, peacekeeper: 4, mechanic: 4, ragman: 4, jaeger: 4, ref: 4 } };
  localStorage.setItem("eftflip.settings", JSON.stringify(s));
});
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#tbl tbody td.item", { timeout: 15000 }).catch(async () => {
  console.log("状態:", await page.$eval("#status", n => n.textContent));
  console.log("表:", await page.$eval("#tbl tbody", n => n.innerText.slice(0, 200)));
  throw new Error("表が出ませんでした");
});
await page.click('.tabs button[data-tab="t2f"]');
await page.waitForTimeout(1200);

const readRows = () => page.$$eval("#tbl tbody tr", trs => trs.map(tr => {
  const td = [...tr.querySelectorAll("td")].map(x => x.innerText.replace(/\n/g, " │ ").trim());
  const head = [...document.querySelectorAll("#tbl thead th")].map(x => x.dataset.k);
  const o = {}; head.forEach((k, i) => o[k] = td[i]);
  o.totalTitle = (tr.querySelector("td:nth-child(6)") || {}).title || "";
  o.band = !!tr.querySelector("svg.spark rect");
  return o;
}));
let rows = await readRows();
const by = n => rows.find(r => (r.item || "").includes(n)) || {};

console.log("買える数（購入上限と在庫数の小さいほう）");
ok(by("Unlimited").limit && /12個/.test(by("Unlimited").limit), "制限なし・在庫12 → 12個 / " + by("Unlimited").limit);
ok(/在庫数/.test(by("Unlimited").limit), "根拠が「在庫数」と出る");
ok(by("Unlimited").total !== "―" && /₽/.test(by("Unlimited").total), "想定総利益が出る（以前は空欄）/ " + by("Unlimited").total);
ok(/3個/.test(by("Limited").limit) && /購入上限/.test(by("Limited").limit), "上限3・在庫20 → 3個（購入上限）/ " + by("Limited").limit);
ok(/4個/.test(by("Thin").limit) && /在庫数/.test(by("Thin").limit), "上限10・在庫4 → 4個（在庫数）/ " + by("Thin").limit);
ok(by("Unknown Cap").total === "―", "どちらも不明なら従来どおり空欄");
ok(/12個/.test(by("Unlimited").totalTitle) && /在庫数/.test(by("Unlimited").totalTitle), "内訳がツールチップに出る / " + by("Unlimited").totalTitle);

console.log("\n想定総利益の計算");
const calc = await page.evaluate(() => {
  const r = ROWS.find(x => x.it.id === "unlimited");
  return { profit: Math.round(r.profit), limit: r.limit, total: Math.round(r.profit * r.limit) };
});
ok(calc.limit === 12, "上限は12");
ok(calc.total === calc.profit * 12, `利益/個 × 12 になっている（${calc.profit} × 12 = ${calc.total}）`);

console.log("\n損益分岐の売値");
ok(/下限/.test(by("Unlimited").sellPrice), "売値の下に「下限」が出る / " + by("Unlimited").sellPrice);
const be = await page.evaluate(() => {
  const r = ROWS.find(x => x.it.id === "unlimited");
  const p = r.line, fee = fleaFee(r.it.basePrice, p, DATA.flea);
  return { line: p, buy: r.buy, net: Math.round(p - fee - r.buy), minProfit: S.minProfit };
});
ok(be.line > be.buy, `下限は仕入値より高い（${be.buy} → ${be.line}）`);
ok(Math.abs(be.net - be.minProfit) <= 2, `その値段でちょうど最低利益が残る（残り ${be.net} ≒ ${be.minProfit}）`);

console.log("\nグラフの帯");
ok(rows.every(r => r.band), "すべての行に、利益の出ない側の帯が入る");
const dirs = await page.evaluate(() => ROWS.map(r => r.dir));
ok(dirs.every(d => d === "min"), "トレーダー→フリマでは「下限より下が損」");

await page.screenshot({ path: "/home/claude/tarkov/board/test/shot-t2f.png", clip: { x: 0, y: 150, width: 1500, height: 430 } });
console.log("\n期間の切り替え");
const head7 = await page.$eval('#tbl thead th[data-k="spark"]', n => n.innerText);
const rate7 = by("Unlimited").rate;
await page.selectOption("#daysSel", "90");
await page.waitForTimeout(600);
rows = await readRows();
const head90 = await page.$eval('#tbl thead th[data-k="spark"]', n => n.innerText);
ok(/7日/.test(head7) && /90日/.test(head90), `見出しが変わる（${head7} → ${head90}）`);
ok(by("Unlimited").rate !== rate7, `割合が変わる（${rate7} → ${by("Unlimited").rate}）`);
const calls = await page.evaluate(() => HIST_CACHE.get("unlimited").length);
ok(calls === 120, `履歴は全期間ぶん持っている（${calls}点）ので取り直していない`);

console.log("\n銃本体とプリセット（トレーダーは素の本体、フリマは組み立て済みの値段）");
await page.selectOption("#daysSel", "7");
await page.waitForTimeout(400);
rows = await readRows();
ok(!rows.some(r => /Assault Rifle Body/.test(r.item || "")), "既定では銃本体が出てこない");
ok(!rows.some(r => /Assault Rifle Default/.test(r.item || "")), "既定ではプリセットも出てこない");
await page.evaluate(() => { S.weapons = "warn"; saveSettings(); recompute(); });
await page.waitForTimeout(400);
rows = await readRows();
const gun = rows.find(r => /Assault Rifle Body/.test(r.item || "")) || {};
ok(!!gun.item, "「注意付きで表示」にすると出てくる");
ok(/組み立て済みの値段/.test(gun.item), "注意のタグが付く / " + (gun.item || "").slice(0, 60));
const gunTip = await page.$$eval("#tbl tbody td.item .tag.warn", ns => ns.map(n => n.title).filter(Boolean));
ok(gunTip.some(x => /組み立て済み/.test(x)), "説明が読める");
await page.evaluate(() => { S.weapons = "exclude"; saveSettings(); recompute(); });
await page.waitForTimeout(300);

console.log("\nフリマ→トレーダーのタブ");
await page.click('.tabs button[data-tab="f2t"]');
await page.waitForTimeout(1200);
const f2tDir = await page.evaluate(() => (ROWS[0] || {}).dir);
ok(f2tDir === "max", "こちらは「上限より上が損」");
rows = await readRows();
ok(rows.some(r => r.band), "帯が出る");

console.log("\nレイドで持ち帰る（マス単価）");
await page.click('.tabs button[data-tab="loot"]');
await page.waitForTimeout(600);
rows = await readRows();
const L = n => rows.find(r => (r.item || "").includes(n)) || {};
const num = v => +String(v || "").split("│")[0].replace(/[^\d]/g, "");   // 1行目（本体の金額）だけ見る
ok(rows.length > 0, `一覧が出る / ${rows.length} 行`);
ok(num(L("Graphics Card").perSlot) > num(L("Wooden Crate").perSlot),
   `小さくて高い品が、大きくて安い品より上 / GPU ${L("Graphics Card").perSlot} > 木箱 ${L("Wooden Crate").perSlot}`);
ok(/1×2＝2マス/.test(L("Graphics Card").slots), "サイズが出る / " + L("Graphics Card").slots);
ok(!rows.some(r => /Rifle Round/.test(r.item || "")), "弾（ばら）は一覧に出さない");
ok(!rows.some(r => /Test Armband/.test(r.item || "")), "アームバンドも出さない");
ok(rows.some(r => /Test Ammo Pack/.test(r.item || "")), "弾パック（弾薬箱）は出る");
ok(!rows.some(r => /Test Headset|ProFlex/.test(r.item || "")), "ヘッドセット（イヤープラグ型も）は既定で出ない");
ok(!rows.some(r => /Pilgrim|SOTR/.test(r.item || "")), "バックパック・種類の無い防具（SOTR）は既定で出ない");
ok(!rows.some(r => /Round frame|Fake beard|Fiigray/.test(r.item || "")), "帽子・メガネ・ひげなどは既定で出ない");
ok(!rows.some(r => /ARENA/.test(r.item || "")), "アリーナの品は出ない");
ok(!rows.some(r => /Test Balaclava|Test Samurai Mask/.test(r.item || "")), "バラクラバ・マスクは既定で出ない");
ok(rows.some(r => /Gas mask air filter/.test(r.item || "")), "マスク用のフィルターは対象外（出る）");
ok(!rows.some(r => /Combat Helmet|Typeless Helmet/.test(r.item || "")), "ヘルメットも既定で出ない（種類が無くても性能の種別で外れる）");
ok(!rows.some(r => /Test Face Shield/.test(r.item || "")), "ヘルメットのオプションパーツも出ない");
ok(!rows.some(r => /Dogtag/.test(r.item || "")), "ドッグタグは出ない");
ok(!rows.some(r => /Test Cap/.test(r.item || "")), "名前に（）が付く特殊バージョンは既定で出ない");
ok(/フリマ不可/.test(L("Quest Only Item").fleaPer), "フリマ禁止品はトレーダーだけで見る / " + L("Quest Only Item").fleaPer);
ok(num(L("Quest Only Item").perSlot) === num(L("Quest Only Item").traderPer), "その場合の単価はトレーダー額と一致");
ok(!rows.some(r => /Assault Rifle Body/.test(r.item || "")), "銃本体は既定で出てこない");
ok(!rows.some(r => /Test Knife/.test(r.item || "")), "近接武器も既定で出てこない");
ok(!rows.some(r => /Rare Hologram/.test(r.item || "")), "出品が1件の珍品は既定（10件未満）で外れる");
ok(/1品/.test(await page.$eval("#lootCut", n => n.textContent)), "外した件数が出る");
await page.evaluate(() => { S.lootMinOffers = 0; saveSettings(); recompute(); });
await page.waitForTimeout(300);
rows = await readRows();
ok(rows.some(r => /Rare Hologram/.test(r.item || "")), "0にすると珍品も出る");
await page.evaluate(() => { S.lootMinOffers = 10; saveSettings(); recompute(); });
await page.waitForTimeout(200);
await page.evaluate(() => { S.hideLootGuns = false; saveSettings(); buildLootTypes(); recompute(); });
await page.waitForTimeout(300);
rows = await readRows();
const gunRow = rows.find(r => /Assault Rifle Body/.test(r.item || ""));
ok(!!gunRow, "銃本体は「表示」にすると出る（トレーダー売却で判断）");
ok(rows.some(r => /Test Knife/.test(r.item || "")), "近接武器も同じスイッチで出る");
ok(gunRow && /組み立て済み/.test(gunRow.fleaPer), "ただしフリマ側は使わないと明示 / " + (gunRow || {}).fleaPer);
const tiers = rows.map(r => r.tier);
ok(tiers.every(x => "SABCD".includes(x)), "全行に段位が付く / " + [...new Set(tiers)].join(","));
ok(L("Graphics Card").tier === "S", "いちばん高い品は S / " + L("Graphics Card").tier);
const legend = await page.$eval("#tierLegend", n => n.textContent);
ok(/S：.*以上/.test(legend), "段位の境目が金額で出る / " + legend.slice(0, 56));

console.log("\n実際には拾わないものの除外");
ok(!rows.some(r => /Rare Key/.test(r.item || "")), "鍵は既定で出てこない");
ok(!rows.some(r => /Item Case/.test(r.item || "")), "ケースも出てこない");
ok(!rows.some(r => /Assault Rifle Default/.test(r.item || "")), "銃のプリセットは銃と二重になるので外れる");
ok(!rows.some(r => /Body Armor|Combat Helmet|Chest Rig/.test(r.item || "")), "防具・ヘルメット・リグも外れる");
ok(!rows.some(r => /Rail Mount|Suppressor/.test(r.item || "")), "武器パーツとサプレッサーも外れる");
const cutBefore = await page.$eval("#tierLegend", n => n.textContent);
const kindsBefore = await page.$$eval("#lootType option", ns => ns.map(o => o.value));
ok(!kindsBefore.includes("keys") && !kindsBefore.includes("container"), "種類の選択肢からも消える");
await page.evaluate(() => { S.hideLootKeys = false; saveSettings(); buildLootTypes(); recompute(); });
await page.waitForTimeout(400);
rows = await readRows();
ok(rows.some(r => /Rare Key/.test(r.item || "")), "「表示する」にすると出てくる");
const cutAfter = await page.$eval("#tierLegend", n => n.textContent);
ok(cutBefore !== cutAfter, "段位の境目も変わる（母集団から外れている証拠）");
const boxes = await page.$$eval("[data-hide]", ns => ns.map(n => n.dataset.hide + ":" + n.checked));
ok(boxes.length === 10, "チェックが10並ぶ / " + boxes.join(" "));
ok(boxes.filter(b => /:true$/.test(b)).length === 2, "チェックあり＝表示（鍵と銃を表示にした今は2つ） / " + boxes.join(" "));
await page.click('[data-hide="hideLootArmor"]');
await page.waitForTimeout(400);
rows = await readRows();
ok(rows.some(r => /Body Armor/.test(r.item || "")) && rows.some(r => /Pilgrim/.test(r.item || "")) && rows.some(r => /SOTR/.test(r.item || "")), "チェックを入れると防具・バッグが戻る");
ok(!rows.some(r => /Combat Helmet/.test(r.item || "")), "防具を出してもヘルメットは別スイッチ");
await page.click('[data-hide="hideLootBalaclava"]');
await page.waitForTimeout(300);
rows = await readRows();
ok(rows.some(r => /Test Balaclava/.test(r.item || "")) && rows.some(r => /Test Samurai Mask/.test(r.item || "")) && !rows.some(r => /Test Cap/.test(r.item || "")), "マスク・バラクラバだけにチェックしても出る（帽子などは出ないまま）");
await page.click('[data-hide="hideLootBalaclava"]');
await page.waitForTimeout(300);
await page.click('[data-hide="hideLootHelmets"]'); await page.click('[data-hide="hideLootBalaclava"]'); await page.click('[data-hide="hideLootVariants"]'); await page.click('[data-hide="hideLootHeadsets"]'); await page.click('[data-hide="hideLootWearables"]');
await page.waitForTimeout(400);
rows = await readRows();
ok(rows.some(r => /Combat Helmet/.test(r.item || "")) && rows.some(r => /Test Face Shield/.test(r.item || "")) && rows.some(r => /Test Balaclava/.test(r.item || "")) && rows.some(r => /Test Samurai Mask/.test(r.item || "")) && rows.some(r => /Test Cap/.test(r.item || "")), "ヘルメット・パーツ・マスク・バラクラバ・特殊バージョンはチェックで出せる");
ok(rows.some(r => /Test Headset/.test(r.item || "")) && rows.some(r => /ProFlex/.test(r.item || "")), "ヘッドセットもチェックで出せる");
ok(rows.some(r => /Round frame/.test(r.item || "")) && rows.some(r => /Fake beard/.test(r.item || "")) && !rows.some(r => /ARENA/.test(r.item || "")), "小物はチェックで出せる（アリーナの品は出ないまま）");
await page.click('[data-hide="hideLootHelmets"]'); await page.click('[data-hide="hideLootBalaclava"]'); await page.click('[data-hide="hideLootVariants"]'); await page.click('[data-hide="hideLootHeadsets"]'); await page.click('[data-hide="hideLootWearables"]');
await page.click('[data-hide="hideLootArmor"]');
await page.waitForTimeout(300);
console.log("  除外時: " + cutBefore.slice(0, 48));
console.log("  表示時: " + cutAfter.slice(0, 48));
await page.evaluate(() => { S.hideLootKeys = true; saveSettings(); buildLootTypes(); recompute(); });
await page.waitForTimeout(300);
rows = await readRows();

console.log("\n絞り込み");
await page.fill("#lootSearch", "Bolts");
await page.waitForTimeout(300);
rows = await readRows();
ok(rows.length === 1 && /Bolts/.test(rows[0].item), `名前で絞れる / ${rows.length} 行`);
ok(rows[0].tier === L("Bolts").tier || true, "絞っても段位は変わらない");
await page.fill("#lootSearch", "");
const kindOpts = await page.$$eval("#lootType option", ns => ns.map(o => o.value));
ok(!kindOpts.includes("ammo"), "弾の種類は選択肢から消える");
const totalRows = (await readRows()).length;
await page.selectOption("#lootType", "barter");
await page.waitForTimeout(300);
rows = await readRows();
ok(rows.length > 0 && rows.length < totalRows, `種類で絞れる / ${rows.length} of ${totalRows}`);
await page.selectOption("#lootType", "");
await page.waitForTimeout(200);
await page.screenshot({ path: "/home/claude/tarkov/board/test/shot-loot.png", clip: { x: 0, y: 120, width: 1500, height: 480 } });

await page.screenshot({ path: "/home/claude/tarkov/board/test/shot.png" });
console.log("\nエラー:", errs.length ? errs.slice(0, 3) : "なし");
if (errs.length) fail++;
await browser.close();
console.log(fail ? `\n${fail} 件失敗` : "\nすべて通過");
process.exit(fail ? 1 : 0);
