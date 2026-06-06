// トップページ「運営メンバー」一覧のFirestore連携。
// 公開済み members がない場合は初期ダミーデータで表示を保つ。

import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";
import {
  FALLBACK_MEMBER_LIST,
  normalizeMemberItem,
  sortMembers,
} from "./member-data.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const grid = document.querySelector("[data-member-list]");

if (grid) {
  initMemberList().catch((error) => {
    console.error("[member-list] 初期化に失敗しました", error);
    renderMemberCards(FALLBACK_MEMBER_LIST);
  });
}

async function initMemberList() {
  renderMemberCards(FALLBACK_MEMBER_LIST);

  if (!isFirebaseConfigured(firebaseConfig)) {
    return;
  }

  try {
    const items = await fetchPublishedMembers();
    if (items.length) {
      renderMemberCards(items);
    }
  } catch (error) {
    console.error("[member-list] members取得に失敗しました", error);
  }
}

async function fetchPublishedMembers() {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import(APP_MODULE_URL),
    import(FIRESTORE_MODULE_URL),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const { getFirestore, collection, query, where, orderBy, getDocs } = firestore;
  const db = getFirestore(app);
  const membersQuery = query(
    collection(db, "members"),
    where("isPublished", "==", true),
    orderBy("displayOrder", "asc")
  );
  const snapshot = await getDocs(membersQuery);
  return sortMembers(
    snapshot.docs.map((doc) => normalizeMemberItem(doc.id, doc.data())).filter(Boolean)
  );
}

function renderMemberCards(items) {
  grid.innerHTML = "";
  items.forEach((item) => {
    const link = document.createElement("a");
    link.className = "member-card";
    link.href = `member.html?id=${encodeURIComponent(item.id)}`;
    link.innerHTML = `
      <div class="${visualClassName(item)}" aria-hidden="true">${visualHtml(item)}</div>
      <div class="member-card__body">
        <p class="card-kicker">${escapeHtml(item.role || "運営メンバー")}</p>
        <h3>${escapeHtml(item.name)}</h3>
      </div>
    `;
    grid.appendChild(link);
  });
}

function visualClassName(item) {
  const classes = ["person-placeholder"];
  if (item.visualVariant) classes.push(`person-placeholder--${item.visualVariant}`);
  if (item.imageUrl) classes.push("person-placeholder--image");
  return classes.join(" ");
}

function visualHtml(item) {
  if (!item.imageUrl) return "";
  return `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async">`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
