// イベント管理画面。
// Firestore events コレクションへ、公開サイトとお問い合わせフォームで使う日程を登録する。

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

const form = document.querySelector("[data-admin-event-form]");
const listEl = document.querySelector("[data-admin-events-list]");
const statusEl = document.querySelector("[data-admin-status]");
const venueSelect = document.querySelector("[data-admin-venue-select]");

if (form && listEl && venueSelect) {
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
    deleteField,
    deleteDoc,
    serverTimestamp,
    Timestamp,
  } = firestore;
  const db = getFirestore(app);
  const eventsRef = collection(db, "events");
  const venuesRef = collection(db, "venues");

  let editingId = null;
  let eventsCache = [];
  let venuesCache = [];
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");
  const submitButton = form.querySelector('button[type="submit"]');

  function rerenderEvents() {
    renderEvents(eventsCache, venueMapFrom(venuesCache), (eventItem) => {
      fillForm(eventItem);
      editingId = eventItem.id;
      cancelButton.hidden = false;
      submitButton.textContent = "イベントを更新";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, async (eventItem) => {
      if (!confirmDelete("イベント", formatEventHeading(eventItem, venueMapFrom(venuesCache).get(eventItem.venueId)))) return;
      try {
        await deleteDoc(doc(db, "events", eventItem.id));
        if (editingId === eventItem.id) {
          editingId = null;
          form.reset();
          cancelButton.hidden = true;
          submitButton.textContent = "イベントを保存";
        }
        showAdminStatus(statusEl, "イベントを削除しました。", "success");
      } catch (error) {
        console.error("[admin-events] 削除に失敗しました", error);
        showAdminStatus(statusEl, "イベントの削除に失敗しました。", "error");
      }
    });
  }

  onSnapshot(
    query(venuesRef, orderBy("displayOrder", "asc")),
    (snapshot) => {
      venuesCache = snapshot.docs.map((venueDoc) => ({
        id: venueDoc.id,
        ...venueDoc.data(),
      }));
      renderVenueOptions(venuesCache);
      rerenderEvents();
    },
    (error) => {
      console.error("[admin-events] venues購読に失敗しました", error);
      showAdminStatus(statusEl, "開催場所一覧の取得に失敗しました。", "error");
    },
  );

  onSnapshot(
    query(eventsRef, orderBy("eventDate", "asc")),
    (snapshot) => {
      eventsCache = snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      }));
      rerenderEvents();
    },
    (error) => {
      console.error("[admin-events] events購読に失敗しました", error);
      showAdminStatus(statusEl, "イベント一覧の取得に失敗しました。", "error");
    },
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    form.reset();
    cancelButton.hidden = true;
    submitButton.textContent = "イベントを保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    let submitLabel = submitButton.textContent.trim() || "イベントを保存";
    setAdminButtonLoading(submitButton, "保存中…");
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const payload = buildEventPayload(new FormData(form), Timestamp);
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), {
          ...payload,
          title: deleteField(),
          description: deleteField(),
          locationName: deleteField(),
          locationAddress: deleteField(),
          capacity: deleteField(),
          belongings: deleteField(),
          isPublished: deleteField(),
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
      submitLabel = "イベントを保存";
      showAdminStatus(statusEl, "イベントを保存しました。", "success");
    } catch (error) {
      console.error("[admin-events] 保存に失敗しました", error);
      showAdminStatus(statusEl, "イベントの保存に失敗しました。", "error");
    } finally {
      clearAdminButtonLoading(submitButton, submitLabel);
    }
  });
}

function buildEventPayload(formData, Timestamp) {
  const dateValue = formData.get("eventDate")?.toString() ?? "";
  const eventDate = dateValue ? Timestamp.fromDate(new Date(`${dateValue}T00:00:00+09:00`)) : null;

  return {
    eventDate,
    startTime: formData.get("startTime")?.toString().trim() ?? "",
    endTime: formData.get("endTime")?.toString().trim() ?? "",
    venueId: formData.get("venueId")?.toString().trim() ?? "",
    fee: formData.get("fee")?.toString().trim() ?? "",
    rainPolicy: formData.get("rainPolicy")?.toString().trim() ?? "",
    status: formData.get("status")?.toString() ?? "scheduled",
  };
}

function renderVenueOptions(venues) {
  const currentValue = venueSelect.value;
  const activeVenues = venues.filter((venue) => venue.isActive !== false);
  venueSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = activeVenues.length
    ? "開催場所を選択してください"
    : "有効な開催場所がありません";
  venueSelect.appendChild(placeholder);

  activeVenues.forEach((venue) => {
    const option = document.createElement("option");
    option.value = venue.id;
    option.textContent = `${venue.name || "名称未設定"}${venue.area ? ` / ${venue.area}` : ""}`;
    venueSelect.appendChild(option);
  });

  if (currentValue && Array.from(venueSelect.options).some((option) => option.value === currentValue)) {
    venueSelect.value = currentValue;
  }
}

function renderEvents(events, venuesById, onEdit, onDelete) {
  listEl.innerHTML = "";
  if (!events.length) {
    listEl.innerHTML = '<p class="admin-empty">登録済みのイベントはありません。</p>';
    return;
  }

  events.forEach((eventItem) => {
    const venue = venuesById.get(eventItem.venueId);
    const article = document.createElement("article");
    article.className = "admin-list-item";
    article.innerHTML = `
      <div>
        <p class="admin-item-meta">${formatDate(eventItem.eventDate)} / ${escapeHtml(
          venue?.name || legacyLocationName(eventItem),
        )}</p>
        <h3>${escapeHtml(formatEventHeading(eventItem, venue))}</h3>
        <p>${escapeHtml(buildEventDescription(eventItem, venue))}</p>
        <div class="admin-chip-row">
          <span class="status-chip">${escapeHtml(statusLabel(eventItem.status))}</span>
          <span class="status-chip">参加費: ${escapeHtml(eventItem.fee || "未設定")}</span>
          <span class="status-chip">${venue ? "開催場所連携済み" : "開催場所未選択"}</span>
        </div>
      </div>
      <div class="admin-item-actions">
        <button class="button button--secondary" type="button" data-admin-edit>編集</button>
        <button class="button button--danger" type="button" data-admin-delete>削除</button>
      </div>
    `;
    article.querySelector("[data-admin-edit]").addEventListener("click", () => onEdit(eventItem));
    article.querySelector("[data-admin-delete]").addEventListener("click", () => onDelete(eventItem));
    listEl.appendChild(article);
  });
}

function fillForm(eventItem) {
  form.elements.eventDate.value = toDateInputValue(eventItem.eventDate);
  form.elements.startTime.value = eventItem.startTime || "";
  form.elements.endTime.value = eventItem.endTime || "";
  form.elements.venueId.value = eventItem.venueId || "";
  form.elements.fee.value = eventItem.fee || "";
  form.elements.rainPolicy.value = eventItem.rainPolicy || "";
  form.elements.status.value = normalizeStatus(eventItem.status);
}

function venueMapFrom(venues) {
  return new Map(venues.map((venue) => [venue.id, venue]));
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

function formatEventHeading(eventItem, venue) {
  const date = formatDate(eventItem.eventDate);
  if (venue?.name) return `${date} ${venue.name}`;
  return `${date} 開催場所未選択`;
}

function buildEventDescription(eventItem, venue) {
  const parts = [];
  const timeLabel = formatTimeRange(eventItem.startTime, eventItem.endTime);
  if (timeLabel) parts.push(timeLabel);
  if (venue?.address) parts.push(venue.address);
  if (!venue && eventItem.locationAddress) parts.push(eventItem.locationAddress);
  if (!parts.length) return "時間や会場の詳細は未設定です。";
  return parts.join(" / ");
}

function legacyLocationName(eventItem) {
  return eventItem.locationName || "開催場所未選択";
}

function formatTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${startTime}開始`;
  if (endTime) return `${endTime}終了`;
  return "";
}

function normalizeStatus(status) {
  if (status === "preparing") return "scheduled";
  if (status === "canceled") return "canceled";
  if (status === "closed") return "closed";
  if (status === "finished") return "finished";
  return "scheduled";
}

function statusLabel(status) {
  const labels = {
    scheduled: "開催予定",
    preparing: "準備中",
    closed: "受付終了",
    finished: "開催済み",
    canceled: "中止",
  };
  return labels[status] || "未設定";
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
