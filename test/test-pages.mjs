import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ITEMS, TRADERS, FLEA, history } from "./fixture.mjs";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
let fail = 0;
const ok = (c, m) => { console.log((c ? "  ok " : "  NG ") + m); if (!c) fail++; };
async function open(file, slowMs = 0){     // slowMs … 価格の推移を返すのを遅らせる（取っているあいだの網を確かめる）
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(({ items, traders, flea, hist, slowMs }) => {
    window.fetch = async (url) => {
      const u = String(url), json = d => ({ ok: true, status: 200, json: async () => ({ data: d }) });
      const m = u.match(/\/(regular|pve|pvp-season)\/(.+)$/), path = m ? m[2] : "";
      if (m) window.__fetched = true;
      if (path === "items") return json({ items, fleaMarket: flea });
      if (/^(items|traders)_(ja|en)$/.test(path)) return json({});
      if (path === "traders") return json(traders);
      if (/^(tasks|hideout|barters|crafts)$/.test(path)) return json(null);
      const ph = path.match(/^prices\/(.+)$/); if (ph){ if (slowMs) await new Promise(r => setTimeout(r, slowMs)); return json(hist[ph[1]] || []); }
      return { ok: false, status: 404, json: async () => ({}) };
    };
  }, { items: ITEMS, traders: TRADERS, flea: FLEA, hist: Object.fromEntries(Object.keys(ITEMS).map(k => [k, history(k)])), slowMs });
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
  ok(!(await page.$("#analyzeBtn")) && await page.$eval("#topN", n => getComputedStyle(n.closest("label")).display === "none"), "転売用の分析ボタン・件数・日数は出ない");
  ok(await page.$eval("#pgLoot", n => n.getAttribute("aria-current") === "page"), "上のリンクで今のページが分かる");
    await page.waitForSelector("#tierBoard .ti", { timeout: 15000 });
  ok(await page.$eval("#listWrap", n => n.hidden), "一覧表は隠れ、ティア表が出る");
  const rows = await page.$$eval(".trow", ns => ns.map(n => n.querySelector(".tlab b").textContent + ":" + n.querySelectorAll(".ti").length));
  ok(rows.length === 5 && rows.map(r => r[0]).join("") === "SABCD", "S〜Dの5段 / " + rows.join(" "));
  ok(!/\₽/.test(await page.$eval(".ticons", n => n.innerText)), "アイコン側には値段の文字が出ない");
  ok(!(await page.$$eval("#tierBoard .ti img", ns => ns.some(n => /unknown-item/.test(n.src)))) && !/Hardened/.test(await page.$eval("#tierBoard", n => n.innerHTML)), "画像が無い品は出ない");
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
  ok(await page.$eval("#viewBtn", n => n.textContent) === "一覧で見る", "切り替えボタンの文字が出る");
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
  ok(await page.$eval("#settingsBox", n => n.hidden) && !(await page.$("#settingsLine")) && !(await page.$("#explain")), "設定・説明文は出ない");
  ok(await page.$eval("#marketPanel", n => n.hidden), "売り時・買い時の部品は出ない");
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
  ok(cards.length === 5 && cards.map(c => c.split(":")[0]).join(",") === "flip.html,loot.html,watch.html,rat.html,settings.html", "5つの入口が並ぶ（マップ作成は公開しない） / " + cards.join(" "));
  ok(await page.$eval(".bar", n => n.hidden) && await page.$eval("#tierBoard", n => n.hidden) && await page.$eval("#settingsBox", n => n.hidden), "ツールの部品は出ない");
  ok(await page.evaluate(() => !window.__fetched), "価格データを読みに行かない");
  const foot = await page.$$eval("#footer a", ns => ns.map(n => n.getAttribute("href")).join(","));
  ok(foot === "about.html,faq.html,privacy.html,contact.html", "ページ下に、このサイトについて・よくある質問・プライバシーポリシー・お問い合わせ / " + foot);
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\nこのサイトについて・よくある質問（about.html・faq.html）");
{
  const { page, errs } = await open("about.html");
  const tools = await page.$$eval(".tools a", ns => ns.map(n => n.getAttribute("href")).join(","));
  ok(tools === "flip.html,loot.html,watch.html,rat.html,settings.html", "できることに、すべてのツールが並ぶ / " + tools);
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.goto("file://" + join(ROOT, "public", "faq.html"));
  const n = await page.$$eval(".faq details", ns => ns.length);
  const ld = await page.$eval('script[type="application/ld+json"]', s => JSON.parse(s.textContent));
  ok(n > 0 && ld["@type"] === "FAQPage" && ld.mainEntity.length === n, `質問と、検索向けの FAQ のデータの数がそろう / ${n}問`);
  await page.click(".faq details summary");
  ok(await page.$eval(".faq details", d => d.open), "質問を押すと答えが開く");
  for (const f of ["about.en.html", "faq.en.html", "privacy.en.html", "contact.en.html"]) {
    await page.goto("file://" + join(ROOT, "public", f));
    const st = await page.evaluate(() => ({ lang: document.documentElement.lang, sw: document.querySelector("header .lang a") && document.querySelector("header .lang a").getAttribute("href"),
      foot: [...document.querySelectorAll("footer a")].map(n => n.getAttribute("href")).join(","), alt: document.querySelectorAll('link[rel="alternate"]').length }));
    ok(st.lang === "en" && st.sw === f.replace(".en", "") && st.alt === 2 && /about\.en\.html,faq\.en\.html,privacy\.en\.html,contact\.en\.html/.test(st.foot), `${f}：英語のページで、日本語への切り替えと英語の案内がある`);
  }
  await page.goto("file://" + join(ROOT, "public", "faq.en.html"));
  ok(await page.$$eval(".faq details", ns => ns.length) === n, "英語の質問の数は日本語と同じ");
  await page.goto("file://" + join(ROOT, "public", "contact.en.html"));
  ok(await page.$$eval("#openForm", ns => ns.length) === 1, "英語のお問い合わせにも、同じフォームを開くボタンがある");
  const ja = await open("index.html"), en = ja.page;
  await en.click('.lang button[data-lang="en"]');
  ok(/about\.en\.html.*faq\.en\.html.*privacy\.en\.html.*contact\.en\.html/.test(await en.$eval("#footer", n => n.innerHTML)), "ツールのページを英語にすると、下のリンクも英語のページへ");
  await en.close();
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
console.log("\n取っているあいだの網（売り時・買い時・転売ボード）");
for (const [file, box, row] of [["watch.html", "#marketPanel", ".msec"], ["flip.html", "#listWrap", "#tbl tbody td.item"]]) {
  const { page, errs } = await open(file, 1500);
  await page.waitForSelector(`${box}.busy .busyveil`, { timeout: 15000 });
  const st = await page.$eval(box, n => ({ inert: n.inert, busy: n.getAttribute("aria-busy"), text: n.querySelector(".busyveil").innerText }));
  ok(st.inert && st.busy === "true" && st.text.length > 0, `${file}：取っているあいだは網が掛かり、押せない / 「${st.text}」`);
  await page.screenshot({ path: `/tmp/out/busy-${file.replace(".html", "")}.png` });
  const cover = await page.$eval(box, n => { const a = n.getBoundingClientRect(), b = n.querySelector(".busyveil").getBoundingClientRect(); return Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= 2; });
  ok(cover, `${file}：網が一覧の全体を覆う`);
  if (file === "flip.html") {
    const before = await page.$eval("#tbl thead", n => n.innerText);
    await page.mouse.click(...await page.$eval("#tbl thead th", n => { const r = n.getBoundingClientRect(); return [r.left + 10, r.top + 10]; }));
    ok(await page.$eval("#tbl thead", n => n.innerText) === before, "転売ボード：網が掛かっているあいだは、見出しを押しても並び替わらない");
  }
  await page.waitForFunction(sel => !document.querySelector(sel).classList.contains("busy"), box, { timeout: 30000 });
  ok(await page.$eval(box, n => !n.inert && !n.querySelector(".busyveil")), `${file}：取り終わると網が外れて押せる`);
  ok((await page.$$(row)).length > 0, `${file}：一覧が出ている`);
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\nラットスポット（rat.html）");
{
  const { page, errs } = await open("rat.html");
  ok(/ラットスポット/.test(await page.title()), "タイトル / " + await page.title());
  ok(await page.$eval("#pgRat", n => n.getAttribute("aria-current") === "page"), "上のリンクで今のページが分かる");
  ok(!(await page.$eval("#ratPanel", n => n.hidden)) && await page.$eval(".bar", n => n.hidden) && await page.$eval("#listWrap", n => n.hidden), "ラットスポットの欄だけが出る");
  ok((await page.$$("#ratPanel button[data-ratmap]")).length >= 1, "マップを選べる");
  const pins = await page.$$eval(".ratpin", ns => ns.length), cards = await page.$$eval(".ratcard", ns => ns.length);
  ok(pins > 0 && pins === cards, `見取り図の★と一覧の数がそろう / ★${pins}・一覧${cards}`);
  ok(await page.$eval(".ratmap img", n => n.complete && n.naturalWidth > 0), "見取り図の画像が出る");
  ok(!(await page.$("#ratPanel iframe")), "動画は押すまで読み込まない");
  ok(await page.evaluate(() => !window.__fetched), "価格データを読みに行かない");
  await page.click('.lang button[data-lang="en"]');
  ok(/Route/.test(await page.$eval("#ratPanel", n => n.innerText)), "英語に切り替わる");
  ok(errs.length === 0, "エラーなし " + errs.join(";"));
  await page.close();
}
console.log("\n持ち帰りティア表を画像で共有");
{
  const { page, errs } = await open("loot.html");
  await page.waitForSelector("#tierBoard .ti", { timeout: 15000 });
  ok(await page.$eval("#shareBtn", n => !n.hidden && n.textContent === "画像で共有"), "ティア表のときは「画像で共有」が出る");
  await page.click("#shareBtn");
  await page.waitForSelector("#shareDlg .shimg", { timeout: 15000 });
  const d = await page.evaluate(async () => {
    const img = document.querySelector("#shareDlg .shimg"); await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0);
    const a = sel => document.querySelector(`#shareDlg [data-sh="${sel}"]`);
    return { w: img.naturalWidth, h: img.naturalHeight, png: c.toDataURL("image/png").split(",")[1], text: document.querySelector("#shareDlg .shtext").value,
      x: a("x").href, line: a("line").href, save: a("save").getAttribute("download") };
  });
  const { writeFileSync } = await import("node:fs"); writeFileSync("/tmp/out/share-tier.png", Buffer.from(d.png, "base64"));
  ok(d.w === 1200 && d.h > 400, `ティア表の画像ができる / ${d.w}×${d.h}`);
  ok(/eft-workbench\.com\/loot/.test(d.text) && /youtube\.com\/@RatofTarkov/.test(d.text), "共有の文に、サイトと YouTube のリンクが入る");
  ok(decodeURIComponent(d.x).includes("eft-workbench.com/loot") && decodeURIComponent(d.line).includes("youtube.com/@RatofTarkov"), "X・LINE の投稿画面にも、同じ文が渡る");
  ok(/^eft-loot-tier-regular-\d{4}-\d\d-\d\d\.png$/.test(d.save), "画像を保存できる / " + d.save);
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await page.click('#shareDlg [data-sh="x"]');
  await page.waitForFunction(() => /画像を(コピー|保存)しました/.test(document.querySelector("#shareDlg .shmsg").textContent), null, { timeout: 5000 });
  const op = await page.evaluate(() => window.__opened);
  ok(op.length === 1 && /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(op[0]), "「X に投稿」は、画像をコピー（できなければ保存）してから投稿画面を開く / " + await page.$eval("#shareDlg .shmsg", n => n.textContent));
  await page.keyboard.press("Escape");
  ok(await page.$eval("#shareDlg", n => n.hidden), "Esc で閉じる");
  await page.evaluate(() => { navigator.canShare = () => true; navigator.share = async d => { window.__shared = { files: d.files.length, text: d.text }; }; });
  await page.click("#shareBtn");
  await page.waitForSelector("#shareDlg .shimg", { timeout: 15000 });
  const keys = await page.$$eval("#shareDlg [data-sh]", ns => ns.map(n => n.dataset.sh).join(","));
  ok(keys === "share,save,close", "スマホのように画像ごと共有できるときは、「共有する」だけ（X・LINE を直接開かない） / " + keys);
  await page.click('#shareDlg [data-sh="share"]');
  const sh = await page.evaluate(() => window.__shared);
  ok(sh && sh.files === 1 && /eft-workbench\.com\/loot/.test(sh.text), "「共有する」で、画像と文がいっしょに渡る");
  await page.keyboard.press("Escape");
  await page.click("#viewBtn");
  ok(await page.$eval("#shareBtn", n => n.hidden), "一覧表のときは出ない");
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
