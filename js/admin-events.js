// イベント管理画面。
// Firestore events コレクションへ、公開サイトとお問い合わせフォームで使う日程を登録する。

import {
  FIRESTORE_MODULE_URL,
  clearAdminStatus,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const form = document.querySelector("[data-admin-event-form]");
const listEl = document.querySelector("[data-admin-events-list]");
const statusEl = document.querySelector("[data-admin-status]");

if (form && listEl) {
  initEventsPage().catch((error) => {
    console.error("[admin-events] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "イベント管理画面の初期化に失敗しました。", "error");
  });
}

async function initEventsPage() {
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
  const eventsRef = collection(db, "events");

  let editingId = null;
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");

  onSnapshot(
    query(eventsRef, orderBy("eventDate", "asc")),
    (snapshot) => {
      const events = snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      }));
      renderEvents(events, async (eventItem) => {
        fillForm(eventItem);
        editingId = eventItem.id;
        cancelButton.hidden = false;
        form.querySelector('button[type="submit"]').textContent = "イベントを更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    (error) => {
      console.error("[admin-events] events購読に失敗しました", error);
      showAdminStatus(statusEl, "イベント一覧の取得に失敗しました。", "error");
    }
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    form.reset();
    cancelButton.hidden = true;
    form.querySelector('button[type="submit"]').textContent = "イベントを保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const payload = buildEventPayload(new FormData(form), Timestamp, serverTimestamp);
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(eventsRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      form.reset();
      editingId = null;
      cancelButton.hidden = true;
      submitButton.textContent = "イベントを保存";
      showAdminStatus(statusEl, "イベントを保存しました。", "success");
    } catch (error) {
      console.error("[admin-events] 保存に失敗しました", error);
      showAdminStatus(statusEl, "イベントの保存に失敗しました。", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

function buildEventPayload(formData, Timestamp) {
  const dateValue = formData.get("eventDate")?.toString() ?? "";
  const eventDate = dateValue ? Timestamp.fromDate(new Date(`${dateValue}T00:00:00+09:00`)) : null;
  const capacity = Number.parseInt(formData.get("capacity")?.toString() ?? "", 10);

  return {
    title: formData.get("title")?.toString().trim() ?? "",
    description: formData.get("description")?.toString().trim() ?? "",
    eventDate,
    startTime: formData.get("startTime")?.toString().trim() ?? "",
    endTime: formData.get("endTime")?.toString().trim() ?? "",
    locationName: formData.get("locationName")?.toString().trim() ?? "",
    locationAddress: formData.get("locationAddress")?.toString().trim() ?? "",
    fee: formData.get("fee")?.toString().trim() ?? "",
    capacity: Number.isNaN(capacity) ? null : capacity,
    belongings: formData.get("belongings")?.toString().trim() ?? "",
    rainPolicy: formData.get("rainPolicy")?.toString().trim() ?? "",
    status: formData.get("status")?.toString() ?? "scheduled",
    isPublished: formData.get("isPublished") === "on",
  };
}

function renderEvents(events, onEdit) {
  listEl.innerHTML = "";
  if (!events.length) {
    listEl.innerHTML = '<p class="admin-empty">登録済みのイベントはありません。</p>';
    return;
  }

  events.forEach((eventItem) => {
    const article = document.createElement("article");
    article.className = "admin-list-item";
    article.innerHTML = `
      <div>
        <p class="admin-item-meta">${formatDate(eventItem.eventDate)} / ${escapeHtml(
          eventItem.locationName || "場所未定"
        )}</p>
        <h3>${escapeHtml(eventItem.title || "無題のイベント")}</h3>
        <p>${escapeHtml(eventItem.description || "説明文は未入力です。")}</p>
        <div class="admin-chip-row">
          <span class="status-chip">${eventItem.isPublished ? "公開中" : "非公開"}</span>
          <span class="status-chip">${escapeHtml(statusLabel(eventItem.status))}</span>
          <span class="status-chip">参加費: ${escapeHtml(eventItem.fee || "未設定")}</span>
        </div>
      </div>
      <button class="button button--secondary" type="button">編集</button>
    `;
    article.querySelector("button").addEventListener("click", () => onEdit(eventItem));
    listEl.appendChild(article);
  });
}

function fillForm(eventItem) {
  form.elements.title.value = eventItem.title || "";
  form.elements.description.value = eventItem.description || "";
  form.elements.eventDate.value = toDateInputValue(eventItem.eventDate);
  form.elements.startTime.value = eventItem.startTime || "";
  form.elements.endTime.value = eventItem.endTime || "";
  form.elements.locationName.value = eventItem.locationName || "";
  form.elements.locationAddress.value = eventItem.locationAddress || "";
  form.elements.fee.value = eventItem.fee || "";
  form.elements.capacity.value = eventItem.capacity ?? "";
  form.elements.belongings.value = eventItem.belongings || "";
  form.elements.rainPolicy.value = eventItem.rainPolicy || "";
  form.elements.status.value = eventItem.status || "scheduled";
  form.elements.isPublished.checked = Boolean(eventItem.isPublished);
}

function toDateInputValue(value) {
  const date = normalizeDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const date = normalizeDate(value);
  if (!date) return "日程未定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusLabel(status) {
  const labels = {
    scheduled: "開催予定",
    preparing: "準備中",
    closed: "受付終了",
    finished: "開催済み",
  };
  return labels[status] || "未設定";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

