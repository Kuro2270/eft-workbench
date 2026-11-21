/*
 * 長尺動画の YouTube 用サムネイル（1920×1080）を作る。役割はこれだけ（build-long.mjs から使う。解説動画の build-guide.mjs も同じ形で使う）。
 *
 *   上の3分の1：MTGアリーナのロゴ・セットのロゴと、「リミテッド環境分析」の帯（テレビの一覧でも、何の動画か分かるように）
 *   下の3分の2：左にキャラクターとボムのカード、右に大きな見出し（例「最強は白青」）と一言（例「40万試合で勝率57.9%」）
 *   （2026年10月：YouTube のサムネイル作りの考え方「左に人物・右に文字」「数字は動画で言っているものだけ」に合わせて作り直した）
 *
 *   await makeLongThumbnail({ out, sharp, font, bg, arenaLogo, setLogo, setName, label, kicker, main, sub, cards, character, en })
 *     bg        … 背景の絵（ファイル。無ければ紺色）
 *     arenaLogo / setLogo … ロゴの画像（ファイル。無ければ setName を文字で出す。解説動画は setName に「初心者向け」などを入れる）
 *     cards     … カード画像（data URI）を最大3枚
 *     character … キャラクターの画像（ファイル。透明な背景の PNG）
 *
 *   await makeLogoThumbnail({ out, sharp, font, bg, arenaLogo, setLogo, setName, title, pill, accent, accent2, cards, character, en })
 *     セットのロゴを大きく出す形（長尺の環境まとめ用。2026年11月：YouTube の AB テストで、上の形よりこちらのほうが選ばれた）。
 *     左上：MTGアリーナのロゴとセットのロゴ（大きく）／左下：title（2行。例 ["リミテッド","完全ガイド"]）と pill（例「ドラフト＋シールド環境」）
 *     右下：カード3枚を少し傾けて並べる／右上：目を引く一言 accent（例「最強は白青」）と、あれば2行目 accent2（例「狙い目は黒緑」）
 */
import { readFile } from "node:fs/promises";

const W = 1920, H = 1080, TOP = Math.round(H / 3);
const esc = s => String(s ?? "").replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const dataUri = async f => { try{ const b = await readFile(f); return `data:image/${/\.jpe?g$/i.test(f) ? "jpeg" : "png"};base64,${b.toString("base64")}`; }catch(e){ return null; } };

export async function makeLongThumbnail(o){
  const { sharp, font, en } = o;
  const wide = en ? 0.56 : 1;                                   // 英語は1文字の幅がおよそ半分
  const fit = (t, maxW, max) => Math.min(max, Math.floor(maxW / (Math.max([...String(t)].length, 1) * wide)));
  const stroke = s => `stroke="#06101C" stroke-width="${Math.round(s * 0.16)}" stroke-linejoin="round" paint-order="stroke"`;
  const [arena, logo, chara] = await Promise.all([dataUri(o.arenaLogo), dataUri(o.setLogo), dataUri(o.character)]);

  // 背景：絵は下の段（下の3分の2）の大きさに合わせて入れ、少しだけぼかして暗くする（文字とカードを主役にしつつ、セットの絵だと分かるように）。
  //   上の段は暗い地のまま（絵を全面に敷くと、上の段に隠れて絵の上のほうが見えないため）
  let back = await sharp({ create: { width: W, height: H, channels: 3, background: "#07111F" } }).png().toBuffer();
  if(o.bg){
    // 絵の上のほう（人物の顔があることが多い）を残し、下を切る（north）。ぼかしは軽くして、どのセットの絵か分かるようにする（2026年10月：強くぼかすと何の絵か分からなかった）。文字の読みやすさは右側の暗いグラデーションで保つ
    const art = await sharp(o.bg).resize(W, H - TOP, { fit: "cover", position: "north" }).blur(1.5).modulate({ brightness: 0.85, saturation: 1.1 }).toBuffer();
    back = await sharp(back).composite([{ input: art, left: 0, top: TOP }]).png().toBuffer();
  }

  // 上の段：ロゴ（左）と帯（右）
  //   帯は右端から少し内側（BAND_R）に置く。ロゴと帯の間が空きすぎないように
  const label = o.label, bandSize = fit(label, 1000, 112), bandW = Math.round([...label].length * bandSize * wide + 90), BAND_R = W - 150, bandH = Math.round(bandSize * 1.5);
  const top = `<rect x="0" y="0" width="${W}" height="${TOP}" fill="url(#t)"/>
    <line x1="50" x2="${W - 50}" y1="${TOP}" y2="${TOP}" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2"/>
    ${arena ? `<image href="${arena}" x="46" y="16" width="430" height="150" preserveAspectRatio="xMinYMid meet"/>` : ""}
    ${logo ? `<image href="${logo}" x="50" y="${arena ? 160 : 60}" width="620" height="${arena ? 188 : 260}" preserveAspectRatio="xMinYMid meet"/>`
           : `<text x="60" y="${arena ? 300 : 230}" font-size="${fit(o.setName, 700, 110)}" font-weight="900" fill="#FFFFFF" font-family="${font}" ${stroke(110)}>${esc(o.setName)}</text>`}
    <rect x="${BAND_R - bandW}" y="${(TOP - bandH) / 2}" width="${bandW}" height="${bandH}" rx="24" fill="#D9412B" stroke="#FFFFFF" stroke-width="7"/>
    <text x="${BAND_R - bandW / 2}" y="${TOP / 2 + bandSize * 0.36}" font-size="${bandSize}" font-weight="900" fill="#FFFFFF" text-anchor="middle" font-family="${font}">${esc(label)}</text>`;

  // 下の段：カード（キャラクターの右下に、少し扇形に並べる。背景の絵の人物の顔を隠さないよう、下寄りに）
  const cards = (o.cards || []).filter(Boolean).slice(0, 3);
  const CW = 230, CH = Math.round(CW * 680 / 488), angle = [-10, 0, 10], cx0 = 470;
  const cardSvg = cards.map((src, i) => {
    const x = cx0 + i * 115, y = TOP + 370 + (i === 1 ? -12 : 14);   // 背景の絵の人物の顔（上のほう）を隠さないよう、下寄りに置く
    return `<g transform="rotate(${angle[i] || 0} ${x + CW / 2} ${y + CH / 2})"><rect x="${x + 6}" y="${y + 10}" width="${CW}" height="${CH}" rx="12" fill="#000" opacity="0.45"/>` +
           `<image href="${src}" x="${x}" y="${y}" width="${CW}" height="${CH}" preserveAspectRatio="xMidYMid slice"/></g>`;
  }).join("");

  // 下の段：見出し（右寄せ）。スマホの一覧でも読めるよう、見出しは画面の横幅の半分以上を使う（約1150px＝60%）。
  //   右下は YouTube の再生時間の表示が重なるので、文字は下から 150px より上に収める
  //   kicker（あれば）：見出しの上の小さな一言（英語は「Best pair」と色の名前を2行に分けて、色の名前を大きく出す）
  const TEXT_W = 1150, RIGHT = W - 50, BOTTOM_SAFE = H - 150;
  const mainSize = fit(o.main, TEXT_W, 250), subSize = fit(o.sub, TEXT_W - 40, 104), kSize = o.kicker ? fit(o.kicker, TEXT_W, 96) : 0;
  // 全角の「！」は右側に空きがあるので、その分だけ見出しを右にずらして、下の行と右端をそろえる
  const bangGap = /！$/.test(o.main) ? Math.round(mainSize * 0.38) : 0;
  const subY = BOTTOM_SAFE - 70, mainY = subY - subSize - 46, kY = mainY - mainSize - 6;   // 下の段の真ん中あたりに置く
  const right = `<rect x="${W - TEXT_W - 160}" y="${TOP}" width="${TEXT_W + 160}" height="${H - TOP}" fill="url(#r)"/>
    ${o.kicker ? `<text x="${RIGHT - 4}" y="${kY}" font-size="${kSize}" font-weight="900" fill="#FFFFFF" text-anchor="end" font-family="${font}" ${stroke(kSize)}>${esc(o.kicker)}</text>` : ""}
    <text x="${RIGHT + bangGap}" y="${mainY}" font-size="${mainSize}" font-weight="900" fill="#FFD23F" text-anchor="end" font-family="${font}" ${stroke(mainSize)}>${esc(o.main)}</text>
    <text x="${RIGHT - 6}" y="${subY}" font-size="${subSize}" font-weight="900" fill="#FFFFFF" text-anchor="end" font-family="${font}" ${stroke(subSize)}>${esc(o.sub)}</text>`;

  // キャラクター：左下に大きく（素材の縦横比のまま、下の段の高さに合わせる）
  let charSvg = "";
  if(chara){
    const meta = await sharp(o.character).metadata(), ch = H - TOP - 60, cw = Math.round(ch * meta.width / meta.height);
    charSvg = `<image href="${chara}" x="0" y="${H - ch}" width="${cw}" height="${ch}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050B14" stop-opacity="0.95"/><stop offset="1" stop-color="#050B14" stop-opacity="0.78"/></linearGradient>
      <linearGradient id="r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#050B14" stop-opacity="0.72"/><stop offset="0.7" stop-color="#050B14" stop-opacity="0.5"/><stop offset="1" stop-color="#050B14" stop-opacity="0"/></linearGradient></defs>
    ${cardSvg}${right}${charSvg}${top}
  </svg>`;
  await sharp(back).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 90 }).toFile(o.out);
}

export async function makeLogoThumbnail(o){
  const { sharp, font, en } = o;
  const wide = en ? 0.56 : 1;
  const fit = (t, maxW, max) => Math.min(max, Math.floor(maxW / (Math.max([...String(t)].length, 1) * wide)));
  const stroke = s => `stroke="#06101C" stroke-width="${Math.round(s * 0.16)}" stroke-linejoin="round" paint-order="stroke"`;
  const [arena, logo, chara] = await Promise.all([dataUri(o.arenaLogo), dataUri(o.setLogo), dataUri(o.character)]);

  // 背景：セットの絵を全面に（軽くぼかして暗く）。左は文字が読めるよう、暗いグラデーションを重ねる
  let back = await sharp({ create: { width: W, height: H, channels: 3, background: "#07111F" } }).png().toBuffer();
  if(o.bg){
    const art = await sharp(o.bg).resize(W, H, { fit: "cover", position: "north" }).blur(2).modulate({ brightness: 0.8, saturation: 1.1 }).toBuffer();
    back = await sharp(back).composite([{ input: art, left: 0, top: 0 }]).png().toBuffer();
  }

  // 左：ロゴと題
  const [t1, t2] = o.title || [], tSize = fit((t1 || "").length >= (t2 || "").length ? t1 : t2, 760, 130);
  const pillSize = fit(o.pill || "", 620, 56), pillW = Math.round([...(o.pill || "")].length * pillSize * wide + 90);
  const left = `${arena ? `<image href="${arena}" x="82" y="14" width="400" height="140" preserveAspectRatio="xMinYMid meet"/>` : ""}
    ${logo ? `<image href="${logo}" x="82" y="152" width="1060" height="248" preserveAspectRatio="xMinYMid meet"/>`
           : `<text x="90" y="340" font-size="${fit(o.setName, 1050, 180)}" font-weight="900" fill="#FFD23F" font-family="${font}" ${stroke(160)}>${esc(o.setName)}</text>`}
    <text x="90" y="590" font-size="${tSize}" font-weight="900" fill="#FFFFFF" font-family="${font}" ${stroke(tSize)}>${esc(t1 || "")}</text>
    <text x="90" y="${590 + Math.round(tSize * 1.07)}" font-size="${tSize}" font-weight="900" fill="#FFFFFF" font-family="${font}" ${stroke(tSize)}>${esc(t2 || "")}</text>
    ${o.pill ? `<rect x="90" y="764" width="${pillW}" height="100" rx="50" fill="#2F7DF6" stroke="#FFFFFF" stroke-width="6"/>
    <text x="${90 + pillW / 2}" y="${814 + pillSize * 0.36}" font-size="${pillSize}" font-weight="900" fill="#06101C" text-anchor="middle" font-family="${font}">${esc(o.pill)}</text>` : ""}`;

  // 右下：カード3枚
  const cards = (o.cards || []).filter(Boolean).slice(0, 3);
  const CW = 350, CH = 488, step = 320, cx0 = W - 80 - (CW + step * (Math.max(cards.length, 1) - 1));
  const cardSvg = cards.map((src, i) => {
    const x = cx0 + i * step, y = 440 + (i === 1 ? -26 : 0), rot = (i - (cards.length - 1) / 2) * 4;
    return `<g transform="rotate(${rot} ${x + CW / 2} ${y + CH / 2})"><rect x="${x + 8}" y="${y + 12}" width="${CW}" height="${CH}" rx="18" fill="#000" opacity="0.45"/>` +
           `<image href="${src}" x="${x}" y="${y}" width="${CW}" height="${CH}" preserveAspectRatio="xMidYMid slice"/></g>`;
  }).join("");

  // 右上：目を引く一言（少し傾けた赤い札に、黄色の大きな字。2行目があれば、その下に白い字で）
  let accent = "";
  if(o.accent){
    const AW = 640, aSize = fit(o.accent, AW - 70, 124), bSize = o.accent2 ? fit(o.accent2, AW - 90, 76) : 0;
    const AH = Math.round(aSize * 1.42 + (o.accent2 ? bSize * 1.4 : 0) + 28), ax = W - 70 - AW, ay = 46;
    accent = `<g transform="rotate(-4 ${ax + AW / 2} ${ay + AH / 2})">
      <rect x="${ax + 8}" y="${ay + 12}" width="${AW}" height="${AH}" rx="28" fill="#000" opacity="0.45"/>
      <rect x="${ax}" y="${ay}" width="${AW}" height="${AH}" rx="28" fill="#D9412B" stroke="#FFFFFF" stroke-width="8"/>
      <text x="${ax + AW / 2}" y="${ay + 22 + aSize}" font-size="${aSize}" font-weight="900" fill="#FFD23F" text-anchor="middle" font-family="${font}" ${stroke(aSize)}>${esc(o.accent)}</text>
      ${o.accent2 ? `<text x="${ax + AW / 2}" y="${ay + 22 + aSize * 1.3 + bSize}" font-size="${bSize}" font-weight="900" fill="#FFFFFF" text-anchor="middle" font-family="${font}" ${stroke(bSize)}>${esc(o.accent2)}</text>` : ""}
    </g>`;
  }

  // キャラクター：右下のすみに小さく（カードの手前。YouTube の再生時間の表示と重なる位置なので、顔は上のほうに来る大きさに）
  let charSvg = "";
  if(chara){
    const meta = await sharp(o.character).metadata(), ch = 330, cw = Math.round(ch * meta.width / meta.height);
    charSvg = `<image href="${chara}" x="${W - cw - 6}" y="${H - ch}" width="${cw}" height="${ch}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050B14" stop-opacity="0.93"/><stop offset="0.62" stop-color="#050B14" stop-opacity="0.8"/><stop offset="1" stop-color="#050B14" stop-opacity="0.25"/></linearGradient></defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#gl)"/>
    ${left}${cardSvg}${accent}${charSvg}
  </svg>`;
  await sharp(back).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 90 }).toFile(o.out);
}
