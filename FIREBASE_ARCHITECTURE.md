# FIREBASE_ARCHITECTURE

## Firebase 採用方針

Molkkynist のサイトでは、静的Webサイトを基本にしつつ、イベント情報や活動レポートなど更新が必要な部分に Firebase を使用する方針です。

一般ユーザー向けのログイン機能は設けず、オーナーである石井さんのみが管理画面から情報を更新できる構成を目指します。

## 使用予定の Firebase サービス

### Firebase Hosting

用途:

- 公開サイトのホスティング
- 管理画面のホスティング
- 独自ドメインを使う場合の配信基盤

### Firestore

用途:

- イベント情報の保存（公開サイトのお問い合わせフォームでの参加日程選択肢としても利用）
- 活動レポートの保存
- メンバー情報の保存
- サイト基本設定の保存
- お問い合わせフォームの送信内容の保存

### Firebase Authentication

用途:

- 石井さん専用のログイン
- 管理画面へのアクセス判定

想定方式:

- メールアドレスとパスワード
- または Google ログイン

### Firebase Storage

用途:

- イベント画像の保存
- 活動レポート画像の保存
- メンバー画像の保存
- サイト用画像素材の保存

ただし、固定のデザイン素材や生成画像は、初期段階では `assets/` に配置する方針です。

## 公開サイトと管理画面の関係

公開サイト:

```text
/
about.html
molkky.html
events.html
reports.html
members.html
contact.html
privacy.html
```

管理画面:

```text
admin/login.html
admin/index.html
admin/events.html
admin/reports.html
admin/members.html
```

管理画面の URL は一般ユーザー向けナビゲーションには表示しません。

ただし、ログインページ自体は URL を知っていれば表示できます。これは一般的な構成として問題ありません。

重要なのは、ログインページを隠すことではなく、石井さん以外がデータを編集できないように Firebase 側で制御することです。

## 権限管理方針

守るべきこと:

- 一般ユーザーは公開データのみ閲覧できる
- 一般ユーザーは `contactSubmissions` への新規作成のみ可能（読み取り・更新・削除は不可）
- 上記以外のコレクションには一般ユーザーは書き込みできない
- 一般ユーザーは Storage にアップロードできない
- 石井さんだけが管理データを書き換えられる
- 管理画面側の表示制御だけに頼らない
- Firestore Security Rules と Storage Security Rules で制御する

## 管理者判定

管理者判定は Firebase Authentication の UID を基準にする方針です。

理由:

- メールアドレスより変更に強い
- セキュリティルールで扱いやすい
- 特定ユーザーだけに書き込み権限を与えやすい

想定:

```text
adminUid = 石井さんの Firebase Authentication UID
```

## Firestore コレクション案

### events

イベント情報を保存します。

主なフィールド:

```text
title
description
eventDate
startTime
endTime
locationName
locationAddress
capacity
fee
status
isPublished
createdAt
updatedAt
```

### reports

活動レポートを保存します。

主なフィールド:

```text
title
body
eventDate
locationName
participantCount
imageUrls
isPublished
createdAt
updatedAt
```

### members

メンバー情報を保存します。

主なフィールド:

```text
name
role
profile
comment
imageUrl
displayOrder
isPublished
createdAt
updatedAt
```

### siteSettings

サイト全体の設定を保存します。

主なフィールド:

```text
instagramUrl
instagramDmUrl
contactMessage
mainCopy
subCopy
updatedAt
```

### contactSubmissions

公開サイトのお問い合わせフォームから送信された内容を保存します。

主なフィールド:

```text
name
email
phone
inquiryType   # 参加希望 / イベント問い合わせ / メディア取材 / その他
selectedEventIds   # 参加希望時のみ、events への参照を配列で保持
message
createdAt
```

## 公開データの考え方

公開サイトでは、`isPublished` が `true` のデータだけを表示します。

下書きや非公開データは管理画面でのみ扱います。

## JavaScript の使用方針

Firebase を使用する画面では JavaScript が必要になります。

使用箇所:

- 公開サイトで Firestore からイベント情報を読み込む（参加費 `events.fee` のトップページ表示を含む）
- 公開サイトで Firestore から活動レポートを読み込む
- 公開サイトのお問い合わせフォームで Firestore の `events` を参照し、参加日程選択肢として表示する
- 公開サイトのお問い合わせフォームから `contactSubmissions` に書き込む
- お問い合わせフォーム送信時に、ユーザーへ受付完了の自動返信メールを送信する（Cloud Functions + Firebase Extensions の Trigger Email、または外部SMTP連携を想定）
- 管理画面でログイン状態を判定する
- 管理画面でデータを追加・編集する
- Storage に画像をアップロードする

静的な本文やデザインは HTML / CSS を基本にします。

## クライアント側の実装（2026-05-21 追加）

`contact.html` で読み込むモジュールスクリプトは下記の構成です。

- `js/firebase-config.js`
  - Firebase コンソールで取得した設定値を貼り付けるテンプレート
  - 値が `YOUR_*` プレースホルダーのままの場合、フォーム送信は無効化され Instagram DM 案内へフォールバック
  - エクスポートする `isFirebaseConfigured(config)` で起動時に判定
- `js/contact-form.js`
  - Firebase JS SDK v10 のモジュラー API を `https://www.gstatic.com/firebasejs/<ver>/firebase-app.js` / `firebase-firestore.js` から動的 import
  - 用件区分が「参加希望」のとき `events` コレクション（`isPublished == true` かつ `eventDate >= 今日`）を `eventDate asc` で取得しトグル表示
  - 送信時は `contactSubmissions` コレクションへ `addDoc`（`createdAt` は `serverTimestamp()`）
  - プライバシーポリシー同意チェックと、参加希望時の日程選択（最低1件）をクライアント側で検証

Firebase コンソールで本番プロジェクトを作成したら、`js/firebase-config.js` の値を差し替え、`contactSubmissions` への `create` のみを許可するセキュリティルールを適用してください。

## サーバーサイド実装（2026-05-21 追加）

`functions/` ディレクトリに Cloud Functions（Node.js 20 / Firebase Functions v2）を新設しました。

- エントリポイント: `functions/index.js`
- リージョン: `asia-northeast1`
- トリガー: `contactSubmissions/{submissionId}` の `onDocumentCreated`
- 役割: 送信者宛の自動返信メールを `mail` コレクション（Firebase Extensions「Trigger Email from Firestore」が監視）へ Admin SDK 経由で書き込む

メール本文（テキスト/HTML）と件名は `functions/index.js` 内で生成しており、文面方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」に記載しています。

### Trigger Email Extension

Extension ID: `firebase/firestore-send-email`

導入手順とサンプル設定値は `extensions/README.md` および `extensions/firestore-send-email.env.example` に記載しています。

主要ポイント:

- 監視コレクション (`MAIL_COLLECTION`) は `mail` で固定（Cloud Functions と整合）。
- `SMTP_CONNECTION_URI` には利用する SMTP プロバイダの URI（SendGrid / Mailgun / Gmail SMTP 等）を設定する。
- `DEFAULT_FROM` は表示名つきで `Molkkynist <noreply@...>` を想定。
- 各ドキュメントの `replyTo` フィールド（Cloud Functions が `info@groumapapp.com` を付与）が、`DEFAULT_REPLY_TO` よりも優先される。

### Firebase 設定ファイル一式

ルート直下に下記を追加しました（2026-05-21）。

- `firebase.json` … Hosting / Firestore / Functions / Emulator suite の構成
- `.firebaserc` … プロジェクト ID プレースホルダー（実プロジェクト ID に差し替え必要）
- `firestore.rules` … 公開コレクション読み取り公開、`contactSubmissions` は create 限定（型・件数バリデーション付き）、`mail` は一般ユーザー全面禁止
- `firestore.indexes.json` … `events` (`isPublished` + `eventDate` asc) と `reports` (`isPublished` + `eventDate` desc) の複合インデックス

セキュリティルール内の `YOUR_ADMIN_UID` は、石井さんの Firebase Authentication UID が確定したタイミングで差し替えてください。

## 初期段階での注意点

- Firebase 設定情報を公開しても問題ないが、セキュリティルールを必ず適切に設定する
- 管理画面で制御していても、Firestore ルールが甘いと不正書き込みされる可能性がある
- 画像アップロードは容量や料金に注意する
- 公開サイトの表示速度を落とさないように、画像サイズを調整する

## 今後決めること

- Firebase プロジェクト名
- 石井さんのログイン方式
- 管理者 UID（決定次第 `firestore.rules` の `YOUR_ADMIN_UID` を差し替え）
- Firestore の正式なデータ構造
- 画像アップロードのサイズ制限
- Firebase Hosting の公開ドメイン
- 自動返信メール用 SMTP プロバイダの選定（SendGrid / Mailgun / Resend / Gmail SMTP / 他）
- 自動返信メールの送信元アドレス（`DEFAULT_FROM`、SPF/DKIM の DNS 設定対象）
- DM 経由の申込時にユーザーへ受付メールを送る運用フロー（管理画面から手動送信するか）
