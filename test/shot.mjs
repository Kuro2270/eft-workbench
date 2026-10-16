import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ITEMS, TRADERS, FLEA, history } from "./fixture.mjs";
const PAGE = join(dirname(fileURLToPath(import.meta.url)), "all.html");
const b = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await b.newPage({ viewport: { width: 1520, height: 900 } });
await page.addInitScript(({ items, traders, flea, hist }) => {
  window.fetch = async (url) => {
    const u = String(url), json = d => ({ ok: true, status: 200, json: async () => ({ data: d }) });
    const m = u.match(/\/(regular|pve|pvp-season)\/(.+)$/); const path = m ? m[2] : "";
    if (path === "items") return json({ items, fleaMarket: flea });
    if (path === "traders") return json(traders);
    if (/^(items_ja|items_en|traders_ja|traders_en)$/.test(path)) return json({});
    if (/^(tasks|hideout|barters|crafts)$/.test(path)) return json(null);
    const ph = path.match(/^prices\/(.+)$/); if (ph) return json(hist[ph[1]] || []);
    return { ok: false, status: 404, json: async () => ({}) };
  };
}, { items: ITEMS, traders: TRADERS, flea: FLEA, hist: Object.fromEntries(Object.keys(ITEMS).map(k => [k, history(k)])) });
await page.goto("file://" + PAGE, { waitUntil: "load" });
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#tbl tbody td.item", { timeout: 15000 });
await page.click('.tabs button[data-tab="loot"]');
await page.waitForTimeout(700);
await page.screenshot({ path: "/home/claude/tarkov/board/test/shot-loot.png", clip: { x: 0, y: 118, width: 1520, height: 430 } });
await b.close();
console.log("撮りました");
