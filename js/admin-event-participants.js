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
const detailEl = document.querySelector("[data-admin-participant-detail]");
const eventsStatusEl = document.querySelector("[data-admin-participants-events-status]");
const statusEl = document.querySelector("[data-admin-status]");

if (eventsListEl && detailEl) {
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
  let selectedEventId = null;

  function renderCurrentState() {
    if (!selectedEventId && events.length) {
      selectedEventId = events[0].id;
    }

    const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
    renderEvents(events, venuesById, submissions, selectedEventId);
    renderParticipants(getSelectedEvent(events, selectedEventId), venuesById, submissions);
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

      if (selectedEventId && !events.some((eventItem) => eventItem.id === selectedEventId)) {
        selectedEventId = null;
      }

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
        .filter(Boolean)
        .sort((a, b) => compareCreatedAtDesc(a.createdAt, b.createdAt));
      renderCurrentState();
    },
    (error) => {
      console.error("[admin-event-participants] contactSubmissions購読に失敗しました", error);
      showAdminStatus(statusEl, "参加希望データの取得に失敗しました。", "error");
    },
  );

  eventsListEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-participant-event-id]");
    if (!button) return;
    selectedEventId = button.dataset.adminParticipantEventId;
    renderCurrentState();
  });
}

function renderEvents(events, venuesById, submissions, selectedEventId) {
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

    const button = document.createElement("button");
    button.type = "button";
    button.className = `venue-card schedule-event-card admin-participant-event-card${
      eventItem.id === selectedEventId ? " is-active" : ""
    }`;
    button.dataset.adminParticipantEventId = eventItem.id;
    button.innerHTML = `
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
        </span>
      </span>
    `;

    li.appendChild(button);
    eventsListEl.appendChild(li);
  });
}

function renderParticipants(eventItem, venuesById, submissions) {
  if (!eventItem) {
    detailEl.innerHTML = '<p class="admin-empty">左のイベントを選択してください。</p>';
    return;
  }

  const venue = venuesById.get(eventItem.venueId);
  const participants = participantsForEvent(submissions, eventItem.id);

  detailEl.innerHTML = `
    <div class="admin-detail-heading">
      <div>
        <p class="admin-item-meta">${escapeHtml(formatDate(eventItem.date))}</p>
        <h2>${escapeHtml(venue?.name || eventItem.locationName || "開催場所未定")}</h2>
        <p>${escapeHtml(buildEventSummary(eventItem, venue))}</p>
      </div>
      <span class="status-chip">${participants.length}名</span>
    </div>
    <div class="admin-participant-list" data-admin-participant-list>
      ${
        participants.length
          ? participants.map((participant) => participantHtml(participant)).join("")
          : '<p class="admin-empty">このイベントの参加希望者はまだいません。</p>'
      }
    </div>
  `;
}

function participantHtml(participant) {
  return `
    <article class="admin-participant-item">
      <div class="admin-participant-item__heading">
        <div>
          <p class="admin-item-meta">${escapeHtml(formatDateTime(participant.createdAt))}</p>
          <h3>${escapeHtml(participant.name || "名前未入力")}</h3>
        </div>
        <span class="status-chip">${escapeHtml(responseStatusLabel(participant.responseStatus))}</span>
      </div>
      <dl class="admin-detail-list admin-detail-list--compact">
        <div>
          <dt>メールアドレス</dt>
          <dd>${escapeHtml(participant.email || "未入力")}</dd>
        </div>
        <div>
          <dt>電話番号</dt>
          <dd>${escapeHtml(participant.phone || "未入力")}</dd>
        </div>
        <div>
          <dt>住所</dt>
          <dd>${escapeHtml(participant.address || "未取得")}</dd>
        </div>
        <div>
          <dt>一言・ご質問</dt>
          <dd><pre class="admin-message">${escapeHtml(participant.message || "記載はありません。")}</pre></dd>
        </div>
      </dl>
    </article>
  `;
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
    name: stringValue(data.name),
    email: stringValue(data.email),
    phone: stringValue(data.phone),
    address: stringValue(data.address),
    message: stringValue(data.message),
    responseStatus: stringValue(data.responseStatus),
    selectedEventIds,
    createdAt: data.createdAt,
  };
}

function getSelectedEvent(events, selectedEventId) {
  if (!events.length) return null;
  return events.find((eventItem) => eventItem.id === selectedEventId) || events[0];
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

function buildEventSummary(eventItem, venue) {
  const parts = [buildDateTimeLabel(eventItem).replace(/\n/g, " / ")];
  if (venue?.address) parts.push(venue.address);
  if (eventItem.fee) parts.push(`参加費: ${eventItem.fee}`);
  return parts.filter(Boolean).join(" / ");
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

function venueTypeLabel(value) {
  return value === "indoor" ? "屋内会場" : "屋外会場";
}

function responseStatusLabel(value) {
  const labels = {
    unhandled: "未対応",
    in_progress: "対応中",
    done: "対応済み",
  };
  return labels[value] || "未対応";
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
