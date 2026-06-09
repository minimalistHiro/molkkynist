# ADMIN_REQUIREMENTS

## 管理画面の目的

管理画面は、オーナーである石井さんが Molkkynist のウェブサイトを更新するための専用画面です。

一般ユーザー向けのログイン機能は設けません。管理画面は石井さんのみが利用する前提で設計します。

## 基本方針

- 管理画面は `/admin/` 配下に作成する
- 一般ページのヘッダーやフッターには管理画面へのリンクを原則表示しない
- 石井さんは管理画面の URL を直接開いてログインする
- ログインには Firebase Authentication を使用する
- データの書き込み権限は Firestore Security Rules で制御する
- 管理画面側の表示制御だけに依存しない
- データベース項目を一覧表示する管理ページでは、各項目に編集ボタンと削除ボタンを設置する
- 削除ボタンは編集フォーム内ではなく、作成済み項目の一覧側に置き、実行前に確認ダイアログを表示する

## 実装状況（2026-05-21）

初期管理画面として、以下を実装済みです。

- `admin/login.html`
  - メールアドレス + パスワードでログイン
  - `js/firebase-config.js` の `adminConfig.adminUids` で管理者UID一覧を照合
  - Firebase設定値または管理者UIDが未設定の場合はログインを無効化
  - 2026年6月9日に `hvb1k4YC0ma98YsdlKU8DCEcqa63` を管理者UIDとして追加
- `admin/index.html`
  - イベント管理・開催場所・お知らせ管理・イベント参加者一覧・お問い合わせ管理への導線
  - ログアウトボタン
- `admin/events.html`
  - イベントの追加・編集
  - 開催日、時間、開催場所、参加費、雨天時対応、状態の編集
  - 開催場所は `venues` コレクションから選択する
- `admin/venues.html`
  - 開催場所の追加・編集
  - 場所名、都道府県・エリア、住所、会場タイプ、会場画像アップロード、GoogleマップURL、アクセス補足、備考、表示順、有効状態の編集
  - 有効な開催場所のみイベント管理画面の選択肢に表示
- `admin/news.html`
  - お知らせ記事の追加・編集
  - 公開 / 非公開の切り替え
  - 配信日、本文、カード画像アップロードの編集
- `admin/contact-submissions.html`
  - `contactSubmissions` のうち `inquiryType != "participate"` の送信日時降順一覧
  - 送信内容の詳細表示
  - 送信内容の削除
  - Cloud Functions callable `getMailDeliveryStates` 経由で自動返信メールの送信状態を表示
  - 参加希望のお問い合わせは非表示にし、イベント参加者一覧で管理
- `admin/event-participants.html`
  - 開催予定イベントをカード形式で一覧表示
  - 各イベントカードに参加人数を表示
  - 各イベントカードから `admin/event-participants-detail.html?eventId=...` へ遷移
- `admin/event-participants-detail.html`
  - 選択したイベントに紐づく参加希望者をユーザー名のみのリストで表示
  - 各ユーザー名の右側のくの字型ボタンを開くと、メールアドレス・電話番号・一言・申込日時・対応ステータスを表示
  - 参加者情報は `contactSubmissions` の `inquiryType == "participate"` と `selectedEventIds` から集計する

未実装の管理画面:

- `admin/reports.html`
- `admin/settings.html`

## ログイン要件

想定画面:

```text
admin/login.html
```

要件:

- メールアドレスとパスワード、または Google ログインでログインできる
- ログイン後に管理者 UID を確認する
- 管理者でない場合は管理画面を表示しない
- 管理者でない場合はログアウトさせる、またはエラー表示にする

## ダッシュボード要件

想定画面:

```text
admin/index.html
```

要件:

- 管理対象へのリンクを表示する
- 最近更新したイベントやレポートを確認できる
- ログアウトできる

表示項目:

- イベント管理
- 開催場所
- 活動レポート管理
- サイト基本設定
- イベント参加者一覧（イベント別の参加人数・参加希望者情報の閲覧）
- お問い合わせ管理（参加希望以外の送信内容の閲覧・自動返信メールの送信状況確認）

## イベント管理要件

想定画面:

```text
admin/events.html
```

できること:

- イベントを追加する
- イベントを編集する
- イベントを削除する
- 開催予定 / 受付終了 / 開催済み / 中止の状態を切り替える
- 開催日順で管理する
- トップページに表示する「開催スケジュール」の対象イベントを編集・差し替えする
- 公開サイトのお問い合わせフォーム（参加希望時の日程選択トグル）に表示される候補日程を、ここでの登録・状態切り替えで制御する
- 開催場所は `venues` コレクションに登録済みの有効な会場から選択する

入力項目:

- 開催日
- 開始時間
- 終了時間
- 開催場所
- 参加費
- 雨天時の対応
- 状態

備考:

- 2026年6月7日にイベント基本情報を整理し、タイトル、説明文、定員、持ち物、公開するか否かの設定は削除した。
- 公開サイトの開催スケジュールとお問い合わせフォームの日程候補には、`status` が `scheduled` の今後のイベントを表示する。

## 開催場所管理要件

想定画面:

```text
admin/venues.html
```

できること:

- 開催場所を追加する
- 開催場所を編集する
- 開催場所を削除する
- イベント管理画面で選択できるかどうかを切り替える
- 表示順を調整する

入力項目:

- 場所名
- 都道府県・エリア
- 住所
- 会場タイプ（屋外会場 / 屋内会場）
- 会場画像アップロード
- GoogleマップURL
- アクセス補足
- 備考
- 表示順
- 有効状態

備考:

- `venues` コレクションに保存し、イベント管理画面では `venueId` として参照する。
- 有効状態をオフにした開催場所は、既存イベントには残るが新規イベント作成時の選択肢には表示しない。

## お知らせ管理要件

想定画面:

```text
admin/news.html
```

できること:

- お知らせ記事を追加する
- お知らせ記事を編集する
- お知らせを非公開にする
- お知らせを削除する
- 配信日を更新する
- 必要に応じてカードビジュアルを差し替える

入力項目:

- タイトル
- 本文
- 配信日
- カード画像アップロード（未設定時はプレースホルダー表示）
- 公開状態

備考:

- 2026年6月5日に `admin/news.html` と Firestore `news` コレクション連携を実装済み。公開サイト側はトップページ `#news` カルーセルと共通テンプレート `news.html?id=xxx` で公開済み記事を表示し、Firestore未登録・取得失敗時は初期ダミーデータ4件をフォールバック表示する。
- 2026年6月7日に画像URL手入力を廃止し、Cloud Storage for Firebase へのカード画像アップロード方式へ統一。
- 2026年6月8日に、管理画面の「プレースホルダー色」入力を削除。画像未設定時は標準プレースホルダーを使う。

## 活動レポート管理要件

想定画面:

```text
admin/reports.html
```

できること:

- レポートを追加する
- レポートを編集する
- レポートを非公開にする
- 写真を登録する

入力項目:

- タイトル
- 開催日
- 開催場所
- 参加人数
- 本文
- 画像
- 公開状態

## メンバー管理要件（廃止）

2026年6月7日に、メンバー情報は管理画面・Firestore・Firebase Storage ではなく、ローカルデータと `assets/` 配下の画像で管理する方針へ変更した。

廃止対象:

- `admin/members.html`
- `js/admin-members.js`
- Firestore `members` コレクション
- Storage `members/` 配下のメンバー画像管理

今後の追加・編集:

- `js/member-data.js` を正本として編集する。
- メンバー画像は `assets/` 配下で管理する。
- 新規メンバー追加時は `local-member-create` スキルで必要項目をヒアリングしてからローカルデータへ追加する。

入力項目:

- 名前
- 役割
- 写真アップロード
- モルックを始めたきっかけ
- モルック以外の好きなこと
- 初参加者へのメッセージ
- ひとことコメント
- 表示順
- 公開状態

備考:

- 2026年6月6日に R-10 を確定し、個人情報寄りの項目（年齢・住所・連絡先・個人SNSなど）は掲載しない方針とした。写真未設定時はアイコン風プレースホルダーを表示する。
- 2026年6月7日に一度 `admin/members.html` へ写真アップロード欄を追加したが、その後の方針変更によりメンバー管理画面ごと廃止した。

## 管理画面の画像アップロード共通ルール

- 管理画面で扱う画像は、原則として Cloud Storage for Firebase へアップロードする。
- 管理画面に画像URLの手入力欄は設けない。
- Firestore には、Storageアップロード後に取得した表示用URLを `imageUrl` または `imageUrls` として保存する。
- 公開サイト側は Firestore の `imageUrl` / `imageUrls` を表示に使う。
- 対応形式は JPEG / PNG / WebP とする。
- 初期上限は5MBとする。
- 一般ユーザーは Storage にアップロードできない。
- Storage Rules で管理者UIDのみ作成・更新・削除を許可する。
- 公開サイトに表示する画像は Storage 側で公開読み取りを許可する。
- 画像差し替え時やデータ削除時は、可能な範囲で旧Storage画像も削除する。

## お問い合わせ管理要件

想定画面:

```text
admin/contact-submissions.html
```

できること:

- 公開サイトのお問い合わせフォーム経由で `contactSubmissions` に保存された送信内容を一覧表示する
- `inquiryType == "participate"` の参加希望はこの画面では非表示にする
- 参加希望以外の用件（イベント問い合わせ / メディア取材 / その他）のみを表示対象にする
- 送信日時の降順で並べる
- 1件ずつ詳細（名前 / メール / 電話 / 用件区分 / 本文）を確認できる
- 各送信に対する自動返信メール（`mail` コレクション）の `delivery.state`（`SUCCESS` / `ERROR` / `PROCESSING` 等）と、エラー時のメッセージを表示する
- 手動で対応ステータス（未対応・対応中・対応済み）と対応メモを保存できる
- 不要になった送信内容を削除できる

入力項目（管理側）:

- 対応ステータス（未対応 / 対応中 / 対応済み）
- 対応メモ

備考:

- 2026年6月6日に D-9 として、`admin/contact-submissions.html` の詳細欄へ対応ステータスと対応メモの保存フォームを追加。保存先は `contactSubmissions.responseStatus` / `responseMemo` / `responseUpdatedAt` / `responseUpdatedBy`。
- 2026年6月8日に、参加希望のお問い合わせは `admin/contact-submissions.html` では非表示にし、`admin/event-participants.html` / `admin/event-participants-detail.html` 側でイベントごとに確認する方針へ整理。
- 自動返信メールの文面（件名・本文・HTML）は管理画面では編集しない。コード `functions/index.js` の `renderTextBody()` / `renderHtmlBody()` で管理する。文面方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」を参照。
- DM 経由のお問い合わせはこの画面には記録されない（Instagram 側で完結）。受領通知の運用は R-8 で検討中。
- セキュリティルール (`firestore.rules`) で `contactSubmissions` は管理者のみ read/update/delete 可。`mail` コレクションは管理画面からも参照不可（Cloud Functions の Admin SDK のみアクセス）。送信状況の表示はサーバーサイド経由（Cloud Functions の callable 関数等）で実装する想定。
- 2026-06-05 D-7 実装後は、callable `getMailDeliveryStates` が `mail.delivery.state` を返す際の管理者判定を複数UID対応にしている。Functions 環境変数は `ADMIN_UIDS`（カンマ区切り）を優先し、既存 `ADMIN_UID` も互換用に読み込む。
- 2026-06-05 B-1 で Cloud Functions 実行サービスアカウント `264727261204-compute@developer.gserviceaccount.com` に `roles/datastore.user` を付与済み。これにより、`mail` コレクションへの送信状態記録に必要なFirestore読み書き権限は設定済み。
- 2026-06-05 D-8 で、本番 `admin/contact-submissions.html` からお問い合わせ一覧・詳細閲覧と自動返信メール送信状態の取得を確認済み。新規テストお問い合わせ `d8-test-20260605160454` では `mail.delivery.state=SUCCESS` が記録され、管理画面でも「送信済み」と表示された。
- 2026-06-05 D-8 で、Callable Function `getMailDeliveryStates` をブラウザから呼び出せるように、Cloud Run サービス `getmaildeliverystates` へ `allUsers` の `roles/run.invoker` を付与済み。外部からの到達は許可しつつ、実際の利用可否は Functions 内部のFirebase管理者UID判定で制御する。

## イベント参加者一覧要件

想定画面:

```text
admin/event-participants.html
admin/event-participants-detail.html
```

できること:

- 今後開催予定のイベントをカード形式で確認する
- 各イベントカードで参加人数を確認する
- イベントカードを選択し、そのイベント専用の参加希望者一覧ページへ遷移する
- 参加者一覧ページでは、初期表示でユーザー名のみを確認する
- ユーザー名右側のくの字型ボタンを開き、メールアドレス、電話番号、一言・質問、申込日時、対応ステータスを確認する

表示対象:

- `events.status == "scheduled"` かつ `eventDate >= 今日` のイベント
- `contactSubmissions.inquiryType == "participate"` かつ `selectedEventIds` に対象イベントIDを含む送信

備考:

- 参加者情報の正本は `contactSubmissions` とする。初期実装では `eventParticipants` 専用コレクションは作成しない。
- 住所は参加希望者一覧の表示対象にしない。過去の送信データに `contactSubmissions.address` が残っている場合も、この画面では表示しない。
- 参加希望データはお問い合わせ管理画面には表示しない。参加希望に関する確認は、この画面とイベント参加者詳細画面で行う。

## サイト基本設定要件

想定画面:

```text
admin/settings.html
```

できること:

- Instagram URL を更新する
- Instagram DM の案内文を更新する
- トップページのコピーを更新する
- 問い合わせ文言を更新する

入力項目:

- Instagram URL
- Instagram DM URL
- メインコピー
- サブコピー
- 問い合わせ案内文

## 初期実装で優先する管理機能

### 優先度 高

- ログイン
- イベント追加・編集
- 開催場所追加・編集
- イベント状態の切り替え

### 優先度 中

- 活動レポート追加・編集
- 画像アップロード（メンバー / お知らせ / 開催場所は2026年6月7日に実装済み。活動レポート画像は未実装）
- メンバー情報編集

### 優先度 低

- サイト基本設定の編集
- 表示順の細かい調整
- 管理画面の高度な検索や絞り込み

## セキュリティ要件

- 石井さん以外は Firestore に書き込みできない
- 石井さん以外は Storage にアップロードできない
- 公開サイトでは公開対象データだけを表示する。イベントは `status == "scheduled"`、開催場所は `isActive == true`、お知らせ・メンバー・活動レポートは `isPublished == true` を基準にする
- 管理画面でログイン状態を常に確認する
- 管理者 UID はクライアント側の判定だけに使わず、Firebase のルールでも使用する

## 今後決めること

- 石井さんの Firebase Authentication アカウント
- 管理者UIDを追加する場合は、`js/firebase-config.js` / `firestore.rules` / Functions の管理者UID判定へ同じUIDを追加する。
- 石井さんUID追加後の本番ログイン・操作確認
- 管理画面のデザイン
- 画像アップロードの上限（メンバー画像は初期値5MB。運用後に圧縮や上限調整を検討）
- 下書き保存を必要とするか
