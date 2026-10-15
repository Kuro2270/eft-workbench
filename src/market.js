/* ================= 売り時・買い時：相場の位置の計算（計算だけ。画面・取得には触れない） =================
   考え方
   ・値段は、価格記録の「平均価格」（その時点の安い出品いくつかの平均。tarkov.dev のグラフの実線）を使う。
     「最安値」は、すぐ買われる極端に安い1件を拾うことがあり、実際に買える値段とずれるため（平均価格が無い記録だけ最安値で代用）
   ・品ごとの価格記録（prices/<id>）から、過去 N 日（既定30日）の値動きの幅を出す。
     最安値は1件の出品で跳ねるので、幅の両端は「下から5%」「上から5%」の値を使う（極端な1点に引っぱられない）
   ・いまの最安値がその幅のどこにあるか（位置 0%＝底値、100%＝高値）で、買い場・売り場を決める
     位置 20%以下＝底値付近（買い場）、80%以上＝高値付近（売り場）
   ・おすすめの値段：買うなら「下から25%」の値以下、売るなら「上から25%」の値以上
     （過去 N 日のうち、4分の3の時間はそれより高かった／安かった、という値）
   ・グラフ用に、24時間と7日の移動平均（跳ねた値を外した平均）も出す */

const HOUR = 3600e3, DAY = 24 * HOUR;
const MA_SHORT = DAY, MA_LONG = 7 * DAY;     // 短期線・長期線の幅
const MIN_SHORT = 3, MIN_LONG = 10;          // 平均を出すのに要る最低の記録数
const MIN_RANGE = 10;                        // 幅を出すのに要る最低の記録数
const ZONE = 0.2;                            // 底値付近・高値付近とみなす位置（下から／上から20%）

/* 価格記録 → 時刻順の点（平均価格。無ければ最安値。どちらも0の点は捨てる）。from より前は使わない */
function pricePoints(hist, from){
  const tsOf = p => isNaN(+p.timestamp) ? Date.parse(p.timestamp) : +p.timestamp;
  return (hist || []).map(p => ({t: tsOf(p), price: p.price > 0 ? p.price : p.priceMin, min: p.priceMin || 0, offers: p.offerCount || 0}))
                     .filter(p => p.price > 0 && p.t >= from).sort((a, b) => a.t - b.t);
}
const CUR_SCANS = 3;                         // 「いまの相場」＝直近3回の読み取りの中央値
const ODD_LOW = 0.8;                         // 一覧の最安値が相場の80%未満なら「極端に安い出品」とみなす
/* 並べ替え済みの配列の q 分位点（0〜1） */
function quantile(sorted, q){
  if(!sorted.length) return null;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
/* 時刻 t までの width 幅の移動平均（記録が min 件に足りなければ null）。
   その幅の中央値から ±30% を超える値は外してから平均する */
const OUTLIER = 0.3;
function movingAvg(pts, t, width, min){
  const vals = [];
  for(const p of pts){ if(p.t > t - width && p.t <= t) vals.push(p.price); }
  if(vals.length < (min || 1)) return null;
  const med = quantile([...vals].sort((a, b) => a - b), 0.5);
  const kept = vals.filter(v => Math.abs(v - med) <= med * OUTLIER);
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}
/* グラフ用：from〜to を step ごとに区切った短期線・長期線 */
function trendLines(pts, from, to, step){
  const out = [];
  for(let t = from; t <= to; t += step){
    out.push({t, short: movingAvg(pts, t, MA_SHORT, MIN_SHORT), long: movingAvg(pts, t, MA_LONG, MIN_LONG)});
  }
  return out;
}
/* いまの値段の、過去 days 日の中での位置。
   live = {price, at}：アイテム一覧の最新の最安値（価格記録の最後より新しければ「いま」として使う） */
function marketView(hist, opt){
  const now = opt.now || Date.now(), days = opt.days || 30;
  const all = pricePoints(hist, now - Math.max(days, 14) * DAY);
  const pts = all.filter(p => p.t >= now - days * DAY);
  if(pts.length < MIN_RANGE) return {zone: "few", n: pts.length, pts: all};
  const sorted = pts.map(p => p.price).sort((a, b) => a - b);
  const low = quantile(sorted, 0.05), high = quantile(sorted, 0.95);
  const buyAt = quantile(sorted, 0.25), sellAt = quantile(sorted, 0.75), median = quantile(sorted, 0.5);
  /* いまの相場：直近3回の読み取りの中央値（1回だけの外れに引っぱられない）。
     一覧の最安値（live）は、相場より極端に安ければ「すぐ売り切れる安い出品」として別に知らせるだけにする */
  const recent = pts.slice(-CUR_SCANS);
  const cur = {price: quantile(recent.map(p => p.price).sort((a, b) => a - b), 0.5), t: recent[recent.length - 1].t};
  const lv = opt.live;
  const oddLow = lv && lv.price > 0 && lv.price < cur.price * ODD_LOW ? {price: lv.price, at: lv.at} : null;
  const pos = high > low ? Math.min(1, Math.max(0, (cur.price - low) / (high - low))) : 0.5;
  const zone = pos <= ZONE ? "buy" : pos >= 1 - ZONE ? "sell" : "mid";
  const short = movingAvg(all, now, MA_SHORT, MIN_SHORT), long = movingAvg(all, now, MA_LONG, MIN_LONG);
  const rb = rebounds(all, now - days * DAY, now, buyAt, sellAt);
  return {zone, pos, price: cur.price, at: cur.t, oddLow, low, high, buyAt, sellAt, median, short, long,
          trend: short != null && long != null ? short / long - 1 : null, rebounds: rb.count, recentHigh: rb.high, n: pts.length, pts: all};
}
/* 「底値から、おすすめ売値まで戻った」回数（往復の回数）。
   24時間平均（グラフの実線）を期間の頭から順に見て、おすすめ買値以下まで下がったあとに、
   おすすめ売値以上まで戻ったら1回と数える。一度高値から落ちて、そのまま戻っていない品は 0 回になる
   （ワイプ後に使い道が減って値崩れし続けている品など）。
   1回の跳ねた読み取りや、1日の中の上下では数えないよう、24時間平均で見る */
function rebounds(pts, from, to, buyAt, sellAt){
  let count = 0, wasLow = false, high = 0, lastLowAt = 0;
  for(let t = from; t <= to; t += 2 * HOUR){
    const ma = movingAvg(pts, t, MA_SHORT, MIN_SHORT);
    if(ma == null) continue;
    if(ma <= buyAt){ wasLow = true; lastLowAt = t; high = 0; }
    else if(wasLow) high = Math.max(high, ma);               // 底値を付けたあとの最高値
    if(wasLow && ma >= sellAt){ count++; wasLow = false; }
  }
  return {count, high};
}
/* 底値付近で買って、おすすめ売値（上から25%の値）で売ったときの見込み利益。
   売り先はフリマ（手数料を引いた手取り）とトレーダー（その場で売れる額）の高いほう。買うのはフリマの今の最安値（手数料なし） */
function buyProfit(buyPrice, sellAt, feeOf, traderPrice){
  const fleaNet = sellAt - feeOf(sellAt);
  const viaTrader = (traderPrice || 0) > fleaNet;
  const sellNet = viaTrader ? traderPrice : fleaNet;
  const profit = sellNet - buyPrice;
  return {sellNet, via: viaTrader ? "trader" : "flea", profit, rate: buyPrice > 0 ? profit / buyPrice : 0};
}
/* 在庫（仕込んだ品）の状態。v＝marketView の結果、cost＝1個あたりの買値、netNow＝いま売ったときの1個あたりの手取り
   sell：売り場（高値付近か、おすすめ売値に届いた）で、売れば利益が出る／high：高値付近だが、買値が高く売ると赤字／plus：売れば利益は出るが、まだ上がる余地あり／hold：待ち／few：判定できない */
function stockState(v, cost, netNow){
  if(!v || v.zone === "few") return "few";
  if(v.zone === "sell" || v.price >= v.sellAt) return netNow >= cost ? "sell" : "high";
  if(netNow > cost) return "plus";
  return "hold";
}
/* 一覧の段階で候補を絞るための目安：いまの最安値が24時間平均より何%高い（安い）か。
   全品の価格記録は取れないので、まずこれで候補を選び、候補だけ記録を取って位置を確かめる */
function quickDev(it){
  return it.avg24hPrice > 0 && it.lastLowPrice > 0 ? it.lastLowPrice / it.avg24hPrice - 1 : null;
}
/* 候補にするか：いまの最安値が24時間平均より th 以上安い（高い）か、48時間で th 以上下がった（上がった）品。
   side = "buy"（安い側）／"sell"（高い側）。th は 0.05 なら 5%。返り値は外れ具合（並べ替え用、大きいほど外れている）。対象外なら null */
function candScore(it, side, th){
  const dev = quickDev(it), ch = it.changeLast48hPercent != null ? it.changeLast48hPercent / 100 : null;
  const vals = [dev, ch].filter(v => v != null).map(v => side === "buy" ? -v : v);
  if(!vals.length) return null;
  const best = Math.max(...vals);
  return best >= th ? best : null;
}

/* 値段の更新がこまめな品か。データを取った時刻（refAt）の時点で、最安値の読み取りが maxMin 分以内だった品 */
function isFresh(updatedAt, refAt, maxMin){
  return updatedAt > 0 && refAt - updatedAt <= maxMin * 60000;
}
