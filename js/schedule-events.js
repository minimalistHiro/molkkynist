// トップページ「開催スケジュール」の直近イベントカード一覧。
// Firestore の events から公開済みの今後のイベントを最大4件取得し、会場カードUIで表示する。

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
    const events = await fetchUpcomingEvents();
    setStatus(container, "");
    renderEvents(listEl, events);
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

  const q = query(
    collection(db, "events"),
    where("isPublished", "==", true),
    where("eventDate", ">=", Timestamp.fromDate(today)),
    orderBy("eventDate", "asc"),
    limit(MAX_EVENTS)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => normalizeEvent(doc.id, doc.data()))
    .filter(Boolean);
}

function normalizeEvent(id, data = {}) {
  const date = normalizeDate(data.eventDate);
  if (!date) return null;
  return {
    id,
    date,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    startTime: typeof data.startTime === "string" ? data.startTime : "",
    endTime: typeof data.endTime === "string" ? data.endTime : "",
    locationName: typeof data.locationName === "string" ? data.locationName : "",
    locationAddress: typeof data.locationAddress === "string" ? data.locationAddress : "",
    status: typeof data.status === "string" ? data.status : "",
  };
}

function renderEvents(listEl, events) {
  listEl.innerHTML = "";

  if (!events.length) {
    renderEmpty(listEl, "現在受付中の開催予定はありません。");
    return;
  }

  events.forEach((eventItem) => {
    listEl.appendChild(createEventCard(eventItem));
  });
}

function createEventCard(eventItem) {
  const li = document.createElement("li");
  li.className = "venue-card schedule-event-card";

  const visual = document.createElement("div");
  visual.className = "venue-card__visual schedule-event-card__visual";
  visual.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "venue-card__content";

  const body = document.createElement("div");
  body.className = "venue-card__body";

  const meta = document.createElement("div");
  meta.className = "venue-card__meta";
  appendChip(meta, statusLabel(eventItem.status));
  appendChip(meta, formatDate(eventItem.date));

  const title = document.createElement("h3");
  title.textContent = eventItem.title || "モルック体験会";

  const details = document.createElement("address");
  details.textContent = buildEventDetail(eventItem);

  body.append(meta, title, details);

  if (eventItem.description) {
    const description = document.createElement("p");
    description.className = "schedule-event-card__description";
    description.textContent = eventItem.description;
    body.appendChild(description);
  }

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

function buildEventDetail(eventItem) {
  const parts = [];
  const timeLabel = formatTimeRange(eventItem.startTime, eventItem.endTime);
  if (timeLabel) parts.push(timeLabel);
  if (eventItem.locationName) parts.push(eventItem.locationName);
  if (eventItem.locationAddress) parts.push(eventItem.locationAddress);
  if (!parts.length) return "会場情報は確定次第掲載します。";
  return parts.join(" / ");
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

function statusLabel(status) {
  const labels = {
    scheduled: "開催予定",
    accepting: "受付中",
    full: "満員",
    closed: "受付終了",
    canceled: "中止",
  };
  return labels[status] || "開催予定";
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
