// お問い合わせ管理画面。
// contactSubmissions はFirestoreから読み、mail.delivery はCloud Functions callable経由で取得する。

import {
  FIREBASE_SDK_VERSION,
  FIRESTORE_MODULE_URL,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const FUNCTIONS_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`;

const listEl = document.querySelector("[data-admin-contact-list]");
const detailEl = document.querySelector("[data-admin-contact-detail]");
const statusEl = document.querySelector("[data-admin-status]");

if (listEl && detailEl) {
  initContactSubmissionsPage().catch((error) => {
    console.error("[admin-contact] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "お問い合わせ管理画面の初期化に失敗しました。", "error");
  });
}

async function initContactSubmissionsPage() {
  const context = await requireAdmin(statusEl);
  if (!context) return;
  await initLogoutButtons();

  const app = await getAdminApp();
  const firestore = await import(FIRESTORE_MODULE_URL);
  const functionsModule = await import(FUNCTIONS_MODULE_URL);
  const { getFirestore, collection, query, orderBy, onSnapshot, limit } = firestore;
  const { getFunctions, httpsCallable } = functionsModule;
  const db = getFirestore(app);
  const functions = getFunctions(app, "asia-northeast1");
  const getMailDeliveryStates = httpsCallable(functions, "getMailDeliveryStates");

  let submissions = [];
  let deliveryStates = {};

  onSnapshot(
    query(collection(db, "contactSubmissions"), orderBy("createdAt", "desc"), limit(100)),
    async (snapshot) => {
      submissions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderList(submissions, deliveryStates);
      renderDetail(submissions[0], deliveryStates[submissions[0]?.id]);

      try {
        const ids = submissions.map((submission) => submission.id);
        const result = await getMailDeliveryStates({ submissionIds: ids });
        deliveryStates = result.data?.states ?? {};
        renderList(submissions, deliveryStates);
        renderDetail(submissions[0], deliveryStates[submissions[0]?.id]);
      } catch (error) {
        console.error("[admin-contact] メール送信状態の取得に失敗しました", error);
        showAdminStatus(
          statusEl,
          "お問い合わせは取得できましたが、メール送信状態の取得に失敗しました。Cloud Functions の ADMIN_UID 設定とデプロイ状態を確認してください。",
          "error"
        );
      }
    },
    (error) => {
      console.error("[admin-contact] contactSubmissions購読に失敗しました", error);
      showAdminStatus(statusEl, "お問い合わせ一覧の取得に失敗しました。", "error");
    }
  );

  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-contact-id]");
    if (!button) return;
    const item = submissions.find((submission) => submission.id === button.dataset.contactId);
    renderDetail(item, deliveryStates[item?.id]);
  });
}

function renderList(submissions, states) {
  listEl.innerHTML = "";
  if (!submissions.length) {
    listEl.innerHTML = '<p class="admin-empty">お問い合わせはまだありません。</p>';
    return;
  }

  submissions.forEach((submission) => {
    const button = document.createElement("button");
    button.className = "admin-contact-button";
    button.type = "button";
    button.dataset.contactId = submission.id;
    button.innerHTML = `
      <span class="admin-item-meta">${formatDate(submission.createdAt)} / ${escapeHtml(
        inquiryLabel(submission.inquiryType)
      )}</span>
      <strong>${escapeHtml(submission.name || "名前未入力")}</strong>
      <span>${escapeHtml(submission.email || "メール未入力")}</span>
      <span class="status-chip">${escapeHtml(mailStateLabel(states[submission.id]?.state))}</span>
    `;
    listEl.appendChild(button);
  });
}

function renderDetail(submission, deliveryState) {
  if (!submission) {
    detailEl.innerHTML = '<p class="admin-empty">左の一覧からお問い合わせを選択してください。</p>';
    return;
  }

  detailEl.innerHTML = `
    <div class="admin-detail-heading">
      <div>
        <p class="admin-item-meta">${formatDate(submission.createdAt)}</p>
        <h2>${escapeHtml(submission.name || "名前未入力")}</h2>
      </div>
      <span class="status-chip">${escapeHtml(mailStateLabel(deliveryState?.state))}</span>
    </div>
    <dl class="admin-detail-list">
      <div>
        <dt>メールアドレス</dt>
        <dd>${escapeHtml(submission.email || "未入力")}</dd>
      </div>
      <div>
        <dt>電話番号</dt>
        <dd>${escapeHtml(submission.phone || "未入力")}</dd>
      </div>
      <div>
        <dt>用件区分</dt>
        <dd>${escapeHtml(inquiryLabel(submission.inquiryType))}</dd>
      </div>
      <div>
        <dt>参加希望日程</dt>
        <dd>${escapeHtml(formatSelectedEvents(submission.selectedEventIds))}</dd>
      </div>
      <div>
        <dt>自動返信メール</dt>
        <dd>${escapeHtml(mailStateLabel(deliveryState?.state))}${formatDeliveryError(deliveryState)}</dd>
      </div>
      <div>
        <dt>本文</dt>
        <dd><pre class="admin-message">${escapeHtml(submission.message || "本文の記載はありません。")}</pre></dd>
      </div>
    </dl>
  `;
}

function inquiryLabel(value) {
  const labels = {
    participate: "参加希望",
    event: "イベントについて",
    media: "メディア取材",
    other: "その他",
  };
  return labels[value] || "その他";
}

function mailStateLabel(value) {
  const labels = {
    SUCCESS: "送信済み",
    ERROR: "送信エラー",
    PROCESSING: "送信処理中",
    PENDING: "送信待ち",
    NOT_CREATED: "メール未作成",
  };
  return labels[value] || "状態未取得";
}

function formatDeliveryError(deliveryState) {
  if (!deliveryState?.error) return "";
  return `（${escapeHtml(deliveryState.error)}）`;
}

function formatSelectedEvents(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return "選択なし";
  return ids.join(" / ");
}

function formatDate(value) {
  if (!value) return "日時未取得";
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "日時未取得";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return "日時未取得";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

