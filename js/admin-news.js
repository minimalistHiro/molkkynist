// お知らせ管理画面。
// Firestore news コレクションへ、トップページとお知らせ詳細で使う記事を登録する。

import {
  FIRESTORE_MODULE_URL,
  clearAdminStatus,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";
import { formatDate, toDateInputValue } from "./news-data.js";

const form = document.querySelector("[data-admin-news-form]");
const listEl = document.querySelector("[data-admin-news-list]");
const statusEl = document.querySelector("[data-admin-status]");

if (form && listEl) {
  initNewsPage().catch((error) => {
    console.error("[admin-news] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "お知らせ管理画面の初期化に失敗しました。", "error");
  });
}

async function initNewsPage() {
  const context = await requireAdmin(statusEl);
  if (!context) return;
  await initLogoutButtons();

  const app = await getAdminApp();
  const firestore = await import(FIRESTORE_MODULE_URL);
  const {
    getFirestore,
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
  } = firestore;
  const db = getFirestore(app);
  const newsRef = collection(db, "news");

  let editingId = null;
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");
  const submitButton = form.querySelector('button[type="submit"]');

  onSnapshot(
    query(newsRef, orderBy("publishDate", "desc")),
    (snapshot) => {
      const items = snapshot.docs.map((newsDoc) => ({
        id: newsDoc.id,
        ...newsDoc.data(),
      }));
      renderNews(items, (item) => {
        fillForm(item);
        editingId = item.id;
        cancelButton.hidden = false;
        submitButton.textContent = "お知らせを更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    (error) => {
      console.error("[admin-news] news購読に失敗しました", error);
      showAdminStatus(statusEl, "お知らせ一覧の取得に失敗しました。", "error");
    }
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    form.reset();
    cancelButton.hidden = true;
    submitButton.textContent = "お知らせを保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const payload = buildNewsPayload(new FormData(form), Timestamp);
      if (editingId) {
        await updateDoc(doc(db, "news", editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(newsRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      form.reset();
      editingId = null;
      cancelButton.hidden = true;
      submitButton.textContent = "お知らせを保存";
      showAdminStatus(statusEl, "お知らせを保存しました。", "success");
    } catch (error) {
      console.error("[admin-news] 保存に失敗しました", error);
      showAdminStatus(statusEl, "お知らせの保存に失敗しました。", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

function buildNewsPayload(formData, Timestamp) {
  const dateValue = formData.get("publishDate")?.toString() ?? "";
  const publishDate = dateValue ? Timestamp.fromDate(new Date(`${dateValue}T00:00:00+09:00`)) : null;

  return {
    title: formData.get("title")?.toString().trim() ?? "",
    body: formData.get("body")?.toString().trim() ?? "",
    publishDate,
    imageUrl: formData.get("imageUrl")?.toString().trim() ?? "",
    visualVariant: formData.get("visualVariant")?.toString() ?? "",
    isPublished: formData.get("isPublished") === "on",
  };
}

function renderNews(items, onEdit) {
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = '<p class="admin-empty">登録済みのお知らせはありません。</p>';
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "admin-list-item";
    article.innerHTML = `
      <div>
        <p class="admin-item-meta">${escapeHtml(formatDate(item.publishDate) || "配信日未設定")}</p>
        <h3>${escapeHtml(item.title || "無題のお知らせ")}</h3>
        <p>${escapeHtml(excerpt(item.body || "本文は未入力です。"))}</p>
        <div class="admin-chip-row">
          <span class="status-chip">${item.isPublished ? "公開中" : "非公開"}</span>
          <span class="status-chip">${item.imageUrl ? "画像あり" : "プレースホルダー"}</span>
        </div>
      </div>
      <button class="button button--secondary" type="button">編集</button>
    `;
    article.querySelector("button").addEventListener("click", () => onEdit(item));
    listEl.appendChild(article);
  });
}

function fillForm(item) {
  form.elements.title.value = item.title || "";
  form.elements.body.value = item.body || "";
  form.elements.publishDate.value = toDateInputValue(item.publishDate);
  form.elements.imageUrl.value = item.imageUrl || "";
  form.elements.visualVariant.value = item.visualVariant || "";
  form.elements.isPublished.checked = Boolean(item.isPublished);
}

function excerpt(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= 90) return text;
  return `${text.slice(0, 90)}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
