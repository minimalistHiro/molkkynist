// トップページ「お知らせ」カルーセルのFirestore連携。
// 公開済み news がない場合は初期ダミーデータで表示を保つ。

import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";
import {
  FALLBACK_NEWS_LIST,
  normalizeNewsItem,
} from "./news-data.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const track = document.querySelector("[data-news-list-track]");

if (track) {
  initNewsList().catch((error) => {
    console.error("[news-list] 初期化に失敗しました", error);
    renderNewsCards(FALLBACK_NEWS_LIST);
  });
}

async function initNewsList() {
  renderNewsCards(FALLBACK_NEWS_LIST);

  if (!isFirebaseConfigured(firebaseConfig)) {
    return;
  }

  try {
    const items = await fetchPublishedNews();
    if (items.length) {
      renderNewsCards(items);
    }
  } catch (error) {
    console.error("[news-list] news取得に失敗しました", error);
  }
}

async function fetchPublishedNews() {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import(APP_MODULE_URL),
    import(FIRESTORE_MODULE_URL),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const { getFirestore, collection, query, where, orderBy, limit, getDocs } = firestore;
  const db = getFirestore(app);
  const newsQuery = query(
    collection(db, "news"),
    where("isPublished", "==", true),
    orderBy("publishDate", "desc"),
    limit(8)
  );
  const snapshot = await getDocs(newsQuery);
  return snapshot.docs
    .map((doc) => normalizeNewsItem(doc.id, doc.data()))
    .filter(Boolean);
}

function renderNewsCards(items) {
  track.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "report-carousel__slide";
    li.innerHTML = `
      <a class="report-news-card" href="news.html?id=${encodeURIComponent(item.id)}">
        <div class="${visualClassName(item)}" aria-hidden="true">${visualHtml(item)}</div>
        <div class="report-news-card__body">
          <time class="report-news-card__date" datetime="${escapeHtml(item.dateTime)}">${escapeHtml(
            item.dateText || "配信日未設定"
          )}</time>
          <h3 class="report-news-card__title">${escapeHtml(item.title)}</h3>
        </div>
      </a>
    `;
    track.appendChild(li);
  });

  window.MolkkynistReportCarousel?.initAll?.();
}

function visualClassName(item) {
  const classes = ["report-news-card__visual"];
  if (item.visualVariant) {
    classes.push(`report-news-card__visual--${item.visualVariant}`);
  }
  if (item.imageUrl) {
    classes.push("report-news-card__visual--image");
  }
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
