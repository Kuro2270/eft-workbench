/* ================= 持ち帰りティア表：画像にして共有する =================
   役割はこれだけ。いま画面に出ているティア表（TIER_ROWS）を1枚の画像（PNG）に描き、共有の窓を開く。
   ・画像の下と、共有の文には、サイトのリンクと YouTube のチャンネルのリンクを必ず入れる（文を消されても、画像に残る）
   ・スマホなど画像ごと共有できるブラウザは「共有する」で LINE・X などのアプリを選べる。
     できないとき（パソコンなど）は、画像を保存して、X・LINE の投稿画面に添付してもらう
   ・アイコンは tarkov.dev の画像。直接読めないとき（画像として書き出せないとき）は、このサイトの icon/（functions/icon）を通して読む。
     それも読めない品は、名前の文字で描く */

const SH_URL = "https://eft-workbench.com/loot";
const SH_YT = "https://www.youtube.com/@RatofTarkov";
const SH_I18N = {
  ja: {
    btn: "画像で共有", title: "ティア表を画像で共有", share: "共有する（LINE・X など）", save: "画像を保存", x: "X に投稿", line: "LINE で送る",
    copy: "文をコピー", copied: "コピーしました", close: "閉じる", making: "画像を作っています…",
    hint: "X・LINE には、保存した画像を添付してください。スマホは「共有する」から画像ごと送れます。",
    head: "タルコフ 持ち帰りティア表", asOf: "{date} {time} 時点の価格", cutOver: "以上／マス", cutBelow: "それ未満", cutBelow2: "／マス", more: "ほか{n}品",
    text: "タルコフ 持ち帰りティア表（{mode}・{date} {time} 時点）\n{url}\nYouTube：{yt}\n#タルコフ #EFT"
  },
  en: {
    btn: "Share as image", title: "Share the tier list as an image", share: "Share (LINE, X, …)", save: "Save image", x: "Post on X", line: "Send on LINE",
    copy: "Copy text", copied: "Copied", close: "Close", making: "Making the image…",
    hint: "For X and LINE, attach the saved image. On a phone, “Share” sends the image too.",
    head: "Tarkov loot tier list", asOf: "Prices as of {date} {time}", cutOver: "+ per slot", cutBelow: "below", cutBelow2: "per slot", more: "+{n} more",
    text: "Tarkov loot tier list ({mode}, prices as of {date} {time})\n{url}\nYouTube: {yt}\n#Tarkov #EscapeFromTarkov"
  }
};
const st = (k, v) => String((SH_I18N[S.lang] || SH_I18N.ja)[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] != null ? v[x] : "");
const SH_COLORS = {S: "#E0B44C", A: "#8DBF6A", B: "#7FA8C9", C: "#98A29F", D: "#5A6468"};
const $share = document.getElementById("shareBtn");

/* ボタンは、持ち帰りティア表をティア表の形で見ているときだけ出す */
function paintShareBtn(){
  if(!$share) return;
  $share.hidden = !!$share.dataset.off || TAB !== "loot" || lootView() !== "tier" || !DATA || !TIER_ROWS.size;
  $share.textContent = st("btn");
}

/* ---- 画像 ---- */
function shLoad(src, cors){
  return new Promise(res => {
    const im = new Image(); if(cors) im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  });
}
/* 書き出せる（キャンバスを汚さない）画像だけを返す。直接 → このサイトを通して → 無し（文字で描く） */
async function shIcon(url){
  if(!url) return null;
  const ok = im => { try{ const c = document.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d"); g.drawImage(im, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1); return true; }catch(e){ return false; } };
  const a = await shLoad(url, true); if(a && ok(a)) return a;
  const m = String(url).match(/^https:\/\/assets\.tarkov\.dev\/([\w-]+\.(?:webp|png|jpe?g))$/i);
  if(m){ const b = await shLoad("icon/" + m[1], true); if(b && ok(b)) return b; }
  return null;
}
const shWhen = () => ({date: DATA.at.toLocaleDateString(locale(), {month: "numeric", day: "numeric"}), time: DATA.at.toLocaleTimeString(locale(), {hour: "2-digit", minute: "2-digit"})});

async function shDraw(){
  const W = 1200, PAD = 28, LAB = 132, CELL = 64, GAP = 6, MAXLINES = 3;
  const per = Math.floor((W - PAD * 2 - LAB - 12 - 12 + GAP) / (CELL + GAP));
  const by = {S: [], A: [], B: [], C: [], D: []};
  for(const r of TIER_ROWS.values()) (by[r.tier] || by.D).push(r);
  for(const k in by) by[k].sort((a, b) => b.perSlot - a.perSlot);
  // 多い段は MAXLINES 行まで。入りきらないときは、最後のマスに「ほか○品」を出す
  const shown = k => by[k].length > per * MAXLINES ? per * MAXLINES - 1 : by[k].length;
  const lines = k => Math.max(1, Math.ceil((shown(k) + (by[k].length > shown(k) ? 1 : 0)) / per));
  const rowH = k => Math.max(112, lines(k) * (CELL + GAP) - GAP + 24);
  const HEAD = 118, FOOT = 96;
  const H = HEAD + Object.keys(by).reduce((s, k) => s + rowH(k) + 10, 0) + FOOT;
  const icons = new Map();
  await Promise.all(Object.values(by).flatMap(l => l.slice(0, per * MAXLINES)).map(async r => icons.set(r.it.id, await shIcon(r.it.iconLink))));

  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), F = (w, s) => `${w} ${s}px "BIZ UDPGothic","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif`;
  g.fillStyle = "#1E2528"; g.fillRect(0, 0, W, H);
  // 上：題・モード・時点
  g.fillStyle = "#C9A66B"; g.fillRect(0, HEAD - 4, W, 4);
  g.fillStyle = "#E3DDD0"; g.font = F("bold", 40); g.textBaseline = "alphabetic"; g.fillText(st("head"), PAD, 62);
  g.fillStyle = "#98A29F"; g.font = F("normal", 22);
  g.fillText(`${t("modes")[S.mode]}　${st("asOf", shWhen())}`, PAD, 96);
  g.textAlign = "right"; g.fillStyle = "#C9A66B"; g.font = F("bold", 26); g.fillText("EFT Workbench", W - PAD, 62); g.textAlign = "left";
  // 段
  let y = HEAD + 14;
  for(const k of Object.keys(by)){
    const h = rowH(k);
    g.fillStyle = SH_COLORS[k]; shRound(g, PAD, y, LAB, h, 6); g.fill();
    g.fillStyle = k === "D" ? "#E3DDD0" : "#1E2528"; g.textAlign = "center";
    g.font = F("bold", 44); g.fillText(k, PAD + LAB / 2, y + h / 2 + 4);
    const has = LOOT_CUT && LOOT_CUT[k] != null;
    g.font = F("normal", 15);
    g.fillText(has ? yen(LOOT_CUT[k]) : st("cutBelow"), PAD + LAB / 2, y + h / 2 + 28);
    g.fillText(st(has ? "cutOver" : "cutBelow2"), PAD + LAB / 2, y + h / 2 + 46); g.textAlign = "left";
    const x0 = PAD + LAB + 12;
    g.fillStyle = "#263034"; g.strokeStyle = "#3A474C"; shRound(g, x0, y, W - PAD - x0, h, 6); g.fill(); g.stroke();
    const list = by[k], n = shown(k);
    for(let i = 0; i < n; i++){
      const cx = x0 + 12 + (i % per) * (CELL + GAP), cy = y + 12 + Math.floor(i / per) * (CELL + GAP);
      g.fillStyle = "#1A2124"; g.fillRect(cx, cy, CELL, CELL);
      const im = icons.get(list[i].it.id);
      if(im){ const s = Math.min(CELL / im.width, CELL / im.height); g.drawImage(im, cx + (CELL - im.width * s) / 2, cy + (CELL - im.height * s) / 2, im.width * s, im.height * s); }
      else{ g.fillStyle = "#98A29F"; g.font = F("normal", 11); g.textAlign = "center"; shWrap(g, nm(list[i].it.shortName) || nm(list[i].it.name), cx + CELL / 2, cy + 26, CELL - 6, 13); g.textAlign = "left"; }
    }
    if(list.length > n){
      const i = n, cx = x0 + 12 + (i % per) * (CELL + GAP), cy = y + 12 + Math.floor(i / per) * (CELL + GAP);
      g.strokeStyle = "#3A474C"; g.strokeRect(cx + .5, cy + .5, CELL - 1, CELL - 1);
      g.fillStyle = "#98A29F"; g.font = F("bold", 12); g.textAlign = "center"; shWrap(g, st("more", {n: list.length - n}), cx + CELL / 2, cy + 28, CELL - 8, 15); g.textAlign = "left";
    }
    y += h + 10;
  }
  // 下：サイトと YouTube（文を消されても、ここに残る）
  g.fillStyle = "#263034"; g.fillRect(0, H - FOOT + 14, W, FOOT - 14);
  g.fillStyle = "#C9A66B"; g.font = F("bold", 24); g.fillText(SH_URL.replace(/^https:\/\//, ""), PAD, H - FOOT + 54);
  g.fillStyle = "#E3DDD0"; g.font = F("normal", 20); g.fillText("YouTube  " + SH_YT.replace(/^https:\/\/www\./, ""), PAD, H - FOOT + 84);
  return c;
}
function shRound(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function shWrap(g, text, x, y, w, lh){
  let line = "", n = 0;
  for(const ch of String(text)){ if(g.measureText(line + ch).width > w && line){ g.fillText(line, x, y + n * lh); line = ch; if(++n >= 3) return; } else line += ch; }
  if(line) g.fillText(line, x, y + n * lh);
}

/* ---- 共有の窓 ---- */
const shText = () => st("text", {mode: t("modes")[S.mode], ...shWhen(), url: SH_URL, yt: SH_YT});
const shName = () => `eft-loot-tier-${S.mode}-${DATA.at.toISOString().slice(0, 10)}.png`;
async function openShare(){
  const dlg = document.getElementById("shareDlg");
  dlg.innerHTML = `<div class="shbox" role="dialog" aria-modal="true" aria-label="${esc(st("title"))}"><h2>${esc(st("title"))}</h2><p class="note">${esc(st("making"))}</p></div>`;
  dlg.hidden = false;
  const canvas = await shDraw();
  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
  const file = new File([blob], shName(), {type: "image/png"}), url = URL.createObjectURL(blob), text = shText();
  const canFile = !!(navigator.canShare && navigator.canShare({files: [file]}));
  const x = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
  const line = "https://line.me/R/share?text=" + encodeURIComponent(text);
  dlg.innerHTML = `<div class="shbox" role="dialog" aria-modal="true" aria-label="${esc(st("title"))}">
    <h2>${esc(st("title"))}</h2>
    <img class="shimg" src="${url}" alt="${esc(st("head"))}">
    <textarea class="shtext" readonly rows="4">${esc(text)}</textarea>
    <div class="shbtns">
      ${canFile ? `<button type="button" class="shmain" data-sh="share">${esc(st("share"))}</button>` : ""}
      <a class="shbtn" href="${url}" download="${esc(shName())}" data-sh="save">${esc(st("save"))}</a>
      <a class="shbtn" href="${x}" target="_blank" rel="noopener" data-sh="x">${esc(st("x"))}</a>
      <a class="shbtn" href="${line}" target="_blank" rel="noopener" data-sh="line">${esc(st("line"))}</a>
      <button type="button" data-sh="copy">${esc(st("copy"))}</button>
      <button type="button" data-sh="close">${esc(st("close"))}</button>
    </div>
    <p class="note">${esc(st("hint"))}</p></div>`;
  dlg.onclick = async e => {
    const b = e.target.closest("[data-sh]");
    if(!b){ if(e.target === dlg) closeShare(); return; }
    const k = b.dataset.sh;
    if(k === "close"){ closeShare(); return; }
    if(k === "copy"){ if(await copyText(text)){ b.textContent = st("copied"); setTimeout(() => { b.textContent = st("copy"); }, 1200); } return; }
    if(k === "share"){ try{ await navigator.share({files: [file], text, title: st("head")}); }catch(err){} return; }
  };
  dlg.dataset.url = url;
  const first = dlg.querySelector("[data-sh]"); if(first) first.focus();
}
function closeShare(){
  const dlg = document.getElementById("shareDlg");
  if(dlg.dataset.url) URL.revokeObjectURL(dlg.dataset.url);
  dlg.hidden = true; dlg.innerHTML = ""; delete dlg.dataset.url;
  if($share) $share.focus();
}
if($share){
  $share.addEventListener("click", openShare);
  document.addEventListener("keydown", e => { if(e.key === "Escape" && !document.getElementById("shareDlg").hidden) closeShare(); });
}
