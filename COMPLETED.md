# 完了済みタスク一覧

> TODO.md で完了した項目を、完了日の降順（新しい順）で管理する。

---

## ルール

- TODO.md で `[x] 完了（日付）` または `[x] 廃止（日付）` となった項目をこちらに移動する。
- 完了日ごとにセクション（`## YYYY-MM-DD`）を設け、新しい日付が上に来るよう降順で並べる。
- 廃止された項目には廃止理由を併記する。
- 項目IDはTODO.mdと同一のものを使用する（一意性を維持）。

---

## 2026-05-21

| ID | 区分 | 対象 | 内容 | 備考 |
|----|------|------|------|------|
| D-2 | 会議決定 | 管理画面 / Firebase | 管理画面のイベント管理機能 | `admin/login.html`、`admin/index.html`、`admin/events.html`、`js/admin-auth.js`、`js/admin-login.js`、`js/admin-events.js` を追加。ログイン方式はTODO備考のデフォルトに従いメール+パスワードを採用。`js/firebase-config.js` に `adminConfig.adminUid` を追加し、`YOUR_ADMIN_UID` プレースホルダー継続。イベント管理では `events` の追加・編集・公開切替、開催日・時間・場所・参加費・定員・持ち物・雨天時対応・状態を編集可能。公開中イベントは既存お問い合わせフォームの日程選択候補に連動する。既存フォームの用件区分値もFirestoreルールに合わせ `event` へ修正。実装計画書: `plans/in_progress/20260521_batch_all.md`。 |
| A-3 | 会議決定 | HTML | 協力団体・スポンサー紹介セクションの追加（C-1へ統合のため廃止） | 2026-05-21 C-1に統合して廃止。`index.html` の `#partners` セクション、パートナー枠CSS、ココシバカード、募集枠×3はC-1で実装済み。残るココシバ実ロゴ画像の差し替えはA-4として別管理。実装計画書: `plans/in_progress/20260521_batch_all.md`。 |
| E-1 | 会議決定 | HTML | 全公開ページのSEO基本対策（タイトル・metaタグ・OGP・Twitter Card・canonical・構造化データ） | 全8ページ（`index.html` / `about.html` / `molkky.html` / `events.html` / `reports.html` / `members.html` / `contact.html` / `privacy.html`）の `<head>` に `meta name="keywords"`、`link rel="canonical"`、OGP 8種（`og:type` / `og:site_name` / `og:locale` / `og:title` / `og:description` / `og:url` / `og:image`）、Twitter Card 4種（`twitter:card=summary` / `title` / `description` / `image`）を追加。`index.html` のみ JSON-LD（Organization スキーマ）を追加。公開ドメインは未確定のため暫定で `https://molkkynist.web.app/` を採用、OGP 画像は既存のロゴ画像を暫定使用。公開ドメイン確定時／OGP 専用画像作成時に差し替え予定（計画書 `plans/in_progress/20260521_batch_seo-basics.md` 残課題セクション参照）。実装計画書: `plans/in_progress/20260521_batch_seo-basics.md`。 |
| D-3 | 会議決定 | Firebase / 運用 | お問い合わせフォーム送信時の自動返信メール実装 | Cloud Functions v2（Node 20 / `asia-northeast1`）で `contactSubmissions` の `onDocumentCreated` を購読し、Trigger Email Extension が監視する `mail` コレクションへ Admin SDK 経由で書き込む構成。`functions/index.js`（テキスト/HTML本文を生成、参加希望時は `events` を読んで日程行を整形、`escapeHtml` 適用）、`functions/package.json`、`functions/.gitignore` を新規追加。Firebase 初期構成として `firebase.json`・`.firebaserc`・`firestore.rules`（`contactSubmissions` は型/件数バリデーション付き create 限定、`mail` は一般ユーザー全面禁止）・`firestore.indexes.json` を整備。Extension 導入手順は `extensions/README.md`、設定例は `extensions/firestore-send-email.env.example`。自動返信文面の方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」に追記。実SMTP接続URI・送信元アドレスの確定（R-7）は別途。 |
| F-1 | 会議決定 | 運用 / HTML | プライバシーポリシーの整備（D-1 公開の前提条件） | `privacy.html` を新規作成（個人情報の取得項目・利用目的・第三者提供・外部サービス利用・保管期間・開示請求・改定・問い合わせ窓口）。全ページfooterから導線設置。 |
| C-1 | 会議決定 | HTML / CSS | トップページを参考サイト構成に寄せて再整理 | `index.html` を「About → 開催スケジュール → 参加の流れ → 活動レポート → メンバー → FAQ(13問) → Instagram DM → 協力団体・スポンサー」の順に再構成。CONTENT_GUIDELINES の参加フロー併記情報・FAQ・スポンサー方針を反映。集合写真プレースホルダー、活動内容3カラム、静的スケジュールリスト、パートナーカード（ココシバ + 募集枠）を追加。`css/styles.css` に `about-layout` / `pillar-grid` / `schedule-list` / `partner-grid` / `flow-notes` / `section-lead` 等を追加。 |
| D-1 | 会議決定 | HTML / Firebase | 参加・お問い合わせフォームをサイト内に実装 | `contact.html` にフォームセクション（必須: 名前・メール／任意: 電話番号／用件区分・参加希望時の日程トグル・一言・プライバシーポリシー同意）を追加。`js/firebase-config.js` と `js/contact-form.js` を新規追加（Firebase v10 モジュラーCDN）。送信先は Firestore `contactSubmissions`、参加希望時は `events` (`isPublished==true` かつ `eventDate>=今日`) から日程を取得しトグル表示。Firebase 設定値が未投入の状態では送信を無効化し、Instagram DM への案内へ自動フォールバック。 |

---
