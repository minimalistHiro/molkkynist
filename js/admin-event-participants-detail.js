// イベント参加者詳細画面。
// URL の eventId に紐づく参加希望者を、名前だけの一覧と開閉式詳細で表示する。

import {
  FIRESTORE_MODULE_URL,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const summaryEl = document.querySelector("[data-admin-participant-event-summary]");
const listEl = document.querySelector("[data-admin-participant-list]");
const statusEl = document.querySelector("[data-admin-status]");

if (summaryEl && listEl) {
  initEventParticipantsDetailPage().catch((error) => {
    console.error("[admin-event-participants-detail] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "イベント参加者詳細の初期化に失敗しました。", "error");
  });
}

async function initEventParticipantsDetailPage() {
  const context = await requireAdmin(statusEl);
  if (!context) return;
  await initLogoutButtons();

  const eventId = readEventId();
  if (!eventId) {
    renderMissingEventId();
    return;
  }

  const app = await getAdminApp();
  const firestore = await import(FIRESTORE_MODULE_URL);
  const { getFirestore, collection, doc, query, where, orderBy, onSnapshot } = firestore;
  const db = getFirestore(app);

  let eventItem = null;
  let eventExists = true;
  let venues = [];
  let submissions = [];

  function renderCurrentState() {
    const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
    const venue = eventItem ? venuesById.get(eventItem.venueId) : null;
    const participants = participantsForEvent(submissions, eventId);

    renderEventSummary(eventItem, venue, participants, eventExists);
    renderParticipants(participants, eventExists);
  }

  onSnapshot(
    doc(db, "events", eventId),
    (snapshot) => {
      eventExists = snapshot.exists();
      eventItem = eventExists ? normalizeEvent(snapshot.id, snapshot.data()) : null;
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants-detail] event取得に失敗しました", error);
      showAdminStatus(statusEl, "イベント情報の取得に失敗しました。", "error");
    },
  );

  onSnapshot(
    query(collection(db, "venues"), orderBy("displayOrder", "asc")),
    (snapshot) => {
      venues = snapshot.docs.map((venueDoc) => normalizeVenue(venueDoc.id, venueDoc.data()));
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants-detail] venues購読に失敗しました", error);
      showAdminStatus(statusEl, "開催場所一覧の取得に失敗しました。", "error");
    },
  );

  onSnapshot(
    query(collection(db, "contactSubmissions"), where("inquiryType", "==", "participate")),
    (snapshot) => {
      submissions = snapshot.docs
        .map((submissionDoc) => normalizeSubmission(submissionDoc.id, submissionDoc.data()))
        .filter(Boolean)
        .sort((a, b) => compareCreatedAtDesc(a.createdAt, b.createdAt));
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants-detail] contactSubmissions購読に失敗しました", error);
      showAdminStatus(statusEl, "参加希望データの取得に失敗しました。", "error");
    },
  );
}

function renderMissingEventId() {
  summaryEl.innerHTML = '<p class="admin-empty">イベントIDが指定されていません。</p>';
  listEl.innerHTML = "";
}

function renderEventSummary(eventItem, venue, participants, eventExists) {
  if (!eventExists) {
    summaryEl.innerHTML = '<p class="admin-empty">指定されたイベントが見つかりません。</p>';
    return;
  }

  if (!eventItem) {
    summaryEl.innerHTML = '<p class="admin-empty">イベント情報を読み込んでいます。</p>';
    return;
  }

  summaryEl.innerHTML = `
    <div class="admin-detail-heading">
      <div>
        <p class="admin-item-meta">${escapeHtml(formatDate(eventItem.date))}</p>
        <h2>${escapeHtml(venue?.name || eventItem.locationName || "開催場所未定")}</h2>
        <p>${escapeHtml(buildEventSummary(eventItem, venue))}</p>
      </div>
      <span class="status-chip">${participants.length}名</span>
    </div>
  `;
}

function renderParticipants(participants, eventExists) {
  if (!eventExists) {
    listEl.innerHTML = "";
    return;
  }

  if (!participants.length) {
    listEl.innerHTML = '<p class="admin-empty">このイベントの参加希望者はまだいません。</p>';
    return;
  }

  listEl.innerHTML = participants.map((participant) => participantAccordionHtml(participant)).join("");
}

function participantAccordionHtml(participant) {
  const name = participant.name || "名前未入力";
  return `
    <details class="admin-participant-accordion">
      <summary>
        <span class="admin-participant-accordion__name">${escapeHtml(name)}</span>
        <span class="admin-participant-accordion__chevron" aria-hidden="true"></span>
      </summary>
      <dl class="admin-detail-list admin-detail-list--compact admin-participant-accordion__details">
        <div>
          <dt>メールアドレス</dt>
          <dd>${escapeHtml(participant.email || "未入力")}</dd>
        </div>
        <div>
          <dt>電話番号</dt>
          <dd>${escapeHtml(participant.phone || "未入力")}</dd>
        </div>
        <div>
          <dt>一言・ご質問</dt>
          <dd><pre class="admin-message">${escapeHtml(participant.message || "記載はありません。")}</pre></dd>
        </div>
        <div>
          <dt>申込日時</dt>
          <dd>${escapeHtml(formatDateTime(participant.createdAt))}</dd>
        </div>
      </dl>
    </details>
  `;
}

function readEventId() {
  return new URLSearchParams(window.location.search).get("eventId")?.trim() || "";
}

function normalizeEvent(id, data = {}) {
  return {
    id,
    date: normalizeDate(data.eventDate),
    startTime: stringValue(data.startTime),
    endTime: stringValue(data.endTime),
    venueId: stringValue(data.venueId),
    fee: stringValue(data.fee),
    locationName: stringValue(data.locationName),
    locationAddress: stringValue(data.locationAddress),
  };
}

function normalizeVenue(id, data = {}) {
  return {
    id,
    name: stringValue(data.name),
    address: stringValue(data.address),
    area: stringValue(data.area),
    venueType: data.venueType === "indoor" ? "indoor" : "outdoor",
  };
}

function normalizeSubmission(id, data = {}) {
  const selectedEventIds = Array.isArray(data.selectedEventIds)
    ? data.selectedEventIds.map((value) => stringValue(value)).filter(Boolean)
    : [];

  if (!selectedEventIds.length) return null;

  return {
    id,
    name: stringValue(data.name),
    email: stringValue(data.email),
    phone: stringValue(data.phone),
    message: stringValue(data.message),
    selectedEventIds,
    createdAt: data.createdAt,
  };
}

function participantsForEvent(submissions, eventId) {
  return submissions.filter((submission) => submission.selectedEventIds.includes(eventId));
}

function buildEventSummary(eventItem, venue) {
  const parts = [buildDateTimeLabel(eventItem).replace(/\n/g, " / ")];
  if (venue?.address) parts.push(venue.address);
  if (!venue && eventItem.locationAddress) parts.push(eventItem.locationAddress);
  if (eventItem.fee) parts.push(`参加費: ${eventItem.fee}`);
  return parts.filter(Boolean).join(" / ");
}

function buildDateTimeLabel(eventItem) {
  const timeLabel = formatTimeRange(eventItem.startTime, eventItem.endTime);
  if (!timeLabel) return formatDate(eventItem.date);
  return `${formatDate(eventItem.date)}\n${timeLabel}`;
}

function formatDate(date) {
  if (!date) return "日程未定";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${
    WEEKDAY_LABELS[date.getDay()]
  }）`;
}

function formatDateTime(value) {
  if (!value) return "申込日時未取得";
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "申込日時未取得";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return "申込日時未取得";
  }
}

function compareCreatedAtDesc(a, b) {
  const dateA = normalizeDate(a)?.getTime() ?? 0;
  const dateB = normalizeDate(b)?.getTime() ?? 0;
  return dateB - dateA;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${startTime}開始`;
  if (endTime) return `${endTime}終了`;
  return "";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
