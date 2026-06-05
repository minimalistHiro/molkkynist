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

## 実装状況（2026-05-21）

初期管理画面として、以下を実装済みです。

- `admin/login.html`
  - メールアドレス + パスワードでログイン
  - `js/firebase-config.js` の `adminConfig.adminUids` で管理者UID一覧を照合
  - Firebase設定値または管理者UIDが未設定の場合はログインを無効化
- `admin/index.html`
  - イベント管理・お問い合わせ管理への導線
  - ログアウトボタン
- `admin/events.html`
  - イベントの追加・編集
  - 公開 / 非公開の切り替え
  - 開催日、時間、場所、参加費、定員、持ち物、雨天時対応、状態の編集
- `admin/contact-submissions.html`
  - `contactSubmissions` の送信日時降順一覧
  - 送信内容の詳細表示
  - Cloud Functions callable `getMailDeliveryStates` 経由で自動返信メールの送信状態を表示

未実装の管理画面:

- `admin/reports.html`
- `admin/members.html`
- `admin/news.html`
- `admin/settings.html`
- Storage を使った画像アップロード

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
- 活動レポート管理
- メンバー管理
- サイト基本設定
- お問い合わせ管理（送信内容の閲覧・自動返信メールの送信状況確認）

## イベント管理要件

想定画面:

```text
admin/events.html
```

できること:

- イベントを追加する
- イベントを編集する
- イベントを非公開にする
- 開催済みとして扱う
- 表示順または開催日順で管理する
- トップページに表示する「次回イベントカレンダー」の対象イベントを編集・差し替えする
- 公開サイトのお問い合わせフォーム（参加希望時の日程選択トグル）に表示される候補日程を、ここでの登録・公開状態切り替えで制御する

入力項目:

- タイトル
- 説明文
- 開催日
- 開始時間
- 終了時間
- 場所名
- 住所
- 参加費
- 定員
- 持ち物
- 雨天時の対応
- 公開状態

## お知らせ管理要件

想定画面:

```text
admin/news.html
```

できること:

- お知らせ記事を追加する
- お知らせ記事を編集する
- お知らせを非公開にする
- 配信日を更新する
- 必要に応じてカードビジュアルを差し替える

入力項目:

- タイトル
- 本文
- 配信日
- カードビジュアル（暫定はカラープレースホルダー、将来は画像）
- 公開状態

備考:

- 2026年5月24日時点では、トップページ `#news` カルーセルと共通テンプレート `news.html` のみ実装済み（ダミーデータ4件をクライアントJS `js/news-detail.js` で表示）。
- Firestore `news` コレクションと管理画面 `admin/news.html` は未実装。`FIREBASE_ARCHITECTURE.md` の `news` コレクション案に従って後続フェーズで実装する。

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

## メンバー管理要件

想定画面:

```text
admin/members.html
```

できること:

- メンバーを追加する
- メンバー情報を編集する
- メンバーを非公開にする
- 表示順を調整する

入力項目:

- 名前
- 役割
- プロフィール
- ひとことコメント
- 写真または画像
- 表示順
- 公開状態

## お問い合わせ管理要件

想定画面:

```text
admin/contact-submissions.html
```

できること:

- 公開サイトのお問い合わせフォーム経由で `contactSubmissions` に保存された送信内容を一覧表示する
- 送信日時の降順で並べる
- 1件ずつ詳細（名前 / メール / 電話 / 用件区分 / 参加希望日程 / 本文）を確認できる
- 各送信に対する自動返信メール（`mail` コレクション）の `delivery.state`（`SUCCESS` / `ERROR` / `PROCESSING` 等）と、エラー時のメッセージを表示する
- 必要に応じて手動でステータス（対応中・対応済み）を管理画面側に持たせる（将来検討）

入力項目（管理側）:

- 対応ステータス（未対応 / 対応中 / 対応済み）※将来追加
- 対応メモ ※将来追加

備考:

- 自動返信メールの文面（件名・本文・HTML）は管理画面では編集しない。コード `functions/index.js` の `renderTextBody()` / `renderHtmlBody()` で管理する。文面方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」を参照。
- DM 経由のお問い合わせはこの画面には記録されない（Instagram 側で完結）。受領通知の運用は R-8 で検討中。
- セキュリティルール (`firestore.rules`) で `contactSubmissions` は管理者のみ read/update/delete 可。`mail` コレクションは管理画面からも参照不可（Cloud Functions の Admin SDK のみアクセス）。送信状況の表示はサーバーサイド経由（Cloud Functions の callable 関数等）で実装する想定。
- 2026-06-05 D-7 実装後は、callable `getMailDeliveryStates` が `mail.delivery.state` を返す際の管理者判定を複数UID対応にしている。Functions 環境変数は `ADMIN_UIDS`（カンマ区切り）を優先し、既存 `ADMIN_UID` も互換用に読み込む。
- 2026-06-05 B-1 で Cloud Functions 実行サービスアカウント `264727261204-compute@developer.gserviceaccount.com` に `roles/datastore.user` を付与済み。これにより、`mail` コレクションへの送信状態記録に必要なFirestore読み書き権限は設定済み。
- 2026-06-05 D-8 で、本番 `admin/contact-submissions.html` からお問い合わせ一覧・詳細閲覧と自動返信メール送信状態の取得を確認済み。新規テストお問い合わせ `d8-test-20260605160454` では `mail.delivery.state=SUCCESS` が記録され、管理画面でも「送信済み」と表示された。
- 2026-06-05 D-8 で、Callable Function `getMailDeliveryStates` をブラウザから呼び出せるように、Cloud Run サービス `getmaildeliverystates` へ `allUsers` の `roles/run.invoker` を付与済み。外部からの到達は許可しつつ、実際の利用可否は Functions 内部のFirebase管理者UID判定で制御する。

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
- イベント公開・非公開

### 優先度 中

- 活動レポート追加・編集
- 画像アップロード
- メンバー情報編集

### 優先度 低

- サイト基本設定の編集
- 表示順の細かい調整
- 管理画面の高度な検索や絞り込み

## セキュリティ要件

- 石井さん以外は Firestore に書き込みできない
- 石井さん以外は Storage にアップロードできない
- 公開サイトでは公開済みデータだけを表示する
- 管理画面でログイン状態を常に確認する
- 管理者 UID はクライアント側の判定だけに使わず、Firebase のルールでも使用する

## 今後決めること

- 石井さんの Firebase Authentication アカウント
- 石井さんの管理者UID（確定後に `js/firebase-config.js` / `firestore.rules` / Functions 環境変数 `ADMIN_UIDS` へ追加）
- 石井さんUID追加後の本番ログイン・操作確認
- 管理画面のデザイン
- 画像アップロードの上限
- 下書き保存を必要とするか
