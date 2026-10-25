/* 「このサイトについて」と「よくある質問」の文面と中身（日本語・英語）。役割はこれだけ（ページの枠・書き出しは site/info.mjs）。
   ツールの名前は、ツールのページ（src/app.html）の言語ごとの名前と同じにする。
   運営者情報・データの出どころは、ここには書かない（プライバシーポリシーの1か所だけ。ここからはリンクで案内する） */

/* できること。[ページ, 名前, ひと言, 要点…] */
const TOOLS = {
  ja: [
    ["flip.html", "転売ボード", "フリマとトレーダーの値段の差で、利益が出る品を一覧にします。",
      ["フリマで買ってトレーダーに売る・トレーダーで買ってフリマで売る・交換で手に入れてフリマで売る、の3つ", "手数料・購入上限・ロイヤリティレベルを計算に入れる", "上位の品は過去の値動きから「利益が出た割合」と「売れやすさ」も出す"]],
    ["loot.html", "持ち帰りティア表", "レイドで拾った品を、1マスあたりの売値で S〜D の段に分けます。",
      ["トレーダーとフリマ（手数料を引いた手取り）の高いほうで計算", "弾薬箱は、開けて中身を売ったほうが高ければその値段で見る", "分類や出品数で絞り込める", "ティア表を画像にして、LINE・X などで共有できる"]],
    ["watch.html", "売り時・買い時", "いまの値段が過去の底値付近の品（買い場）と、高値付近の品（売り場）を並べます。",
      ["おすすめの買値・売値と、値動き・移動平均のグラフ", "仕込んだ品を「在庫」に記録して、売り時を見張れる"]],
    ["rat.html", "ラットスポット", "待ち伏せ（ラット）で勝てる場所を、マップごとに紹介します。",
      ["見取り図の位置・行き方・見える景色", "見晴らし・聞き取りやすさ・Scav回避・行きやすさの評価", "実際のキル動画つき"]],
    ["settings.html", "プレイヤー設定", "プレイヤーレベル・トレーダーのロイヤリティレベル・インテルセンターなどを入れておく場所です。",
      ["すべてのツールで共通", "手数料や、買える品・フリマで売れる品の判定に使う"]]
  ],
  en: [
    ["flip.html", "Flip board", "Lists items you can profit from, using the price gap between the flea market and traders.",
      ["Three ways: buy on flea and sell to traders, buy from traders and sell on flea, barter at traders and sell on flea", "Fees, buy limits and loyalty levels are included", "For the top items, past prices show the profitable share and how easily they sell"]],
    ["loot.html", "Loot tier list", "Sorts what you find in raid into tiers S to D by value per slot.",
      ["Uses the better of the trader price and the flea take-home (after fees)", "Ammo boxes are valued by their contents when that pays more", "Filter by category and number of offers", "Turn the tier list into an image to share on LINE, X and more"]],
    ["watch.html", "Buy & sell signals", "Ranks items priced near their past low (buy zone) and near their past high (sell zone).",
      ["Suggested buy and sell prices, with a price and moving-average chart", "Record what you bought as stock and watch for the moment to sell"]],
    ["rat.html", "Rat spots", "Ambush (rat) spots that win fights, map by map.",
      ["Position on the map, route and the view from the spot", "Ratings for view, sound, Scav safety and how easy it is to reach", "Real kill videos"]],
    ["settings.html", "Player settings", "Where you enter your player level, trader loyalty levels, Intelligence Center and more.",
      ["Shared by every tool", "Used for fees and for what you can buy or sell on the flea"]]
  ]
};

/* よくある質問。[見出し, [[問い, 答え（HTML）], …]]。検索向けの FAQ のデータ（JSON-LD）も同じものから作る */
const FAQ = {
  ja: [
    ["全般", [
      ["無料ですか？登録は必要ですか？", "すべて無料で、アカウントの登録もいりません。ブラウザで開くだけで使えます。"],
      ["スマートフォンでも使えますか？", "使えます。表が横に長いページは、横にスクロールして見てください。"],
      ["値段はいつの時点のものですか？", "各ツールの題の横に「○時○分 時点の価格」と出ています。価格はおよそ1時間ごとに新しくなり、ページを開いたままでも、新しい価格が出ると自動で差し替わります。"],
      ["PvP と PvE で値段は違いますか？", "違います。左上の切り替えで「PvP（通常）」「PvP シーズナル」「PvE」を選ぶと、そのモードの相場で計算し直します。"],
      ["設定や在庫は保存されますか？", "お使いのブラウザに保存され、次に開いたときもそのまま使えます。別の端末やブラウザには引き継がれません。"],
      ["英語でも使えますか？", "ツールのページは、右上で日本語と英語を切り替えられます。"]
    ]],
    ["転売ボード", [
      ["最初に何を設定すればよいですか？", "<a href=\"settings.html\">プレイヤー設定</a>で、プレイヤーレベル・トレーダーのロイヤリティレベル・インテルセンターのレベルを入れてください。買える品や手数料が、自分の状況に合わせて計算されます。"],
      ["表の「利益／個」のとおりに儲からないのはなぜですか？", "一番安い出品は、ほかの人にすぐ買われることがあります。出品数が少ない品や値動きの大きい品ほど、表の値段で買えない・売れないことが増えます。「利益が出た割合」と「売れやすさ」もあわせて見てください。"],
      ["「利益が出た割合」と「期待利益」は何ですか？", "上位の品について、選んだ期間の値動きを調べた結果です。「利益が出た割合」は、その期間のうち最低利益以上が出ていた時間の割合、「期待利益」は、その割合と利益が出たときの平均の利益をかけた目安です。"],
      ["トレーダーで買ってフリマで売るとき、気をつけることは？", "フリマで売るにはプレイヤーレベルの条件があります。また、フリマが「レイド中に見つけた品（FIR）」しか出品できない設定のときは、トレーダーで買った品は出品できないことがあり、そのときは表の上にお知らせが出ます。"]
    ]],
    ["持ち帰りティア表", [
      ["段位（S〜D）はどう決めていますか？", "1マスあたりの売値（トレーダーとフリマの手取りの高いほう）で並べて、段に分けています。大きくて安い品より、小さくて高い品が上になります。"],
      ["ティア表に出ない品があるのはなぜですか？", "分類のチェックを外した品と、フリマの出品数が少なすぎる品は外しています。条件はページの上で変えられます。"],
      ["ティア表を友達に共有できますか？", "ページの上の「画像で共有」を押すと、いま出ているティア表が1枚の画像になります。スマホは「共有する」から LINE・X などに画像ごと送れます。パソコンでは「X に投稿」「LINE で送る」を押すと画像がコピーされるので、開いた投稿欄に貼り付けてください。"]
    ]],
    ["売り時・買い時", [
      ["「買い場」「売り場」とは何ですか？", "いまの値段が、選んだ期間（7日・14日・30日）の値動きの中で底値に近い品が「買い場」、高値に近い品が「売り場」です。品を選ぶと、値動きと移動平均のグラフ、おすすめの買値・売値が出ます。"],
      ["「在庫」は何に使いますか？", "買い場の品の「仕込んだ」を押して数量と買値を記録すると、在庫の欄に、いま売ったときの損益と、売り時になったかどうかが出ます。記録はモードごとに分かれ、お使いのブラウザにだけ保存されます。"]
    ]],
    ["ラットスポット", [
      ["評価の4つの項目は何ですか？", "見晴らし（待つ位置から見える範囲）、聞き取りやすさ（近づく足音の聞こえやすさ）、Scav回避（Scav に見つかりにくいか）、行きやすさ（迷わず安全に着けるか）を、それぞれ5段階で付けています。"],
      ["スポットは増えますか？", "マップごとに少しずつ増やしていきます。動画は YouTube のチャンネル「Rat of Tarkov」でも公開しています。"]
    ]],
    ["その他", [
      ["不具合を見つけました・要望があります", "<a href=\"contact.html\">お問い合わせ</a>からお知らせください。どのページで、何をしたときに起きたかを書いていただけると助かります。"]
    ]]
  ],
  en: [
    ["General", [
      ["Is it free? Do I need an account?", "Everything is free and there is no sign-up. Just open it in your browser."],
      ["Does it work on a phone?", "Yes. On pages with wide tables, scroll sideways to see every column."],
      ["How fresh are the prices?", "Each tool shows “Prices as of …” next to its title. Prices refresh about once an hour, and an open page swaps in the new prices on its own."],
      ["Are PvP and PvE prices different?", "Yes. Use the switch at the top left to pick PvP (regular), PvP seasonal or PvE, and everything is recalculated for that mode."],
      ["Are my settings and stock saved?", "They are saved in your browser, so they are still there next time. They do not carry over to other devices or browsers."],
      ["Can I use it in Japanese?", "Yes. The tool pages switch between English and Japanese at the top right."]
    ]],
    ["Flip board", [
      ["What should I set up first?", "In <a href=\"settings.html\">Player settings</a>, enter your player level, trader loyalty levels and Intelligence Center level. Fees and what you can buy are then calculated for your situation."],
      ["Why don’t I make the “Profit / item” shown?", "The cheapest offer is often bought by someone else first. Items with few offers or big price swings are harder to buy or sell at the listed price. Check the profitable share and sellability as well."],
      ["What are “Profitable share” and “Expected profit”?", "They come from the price history of the top items over the period you choose. Profitable share is how much of that time the trade cleared your minimum profit. Expected profit is that share multiplied by the average profit when it did."],
      ["Anything to watch when buying from traders to sell on the flea?", "Selling on the flea needs a minimum player level. And when the flea only accepts found-in-raid (FIR) items, items bought from traders may not be listable; a notice appears above the table when that is the case."]
    ]],
    ["Loot tier list", [
      ["How are the tiers (S to D) decided?", "Items are ranked by value per slot (the better of the trader price and the flea take-home) and split into tiers. Small, valuable items rank above big, cheap ones."],
      ["Why are some items missing?", "Categories you untick and items with too few flea offers are left out. You can change both at the top of the page."],
      ["Can I share the tier list with friends?", "Press “Share as image” at the top of the page to turn the current tier list into one image. On a phone, “Share” sends it straight to LINE, X and other apps. On a computer, “Post on X” and “Send on LINE” copy the image first, so paste it into the post box that opens."]
    ]],
    ["Buy & sell signals", [
      ["What are the buy zone and sell zone?", "Items whose current price sits near the low of the period you choose (7, 14 or 30 days) are in the buy zone, and items near the high are in the sell zone. Select an item to see its price and moving-average chart with suggested buy and sell prices."],
      ["What is “Stock” for?", "Press “Bought” on a buy-zone item and enter the quantity and cost. The stock list then shows your profit or loss if you sold now, and whether it is time to sell. Stock is kept per mode, in your browser only."]
    ]],
    ["Rat spots", [
      ["What do the four ratings mean?", "View (how much you can see from the spot), Sound (how easily you hear footsteps coming), Scav-safe (how unlikely Scavs are to find you) and Easy to reach (how safely you get there). Each is rated from 1 to 5."],
      ["Will more spots be added?", "Yes, a few at a time for each map. The videos are also on the YouTube channel “Rat of Tarkov”."]
    ]],
    ["Other", [
      ["I found a bug or have a request", "Please tell us through the <a href=\"contact.en.html\">contact form</a>. Mentioning which page and what you did helps a lot."]
    ]]
  ]
};

/* 2つのページの文面（題・説明・本文の見出しなど） */
const TEXT = {
  ja: {
    about: { title: "このサイトについて",
      desc: "EFT Workbench は、Escape from Tarkov（タルコフ）のフリマ相場をもとに、何を買って・売って・持ち帰るかを決めるための無料ツール集です。できることと使い方をまとめています。",
      lead: "EFT Workbench は、Escape from Tarkov（タルコフ）のフリマ相場をもとに、<b>何を買って・何を売って・何を持ち帰るか</b>を決めるための無料ツール集です。待ち伏せで勝てるラットスポットも紹介しています。",
      purposeH: "このサイトの目的",
      purpose: "フリマとトレーダーの値段は、時間とともに動きます。手数料や購入上限、ロイヤリティレベルまで考えて損得を計算するのは、ゲームの合間には大変です。このサイトは、その計算をまとめて引き受け、<b>開いてすぐ判断できる一覧</b>にすることを目指しています。すべて無料で、登録もいりません。",
      toolsH: "できること", stepsH: "使い方",
      steps: [["自分の状況を入れる", "<a href=\"settings.html\">プレイヤー設定</a>で、レベル・ロイヤリティレベル・インテルセンターを入れます（一度だけ）。"],
              ["モードを選ぶ", "左上で PvP（通常）・PvP シーズナル・PvE を選びます。"],
              ["ツールを開く", "稼ぎたいときは転売ボード、レイド中は持ち帰りティア表、相場を見るなら売り時・買い時。"]],
      moreH: "くわしく知りたいとき",
      more: "よくある質問は<a href=\"faq.html\">よくある質問</a>に、運営者の情報とデータの出どころは<a href=\"privacy.html\">プライバシーポリシー</a>にまとめています。" },
    faq: { title: "よくある質問",
      desc: "EFT Workbench のよくある質問。値段の更新、PvP と PvE の違い、転売ボードの利益の見方、ティア表の段位、売り時・買い時、ラットスポットの評価について。",
      lead: "知りたい質問を押すと、答えが開きます。" }
  },
  en: {
    about: { title: "About",
      desc: "EFT Workbench is a free set of tools for Escape from Tarkov that uses flea market prices to help you decide what to buy, sell and bring back. Here is what it does and how to use it.",
      lead: "EFT Workbench is a free set of tools for Escape from Tarkov. It uses flea market prices to help you decide <b>what to buy, what to sell and what to bring back</b>, and it also shares rat spots where ambushes win fights.",
      purposeH: "Why this site",
      purpose: "Flea and trader prices keep moving. Working out what pays once fees, buy limits and loyalty levels are included is a chore between raids. This site does that math for you and turns it into <b>lists you can act on the moment you open them</b>. It is all free, with no sign-up.",
      toolsH: "What you can do", stepsH: "How to use it",
      steps: [["Enter your situation", "In <a href=\"settings.html\">Player settings</a>, enter your level, loyalty levels and Intelligence Center (just once)."],
              ["Pick a mode", "At the top left, choose PvP (regular), PvP seasonal or PvE."],
              ["Open a tool", "The flip board to make money, the loot tier list during raids, and buy & sell signals to watch the market."]],
      moreH: "More information",
      more: "Answers to common questions are in the <a href=\"faq.en.html\">FAQ</a>. Who runs the site and where the data comes from are on the <a href=\"privacy.en.html\">privacy policy</a> page." },
    faq: { title: "FAQ",
      desc: "Frequently asked questions about EFT Workbench: price updates, PvP vs PvE, reading the flip board, loot tiers, buy & sell signals and rat spot ratings.",
      lead: "Click a question to see the answer." }
  }
};

const strip = h => h.replace(/<[^>]+>/g, "");

export function aboutPage(lang){
  const T = TEXT[lang].about;
  const body = `<h1>${T.title}</h1>
<p class="lead">${T.lead}</p>
<h2>${T.purposeH}</h2>
<p>${T.purpose}</p>
<h2>${T.toolsH}</h2>
<div class="tools">${TOOLS[lang].map(([href, name, lead, pts]) => `<a href="${href}"><b>${name}</b><span>${lead}</span><ul>${pts.map(x => `<li>${x}</li>`).join("")}</ul></a>`).join("")}</div>
<h2>${T.stepsH}</h2>
<ol class="steps">${T.steps.map(([h, x]) => `<li><b>${h}</b>${x}</li>`).join("")}</ol>
<h2>${T.moreH}</h2>
<p>${T.more}</p>`;
  return { title: T.title, desc: T.desc, body };
}

export function faqPage(lang){
  const T = TEXT[lang].faq, F = FAQ[lang];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang,
    mainEntity: F.flatMap(([, qs]) => qs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } }))) };
  const body = `<h1>${T.title}</h1>
<p class="lead">${T.lead}</p>
<div class="faq">${F.map(([h, qs]) => `<h2>${h}</h2>${qs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}`).join("")}</div>
<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  return { title: T.title, desc: T.desc, body };
}
