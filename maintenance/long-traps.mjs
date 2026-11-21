/*
 * 長尺動画の「罠カード」を選ぶ。役割はこれだけ（build-long.mjs から使う。台本や画面は作らない）。
 *
 *   pickTraps(cards, avg)   … 勝率一覧のカード（data/ratings/<SET>_draft.json の cards）と、全体の勝率（overall_win_rate）から、
 *                             罠カードの配列を返す（引けた試合の勝率が低い順。条件に合うカードが無ければ、空の配列）
 *
 * 罠カードの条件（すべて満たすコモン・アンコモン。土地は除く）
 *   1. よく使われている … デッキに入れられた試合数（gp_games）が、同じレアリティのカードの真ん中（中央値）以上
 *   2. 引けた試合の勝率（gih）が、全体の勝率より TRAP_GAP（2ポイント）以上低い
 *   3. 引けた試合数（games）が MIN_GAMES 以上（数が少ないカードは、勝率がぶれるので選ばない）
 * 決まり
 *   ・枚数は決めない。条件に合ったカードだけを返す（多いときは、勝率の低い順に MAX 枚まで）。
 *     合うカードが無いセットでは、動画に罠カードの章を入れない（章を埋めるために、条件に合わないカードを出さない）
 *   ・これまでのセットで試すと、合うカードは1セットに 0〜4枚（よく使われるカードは、もともと勝率が低くなりにくい）
 */
export const TRAP_GAP = 0.02, MIN_GAMES = 2000, MAX = 3;

export function pickTraps(cards, avg){
  const out = [];
  for(const rar of ["common", "uncommon"]){
    const cs = (cards || []).filter(c => c.rarity === rar && !c.land && c.gp_games > 0 && c.gih != null);
    if(!cs.length) continue;
    const g = cs.map(c => c.gp_games).sort((a, b) => a - b), med = g[Math.floor(g.length / 2)];
    for(const c of cs) if(c.gp_games >= med && (c.games || 0) >= MIN_GAMES && c.gih <= avg - TRAP_GAP) out.push(c);
  }
  return out.sort((a, b) => a.gih - b.gih).slice(0, MAX);
}
