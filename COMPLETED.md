# 完了済みタスク一覧

> TODO.md で完了した項目を、完了日の降順（新しい順）で管理する。

---

## ルール

- TODO.md で `[x] 完了（日付）` または `[x] 廃止（日付）` となった項目をこちらに移動する。
- 完了日ごとにセクション（`## YYYY-MM-DD`）を設け、新しい日付が上に来るよう降順で並べる。
- 廃止された項目には廃止理由を併記する。
- 項目IDはTODO.mdと同一のものを使用する（一意性を維持）。

---

## 2026-05-23

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| C-6 | 独自対応 | HTML / CSS / assets | トップページ「協力団体・スポンサー」をロゴのみのレイアウトに変更し、ココシバのロゴ画像を配置 | `index.html` の `#partners` セクションを、ロゴ＋団体名＋役割の3段カード（`partner-card` / `partner-grid`）から、ロゴ画像のみを並べる `partner-logo` / `partner-logos` 構造に置き換え。新規ディレクトリ `assets/images/partners/` を追加し、ココシバの公式ロゴ（Antenna Books & Cafe ココシバ）を `cocoshiba.png` として配置。`css/styles.css` の旧 `.partner-card*` 系を、`max-width: 200px / max-height: 90px / object-fit: contain` の `.partner-logo__image` を含む新クラス群に書き換え、PC4カラム・タブレット／モバイル2カラムのレスポンシブ対応に調整。`DESIGN_GUIDELINES.md`「パートナー枠」項を新仕様（1枠1ロゴ、画像配置・命名ルール、テキスト併記なし）に書き換え。 |
| C-5 | 独自対応 | HTML / CSS / JavaScript | トップページ「次回イベント / 開催スケジュール」を月次カレンダー表示に変更 | `index.html` のスケジュールセクションから「イベント一覧へ」ボタンと「準備中／企画中」の静的2カードを削除し、`schedule-calendar` ブロック（月見出し＋前月／翌月ナビ、7列カレンダーグリッド、当月イベント一覧、ステータス行）に置き換え。新規 `js/schedule-calendar.js`（ESモジュール）で Firestore `events` の `isPublished == true` を取得し、該当日セルを淡い緑＋ドットでハイライト、カレンダー下に当月イベント（日付・タイトル・時間・場所）を縦並び表示。Firebase 未設定時はカレンダーのみ描画する安全側フォールバック。`css/styles.css` に `schedule-calendar*` 一式と 680px 以下のモバイル調整を追加。`SITE_STRUCTURE.md`「次回イベント / 開催スケジュール」項と `DESIGN_GUIDELINES.md`「静的スケジュールリスト」項を新仕様（月次カレンダー）に書き換え。 |

## 2026-05-22

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| C-4 | 独自対応 | HTML / CSS | ホームページ最下部のフッター付近に予約ボタンとSNSアイコン導線を追加 | `index.html` のフッター直前に `footer-reserve` セクションを追加し、上段中央にカプセル型の「ご予約はこちら」ボタン、下段にX・Instagram・LINEの3つのSNSアイコンリンクを配置。予約導線は既存フォーム `contact.html#contact-form` へ接続し、SNSリンクは正式URL確定まで仮リンクで実装。`css/styles.css` に `footer-reserve` / `footer-social` / `social-link` / `button--reserve` を追加。実装計画書: `plans/in_progress/20260522_batch_c-2-c-4.md`。 |
| C-3 | 独自対応 | HTML / CSS / JavaScript | スマートフォン表示時のヘッダーナビゲーションをハンバーガーメニュー化 | 公開8ページのヘッダーへ `nav-toggle` ボタンを追加し、`js/site-nav.js` で `aria-expanded` と `.is-open` を切り替える最小JSを実装。リンク選択、メニュー外クリック、Escキー、デスクトップ幅復帰時に閉じる挙動を追加。デスクトップでは横並びナビを維持し、スマートフォンでは縦並びメニューとして表示。実装計画書: `plans/in_progress/20260522_batch_c-2-c-4.md`。 |
| C-2 | 独自対応 | assets / HTML / CSS | ヘッダー左上のブランド名テキストを英字ロゴ画像に差し替え | 既存 `assets/images/logos/molkkynist-title-logo.png` から英字ワードマーク部分を切り出し、透明背景PNG `assets/images/logos/molkkynist-wordmark.png` を追加。公開8ページの `.brand__name` テキストを `.brand__wordmark` 画像へ置換し、既存アイコンは維持。ヘッダー内でロゴ高さとナビ干渉を抑えるCSSを追加。実装計画書: `plans/in_progress/20260522_batch_c-2-c-4.md`。 |

## 2026-05-21

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| D-4 | 独自対応 | 管理画面 / Firebase | 管理画面のお問い合わせ管理機能 | `admin/contact-submissions.html` と `js/admin-contact-submissions.js` を追加。`contactSubmissions` を送信日時降順で最大100件表示し、名前・メール・電話・用件区分・参加希望日程ID・本文を詳細確認可能。`mail` コレクションの `delivery.state` は管理画面から直接読まず、Cloud Functions callable `getMailDeliveryStates` を追加してAdmin SDK経由で取得する構成。callable の管理者判定には Functions 環境変数 `ADMIN_UID` を使用し、未設定時はエラーを返す。実装計画書: `plans/in_progress/20260521_batch_all.md`。 |
| D-2 | 会議決定 | 管理画面 / Firebase | 管理画面のイベント管理機能 | `admin/login.html`、`admin/index.html`、`admin/events.html`、`js/admin-auth.js`、`js/admin-login.js`、`js/admin-events.js` を追加。ログイン方式はTODO備考のデフォルトに従いメール+パスワードを採用。`js/firebase-config.js` に `adminConfig.adminUid` を追加し、`YOUR_ADMIN_UID` プレースホルダー継続。イベント管理では `events` の追加・編集・公開切替、開催日・時間・場所・参加費・定員・持ち物・雨天時対応・状態を編集可能。公開中イベントは既存お問い合わせフォームの日程選択候補に連動する。既存フォームの用件区分値もFirestoreルールに合わせ `event` へ修正。実装計画書: `plans/in_progress/20260521_batch_all.md`。 |
| A-3 | 会議決定 | HTML | 協力団体・スポンサー紹介セクションの追加（C-1へ統合のため廃止） | 2026-05-21 C-1に統合して廃止。`index.html` の `#partners` セクション、パートナー枠CSS、ココシバカード、募集枠×3はC-1で実装済み。残るココシバ実ロゴ画像の差し替えはA-4として別管理。実装計画書: `plans/in_progress/20260521_batch_all.md`。 |
| E-1 | 会議決定 | HTML | 全公開ページのSEO基本対策（タイトル・metaタグ・OGP・Twitter Card・canonical・構造化データ） | 全8ページ（`index.html` / `about.html` / `molkky.html` / `events.html` / `reports.html` / `members.html` / `contact.html` / `privacy.html`）の `<head>` に `meta name="keywords"`、`link rel="canonical"`、OGP 8種（`og:type` / `og:site_name` / `og:locale` / `og:title` / `og:description` / `og:url` / `og:image`）、Twitter Card 4種（`twitter:card=summary` / `title` / `description` / `image`）を追加。`index.html` のみ JSON-LD（Organization スキーマ）を追加。公開ドメインは `https://molkkynist-a0abd.web.app/` に確定済み。OGP 画像は既存のロゴ画像を暫定使用し、OGP 専用画像作成時に差し替え予定。実装計画書: `plans/in_progress/20260521_batch_seo-basics.md`。 |
| D-3 | 会議決定 | Firebase / 運用 | お問い合わせフォーム送信時の自動返信メール実装 | Cloud Functions v2（Node 20 / `asia-northeast1`）で `contactSubmissions` の `onDocumentCreated` を購読し、ユーザー宛の自動返信メールを送る構成。2026-05-21 初期実装では Trigger Email Extension が監視する `mail` コレクションへ Admin SDK 経由で書き込む方式。2026-05-22 に GrouMap と同じ Cloud Functions + `nodemailer` + Gmail SMTP 直送方式へ変更し、送信状態を `mail.delivery.state`（`PROCESSING` / `SUCCESS` / `ERROR`）へ記録する形に更新。`functions/index.js`（テキスト/HTML本文を生成、参加希望時は `events` を読んで日程行を整形、`escapeHtml` 適用）、`functions/package.json`、`functions/.gitignore` を追加。Firebase 初期構成として `firebase.json`・`.firebaserc`・`firestore.rules`（`contactSubmissions` は型/件数バリデーション付き create 限定、`mail` は一般ユーザー全面禁止）・`firestore.indexes.json` を整備。自動返信文面の方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」に追記。Gmail SMTP の実Secret設定と本番テストは D-6 で継続。 |
| F-1 | 会議決定 | 運用 / HTML | プライバシーポリシーの整備（D-1 公開の前提条件） | `privacy.html` を新規作成（個人情報の取得項目・利用目的・第三者提供・外部サービス利用・保管期間・開示請求・改定・問い合わせ窓口）。全ページfooterから導線設置。 |
| C-1 | 会議決定 | HTML / CSS | トップページを参考サイト構成に寄せて再整理 | `index.html` を「About → 開催スケジュール → 参加の流れ → 活動レポート → メンバー → FAQ(13問) → Instagram DM → 協力団体・スポンサー」の順に再構成。CONTENT_GUIDELINES の参加フロー併記情報・FAQ・スポンサー方針を反映。集合写真プレースホルダー、活動内容3カラム、静的スケジュールリスト、パートナーカード（ココシバ + 募集枠）を追加。`css/styles.css` に `about-layout` / `pillar-grid` / `schedule-list` / `partner-grid` / `flow-notes` / `section-lead` 等を追加。 |
| D-1 | 会議決定 | HTML / Firebase | 参加・お問い合わせフォームをサイト内に実装 | `contact.html` にフォームセクション（必須: 名前・メール／任意: 電話番号／用件区分・参加希望時の日程トグル・一言・プライバシーポリシー同意）を追加。`js/firebase-config.js` と `js/contact-form.js` を新規追加（Firebase v10 モジュラーCDN）。送信先は Firestore `contactSubmissions`、参加希望時は `events` (`isPublished==true` かつ `eventDate>=今日`) から日程を取得しトグル表示。Firebase 設定値が未投入の状態では送信を無効化し、Instagram DM への案内へ自動フォールバック。 |

---
