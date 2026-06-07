// 開催場所管理画面。
// Firestore venues コレクションへ、イベントで選択する会場情報を登録する。

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

const form = document.querySelector("[data-admin-venue-form]");
const listEl = document.querySelector("[data-admin-venues-list]");
const statusEl = document.querySelector("[data-admin-status]");
const imageFileInput = document.querySelector("[data-admin-image-file]");
const imagePreview = document.querySelector("[data-admin-image-preview]");
const imagePreviewImg = document.querySelector("[data-admin-image-preview-img]");
const imageClearButton = document.querySelector("[data-admin-image-clear]");

if (form && listEl) {
  initVenuesPage().catch((error) => {
    console.error("[admin-venues] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "開催場所管理画面の初期化に失敗しました。", "error");
  });
}

async function initVenuesPage() {
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
    serverTimestamp,
  } = firestore;
  const db = getFirestore(app);
  const venuesRef = collection(db, "venues");

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
    query(venuesRef, orderBy("displayOrder", "asc")),
    (snapshot) => {
      const venues = snapshot.docs.map((venueDoc) => ({
        id: venueDoc.id,
        ...venueDoc.data(),
      }));
      renderVenues(venues, (venueItem) => {
        fillForm(venueItem);
        editingId = venueItem.id;
        editingImageUrl = venueItem.imageUrl || "";
        cancelButton.hidden = false;
        submitButton.textContent = "開催場所を更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, async (venueItem) => {
        if (!confirmDelete("開催場所", venueItem.name || "無題の開催場所")) return;
        try {
          await deleteDoc(doc(db, "venues", venueItem.id));
          await deleteAdminImageByUrl(app, venueItem.imageUrl);
          if (editingId === venueItem.id) {
            editingId = null;
            editingImageUrl = "";
            form.reset();
            imageUpload.clear();
            form.elements.displayOrder.value = "100";
            form.elements.isActive.checked = true;
            cancelButton.hidden = true;
            submitButton.textContent = "開催場所を保存";
          }
          showAdminStatus(statusEl, "開催場所を削除しました。", "success");
        } catch (error) {
          console.error("[admin-venues] 削除に失敗しました", error);
          showAdminStatus(statusEl, "開催場所の削除に失敗しました。", "error");
        }
      });
    },
    (error) => {
      console.error("[admin-venues] venues購読に失敗しました", error);
      showAdminStatus(statusEl, "開催場所一覧の取得に失敗しました。", "error");
    },
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    editingImageUrl = "";
    form.reset();
    imageUpload.clear();
    form.elements.displayOrder.value = "100";
    form.elements.isActive.checked = true;
    cancelButton.hidden = true;
    submitButton.textContent = "開催場所を保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    let submitLabel = submitButton.textContent.trim() || "開催場所を保存";
    setAdminButtonLoading(submitButton, "保存中…");
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const selectedImage = imageUpload.getSelectedFile();
      const payload = buildVenuePayload(new FormData(form));
      const venueRef = editingId ? doc(db, "venues", editingId) : doc(venuesRef);
      payload.imageUrl = editingImageUrl;

      if (selectedImage) {
        setAdminButtonLoading(submitButton, "画像アップロード中…");
        showAdminStatus(statusEl, "画像をアップロードしています…", "loading");
        payload.imageUrl = await uploadAdminImage(app, {
          collectionName: "venues",
          documentId: venueRef.id,
          file: selectedImage,
          prefix: "venue",
        });
        await deleteAdminImageByUrl(app, editingImageUrl);
      }

      if (editingId) {
        await updateDoc(venueRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(venueRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      form.reset();
      imageUpload.clear();
      form.elements.displayOrder.value = "100";
      form.elements.isActive.checked = true;
      editingId = null;
      editingImageUrl = "";
      cancelButton.hidden = true;
      submitLabel = "開催場所を保存";
      showAdminStatus(statusEl, "開催場所を保存しました。", "success");
    } catch (error) {
      console.error("[admin-venues] 保存に失敗しました", error);
      const message =
        error instanceof Error && error.message ? error.message : "開催場所の保存に失敗しました。";
      showAdminStatus(statusEl, message, "error");
    } finally {
      clearAdminButtonLoading(submitButton, submitLabel);
    }
  });
}

function buildVenuePayload(formData) {
  const displayOrder = Number.parseInt(formData.get("displayOrder")?.toString() ?? "", 10);
  return {
    name: formData.get("name")?.toString().trim() ?? "",
    address: formData.get("address")?.toString().trim() ?? "",
    area: formData.get("area")?.toString().trim() ?? "",
    venueType: formData.get("venueType")?.toString() === "indoor" ? "indoor" : "outdoor",
    imageUrl: "",
    mapUrl: formData.get("mapUrl")?.toString().trim() ?? "",
    accessNote: formData.get("accessNote")?.toString().trim() ?? "",
    note: formData.get("note")?.toString().trim() ?? "",
    displayOrder: Number.isNaN(displayOrder) ? 100 : displayOrder,
    isActive: formData.get("isActive") === "on",
  };
}

function renderVenues(venues, onEdit, onDelete) {
  listEl.innerHTML = "";
  if (!venues.length) {
    listEl.innerHTML = '<p class="admin-empty">登録済みの開催場所はありません。</p>';
    return;
  }

  venues.forEach((venueItem) => {
    const article = document.createElement("article");
    article.className = "admin-list-item";
    article.innerHTML = `
      <div>
        <p class="admin-item-meta">${escapeHtml(venueItem.area || "エリア未設定")} / ${escapeHtml(
          venueTypeLabel(venueItem.venueType),
        )}</p>
        <h3>${escapeHtml(venueItem.name || "無題の開催場所")}</h3>
        <p>${escapeHtml(venueItem.address || "住所は未入力です。")}</p>
        <div class="admin-chip-row">
          <span class="status-chip">${venueItem.isActive ? "選択可" : "非表示"}</span>
          <span class="status-chip">表示順: ${escapeHtml(venueItem.displayOrder ?? "未設定")}</span>
          <span class="status-chip">${venueItem.imageUrl ? "画像あり" : "画像なし"}</span>
        </div>
      </div>
      <div class="admin-item-actions">
        <button class="button button--secondary" type="button" data-admin-edit>編集</button>
        <button class="button button--danger" type="button" data-admin-delete>削除</button>
      </div>
    `;
    article.querySelector("[data-admin-edit]").addEventListener("click", () => onEdit(venueItem));
    article.querySelector("[data-admin-delete]").addEventListener("click", () => onDelete(venueItem));
    listEl.appendChild(article);
  });
}

function fillForm(venueItem) {
  if (imageFileInput) imageFileInput.value = "";
  if (imagePreviewImg) imagePreviewImg.src = venueItem.imageUrl || "";
  if (imagePreview) imagePreview.hidden = !venueItem.imageUrl;
  if (imageClearButton) imageClearButton.hidden = true;
  form.elements.name.value = venueItem.name || "";
  form.elements.address.value = venueItem.address || "";
  form.elements.area.value = venueItem.area || "";
  form.elements.venueType.value = venueItem.venueType === "indoor" ? "indoor" : "outdoor";
  form.elements.mapUrl.value = venueItem.mapUrl || "";
  form.elements.accessNote.value = venueItem.accessNote || "";
  form.elements.note.value = venueItem.note || "";
  form.elements.displayOrder.value = venueItem.displayOrder ?? 100;
  form.elements.isActive.checked = venueItem.isActive !== false;
}

function venueTypeLabel(value) {
  return value === "indoor" ? "屋内会場" : "屋外会場";
}

function confirmDelete(itemType, itemName) {
  return window.confirm(
    `${itemType}「${itemName}」を削除します。\nこの操作は取り消せません。関連するイベントで選択中の場合は表示に影響する可能性があります。`,
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
