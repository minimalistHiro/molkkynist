---
name: markdown-maintenance-rules
description: molkkynistプロジェクトで「マークダウンを整理して」「ドキュメントを更新して」「MDファイルを整理して」など、各種マークダウンドキュメントの整理・更新を依頼されたときに発動する。直近の変更内容に基づき、プロジェクト方針・サイト構成・デザイン・コンテンツ・Firebase・管理画面・ロードマップの各ドキュメントを追記・修正し、TODO.md / COMPLETED.md / REVIEW_ITEMS.md を同期する。
---

# Markdown Maintenance Rules

## 概要

molkkynistプロジェクトの各種マークダウンドキュメントを、直近の変更内容に基づいて整理・追記・修正する。あわせて TODO.md / COMPLETED.md / REVIEW_ITEMS.md の状態を同期する。

## 手順

ユーザーから「マークダウンを整理して」「ドキュメントを更新して」などの依頼があったら、以下の手順を順に実行する。

1. `/Users/kanekohiroki/Desktop/molkkynist/PROJECT_OVERVIEW.md` を読み込み、今回の変更にプロジェクト全体方針・目的・ターゲット・コンセプトに関わる変更がある場合は、PROJECT_OVERVIEW.md を追記・修正する。
2. `/Users/kanekohiroki/Desktop/molkkynist/SITE_STRUCTURE.md` を読み込み、ページ追加・削除・画面設計・ナビゲーション構成に関わる変更がある場合は、SITE_STRUCTURE.md を追記・修正する。
   - **【重要】SITE_STRUCTURE.md には実装済みのページ・セクションのみを記載する。**
   - 未実装・計画中のページは記載しない。実装が完了してから追記すること。
3. `/Users/kanekohiroki/Desktop/molkkynist/DESIGN_GUIDELINES.md` を読み込み、配色・画像素材・Image Gen 2・フォント・レイアウト・CSSカスタムプロパティに関わる変更がある場合は、DESIGN_GUIDELINES.md を追記・修正する。
4. `/Users/kanekohiroki/Desktop/molkkynist/CONTENT_GUIDELINES.md` を読み込み、文章・コピー・イベント告知文・活動レポート文・Instagram誘導文の表記ルールに関わる変更がある場合は、CONTENT_GUIDELINES.md を追記・修正する。
5. `/Users/kanekohiroki/Desktop/molkkynist/FIREBASE_ARCHITECTURE.md` を読み込み、Firebase・Firestore・Authentication・Storage・Hosting・セキュリティルール・権限管理に関わる変更がある場合は、FIREBASE_ARCHITECTURE.md を追記・修正する。
6. `/Users/kanekohiroki/Desktop/molkkynist/ADMIN_REQUIREMENTS.md` を読み込み、管理画面・石井さん専用ログイン・イベント編集・レポート編集・メンバー編集に関わる変更がある場合は、ADMIN_REQUIREMENTS.md を追記・修正する。
7. `/Users/kanekohiroki/Desktop/molkkynist/ROADMAP.md` を読み込み、開発順序・実装フェーズ・今後の進め方に関わる変更がある場合は、ROADMAP.md を追記・修正する。
8. `/Users/kanekohiroki/Desktop/molkkynist/TODO.md` と `/Users/kanekohiroki/Desktop/molkkynist/COMPLETED.md` を確認し、以下を実行する：

   ### 完了判定基準

   以下を満たせばTODO項目は「完了」とみなし、COMPLETED.mdへ移動する：

   - **そのTODOのスコープ内のHTML/CSS/アセット実装が完了している**（対象ページがブラウザで意図通り表示できる状態）。
   - **アセット差し替え・テキスト更新が必要な項目は、該当アセット・テキストの反映が完了している**。

   以下は **完了判定の条件にしない**：

   - **実機・実ブラウザでの目視確認**: 別途確認するフェーズとして扱い、ここでは判定材料にしない。
   - **依存TODOの完了**: 自身のスコープが完成していれば、他TODOの未完了に関わらず完了扱い。未接続のリンクやプレースホルダ表示は依存TODO側で差し替える前提とし、それ自体は本TODOのスコープ外とする。

   ### 手順

   - 今回の変更で完了したTODO項目がある場合、TODO.md から該当行を削除し、COMPLETED.md の該当日付セクション（`## YYYY-MM-DD`）に移動する。日付セクションが存在しない場合は新規作成する（降順: 新しい日付が上）。
   - 今回の変更で廃止になったTODO項目がある場合も同様に、TODO.md から削除し COMPLETED.md に移動する。備考欄に「**廃止**: 理由」を記載する。
   - 今回の変更で新たに必要になったTODO項目がある場合、TODO.md の適切なセクション（A〜F）に新規TODO項目を追記する。
   - 項目IDはアルファベット+連番（例: A-1, B-1）で管理し、セクションをまたいで一意にする。**IDの再利用は禁止**（TODO.md と COMPLETED.md の両方を確認し、既存の最大番号の次を使用する）。
   - TODO項目の内容が実装と乖離している場合は、実装に合わせて修正する。
9. `/Users/kanekohiroki/Desktop/molkkynist/REVIEW_ITEMS.md` を読み込み、今回の変更に関連する要検討事項・未決定事項がある場合は、REVIEW_ITEMS.md を追記・修正する：
   - 今回の変更によって新たに検討が必要になった事項がある場合、適切な優先度・カテゴリで新規項目を追記する。
   - 今回の変更によって決定済み・見送りになった項目がある場合、その項目を REVIEW_ITEMS.md から削除する（決定内容は PROJECT_OVERVIEW.md / SITE_STRUCTURE.md / DESIGN_GUIDELINES.md / CONTENT_GUIDELINES.md / FIREBASE_ARCHITECTURE.md / ADMIN_REQUIREMENTS.md / ROADMAP.md の該当ドキュメントに反映済みであることが前提）。
   - 項目IDはアルファベット+連番（例: R-1, R-2）で管理し、一意にする。

## 判定ルール

- 各ドキュメントについて、変更が必要かどうかを判定する。
- 変更が必要な場合のみ追記・修正を行う。
- 変更が不要な場合は「変更不要」とその理由を報告する。
- 全てのドキュメントについて結果を一覧で報告する。

## 対象となる依頼例

- マークダウンを整理して
- ドキュメントを更新して
- MDファイルを整理して
- ドキュメントを整理して
- ドキュメントを最新化して

## 注意事項

- 依頼があるまで勝手にマークダウンの整理を行わない。
- 変更内容に基づかない無関係な追記・修正は行わない。
- 報告は原則として日本語で行う。
- TODO.md / COMPLETED.md / REVIEW_ITEMS.md のフォーマット（ルールセクション・テーブル列構成・ID採番ルール）は各ファイル冒頭のルールに従い、勝手に変更しない。
