# 完了済みタスク一覧

> TODO.md で完了した項目を、完了日の降順（新しい順）で管理する。

---

## ルール

- TODO.md で `[x] 完了（日付）` または `[x] 廃止（日付）` となった項目をこちらに移動する。
- 完了日ごとにセクション（`## YYYY-MM-DD`）を設け、新しい日付が上に来るよう降順で並べる。
- 廃止された項目には廃止理由を併記する。
- 項目IDはTODO.mdと同一のものを使用する（一意性を維持）。

---

## 2026-06-08

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| D-17 | 独自対応 | 管理画面 / Firestore | お問い合わせ管理の表示対象を参加希望以外に整理 | `admin/contact-submissions.html` / `js/admin-contact-submissions.js` で、`contactSubmissions.inquiryType == "participate"` の参加希望を非表示にし、参加希望以外のお問い合わせのみを一覧・詳細表示する構成へ変更。参加希望は既存の `admin/event-participants.html` / `admin/event-participants-detail.html` でイベントごとに確認する運用として、関連Markdownを同期。 |
| D-16 | 独自対応 | 管理画面 / Firestore | イベント参加者一覧管理画面を追加 | 新規 `admin/event-participants.html` / `js/admin-event-participants.js` では、開催予定イベントをカード形式で表示し、`contactSubmissions` の参加希望データからイベント別の参加人数を表示する。追加で `admin/event-participants-detail.html` / `js/admin-event-participants-detail.js` を作成し、イベントカードから詳細ページへ遷移して、参加者名のみの一覧と、くの字型ボタンで開閉できる詳細（メール・電話・一言・申込日時）を表示する構成にした。管理ダッシュボードと各管理画面ナビゲーションにも「イベント参加者一覧」導線を追加し、`css/styles.css` に専用レイアウトを追加。 |
| D-15 | 独自対応 | HTML / JavaScript / CSS | お問い合わせフォーム送信完了ページを追加 | `contact-complete.html` を追加し、フォーム送信成功後に `js/contact-form.js` から遷移する構成へ変更。完了ページには送信完了、受付完了メール送信、3営業日以内を目安に返信する旨、公式Instagram DM補足を記載。`css/styles.css` に完了ページ用のカード・余白・ボタン配置スタイルを追加し、`SITE_STRUCTURE.md` / `CONTENT_GUIDELINES.md` / 実装設計書を同期。 |

---

## 2026-06-07

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| D-14 | 独自対応 | メンバー / ローカル管理 | メンバー情報をDB管理からローカル管理へ移行 | Firestore `members` と Firebase Storage `members/` を使う運用を廃止し、`js/member-data.js` をメンバー情報の正本に変更。`js/member-list.js` / `js/member-detail.js` から Firestore 読み込みを削除し、トップページ `#members` と `member.html?id=xxx` はローカルデータのみで表示する構成へ移行した。管理画面から「メンバー管理」導線を削除し、`admin/members.html` / `js/admin-members.js` を削除。`firestore.rules` / `firestore.indexes.json` / `storage.rules` から `members` 関連を削除し、新規メンバー作成時に必要項目を聞き切る `local-member-create` スキルを `.claude/skills/` と `.agents/skills/` に追加した。Hosting / Firestore は本番デプロイ済み。Firestore本番の `members` コレクションと `members` 用複合インデックスは削除済み。Firebase Storage は未セットアップでバケット自体が存在しないため、`members/` 配下の削除対象はない。 |
| D-13 | 独自対応 | 管理画面 / Firebase Storage | 管理画面の画像登録をStorageアップロードへ統一 | `admin/members.html` / `admin/news.html` / `admin/venues.html` の画像URL手入力欄を廃止し、スマホ対応の画像アップロード欄とプレビューへ置き換えた。`js/admin-storage-upload.js` を追加し、JPEG / PNG / WebP、5MB以下の検証、Storageアップロード、ダウンロードURL取得、旧Storage画像削除を共通化。アップロード後は取得したURLを Firestore `imageUrl` に保存するため、公開サイト側は既存の画像表示ロジックを継続利用する。なおメンバー分は後続 D-14 でローカル管理へ移行し、現行の `storage.rules` 対象は `news` / `venues` / `reports` に整理済み。Storage Rules の本番デプロイと管理者UIDでのアップロード確認は別途実施が必要。 |

---

## 2026-06-06

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| D-12 | 独自対応 | 管理画面 / Firestore | メンバー管理と公開サイトのFirestore連携 | R-10を確定し、`admin/members.html` と `js/admin-members.js` を追加。Firestore `members` で名前、役割、写真またはアイコン画像URL、アイコン色、モルックを始めたきっかけ、モルック以外の好きなこと、初参加者へのメッセージ、ひとことコメント、表示順、公開状態を追加・編集できるようにした。トップページ `#members` は `js/member-list.js` で公開済み `members` を表示し、`member.html?id=xxx` は `js/member-detail.js` でFirestoreメンバーを優先表示する構成へ移行。未登録・取得失敗時は `js/member-data.js` の初期3名をフォールバック表示する。`firestore.indexes.json` に `members` 用複合インデックスを追加し、2026-06-06 に Hosting / Firestore indexes をデプロイ済み。 |
| D-9 | 独自対応 | 管理画面 / Firestore | お問い合わせ管理に対応ステータスと対応メモを追加 | `js/admin-contact-submissions.js` を更新し、詳細欄から `contactSubmissions.responseStatus`（未対応 / 対応中 / 対応済み）と `responseMemo` を保存できるようにした。保存時は `responseUpdatedAt` と `responseUpdatedBy` も記録する。送信一覧には対応ステータスチップを表示し、選択中のお問い合わせをハイライトする。`css/styles.css` に管理メモフォームと選択状態のスタイルを追加し、`ADMIN_REQUIREMENTS.md` / `FIREBASE_ARCHITECTURE.md` / `ROADMAP.md` を同期。 |

---

## 2026-06-05

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| D-10 | 独自対応 | 管理画面 / Firestore | お知らせ管理と公開サイトのFirestore連携 | `admin/news.html` と `js/admin-news.js` を追加し、Firestore `news` コレクションでタイトル、本文、配信日、カードビジュアルURL、プレースホルダー色、公開状態を追加・編集できるようにした。`firestore.rules` に `news` の公開読み取り・管理者書き込みルール、`firestore.indexes.json` に公開済み記事を配信日降順で読む複合インデックスを追加。トップページ `#news` は `js/news-list.js` で公開済み `news` を取得し、`news.html?id=xxx` は `js/news-detail.js` でFirestore記事を表示する構成へ移行。Firestore未登録・取得失敗時は `js/news-data.js` の初期4件をフォールバック表示する。 |
| D-8 | 独自対応 | Firebase / 管理画面 / 運用 | 既存管理画面の本番ログイン・操作確認 | あなたのアカウントで本番 `admin/events.html` と `admin/contact-submissions.html` にログインできることを確認。イベント管理では管理画面フォーム経由でテストイベント `D-8 UI確認 20260605` を作成し、編集ボタンからタイトル変更、公開ON、公開OFF戻しまで確認。Firestore 上でも `isPublished=true` / `false` の更新を確認し、確認後にテストイベント `VqrGp7KBbzNL6viPkklT` は削除済み。お問い合わせ管理では一覧・詳細閲覧を確認し、B-1後の新規テストお問い合わせ `d8-test-20260605160454` に対して `mail.delivery.state=SUCCESS` が記録され、管理画面でも「送信済み」と表示されることを確認。Callable Function `getMailDeliveryStates` は Cloud Run 側の未認証起動拒否が出ていたため、サービス `getmaildeliverystates` に `allUsers` の `roles/run.invoker` を付与し、関数内部のFirebase管理者判定で制御する構成に修正。 |
| B-1 | 独自対応 | Firebase / 管理画面 | Cloud Functions 実行サービスアカウントへFirestore書き込み権限を付与 | `gcloud auth login` で `info@groumapapp.com` を再認証し、`sendAutoReplyOnContactCreate` の実行サービスアカウント `264727261204-compute@developer.gserviceaccount.com` を確認。`gcloud projects add-iam-policy-binding molkkynist-a0abd --member=serviceAccount:264727261204-compute@developer.gserviceaccount.com --role=roles/datastore.user` を実行し、`gcloud projects get-iam-policy` で `roles/datastore.user` 付与済みを確認。これにより `mail` コレクションへの送信状態記録に必要なFirestore読み書き権限を付与済み。 |
| D-7 | 独自対応 | Firebase / 管理画面 | 管理者UIDを複数人対応に変更 | `js/firebase-config.js` の `adminConfig.adminUid` 単体管理を `adminConfig.adminUids` 配列へ変更し、あなたのUID `PvM8qIBG1ETC2Y7qM3PFj1i2ASk2` を先行登録。`js/admin-auth.js` のログイン後UID照合を配列チェックへ変更し、`firestore.rules` の `isAdmin()` もUID配列で判定する形へ更新。Cloud Functions は `ADMIN_UIDS`（カンマ区切り）と既存 `ADMIN_UID` の両方を読み、ハードコード済みUIDも含めて `getMailDeliveryStates` の管理者判定を複数UID対応にした。 |
| D-6 | 独自対応 | Firebase / 運用 / DNS | 自動返信メールを Gmail SMTP 方式で本番送信できるようにする | 送信用メールを無料 Gmail アカウント `molkkynist@gmail.com` に確定。石井さん側で2段階認証とApp Passwordを発行し、Firebase Functions Secret に `SMTP_HOST=smtp.gmail.com`、`SMTP_PORT=587`、`SMTP_USER=molkkynist@gmail.com`、`SMTP_PASS`、`SMTP_FROM=Molkkynist <molkkynist@gmail.com>`、`SMTP_SECURE=false` を設定。`functions/index.js` の返信先初期値を `molkkynist@gmail.com` に変更し、自動返信メール文面を「このメールへ返信すると、お問い合わせ窓口メールに届く」表現へ更新。`firebase deploy --only functions --project molkkynist-a0abd` でデプロイし、Firestore REST 経由のフォーム相当テスト `codex-test-20260605-1425` に対して自動返信メール送信成功ログを確認。`mail` コレクションへの送信状態記録に必要なCloud Functions実行サービスアカウントのFirestore書き込み権限は B-1 で対応済み。 |

---

## 2026-05-28

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| A-4 | 会議決定 | assets / HTML / CSS | ココシバの実ロゴ画像を背景透過PNGに差し替え | `assets/images/partners/cocoshiba-transparent.png` を追加し、`index.html` の `#partners` セクションでココシバロゴの参照先を差し替え。募集枠の「Logo」プレースホルダーを撤去し、掲載済みロゴのみを並べる構成に整理。`css/styles.css` の `partner-logos` / `partner-logo` / `partner-logo__image` を、透過ロゴが余白なく自然に見えるレイアウトへ調整。 |

---

## 2026-05-24

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| C-7 | 独自対応 | HTML | メンバー一覧専用ページ `members.html` を廃止し、一覧表示をトップページ `#members` セクションに統合 | `index.html` の `#members` セクション右上の「メンバー紹介へ」ボタンを撤去し、`section-heading--with-link` ラッパーを通常の `section-heading` に戻した。`members.html` をリポジトリから削除。全公開ページ（`about` / `contact` / `events` / `index` / `molkky` / `news` / `privacy` / `reports` / `member`）のフッター「メンバー」リンクと、`member.html` の「メンバー一覧へ戻る」ボタンの参照先を `index.html#members` に変更。個別メンバー詳細テンプレート `member.html?id=xxx` と `js/member-detail.js` は存続。`SITE_STRUCTURE.md`「6. メンバー紹介」「初期実装の優先順位」「初期静的サイト実装メモ」「2026-05-24 追加実装」、`FIREBASE_ARCHITECTURE.md`「公開サイトと管理画面の関係」、`ROADMAP.md` 2026-05-24 進捗を同期。 |
| C-8 | 独自対応 | HTML / CSS | `index.html` の `#about` から3つのアクティビティカード（Activity 01〜03）を撤去し、ヒーロー文言を一文に簡素化 | `#about` セクション内の `pillar-grid` ブロック（「定期イベントの開催」「初心者サポート」「地域とのつながり」の3カード）を削除し、トップでは文章紹介と `about.html` への導線テキストリンクに集約。未使用となった `.pillar-grid` / `.pillar-card` / `.pillar-card p` と、2つのレスポンシブブレークポイント内の `pillar-grid` 参照を `css/styles.css` から削除。あわせてヒーローの2文構成のリードを「Molkkynistは「モルックをもっと身近な遊びに。」をコンセプトにしたモルックコミュニティです」の一文に置き換え、`#hero-title` 専用の文字サイズ縮小スタイル（`clamp(1.4rem, 3.2vw, 2rem)` / モバイル `clamp(1.25rem, 5.2vw, 1.7rem)`）を追加してワードマーク主体のヒーローに合わせて見出しの重みを抑えた。`SITE_STRUCTURE.md`「2026-05-24 追加実装」、`CONTENT_GUIDELINES.md`「ヒーローキャッチコピー」、`ROADMAP.md` 2026-05-24 進捗を同期。 |

---

## 2026-05-23

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| C-6 | 独自対応 | HTML / CSS / assets | トップページ「協力団体・スポンサー」をロゴのみのレイアウトに変更し、ココシバのロゴ画像を配置 | `index.html` の `#partners` セクションを、ロゴ＋団体名＋役割の3段カード（`partner-card` / `partner-grid`）から、ロゴ画像のみを並べる `partner-logo` / `partner-logos` 構造に置き換え。新規ディレクトリ `assets/images/partners/` を追加し、ココシバの公式ロゴ（Antenna Books & Cafe ココシバ）を `cocoshiba.png` として配置。`css/styles.css` の旧 `.partner-card*` 系を、`max-width: 200px / max-height: 90px / object-fit: contain` の `.partner-logo__image` を含む新クラス群に書き換え、PC4カラム・タブレット／モバイル2カラムのレスポンシブ対応に調整。`DESIGN_GUIDELINES.md`「パートナー枠」項を新仕様（1枠1ロゴ、画像配置・命名ルール、テキスト併記なし）に書き換え。 |
| C-5 | 独自対応 | HTML / CSS / JavaScript | トップページ「開催スケジュール」を月次カレンダー表示に変更 | `index.html` のスケジュールセクションから「イベント一覧へ」ボタンと「準備中／企画中」の静的2カードを削除し、`schedule-calendar` ブロック（月見出し＋前月／翌月ナビ、7列カレンダーグリッド、当月イベント一覧、ステータス行）に置き換え。新規 `js/schedule-calendar.js`（ESモジュール）で Firestore `events` の `isPublished == true` を取得し、該当日セルを淡い緑＋ドットでハイライト、カレンダー下に当月イベント（日付・タイトル・時間・場所）を縦並び表示。Firebase 未設定時はカレンダーのみ描画する安全側フォールバック。`css/styles.css` に `schedule-calendar*` 一式と 680px 以下のモバイル調整を追加。`SITE_STRUCTURE.md`「開催スケジュール」項と `DESIGN_GUIDELINES.md`「静的スケジュールリスト」項を新仕様（月次カレンダー）に書き換え。 |

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
