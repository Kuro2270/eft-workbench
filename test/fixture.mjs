/* json.tarkov.dev の代わりに返す、小さな作り物のデータ */
export const TRADERS = {
  t_mech: { name: "Mechanic Name", normalizedName: "mechanic" },
  t_prap: { name: "Prapor Name", normalizedName: "prapor" }
};
const base = (id, name, over = {}) => ({
  id, name, shortName: name.slice(0, 4), iconLink: "", link: "https://example.test/" + id,
  width: 1, height: 1, basePrice: 40000, types: ["barter"],
  avg24hPrice: 86000, lastLowPrice: 80000, low24hPrice: 79000, high24hPrice: 95000,
  lastOfferCount: 30, changeLast48hPercent: 1.2, minLevelForFlea: 15,
  sellToTrader: [{ trader: "t_prap", priceRUB: 30000 }],
  buyFromTrader: [{ trader: "t_mech", priceRUB: 50000, minTraderLevel: 1, taskUnlock: null,
                    buyLimit: 0, restockAmount: 0 }],
  properties: null, containsItems: [], updated: new Date(Date.now() - 20 * 60e3).toISOString(),   // 20分前に読み取り（こまめな品）
  ...over
});
const withBuy = (it, buyLimit, restockAmount) => {
  it.buyFromTrader[0].buyLimit = buyLimit;
  it.buyFromTrader[0].restockAmount = restockAmount;
  return it;
};

export const ITEMS = {};
/* 1) 購入制限なし・在庫12個 … これまで「―」になっていた品 */
ITEMS.unlimited = withBuy(base("unlimited", "Unlimited Item"), 0, 12);
/* 2) 購入上限3・在庫20 … 上限のほうが小さい */
ITEMS.limited = withBuy(base("limited", "Limited Item"), 3, 20);
/* 3) 購入上限10・在庫4 … 在庫のほうが小さい */
ITEMS.thin = withBuy(base("thin", "Thin Stock Item"), 10, 4);
/* 4) どちらも不明 … 従来どおり「―」 */
ITEMS.unknown = withBuy(base("unknown", "Unknown Cap Item"), 0, 0);
/* 5) 銃本体：トレーダーは素の本体を安く売り、フリマ最安は組み立て済みの値段になる */
ITEMS.gun = withBuy(base("gun", "Assault Rifle Body", {
  types: ["gun"], basePrice: 25000, lastLowPrice: 69696, avg24hPrice: 90000,
  buyFromTrader: [{ trader: "t_mech", priceRUB: 27250, minTraderLevel: 4, taskUnlock: null, buyLimit: 5, restockAmount: 5 }]
}), 5, 5);
/* 6) 既定のプリセットも同じ理由で外す */
ITEMS.preset = withBuy(base("preset", "Assault Rifle Default", {
  types: ["preset"], basePrice: 25000, lastLowPrice: 69696,
  buyFromTrader: [{ trader: "t_mech", priceRUB: 30000, minTraderLevel: 4, taskUnlock: null, buyLimit: 5, restockAmount: 5 }]
}), 5, 5);

/* 7) フリマで買ってトレーダーに売ると儲かる品（f2t タブ用） */
ITEMS.f2t = base("f2t", "Flea To Trader Item", {
  lastLowPrice: 20000, avg24hPrice: 24000, basePrice: 30000,
  sellToTrader: [{ trader: "t_prap", priceRUB: 45000 }],
  buyFromTrader: []
});

/* 持ち帰りタブ用：大きさ・値段・スタックがばらばらの品 */
const loot = (id, name, w, h, traderPrice, fleaPrice, over = {}) => {
  const it = base(id, name, { width: w, height: h, lastLowPrice: fleaPrice, avg24hPrice: fleaPrice,
    basePrice: Math.round(traderPrice * 1.4), lastOfferCount: 40,
    sellToTrader: [{ trader: "t_prap", priceRUB: traderPrice }], buyFromTrader: [], ...over });
  return it;
};
/* 1マスで高額 … 最上位になるはず */
ITEMS.gpu = loot("gpu", "Graphics Card", 1, 2, 380000, 450000);
/* 大きくて安い … 下位になるはず */
ITEMS.crate = loot("crate", "Wooden Crate", 4, 4, 30000, 40000);
/* 弾薬：1発は安いが1マスに60発 */
ITEMS.ammo = loot("ammo", "Rifle Round", 1, 1, 400, 520, {
  types: ["ammo"], properties: { propertiesType: "ItemPropertiesAmmo", stackMaxSize: 60 } });
/* フリマ禁止品：トレーダーだけで評価される */
ITEMS.nofleaLoot = loot("nofleaLoot", "Quest Only Item", 1, 1, 90000, 120000, { types: ["barter", "noFlea"] });
/* ふつうのバーター品 */
ITEMS.bolt = loot("bolt", "Bolts", 1, 1, 12000, 16000);
ITEMS.wire = loot("wire", "Wires", 1, 1, 24000, 31000);
ITEMS.tool = loot("tool", "Hand Drill", 2, 2, 70000, 92000);

/* 鍵とケース：レイドでは当てにできないので、既定では一覧にも母集団にも入れない。
   1マス単価をわざと最上位にして、境目が動くかどうかを見る */
ITEMS.key = loot("key", "Rare Key", 1, 1, 900000, 1200000, { types: ["keys"] });
ITEMS.case = loot("case", "Item Case", 3, 3, 800000, 950000, { types: ["container"] });

/* 防具類と武器パーツ：既定で外れるはず */
ITEMS.armor = loot("armor", "Body Armor", 4, 4, 200000, 260000, { types: ["armor"] });
ITEMS.cap = loot("cap", "EFT: ARENA Baseball cap", 1, 1, 1806, 0, { types: ["wearable", "noFlea"] });
ITEMS.glasses = loot("glasses", "Round frame sunglasses", 1, 1, 5000, 9000, { types: ["glasses", "wearable"] });
ITEMS.beard = loot("beard", "Fake beard", 1, 1, 3000, 6000, { types: ["wearable"] });
/* 値段の読み取りがまばらな品（3時間前）：売り時通知の候補には既定で出ない */
/* 画像が無い品（tarkov.dev の仮の画像）：持ち帰りティア表には出ない */
ITEMS.noImage = loot("noImage", "PMC Hardened figurine", 1, 2, 19125, 0, { iconLink: "https://assets.tarkov.dev/unknown-item-icon.jpg" });
ITEMS.slowScan = loot("slowScan", "Slow Scan Trophy", 1, 1, 60000, 100000, { updated: new Date(Date.now() - 3 * 3600e3).toISOString() });
ITEMS.sotr = loot("sotr", "Gentex Ops-Core SOTR", 2, 2, 3192, 0, { types: ["noFlea"] });
ITEMS.shades = loot("shades", "Fiigray sunglasses", 2, 1, 3350, 0, { types: ["noFlea"] });   // 種類が付いていなくても名前で外れる
ITEMS.backpack = loot("backpack", "Pilgrim tourist backpack", 5, 7, 39000, 60000, { types: ["backpack"] });
ITEMS.helm = loot("helm", "Combat Helmet", 2, 2, 110000, 140000, { types: ["helmet"] });
ITEMS.rig = loot("rig", "Chest Rig", 3, 3, 90000, 120000, { types: ["rig"] });
ITEMS.mod = loot("mod", "Rail Mount", 1, 1, 45000, 58000, { types: ["mods"] });
ITEMS.supp = loot("supp", "Suppressor", 1, 2, 130000, 170000, { types: ["mods", "suppressor"] });

export const FLEA = { sellOfferFeeRate: 0.03, sellRequirementFeeRate: 0.03, foundInRaidRequired: false };

/* 価格の履歴：120日ぶん。直近30日は高く、それ以前は安い（期間で結果が変わるように） */
export function history(id) {
  const out = [];
  for (let i = 119; i >= 0; i--) {
    const t = Date.now() - i * 864e5;
    const recent = i < 30;
    const pmin = id === "f2t" ? (recent ? 20000 : 41000) : (recent ? 80000 : 52000);   // 52,000 は損益分岐（約55,000）の下
    out.push({ timestamp: String(t), priceMin: pmin, price: Math.round(pmin * 1.08), offerCount: 30 });
  }
  return out;
}

/* 近接武器：既定では出さない */
ITEMS.knife = loot("knife", "Test Knife", 1, 2, 60000, 80000, { types: ["barter"], properties: { propertiesType: "ItemPropertiesMelee" } });
/* 出品がほとんど無い珍品：既定（3件未満）で外れる */
ITEMS.rareHolo = loot("rareHolo", "Rare Hologram", 1, 1, 500000, 900000, { lastOfferCount: 1 });
/* フリマ禁止品は出品数0でも外さない */
ITEMS.armband = loot("armband", "Test Armband (red)", 1, 1, 20000, 30000, { types: ["wearable"] });
ITEMS.ammoBox = loot("ammoBox", "Test Ammo Pack", 1, 1, 30000, 45000, { types: ["ammoBox"] });
ITEMS.headset = loot("headset", "Test Headset", 1, 1, 50000, 70000, { types: ["headphones"] });
ITEMS.earplug = loot("earplug", "CENS ProFlex DX5 tactical earplugs", 1, 1, 150000, 200000, { types: ["wearable"] });   // 種類がヘッドセットで返らない場合
ITEMS.balaclava = loot("balaclava", "Test Balaclava", 1, 1, 20000, 30000, { types: ["wearable"] });
/* 型が helmet でなくても、性能の種別がヘルメットなら外れる */
ITEMS.helm2 = loot("helm2", "Typeless Helmet", 2, 2, 90000, 120000, { types: ["wearable"], properties: { propertiesType: "ItemPropertiesHelmet" } });
ITEMS.faceShield = loot("faceShield", "Test Face Shield", 1, 1, 60000, 90000, { types: ["wearable"], properties: { propertiesType: "ItemPropertiesArmorAttachment" } });
ITEMS.dogtag = loot("dogtag", "Dogtag BEAR", 1, 1, 8000, 12000, { types: ["barter"] });
ITEMS.variant = loot("variant", "Test Cap (Red Stripe)", 1, 1, 15000, 20000, { types: ["wearable"] });
ITEMS.mask = loot("mask", "Test Samurai Mask", 1, 1, 22000, 33000, { types: ["wearable"] });
ITEMS.gasFilter = loot("gasFilter", "Gas mask air filter", 1, 1, 17000, 25000, { types: ["barter"] });
