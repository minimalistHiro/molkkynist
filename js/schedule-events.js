// トップページ「開催スケジュール」の直近イベントカード一覧。
// events の開催日程と venues の会場情報を組み合わせて表示する。

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const MAX_EVENTS = 4;
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const root = document.querySelector("[data-schedule-events]");

if (root) {
  initScheduleEvents(root).catch((error) => {
    console.error("[schedule-events] 初期化に失敗しました", error);
    setStatus(root, "開催予定の表示に失敗しました。時間をおいて再度お試しください。");
  });
}

async function initScheduleEvents(container) {
  const listEl = container.querySelector("[data-schedule-events-list]");
  if (!listEl) return;

  if (!isFirebaseConfigured(firebaseConfig)) {
    renderEmpty(listEl, "イベント情報は管理画面からの登録後に表示されます。");
    setStatus(container, "");
    return;
  }

  setStatus(container, "開催予定を読み込んでいます…");

  try {
    const { events, venuesById } = await fetchUpcomingEvents();
    setStatus(container, "");
    renderEvents(listEl, events, venuesById);
  } catch (error) {
    console.error("[schedule-events] イベント取得に失敗しました", error);
    listEl.innerHTML = "";
    setStatus(container, "開催予定の取得に失敗しました。");
  }
}

async function fetchUpcomingEvents() {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import(APP_MODULE_URL),
    import(FIRESTORE_MODULE_URL),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } = firestore;
  const db = getFirestore(app);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [eventsSnapshot, venuesSnapshot] = await Promise.all([
    getDocs(
      query(
        collection(db, "events"),
        where("status", "==", "scheduled"),
        where("eventDate", ">=", Timestamp.fromDate(today)),
        orderBy("eventDate", "asc"),
        limit(MAX_EVENTS),
      ),
    ),
    getDocs(
      query(
        collection(db, "venues"),
        where("isActive", "==", true),
        orderBy("displayOrder", "asc"),
      ),
    ),
  ]);

  const venuesById = new Map(
    venuesSnapshot.docs.map((venueDoc) => [venueDoc.id, normalizeVenue(venueDoc.id, venueDoc.data())]),
  );
  const events = eventsSnapshot.docs
    .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
    .filter(Boolean);

  return { events, venuesById };
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
    status: stringValue(data.status),
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
    mapUrl: stringValue(data.mapUrl),
    accessNote: stringValue(data.accessNote),
  };
}

function renderEvents(listEl, events, venuesById) {
  listEl.innerHTML = "";

  const visibleEvents = events.filter((eventItem) => {
    if (!eventItem.venueId) return true;
    return venuesById.has(eventItem.venueId);
  });

  if (!visibleEvents.length) {
    renderEmpty(listEl, "現在受付中の開催予定はありません。");
    return;
  }

  visibleEvents.forEach((eventItem) => {
    listEl.appendChild(createEventCard(eventItem, venuesById.get(eventItem.venueId)));
  });
}

function createEventCard(eventItem, venue) {
  const li = document.createElement("li");
  li.className = "venue-card schedule-event-card";

  const visual = document.createElement("div");
  visual.className = "venue-card__visual schedule-event-card__visual";
  visual.setAttribute("aria-hidden", "true");
  if (venue?.imageUrl) {
    const image = document.createElement("img");
    image.className = "schedule-event-card__image";
    image.src = venue.imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    visual.appendChild(image);
  }

  const content = document.createElement("div");
  content.className = "venue-card__content";

  const body = document.createElement("div");
  body.className = "venue-card__body";

  const dateTime = document.createElement("div");
  dateTime.className = "schedule-event-card__datetime";
  dateTime.textContent = buildDateTimeLabel(eventItem);

  const meta = document.createElement("div");
  meta.className = "venue-card__meta";
  appendChip(meta, venueTypeLabel(venue?.venueType));
  appendChip(meta, venue?.area);

  const title = document.createElement("h3");
  title.textContent = venue?.name || eventItem.locationName || "開催場所未定";

  const details = document.createElement("address");
  details.className = "schedule-event-card__details";
  appendEventDetail(details, eventItem, venue);

  body.append(dateTime, meta, title, details);

  const button = document.createElement("a");
  button.className = "button button--green venue-card__join-button";
  button.href = buildContactUrl(eventItem);
  button.textContent = "イベントに参加する";

  content.append(body, button);
  li.append(visual, content);
  return li;
}

function appendChip(parent, label) {
  if (!label) return;
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = label;
  parent.appendChild(chip);
}

function appendEventDetail(parent, eventItem, venue) {
  const address = venue?.address || (!venue ? eventItem.locationAddress : "");
  const note = venue?.accessNote || "";

  if (!address && !note) {
    parent.textContent = "会場情報は確定次第掲載します。";
    return;
  }

  if (address) {
    const addressLine = document.createElement("span");
    addressLine.className = "schedule-event-card__address";
    addressLine.textContent = address;
    parent.appendChild(addressLine);
  }

  if (note) {
    const noteLine = document.createElement("span");
    noteLine.className = "schedule-event-card__note";
    noteLine.textContent = note;
    parent.appendChild(noteLine);
  }
}

function buildContactUrl(eventItem) {
  const params = new URLSearchParams({
    type: "participate",
    eventId: eventItem.id,
    eventDate: toDateKey(eventItem.date),
  });
  return `contact.html?${params.toString()}#contact-form`;
}

function renderEmpty(listEl, message) {
  listEl.innerHTML = "";
  const li = document.createElement("li");
  li.className = "schedule-events__empty";
  li.textContent = message;
  listEl.appendChild(li);
}

function setStatus(container, message) {
  const statusEl = container.querySelector("[data-schedule-events-status]");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${
    WEEKDAY_LABELS[date.getDay()]
  }）`;
}

function formatTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${startTime}開始`;
  if (endTime) return `${endTime}終了`;
  return "";
}

function buildDateTimeLabel(eventItem) {
  const timeLabel = formatTimeRange(eventItem.startTime, eventItem.endTime);
  if (!timeLabel) return formatDate(eventItem.date);
  return `${formatDate(eventItem.date)} ${timeLabel}`;
}

function venueTypeLabel(value) {
  return value === "indoor" ? "屋内会場" : "屋外会場";
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
