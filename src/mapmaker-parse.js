/* マップ作成ツール：スクリーンショットのファイル名から位置と向きを読む（画面からも node のテストからも使う）
 *
 * タルコフのスクリーンショットのファイル名には、撮った瞬間の位置と向きが入る。
 *   例）2026-10-13[16-48]_-123.45, 2.31, 56.78_0.00000, 0.70711, 0.00000, 0.70711_12.34 (0).png
 *       日時[時-分] _ 位置 x, y(高さ), z _ 向き（四元数 x, y, z, w） _ …
 * 形が少し違っても読めるよう、「_」で区切られた「数字3つ」を位置、その次の「数字4つ」を向きとして探す。
 * 役割はこれだけ（描画や保存は mapmaker.html）。
 */
(function(root){
  const NUM = "-?\\d+(?:\\.\\d+)?";
  const TRIPLE = new RegExp(`_(${NUM}),\\s*(${NUM}),\\s*(${NUM})_`);
  const QUAD = new RegExp(`_(${NUM}),\\s*(${NUM}),\\s*(${NUM}),\\s*(${NUM})_`);
  const WHEN = /(\d{4})-(\d{2})-(\d{2})\[(\d{2})-(\d{2})(?:-(\d{2}))?\]/;

  /* ファイル名 → { x, y, z, yaw, time, name } 。位置が読めなければ null */
  function parseShotName(name, lastModified){
    const base = String(name).split(/[\\/]/).pop();
    const p = base.match(TRIPLE);
    if(!p) return null;
    const x = +p[1], y = +p[2], z = +p[3];
    const rest = base.slice(base.indexOf(p[0]) + p[0].length - 1);   // 位置の後ろから向きを探す
    const q = rest.match(QUAD);
    let yaw = null;
    if(q){
      const qx = +q[1], qy = +q[2], qz = +q[3], qw = +q[4];
      /* Unity の前方向 (0,0,1) を回したときの x・z。上から見た向き（z が上、x が右、時計回りの度） */
      const fx = 2 * (qx * qz + qw * qy), fz = 1 - 2 * (qx * qx + qy * qy);
      yaw = (Math.atan2(fx, fz) * 180 / Math.PI + 360) % 360;
    }
    const w = base.match(WHEN);
    let time = lastModified || 0;
    if(w && !lastModified) time = new Date(+w[1], +w[2] - 1, +w[3], +w[4], +w[5], +(w[6] || 0)).getTime();
    return { name: base, x, y, z, yaw, time };
  }

  /* 撮った順に並べ、間隔が gapSec 秒より空いたところで区切る（1つの区切り＝1つの形の候補） */
  function splitByGap(points, gapSec){
    const list = points.slice().sort((a, b) => a.time - b.time);
    const groups = [];
    let cur = [];
    for(const p of list){
      if(cur.length && p.time - cur[cur.length - 1].time > gapSec * 1000){ groups.push(cur); cur = []; }
      cur.push(p);
    }
    if(cur.length) groups.push(cur);
    return groups;
  }

  const api = { parseShotName, splitByGap };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MapParse = api;
})(typeof window !== "undefined" ? window : globalThis);
