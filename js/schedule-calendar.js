// トップページ「次回イベント / 開催スケジュール」の月次カレンダー。
// Firestore の events から公開済みイベントを取得し、該当日をハイライトする。
// Firebase 未設定時や読み込み失敗時は、カレンダーのみ表示する安全側のフォールバック。

import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const root = document.querySelector("[data-schedule-calendar]");

if (root) {
  initCalendar(root).catch((error) => {
    console.error("[schedule-calendar] 初期化に失敗しました", error);
    setStatus(root, "カレンダーの表示に失敗しました。時間をおいて再度お試しください。");
  });
}

async function initCalendar(container) {
  const titleEl = container.querySelector("[data-calendar-title]");
  const gridEl = container.querySelector("[data-calendar-grid]");
  const eventsListEl = container.querySelector("[data-calendar-events]");
  const prevButton = container.querySelector("[data-calendar-prev]");
  const nextButton = container.querySelector("[data-calendar-next]");

  const today = startOfDay(new Date());
  const state = {
    cursor: new Date(today.getFullYear(), today.getMonth(), 1),
    eventsByDate: new Map(),
  };

  function render() {
    renderTitle(titleEl, state.cursor);
    renderGrid(gridEl, state.cursor, today, state.eventsByDate);
    renderEventsList(eventsListEl, state.cursor, state.eventsByDate);
  }

  prevButton.addEventListener("click", () => {
    state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1);
    render();
  });
  nextButton.addEventListener("click", () => {
    state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
    render();
  });

  render();

  if (!isFirebaseConfigured(firebaseConfig)) {
    setStatus(container, "イベント情報は管理画面からの登録後に表示されます。");
    return;
  }

  setStatus(container, "イベント情報を読み込み中…");
  try {
    const events = await fetchPublishedEvents();
    state.eventsByDate = groupEventsByDate(events);
    setStatus(container, "");
    render();
  } catch (error) {
    console.error("[schedule-calendar] イベント取得に失敗しました", error);
    setStatus(container, "イベント情報の取得に失敗しました。");
  }
}

async function fetchPublishedEvents() {
  const [{ initializeApp, getApps, getApp }, firestore] = await Promise.all([
    import(APP_MODULE_URL),
    import(FIRESTORE_MODULE_URL),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const { getFirestore, collection, query, where, orderBy, getDocs } = firestore;
  const db = getFirestore(app);
  const q = query(
    collection(db, "events"),
    where("isPublished", "==", true),
    orderBy("eventDate", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() ?? {};
      const date = normalizeDate(data.eventDate);
      if (!date) return null;
      return {
        id: doc.id,
        title: typeof data.title === "string" ? data.title : "",
        startTime: typeof data.startTime === "string" ? data.startTime : "",
        endTime: typeof data.endTime === "string" ? data.endTime : "",
        locationName: typeof data.locationName === "string" ? data.locationName : "",
        date,
      };
    })
    .filter(Boolean);
}

function groupEventsByDate(events) {
  const map = new Map();
  events.forEach((eventItem) => {
    const key = toDateKey(eventItem.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(eventItem);
  });
  return map;
}

function renderTitle(titleEl, cursor) {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  });
  titleEl.textContent = formatter.format(cursor);
}

function renderGrid(gridEl, cursor, today, eventsByDate) {
  gridEl.innerHTML = "";
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i += 1) {
    const dayOffset = i - startWeekday;
    const cellDate = new Date(year, month, 1 + dayOffset);
    const inMonth = cellDate.getMonth() === month;
    const cell = document.createElement("div");
    cell.className = "schedule-calendar__cell";
    cell.setAttribute("role", "gridcell");
    if (!inMonth) {
      cell.classList.add("schedule-calendar__cell--outside");
    }
    const weekday = cellDate.getDay();
    if (weekday === 0) cell.classList.add("schedule-calendar__cell--sun");
    if (weekday === 6) cell.classList.add("schedule-calendar__cell--sat");
    if (sameDay(cellDate, today)) cell.classList.add("schedule-calendar__cell--today");

    const dayEl = document.createElement("span");
    dayEl.className = "schedule-calendar__day";
    dayEl.textContent = String(cellDate.getDate());
    cell.appendChild(dayEl);

    const key = toDateKey(cellDate);
    const events = inMonth ? eventsByDate.get(key) : null;
    if (events && events.length) {
      cell.classList.add("schedule-calendar__cell--has-event");
      const marker = document.createElement("span");
      marker.className = "schedule-calendar__marker";
      marker.setAttribute("aria-hidden", "true");
      cell.appendChild(marker);
      cell.setAttribute(
        "aria-label",
        `${cellDate.getMonth() + 1}月${cellDate.getDate()}日 ${
          WEEKDAY_LABELS[weekday]
        }曜日 ${events.map((e) => e.title || "イベント").join("、")}`
      );
      cell.title = events.map((e) => e.title || "イベント").join("\n");
    }

    gridEl.appendChild(cell);
  }
}

function renderEventsList(listEl, cursor, eventsByDate) {
  listEl.innerHTML = "";
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthEvents = [];
  eventsByDate.forEach((events, key) => {
    const date = fromDateKey(key);
    if (!date) return;
    if (date.getFullYear() !== year || date.getMonth() !== month) return;
    events.forEach((eventItem) => monthEvents.push(eventItem));
  });
  monthEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!monthEvents.length) {
    const li = document.createElement("li");
    li.className = "schedule-calendar__event schedule-calendar__event--empty";
    li.textContent = "この月の開催予定はまだ登録されていません。";
    listEl.appendChild(li);
    return;
  }

  monthEvents.forEach((eventItem) => {
    const li = document.createElement("li");
    li.className = "schedule-calendar__event";
    const date = eventItem.date;
    const dateLabel = `${date.getMonth() + 1}/${date.getDate()}（${
      WEEKDAY_LABELS[date.getDay()]
    }）`;
    const timeLabel = formatTimeRange(eventItem.startTime, eventItem.endTime);

    const dateEl = document.createElement("span");
    dateEl.className = "schedule-calendar__event-date";
    dateEl.textContent = dateLabel;

    const bodyEl = document.createElement("div");
    bodyEl.className = "schedule-calendar__event-body";

    const titleEl = document.createElement("p");
    titleEl.className = "schedule-calendar__event-title";
    titleEl.textContent = eventItem.title || "イベント";
    bodyEl.appendChild(titleEl);

    const metaParts = [];
    if (timeLabel) metaParts.push(timeLabel);
    if (eventItem.locationName) metaParts.push(eventItem.locationName);
    if (metaParts.length) {
      const metaEl = document.createElement("p");
      metaEl.className = "schedule-calendar__event-meta";
      metaEl.textContent = metaParts.join(" / ");
      bodyEl.appendChild(metaEl);
    }

    li.appendChild(dateEl);
    li.appendChild(bodyEl);
    listEl.appendChild(li);
  });
}

function setStatus(container, message) {
  const statusEl = container.querySelector("[data-calendar-status]");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatTimeRange(start, end) {
  if (start && end) return `${start}〜${end}`;
  if (start) return `${start}〜`;
  if (end) return `〜${end}`;
  return "";
}
