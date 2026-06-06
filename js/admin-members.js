// メンバー管理画面。
// Firestore members コレクションへ、トップページとメンバー詳細で使う情報を登録する。

import {
  FIRESTORE_MODULE_URL,
  clearAdminStatus,
  getAdminApp,
  initLogoutButtons,
  requireAdmin,
  showAdminStatus,
} from "./admin-auth.js";

const form = document.querySelector("[data-admin-member-form]");
const listEl = document.querySelector("[data-admin-members-list]");
const statusEl = document.querySelector("[data-admin-status]");

if (form && listEl) {
  initMembersPage().catch((error) => {
    console.error("[admin-members] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "メンバー管理画面の初期化に失敗しました。", "error");
  });
}

async function initMembersPage() {
  const context = await requireAdmin(statusEl);
  if (!context) return;
  await initLogoutButtons();

  const app = await getAdminApp();
  const firestore = await import(FIRESTORE_MODULE_URL);
  const {
    getFirestore,
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    serverTimestamp,
  } = firestore;
  const db = getFirestore(app);
  const membersRef = collection(db, "members");

  let editingId = null;
  const cancelButton = form.querySelector("[data-admin-cancel-edit]");
  const submitButton = form.querySelector('button[type="submit"]');

  onSnapshot(
    query(membersRef, orderBy("displayOrder", "asc")),
    (snapshot) => {
      const items = snapshot.docs.map((memberDoc) => ({
        id: memberDoc.id,
        ...memberDoc.data(),
      }));
      renderMembers(items, (item) => {
        fillForm(item);
        editingId = item.id;
        cancelButton.hidden = false;
        submitButton.textContent = "メンバーを更新";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    (error) => {
      console.error("[admin-members] members購読に失敗しました", error);
      showAdminStatus(statusEl, "メンバー一覧の取得に失敗しました。", "error");
    }
  );

  cancelButton.addEventListener("click", () => {
    editingId = null;
    form.reset();
    cancelButton.hidden = true;
    submitButton.textContent = "メンバーを保存";
    clearAdminStatus(statusEl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    showAdminStatus(statusEl, "保存しています…", "loading");

    try {
      const payload = buildMemberPayload(new FormData(form));
      if (editingId) {
        await updateDoc(doc(db, "members", editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(membersRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      form.reset();
      editingId = null;
      cancelButton.hidden = true;
      submitButton.textContent = "メンバーを保存";
      showAdminStatus(statusEl, "メンバーを保存しました。", "success");
    } catch (error) {
      console.error("[admin-members] 保存に失敗しました", error);
      showAdminStatus(statusEl, "メンバーの保存に失敗しました。", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

function buildMemberPayload(formData) {
  const displayOrder = Number.parseInt(formData.get("displayOrder")?.toString() ?? "", 10);

  return {
    name: formData.get("name")?.toString().trim() ?? "",
    role: formData.get("role")?.toString().trim() ?? "",
    imageUrl: formData.get("imageUrl")?.toString().trim() ?? "",
    visualVariant: formData.get("visualVariant")?.toString() ?? "",
    startedReason: formData.get("startedReason")?.toString().trim() ?? "",
    favoriteThings: formData.get("favoriteThings")?.toString().trim() ?? "",
    firstTimerMessage: formData.get("firstTimerMessage")?.toString().trim() ?? "",
    comment: formData.get("comment")?.toString().trim() ?? "",
    displayOrder: Number.isNaN(displayOrder) ? 9999 : displayOrder,
    isPublished: formData.get("isPublished") === "on",
  };
}

function renderMembers(items, onEdit) {
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = '<p class="admin-empty">登録済みのメンバーはありません。</p>';
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "admin-list-item";
    article.innerHTML = `
      <div>
        <p class="admin-item-meta">表示順: ${escapeHtml(item.displayOrder ?? "未設定")} / ${escapeHtml(
          item.role || "役割未設定"
        )}</p>
        <h3>${escapeHtml(item.name || "名前未入力")}</h3>
        <p>${escapeHtml(excerpt(item.comment || item.firstTimerMessage || "紹介文は未入力です。"))}</p>
        <div class="admin-chip-row">
          <span class="status-chip">${item.isPublished ? "公開中" : "非公開"}</span>
          <span class="status-chip">${item.imageUrl ? "画像あり" : "アイコン表示"}</span>
        </div>
      </div>
      <button class="button button--secondary" type="button">編集</button>
    `;
    article.querySelector("button").addEventListener("click", () => onEdit(item));
    listEl.appendChild(article);
  });
}

function fillForm(item) {
  form.elements.name.value = item.name || "";
  form.elements.role.value = item.role || "";
  form.elements.imageUrl.value = item.imageUrl || "";
  form.elements.visualVariant.value = item.visualVariant || "";
  form.elements.startedReason.value = item.startedReason || "";
  form.elements.favoriteThings.value = item.favoriteThings || "";
  form.elements.firstTimerMessage.value = item.firstTimerMessage || "";
  form.elements.comment.value = item.comment || "";
  form.elements.displayOrder.value = item.displayOrder ?? "";
  form.elements.isPublished.checked = Boolean(item.isPublished);
}

function excerpt(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= 90) return text;
  return `${text.slice(0, 90)}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
