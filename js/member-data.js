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
