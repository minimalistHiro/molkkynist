// お知らせ詳細ページ。
// Firestore news の公開記事を優先し、未登録時は初期ダミーデータで表示する。

import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";
import {
  FALLBACK_NEWS_ITEMS,
  normalizeNewsItem,
} from "./news-data.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

initNewsDetail().catch((error) => {
  console.error("[news-detail] 初期化に失敗しました", error);
  renderNotFound();
});

async function initNewsDetail() {
  const id = getId();
  if (!id) {
    renderNotFound();
    return;
  }

  const fallbackItem = FALLBACK_NEWS_ITEMS[id] || null;
  if (fallbackItem) {
    render(fallbackItem);
  }

  if (!isFirebaseConfigured(firebaseConfig)) {
    if (!fallbackItem) renderNotFound();
    return;
  }

  try {
    const firestoreItem = await fetchNewsItem(id);
    if (firestoreItem) {
      render(firestoreItem);
      return;
    }
  } catch (error) {
    console.error("[news-detail] news取得に失敗しました", error);
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

async function fetchNewsItem(id) {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import(APP_MODULE_URL),
    import(FIRESTORE_MODULE_URL),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const { getFirestore, doc, getDoc } = firestore;
  const db = getFirestore(app);
  const snapshot = await getDoc(doc(db, "news", id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() ?? {};
  if (data.isPublished !== true) return null;
  return normalizeNewsItem(snapshot.id, data);
}

function render(item) {
  const titleEl = document.querySelector("[data-news-title]");
  const dateEl = document.querySelector("[data-news-date]");
  const visualEl = document.querySelector("[data-news-visual]");
  const bodyEl = document.querySelector("[data-news-body]");
  const titleTagEl = document.querySelector("[data-news-page-title]");

  if (titleEl) titleEl.textContent = item.title;
  if (dateEl) {
    dateEl.textContent = item.dateText;
    if (item.dateTime) {
      dateEl.setAttribute("datetime", item.dateTime);
    } else {
      dateEl.removeAttribute("datetime");
    }
  }
  if (visualEl) {
    visualEl.classList.remove(
      "news-detail__visual--soft",
      "news-detail__visual--wood",
      "news-detail__visual--lime",
      "news-detail__visual--image"
    );
    visualEl.innerHTML = "";
    if (item.visualVariant) {
      visualEl.classList.add(`news-detail__visual--${item.visualVariant}`);
    }
    if (item.imageUrl) {
      visualEl.classList.add("news-detail__visual--image");
      const image = document.createElement("img");
      image.src = item.imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      visualEl.appendChild(image);
    }
  }
  if (bodyEl) {
    bodyEl.innerHTML = "";
    const paragraphs = item.paragraphs.length
      ? item.paragraphs
      : ["本文はまだ登録されていません。"];
    paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      bodyEl.appendChild(p);
    });
  }
  if (titleTagEl) {
    titleTagEl.textContent = `${item.title} | お知らせ | Molkkynist`;
  }
}

function renderNotFound() {
  const titleEl = document.querySelector("[data-news-title]");
  const dateEl = document.querySelector("[data-news-date]");
  const bodyEl = document.querySelector("[data-news-body]");
  const titleTagEl = document.querySelector("[data-news-page-title]");
  const visualEl = document.querySelector("[data-news-visual]");

  if (titleEl) titleEl.textContent = "お知らせが見つかりませんでした";
  if (dateEl) {
    dateEl.textContent = "";
    dateEl.removeAttribute("datetime");
  }
  if (visualEl) {
    visualEl.innerHTML = "";
  }
  if (bodyEl) {
    bodyEl.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = "指定されたお知らせが存在しないか、URLが正しくない可能性があります。お知らせ一覧からもう一度お選びください。";
    bodyEl.appendChild(p);
  }
  if (titleTagEl) {
    titleTagEl.textContent = "お知らせが見つかりません | Molkkynist";
  }
}
