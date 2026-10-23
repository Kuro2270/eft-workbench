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
      img: { ja: copy(web(`map-${m.id}-ja.jpg`)), en: copy(web(`map-${m.id}-en.jpg`)) }
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
