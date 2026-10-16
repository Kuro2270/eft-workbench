/* ================= データの組み立て（画面とスナップショット作成で共通） =================
   tarkov.dev の JSON API から取った生データを、画面で使う形に組み立てる。
   ・画面（app.html）… build.mjs がこのファイルを埋め込む。サーバーに保存データが無いときに、その場で取るのに使う
   ・snapshot.mjs     … 定期実行で同じ組み立てをして data/<モード>.json に書き出す
   どちらも同じ関数を通すので、保存したデータと、その場で取ったデータの中身は同じになる。
   DOM や画面の設定（S）には触れない。 */

/* 取りに行く生データ。soft は取れなくても続ける（需要の計算に使うだけのもの） */
const RAW_PATHS = [
  {key: "items", path: "items"}, {key: "itemsJa", path: "items_ja"}, {key: "itemsEn", path: "items_en"},
  {key: "traders", path: "traders"}, {key: "tradersJa", path: "traders_ja"}, {key: "tradersEn", path: "traders_en", soft: true},
  {key: "tasks", path: "tasks", soft: true}, {key: "hideout", path: "hideout", soft: true},
  {key: "barters", path: "barters", soft: true}, {key: "crafts", path: "crafts", soft: true},
];
const SNAPSHOT_VERSION = 1;

/* 翻訳キー（"<id> Name" など）を指定言語→英語の順に置き換える */
const tr = (key, primary, fallback) => (primary && primary[key]) || (fallback && fallback[key]) || key;

/* 買い手がいる理由（需要の源泉）：アイテムID → {quest, hideout, barter, craft} の必要数 */
function buildDemand(tasks, hideout, barters, crafts){
  const m = new Map();
  const add = (id, kind, n) => {
    if(!id) return;
    const d = m.get(id) || {quest: 0, hideout: 0, barter: 0, craft: 0};
    d[kind] += n || 1; m.set(id, d);
  };
  const vals = x => !x ? [] : Array.isArray(x) ? x : Object.values(x);
  // クエスト納品：フリマやトレーダーで買った品（FIRでない品）でも納品できるものだけ数える
  for(const tk of vals(tasks && tasks.tasks)){
    for(const o of tk.objectives || []){
      if(o.type !== "giveItem" || o.foundInRaid) continue;
      const ids = o.items || (o.item ? [o.item] : []);
      for(const id of ids) add(typeof id === "object" ? id.id : id, "quest", o.count);
    }
  }
  for(const st of vals(hideout)) for(const lv of st.levels || []) for(const r of lv.itemRequirements || []) add(r.item, "hideout", r.count);
  for(const c of vals(crafts)) for(const r of c.requiredItems || []) add(r.item, "craft", r.count);
  return m;
}

/* 1マスに何個まとまるか。弾薬だけはデータに入っている */
function stackSize(pr){
  return pr && pr.propertiesType === "ItemPropertiesAmmo" && pr.stackMaxSize > 1 ? pr.stackMaxSize : 1;
}
/* 残量（使用回数・HP・燃料など）がある品。フリマの最安値は使いかけの出品であることが多い */
function depletable(pr){
  if(!pr) return null;
  switch(pr.propertiesType){
    case "ItemPropertiesKey": return pr.uses > 1 ? {kind: "uses", max: pr.uses} : null;
    case "ItemPropertiesMedicalItem": case "ItemPropertiesPainkiller": return pr.uses > 1 ? {kind: "uses", max: pr.uses} : null;
    case "ItemPropertiesMedKit": return pr.hitpoints > 1 ? {kind: "hp", max: pr.hitpoints} : null;
    case "ItemPropertiesResource": return pr.units > 1 ? {kind: "res", max: pr.units} : null;
  }
  return null;
}

/* 生データ → 保存できる形（JSON にそのまま書ける。バーターは品物を ID で持つ） */
function buildData(raw){
  const {items, itemsJa, itemsEn, traders, tradersJa, tradersEn, tasks, hideout, barters, crafts} = raw;
  const demand = buildDemand(tasks, hideout, barters, crafts);
  const T = {};
  for(const [id, tt] of Object.entries(traders)){
    T[id] = {name: {ja: tr(tt.name, tradersJa, tradersEn), en: tr(tt.name, tradersEn, tradersJa)}, normalizedName: tt.normalizedName};
  }
  const list = Object.values(items.items).map(raw => ({
    id: raw.id,
    name: {ja: tr(raw.name, itemsJa, itemsEn), en: tr(raw.name, itemsEn)},
    shortName: {ja: tr(raw.shortName, itemsJa, itemsEn), en: tr(raw.shortName, itemsEn)},
    iconLink: raw.iconLink, link: raw.link, width: raw.width, height: raw.height, basePrice: raw.basePrice, types: raw.types || [],
    avg24hPrice: raw.avg24hPrice, lastLowPrice: raw.lastLowPrice, low24hPrice: raw.low24hPrice, high24hPrice: raw.high24hPrice,
    updated: raw.updated ? (Date.parse(raw.updated) || 0) : 0,     // フリマ価格を最後に読み取った時刻（売り時通知で「今」の値に使う）
    lastOfferCount: raw.lastOfferCount, changeLast48hPercent: raw.changeLast48hPercent, minLevelForFlea: raw.minLevelForFlea,
    sellFor: (raw.sellToTrader || []).filter(o => T[o.trader]).map(o => ({priceRUB: o.priceRUB, vendor: {name: T[o.trader].name, normalizedName: T[o.trader].normalizedName}})),
    buyFor: (raw.buyFromTrader || []).filter(o => T[o.trader]).map(o => ({priceRUB: o.priceRUB, vendor: {
      name: T[o.trader].name, normalizedName: T[o.trader].normalizedName, trader: {normalizedName: T[o.trader].normalizedName},
      minTraderLevel: o.minTraderLevel, buyLimit: o.buyLimit, restockAmount: o.restockAmount, taskUnlock: !!o.taskUnlock}})),
    demand: demand.get(raw.id) || null,
    depl: depletable(raw.properties),
    melee: !!(raw.properties && raw.properties.propertiesType === "ItemPropertiesMelee"),
    pt: (raw.properties && raw.properties.propertiesType) || "",
    cats: [raw.category, ...(raw.categories || []), ...(raw.handbookCategories || [])].filter(Boolean).map(c => String(c.normalizedName || c.name || c.id || c).toLowerCase()),
    stack: stackSize(raw.properties),
    /* 弾薬箱の中身（弾の ID と数）。箱のままより、開けて弾を売るほうが高いことが多い。ほかの品は持たない（保存データを小さくするため） */
    contains: (raw.types || []).includes("ammoBox")
      ? (raw.containsItems || []).map(c => ({id: typeof c.item === "string" ? c.item : (c.item && c.item.id), count: c.count || 1})).filter(c => c.id)
      : undefined,
  }));
  const ids = new Set(list.map(it => it.id));
  const bartersList = (Array.isArray(barters) ? barters : barters ? Object.values(barters) : []).map(b => {
    const rw = b.offeredItem || (b.rewardItems || [])[0];
    const reqs = (b.requiredItems || []).map(r => ({id: r.item, count: r.count || 1, special: r.attributes && Object.keys(r.attributes).length > 0}));
    if(!rw || !ids.has(rw.item) || !T[b.trader] || !reqs.length || reqs.some(r => !ids.has(r.id) || r.special)) return null;   // 条件付き材料（ドッグタグのレベル指定など）は対象外
    return {id: b.id, trader: T[b.trader], ll: b.minTraderLevel || 1, task: !!b.taskUnlock, limit: b.buyLimit || 0,
            rewardId: rw.item, rewardCount: rw.count || 1, reqs: reqs.map(r => ({id: r.id, count: r.count}))};
  }).filter(Boolean);
  return {v: SNAPSHOT_VERSION, items: list, flea: items.fleaMarket, barters: bartersList};
}

/* 保存できる形 → 画面で使う形（バーターの ID を品物そのものにつなぐ） */
function hydrateData(d){
  const byId = new Map(d.items.map(it => [it.id, it]));
  const barters = d.barters.map(b => ({id: b.id, trader: b.trader, ll: b.ll, task: b.task, limit: b.limit,
    reward: byId.get(b.rewardId), rewardCount: b.rewardCount, reqs: b.reqs.map(r => ({it: byId.get(r.id), count: r.count, special: false}))}))
    .filter(b => b.reward && b.reqs.every(r => r.it));
  return {items: d.items, flea: d.flea, barters};
}
