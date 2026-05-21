# バッチ実行計画書: SEO基本対策（E-1）

- 作成日: 2026-05-21
- ステータス: 実装完了
- 対象TODO: 1件（E-1）
- 作業ブランチ: `2026-05-21`（既存ブランチをそのまま使用）

## 対象TODO一覧

| ID | 優先度 | 対象 | 内容 | 備考 |
|----|--------|------|------|------|
| E-1 | 中 | HTML | 「Molkkynist」「モルキニスト」「モルック」キーワードのSEO基本対策（タイトル・metaタグ・OGP整備） | 由来: 会議 |

## 除外したTODO（参考）

| ID | 除外理由 |
|----|----------|
| A-3 | C-1 で `index.html` の `#partners` セクション・パートナー枠CSS・ココシバカード・募集枠が既に実装済み（COMPLETED.md C-1 備考参照）。残課題はココシバの実ロゴ画像差し替えのみで、ロゴ素材は会議経由の入手が前提のため自律実装の対象外。 |
| D-2 | 管理画面基盤（`admin/login.html` / `admin/index.html` / 管理者UID判定）が未着手で、ログイン方式（メール+パスワード or Google）も未決定。設計判断レベルの未決定事項のため、本スキルの規定で B-3 重大エラー相当。 |
| D-4 | D-2 と同じく管理画面基盤が未着手、加えて Cloud Functions callable 関数の新規実装が必要。設計判断レベルの未決定事項のため対象外。 |

## Phase構成

### Phase 1: 全公開ページのSEO基本対策（title / meta / OGP / Twitter Card / canonical）
- 対象TODO: E-1
- 想定影響ファイル: `index.html` / `about.html` / `molkky.html` / `events.html` / `reports.html` / `members.html` / `contact.html` / `privacy.html`
- 実装方針:
  - 各ページの `<head>` に以下を追加・整備する。
    - `<title>`: 既存維持（既に整備済み）
    - `<meta name="description">`: 既存維持（既に整備済み、必要に応じてキーワード強化）
    - `<meta name="keywords">`: 「Molkkynist, モルキニスト, モルック, mölkky, コミュニティ, 初心者歓迎」を基準にページごとに調整
    - OGP: `og:title` / `og:description` / `og:url` / `og:image` / `og:type` / `og:site_name` / `og:locale`
    - Twitter Card: `twitter:card`（summary）/ `twitter:title` / `twitter:description` / `twitter:image`
    - `<link rel="canonical">`
  - 公開ドメインは `https://molkkynist-a0abd.web.app/` に確定済み。
  - `og:image` は既存の `assets/images/logos/molkkynist-logo.png` を暫定使用。Twitter Card は正方形ロゴでも崩れない `summary` を採用。
  - `index.html` のみに JSON-LD（Organization schema）を追加し、コミュニティとしての構造化データを提供する。
- 検証:
  - HTML 構文チェック（Python html.parser）を全8ファイルに実行
  - 目視確認チェックリストにOGP/Twitter Card の表示確認方法（Facebook Sharing Debugger / Twitter Card Validator）を追記
- ステータス: ✅ 完了（2026-05-21 12:00）

## 進捗ログ

- 2026-05-21 12:00 Phase 1 実装完了。全8ファイル（index / about / molkky / events / reports / members / contact / privacy）に keywords / canonical / OGP 8種 / Twitter Card 4種を追加。index.html のみ JSON-LD（Organization）を追加。Python `html.parser` による構文チェック全件 OK。

## 目視確認チェックリスト

### ローカル確認

```bash
cd /Users/kanekohiroki/Desktop/molkkynist && python3 -m http.server 8000
```

各ページの `<head>` を `view-source:` で確認：

- [ ] `http://localhost:8000/index.html` — JSON-LD（Organization）が表示されること、OGP/Twitter Card が全て含まれること
- [ ] `http://localhost:8000/about.html`
- [ ] `http://localhost:8000/molkky.html`
- [ ] `http://localhost:8000/events.html`
- [ ] `http://localhost:8000/reports.html`
- [ ] `http://localhost:8000/members.html`
- [ ] `http://localhost:8000/contact.html`
- [ ] `http://localhost:8000/privacy.html`

### 公開後の確認（Firebase Hosting デプロイ後）

- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) で各ページの OGP プレビューを確認
- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator)（または最新のカードプレビューツール）で twitter:image / twitter:title を確認
- [ ] [Google リッチリザルトテスト](https://search.google.com/test/rich-results) で index.html の Organization 構造化データを確認
- [ ] Google 検索コンソールに登録、`sitemap.xml`（将来別途）の送信

### 残課題（仕様確定後に対応）

- Firebase Hosting の公開ドメインは `https://molkkynist-a0abd.web.app/` に確定・反映済み
- OGP 専用画像（1200x630px、ロゴ＋キャッチコピー）が用意できたら `og:image` / `twitter:image` を差し替え、`twitter:card` を `summary_large_image` に変更
