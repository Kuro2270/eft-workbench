/* ================= 売り時・買い時：画面 =================
   このページ（watch.html）だけで動く。
   1. 価格一覧（全品）から、上の条件に合い、24時間平均か48時間前より目安以上 安い品・高い品を候補として選ぶ（candScore）
   2. の判定には、最安値ではなく「安い出品いくつかの平均」を使う（極端に安い1件はすぐ売り切れて、実際には買えないため）
   2. 候補だけ価格記録（prices/<id>）を取り、過去 N 日の中での位置を確かめる（marketView）
   3. 底値付近を「買い場」、高値付近を「売り場」として並べ、おすすめの値段を出す
   品をクリックすると、値動き・移動平均・おすすめの値段のグラフを開く。計算は market.js */

const MK_I18N = {
  ja: {
    days: "比べる期間", daysOpt: "過去{n}日", kind: "種類", kindAll: "すべて",
    needRebound: "底値からおすすめ売値まで戻ったことがない品は外す", cRebound: "底値→売値", reboundSub: "過去{n}日に戻った回数", reboundNone: "一度も戻っていない（底値のあとの最高 {p}）",
    noneRebound: "条件に合う品がありません（底値付近 {n}品のうち、見込み利益が条件に合う {m}品はどれも、底値からおすすめ売値まで戻ったことがありません）",
    minProfit: "買い場は見込み利益が", minProfit2: "以上・", minRate2: "%以上の品だけ",
    cProfit: "見込み利益／個", profitSub: "{via}で {net} で売った場合（1マスあたり {slot}）", viaFlea: "フリマ手取り", viaTrader: "トレーダー",
    noneProfit: "条件（見込み利益 {p} 以上・{r}%以上）に合う品がありません（底値付近 {n}品を確認）",
    capped: "候補が多すぎるため、外れ具合の大きい{n}品だけ確認しました（残り{m}品）。条件を絞ってください",
    th: "候補の目安", thOpt: "{n}%以上", thTip: "24時間平均か48時間前より、この割合以上 安い（高い）品の記録を確かめます。下げるほど候補が増え、確認に時間がかかります",
    minOffers: "出品数", minOffers2: "件以上", search: "名前で探す（2文字以上）",
    loading: "価格記録を確認中… {i}/{n}", needData: "価格データを読み込み中です",
    buyTitle: "買い場（過去{d}日の底値付近）", sellTitle: "売り場（過去{d}日の高値付近）", searchTitle: "探した品",
    none: "いまは該当する品がありません（候補{n}品を確認）", fewAll: "記録が少なく判定できない品：{n}品",
    cName: "品物", cNow: "いまの相場", nowSub: "直近{n}回の読み取り・{ago}", oddLow: "極端に安い出品 {p}（すぐ売り切れることが多い）", cRange: "過去{d}日の幅（底値〜高値）", cPos: "位置", cRec: "おすすめ", cTrend: "流れ", cOffers: "出品",
    recBuy: "{p} 以下で買う", recSell: "{p} 以上で売る", recNet: "手取り {p}",
    tagBuy: "底値付近", tagSell: "高値付近", up: "上向き {p}", down: "下向き {p}", flat: "横ばい",
    legDot: "読み取った相場（安い出品の平均）", legShort: "24時間平均", legLong: "7日平均", legBuy: "おすすめ買値", legSell: "おすすめ売値",
    detail: "過去{d}日：底値 {low}・中央 {med}・高値 {high}（極端な5%を除く）。24時間平均 {short}／7日平均 {long}。",
    chartTip: "{date}　相場 {price}｜24時間平均 {short}｜7日平均 {long}", ago: "{n}分前", agoH: "{n}時間前",
    },
  en: {
    days: "Compare with", daysOpt: "last {n} days", kind: "Kind", kindAll: "All",
    needRebound: "Hide items that never recovered from the low to the sell price", cRebound: "Low → sell", reboundSub: "recoveries in the last {n} days", reboundNone: "never recovered (high after the low: {p})",
    noneRebound: "Nothing here ({n} near the low; the {m} with enough profit never recovered from the low to the sell price)",
    minProfit: "Buy zone: expected profit ", minProfit2: " or more and ", minRate2: "% or more only",
    cProfit: "Expected profit / unit", profitSub: "selling at {net} via {via} ({slot} per slot)", viaFlea: "flea (after fee)", viaTrader: "trader",
    noneProfit: "Nothing meets the profit filter ({p}+, {r}%+) ({n} items near the low checked)",
    capped: "Too many candidates: only the {n} furthest from usual were checked ({m} more). Narrow the filters",
    th: "Candidate threshold", thOpt: "{n}%+", thTip: "Checks the history of items at least this far below (above) their 24h average or 48h-ago price. Lower means more candidates and a longer check",
    minOffers: "Offers", minOffers2: "or more", search: "Search by name (2+ letters)",
    loading: "Checking price history… {i}/{n}", needData: "Loading price data",
    buyTitle: "Buy zone (near the {d}-day low)", sellTitle: "Sell zone (near the {d}-day high)", searchTitle: "Search results",
    none: "Nothing here right now ({n} candidates checked)", fewAll: "Not enough history: {n} items",
    cName: "Item", cNow: "Market now", nowSub: "last {n} scans, {ago}", oddLow: "a very cheap listing at {p} (usually gone fast)", cRange: "{d}-day range (low–high)", cPos: "Position", cRec: "Suggested", cTrend: "Trend", cOffers: "Offers",
    recBuy: "buy at {p} or less", recSell: "sell at {p} or more", recNet: "take-home {p}",
    tagBuy: "near low", tagSell: "near high", up: "rising {p}", down: "falling {p}", flat: "flat",
    legDot: "scanned price (average of the cheapest listings)", legShort: "24h average", legLong: "7-day average", legBuy: "suggested buy", legSell: "suggested sell",
    detail: "{d} days: low {low}, median {med}, high {high} (extreme 5% excluded). 24h average {short} / 7-day average {long}.",
    chartTip: "{date}  price {price} | 24h avg {short} | 7-day avg {long}", ago: "{n} min ago", agoH: "{n} h ago",
    },
};
const mt = (k, v) => String((MK_I18N[S.lang] || MK_I18N.ja)[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : "");
const MK_PAGE = PAGE === "watch";
const $mk = document.getElementById("marketPanel");
const MK_HIST = new Map();                 // id → {hist, at}（30分は使い回す）
let MK_BUSY = null, MK_OPEN = null, MK_Q = "";
const MK_KINDS = ["barter", "meds", "provisions", "keys", "mods", "ammoBox", "container", "injectors", "grenade"];

/* 候補にしてよい品：フリマで売れる・銃とプリセット以外・出品数と値段の新しさの条件を満たす */
/* 候補の母集団：フリマで売れる・銃とプリセット以外・種類。ここで「各○品」に絞る。
   出品数と値段の更新の条件は、絞ったあと（mkShowOk）に掛ける。先に掛けると、条件を厳しくしたときに
   上位から外れた品のかわりに別の品が候補に入り、かえって一覧が増えることがあるため */
function mkEligible(it){
  if(it.types.includes("noFlea") || it.types.includes("preset") || isGun(it)) return false;
  if(!(it.lastLowPrice > 0) || !(it.avg24hPrice > 0)) return false;
  if(S.mkKind && !it.types.includes(S.mkKind)) return false;
  return true;
}
/* 値段の更新の条件は固定（利用者は選ばない）。データを取った時点で、最安値の読み取りが120分以内の品だけ。
   tarkov.dev の読み取りは品物によって1〜2時間おきで、価格は1時間おきに保存するため、60分では保存した時刻によって候補が0になることがある */
const MK_FRESH_MIN = 120;
/* 表示の条件：出品数・値段の更新。条件を厳しくすると、一覧は必ず減る（増えない） */
function mkShowOk(it){
  if((it.lastOfferCount || 0) < (S.mkMinOffers || 0)) return false;
  if(!isFresh(it.updated || 0, +DATA.at || Date.now(), MK_FRESH_MIN)) return false;
  return true;
}
/* 候補：上の条件（種類・出品数・値段の更新）をすべて満たし、かつ24時間平均か48時間前より「目安」以上外れている品。
   上位何品という切り方はしない（切り方によっては、条件を厳しくすると別の品が繰り上がって一覧が増えるため）。
   そのため、条件を厳しくすれば一覧は必ず減り、「すべて」は個別の種類を必ず含む。
   多すぎるときだけ、外れ具合の大きい順に MK_MAX 品で止める（そのときは画面に出す） */
const MK_MAX = 300;
let MK_CAPPED = {buy: 0, sell: 0};
function mkCandidates(){
  const pool = DATA.items.filter(it => mkEligible(it) && mkShowOk(it));
  const th = (S.mkTh ?? 5) / 100;
  const pick = side => {
    const all = pool.map(it => ({it, sc: candScore(it, side, th)})).filter(c => c.sc != null).sort((a, b) => b.sc - a.sc);
    MK_CAPPED[side] = Math.max(0, all.length - MK_MAX);
    return all.slice(0, MK_MAX).map(c => c.it);
  };
  const buy = pick("buy"), sell = pick("sell");
  const q = MK_Q.trim().toLowerCase();
  const found = q.length >= 2 ? DATA.items.filter(it => !it.types.includes("noFlea") && !it.types.includes("preset") && it.lastLowPrice > 0
      && (nm(it.name) + " " + nm(it.shortName) + " " + (it.name.en || "")).toLowerCase().includes(q)).slice(0, 8) : [];
  return {buy, sell, found};
}
/* 候補のうち、記録をまだ持っていない品だけ取りに行く（6件ずつ） */
async function mkFetch(items){
  const need = [...new Map(items.filter(it => { const c = MK_HIST.get(it.id); return !c || Date.now() - c.at > 30 * 60000; }).map(it => [it.id, it])).values()];
  if(!need.length || MK_BUSY) return;
  MK_BUSY = {i: 0, n: need.length}; paintMarket();
  for(let i = 0; i < need.length; i += 6){
    await Promise.all(need.slice(i, i + 6).map(async it => {
      const hist = await getJson("prices/" + it.id, "prices").catch(() => null);
      MK_HIST.set(it.id, {hist: hist || [], at: Date.now()});
      MK_BUSY.i++;
    }));
    paintMarket();
  }
  MK_BUSY = null;
  paintMarket();
}
function mkView(it){
  const c = MK_HIST.get(it.id); if(!c) return null;
  return marketView(c.hist, {days: S.mkDays || 30, live: {price: it.lastLowPrice, at: it.updated || 0}});
}
const pctTxt = r => (r >= 0 ? "+" : "") + Math.round(r * 100) + "%";
function mkAgo(t){
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 90 ? mt("ago", {n: m}) : mt("agoH", {n: Math.round(m / 60)});
}
const netOf = (it, price) => price - fleaFee(it.basePrice, price, DATA.flea);

/* 買い場の見込み利益（いまの最安値で買って、おすすめ売値で売る） */
function mkProfit(it, v){
  const tr = bestTraderSell(it);
  const p = buyProfit(v.price, v.sellAt, ask => fleaFee(it.basePrice, ask, DATA.flea), tr ? tr.priceRUB : 0);
  p.perSlot = p.profit / Math.max(1, (it.width || 1) * (it.height || 1));
  return p;
}
/* ---- 1行 ---- */
function mkRow(it, v, side, pf){
  const icon = it.iconLink ? `<img src="${esc(it.iconLink)}" alt="" loading="lazy">` : "";
  const tag = v.zone === "buy" ? `<span class="mtag buy">${mt("tagBuy")}</span>` : v.zone === "sell" ? `<span class="mtag sell">${mt("tagSell")}</span>` : "";
  const rec = side === "sell" || (side === "found" && v.zone === "sell")
    ? `<b>${esc(mt("recSell", {p: yen(v.sellAt)}))}</b><div class="note">${esc(mt("recNet", {p: yen(netOf(it, v.sellAt))}))}</div>`
    : `<b>${esc(mt("recBuy", {p: yen(v.buyAt)}))}</b>`;
  const trend = v.trend == null ? "―" : Math.abs(v.trend) < 0.03 ? mt("flat") : mt(v.trend > 0 ? "up" : "down", {p: pctTxt(v.trend)});
  const open = MK_OPEN === it.id;
  return `<tr class="mrow${open ? " open" : ""}" data-id="${esc(it.id)}" tabindex="0">`
    + `<td class="l"><span class="wico">${icon}</span>${esc(nm(it.name))}${copyBtn(nm(it.name))}${tag}${stockTagHtml(it.id)}${side !== "sell" ? stockAddBtn(it.id) : ""}</td>`
    + `<td>${yen(v.price)}<div class="note">${esc(mt("nowSub", {n: CUR_SCANS, ago: mkAgo(v.at)}))}</div>${v.oddLow ? `<div class="note warn">${esc(mt("oddLow", {p: yen(v.oddLow.price)}))}</div>` : ""}</td>`
    + `<td><span class="mrange" title="${esc(yen(v.low) + " 〜 " + yen(v.high))}"><i style="left:${(v.pos * 100).toFixed(1)}%"></i></span><div class="mrangeL"><span>${yen(v.low)}</span><span>${yen(v.high)}</span></div></td>`
    + `<td>${Math.round(v.pos * 100)}%</td>`
    + `<td class="mrec">${rec}</td>`
    + (pf ? `<td class="mprofit"><b>${yen(pf.profit)}</b> <span class="note">(${pctTxt(pf.rate)})</span><div class="note">${esc(mt("profitSub", {via: mt(pf.via === "trader" ? "viaTrader" : "viaFlea"), net: yen(pf.sellNet), slot: yen(pf.perSlot)}))}</div></td>` + `<td>${v.rebounds > 0 ? `<b>${v.rebounds}回</b><div class="note">${esc(mt("reboundSub", {n: S.mkDays || 30}))}</div>` : `<span class="note warn">${esc(mt("reboundNone", {p: yen(v.recentHigh)}))}</span>`}</td>` : "")
    + `<td>${esc(trend)}</td>`
    + `<td>${fmt(it.lastOfferCount || 0)}</td></tr>`
    + (open ? `<tr class="mdetail"><td colspan="${pf ? 9 : 7}">${mkDetail(it, v)}</td></tr>` : "");
}
/* ---- 開いた行：グラフと説明 ---- */
const CH = {w: 720, h: 160, padL: 4, padR: 58, padY: 8};
const MK_CHART = new Map();
function mkDetail(it, v){
  const now = Date.now(), from = now - (S.mkDays || 30) * DAY;
  const pts = v.pts.filter(p => p.t >= from);
  const lines = trendLines(v.pts, from, now, Math.max(HOUR, (now - from) / 240));
  const vals = [...pts.map(p => p.price), ...lines.flatMap(l => [l.short, l.long]).filter(x => x != null), v.buyAt, v.sellAt].sort((a, b) => a - b);
  let lo = quantile(vals, 0.02), hi = quantile(vals, 0.98);
  if(hi - lo < hi * 0.02){ lo *= 0.99; hi *= 1.01; }
  const W = CH.w - CH.padL - CH.padR, Hh = CH.h - CH.padY * 2;
  const x = t => CH.padL + (t - from) / (now - from) * W;
  const y = val => CH.padY + (1 - (Math.min(hi, Math.max(lo, val)) - lo) / (hi - lo)) * Hh;
  const path = key => { let d = "", pen = false; for(const l of lines){ const val = l[key]; if(val == null){ pen = false; continue; } d += (pen ? "L" : "M") + x(l.t).toFixed(1) + " " + y(val).toFixed(1); pen = true; } return d; };
  MK_CHART.set(it.id, {from, to: now, lines, pts});
  const ref = (val, cls, label) => `<line class="${cls}" x1="${CH.padL}" x2="${CH.padL + W}" y1="${y(val).toFixed(1)}" y2="${y(val).toFixed(1)}"/><text x="${CH.padL + W + 4}" y="${(y(val) + 3).toFixed(1)}">${esc(label)}</text>`;
  const svg = `<svg class="wchart" data-id="${esc(it.id)}" viewBox="0 0 ${CH.w} ${CH.h}" width="${CH.w}" height="${CH.h}" role="img" aria-label="${esc(nm(it.name))}">`
    + pts.map(p => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.price).toFixed(1)}" r="1.8" class="dot"/>`).join("")
    + ref(v.buyAt, "ref-buy", yen(v.buyAt)) + ref(v.sellAt, "ref-sell", yen(v.sellAt))
    + `<path d="${path("long")}" class="ma-long"/><path d="${path("short")}" class="ma-short"/>`
    + `<line class="cross" x1="0" x2="0" y1="0" y2="${CH.h}" visibility="hidden"/></svg>`;
  const legend = `<div class="wleg"><span><i class="ld"></i>${mt("legDot")}</span><span><i class="ls"></i>${mt("legShort")}</span><span><i class="ll"></i>${mt("legLong")}</span><span><i class="lb"></i>${mt("legBuy")}</span><span><i class="lh"></i>${mt("legSell")}</span></div>`;
  const text = mt("detail", {d: S.mkDays || 30, low: yen(v.low), med: yen(v.median), high: yen(v.high), short: yen(v.short), long: yen(v.long)});
  return legend + svg + `<div class="mtext">${esc(text)}</div>`;
}
/* ---- 一覧の節 ---- */
function mkSection(side, items){
  const d = S.mkDays || 30;
  let views = items.map(it => ({it, v: mkView(it)})).filter(x => x.v);
  const few = views.filter(x => x.v.zone === "few").length;
  views = views.filter(x => x.v.zone !== "few");
  let lowN = 0, profitN = 0;
  if(side === "buy"){
    // 底値寄り（位置40%以下）の品のうち、見込み利益が条件に合うものだけ。利益の大きい順
    const low = views.filter(x => x.v.pos <= 0.4);
    lowN = low.length;
    views = low.map(x => ({...x, pf: mkProfit(x.it, x.v)}))
               .filter(x => x.pf.profit >= (S.mkMinProfit || 0) && x.pf.rate * 100 >= (S.mkMinRate || 0));
    profitN = views.length;
    // 底値（おすすめ買値以下）まで下がったあと、おすすめ売値まで一度も戻ったことがない品は外す（戻る見込みが薄い）
    if(S.mkNeedRebound !== false) views = views.filter(x => x.v.rebounds > 0);
    views.sort((a, b) => b.pf.profit - a.pf.profit);
  }
  else if(side === "sell") views = views.filter(x => x.v.pos >= 0.6).sort((a, b) => b.v.pos - a.v.pos);
  const head = `<thead><tr><th class="l">${mt("cName")}</th><th>${mt("cNow")}</th><th>${mt("cRange", {d})}</th><th>${mt("cPos")}</th><th>${mt("cRec")}</th>${side === "buy" ? `<th>${mt("cProfit")}</th><th>${mt("cRebound")}</th>` : ""}<th>${mt("cTrend")}</th><th>${mt("cOffers")}</th></tr></thead>`;
  const title = side === "found" ? mt("searchTitle") : mt(side === "buy" ? "buyTitle" : "sellTitle", {d});
  const body = views.length ? `<table class="mtbl">${head}<tbody>${views.map(x => mkRow(x.it, x.v, side, x.pf)).join("")}</tbody></table>`
    : `<p class="note">${esc(side === "buy" && profitN ? mt("noneRebound", {n: lowN, m: profitN}) : side === "buy" && lowN ? mt("noneProfit", {p: yen(S.mkMinProfit || 0), r: S.mkMinRate || 0, n: lowN}) : mt("none", {n: items.length}))}</p>`;
  return `<section class="msec ${side}"><h2>${esc(title)}</h2>${body}${few ? `<p class="note">${esc(mt("fewAll", {n: few}))}</p>` : ""}${MK_CAPPED[side] ? `<p class="note warn">${esc(mt("capped", {n: MK_MAX, m: MK_CAPPED[side]}))}</p>` : ""}</section>`;
}
/* ---- 操作の帯 ---- */
function mkBar(){
  const sel = (key, opts) => `<select data-mk="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(S[key]) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  return `<div class="mbar">`
    + `<label class="note">${mt("days")} ${sel("mkDays", [7, 14, 30].map(n => [n, mt("daysOpt", {n})]))}</label>`
    + `<label class="note" title="${esc(mt("thTip"))}">${mt("th")} ${sel("mkTh", [3, 5, 10, 15].map(n => [n, mt("thOpt", {n})]))}</label>`
    + `<label class="note">${mt("kind")} ${sel("mkKind", [["", mt("kindAll")], ...MK_KINDS.map(k => [k, t("kinds")[k] || k])])}</label>`
    + `<label class="note">${mt("minOffers")} <input type="number" data-mk="mkMinOffers" min="0" max="999" value="${S.mkMinOffers}">${mt("minOffers2")}</label>`
    + `<label class="note">${mt("minProfit")}<input type="number" data-mk="mkMinProfit" min="0" step="1000" value="${S.mkMinProfit}" style="width:6.5em">${mt("minProfit2")}<input type="number" data-mk="mkMinRate" min="0" max="500" value="${S.mkMinRate}">${mt("minRate2")}</label>`
    + `<label class="note"><input type="checkbox" data-mk="mkNeedRebound" ${S.mkNeedRebound !== false ? "checked" : ""}>${mt("needRebound")}</label>`
    + `<input type="search" data-mk="q" placeholder="${esc(mt("search"))}" value="${esc(MK_Q)}" size="22">`
    + `<span class="note">${MK_BUSY ? esc(mt("loading", MK_BUSY)) : ""}</span></div>`;
}
function paintMarket(){
  if(!$mk || !MK_PAGE) return;
  $mk.hidden = false;
  if(!DATA){ $mk.innerHTML = mkBar() + `<p class="note">${esc(mt("needData"))}</p>`; return; }
  const c = mkCandidates();
  const focusQ = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.mk === "q";
  $mk.innerHTML = mkBar()
    + stockSection()
    + (c.found.length ? mkSection("found", c.found) : "")
    + mkSection("buy", c.buy) + mkSection("sell", c.sell)
;
  if(focusQ){ const q = $mk.querySelector('[data-mk="q"]'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  mkFetch([...stockItems(), ...c.found, ...c.buy, ...c.sell]);
}

/* ---- 操作 ---- */
if($mk){
  $mk.addEventListener("change", e => {
    if(onStockChange(e)) return;                                                       // 在庫の数量・買値の書き換え
    const el = e.target, k = el.dataset.mk; if(!k || k === "q") return;
    S[k] = k === "mkKind" ? el.value : el.type === "checkbox" ? el.checked : Math.max(0, +el.value || 0);
    saveSettings(); MK_OPEN = null; paintMarket();
  });
  $mk.addEventListener("input", e => { if(e.target.dataset.mk === "q"){ MK_Q = e.target.value; paintMarket(); } });
  const toggle = row => { MK_OPEN = MK_OPEN === row.dataset.id ? null : row.dataset.id; paintMarket(); };
  $mk.addEventListener("click", e => {
    const b = e.target.closest("button[data-copy]"); if(b){ onCopyClick(b); return; }   // 名前のコピー（行は開かない）
    try{ if(onStockClick(e)) return; }                                                 // 在庫の操作（stock-ui.js）
    catch(err){ console.error(err); alert("在庫の操作でエラーが起きました：" + err.message); return; }
    if(e.target.closest("tr.mform, tr.sedit")) return;
    const row = e.target.closest("tr.mrow"); if(row) toggle(row);
  });
  $mk.addEventListener("keydown", e => { if(e.target.closest("button")) return; const row = e.target.closest("tr.mrow"); if(row && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); toggle(row); } });
  /* グラフにカーソルを乗せると、その時点の値（縦線つき） */
  $mk.addEventListener("mousemove", e => {
    const svg = e.target.closest("svg.wchart"), tip = document.getElementById("tip");
    $mk.querySelectorAll("svg.wchart .cross").forEach(c => { if(!svg || !svg.contains(c)) c.setAttribute("visibility", "hidden"); });
    if(!svg){ if(tip.dataset.from === "chart"){ tip.hidden = true; delete tip.dataset.from; } return; }
    const c = MK_CHART.get(svg.dataset.id); if(!c || !c.lines.length) return;
    const r = svg.getBoundingClientRect(), sx = r.width / CH.w;
    const fx = Math.min(1, Math.max(0, ((e.clientX - r.left) / sx - CH.padL) / (CH.w - CH.padL - CH.padR)));
    const tt = c.from + fx * (c.to - c.from);
    const l = c.lines.reduce((a, b) => Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a);
    const p = c.pts.length ? c.pts.reduce((a, b) => Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a) : null;
    const cross = svg.querySelector(".cross"), cx = CH.padL + fx * (CH.w - CH.padL - CH.padR);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
    const date = new Date(l.t).toLocaleString(locale(), {month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"});
    tip.textContent = mt("chartTip", {date, price: p ? yen(p.price) : "―", short: yen(l.short), long: yen(l.long)});
    tip.hidden = false; tip.dataset.from = "chart";
    tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 6) + "px"; tip.style.top = (e.clientY + 18) + "px";
  });
  $mk.addEventListener("mouseleave", () => { const tip = document.getElementById("tip"); if(tip.dataset.from === "chart"){ tip.hidden = true; delete tip.dataset.from; } });
}
