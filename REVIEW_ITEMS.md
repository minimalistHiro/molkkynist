# 要検討事項リスト

> 作成日: 2026-05-20

---

## ルール

- このファイルは **まだ確定していないが、今後決定が必要な事項** を管理する。
- TODO.md（未実装機能）とは別物。こちらは「何をすべきか決まっていない」段階の検討事項を扱う。
- 各項目には以下を記載する:
  - **優先度**: 最高 / 高 / 中 / 低（長期）のいずれか
  - **カテゴリ**: コンテンツ / UX / 技術 / ビジネス / 運用 / など
  - **内容**: 検討すべき背景・論点・選択肢
  - **状態**: `[ ] 未着手` / `[ ] 議論中`
  - **決定事項**: 議論の結果決まった内容を記載（未決定の場合は空欄）
- 決定済み・見送りになった項目はこのファイルから削除する（決定内容は PROJECT_OVERVIEW.md / SITE_STRUCTURE.md / DESIGN_GUIDELINES.md 等の該当ドキュメントに反映すること）。
- 項目IDはアルファベット+連番（例: R-1, R-2）で管理し、一意にする。

---

## A. 検討中の事項

| ID | 優先度 | カテゴリ | 内容 | 状態 | 決定事項 |
|----|--------|----------|------|------|----------|
| R-6 | 中 | 運用 / コンテンツ | 雨天時の対応方針（中止判断の基準、中止連絡の方法・タイミング、振替の有無など）。トップページの「参加の流れ」併記情報、および FAQ「Q6. 雨天時はどうなりますか？」の回答に必要。石井さんに確認要。 | `[ ] 未着手` |  |
| R-7 | 高 | 技術 / 運用 | 自動返信メール（D-3）の実SMTPプロバイダの選定と、送信元アドレス・SPF/DKIM 設定の確定。候補: SendGrid / Mailgun / Resend / Gmail SMTP。実装側（Cloud Functions + Trigger Email Extension）は完了済みで、Extension への `SMTP_CONNECTION_URI`・`DEFAULT_FROM` の投入が残課題。 | `[ ] 未着手` |  |
| R-8 | 中 | 運用 | DM経由のお問い合わせに対するユーザー宛受付通知の運用フロー。フォーム経由は D-3 で自動化済みだが、DM経由はメールアドレスを取得できないため別運用が必要（管理画面から手動送信する／DM内で定型文返信で済ませる、等）。 | `[ ] 未着手` |  |

> 2026-05-21 時点: D-3 実装完了に伴い R-7（SMTP プロバイダ選定）・R-8（DM 経由フロー）を追加。
> 2026-05-21 時点: R-1 / R-2 / R-5 を決定し、各ドキュメントに反映済み（[TODO.md](TODO.md) C-1 / A-3 / D-1、[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)、[SITE_STRUCTURE.md](SITE_STRUCTURE.md)、[CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md)、[FIREBASE_ARCHITECTURE.md](FIREBASE_ARCHITECTURE.md)、[ADMIN_REQUIREMENTS.md](ADMIN_REQUIREMENTS.md)）。

---
