// 公開サイトのメンバーデータ。
// メンバー情報はFirestoreではなく、このローカルデータを正本として管理する。

export const MEMBER_ITEMS = {
  ishii: {
    id: "ishii",
    name: "石井勇輝",
    role: "主催者",
    occupation: "アプリビジネスプロデューサー、モルキニストプロデューサー",
    image: "",
    visualVariant: "",
    startedReason: "スポーツイベント企画を立ち上げる時に話題に上がったのがモルックだったことがきっかけです。",
    favoriteThings: "子育て（2児の父）、ディズニー・USJに行くこと、スポーツ観戦（ボクシング、野球）。",
    firstTimerMessage: "初めてでも誰でも楽しめるスポーツです！そして、初めましての人とも自然と仲良くなれるのも凄いところです！ぜひ一緒に楽しみましょう！",
    comment: "アットホームな雰囲気を大切にしています！お一人でも気軽にご参加ください♪",
    displayOrder: 10,
    isPublished: true,
  },
  "ishizuka-ryoichi": {
    id: "ishizuka-ryoichi",
    name: "石塚涼一",
    role: "共同運営",
    occupation: "社会保険労務士",
    image: "",
    visualVariant: "",
    startedReason: "アウトドアイベントで偶然モルックを見かけて、「これなら自分でも楽しめそうだな」と感じたのがきっかけです。実際にやってみたら、シンプルなのに奥が深くて、気づいたらどっぷりハマっていました！！",
    favoriteThings: "卓球やフットサルをちょこちょこやっています。最近はなかなか見られていないのですが、アニメも大好きです！",
    firstTimerMessage: "ルールを知らなくても大丈夫です！私自身、最初は「木を投げるだけ？」くらいの感覚で始めました。でも気づけばこうして運営側にいます…（笑）気軽な気持ちで来てもらえれば、あとは自然と楽しめます！！",
    comment: "皆さんに「また来たい」と思ってもらえるモルック会を作りたいと思っています！",
    displayOrder: 20,
    isPublished: true,
  },
  "saito-keisuke": {
    id: "saito-keisuke",
    name: "齋藤景介",
    role: "共同運営",
    occupation: "金融業",
    image: "",
    visualVariant: "",
    startedReason: "お誘いでモルキニストに参加したことがきっかけです！",
    favoriteThings: "野球、福山雅治",
    firstTimerMessage: "誰でも楽しめるスポーツなのでお気軽にご参加ください！",
    comment: "野球観戦やお酒を飲むのが大好きです！ぜひご一緒しましょう！",
    displayOrder: 30,
    isPublished: true,
  },
};

export const MEMBER_LIST = sortMembers(
  Object.values(MEMBER_ITEMS).map((item) => normalizeMemberItem(item.id, item)).filter(Boolean)
);

export const FALLBACK_MEMBER_ITEMS = MEMBER_ITEMS;
export const FALLBACK_MEMBER_LIST = MEMBER_LIST;

export function normalizeMemberItem(id, data = {}) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return null;

  return {
    id,
    name,
    role: stringValue(data.role || data.roleLabel),
    occupation: stringValue(data.occupation),
    image: stringValue(data.image || data.imageUrl),
    visualVariant: normalizeVisualVariant(data.visualVariant),
    startedReason: stringValue(data.startedReason),
    favoriteThings: stringValue(data.favoriteThings),
    firstTimerMessage: stringValue(data.firstTimerMessage),
    comment: stringValue(data.comment || data.quote),
    displayOrder: normalizeDisplayOrder(data.displayOrder),
    isPublished: data.isPublished !== false,
  };
}

export function getPublishedMembers() {
  return sortMembers(MEMBER_LIST.filter((item) => item.isPublished));
}

export function sortMembers(items) {
  return [...items].sort((a, b) => {
    const orderDiff = a.displayOrder - b.displayOrder;
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name, "ja");
  });
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDisplayOrder(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 9999;
}

function normalizeVisualVariant(value) {
  return ["soft", "wood"].includes(value) ? value : "";
}
