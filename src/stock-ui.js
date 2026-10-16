/* ================= 売り時・買い時：在庫（仕込んだ品） =================
   買い場の品に「仕込んだ」を押す → 数量と1個あたりの買値を入れて記録する（このブラウザに保存）
   在庫の欄で、いまの相場・おすすめ売値・いま売ったときの損益を見せ、売り場になった品を「売り時」として上に出す
   売ったら「売った」で記録から外す。判定は market.js の stockState、相場の見方は売り時・買い時と同じ（marketView） */

const ST_I18N = {
  ja: {
    title: "在庫（仕込んだ品）", sellN: "売り時 {n}品",
    empty: "まだありません。買い場の品の「仕込んだ」を押すと、ここに記録されます。",
    cName: "品物", cQty: "数量", cCost: "買値／個", cNow: "いまの相場", cTarget: "おすすめ売値", cPL: "いま売ると", cState: "状態",
    plSub: "1個 {each}（手取り {net}）", targetSub: "手取り {net}・合計 {total}",
    sell: "売り時", high: "高値付近（売ると赤字）", plus: "売れば利益（まだ上がる余地）", hold: "待ち", few: "記録が少ない", wait: "確認中",
    sold: "売った", soldAsk: "{name} を在庫から外しますか？",
    add: "仕込んだ", addTitle: "{name} を在庫に記録", qty: "数量", cost: "1個あたりの買値", save: "記録する", cancel: "やめる",
    held: "在庫 {n}", otherMode: "ほかのモードの在庫 {n}品（モードを切り替えると表示）",
    total: "在庫の合計：買値 {cost}・いま売ると {now}（{pl}）",
  },
  en: {
    title: "Stock (items you bought)", sellN: "{n} to sell",
    empty: "Nothing yet. Press \"Bought\" on a buy-zone item to record it here.",
    cName: "Item", cQty: "Qty", cCost: "Cost / unit", cNow: "Market now", cTarget: "Suggested sell", cPL: "If sold now", cState: "Status",
    plSub: "{each} each (take-home {net})", targetSub: "take-home {net}, total {total}",
    sell: "Sell", high: "Near the high (would be a loss)", plus: "In profit (may rise further)", hold: "Hold", few: "Not enough data", wait: "Checking",
    sold: "Sold", soldAsk: "Remove {name} from stock?",
    add: "Bought", addTitle: "Record {name} as stock", qty: "Qty", cost: "Cost per unit", save: "Save", cancel: "Cancel",
    held: "stock {n}", otherMode: "{n} items in other modes (switch mode to see them)",
    total: "Stock total: cost {cost}, if sold now {now} ({pl})",
  },
};
const stt = (k, v) => String((ST_I18N[S.lang] || ST_I18N.ja)[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : "");

/* ---- 記録（設定と一緒にブラウザへ保存。モードごと） ---- */
const stockAll = () => Array.isArray(S.mkStock) ? S.mkStock : [];
const stockList = () => stockAll().filter(s => (s.mode || "regular") === S.mode);
const stockOf = id => stockList().filter(s => s.id === id);
function stockItems(){ return DATA ? stockList().map(s => DATA.items.find(it => it.id === s.id)).filter(Boolean) : []; }
function stockSave(list){ S.mkStock = list; saveSettings(); }
function stockAdd(id, qty, cost){ stockSave([...stockAll(), {id, qty, cost, at: Date.now(), mode: S.mode}]); }

/* ---- 買い場の行に付ける部品 ---- */
function stockTagHtml(id){
  const n = stockOf(id).reduce((a, s) => a + s.qty, 0);
  return n ? `<span class="mtag held">${esc(stt("held", {n: fmt(n)}))}</span>` : "";
}
function stockAddBtn(id){ return `<button type="button" class="sadd" data-stock-add="${esc(id)}">${esc(stt("add"))}</button>`; }
/* 「仕込んだ」の入力欄：一覧の外（画面の上に浮かぶ小窓）に出す。
   一覧は価格記録を取るたびに描き直されるので、その中に置くと入力中に消えたり、開いたのに見えなかったりするため */
function stockDialog(it, v){
  let dlg = document.getElementById("stockDlg");
  if(!dlg){
    dlg = document.createElement("div"); dlg.id = "stockDlg"; dlg.setAttribute("role", "dialog");
    document.body.appendChild(dlg);
    dlg.addEventListener("click", e => {
      if(e.target.closest("[data-stock-cancel]")){ dlg.hidden = true; return; }
      const save = e.target.closest("[data-stock-save]"); if(!save) return;
      const qty = Math.max(1, Math.round(+dlg.querySelector('[data-sf="qty"]').value || 1));
      const cost = Math.max(1, Math.round(+dlg.querySelector('[data-sf="cost"]').value || 1));
      stockAdd(save.dataset.stockSave, qty, cost); dlg.hidden = true; paintMarket();
    });
    dlg.addEventListener("keydown", e => {
      if(e.key === "Escape") dlg.hidden = true;
      if(e.key === "Enter"){ const b = dlg.querySelector("[data-stock-save]"); if(b) b.click(); }
    });
  }
  dlg.innerHTML = `<div class="sform"><b>${esc(stt("addTitle", {name: nm(it.name)}))}</b>`
    + `<label class="note">${stt("qty")} <input type="number" data-sf="qty" min="1" value="1" style="width:5em"></label>`
    + `<label class="note">${stt("cost")} <input type="number" data-sf="cost" min="1" value="${Math.round(v ? v.price : it.lastLowPrice || 0)}" style="width:8em"></label>`
    + `<button type="button" class="primary" data-stock-save="${esc(it.id)}">${stt("save")}</button>`
    + `<button type="button" data-stock-cancel>${stt("cancel")}</button></div>`;
  dlg.hidden = false;
  const q = dlg.querySelector('[data-sf="qty"]'); q.focus(); q.select();
}

/* ---- 在庫の欄 ---- */
function stockSection(){
  const list = stockList(), others = stockAll().length - list.length;
  const head = `<h2>${esc(stt("title"))}</h2>`;
  if(!list.length) return `<section class="msec stock">${head}<p class="note">${esc(stt("empty"))}</p>${others ? `<p class="note">${esc(stt("otherMode", {n: others}))}</p>` : ""}</section>`;
  const sgnYen = n => (n >= 0 ? "+" : "-") + yen(Math.abs(n));
  let costSum = 0, nowSum = 0;
  const rows = list.map((s, i) => {
    const idx = stockAll().indexOf(s);
    const it = DATA.items.find(x => x.id === s.id);
    const v = it ? mkView(it) : null;
    const netNow = v && v.zone !== "few" ? netOf(it, v.price) : null;
    const state = !it ? "few" : !v ? "wait" : stockState(v, s.cost, netNow);
    costSum += s.cost * s.qty; if(netNow != null) nowSum += netNow * s.qty;
    return {s, idx, it, v, netNow, state};
  }).sort((a, b) => (a.state === "sell" ? 0 : 1) - (b.state === "sell" ? 0 : 1));
  const sellN = rows.filter(r => r.state === "sell").length;
  const body = rows.map(({s, idx, it, v, netNow, state}) => {
    const name = it ? nm(it.name) : s.id;
    const icon = it && it.iconLink ? `<img src="${esc(it.iconLink)}" alt="" loading="lazy">` : "";
    const ok = v && v.zone !== "few";
    const pl = ok ? (netNow - s.cost) * s.qty : null;
    const tag = ok && v.zone === "buy" ? `<span class="mtag buy">${mt("tagBuy")}</span>` : ok && v.zone === "sell" ? `<span class="mtag sell">${mt("tagSell")}</span>` : "";
    return `<tr class="srow s-${state}" data-id="${esc(s.id)}">`
      + `<td class="l"><span class="wico">${icon}</span>${esc(name)}${copyBtn(name)}${tag}</td>`
      + `<td><input type="number" data-stock-qty="${idx}" min="1" value="${s.qty}" style="width:4.5em"></td>`
      + `<td><input type="number" data-stock-cost="${idx}" min="1" value="${s.cost}" style="width:7em"></td>`
      + `<td>${ok ? yen(v.price) + `<div class="note">${Math.round(v.pos * 100)}%・${esc(mkAgo(v.at))}</div>` : "―"}</td>`
      + `<td>${ok ? yen(v.sellAt) + `<div class="note">${esc(stt("targetSub", {net: yen(netOf(it, v.sellAt)), total: yen(netOf(it, v.sellAt) * s.qty)}))}</div>` : "―"}</td>`
      + `<td class="spl">${pl != null ? `<b class="${pl >= 0 ? "gain" : "loss"}">${sgnYen(pl)}</b><div class="note">${esc(stt("plSub", {each: sgnYen(netNow - s.cost), net: yen(netNow)}))}</div>` : "―"}</td>`
      + `<td><span class="sstate">${esc(stt(state))}</span></td>`
      + `<td><button type="button" data-stock-sold="${idx}">${esc(stt("sold"))}</button></td></tr>`;
  }).join("");
  const plSum = nowSum - costSum;
  return `<section class="msec stock">${head}`
    + (sellN ? `<p class="ssell">${esc(stt("sellN", {n: sellN}))}</p>` : "")
    + `<table class="mtbl"><thead><tr><th class="l">${stt("cName")}</th><th>${stt("cQty")}</th><th>${stt("cCost")}</th><th>${stt("cNow")}</th><th>${stt("cTarget")}</th><th>${stt("cPL")}</th><th>${stt("cState")}</th><th></th></tr></thead><tbody>${body}</tbody></table>`
    + `<p class="note">${esc(stt("total", {cost: yen(costSum), now: yen(nowSum), pl: sgnYen(plSum)}))}</p>`
    + (others ? `<p class="note">${esc(stt("otherMode", {n: others}))}</p>` : "")
    + `</section>`;
}

/* ---- 操作（market-ui.js のクリック・変更の受け口から呼ばれる。処理したら true） ---- */
function onStockClick(e){
  const add = e.target.closest("[data-stock-add]");
  if(add){
    const it = DATA && DATA.items.find(x => x.id === add.dataset.stockAdd);
    if(it) stockDialog(it, mkView(it));
    return true;
  }
  const sold = e.target.closest("[data-stock-sold]");
  if(sold){
    const i = +sold.dataset.stockSold, s = stockAll()[i]; if(!s) return true;
    const it = DATA && DATA.items.find(x => x.id === s.id);
    if(confirm(stt("soldAsk", {name: it ? nm(it.name) : s.id}))){ stockSave(stockAll().filter((_, k) => k !== i)); paintMarket(); }
    return true;
  }
  return !!e.target.closest(".stock input");   // 在庫の入力欄のクリックで行を開かない
}
function onStockChange(e){
  const el = e.target, q = el.dataset.stockQty, c = el.dataset.stockCost;
  if(q == null && c == null) return false;
  const list = stockAll().slice(), i = +(q ?? c);
  if(!list[i]) return true;
  list[i] = {...list[i], [q != null ? "qty" : "cost"]: Math.max(1, Math.round(+el.value || 1))};
  stockSave(list); paintMarket();
  return true;
}
