// お問い合わせフォーム送信完了ページ。
// 参加希望で送信した直後だけ、選択したイベントの詳細を再表示する。

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const detailEl = document.querySelector('[data-role="complete-event-detail"]');

if (detailEl) {
  initCompleteEventDetail().catch((error) => {
    console.error("[contact-complete] イベント詳細の表示に失敗しました", error);
    detailEl.hidden = true;
  });
}

async function initCompleteEventDetail() {
  const eventId = readSubmittedEventId();
  if (!eventId || !isFirebaseConfigured(firebaseConfig)) return;

  const { initializeApp } = await import(APP_MODULE_URL);
  const { getFirestore, doc, getDoc } = await import(FIRESTORE_MODULE_URL);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const eventSnapshot = await getDoc(doc(db, "events", eventId));
  if (!eventSnapshot.exists()) return;

  const eventItem = {
    id: eventSnapshot.id,
    ...eventSnapshot.data(),
  };
  const [venue, rainVenue] = await Promise.all([
    fetchVenue(db, getDoc, doc, eventItem.venueId),
    fetchVenue(db, getDoc, doc, eventItem.rainVenueId),
  ]);

  renderEventDetail(eventItem, venue, rainVenue);
}

async function fetchVenue(db, getDoc, doc, venueId) {
  if (!venueId) return null;
  const snapshot = await getDoc(doc(db, "venues", venueId));
  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function renderEventDetail(eventItem, venue, rainVenue) {
  detailEl.innerHTML = "";

  const card = document.createElement("article");
  card.className = "contact-event-detail__card";

  const visual = document.createElement("div");
  visual.className = "contact-event-detail__visual";
  if (venue?.imageUrl) {
    const image = document.createElement("img");
    image.src = venue.imageUrl;
    image.alt = `${venue.name || "開催場所"}の写真`;
    image.loading = "lazy";
    image.decoding = "async";
    visual.appendChild(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.textContent = "会場画像は準備中です";
    visual.appendChild(placeholder);
  }

  const body = document.createElement("div");
  body.className = "contact-event-detail__body";

  const label = document.createElement("p");
  label.className = "contact-event-detail__label";
  label.textContent = "予約したイベント";

  const title = document.createElement("h3");
  title.textContent = venue?.name || eventItem.locationName || "開催場所未定";

  const list = document.createElement("dl");
  list.className = "contact-event-detail__list";
  appendDetailItem(list, "開催日時", buildDateTimeDetail(eventItem));
  appendVenueDetailItem(list, "開催場所", venue, eventItem.locationAddress || "");
  appendRainDetailItem(list, eventItem, rainVenue);

  body.append(label, title, list);
  card.append(visual, body);
  detailEl.appendChild(card);
  detailEl.hidden = false;
}

function appendDetailItem(parent, label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);
  parent.appendChild(wrapper);
}

function appendVenueDetailItem(parent, label, venue, fallbackAddress = "") {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  description.className = "contact-event-detail__venue-lines";
  term.textContent = label;

  if (!venue) {
    if (fallbackAddress) {
      const link = document.createElement("a");
      link.href = buildGoogleMapsSearchUrl({ address: fallbackAddress });
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = fallbackAddress;
      description.appendChild(link);
    } else {
      description.textContent = "会場情報は確定次第ご案内します。";
    }
    wrapper.append(term, description);
    parent.appendChild(wrapper);
    return;
  }

  appendMapLinkPart(description, venue);
  appendVenueLine(description, venue.accessNote);
  if (!description.childNodes.length) {
    description.textContent = "会場情報は確定次第ご案内します。";
  }

  wrapper.append(term, description);
  parent.appendChild(wrapper);
}

function appendRainDetailItem(parent, eventItem, rainVenue) {
  if (eventItem.isRainCanceled === true) {
    appendDetailItem(parent, "雨天時", "雨天時は中止します。");
    return;
  }
  if (!rainVenue) {
    appendDetailItem(parent, "雨天時", "雨天時の対応は決まり次第ご案内します。");
    return;
  }
  appendVenueDetailItem(parent, "雨天時", rainVenue);
}

function buildDateTimeDetail(eventItem) {
  const date = formatDate(eventItem.eventDate);
  const time = formatTimeRange(eventItem.startTime, eventItem.endTime);
  return [date, time].filter(Boolean).join(" / ");
}

function formatTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${startTime}開始`;
  if (endTime) return `${endTime}終了`;
  return "";
}

function appendVenueLine(parent, value) {
  if (!value) return;
  const line = document.createElement("span");
  line.textContent = value;
  parent.appendChild(line);
}

function appendMapLinkPart(parent, venue) {
  if (!venue?.address) return;
  const link = document.createElement("a");
  link.href = venue.mapUrl || buildGoogleMapsSearchUrl(venue);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = venue.address;
  parent.appendChild(link);
}

function buildGoogleMapsSearchUrl(venue) {
  const query = [venue.name, venue.address].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatDate(value) {
  if (!value) return "日程未定";
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "日程未定";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  } catch (_error) {
    return "日程未定";
  }
}

function readSubmittedEventId() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("eventId") || "").trim();
}
