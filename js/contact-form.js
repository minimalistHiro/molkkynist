// お問い合わせフォーム制御
// - 用件区分が「参加希望」の時のみ、Firestore events から候補日程を取得してトグル選択を表示する
// - 送信内容は Firestore contactSubmissions コレクションへ保存する
// - Firebase 未設定時は安全にフォーム送信を無効化し、Instagram DM を案内する

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.12.2";
const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;

const form = document.querySelector('[data-form="contact"]');
if (form) {
  initContactForm(form).catch((error) => {
    console.error("[contact-form] 初期化に失敗しました", error);
    showStatus(form, "フォームの初期化に失敗しました。Instagram DM からのご連絡をお願いします。", "error");
  });
}

async function initContactForm(formEl) {
  const inquiryRadios = formEl.querySelectorAll('input[name="inquiryType"]');
  const eventsField = formEl.querySelector('[data-role="event-select"]');
  const eventsList = formEl.querySelector('[data-role="event-list"]');
  const eventsEmpty = formEl.querySelector('[data-role="event-empty"]');
  const submitButton = formEl.querySelector('button[type="submit"]');

  if (!isFirebaseConfigured(firebaseConfig)) {
    formEl.dataset.state = "not-configured";
    submitButton.disabled = true;
    showStatus(
      formEl,
      "お問い合わせフォームは現在準備中です。お手数ですが Instagram DM からご連絡ください。",
      "info"
    );
    return;
  }

  const { initializeApp } = await import(APP_MODULE_URL);
  const {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
    Timestamp,
  } = await import(FIRESTORE_MODULE_URL);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let cachedEvents = null;

  inquiryRadios.forEach((radio) => {
    radio.addEventListener("change", async () => {
      const isJoin = radio.checked && radio.value === "participate";
      eventsField.hidden = !isJoin;
      if (isJoin) {
        await loadEvents();
      }
    });
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus(formEl);

    if (!formEl.reportValidity()) {
      return;
    }

    if (!formEl.querySelector("#privacy-agree").checked) {
      showStatus(formEl, "プライバシーポリシーへの同意が必要です。", "error");
      return;
    }

    const formData = new FormData(formEl);
    const selectedEventIds = Array.from(
      formEl.querySelectorAll('input[name="selectedEventIds"]:checked')
    ).map((input) => input.value);

    const inquiryType = formData.get("inquiryType");
    if (inquiryType === "participate" && selectedEventIds.length === 0) {
      showStatus(formEl, "参加希望の日程を1つ以上選択してください。", "error");
      return;
    }

    submitButton.disabled = true;
    showStatus(formEl, "送信中です…", "loading");

    try {
      await addDoc(collection(db, "contactSubmissions"), {
        name: formData.get("name")?.toString().trim() ?? "",
        email: formData.get("email")?.toString().trim() ?? "",
        phone: formData.get("phone")?.toString().trim() ?? "",
        inquiryType,
        selectedEventIds,
        message: formData.get("message")?.toString().trim() ?? "",
        createdAt: serverTimestamp(),
      });
      formEl.reset();
      eventsField.hidden = true;
      showStatus(
        formEl,
        "送信ありがとうございました。受付完了メールを登録いただいたメールアドレスへお送りします。",
        "success"
      );
    } catch (error) {
      console.error("[contact-form] 送信エラー", error);
      showStatus(
        formEl,
        "送信に失敗しました。時間をおいて再度お試しいただくか、Instagram DM からご連絡ください。",
        "error"
      );
    } finally {
      submitButton.disabled = false;
    }
  });

  async function loadEvents() {
    if (cachedEvents) {
      renderEvents(cachedEvents);
      return;
    }
    eventsList.innerHTML = '<p class="form-events__loading">日程を読み込んでいます…</p>';
    eventsEmpty.hidden = true;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventsQuery = query(
        collection(db, "events"),
        where("isPublished", "==", true),
        where("eventDate", ">=", Timestamp.fromDate(today)),
        orderBy("eventDate", "asc")
      );
      const snapshot = await getDocs(eventsQuery);
      cachedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      renderEvents(cachedEvents);
    } catch (error) {
      console.error("[contact-form] events取得エラー", error);
      eventsList.innerHTML = "";
      eventsEmpty.hidden = false;
      eventsEmpty.textContent =
        "日程の取得に失敗しました。Instagram DM からお気軽にご相談ください。";
    }
  }

  function renderEvents(events) {
    eventsList.innerHTML = "";
    if (!events.length) {
      eventsEmpty.hidden = false;
      eventsEmpty.textContent =
        "現在受付中の日程はありません。Instagram DM からもご相談いただけます。";
      return;
    }
    eventsEmpty.hidden = true;
    events.forEach((evt) => {
      const label = document.createElement("label");
      label.className = "event-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "selectedEventIds";
      checkbox.value = evt.id;
      const text = document.createElement("span");
      text.textContent = formatEventLabel(evt);
      label.append(checkbox, text);
      eventsList.appendChild(label);
    });
  }
}

function formatEventLabel(evt) {
  const dateStr = formatDate(evt.eventDate);
  const parts = [dateStr, evt.title].filter(Boolean);
  if (evt.locationName) parts.push(evt.locationName);
  return parts.join(" / ");
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

function showStatus(formEl, message, level = "info") {
  const statusEl = formEl.querySelector('[data-role="status"]');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.level = level;
  statusEl.hidden = false;
}

function clearStatus(formEl) {
  const statusEl = formEl.querySelector('[data-role="status"]');
  if (!statusEl) return;
  statusEl.textContent = "";
  statusEl.hidden = true;
}
