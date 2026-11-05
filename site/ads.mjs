/* 広告（Google AdSense）。役割はこれだけ（2026年11月から）。
   ・adsHead()  … ページの <head> に入れる AdSense のコード（自動広告。どこに出すかは AdSense の管理画面で決める）
   ・buildAds() … public/ads.txt（広告の販売者を宣言するファイル）を作る
   サイト運営者 ID は site/config.mjs の ADSENSE_CLIENT。空にすると、コードも ads.txt も出さない */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADSENSE_CLIENT } from "./config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function adsHead(){
  return ADSENSE_CLIENT ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>` : "";
}

export function buildAds(){
  if(!ADSENSE_CLIENT) return;
  writeFileSync(join(ROOT, "public", "ads.txt"), `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
  console.log("作成: public/ads.txt");
}
