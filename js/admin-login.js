// 管理画面ログイン。初期実装ではメールアドレス+パスワード方式を採用する。

import {
  AUTH_MODULE_URL,
  getAdminAuth,
  hasAdminSetup,
  showAdminStatus,
} from "./admin-auth.js";

const form = document.querySelector("[data-admin-login]");
const statusEl = document.querySelector("[data-admin-status]");

if (form) {
  initLogin(form).catch((error) => {
    console.error("[admin-login] 初期化に失敗しました", error);
    showAdminStatus(statusEl, "ログイン画面の初期化に失敗しました。", "error");
  });
}

async function initLogin(formEl) {
  const submitButton = formEl.querySelector('button[type="submit"]');
  if (!hasAdminSetup()) {
    submitButton.disabled = true;
    showAdminStatus(
      statusEl,
      "Firebase設定値または管理者UIDが未設定です。設定後にログインできます。",
      "info"
    );
    return;
  }

  const auth = await getAdminAuth();
  const { signInWithEmailAndPassword } = await import(AUTH_MODULE_URL);

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!formEl.reportValidity()) return;

    const formData = new FormData(formEl);
    const email = formData.get("email")?.toString().trim() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    submitButton.disabled = true;
    showAdminStatus(statusEl, "ログインしています…", "loading");

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const redirect = new URLSearchParams(window.location.search).get("redirect") || "index.html";
      showAdminStatus(statusEl, "ログインしました。管理画面へ移動します。", "success");
      if (credential.user) window.location.href = redirect;
    } catch (error) {
      console.error("[admin-login] ログインに失敗しました", error);
      showAdminStatus(statusEl, "メールアドレスまたはパスワードを確認してください。", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

