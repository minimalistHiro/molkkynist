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
| F-1 | 会議決定 | 運用 / HTML | プライバシーポリシーの整備（D-1 公開の前提条件） | `privacy.html` を新規作成（個人情報の取得項目・利用目的・第三者提供・外部サービス利用・保管期間・開示請求・改定・問い合わせ窓口）。全ページfooterから導線設置。 |
| C-1 | 会議決定 | HTML / CSS | トップページを参考サイト構成に寄せて再整理 | `index.html` を「About → 開催スケジュール → 参加の流れ → 活動レポート → メンバー → FAQ(13問) → Instagram DM → 協力団体・スポンサー」の順に再構成。CONTENT_GUIDELINES の参加フロー併記情報・FAQ・スポンサー方針を反映。集合写真プレースホルダー、活動内容3カラム、静的スケジュールリスト、パートナーカード（ココシバ + 募集枠）を追加。`css/styles.css` に `about-layout` / `pillar-grid` / `schedule-list` / `partner-grid` / `flow-notes` / `section-lead` 等を追加。 |
| D-1 | 会議決定 | HTML / Firebase | 参加・お問い合わせフォームをサイト内に実装 | `contact.html` にフォームセクション（必須: 名前・メール／任意: 電話番号／用件区分・参加希望時の日程トグル・一言・プライバシーポリシー同意）を追加。`js/firebase-config.js` と `js/contact-form.js` を新規追加（Firebase v10 モジュラーCDN）。送信先は Firestore `contactSubmissions`、参加希望時は `events` (`isPublished==true` かつ `eventDate>=今日`) から日程を取得しトグル表示。Firebase 設定値が未投入の状態では送信を無効化し、Instagram DM への案内へ自動フォールバック。 |

---
