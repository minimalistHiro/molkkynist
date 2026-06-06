// メンバー詳細ページ。
// Firestore members の公開メンバーを優先し、未登録時は初期ダミーデータで表示する。

import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";
import {
  FALLBACK_MEMBER_ITEMS,
  normalizeMemberItem,
} from "./member-data.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const MEMBER_DETAIL_FIELDS = [
  ["モルックを始めたきっかけ", "startedReason"],
  ["モルック以外の好きなこと", "favoriteThings"],
  ["初参加者へのメッセージ", "firstTimerMessage"],
];

initMemberDetail().catch((error) => {
  console.error("[member-detail] 初期化に失敗しました", error);
  renderNotFound();
});

async function initMemberDetail() {
  const id = getId();
  if (!id) {
    renderNotFound();
    return;
  }

  const fallbackItem = FALLBACK_MEMBER_ITEMS[id] || null;
  if (fallbackItem) {
    render(fallbackItem);
  }

  if (!isFirebaseConfigured(firebaseConfig)) {
    if (!fallbackItem) renderNotFound();
    return;
  }

  try {
    const firestoreItem = await fetchMemberItem(id);
    if (firestoreItem) {
      render(firestoreItem);
      return;
    }
  } catch (error) {
    console.error("[member-detail] members取得に失敗しました", error);
  }

  if (!fallbackItem) {
    renderNotFound();
  }
}

function getId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? id.trim() : "";
}

async function fetchMemberItem(id) {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import(APP_MODULE_URL),
    import(FIRESTORE_MODULE_URL),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const { getFirestore, doc, getDoc } = firestore;
  const db = getFirestore(app);
  const snapshot = await getDoc(doc(db, "members", id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() ?? {};
  if (data.isPublished !== true) return null;
  return normalizeMemberItem(snapshot.id, data);
}

function render(item) {
  const nameEl = document.querySelector("[data-member-name]");
  const roleEl = document.querySelector("[data-member-role]");
  const visualEl = document.querySelector("[data-member-visual]");
  const bodyEl = document.querySelector("[data-member-body]");
  const titleTagEl = document.querySelector("[data-member-page-title]");

  if (nameEl) nameEl.textContent = item.name;
  if (roleEl) roleEl.textContent = item.role || "運営メンバー";
  renderVisual(visualEl, item);

  if (bodyEl) {
    bodyEl.innerHTML = "";
    MEMBER_DETAIL_FIELDS.forEach(([label, key]) => {
      const text = item[key];
      if (!text) return;
      const p = document.createElement("p");
      p.textContent = `${label}：${text}`;
      bodyEl.appendChild(p);
    });
    if (item.comment) {
      const q = document.createElement("p");
      q.className = "quote";
      q.textContent = `ひとことコメント：${item.comment}`;
      bodyEl.appendChild(q);
    }
  }
  if (titleTagEl) {
    titleTagEl.textContent = `${item.name} | メンバー紹介 | Molkkynist`;
  }
}

function renderVisual(visualEl, item) {
  if (!visualEl) return;
  visualEl.classList.remove(
    "member-detail__visual--soft",
    "member-detail__visual--wood",
    "member-detail__visual--image"
  );
  visualEl.innerHTML = "";
  if (item.visualVariant) {
    visualEl.classList.add(`member-detail__visual--${item.visualVariant}`);
  }
  if (item.imageUrl) {
    visualEl.classList.add("member-detail__visual--image");
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    visualEl.appendChild(image);
  }
}

function renderNotFound() {
  const nameEl = document.querySelector("[data-member-name]");
  const roleEl = document.querySelector("[data-member-role]");
  const bodyEl = document.querySelector("[data-member-body]");
  const titleTagEl = document.querySelector("[data-member-page-title]");
  const visualEl = document.querySelector("[data-member-visual]");

  if (nameEl) nameEl.textContent = "メンバーが見つかりませんでした";
  if (roleEl) roleEl.textContent = "";
  if (visualEl) visualEl.innerHTML = "";
  if (bodyEl) {
    bodyEl.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = "指定されたメンバーが存在しないか、URLが正しくない可能性があります。メンバー一覧からもう一度お選びください。";
    bodyEl.appendChild(p);
  }
  if (titleTagEl) {
    titleTagEl.textContent = "メンバーが見つかりません | Molkkynist";
  }
}
