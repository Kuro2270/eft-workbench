import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ITEMS, TRADERS, FLEA, history } from "./fixture.mjs";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
let fail = 0;
const ok = (c, m) => { console.log((c ? "  ok " : "  NG ") + m); if (!c) fail++; };
async function open(file){
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(({ items, traders, flea, hist }) => {
    window.fetch = async (url) => {
      const u = String(url), json = d => ({ ok: true, status: 200, json: async () => ({ data: d }) });
      const m = u.match(/\/(regular|pve|pvp-season)\/(.+)$/), path = m ? m[2] : "";
      if (m) window.__fetched = true;
      if (path === "items") return json({ items, fleaMarket: flea });
      if (/^(items|traders)_(ja|en)$/.test(path)) return json({});
      if (path === "traders") return json(traders);
      if (/^(tasks|hideout|barters|crafts)$/.test(path)) return json(null);
      const ph = path.match(/^prices\/(.+)$/); if (ph) return json(hist[ph[1]] || []);
      return { ok: false, status: 404, json: async () => ({}) };
    };
  }, { items: ITEMS, traders: TRADERS, flea: FLEA, hist: Object.fromEntries(Object.keys(ITEMS).map(k => [k, history(k)])) });
  await page.goto("file://" + join(ROOT, "public", file), { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem("eftflip.settings", JSON.stringify({ lang: "ja", mode: "regular", playerLevel: 40, intel: 3, mgmt: 0, minProfit: 3000, minOffers: 5, days: 7 })));
  await page.reload({ waitUntil: "load" });
  return { page, errs };
}

console.log("持ち帰りティア表（loot.html）");
{
  const { page, errs } = await open("loot.html");
  ok(/持ち帰りティア表/.test(await page.title()), "タイトル / " + await page.title());
  ok(await page.$eval(".tabs", n => getComputedStyle(n).display === "none"), "タブは出ない");
  ok(await page.$eval("#analyzeBtn", n => getComputedStyle(n).display === "none") && await page.$eval("#topN", n => getComputedStyle(n.closest("label")).display === "none"), "転売用の分析ボタン・件数・日数は出ない");
  ok(await page.$eval("#pgLoot", n => n.getAttribute("aria-current") === "page"), "上のリンクで今のページが分かる");
  await page.click("#loadBtn");
  await page.waitForSelector("#tierBoard .ti", { timeout: 15000 });
  ok(await page.$eval("#listWrap", n => n.hidden), "一覧表は隠れ、ティア表が出る");
  const rows = await page.$$eval(".trow", ns => ns.map(n => n.querySelector(".tlab b").textContent + ":" + n.querySelectorAll(".ti").length));
  ok(rows.length === 5 && rows.map(r => r[0]).join("") === "SABCD", "S〜Dの5段 / " + rows.join(" "));
  ok(!/\₽/.test(await page.$eval(".ticons", n => n.innerText)), "アイコン側には値段の文字が出ない");
  const first = await page.$(".ti");
  const box = await first.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.waitForTimeout(150);
  const tip = await page.$eval("#tip", n => ({ hidden: n.hidden, text: n.innerText }));
  ok(!tip.hidden && /₽/.test(tip.text) && /マス単価/.test(tip.text), "カーソルを乗せると値段が出る / " + tip.text.replace(/\n/g, " | "));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(100);
  ok(await page.$eval("#tip", n => n.hidden), "外すと消える");
  await page.focus(".ti");
  await page.waitForTimeout(100);
  ok(!(await page.$eval("#tip", n => n.hidden)), "キーボードで選んでも出る");
  await page.screenshot({ path: "/tmp/out/loot-shot.png" });
  await page.click("#viewBtn");
  await page.waitForTimeout(200);
  ok(!(await page.$eval("#listWrap", n => n.hidden)) && (await page.$$("#tbl tbody tr")).length > 3, "「一覧で見る」で従来の表に切り替わる");
  await page.click("#viewBtn");
  ok(await page.$eval("#listWrap", n => n.hidden), "戻せる");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\n転売ボード（flip.html）");
{
  const { page, errs } = await open("flip.html");
  ok(await page.$eval('.tabs button[data-tab="loot"]', n => getComputedStyle(n).display === "none"), "持ち帰りのタブは出ない");
  ok(!(await page.$eval("#pages", n => n.hidden)), "ほかのページへのリンクがある");
  ok(await page.$eval("#pgFlip", n => n.getAttribute("aria-current") === "page"), "今のページが分かる");
  ok(await page.$eval("#settingsBox", n => n.hidden) && /プレイヤー設定：Lv40/.test(await page.$eval("#settingsLine", n => n.textContent)), "設定は折りたたみではなく、要約と「変更する」リンクだけ");
  ok(await page.$eval("#marketPanel", n => n.hidden), "売り時・買い時の部品は出ない");
  await page.click("#loadBtn");
  await page.waitForSelector("#tbl tbody td.item", { timeout: 15000 });
  ok(await page.$eval("#viewBtn", n => getComputedStyle(n).display === "none"), "表示切り替えボタンは出ない");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\nトップ（index.html）");
{
  const { page, errs } = await open("index.html");
  ok(/EFT ツール/.test(await page.title()), "タイトル / " + await page.title());
  const cards = await page.$$eval("#topCards a.card", ns => ns.map(n => n.getAttribute("href") + ":" + n.textContent.trim().slice(0, 12)));
  ok(cards.length === 4 && cards.map(c => c.split(":")[0]).join(",") === "flip.html,loot.html,watch.html,settings.html", "4つの入口が並ぶ（マップ作成は公開しない） / " + cards.join(" "));
  ok(await page.$eval(".bar", n => n.hidden) && await page.$eval("#tierBoard", n => n.hidden) && await page.$eval("#settingsBox", n => n.hidden), "ツールの部品は出ない");
  ok(await page.evaluate(() => !window.__fetched), "価格データを読みに行かない");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\nプレイヤー設定（settings.html）");
{
  const { page, errs } = await open("settings.html");
  ok(await page.$eval("#settingsBox", n => !n.hidden && n.open), "設定が開いた状態で出る");
  ok(await page.$eval(".bar", n => n.hidden) && await page.$eval("#marketPanel", n => n.hidden), "ほかの機能は出ない");
  await page.fill('[data-k="playerLevel"]', "22"); await page.press('[data-k="playerLevel"]', "Tab");
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("eftflip.settings")).playerLevel) === 22, "変えた内容が保存される（ほかのページでも使われる）");
  ok(await page.evaluate(() => !window.__fetched), "価格データを読みに行かない");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\n売り時・買い時（watch.html）");
{
  const { page, errs } = await open("watch.html");
  await page.waitForSelector(".msec.buy", { timeout: 15000 });
  ok(!(await page.$eval("#marketPanel", n => n.hidden)), "売り時・買い時の欄が出る");
  ok(await page.$eval("#lootHideWrap", n => n.hidden) && await page.$eval("#listWrap", n => n.hidden) && await page.$eval(".tabs", n => n.hidden) && await page.$eval("#tierBoard", n => n.hidden), "ティア表・転売の表・絞り込みは出ない");
  ok(await page.$eval("#pgWatch", n => n.getAttribute("aria-current") === "page" && /売り時・買い時/.test(n.textContent)), "上のリンクの名前も「売り時・買い時」");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\n持ち帰りティア表（loot.html）のクリック");
{
  const { page, errs } = await open("loot.html");
  await page.waitForSelector("#tierBoard .ti", { timeout: 15000 });
  ok(await page.$eval("#marketPanel", n => n.hidden), "売り時・買い時の欄は出ない");
  const popup = page.waitForEvent("popup", { timeout: 3000 }).then(p => (p.close(), true), () => false);
  await page.click("#tierBoard .ti");
  ok(await popup, "アイコンのクリックは詳細ページを開く（登録はしない）");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
await browser.close();
console.log(fail ? `\n${fail} 件失敗` : "\nすべて成功");
process.exit(fail ? 1 : 0);
