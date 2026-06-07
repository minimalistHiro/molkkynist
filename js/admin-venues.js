// 開催場所管理画面。
// Firestore venues コレクションへ、イベントで選択する会場情報を登録する。

import {
  FIRESTORE_MODULE_URL,
  clearAdminStatus,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const form = document.querySelector("[data-admin-venue-form]");
const listEl = document.querySelector("[data-admin-venues-list]");
const statusEl = document.querySelector("[data-admin-status]");

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
    addDoc,
    updateDoc,
    serverTimestamp,
  } = firestore;
  const db = getFirestore(app);
  const venuesRef = collection(db, "venues");

  let editingId = null;
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");
  const submitButton = form.querySelector('button[type="submit"]');

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
        cancelButton.hidden = false;
        submitButton.textContent = "開催場所を更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    (error) => {
      console.error("[admin-venues] venues購読に失敗しました", error);
      showAdminStatus(statusEl, "開催場所一覧の取得に失敗しました。", "error");
    },
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    form.reset();
    form.elements.displayOrder.value = "100";
    form.elements.isActive.checked = true;
    cancelButton.hidden = true;
    submitButton.textContent = "開催場所を保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const payload = buildVenuePayload(new FormData(form));
      if (editingId) {
        await updateDoc(doc(db, "venues", editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(venuesRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      form.reset();
      form.elements.displayOrder.value = "100";
      form.elements.isActive.checked = true;
      editingId = null;
      cancelButton.hidden = true;
      submitButton.textContent = "開催場所を保存";
      showAdminStatus(statusEl, "開催場所を保存しました。", "success");
    } catch (error) {
      console.error("[admin-venues] 保存に失敗しました", error);
      showAdminStatus(statusEl, "開催場所の保存に失敗しました。", "error");
    } finally {
      submitButton.disabled = false;
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
    imageUrl: formData.get("imageUrl")?.toString().trim() ?? "",
    mapUrl: formData.get("mapUrl")?.toString().trim() ?? "",
    accessNote: formData.get("accessNote")?.toString().trim() ?? "",
    note: formData.get("note")?.toString().trim() ?? "",
    displayOrder: Number.isNaN(displayOrder) ? 100 : displayOrder,
    isActive: formData.get("isActive") === "on",
  };
}

function renderVenues(venues, onEdit) {
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
      <button class="button button--secondary" type="button">編集</button>
    `;
    article.querySelector("button").addEventListener("click", () => onEdit(venueItem));
    listEl.appendChild(article);
  });
}

function fillForm(venueItem) {
  form.elements.name.value = venueItem.name || "";
  form.elements.address.value = venueItem.address || "";
  form.elements.area.value = venueItem.area || "";
  form.elements.venueType.value = venueItem.venueType === "indoor" ? "indoor" : "outdoor";
  form.elements.imageUrl.value = venueItem.imageUrl || "";
  form.elements.mapUrl.value = venueItem.mapUrl || "";
  form.elements.accessNote.value = venueItem.accessNote || "";
  form.elements.note.value = venueItem.note || "";
  form.elements.displayOrder.value = venueItem.displayOrder ?? 100;
  form.elements.isActive.checked = venueItem.isActive !== false;
}

function venueTypeLabel(value) {
  return value === "indoor" ? "屋内会場" : "屋外会場";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
