/* robots.txt と sitemap.xml を作る。載せるページは、build.mjs から渡された一覧（ツール・運営者情報など）だけ */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function buildSeo(pages){
  const day = new Date().toISOString().slice(0, 10);
  const url = f => `${SITE}/${f === "index.html" ? "" : f.replace(/\.html$/, "")}`;   // Cloudflare Pages は .html なしの形に転送するので、その形にそろえる
  // 日本語版と英語版があるページ（p.en）は、両方を載せて、互いを指し合う（hreflang）
  const entry = (loc, p) => `  <url><loc>${loc}</loc><lastmod>${day}</lastmod><priority>${p.priority}</priority>`
    + (p.en ? `\n    <xhtml:link rel="alternate" hreflang="ja" href="${url(p.file)}"/><xhtml:link rel="alternate" hreflang="en" href="${url(p.en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${url(p.file)}"/>\n  ` : "")
    + `</url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.flatMap(p => [entry(url(p.file), p), ...(p.en ? [entry(url(p.en), p)] : [])]).join("\n")}
</urlset>
`;
  writeFileSync(join(ROOT, "public", "sitemap.xml"), xml);
  writeFileSync(join(ROOT, "public", "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /data/\nDisallow: /icon/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`作成: public/sitemap.xml（${pages.reduce((n, p) => n + (p.en ? 2 : 1), 0)}ページ）・public/robots.txt`);
}
