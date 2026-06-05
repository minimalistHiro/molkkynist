// Firebase 設定ファイル
// Firebase コンソールで取得した設定値を以下に貼り付けてください。
// 値が未設定（"YOUR_..." のまま）の場合、お問い合わせフォームは「準備中」表示に切り替わります。
//
// 参考: https://firebase.google.com/docs/web/setup

export const firebaseConfig = {
  apiKey: "AIzaSyDLR5xSADk851wPQg00q1D3ZmsRoROjmDA",
  authDomain: "molkkynist-a0abd.firebaseapp.com",
  projectId: "molkkynist-a0abd",
  storageBucket: "molkkynist-a0abd.firebasestorage.app",
  messagingSenderId: "264727261204",
  appId: "1:264727261204:web:95572c98c3169b0fbf3701",
  measurementId: "G-HWNQ9TYD0K",
};

export const adminConfig = {
  adminUids: ["PvM8qIBG1ETC2Y7qM3PFj1i2ASk2"],
};

export function isFirebaseConfigured(config) {
  if (!config) return false;
  const required = ["apiKey", "projectId", "appId"];
  return required.every((key) => {
    const value = config[key];
    return typeof value === "string" && value.length > 0 && !value.startsWith("YOUR_");
  });
}

export function isAdminConfigured(config = adminConfig) {
  return (
    config &&
    Array.isArray(config.adminUids) &&
    config.adminUids.some(
      (uid) => typeof uid === "string" && uid.length > 0 && !uid.startsWith("YOUR_")
    )
  );
}
