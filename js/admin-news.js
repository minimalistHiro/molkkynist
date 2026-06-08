// お知らせ管理画面。
// Firestore news コレクションへ、トップページとお知らせ詳細で使う記事を登録する。

import {
  FIRESTORE_MODULE_URL,
  clearAdminButtonLoading,
  clearAdminStatus,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  setAdminButtonLoading,
  showAdminStatus,
} from "./admin-auth.js";
import {
  deleteAdminImageByUrl,
  setupAdminImageUpload,
  uploadAdminImage,
} from "./admin-storage-upload.js";
import { formatDate, toDateInputValue } from "./news-data.js";

const form = document.querySelector("[data-admin-news-form]");
const listEl = document.querySelector("[data-admin-news-list]");
const statusEl = document.querySelector("[data-admin-status]");
const imageFileInput = document.querySelector("[data-admin-image-file]");
const imagePreview = document.querySelector("[data-admin-image-preview]");
const imagePreviewImg = document.querySelector("[data-admin-image-preview-img]");
const imageClearButton = document.querySelector("[data-admin-image-clear]");

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
    setDoc,
    updateDoc,
    deleteDoc,
    deleteField,
    serverTimestamp,
    Timestamp,
  } = firestore;
  const db = getFirestore(app);
  const newsRef = collection(db, "news");

  let editingId = null;
  let editingImageUrl = "";
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");
  const submitButton = form.querySelector('button[type="submit"]');
  const imageUpload = setupAdminImageUpload({
    fileInput: imageFileInput,
    preview: imagePreview,
    previewImg: imagePreviewImg,
    clearButton: imageClearButton,
    statusEl,
    showStatus: showAdminStatus,
    clearStatus: clearAdminStatus,
  });

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
        editingImageUrl = item.imageUrl || "";
        cancelButton.hidden = false;
        submitButton.textContent = "お知らせを更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, async (item) => {
        if (!confirmDelete("お知らせ", item.title || "無題のお知らせ")) return;
        try {
          await deleteDoc(doc(db, "news", item.id));
          await deleteAdminImageByUrl(app, item.imageUrl);
          if (editingId === item.id) {
            editingId = null;
            editingImageUrl = "";
            form.reset();
            imageUpload.clear();
            cancelButton.hidden = true;
            submitButton.textContent = "お知らせを保存";
          }
          showAdminStatus(statusEl, "お知らせを削除しました。", "success");
        } catch (error) {
          console.error("[admin-news] 削除に失敗しました", error);
          showAdminStatus(statusEl, "お知らせの削除に失敗しました。", "error");
        }
      });
    },
    (error) => {
      console.error("[admin-news] news購読に失敗しました", error);
      showAdminStatus(statusEl, "お知らせ一覧の取得に失敗しました。", "error");
    }
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    editingImageUrl = "";
    form.reset();
    imageUpload.clear();
    cancelButton.hidden = true;
    submitButton.textContent = "お知らせを保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    let submitLabel = submitButton.textContent.trim() || "お知らせを保存";
    setAdminButtonLoading(submitButton, "保存中…");
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const selectedImage = imageUpload.getSelectedFile();
      const payload = buildNewsPayload(new FormData(form), Timestamp);
      const newsDocRef = editingId ? doc(db, "news", editingId) : doc(newsRef);
      payload.imageUrl = editingImageUrl;

      if (selectedImage) {
        setAdminButtonLoading(submitButton, "画像アップロード中…");
        showAdminStatus(statusEl, "画像をアップロードしています…", "loading");
        payload.imageUrl = await uploadAdminImage(app, {
          collectionName: "news",
          documentId: newsDocRef.id,
          file: selectedImage,
          prefix: "card",
        });
        await deleteAdminImageByUrl(app, editingImageUrl);
      }

      if (editingId) {
        await updateDoc(newsDocRef, {
          ...payload,
          visualVariant: deleteField(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(newsDocRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      form.reset();
      imageUpload.clear();
      editingId = null;
      editingImageUrl = "";
      cancelButton.hidden = true;
      submitLabel = "お知らせを保存";
      showAdminStatus(statusEl, "お知らせを保存しました。", "success");
    } catch (error) {
      console.error("[admin-news] 保存に失敗しました", error);
      const message =
        error instanceof Error && error.message ? error.message : "お知らせの保存に失敗しました。";
      showAdminStatus(statusEl, message, "error");
    } finally {
      clearAdminButtonLoading(submitButton, submitLabel);
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
    imageUrl: "",
    isPublished: formData.get("isPublished") === "on",
  };
}

function renderNews(items, onEdit, onDelete) {
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
      <div class="admin-item-actions">
        <button class="button button--secondary" type="button" data-admin-edit>編集</button>
        <button class="button button--danger" type="button" data-admin-delete>削除</button>
      </div>
    `;
    article.querySelector("[data-admin-edit]").addEventListener("click", () => onEdit(item));
    article.querySelector("[data-admin-delete]").addEventListener("click", () => onDelete(item));
    listEl.appendChild(article);
  });
}

function fillForm(item) {
  if (imageFileInput) imageFileInput.value = "";
  if (imagePreviewImg) imagePreviewImg.src = item.imageUrl || "";
  if (imagePreview) imagePreview.hidden = !item.imageUrl;
  if (imageClearButton) imageClearButton.hidden = true;
  form.elements.title.value = item.title || "";
  form.elements.body.value = item.body || "";
  form.elements.publishDate.value = toDateInputValue(item.publishDate);
  form.elements.isPublished.checked = Boolean(item.isPublished);
}

function excerpt(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= 90) return text;
  return `${text.slice(0, 90)}…`;
}

function confirmDelete(itemType, itemName) {
  return window.confirm(`${itemType}「${itemName}」を削除します。\nこの操作は取り消せません。`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
