/* ラットスポットのページ（rat.html）に出すデータと画像を用意する。役割はこれだけ（画面は src/rat-ui.js）。
   ・データの元は rat/data/（maps.json・spots.json。動画を作るときと同じもの）
   ・画像の元は rat/assets/web/（rat/site_images.py が Web 用の大きさにしたもの）。public/rat/ に写す
   ・載せるのは、台本（rat/data/scripts/<スポット>.json）があるスポットだけ。長尺動画はできあがるまで載せない */
import { readFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAT = join(ROOT, "rat");
const read = f => JSON.parse(readFileSync(join(RAT, "data", f), "utf8"));
/* JPEG の幅と高さ（見取り図の縦横の比を画面に渡すため。マップによって縦長・横長がちがう） */
function jpegSize(file){
  const b = readFileSync(file);
  for(let i = 2; i + 9 < b.length; ){
    if(b[i] !== 0xFF){ i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return null;
}

export function ratData(){
  const { maps } = read("maps.json"), { spots, rating_keys } = read("spots.json");
  const web = f => existsSync(join(RAT, "assets", "web", f)) ? f : null;
  mkdirSync(join(ROOT, "public", "rat"), { recursive: true });
  const copy = f => { if(f) copyFileSync(join(RAT, "assets", "web", f), join(ROOT, "public", "rat", f)); return f ? `rat/${f}` : null; };
  const list = spots.filter(s => existsSync(join(RAT, "data", "scripts", `${s.id}.json`)));
  const out = {
    ratings: Object.fromEntries(Object.entries(rating_keys).map(([k, v]) => [k, { ja: v.ja, en: v.en }])),
    maps: maps.filter(m => list.some(s => s.map === m.id)).map(m => ({
      id: m.id, ja: m.name_ja, en: m.name_en,
      img: { ja: copy(web(`map-${m.id}-ja.jpg`)), en: copy(web(`map-${m.id}-en.jpg`)) },
      size: web(`map-${m.id}-en.jpg`) ? jpegSize(join(RAT, "assets", "web", `map-${m.id}-en.jpg`)) : null
    })),
    spots: list.map(s => ({
      id: s.id, map: s.map, ja: s.name_ja, en: s.name_en, pos: s.pos_pct, ratings: s.ratings,
      route: { ja: s.route_ja, en: s.route_en },
      view: copy(web(`${s.id}-view.jpg`)), thumb: copy(web(`${s.id}-thumb.jpg`)),
      short: (s.videos && s.videos.short) || ""
    }))
  };
  console.log(`ラットスポット: ${out.maps.length}マップ・${out.spots.length}か所（画像は public/rat/）`);
  return out;
}
