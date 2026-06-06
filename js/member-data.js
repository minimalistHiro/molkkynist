// 公開サイトのメンバーフォールバックデータ。
// Firestore members が未登録・取得不可の場合に、初期表示として利用する。

export const FALLBACK_MEMBER_ITEMS = {
  ishii: {
    id: "ishii",
    name: "石井さん",
    role: "主催者",
    imageUrl: "",
    visualVariant: "",
    startedReason: "公園で気軽に楽しめるモルックの雰囲気にひかれ、初めての方も一緒に遊べる場をつくりたいと思ったことがきっかけです。",
    favoriteThings: "散歩、コーヒー、外で過ごす時間。天気の良い日に人が自然と集まる場所が好きです。",
    firstTimerMessage: "ルールを知らなくても大丈夫です。当日は基本から説明するので、まずは見学だけでも気軽に来てください。",
    comment: "初めての方も、まずは見学から気軽にどうぞ。",
    displayOrder: 10,
  },
  "member-a": {
    id: "member-a",
    name: "運営メンバー A",
    role: "共同メンバー",
    imageUrl: "",
    visualVariant: "soft",
    startedReason: "友人に誘われて参加したイベントで、経験に関係なく盛り上がれるところが楽しく、続けて参加するようになりました。",
    favoriteThings: "音楽、写真、休日のカフェ巡り。活動の日は写真を撮りながら雰囲気を残すことも好きです。",
    firstTimerMessage: "ひとりでの参加でも、その場で自然にチームを組めます。わからないことは近くのメンバーに声をかけてください。",
    comment: "初参加の方が輪に入りやすい雰囲気づくりを大切にしています。",
    displayOrder: 20,
  },
  "member-b": {
    id: "member-b",
    name: "運営メンバー B",
    role: "共同メンバー",
    imageUrl: "",
    visualVariant: "wood",
    startedReason: "運動が得意でなくても楽しめるスポーツを探していたときにモルックを知り、ほどよい戦略性と気軽さに魅力を感じました。",
    favoriteThings: "ボードゲーム、読書、季節のイベント。ゆっくり会話しながら遊べる時間が好きです。",
    firstTimerMessage: "うまく投げられなくても楽しめるのがモルックの良いところです。まずは一投だけ試す気持ちで参加してください。",
    comment: "勝ち負けよりも、みんなで笑える時間を大事にしています。",
    displayOrder: 30,
  },
};

export const FALLBACK_MEMBER_LIST = Object.values(FALLBACK_MEMBER_ITEMS);

export function normalizeMemberItem(id, data = {}) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return null;

  return {
    id,
    name,
    role: stringValue(data.role || data.roleLabel),
    imageUrl: stringValue(data.imageUrl),
    visualVariant: normalizeVisualVariant(data.visualVariant),
    startedReason: stringValue(data.startedReason),
    favoriteThings: stringValue(data.favoriteThings),
    firstTimerMessage: stringValue(data.firstTimerMessage),
    comment: stringValue(data.comment || data.quote),
    displayOrder: normalizeDisplayOrder(data.displayOrder),
  };
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
