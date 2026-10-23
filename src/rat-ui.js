/* ================= ラットスポット（rat.html） =================
   マップを選ぶと、見取り図の上に番号つきのネズミの印（待つ位置）と、その下にスポットの一覧を出す。
   印は、見取り図の脱出口などの丸い印と見分けがつくよう、ネズミの形・ほかに無い色のグラデーション・ゆっくり光る輪にしている。
   見取り図を押すと、大きな画像を別のタブで開く（スマートフォンで拡大して見られるように）。印を押すと、そのスポットへ移る
   一覧の1件：名前・評価（●の数）・行き方・待つ位置から見える景色・ショート動画
   動画は、押すまで読み込まない（サムネイルだけ。押したら YouTube の再生画面に差し替える）
   データは site/rat.mjs がサイトを作るときに埋め込む（RAT_DATA）。価格データは使わない */
const RAT = /*@@RAT_DATA@@*/null;

/* ネズミの形（横向き。右が鼻先） */
const RAT_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7.5 20.5C3.5 21 1.8 23.6 3 26.2c1 2 3.8 2.2 6 1" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="14" cy="19.5" rx="8" ry="5.6" fill="#fff"/><path d="M18.5 14.6c4.3.2 8.3 2.4 10.4 5.6-2.6 1.9-6.4 2.6-10.4 1.9z" fill="#fff"/><circle cx="19.5" cy="14" r="3.2" fill="#fff"/><circle cx="19.5" cy="14" r="1.6" fill="#F7A8D8"/><circle cx="23.6" cy="18.2" r="1.1" fill="#3A1250"/><circle cx="29" cy="20.1" r="1.1" fill="#F7A8D8"/><path d="M10 24.6l-.8 2.4M16.5 24.6l.6 2.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;
function ytId(url){
  const m = String(url || "").match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
  return m ? m[1] : "";
}
function paintRat(){
  const box = document.getElementById("ratPanel");
  if(!box || box.hidden || !RAT || !RAT.maps.length) return;
  const ja = S.lang === "ja", nmOf = o => (ja ? o.ja : o.en) || o.en || o.ja;
  const map = RAT.maps.find(m => m.id === S.ratMap) || RAT.maps[0];
  const spots = RAT.spots.filter(s => s.map === map.id);
  const tabs = `<div class="tabs" role="tablist">${RAT.maps.map(m => `<button role="tab" data-ratmap="${m.id}" aria-selected="${m.id === map.id}">${esc(nmOf(m))}</button>`).join("")}</div>`;
  const pins = spots.map((s, i) => `<a class="ratpin" href="#rat-${s.id}" style="left:${s.pos[0]}%;top:${s.pos[1]}%" title="${esc(nmOf(s))}" aria-label="${i + 1}. ${esc(nmOf(s))}">${RAT_ICON}<b>${i + 1}</b></a>`).join("");
  const dots = n => `<span class="ratdots" aria-label="${n}/5">${"●".repeat(n)}<i>${"●".repeat(5 - n)}</i></span>`;
  const cards = spots.map((s, i) => {
    const id = ytId(s.short);
    const video = id && s.thumb
      ? `<button type="button" class="ratvideo" data-yt="${id}" aria-label="${esc(t("ratPlay"))}"><img src="${s.thumb}" alt="" loading="lazy" width="540" height="960"><span class="play" aria-hidden="true"></span></button>` : "";
    const rate = Object.entries(RAT.ratings).map(([k, v]) => `<tr><th>${esc(nmOf(v))}</th><td>${dots(s.ratings[k] || 0)}</td></tr>`).join("");
    const route = (ja ? s.route.ja : s.route.en) || [];
    return `<article class="ratcard" id="rat-${s.id}">
      ${video ? `<div class="ratmedia">${video}</div>` : ""}
      <div class="ratbody">
        <h2><span class="ratno">${i + 1}</span>${esc(nmOf(s))}${ja ? `<small>${esc(s.en)}</small>` : ""}</h2>
        <table class="ratrate">${rate}</table>
        <h3>${esc(t("ratRoute"))}</h3>
        <ol class="ratroute">${route.map(r => `<li>${esc(r)}</li>`).join("")}</ol>
        ${s.view ? `<h3>${esc(t("ratView"))}</h3><img class="ratview" src="${s.view}" alt="" loading="lazy" width="960" height="544">` : ""}
      </div>
    </article>`;
  }).join("");
  box.innerHTML = `${tabs}
    <figure class="ratmap"><a class="full" href="${ja ? map.img.ja : map.img.en}" target="_blank" rel="noopener"><img src="${ja ? map.img.ja : map.img.en}" alt="${esc(nmOf(map))}" width="1600" height="1227"></a>${pins}</figure>
    <div class="ratlist">${cards}</div>`;
}
document.getElementById("ratPanel").addEventListener("click", e => {
  const tab = e.target.closest("button[data-ratmap]");
  if(tab){ S.ratMap = tab.dataset.ratmap; saveSettings(); paintRat(); return; }
  const v = e.target.closest("button[data-yt]");
  if(v){
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
    f.title = "YouTube"; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true;
    v.replaceWith(f);
  }
});
