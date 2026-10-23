/* サイトを作る（node build.mjs）。できあがりは public/ に入り、Cloudflare Pages がそのまま配信する。
   ・ツールのページ（index・flip・loot・watch・rat・settings）… site/tools.mjs（ラットスポットのデータと画像は site/rat.mjs）
   ・運営者情報・プライバシーポリシー・お問い合わせ・404 … site/info.mjs
   ・robots.txt と sitemap.xml                       … site/seo.mjs
   役割ごとにファイルを分けている。ここは順番に呼ぶだけ。直すのは src/ と site/ の中だけ（public/ は直接直さない） */
import { buildTools } from "./site/tools.mjs";
import { buildInfo } from "./site/info.mjs";
import { buildSeo } from "./site/seo.mjs";

const pages = [...buildTools(), ...buildInfo()];
buildSeo(pages);
