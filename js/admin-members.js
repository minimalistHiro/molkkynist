// メンバー管理画面。
// Firestore members コレクションへ、トップページとメンバー詳細で使う情報を登録する。

import {
  FIRESTORE_MODULE_URL,
  STORAGE_MODULE_URL,
  clearAdminStatus,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const form = document.querySelector("[data-admin-member-form]");
const listEl = document.querySelector("[data-admin-members-list]");
const statusEl = document.querySelector("[data-admin-status]");
const imageFileInput = document.querySelector("[data-admin-member-image-file]");
const imagePreview = document.querySelector("[data-admin-member-image-preview]");
const imagePreviewImg = document.querySelector("[data-admin-member-image-preview-img]");
const imageClearButton = document.querySelector("[data-admin-member-image-clear]");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

if (form && listEl) {
  initMembersPage().catch((error) => {
    console.error("[admin-members] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "メンバー管理画面の初期化に失敗しました。", "error");
  });
}

async function initMembersPage() {
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
    serverTimestamp,
  } = firestore;
  const db = getFirestore(app);
  const membersRef = collection(db, "members");

  let editingId = null;
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");
  const submitButton = form.querySelector('button[type="submit"]');
  setupImagePreview();

  onSnapshot(
    query(membersRef, orderBy("displayOrder", "asc")),
    (snapshot) => {
      const items = snapshot.docs.map((memberDoc) => ({
        id: memberDoc.id,
        ...memberDoc.data(),
      }));
      renderMembers(items, (item) => {
        fillForm(item);
        editingId = item.id;
        cancelButton.hidden = false;
        submitButton.textContent = "メンバーを更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    (error) => {
      console.error("[admin-members] members購読に失敗しました", error);
      showAdminStatus(statusEl, "メンバー一覧の取得に失敗しました。", "error");
    }
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    form.reset();
    clearSelectedImage();
    cancelButton.hidden = true;
    submitButton.textContent = "メンバーを保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const selectedImage = getSelectedImageFile();
      const payload = buildMemberPayload(new FormData(form));
      const memberRef = editingId ? doc(db, "members", editingId) : doc(membersRef);

      if (selectedImage) {
        showAdminStatus(statusEl, "画像をアップロードしています…", "loading");
        payload.imageUrl = await uploadMemberImage(app, memberRef.id, selectedImage);
      }

      if (editingId) {
        await updateDoc(memberRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(memberRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      form.reset();
      clearSelectedImage();
      editingId = null;
      cancelButton.hidden = true;
      submitButton.textContent = "メンバーを保存";
      showAdminStatus(statusEl, "メンバーを保存しました。", "success");
    } catch (error) {
      console.error("[admin-members] 保存に失敗しました", error);
      const message =
        error instanceof Error && error.message ? error.message : "メンバーの保存に失敗しました。";
      showAdminStatus(statusEl, message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

function buildMemberPayload(formData) {
  const displayOrder = Number.parseInt(formData.get("displayOrder")?.toString() ?? "", 10);

  return {
    name: formData.get("name")?.toString().trim() ?? "",
    role: formData.get("role")?.toString().trim() ?? "",
    imageUrl: formData.get("imageUrl")?.toString().trim() ?? "",
    visualVariant: formData.get("visualVariant")?.toString() ?? "",
    startedReason: formData.get("startedReason")?.toString().trim() ?? "",
    favoriteThings: formData.get("favoriteThings")?.toString().trim() ?? "",
    firstTimerMessage: formData.get("firstTimerMessage")?.toString().trim() ?? "",
    comment: formData.get("comment")?.toString().trim() ?? "",
    displayOrder: Number.isNaN(displayOrder) ? 9999 : displayOrder,
    isPublished: formData.get("isPublished") === "on",
  };
}

function setupImagePreview() {
  if (!imageFileInput) return;

  imageFileInput.addEventListener("change", () => {
    const file = imageFileInput.files?.[0] ?? null;
    clearAdminStatus(statusEl);

    if (!file) {
      clearSelectedImage();
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      imageFileInput.value = "";
      clearSelectedImage();
      showAdminStatus(statusEl, validationError, "error");
      return;
    }

    if (imagePreview && imagePreviewImg) {
      if (imagePreviewImg.src.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewImg.src);
      }
      imagePreviewImg.src = URL.createObjectURL(file);
      imagePreview.hidden = false;
    }
  });

  imageClearButton?.addEventListener("click", () => {
    clearSelectedImage();
    clearAdminStatus(statusEl);
  });
}

function getSelectedImageFile() {
  const file = imageFileInput?.files?.[0] ?? null;
  if (!file) return null;

  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  return file;
}

function validateImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "アップロードできる画像は JPEG / PNG / WebP のみです。";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "画像サイズは5MB以下にしてください。";
  }
  return "";
}

async function uploadMemberImage(app, memberId, file) {
  const storage = await import(STORAGE_MODULE_URL);
  const { getStorage, ref, uploadBytes, getDownloadURL } = storage;
  const storageRef = ref(getStorage(app), buildMemberImagePath(memberId, file));
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      source: "admin-members",
    },
  });
  return getDownloadURL(snapshot.ref);
}

function buildMemberImagePath(memberId, file) {
  const extension = imageExtension(file.type);
  return `members/${memberId}/profile-${Date.now()}.${extension}`;
}

function imageExtension(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function clearSelectedImage() {
  if (imageFileInput) imageFileInput.value = "";
  if (imagePreviewImg) {
    if (imagePreviewImg.src.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewImg.src);
    }
    imagePreviewImg.src = "";
  }
  if (imagePreview) imagePreview.hidden = true;
}

function renderMembers(items, onEdit) {
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = '<p class="admin-empty">登録済みのメンバーはありません。</p>';
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "admin-list-item";
    article.innerHTML = `
      <div>
        <p class="admin-item-meta">表示順: ${escapeHtml(item.displayOrder ?? "未設定")} / ${escapeHtml(
          item.role || "役割未設定"
        )}</p>
        <h3>${escapeHtml(item.name || "名前未入力")}</h3>
        <p>${escapeHtml(excerpt(item.comment || item.firstTimerMessage || "紹介文は未入力です。"))}</p>
        <div class="admin-chip-row">
          <span class="status-chip">${item.isPublished ? "公開中" : "非公開"}</span>
          <span class="status-chip">${item.imageUrl ? "画像あり" : "アイコン表示"}</span>
        </div>
      </div>
      <button class="button button--secondary" type="button">編集</button>
    `;
    article.querySelector("button").addEventListener("click", () => onEdit(item));
    listEl.appendChild(article);
  });
}

function fillForm(item) {
  clearSelectedImage();
  form.elements.name.value = item.name || "";
  form.elements.role.value = item.role || "";
  form.elements.imageUrl.value = item.imageUrl || "";
  form.elements.visualVariant.value = item.visualVariant || "";
  form.elements.startedReason.value = item.startedReason || "";
  form.elements.favoriteThings.value = item.favoriteThings || "";
  form.elements.firstTimerMessage.value = item.firstTimerMessage || "";
  form.elements.comment.value = item.comment || "";
  form.elements.displayOrder.value = item.displayOrder ?? "";
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
