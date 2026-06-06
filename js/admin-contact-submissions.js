// お問い合わせ管理画面。
// contactSubmissions はFirestoreから読み、mail.delivery はCloud Functions callable経由で取得する。

import {
  FIREBASE_SDK_VERSION,
  FIRESTORE_MODULE_URL,
  clearAdminStatus,
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
  const {
    getFirestore,
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    limit,
    updateDoc,
    serverTimestamp,
  } = firestore;
  const { getFunctions, httpsCallable } = functionsModule;
  const db = getFirestore(app);
  const functions = getFunctions(app, "asia-northeast1");
  const getMailDeliveryStates = httpsCallable(functions, "getMailDeliveryStates");

  let submissions = [];
  let deliveryStates = {};
  let selectedId = null;

  function getSelectedSubmission() {
    if (!submissions.length) return null;
    return submissions.find((submission) => submission.id === selectedId) || submissions[0];
  }

  function renderCurrentState() {
    const selected = getSelectedSubmission();
    selectedId = selected?.id ?? null;
    renderList(submissions, deliveryStates, selectedId);
    renderDetail(selected, deliveryStates[selected?.id]);
  }

  onSnapshot(
    query(collection(db, "contactSubmissions"), orderBy("createdAt", "desc"), limit(100)),
    async (snapshot) => {
      submissions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderCurrentState();

      try {
        const ids = submissions.map((submission) => submission.id);
        const result = await getMailDeliveryStates({ submissionIds: ids });
        deliveryStates = result.data?.states ?? {};
        renderCurrentState();
      } catch (error) {
        console.error("[admin-contact] メール送信状態の取得に失敗しました", error);
        showAdminStatus(
          statusEl,
          "お問い合わせは取得できましたが、メール送信状態の取得に失敗しました。Cloud Functions の ADMIN_UIDS 設定とデプロイ状態を確認してください。",
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
    selectedId = item?.id ?? null;
    renderList(submissions, deliveryStates, selectedId);
    renderDetail(item, deliveryStates[item?.id]);
  });

  detailEl.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-admin-contact-management-form]");
    if (!form) return;
    event.preventDefault();

    const contactId = form.dataset.contactId;
    if (!contactId) return;

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showAdminStatus(statusEl, "対応状況を保存しています…", "loading");

    try {
      const formData = new FormData(form);
      await updateDoc(doc(db, "contactSubmissions", contactId), {
        responseStatus: normalizeResponseStatus(formData.get("responseStatus")?.toString()),
        responseMemo: formData.get("responseMemo")?.toString().trim() ?? "",
        responseUpdatedAt: serverTimestamp(),
        responseUpdatedBy: context.user.uid,
      });
      clearAdminStatus(statusEl);
      showAdminStatus(statusEl, "対応状況を保存しました。", "success");
    } catch (error) {
      console.error("[admin-contact] 対応状況の保存に失敗しました", error);
      showAdminStatus(statusEl, "対応状況の保存に失敗しました。", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

function renderList(submissions, states, selectedId) {
  listEl.innerHTML = "";
  if (!submissions.length) {
    listEl.innerHTML = '<p class="admin-empty">お問い合わせはまだありません。</p>';
    return;
  }

  submissions.forEach((submission) => {
    const button = document.createElement("button");
    button.className = `admin-contact-button${submission.id === selectedId ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.contactId = submission.id;
    button.innerHTML = `
      <span class="admin-item-meta">${formatDate(submission.createdAt)} / ${escapeHtml(
        inquiryLabel(submission.inquiryType)
      )}</span>
      <strong>${escapeHtml(submission.name || "名前未入力")}</strong>
      <span>${escapeHtml(submission.email || "メール未入力")}</span>
      <span class="admin-chip-row">
        <span class="status-chip">${escapeHtml(responseStatusLabel(submission.responseStatus))}</span>
        <span class="status-chip">${escapeHtml(mailStateLabel(states[submission.id]?.state))}</span>
      </span>
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
    <form class="contact-form admin-contact-management" data-admin-contact-management-form data-contact-id="${escapeHtml(
      submission.id
    )}">
      <div class="form-row">
        <label for="response-status-${escapeHtml(submission.id)}">
          <span class="form-label">対応ステータス</span>
          <select id="response-status-${escapeHtml(submission.id)}" name="responseStatus">
            ${responseStatusOptions(submission.responseStatus)}
          </select>
        </label>
      </div>
      <label for="response-memo-${escapeHtml(submission.id)}">
        <span class="form-label">対応メモ</span>
        <textarea id="response-memo-${escapeHtml(
          submission.id
        )}" name="responseMemo" rows="4" placeholder="対応内容や次に確認することを記録します。">${escapeHtml(
          submission.responseMemo || ""
        )}</textarea>
      </label>
      <div class="form-actions admin-actions">
        <button class="button button--primary" type="submit">対応状況を保存</button>
      </div>
    </form>
    <dl class="admin-detail-list">
      <div>
        <dt>対応状況</dt>
        <dd>${escapeHtml(responseStatusLabel(submission.responseStatus))}</dd>
      </div>
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

function normalizeResponseStatus(value) {
  return ["unhandled", "in_progress", "done"].includes(value) ? value : "unhandled";
}

function responseStatusLabel(value) {
  const labels = {
    unhandled: "未対応",
    in_progress: "対応中",
    done: "対応済み",
  };
  return labels[normalizeResponseStatus(value)];
}

function responseStatusOptions(currentValue) {
  const current = normalizeResponseStatus(currentValue);
  return [
    ["unhandled", "未対応"],
    ["in_progress", "対応中"],
    ["done", "対応済み"],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`
    )
    .join("");
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
