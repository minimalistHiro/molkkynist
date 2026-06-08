// 管理画面共通のFirebase初期化と認証制御。
// 石井さん専用運用のため、クライアント側ではUID一致を確認し、
// 最終的な書き込み制御はFirestore Security Rulesに任せる。

import {
  adminConfig,
  firebaseConfig,
  isAdminConfigured,
  isFirebaseConfigured,
} from "./firebase-config.js";

export const FIREBASE_SDK_VERSION = "10.12.2";
export const APP_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
export const AUTH_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;
export const FIRESTORE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
export const STORAGE_MODULE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`;

let appCache = null;
let authCache = null;

export function hasAdminSetup() {
  return isFirebaseConfigured(firebaseConfig) && isAdminConfigured(adminConfig);
}

export function isConfiguredAdminUid(uid) {
  return Array.isArray(adminConfig.adminUids) && adminConfig.adminUids.includes(uid);
}

export async function getAdminApp() {
  if (!isFirebaseConfigured(firebaseConfig)) {
    throw new Error("Firebase設定値が未設定です。");
  }
  if (appCache) return appCache;
  const { initializeApp, getApps, getApp } = await import(APP_MODULE_URL);
  appCache = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appCache;
}

export async function getAdminAuth() {
  if (authCache) return authCache;
  const app = await getAdminApp();
  const { getAuth } = await import(AUTH_MODULE_URL);
  authCache = getAuth(app);
  return authCache;
}

export async function requireAdmin(statusEl) {
  if (!hasAdminSetup()) {
    showAdminStatus(
      statusEl,
      "Firebase設定値または管理者UID一覧が未設定です。js/firebase-config.js と firestore.rules の管理者UIDを本番値へ差し替えてください。",
      "error"
    );
    return null;
  }

  const auth = await getAdminAuth();
  const { onAuthStateChanged, signOut } = await import(AUTH_MODULE_URL);

  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const current = `${currentPath}${window.location.search}`;
        window.location.href = `login.html?redirect=${encodeURIComponent(current)}`;
        resolve(null);
        return;
      }

      if (!isConfiguredAdminUid(user.uid)) {
        await signOut(auth);
        showAdminStatus(statusEl, "このアカウントには管理画面への権限がありません。", "error");
        resolve(null);
        return;
      }

      resolve({ auth, user });
    });
  });
}

export async function initLogoutButtons() {
  const buttons = document.querySelectorAll("[data-admin-logout]");
  if (!buttons.length || !isFirebaseConfigured(firebaseConfig)) return;
  const auth = await getAdminAuth();
  const { signOut } = await import(AUTH_MODULE_URL);
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  });
}

export function showAdminStatus(statusEl, message, level = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.level = level;
  statusEl.hidden = false;
}

export function clearAdminStatus(statusEl) {
  if (!statusEl) return;
  statusEl.textContent = "";
  statusEl.hidden = true;
}

export function setAdminButtonLoading(button, message = "保存中…") {
  if (!button) return;
  button.disabled = true;
  button.classList.add("is-loading");
  button.setAttribute("aria-busy", "true");
  button.textContent = message;
}

export function clearAdminButtonLoading(button, label) {
  if (!button) return;
  button.classList.remove("is-loading");
  button.removeAttribute("aria-busy");
  if (label) button.textContent = label;
  button.disabled = false;
}
