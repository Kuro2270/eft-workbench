/* robots.txt と sitemap.xml を作る。載せるページは、build.mjs から渡された一覧（ツール・運営者情報など）だけ */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function buildSeo(pages){
  const day = new Date().toISOString().slice(0, 10);
  const url = f => `${SITE}/${f === "index.html" ? "" : f.replace(/\.html$/, "")}`;   // Cloudflare Pages は .html なしの形に転送するので、その形にそろえる
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${url(p.file)}</loc><lastmod>${day}</lastmod><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`;
  writeFileSync(join(ROOT, "public", "sitemap.xml"), xml);
  writeFileSync(join(ROOT, "public", "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /data/\nDisallow: /icon/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`作成: public/sitemap.xml（${pages.length}ページ）・public/robots.txt`);
}
