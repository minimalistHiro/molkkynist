// Firebase 設定ファイル
// Firebase コンソールで取得した設定値を以下に貼り付けてください。
// 値が未設定（"YOUR_..." のまま）の場合、お問い合わせフォームは「準備中」表示に切り替わります。
//
// 参考: https://firebase.google.com/docs/web/setup

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export function isFirebaseConfigured(config) {
  if (!config) return false;
  const required = ["apiKey", "projectId", "appId"];
  return required.every((key) => {
    const value = config[key];
    return typeof value === "string" && value.length > 0 && !value.startsWith("YOUR_");
  });
}
