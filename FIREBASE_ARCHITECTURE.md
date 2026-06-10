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
- 開催場所情報の保存（イベント情報から参照）
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
- サイト用画像素材の保存

ただし、固定のデザイン素材、生成画像、メンバー画像は `assets/` に配置する方針です。

2026年6月7日に、管理画面で扱う画像は Cloud Storage for Firebase へアップロードする方針に統一しました。管理画面に画像URLの手入力欄は設けず、Storageアップロード後に取得したダウンロードURLを Firestore の `imageUrl` / `imageUrls` に保存します。対応形式は JPEG / PNG / WebP、上限は5MBです。

## 公開サイトと管理画面の関係

公開サイト:

```text
/
about.html
molkky.html
events.html
reports.html
member.html         # 個別メンバー詳細テンプレート（?id=xxx で出し分け）
news.html           # 個別お知らせ詳細テンプレート（?id=xxx で出し分け）
contact.html
privacy.html
```

メンバー一覧は専用ページを廃止し、トップページ `#members` セクションに統合済み（2026-05-24）。

管理画面:

```text
admin/login.html
admin/index.html
admin/events.html
admin/venues.html
admin/news.html
admin/event-participants.html
admin/event-participants-detail.html
admin/contact-submissions.html
admin/reports.html
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
adminUids = 管理者の Firebase Authentication UID 一覧
```

2026年6月5日時点では、あなたのUID `PvM8qIBG1ETC2Y7qM3PFj1i2ASk2` を先行登録済みです。2026年6月9日に `hvb1k4YC0ma98YsdlKU8DCEcqa63` も管理者UIDとして追加しました。

## Firestore コレクション案

### events

イベント情報を保存します。

主なフィールド:

```text
eventDate
startTime
endTime
venueId
fee
rainPolicy
status
createdAt
updatedAt
```

2026年6月7日に、イベント基本情報からタイトル、説明文、定員、持ち物、公開フラグを削除した。開催場所は `venues` のドキュメントIDを `venueId` として保存し、公開サイトとお問い合わせフォームでは `venues` の場所名・住所・画像などを組み合わせて表示する。

公開サイトでは `status == "scheduled"` かつ `eventDate >= 今日` のイベントを `eventDate` 昇順で取得するため、`firestore.indexes.json` に `events` 用複合インデックスを定義する。

### venues

イベント開催場所を保存します。

主なフィールド:

```text
name
area
address
venueType      # outdoor / indoor
imageUrl
mapUrl
accessNote
note
displayOrder
isActive
createdAt
updatedAt
```

2026年6月7日に、管理画面 `admin/venues.html` からの追加・編集と、イベント管理画面 `admin/events.html` での選択式利用を実装した。会場タイプは「屋外会場」「屋内会場」の二択とする。
2026年6月7日に、会場画像は `admin/venues.html` から Storage `venues/{venueId}/` 配下へアップロードする方式へ統一。画像URLの手入力は廃止し、取得したURLを `venues.imageUrl` に保存する。

公開サイトとイベント管理画面では `isActive == true` かつ `displayOrder` 昇順で取得するため、`firestore.indexes.json` に `venues` 用複合インデックスを定義する。

### news

トップページ「お知らせ」カルーセルおよびお知らせ詳細ページ `news.html` に表示する告知記事を保存します。
2026年6月5日に、管理画面 `admin/news.html` からの追加・編集・公開切替と、公開サイト `index.html#news` / `news.html?id=xxx` のFirestore読み込みを実装済み。未登録時や取得失敗時は、初期ダミーデータ4件をフォールバック表示する。

主なフィールド（案）:

```text
title
body            # 段落配列または改行区切りの長文
publishDate     # 表示用の配信日
imageUrl        # 詳細ページの上部ビジュアル（未指定時はCSSプレースホルダー）
isPublished
createdAt
updatedAt
```

2026年6月8日に、管理画面でのプレースホルダー色指定を廃止。以後の新規保存では `visualVariant` を保存せず、既存記事を更新した場合も同フィールドを削除する。

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

### members（廃止）

メンバー情報は Firestore ではなく、ローカルデータで管理します。
2026年6月7日に、Firestore `members` コレクション、管理画面 `admin/members.html`、Storage `members/` 画像管理を廃止する方針へ変更しました。
同日に `firebase firestore:delete members --recursive --force --project molkkynist-a0abd` を実行し、Firestore `members` コレクションは削除済みです。Firestore 本番に残っていた `members(isPublished, displayOrder)` 複合インデックスも名前指定で削除済みです。Firebase Storage は未セットアップでバケット自体が存在しないため、`members/` 配下の削除対象はありません。

公開サイト `index.html#members` / `member.html?id=xxx` は、`js/member-data.js` のローカルデータを正本として表示します。メンバー画像は Firebase Storage ではなく `assets/` 配下のローカル画像を参照します。

主なフィールド:

```text
id
name
role
occupation
image
visualVariant
startedReason
favoriteThings
firstTimerMessage
comment
displayOrder
isPublished
```

`createdAt` / `updatedAt` は Firestore 用の管理項目のため、ローカルメンバーデータには原則含めません。

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
responseStatus     # 管理用: unhandled / in_progress / done
responseMemo       # 管理用: 対応メモ
responseUpdatedAt  # 管理用: 対応状況の最終更新日時
responseUpdatedBy  # 管理用: 更新した管理者UID
```

## 公開データの考え方

公開サイトでは、公開対象のデータだけを表示します。イベントは `status == "scheduled"`、開催場所は `isActive == true`、お知らせ・活動レポートは `isPublished == true` を基準にします。メンバーはローカルデータの `isPublished` を基準にします。

下書きや非公開データは管理画面でのみ扱います。

## JavaScript の使用方針

Firebase を使用する画面では JavaScript が必要になります。

使用箇所:

- 公開サイトで Firestore からイベント情報と開催場所情報を読み込む（参加費 `events.fee` と `venues` の場所情報のトップページ表示を含む）
- 公開サイトで Firestore から活動レポートを読み込む
- 公開サイトのお問い合わせフォームで Firestore の `events` と `venues` を参照し、参加日程選択肢として表示する
- 公開サイトのお問い合わせフォームから `contactSubmissions` に書き込む
- お問い合わせフォーム送信時に、ユーザーへ受付完了の自動返信メールを送信する（Cloud Functions + `nodemailer` + Gmail SMTP）
- 管理画面でログイン状態を判定する
- 管理画面でデータを追加・編集する
- 管理画面で参加希望以外のお問い合わせ送信内容を確認し、自動返信メールの送信状態を Cloud Functions 経由で取得する
- 管理画面でお問い合わせの対応ステータスと対応メモを更新する
- 管理画面で `contactSubmissions` の参加希望データをイベント別に集計し、イベント一覧ページでは参加人数、詳細ページでは参加者名と開閉式の参加者詳細を表示する
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
  - 用件区分が「参加希望」のとき `events` コレクション（`status == "scheduled"` かつ `eventDate >= 今日`）を `eventDate asc` で取得し、`venues` の開催場所名と組み合わせてトグル表示
  - 送信時は `contactSubmissions` コレクションへ `addDoc`（`createdAt` は `serverTimestamp()`）
  - プライバシーポリシー同意チェックと、参加希望時の日程選択（最低1件）をクライアント側で検証

Firebase コンソールで本番プロジェクトを作成したら、`js/firebase-config.js` の値を差し替え、`contactSubmissions` への `create` のみを許可するセキュリティルールを適用してください。

## 管理画面クライアント実装（2026-05-21 追加）

初期管理画面として下記を追加しました。

- `admin/login.html`
  - Firebase Authentication のメールアドレス + パスワードでログイン
  - `js/firebase-config.js` の `adminConfig.adminUids` とログインユーザーUIDを照合
- `admin/index.html`
  - イベント管理・開催場所・イベント参加者一覧・お問い合わせ管理への入口
  - 一般公開ページからはリンクしない
- `admin/events.html`
  - Firestore `events` の追加・編集・状態切り替え
  - 開催場所は Firestore `venues` から選択
  - 開催予定イベントは公開サイトのお問い合わせフォームの参加希望日程候補として利用
- `admin/venues.html`
  - Firestore `venues` の追加・編集
  - イベント管理画面で選択する場所名・住所・画像・会場タイプを管理
- `admin/contact-submissions.html`
  - Firestore `contactSubmissions` のうち `inquiryType != "participate"` を送信日時降順で一覧・詳細表示
  - 参加希望は非表示にし、イベント参加者一覧で扱う
  - 自動返信メールの送信状態は callable Functions 経由で取得
- `admin/event-participants.html`
  - 開催予定イベントごとに参加人数を表示
  - イベントカードから `eventId` 付きの詳細ページへ遷移
- `admin/event-participants-detail.html`
  - `contactSubmissions` の `inquiryType == "participate"` と `selectedEventIds` をもとに、選択イベントの参加者名を一覧表示
  - 各参加者の詳細情報は開閉式で表示

管理画面用スクリプト:

- `js/admin-auth.js` … Firebase初期化、ログイン状態確認、管理者UID判定、ログアウト
- `js/admin-login.js` … ログイン画面制御
- `js/admin-events.js` … イベント管理
- `js/admin-venues.js` … 開催場所管理
- `js/admin-contact-submissions.js` … お問い合わせ管理
- `js/admin-event-participants.js` … イベント参加者一覧
- `js/admin-event-participants-detail.js` … イベント参加者詳細

`js/firebase-config.js` には `adminConfig.adminUids` を追加しています。
2026年6月5日時点では、あなたのUID `PvM8qIBG1ETC2Y7qM3PFj1i2ASk2` を先行登録済みです。2026年6月9日に `hvb1k4YC0ma98YsdlKU8DCEcqa63` も管理者UIDとして追加しました。

## サーバーサイド実装（2026-05-21 追加 / 2026-05-22 更新）

`functions/` ディレクトリに Cloud Functions（Node.js 20 / Firebase Functions v2）を新設しました。

- エントリポイント: `functions/index.js`
- リージョン: `asia-northeast1`
- トリガー: `contactSubmissions/{submissionId}` の `onDocumentCreated`
- 役割: 送信者宛の自動返信メールと運営者宛の新規問い合わせ通知メールを Gmail SMTP（`nodemailer`）で直接送信し、送信状態を `mail` コレクションへ Admin SDK 経由で記録する
- callable: `getMailDeliveryStates`
  - 管理画面のお問い合わせ管理から呼び出し
  - `contactSubmissions/{id}` に紐づく `mail.delivery.state` を返す
  - 管理者判定は Functions 環境変数 `ADMIN_UIDS`（カンマ区切り）または互換用 `ADMIN_UID` と `request.auth.uid` の一致で行う

メール本文（テキスト/HTML）と件名は `functions/index.js` 内で生成しており、文面方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」に記載しています。参加希望の場合は通常のお問い合わせ文面とは分岐し、`events` の開催日・時間・参加費・雨天時対応と、`venueId` から参照した `venues` の会場名・住所・GoogleマップURL・アクセス補足・備考を自動返信メールと運営者宛通知メールへ差し込みます。

2026年6月10日に、フォーム送信時の運営者宛通知メールを追加しました。通知先は `ADMIN_NOTIFICATION_EMAIL` 環境変数で上書きでき、未設定時は `REPLY_TO_EMAIL`（初期値 `molkkynist@gmail.com`）を使用します。運営者宛通知メールの `Reply-To` はフォーム入力者のメールアドレスにするため、石井さんが通知メールへそのまま返信すると送信者へ返信できます。`mail` コレクションには `type: "autoReply"` と `type: "adminNotification"` を分けて記録します。

### SMTP Secret

GrouMap と同じ運用に寄せ、Firebase Extensions「Trigger Email from Firestore」は使わず、Cloud Functions から Gmail SMTP へ直接送信します。

Functions Secret として下記を設定します。

- `SMTP_HOST`: `smtp.gmail.com`
- `SMTP_PORT`: `587`
- `SMTP_USER`: `molkkynist@gmail.com`
- `SMTP_PASS`: Google アカウントのアプリパスワード等
- `SMTP_FROM`: `Molkkynist <molkkynist@gmail.com>`
- `SMTP_SECURE`: `false`

返信先は `REPLY_TO_EMAIL` 環境変数で上書きできます。未設定時は `molkkynist@gmail.com` を使います。運営者宛通知先は `ADMIN_NOTIFICATION_EMAIL` 環境変数で上書きできます。未設定時は `REPLY_TO_EMAIL` と同じ宛先を使います。

2026-06-05 時点で `SMTP_HOST=smtp.gmail.com`、`SMTP_PORT=587`、`SMTP_USER=molkkynist@gmail.com`、`SMTP_PASS`、`SMTP_FROM=Molkkynist <molkkynist@gmail.com>`、`SMTP_SECURE=false` は Firebase Secret に設定済みです。

2026-06-05 に Firestore REST 経由で `contactSubmissions` を作成し、Cloud Functions ログで `molkkynist@gmail.com` 宛の自動返信メール送信成功を確認済みです。

2026年6月5日に B-1 として Cloud Functions 実行サービスアカウント `264727261204-compute@developer.gserviceaccount.com` へ `roles/datastore.user` を付与済みです。`mail` コレクションへの送信状態記録に必要なFirestore読み書き権限は設定済みです。`functions/index.js` では引き続き `safeMailSet()` / `safeMailUpdate()` により、送信状態記録の失敗で自動返信メール送信自体が止まらないようにしています。

### Firebase 設定ファイル一式

ルート直下に下記を追加しました（2026-05-21）。

- `firebase.json` … Hosting / Firestore / Functions / Emulator suite の構成
- `.firebaserc` … Firebase プロジェクト `molkkynist-a0abd` を default に設定済み
- `firestore.rules` … 公開コレクション読み取り公開、`contactSubmissions` は create 限定（型・件数バリデーション付き）、`mail` は一般ユーザー全面禁止
- `firestore.indexes.json` … `events` (`status` + `eventDate` asc)、`venues` (`isActive` + `displayOrder` asc)、`reports` (`isPublished` + `eventDate` desc) などの複合インデックス

2026年6月7日に `storage.rules` を追加し、`firebase.json` に Storage Rules 参照を追加しました。`news/` / `venues/` / `reports/` 配下の画像は公開読み取り、作成・更新・削除は管理者UIDのみ許可します。メンバー画像はローカルアセット管理へ移行したため、Storage Rules の対象外です。

セキュリティルールの管理者UID配列には、あなたのUID `PvM8qIBG1ETC2Y7qM3PFj1i2ASk2` と `hvb1k4YC0ma98YsdlKU8DCEcqa63` を登録済みです。

### Firebase 構築状況（2026-05-21）

- Firebase プロジェクト: `molkkynist-a0abd`
- Webアプリ: `Molkkynist` を作成済み
- 公開URL: `https://molkkynist-a0abd.web.app`
- `js/firebase-config.js`: Web SDK 設定値を反映済み
- Firebase Hosting: デプロイ済み
- Firestore: default データベースを `asia-northeast1`（東京）で作成済み
- Firestore Rules / Indexes: デプロイ済み
- Cloud Functions: `asia-northeast1` にデプロイ済み（`sendAutoReplyOnContactCreate` / `getMailDeliveryStates`）
- Firebase Authentication: あなたのUIDは管理者として先行反映済み。2026-06-05 D-8 で本番管理画面ログイン、イベント管理、お問い合わせ管理の先行確認済み。石井さん用ユーザー作成と石井さんUIDの追加が未完了
- 自動返信メール / 運営者宛通知メール: 2026-05-22 に Gmail SMTP 直送方式へ変更済み。2026-06-05 に送信用メールを `molkkynist@gmail.com` に確定し、`SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `SMTP_SECURE` を設定済み。2026-06-10 に、フォーム入力者宛の受付完了メールに加えて、`molkkynist@gmail.com` 宛の運営者通知メールを送る構成へ更新。`mail` コレクションへの送信状態記録に必要なFirestore権限は B-1 で対応済み。D-8 の新規テストお問い合わせ `d8-test-20260605160454` では `mail.delivery.state=SUCCESS` と管理画面の「送信済み」表示を確認済み。
- Cloud Run Invoker: 2026-06-05 D-8 で、Callable Function `getMailDeliveryStates` の Cloud Run サービス `getmaildeliverystates` へ `allUsers` の `roles/run.invoker` を付与済み。関数内部でFirebase管理者UID判定を行う。
- Firebase Storage: 2026-06-07 にお知らせ / 開催場所画像アップロード用のクライアント実装と `storage.rules` を追加。ただし Firebase Storage はプロジェクトで未セットアップのため、Storage Rules のデプロイは未実施。活動レポート画像は `admin/reports.html` 実装時に同じ共通ルールで対応する。メンバー画像はローカルアセット管理へ移行済み。

## 初期段階での注意点

- Firebase 設定情報を公開しても問題ないが、セキュリティルールを必ず適切に設定する
- 管理画面で制御していても、Firestore ルールが甘いと不正書き込みされる可能性がある
- 画像アップロードは容量や料金に注意する
- 公開サイトの表示速度を落とさないように、画像サイズを調整する

## 今後決めること

- 石井さんの Firebase Authentication ユーザー
- 管理者UIDを追加する場合は `js/firebase-config.js` / `firestore.rules` / Functions の管理者UID判定へ同じUIDを追加する。
- Cloud Functions 環境変数 `ADMIN_UIDS` を使う場合は、`getMailDeliveryStates` の管理者判定用にカンマ区切りで複数UIDを指定する。
- Firestore の正式なデータ構造
- 画像アップロードのサイズ制限（初期値5MB。活動レポート等も同じ基準で開始し、必要に応じて調整）
- DM 経由の申込時にユーザーへ受付メールを送る運用フロー（管理画面から手動送信するか）
