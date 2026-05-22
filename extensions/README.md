# Firebase Extensions

このディレクトリは、Molkkynist プロジェクトで過去に検討・初期実装した Firebase Extensions 設定のアーカイブです。

2026-05-22 時点の本番方針では、Firebase Extensions は使用しません。自動返信メールは GrouMap と同じ Cloud Functions + `nodemailer` + Gmail SMTP 直送方式で実装します。現行手順は [FIREBASE_ARCHITECTURE.md](../FIREBASE_ARCHITECTURE.md) の「SMTP Secret」を参照してください。

## 旧方式の Extension 一覧

> 2026-05-22 更新: 自動返信メールは GrouMap と同じ Cloud Functions + `nodemailer` + Gmail SMTP 直送方式へ変更しました。現時点では下記 Extension は本番運用では使用しません。将来 Firebase Extensions 方式へ戻す場合の参考として、このディレクトリを残しています。

| ID | 用途 | 関連コード |
|----|------|------------|
| `firebase/firestore-send-email` | 旧方式: お問い合わせフォーム自動返信メールの実送信 (`mail` コレクション監視) | 2026-05-21 時点の旧 `functions/index.js` |

## 旧セットアップ手順（現在は使用しない）

以下は、Firebase Extensions 方式へ戻す場合の参考手順です。現在の D-6 では使用しません。

### 0. 前提

- Firebase プロジェクトが作成済みであること（`.firebaserc` の `default` を実プロジェクト ID に差し替え済み）。
- `firebase` CLI が利用可能であること（`npm i -g firebase-tools` または `npx firebase` ）。
- 利用する SMTP プロバイダ（SendGrid / Mailgun / Gmail SMTP 等）が決まっていること。
- Cloud Functions 側が `mail` コレクションへ送信用ドキュメントを書き込む旧方式に戻っていること。

### 1. SMTP プロバイダの準備

送信元として利用するアドレスのドメイン（例: `molkkynist.com`）について、SPF / DKIM の DNS 設定をプロバイダの手順に従って完了させてください。これを行わないと、Gmail / Yahoo メールなどへ届かなくなる可能性があります。

### 2. Extension のインストール

```bash
firebase ext:install firebase/firestore-send-email \
  --project=YOUR_FIREBASE_PROJECT_ID
```

対話形式で設定値を求められます。値は `firestore-send-email.env.example` を参考に入力してください。

CI などで対話なしに導入する場合は、`firestore-send-email.env.example` をコピーして `firestore-send-email.env` を作り、値を埋めた上で次のコマンドで再構成できます:

```bash
firebase ext:configure firestore-send-email \
  --project=YOUR_FIREBASE_PROJECT_ID
```

### 3. Firestore セキュリティルールの反映

```bash
firebase deploy --only firestore:rules --project=YOUR_FIREBASE_PROJECT_ID
```

`firestore.rules` で `mail` コレクションへの一般ユーザー読み書きを禁止しています（Cloud Functions の Admin SDK 経由のみ書き込み可）。

### 4. Cloud Functions のデプロイ

```bash
cd functions
npm install
cd ..
firebase deploy --only functions --project=YOUR_FIREBASE_PROJECT_ID
```

### 5. 旧方式のテスト送信

公開サイトの `contact.html` から任意のテストメールアドレスでお問い合わせを送信し、

- Firestore に `contactSubmissions` ドキュメントが作成されること
- 旧実装の Cloud Functions ログに、`mail` コレクションへの登録完了ログが出力されること
- `mail` ドキュメントの `delivery.state` が `SUCCESS` に遷移すること
- 受信側のメールボックスに件名「【Molkkynist】お問い合わせを受け付けました」のメールが届くこと

を確認します。

## 文面の編集

自動返信メールの文面（件名・本文・HTML テンプレート）は `functions/index.js` 内の `renderTextBody()` / `renderHtmlBody()` で管理しています。
方針・トーンは `CONTENT_GUIDELINES.md`「自動返信メール文面」セクションを参照してください。
