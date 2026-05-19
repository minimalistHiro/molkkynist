---
name: github-commit-push-rules
description: molkkynistプロジェクトで「GitHubにコミットしてプッシュして」などの依頼が来たときに適用するGit操作ルール。コミット・プッシュ・mainマージ・ブランチ運用の手順と、静的Webサイト用の関連Markdown更新チェックを厳守する。
---

# GitHub Commit Push Rules

## 概要

molkkynistの変更をGitHubへコミット・プッシュする際の必須手順を適用する。

## 手順

ユーザーから「GitHubにコミットしてプッシュして」と依頼されたら、必ず以下の手順を順守する。

1. `/Users/kanekohiroki/Desktop/molkkynist/PROJECT_OVERVIEW.md` を必要に応じて確認し、プロジェクト全体方針・目的・ターゲットに関わる変更がある場合は追記・修正する。
2. サイト構成、ページ追加、画面設計、ナビゲーションに関わる変更がある場合は、`/Users/kanekohiroki/Desktop/molkkynist/SITE_STRUCTURE.md` を追記・修正する。
3. デザイン、配色、画像素材、Image Gen 2、レイアウトに関わる変更がある場合は、`/Users/kanekohiroki/Desktop/molkkynist/DESIGN_GUIDELINES.md` を追記・修正する。
4. 文章、コピー、イベント告知文、活動レポート文、Instagram誘導文に関わる変更がある場合は、`/Users/kanekohiroki/Desktop/molkkynist/CONTENT_GUIDELINES.md` を追記・修正する。
5. Firebase、Firestore、Authentication、Storage、Hosting、権限管理に関わる変更がある場合は、`/Users/kanekohiroki/Desktop/molkkynist/FIREBASE_ARCHITECTURE.md` を追記・修正する。
6. 管理画面、石井さん専用ログイン、イベント編集、レポート編集、メンバー編集に関わる変更がある場合は、`/Users/kanekohiroki/Desktop/molkkynist/ADMIN_REQUIREMENTS.md` を追記・修正する。
7. 開発順序、実装フェーズ、今後の進め方に関わる変更がある場合は、`/Users/kanekohiroki/Desktop/molkkynist/ROADMAP.md` を追記・修正する。
8. `/Users/kanekohiroki/Desktop/molkkynist` で `git status -sb` を確認する。
9. 変更がない場合は「変更なし」と報告して終了する。
10. 変更がある場合は、`.gitignore` に含まれているもの以外をすべてステージングする。
11. 現在のブランチにコミットしてプッシュする。
12. その後、`main` にマージして `main` へ push する。
13. マージ後は元のブランチに戻す。
14. 元のブランチへ戻った時、そのブランチ名が今日の日付（`YYYY-MM-DD`）でない場合は、新しいブランチを `YYYY-MM-DD` 形式で作成して切り替える。
15. ブランチ同期は必須。新ブランチ作成時は `git fetch origin main` を実行してから `git checkout -b YYYY-MM-DD origin/main` で main の最新から分岐する。既に今日の日付ブランチが存在して checkout しただけの場合は、checkout 直後に `git merge origin/main` を実行して main の最新を取り込む。
16. コミットメッセージは変更内容に合わせて任意に決めてよい。

## 注意事項

- 依頼があるまで勝手にコミット・プッシュを行わない。
- 既存の未コミット変更がある場合は、内容を確認してから手順を進める。
- このプロジェクトは静的Webサイトとして制作するため、不要なフレームワークやビルドツールを追加しない。
- HTML/CSSの変更では、必要に応じて `index.html` をブラウザで開くか、ローカルサーバーでモバイル表示とデスクトップ表示を確認する。
- テキスト、コメント、報告は原則として日本語で行う。
