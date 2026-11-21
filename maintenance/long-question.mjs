/*
 * 長尺動画で、見ている人に1つだけ聞く「問いかけ」を選ぶ。役割はこれだけ（build-long.mjs から使う。画面や動きは作らない）。
 *
 *   pickQuestion({ EN, pairsD, cuTraps, worstD, avgD, pairName, pt })
 *     → { at, say, show, typed, comment } か、null（条件に合うものが無ければ、問いかけは入れない）
 *        at      … どの場面で聞くか（"tier"＝色の組み合わせ／"cutraps"＝罠カード／"worst"＝一番勝ちにくい組み合わせ）
 *        say     … 読み上げに足す文
 *        show    … 画面に出すコメント欄の見出し（短い問い）
 *        typed   … コメント欄に打ち込まれていく文（答えを決めつけない、書き出しの例）
 *        comment … 動画の説明欄と、固定コメントに書く問い
 *
 * 決まり
 *   ・1本の動画に1つだけ（何度も聞かない）。下の順に見て、最初に条件に合ったものを使う
 *       1. 色の組み合わせ … ドラフトの1位と2位の勝率の差が CLOSE（0.5ポイント）以内
 *       2. 罠カード       … 罠カード（long-traps.mjs）が1枚以上ある
 *       3. 一番勝ちにくい組み合わせ … その勝率が、全体の勝率より WEAK（2ポイント）以上低い
 *   ・データで決着がついていないこと・数字に異論がありそうなことだけを聞く。条件に合わないのに、聞くために話を作らない
 */
export const CLOSE = 0.005, WEAK = 0.02;

export function pickQuestion({ EN, pairsD, cuTraps, worstD, avgD, pairName, pt }){
  const L = (ja, en) => EN ? en : ja;
  const [a, b] = pairsD || [];
  if(a && b && a.wr - b.wr <= CLOSE){
    const A = pairName(a.pair), B = pairName(b.pair);
    return { at: "tier",
      say: L(`ちなみに、1位の${A}と2位の${B}は、勝率がほぼ同じです。使っていて強いと感じるのは、どちらですか。コメントで教えてください。`,
             `By the way, ${A} and ${B} are almost tied at the top. Which one feels stronger when you play? Tell us in the comments.`),
      show: L(`${A}と${B}、強いと感じるのは？`, `${A} or ${B}: which feels stronger?`),
      typed: L("わたしは◯◯派！理由は…", "I'm on team ... because ..."),
      comment: L(`${A}（${pt(a.wr)}%）と${B}（${pt(b.wr)}%）は、勝率がほぼ同じでした。使っていて強いと感じるのは、どちらですか？`,
                 `${A} (${pt(a.wr)}%) and ${B} (${pt(b.wr)}%) are almost tied. Which one feels stronger when you play?`) };
  }
  if(cuTraps && cuTraps.length){
    const n = cuTraps.length, names = cuTraps.map(c => c.label);
    return { at: "cutraps",
      say: L(`${n === 1 ? "このカード" : "この中のカード"}で勝てている方はいますか。うまい使い方があれば、コメントで教えてください。`,
             `Are you winning with ${n === 1 ? "this card" : "any of these"}? If you know how to make ${n === 1 ? "it" : "them"} work, tell us in the comments.`),
      show: L(`${n === 1 ? "このカード" : "この中のカード"}、うまく使えていますか？`, `Winning with ${n === 1 ? "this card" : "these cards"}?`),
      typed: L("こう使うと強いです…", "Here's how I use it..."),
      comment: L(`${names.join("、")}は、よく使われているのに、引けた試合の勝率が、全試合の平均勝率より低いカードでした。うまく使えている方、使い方を教えてください。`,
                 `${names.join(", ")} ${n === 1 ? "is" : "are"} played a lot but ${n === 1 ? "wins" : "win"} less when drawn than the average across all games. If you make ${n === 1 ? "it" : "them"} work, how do you use ${n === 1 ? "it" : "them"}?`) };
  }
  if(worstD && avgD != null && worstD.wr <= avgD - WEAK){
    const Wn = pairName(worstD.pair);
    return { at: "worst",
      say: L(`それでも${Wn}で勝っている方、コツがあれば、コメントで教えてください。`, `If you're still winning with ${Wn}, tell us your secret in the comments.`),
      show: L(`${Wn}で勝つコツは？`, `How do you win with ${Wn}?`),
      typed: L("コツは…", "The trick is..."),
      comment: L(`${Wn}は、勝率が一番低い組み合わせでした（${pt(worstD.wr)}%）。それでも${Wn}で勝っている方、コツを教えてください。`,
                 `${Wn} had the lowest win rate (${pt(worstD.wr)}%). If you're still winning with it, what's your secret?`) };
  }
  return null;
}
