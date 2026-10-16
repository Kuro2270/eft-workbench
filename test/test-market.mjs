/* 売り時・買い時（watch.html）の確認
   1) 計算（market.js）：過去の幅の中での位置・底値付近／高値付近・おすすめの値段・跳ねた値の扱い・記録が少ないとき
   2) 画面：候補を選んで記録を取り、買い場・売り場に並ぶ／おすすめの値段と手取り／クリックでグラフ／探した品／通知の部品が無い */
import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ITEMS, TRADERS, FLEA } from "./fixture.mjs";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (c, m) => { console.log((c ? "  ok " : "  NG ") + m); if (!c) fail++; };

console.log("計算（market.js）");
const M = new Function(readFileSync(join(ROOT, "src", "market.js"), "utf8") + "\nreturn {marketView, quickDev, quantile, movingAvg, trendLines, pricePoints, isFresh, buyProfit, stockState};")();
const H = 3600e3, D = 24 * H, now = Date.now();
/* 30日分、2時間おき。値段は 50,000〜150,000 を行き来する（最後の記録は1時間前） */
const cycle = (extra = {}) => {
  const out = [];
  let i = 0;
  for (let t = now - 30 * D + H; t <= now - H; t += 2 * H, i++) out.push({ timestamp: String(t), priceMin: extra[i] || 50000 + (i % 11) * 10000, offerCount: 20 });
  return out;
};
const lastN = (n, price) => { const h = cycle(); for (let k = 1; k <= n; k++) h[h.length - k].priceMin = price; return h; };
let v = M.marketView(lastN(3, 52000), { days: 30, now });
ok(v.zone === "buy" && v.pos < 0.1, `直近3回の相場が底値付近（位置 ${Math.round(v.pos * 100)}%）→ 買い場`);
ok(Math.round(v.low) === 50000 && Math.round(v.high) === 150000, `幅は下5%〜上5%の値 / ${Math.round(v.low)}〜${Math.round(v.high)}`);
ok(v.buyAt > v.low && v.buyAt < v.median && v.sellAt > v.median && v.sellAt < v.high, `おすすめ買値 ${Math.round(v.buyAt)}・売値 ${Math.round(v.sellAt)}（下25%・上25%）`);
v = M.marketView(lastN(3, 148000), { days: 30, now });
ok(v.zone === "sell" && v.pos > 0.9, `高値付近（位置 ${Math.round(v.pos * 100)}%）→ 売り場`);
v = M.marketView(lastN(3, 100000), { days: 30, now });
ok(v.zone === "mid", "真ん中あたりは、どちらでもない");
v = M.marketView(lastN(1, 52000), { days: 30, now });
ok(v.zone !== "buy", "最後の1回だけ安い読み取りでは、買い場にしない（直近3回の中央値）");
v = M.marketView(lastN(3, 100000), { days: 30, now, live: { price: 60000, at: now } });
ok(v.price === 100000 && v.oddLow && v.oddLow.price === 60000 && v.zone === "mid", "一覧の最安値が相場より極端に安くても、判定には使わず「極端に安い出品」として出すだけ");
{
  /* 6日周期で 50,000〜150,000 を上下する品（底値と高値を何度も行き来） */
  const wave = []; let i = 0;
  for (let t = now - 30 * D + H; t <= now - H; t += 2 * H, i++) { const ph = (i % 72) / 72; wave.push({ timestamp: String(t), priceMin: Math.round(50000 + 100000 * (ph < 0.5 ? ph * 2 : 2 - ph * 2)), offerCount: 20 }); }
  for (let k = 1; k <= 3; k++) wave[wave.length - k].priceMin = 52000;
  const w = M.marketView(wave, { days: 30, now });
  ok(w.zone === "buy" && w.rebounds >= 3, `底値と売値を行き来する品は、戻った回数が数えられる / ${w.rebounds}回`);
  /* ZB-014 の鍵のような品：最初の10日は高く、急落して、あとは安いまま（小さな上下と、1回だけ跳ねた読み取りはある） */
  const zb = []; i = 0;
  for (let t = now - 30 * D + H; t <= now - H; t += 2 * H, i++) {
    const day = (now - t) / D;
    let p = day > 20 ? 160000 : day > 15 ? 160000 - (20 - day) * 22000 : 50000 + (i % 9) * 2500;
    if (i === 250) p = 160000;                       // 1回だけ跳ねた読み取り
    zb.push({ timestamp: String(t), priceMin: Math.round(p), offerCount: 20 });
  }
  const f = M.marketView(zb, { days: 30, now });
  ok(f.zone === "buy" && f.rebounds === 0 && f.recentHigh < f.sellAt, `急落して戻っていない品は 0回（底値のあとの最高 ${Math.round(f.recentHigh)} < 売値 ${Math.round(f.sellAt)}）`);
}
{
  const h = cycle().map(p => ({ ...p, price: p.priceMin, priceMin: Math.round(p.priceMin * 0.5) }));
  const w = M.marketView(h, { days: 30, now });
  ok(Math.round(w.low) === 50000, "記録に平均価格があれば、最安値ではなく平均価格を使う");
}
v = M.marketView(cycle({ 5: 2000000, 9: 900000 }), { days: 30, now });
ok(Math.round(v.high) <= 160000, `極端に跳ねた数件は、高値に入れない / 高値 ${Math.round(v.high)}`);
v = M.marketView(cycle().slice(-8), { days: 30, now });
ok(v.zone === "few", "記録が10件未満なら判定しない");
v = M.marketView(lastN(3, 52000), { days: 7, now });
ok(v.n < 100 && v.zone === "buy", `期間を7日にすると、7日の記録だけで見る / ${v.n} 件`);
{
  const p = M.buyProfit(60000, 100000, ask => ask * 0.1, 0);
  ok(p.via === "flea" && p.sellNet === 90000 && p.profit === 30000 && Math.round(p.rate * 100) === 50, "見込み利益＝おすすめ売値の手取り − 今の最安値（フリマ手数料込み）");
  const q = M.buyProfit(60000, 100000, ask => ask * 0.1, 95000);
  ok(q.via === "trader" && q.profit === 35000, "トレーダーのほうが高く買うなら、トレーダーに売る前提");
}
{
  const sv = { zone: "sell", price: 150000, sellAt: 130000 }, mv = { zone: "mid", price: 100000, sellAt: 130000 };
  ok(M.stockState(sv, 80000, 140000) === "sell" && M.stockState(sv, 160000, 140000) === "high" && M.stockState(mv, 80000, 95000) === "plus" && M.stockState(mv, 120000, 95000) === "hold" && M.stockState({ zone: "few" }, 1, 1) === "few",
     "在庫の状態（売り時／高値だが赤字／利益は出る／待ち／記録不足）");
}
ok(M.quickDev({ lastLowPrice: 90000, avg24hPrice: 100000 }).toFixed(2) === "-0.10" && M.quickDev({ lastLowPrice: 0, avg24hPrice: 1 }) === null, "候補選びの目安（24時間平均との差）");

console.log("画面（watch.html）");
const items = JSON.parse(JSON.stringify(ITEMS));
/* 価格記録は品ごとに「24時間平均の0.5〜1.5倍」を行き来させる。いまの最安値を端に寄せた2品だけが買い場・売り場の先頭に来る */
items.unlimited.lastLowPrice = Math.round(items.unlimited.avg24hPrice * 0.52);   // 候補選び（24時間平均より安い）
items.gpu.lastLowPrice = Math.round(items.gpu.avg24hPrice * 1.48);
/* 上の絞り込みを確かめるため、ほかの品は 出品数・値段の更新・48時間の変動・最安値の外れ方 をばらけさせる */
Object.keys(items).forEach((k, i) => {
  if (["unlimited", "gpu", "limited"].includes(k)) return;
  items[k].lastOfferCount = 15 + (i * 7) % 50;
  items[k].updated = new Date(Date.now() - ((i * 37) % 180) * 60e3).toISOString();
  items[k].changeLast48hPercent = ((i % 9) - 4) * 4;                 // -16〜+16%
  items[k].lastLowPrice = Math.round(items[k].avg24hPrice * (1 + ((i % 7) - 3) * 0.04));   // -12〜+12%
});
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.addInitScript(({ items, traders, flea }) => {
  const T0 = Date.now();
  /* 品ごとに「24時間平均の0.5〜1.5倍」を行き来。直近3回だけ、Unlimited Item は底値（0.52倍）、Graphics Card は高値（1.48倍） */
  const END = { unlimited: 0.52, gpu: 1.48 };
  const hist = id => {
    const base = (items[id] || {}).avg24hPrice || 80000, out = []; let i = 0;
    for (let t = T0 - 30 * 864e5 + 3600e3; t <= T0 - 3600e3; t += 7200e3, i++) {
      /* Limited Item だけは、30日かけて下がり続ける（ワイプ後に値崩れした品のつもり） */
      const ph = (i % 72) / 72;   // 6日周期で 0.5〜1.5倍を上下（底値と高値を何度も行き来する）
      const p = id === "limited" ? base * (1.6 - i * 0.0031) : base * (0.5 + (ph < 0.5 ? ph * 2 : 2 - ph * 2));
      out.push({ timestamp: String(t), priceMin: Math.round(p), offerCount: 20 });
    }
    if (END[id]) for (let k = 1; k <= 3; k++) out[out.length - k].priceMin = Math.round(base * END[id]);
    return out;
  };
  window.__priceCalls = 0;
  window.fetch = async (url) => {
    const u = String(url), json = d => ({ ok: true, status: 200, json: async () => ({ data: d }) });
    const m = u.match(/\/(regular|pve|pvp-season)\/(.+)$/), path = m ? m[2] : "";
    if (path === "items") return json({ items, fleaMarket: flea });
    if (/^(items|traders)_(ja|en)$/.test(path)) return json({});
    if (path === "traders") return json(traders);
    if (/^(tasks|hideout|barters|crafts)$/.test(path)) return json(null);
    const ph = path.match(/^prices\/(.+)$/); if (ph) { window.__priceCalls++; return json(hist(ph[1])); }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  window.__notes = 0; window.Notification = class { constructor(){ window.__notes++; } static permission = "granted"; };
  try { localStorage.setItem("eftflip.settings", JSON.stringify({ lang: "ja", mode: "regular", playerLevel: 40 })); } catch (e) {}
}, { items, traders: TRADERS, flea: FLEA });
await page.goto("file://" + join(ROOT, "public", "watch.html"), { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll(".msec.buy tr.mrow").length > 0 && !/確認中/.test(document.querySelector(".mbar").textContent), null, { timeout: 15000 }).catch(() => {});
ok(/売り時・買い時/.test(await page.title()), "タイトル / " + await page.title());
const buyNames = await page.$$eval(".msec.buy tr.mrow", ns => ns.map(n => n.querySelector("td").textContent));
const sellNames = await page.$$eval(".msec.sell tr.mrow", ns => ns.map(n => n.querySelector("td").textContent));
ok(buyNames.some(n => /Unlimited Item.*底値付近/.test(n)), "底値付近の品が買い場に出る / " + buyNames.slice(0, 4).join(" | "));
ok(/Graphics Card.*高値付近/.test(sellNames[0] || ""), "売り場の先頭に高値付近の品 / " + sellNames.slice(0, 3).join(" | "));
const buyRec = await page.$eval(".msec.buy tr.mrow .mrec", n => n.textContent);
const sellRec = await page.$eval(".msec.sell tr.mrow .mrec", n => n.textContent);
ok(/以下で買う/.test(buyRec) && /以上で売る/.test(sellRec) && /手取り/.test(sellRec), `おすすめの値段（買い：${buyRec}／売り：${sellRec}）`);
const prof = await page.$eval(".msec.buy tr.mrow .mprofit", n => n.textContent).catch(() => "");
ok(/₽[\d,]+ \(\+\d+%\)/.test(prof) && /1マスあたり/.test(prof), "買い場に見込み利益（金額・利益率・1マスあたり）が出る / " + prof);
{
  const profits = await page.$$eval(".msec.buy tr.mrow .mprofit b", ns => ns.map(n => +n.textContent.replace(/[^\d-]/g, "")));
  ok(profits.every((p, i) => i === 0 || profits[i - 1] >= p) && profits.every(p => p >= 10000), "見込み利益が条件以上の品だけ、利益の大きい順 / " + profits.join(","));
}
ok(await page.$eval(".msec.buy tr.mrow .mrange i", n => parseFloat(n.style.left) < 10) && await page.$eval(".msec.sell tr.mrow .mrange i", n => parseFloat(n.style.left) > 90), "幅の帯の中に、いまの位置の印が出る");
ok(await page.evaluate(() => window.__priceCalls) > 0 && await page.evaluate(() => window.__priceCalls) <= 40, "記録は候補の分だけ取る / " + await page.evaluate(() => window.__priceCalls) + " 件");
ok(!(await page.$("[data-w='perm'], [data-w='sound'], [data-w='test'], #watchPanel, #tierBoard:not([hidden]) .ti")), "通知・音・見張りの部品とティア表は無い");

await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = async t => { window.__copied = t; }; });
await page.click(".msec.sell tr.mrow button[data-copy]");
await page.waitForTimeout(150);
ok(await page.evaluate(() => window.__copied) === "Graphics Card" && !(await page.$(".mdetail")), "名前のコピーボタンでコピーでき、行は開かない");
await page.click(".msec.sell tr.mrow");
await page.waitForSelector(".mdetail svg.wchart", { timeout: 3000 }).catch(() => {});
ok(await page.$eval(".mdetail", n => !!n.querySelector(".ma-short") && !!n.querySelector(".ma-long") && !!n.querySelector(".ref-buy") && !!n.querySelector(".ref-sell") && n.querySelectorAll(".dot").length > 100), "クリックで、値動き・24時間平均・7日平均・おすすめ買値／売値の線のグラフが開く");
ok(/底値.*中央.*高値/.test(await page.$eval(".mdetail .mtext", n => n.textContent)), "グラフの下に底値・中央・高値の説明");
{
  const box = await (await page.$(".mdetail svg.wchart")).boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.waitForTimeout(100);
  const tip = await page.$eval("#tip", n => ({ hidden: n.hidden, text: n.textContent }));
  ok(!tip.hidden && /24時間平均/.test(tip.text), "グラフにカーソルを乗せると、その時点の値 / " + tip.text);
  await page.mouse.move(3, 3);
}
await page.screenshot({ path: "/tmp/out/market-shot.png", fullPage: true });
await page.click(".msec.sell tr.mrow");
ok(!(await page.$(".mdetail")), "もう一度クリックで閉じる");

await page.fill('[data-mk="q"]', "graph");
await page.waitForSelector(".msec.found tr.mrow", { timeout: 5000 }).catch(() => {});
ok(/Graphics Card/.test(await page.$eval(".msec.found", n => n.textContent).catch(() => "")), "名前で探すと「探した品」に出る");
await page.fill('[data-mk="q"]', "");

ok(!buyNames.some(n => /Limited Item/.test(n)), "下がり続けて戻っていない品は、買い場に出ない");
ok(/回/.test(await page.$eval(".msec.buy tr.mrow", n => n.textContent)) && /過去30日に戻った回数/.test(await page.$eval(".msec.buy tr.mrow", n => n.textContent)), "戻った回数が出る");
await page.uncheck('[data-mk="mkNeedRebound"]');
await page.waitForTimeout(300);
{
  const rows = await page.$$eval(".msec.buy tr.mrow", ns => ns.map(n => n.textContent));
  ok(rows.some(r => /Limited Item/.test(r) && /戻っていない/.test(r)), "チェックを外すと出る（「戻っていない」と表示）");
}
await page.check('[data-mk="mkNeedRebound"]');
await page.waitForTimeout(300);
await page.fill('[data-mk="mkMinProfit"]', "9999999"); await page.press('[data-mk="mkMinProfit"]', "Tab");
await page.waitForTimeout(300);
ok(/条件（見込み利益/.test(await page.$eval(".msec.buy", n => n.textContent)), "見込み利益の条件を上げると、合わない品は外れて理由が出る");
await page.fill('[data-mk="mkMinProfit"]', "10000"); await page.press('[data-mk="mkMinProfit"]', "Tab");
await page.waitForTimeout(300);
/* 上の絞り込み：条件を厳しくすると一覧は減る（増えない）。「すべて」は個別の種類を含む */
{
  const ids = () => page.$$eval(".msec.buy tr.mrow, .msec.sell tr.mrow", ns => ns.map(n => n.dataset.id));
  const idle = () => page.waitForFunction(() => !/確認中/.test(document.querySelector(".mbar").textContent), null, { timeout: 15000 });
  const set = async (key, v) => {
    const el = await page.$(`[data-mk="${key}"]`);
    const tag = await el.evaluate(n => n.tagName + ":" + n.type);
    if (tag.startsWith("SELECT")) await page.selectOption(`[data-mk="${key}"]`, String(v));
    else if (tag.endsWith("checkbox")) { if (v) await page.check(`[data-mk="${key}"]`); else await page.uncheck(`[data-mk="${key}"]`); }
    else { await page.fill(`[data-mk="${key}"]`, String(v)); await page.press(`[data-mk="${key}"]`, "Tab"); }
    await page.waitForTimeout(150); await idle(); await page.waitForTimeout(100);
    return ids();
  };
  const sub = (a, b) => a.every(x => b.includes(x));
  /* 一番ゆるい状態から始める */
  for (const [k, v] of [["mkTh", 3], ["mkMinOffers", 0], ["mkMinProfit", 0], ["mkMinRate", 0], ["mkNeedRebound", false], ["mkKind", ""]]) await set(k, v);
  ok(!(await page.$('[data-mk="mkFreshMin"]')), "値段の更新は選べない（120分以内で固定）");
  const base = await ids();
  ok(base.length > 3, "ゆるい条件で一覧が出る / " + base.length + "品");
  const steps = {
    mkTh: [5, 10, 15], mkMinOffers: [20, 35, 50], mkMinProfit: [20000, 80000, 300000], mkMinRate: [30, 80, 150], mkNeedRebound: [true],
  };
  for (const [key, vals] of Object.entries(steps)) {
    let prev = base, okAll = true, trail = [base.length];
    for (const v of vals) { const cur = await set(key, v); if (!sub(cur, prev)) okAll = false; trail.push(cur.length); prev = cur; }
    ok(okAll, `${key}：厳しくするほど減る（前の一覧に含まれる品だけ残る） / ${trail.join("→")}`);
    await set(key, { mkTh: 3, mkMinOffers: 0, mkMinProfit: 0, mkMinRate: 0, mkNeedRebound: false }[key]);
  }
  const kinds = await page.$$eval('[data-mk="mkKind"] option', ns => ns.map(n => n.value).filter(Boolean));
  let kindOk = true, seen = 0;
  for (const k of kinds) { const cur = await set("mkKind", k); seen += cur.length; if (!sub(cur, base)) kindOk = false; }
  await set("mkKind", "");
  ok(kindOk && seen > 0, `「すべて」は、どの種類の一覧も含む（${kinds.length}種類を確認）`);
  /* 既定に戻す */
  for (const [k, v] of [["mkTh", 5], ["mkMinOffers", 10], ["mkMinProfit", 10000], ["mkMinRate", 15], ["mkNeedRebound", true]]) await set(k, v);
}
/* 在庫 */
ok(/まだありません/.test(await page.$eval(".msec.stock", n => n.textContent)), "在庫の欄が出る（最初は空）");
{
  const row = await page.$$eval(".msec.buy tr.mrow", ns => ns.findIndex(n => /Unlimited Item/.test(n.textContent)));
  await page.click(`.msec.buy tr.mrow:nth-of-type(${row + 1}) [data-stock-add]`).catch(async () => {
    const h = await page.$$(".msec.buy tr.mrow"); await (await h[row].$("[data-stock-add]")).click();
  });
}
await page.waitForSelector(".sform", { timeout: 3000 }).catch(() => {});
ok(await page.$eval("#stockDlg", n => !n.hidden && !!n.querySelector(".sform")) && !(await page.$(".mdetail")), "「仕込んだ」で入力の小窓が開く（グラフは開かない）");
await page.fill('.sform [data-sf="qty"]', "5");
await page.fill('.sform [data-sf="cost"]', "40000");
await page.click(".sform [data-stock-save]");
await page.waitForTimeout(300);
ok(await page.$eval("#stockDlg", n => n.hidden), "記録すると小窓が閉じる");
let stockRows = await page.$$eval(".msec.stock tr.srow", ns => ns.map(n => n.textContent));
ok(stockRows.length === 1 && /Unlimited Item/.test(stockRows[0]) && /待ち|売れば利益/.test(stockRows[0]), "在庫に記録され、状態が出る / " + (stockRows[0] || "").replace(/\s+/g, " ").slice(0, 120));
ok(/在庫 5/.test(await page.$eval(".msec.buy", n => n.textContent)), "買い場の行にも「在庫 5」と出る");
ok((await page.evaluate(() => JSON.parse(localStorage.getItem("eftflip.settings")).mkStock || [])).some(x => x.qty === 5 && x.cost === 40000 && x.mode === "regular"), "在庫はブラウザに保存される（モードつき）");
/* 売り場にある品を、探した品から在庫に入れる → 売り時として上に出る */
await page.fill('[data-mk="q"]', "graph");
await page.waitForSelector(".msec.found [data-stock-add]", { timeout: 5000 });
await page.click(".msec.found [data-stock-add]");
await page.fill('.sform [data-sf="qty"]', "2");
await page.fill('.sform [data-sf="cost"]', "300000");
await page.click(".sform [data-stock-save]");
await page.fill('[data-mk="q"]', "");
await page.waitForTimeout(300);
stockRows = await page.$$eval(".msec.stock tr.srow", ns => ns.map(n => n.textContent));
ok(stockRows.length === 2 && /Graphics Card/.test(stockRows[0]) && /売り時/.test(stockRows[0]), "売り場になった在庫は「売り時」として上に出る");
await (await page.$(".msec.stock")).screenshot({ path: "/tmp/out/stock-shot.png" });
ok(/売り時 1品/.test(await page.$eval(".msec.stock", n => n.textContent)), "売り時の数が出る");
ok(/いま売ると|在庫の合計/.test(await page.$eval(".msec.stock", n => n.textContent)), "損益と合計が出る");
await page.fill('.msec.stock [data-stock-qty]', "3"); await page.press('.msec.stock [data-stock-qty]', "Tab");
await page.waitForTimeout(200);
ok((await page.evaluate(() => JSON.parse(localStorage.getItem("eftflip.settings")).mkStock)).some(x => x.qty === 3), "数量をその場で直せる");
page.once("dialog", d => d.accept());
await page.click(".msec.stock [data-stock-sold]");
await page.waitForTimeout(300);
ok((await page.$$(".msec.stock tr.srow")).length === 1, "「売った」で在庫から外れる");
await page.selectOption('[data-mk="mkDays"]', "7");
await page.waitForTimeout(300);
ok(/過去7日/.test(await page.$eval(".msec.buy h2", n => n.textContent)) && await page.evaluate(() => JSON.parse(localStorage.getItem("eftflip.settings")).mkDays) === 7, "期間を変えられる（保存される）");
ok((await page.evaluate(() => window.__notes)) === 0, "通知は出さない");
ok(errs.length === 0, "エラーなし " + errs.join(" / "));
await browser.close();
console.log(fail ? `\n${fail} 件失敗` : "\nすべて通過");
process.exit(fail ? 1 : 0);
