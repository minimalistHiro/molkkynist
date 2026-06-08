// イベント参加者一覧画面。
// contactSubmissions の参加希望データを、イベント別に集計して表示する。

import {
  FIRESTORE_MODULE_URL,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const eventsListEl = document.querySelector("[data-admin-participant-events]");
const eventsStatusEl = document.querySelector("[data-admin-participants-events-status]");
const statusEl = document.querySelector("[data-admin-status]");

if (eventsListEl) {
  initEventParticipantsPage().catch((error) => {
    console.error("[admin-event-participants] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "イベント参加者一覧の初期化に失敗しました。", "error");
  });
}

async function initEventParticipantsPage() {
  const context = await requireAdmin(statusEl);
  if (!context) return;
  await initLogoutButtons();

  const app = await getAdminApp();
  const firestore = await import(FIRESTORE_MODULE_URL);
  const {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
  } = firestore;
  const db = getFirestore(app);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let events = [];
  let venues = [];
  let submissions = [];

  function renderCurrentState() {
    const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
    renderEvents(events, venuesById, submissions);
  }

  onSnapshot(
    query(
      collection(db, "events"),
      where("status", "==", "scheduled"),
      where("eventDate", ">=", Timestamp.fromDate(today)),
      orderBy("eventDate", "asc"),
    ),
    (snapshot) => {
      events = snapshot.docs
        .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
        .filter(Boolean);
      setEventsStatus(events.length ? "" : "開催予定イベントはありません。");
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants] events購読に失敗しました", error);
      setEventsStatus("開催予定イベントの取得に失敗しました。");
      showAdminStatus(statusEl, "開催予定イベントの取得に失敗しました。", "error");
    },
  );

  onSnapshot(
    query(collection(db, "venues"), orderBy("displayOrder", "asc")),
    (snapshot) => {
      venues = snapshot.docs.map((venueDoc) => normalizeVenue(venueDoc.id, venueDoc.data()));
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants] venues購読に失敗しました", error);
      showAdminStatus(statusEl, "開催場所一覧の取得に失敗しました。", "error");
    },
  );

  onSnapshot(
    query(collection(db, "contactSubmissions"), where("inquiryType", "==", "participate")),
    (snapshot) => {
      submissions = snapshot.docs
        .map((submissionDoc) => normalizeSubmission(submissionDoc.id, submissionDoc.data()))
        .filter(Boolean);
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants] contactSubmissions購読に失敗しました", error);
      showAdminStatus(statusEl, "参加希望データの取得に失敗しました。", "error");
    },
  );
}

function renderEvents(events, venuesById, submissions) {
  eventsListEl.innerHTML = "";

  if (!events.length) {
    eventsListEl.innerHTML = '<li class="schedule-events__empty">開催予定イベントはありません。</li>';
    return;
  }

  events.forEach((eventItem) => {
    const venue = venuesById.get(eventItem.venueId);
    const participants = participantsForEvent(submissions, eventItem.id);
    const li = document.createElement("li");
    li.className = "admin-participant-event-item";

    const link = document.createElement("a");
    link.className = "venue-card schedule-event-card admin-participant-event-card";
    link.href = `event-participants-detail.html?eventId=${encodeURIComponent(eventItem.id)}`;
    link.setAttribute(
      "aria-label",
      `${formatDate(eventItem.date)} ${venue?.name || eventItem.locationName || "開催場所未定"}の参加者一覧を見る`,
    );
    link.innerHTML = `
      <span class="venue-card__visual schedule-event-card__visual admin-participant-event-card__visual" aria-hidden="true">
        ${venue?.imageUrl ? `<img class="schedule-event-card__image" src="${escapeHtml(venue.imageUrl)}" alt="" loading="lazy" decoding="async">` : ""}
      </span>
      <span class="venue-card__content">
        <span class="venue-card__body">
          <span class="schedule-event-card__datetime">${escapeHtml(buildDateTimeLabel(eventItem))}</span>
          <span class="venue-card__meta">
            ${chipHtml(venueTypeLabel(venue?.venueType))}
            ${chipHtml(venue?.area)}
            ${chipHtml(`参加人数: ${participants.length}名`)}
          </span>
          <strong class="admin-participant-event-card__title">${escapeHtml(
            venue?.name || eventItem.locationName || "開催場所未定",
          )}</strong>
          <span class="schedule-event-card__details">
            ${eventDetailsHtml(eventItem, venue)}
          </span>
          <span class="admin-participant-event-card__action">参加者一覧を見る</span>
        </span>
      </span>
    `;

    li.appendChild(link);
    eventsListEl.appendChild(li);
  });
}

function normalizeEvent(id, data = {}) {
  const date = normalizeDate(data.eventDate);
  if (!date) return null;
  return {
    id,
    date,
    startTime: stringValue(data.startTime),
    endTime: stringValue(data.endTime),
    venueId: stringValue(data.venueId),
    fee: stringValue(data.fee),
    rainPolicy: stringValue(data.rainPolicy),
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
    imageUrl: stringValue(data.imageUrl),
    accessNote: stringValue(data.accessNote),
  };
}

function normalizeSubmission(id, data = {}) {
  const selectedEventIds = Array.isArray(data.selectedEventIds)
    ? data.selectedEventIds.map((value) => stringValue(value)).filter(Boolean)
    : [];

  if (!selectedEventIds.length) return null;

  return {
    id,
    selectedEventIds,
  };
}

function participantsForEvent(submissions, eventId) {
  return submissions.filter((submission) => submission.selectedEventIds.includes(eventId));
}

function eventDetailsHtml(eventItem, venue) {
  const address = venue?.address || (!venue ? eventItem.locationAddress : "");
  const note = venue?.accessNote || "";
  const fee = eventItem.fee ? `参加費: ${eventItem.fee}` : "";
  const parts = [address, note, fee].filter(Boolean);
  if (!parts.length) return "会場情報は確定次第掲載します。";
  return parts.map((part) => `<span>${escapeHtml(part)}</span>`).join("");
}

function chipHtml(label) {
  if (!label) return "";
  return `<span class="chip">${escapeHtml(label)}</span>`;
}

function buildDateTimeLabel(eventItem) {
  const timeLabel = formatTimeRange(eventItem.startTime, eventItem.endTime);
  if (!timeLabel) return formatDate(eventItem.date);
  return `${formatDate(eventItem.date)}\n${timeLabel}`;
}

function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${
    WEEKDAY_LABELS[date.getDay()]
  }）`;
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

function venueTypeLabel(value) {
  return value === "indoor" ? "屋内会場" : "屋外会場";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function setEventsStatus(message) {
  if (!eventsStatusEl) return;
  eventsStatusEl.textContent = message;
  eventsStatusEl.hidden = !message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
