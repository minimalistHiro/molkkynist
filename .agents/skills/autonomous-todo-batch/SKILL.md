---
name: autonomous-todo-batch
description: molkkynistプロジェクトで、TODO.mdから指定キーワード（または「全て」）に該当する未着手項目を抽出し、全体計画書作成→今日の日付ブランチ上でのPhase順自律実装→軽量検証→Phaseコミット→マークダウン整理までを一括実行する。「TODOを全てバッチで進めて」「UI/UX系のTODOを一括で進めて」「{キーワード}のTODOをバッチ化して」等の依頼が対象。
---

# Autonomous TODO Batch

## 概要

ユーザーが指定したキーワード（自由形式の日本語。「全て」「すべて」も可）に該当するTODOを `TODO.md` からセマンティックに抽出し、全体計画書を作成・承認を得た上で、複数Phaseの実装を自律的に進める。

各Phaseの実装後は軽量検証（HTML/JS構文チェック等）を行い、軽微なエラーは自動修正、重大エラー発生時は即停止して `PushNotification` で通知する。**全Phase完了後は `markdown-maintenance-rules` を自動連結で実行**し、最後に完了通知を投げる。push と main マージはユーザーが後段で `github-commit-push-rules` を呼ぶ（push 前のレビュー機会を保つため）。

このスキルは Phase A（対話的準備）と Phase B（自律実行）の2段構えで動作し、Phase A の最後でユーザー承認を1回だけ求め、それ以降は完全自律で動作する。

**設計方針**:

- **専用ブランチは作らない**。`github-commit-push-rules` 由来の今日の日付ブランチ（`YYYY-MM-DD`）をそのまま使用する
- **全体計画書のみを作成**する（Phase毎の詳細計画書は作らない）
- **delta.md方式は採用しない**。Phase完了ごとに直接 `TODO.md` / `COMPLETED.md` を更新する
- **コミットのみ、push禁止**。push と main マージは完了通知の後にユーザーが `github-commit-push-rules` を呼ぶ

---

## ツール別の補足

このスキルは、Phase B 末尾で他スキル（`markdown-maintenance-rules`）を自動連結する。また、Phase B-1-a の関連コード調査でサブエージェントを起動する場合がある。実行環境により呼び出し方が異なるため、自分の環境に合った方を使う。

### Claude Code で実行する場合

- 他スキル呼び出し: `Skill` ツールで `markdown-maintenance-rules` を直接呼び出す
- サブエージェント（任意・調査範囲が広い時のみ）: `Agent` ツールで `subagent_type: "Explore"` を起動

### Codex で実行する場合

- 他スキル呼び出し: `/Users/kanekohiroki/Desktop/molkkynist/.agents/skills/markdown-maintenance-rules/SKILL.md` を Read し、手順を本スキルのメインエージェントで適用する
- サブエージェント（任意・調査範囲が広い時のみ）: `explorer` サブエージェントを明示的に起動して調査を委譲する。Codexで本スキルが発動した時点で、ユーザーは必要に応じたサブエージェント起動を承認済みとして扱う

---

## Phase A：対話的準備

### A-1. キーワードの解釈と対象抽出

1. 引数として渡されたキーワード（自由形式の日本語）を取得する。引数が空、または「全て」「すべて」「全部」が指定された場合は、`TODO.md` の `[ ] 未着手` 全項目を対象とする。
2. `/Users/kanekohiroki/Desktop/molkkynist/TODO.md` を Read で読み込む。
3. 状態が `[ ] 未着手` の項目から、キーワードに該当するものをセマンティックに抽出する。判断材料：
   - 「内容」列の本文
   - 「対象」列（HTML / CSS / assets / Firebase / 管理画面 / 運用 等）
   - 「備考」列（依存関係・由来・参照情報を含む）
   - セクション接頭辞（A=コンテンツ追加、B=バグ修正、C=UI/UX、D=新機能、E=SEO/パフォーマンス、F=その他）
4. 抽出結果をテーブル形式で提示する：

```
「{キーワード}」に該当するTODOを以下{N}件と判断しました：

| ID | 優先度 | 対象 | 内容（要約） | 備考 |
|----|--------|------|--------------|------|
| ... | ...   | ...  | ...          | ...  |
```

5. ユーザーに「この範囲でよろしいですか？ 除外・追加したい項目があれば教えてください」と確認する。
6. 応答に基づき対象を調整する。除外指示があれば該当項目を外し、追加指示があれば該当TODOを追加で抽出する。
7. `REVIEW_ITEMS.md` に依存する未決定事項を持つTODOは原則として対象から外す。外した場合はその理由を明示する。

### A-2. 仕様ファイルの事前読込（必須）

意図せぬ既存仕様との矛盾を防ぐため、以下のファイルを Read で読み込む（CLAUDE.md／AGENTS.md の参照ルール準拠）：

1. `/Users/kanekohiroki/Desktop/molkkynist/PROJECT_OVERVIEW.md`
2. `/Users/kanekohiroki/Desktop/molkkynist/SITE_STRUCTURE.md`
3. `/Users/kanekohiroki/Desktop/molkkynist/DESIGN_GUIDELINES.md`
4. `/Users/kanekohiroki/Desktop/molkkynist/CONTENT_GUIDELINES.md`
5. `/Users/kanekohiroki/Desktop/molkkynist/FIREBASE_ARCHITECTURE.md`
6. `/Users/kanekohiroki/Desktop/molkkynist/ADMIN_REQUIREMENTS.md`
7. `/Users/kanekohiroki/Desktop/molkkynist/ROADMAP.md`
8. `/Users/kanekohiroki/Desktop/molkkynist/REVIEW_ITEMS.md`
9. `/Users/kanekohiroki/Desktop/molkkynist/COMPLETED.md`（IDの最大値把握のため）

### A-3. 依存関係解析と Phase 構成

1. 抽出した各TODOの「備考」列の「依存:」記載と「対象」列を読み、依存関係を解析する：
   - 例：D-4 → D-3 → D-1 の順
   - 同一カテゴリ・同一ページに対する変更は同一Phaseにまとめても良い
2. 依存関係の少ないものから順に Phase 1, 2, ... と並べる
3. 各 Phase に以下を定義する：
   - Phase番号
   - 対象TODO ID（複数可）
   - 想定影響ファイル（推定パス）
   - 実装方針（1-2行）
   - 検証方針（ブラウザ目視 / HTML構文チェック / Firebase emulator確認 / 無し）

### A-4. 全体計画書の作成

1. `plans/in_progress/` ディレクトリが存在しない場合は作成する。
2. ファイル名を `plans/in_progress/{YYYYMMDD}_batch_{topic_slug}.md` で生成する：
   - `{YYYYMMDD}` は今日の日付
   - `{topic_slug}` はキーワードを英数ハイフンに変換（例：「UI/UX」→`ui-ux`、「全て」→`all`、「Firebase関連」→`firebase`）
3. 計画書のテンプレート：

```markdown
# バッチ実行計画書: {キーワード}

- 作成日: {YYYY-MM-DD}
- ステータス: 未開始
- 対象TODO: {N}件
- 作業ブランチ: {現在の日付ブランチ名}（既存ブランチをそのまま使用）

## 対象TODO一覧

| ID | 優先度 | 対象 | 内容 | 備考 |
|----|--------|------|------|------|
| ... | ...   | ...  | ...  | ...  |

## Phase構成

### Phase 1: {タイトル}
- 対象TODO: {ID(s)}
- 想定影響ファイル: {推定パス}
- 実装方針: {1-2行の概要}
- 検証: {ブラウザ目視 / HTML構文チェック / Firebase emulator / 無し}
- ステータス: 未着手

### Phase 2: ...
（同上）

## 除外したTODO（参考）

| ID | 除外理由 |
|----|----------|
| ... | （例：R-X の決定待ちのため） |

## 進捗ログ

（実行中に追記される）

## 目視確認チェックリスト

（B-1 実装中に Phase ごとに追記される）
```

### A-5. ブランチ確認（簡素化）

専用ブランチは作らない。既存の今日の日付ブランチ（`YYYY-MM-DD`）でそのまま実施する。

1. `cd /Users/kanekohiroki/Desktop/molkkynist && git status -sb` で現在ブランチと未コミット変更を確認する
2. **未コミット変更がある場合**は警告し、ユーザーに「現在の変更を先にコミットしてからバッチを開始しますか？」と確認する
3. **現在ブランチが今日の日付（`YYYY-MM-DD`）でない場合**は警告し、ユーザーに「今日の日付ブランチに切り替えますか？ それとも現在のブランチでバッチを実施しますか？」と確認する
   - 切り替えを選んだ場合は `github-commit-push-rules` の手順に従って今日の日付ブランチを作成・切替（`git fetch origin main` → `git checkout -b YYYY-MM-DD origin/main`、または既存ブランチなら `git merge origin/main`）
4. **main 同期チェック**: `git fetch origin main` を実行し、`git log HEAD..origin/main --oneline` で main の未取込コミットを確認する
   - 未取込コミットが1件以上ある場合は、ユーザーに「main に {N} 件の未取込コミットがあります（TODO.md / COMPLETED.md が古い可能性あり）。取り込んでからバッチを開始しますか？」と確認する
   - 承認されたら `git merge origin/main` を実行してから次の手順へ進む。コンフリクト発生時は即停止してユーザーに報告する
   - 承認されなかった場合は「古い TODO.md を基準にバッチを開始します」と明示した上で進める

### A-6. 最終承認

1. まず `PushNotification` ツールで以下のメッセージを送信し、ユーザーに最終承認待ちであることを通知する：

```
最終承認待ち: {キーワード} {N}件 / {M}Phase。計画書を確認してバッチ開始を承認してください。
```

2. その上でユーザーに以下を提示して最終承認を得る：

```
以下の計画でバッチを開始します。

対象TODO: {N}件
Phase構成: {M}個
作業ブランチ: {現在の日付ブランチ}（既存ブランチをそのまま使用）
計画書: plans/in_progress/{file_name}

このまま自律実行を開始してよろしいですか？
```

ユーザーが承認したら Phase B に進む。承認が得られない場合は計画書を残したまま終了する。

---

## Phase B：自律実行

Phase B 開始時には通知を送らない（過剰通知回避のため、完了通知と重大エラー停止通知のみに集約）。

### B-1. Phase ループ

計画書の各 Phase について順に以下を実行する。

#### B-1-a. 関連コード調査（任意）

Phase の影響範囲が広い場合（複数HTML/CSS/JSに跨る、Firebase設定変更を含む 等）のみ調査を行う。1ファイル完結の小規模Phaseはスキップしてよい。

- Claude Code: `Agent` ツール + `subagent_type: "Explore"` を起動して調査を委譲
- Codex: 必要に応じて `explorer` サブエージェントを明示起動

調査内容：
- 関連する既存ファイルのパス
- 影響を受ける既存セクション・スタイル・スクリプト
- 既存の類似実装パターン
- 注意すべき副作用や依存関係（ナビゲーション・footerリンク・CSSカスタムプロパティ等）

#### B-1-b. 実装

メインスレッドで Edit / Write を用いて実装する。実装中は以下を遵守：

- **CLAUDE.md / AGENTS.md のルール厳守**
  - HTML/CSS優先、JavaScript は必要最小限
  - セマンティックHTMLを優先し、見出し階層を崩さない
  - モバイル表示とデスクトップ表示の両方で破綻しないこと
  - 色・余白・フォントサイズは `css/styles.css` の CSSカスタムプロパティで管理
  - アセットは `assets/` に配置
  - フレームワーク・ビルドツールの追加禁止
  - テキスト・コメントは日本語
- **仕様ファイル（A-2 で読み込んだ9ファイル）に矛盾しない**
- **既存パターンに沿った命名・配置**
- **設計判断レベルの変更が必要になった場合は B-3 重大エラー扱い**（軽微な実装選択はAIが判断して継続可）

#### B-1-c. 軽量検証

Phase の検証方針に従い、以下のいずれか（または複数）を実行する：

- **HTML構文チェック**（HTML変更時）
  - Pythonで簡易チェック：`python3 -c "from html.parser import HTMLParser; import sys; HTMLParser().feed(open(sys.argv[1]).read())" 対象ファイル.html`
  - エラー時は最大2回までの自動修正、それを超えたら B-3
- **JS構文チェック**（JS変更時）
  - `node --check js/対象.js`
  - エラー時は最大2回までの自動修正、それを超えたら B-3
- **Firebase rules 構文チェック**（`firestore.rules` 変更時）
  - `firebase deploy --only firestore:rules --dry-run`（または手動レビュー）
  - 実環境への deploy はしない
- **目視確認チェックリストの追記**（全Phase共通）
  - 計画書の「目視確認チェックリスト」セクションに、対象ページ・確認観点・モバイル/デスクトップの別を追記
  - 例：`Phase 1: index.html#about セクションの集合写真が表示されること（モバイル/デスクトップ両方で要確認）`
  - 自動目視はできないため、検証ステップとしては「チェックリスト追記」のみ
- **検証手段がない Phase**（純粋な文章修正、コメント追加 等）はスキップ可

#### B-1-d. TODO.md / COMPLETED.md の即時更新

YamaGo の delta 方式は採らず、Phase 完了ごとに直接更新する。

1. `TODO.md` の該当行の状態列を `[x] 完了（YYYY-MM-DD）` に更新し、備考欄に Phase 番号と計画書パスを追記
2. `COMPLETED.md` の該当日付セクション（`## YYYY-MM-DD`）に当該TODOを転記。日付セクションがなければ新規作成（降順：新しい日付が上）
3. 完了行は `TODO.md` から削除する
4. 計画書（A-4 で作成）の該当 Phase ステータスを `✅ 完了（YYYY-MM-DD HH:MM）` に更新し、進捗ログに1行追記

**やってはいけないこと**:

- ❌ ID の再利用（COMPLETED.md と TODO.md の両方を参照し、最大番号の次を採番）
- ❌ TODO.md / COMPLETED.md のフォーマット（テーブル列構成・ルールセクション）を勝手に変更
- ❌ REVIEW_ITEMS.md の自動更新（B-1.5 の `markdown-maintenance-rules` 連結に任せる）

#### B-1-e. Phaseコミット

`/Users/kanekohiroki/Desktop/molkkynist` で以下を実施：

1. `.gitignore` に含まれているもの以外をすべて `git add` する
2. コミットメッセージ：

```
Phase {N}: {Phase タイトル} ({TODO IDs})
```

例：`Phase 1: トップページに協力団体セクション追加 (A-3)`

3. **push はしない**（github-commit-push-rules 経由でまとめて行う）

#### B-1-f. 次の Phase へ

すべての Phase が完了するまで B-1 を繰り返す。

### B-1.5. マークダウン整理（自動連結）

すべての Phase が成功で完了したら、`markdown-maintenance-rules` を自動連結で実行する。

- Claude Code: `Skill` ツールで `markdown-maintenance-rules` を呼び出す
- Codex: `/Users/kanekohiroki/Desktop/molkkynist/.agents/skills/markdown-maintenance-rules/SKILL.md` を Read して手順を適用する

このステップでは:

1. PROJECT_OVERVIEW / SITE_STRUCTURE / DESIGN_GUIDELINES / CONTENT_GUIDELINES / FIREBASE_ARCHITECTURE / ADMIN_REQUIREMENTS / ROADMAP を整合性チェック・追記
2. REVIEW_ITEMS.md の決定済み項目を削除、新たな未決定事項を追加
3. TODO.md / COMPLETED.md の最終整合チェック（B-1-d で即時更新済みのため、通常は変更なし）

更新が発生した場合は `git add` してコミットする：

```
マークダウン整理: バッチ実装結果を仕様ドキュメントへ反映
```

更新がなければコミットせず B-2 へ進む。

### B-2. 完了通知

B-1.5 まで成功で完了した場合、`PushNotification` で以下を送信：

```
バッチ実装完了: {N}件 / {M}Phase。目視確認チェックリストを確認後、『GitHubにコミットしてプッシュして』で main へ反映してください。
```

その後、メインスレッドで以下のサマリーを出力して終了：

- 実装した TODO 一覧（ID と1行要約）
- 各 Phase のコミットハッシュ
- マークダウン整理コミットハッシュ（あれば）
- 計画書のパス
- **目視確認チェックリスト全文**（ローカルサーバー起動コマンドを含む）
  - 推奨：`cd /Users/kanekohiroki/Desktop/molkkynist && python3 -m http.server 8000`
  - 確認URL：`http://localhost:8000/index.html` 等
- 次に推奨される操作: `github-commit-push-rules`（「GitHubにコミットしてプッシュして」）

### B-3. 重大エラー停止

重大エラーと判定された場合、以下を実行：

1. `PushNotification` で以下を送信：

```
停止: Phase {N} {エラー概要}（{TODO ID}）
```

2. 計画書に以下を追記：

```
## ❌ 停止記録

- 停止 Phase: Phase {N}
- 停止時刻: {YYYY-MM-DD HH:MM}
- エラー概要: {1-2行}
- 試行した修正: {内容}
- 推奨対応: {人間が確認すべき点}
```

3. メインスレッドで詳細なエラー内容と推奨対応を出力して終了する
4. ブランチ・実装途中の変更はそのまま残し、ユーザーが手動で復旧できる状態にする
5. **TODO.md / COMPLETED.md の完了反映はその Phase の B-1-d で既に行われているため、停止Phaseのみ未完了のまま残る**

---

## 仕様の曖昧さ・未決定事項発見時の挙動

実装中に「仕様が決まっていない」点を発見した場合：

- **軽微な実装選択**（CSSの値・改行位置・コメント文言等）: AI が判断して継続。コミットメッセージに判断根拠を1行追記
- **設計判断が必要**（ページ構成・データ構造・Firebase ルール・UI挙動）: 即「重大」扱いで B-3 へ。停止理由として REVIEW_ITEMS.md への追加候補を提示（R番号は採番せず提案だけ。実際の追加は B-1.5 の `markdown-maintenance-rules` で行うため）

---

## PushNotification の使用タイミング（厳守）

| タイミング | メッセージ例 |
|------------|--------------|
| Phase A 最終承認待ち時（A-6 冒頭） | `最終承認待ち: {キーワード} {N}件 / {M}Phase。計画書を確認してバッチ開始を承認してください。` |
| 重大エラー停止時（B-3） | `停止: Phase {N} {エラー概要}` |
| 完了時（B-2） | `バッチ実装完了: {N}件 / {M}Phase。目視確認チェックリストを確認後、『GitHubにコミットしてプッシュして』で main へ反映してください。` |

各Phase完了ごとには通知しない（過剰通知を避けるため）。B-1.5 完了時にも個別通知は出さない（完了通知に集約）。

---

## 対象となる依頼例

- TODOを全てバッチで進めて
- すべての未着手TODOを一括で実装して
- UI/UX系のTODOをバッチで進めて
- Firebase関連のTODOを一括で実装して
- バグ修正のTODOをバッチで進めて
- {キーワード}のTODOをバッチ化して

---

## 注意事項

- **Phase A の最後の承認以外は質問しない**。承認後は完全自律で動作する
- **重大エラー時は必ず停止**。自己判断で続行してはならない
- **コミットのみ・push禁止**。push と main マージは後段で `github-commit-push-rules` を呼ぶ
- **専用ブランチを作らない**。今日の日付ブランチでそのまま実施する
- **B-1.5 は B-1 全Phase成功時のみ実行**。途中で B-3（重大エラー停止）に入った場合はスキップして停止する
- **計画書を都度更新**する。Phaseステータス、進捗ログ、目視確認チェックリストを実行に合わせて Edit する
- **PushNotification は規定タイミングのみ**。Phase完了ごとの通知は過剰なので行わない
- **TODO.md / COMPLETED.md は Phase 完了ごとに即時更新**する（delta方式は採用しない）
- **ID の再利用は禁止**。TODO.md と COMPLETED.md の両方を確認し、既存最大番号の次を採番する
- **由来欄（会議／独自）は完了時にも維持**する。COMPLETED.md 転記時にも備考欄の `由来: 会議` / `由来: 独自` を残す
- **静的サイト方針を破らない**。フレームワーク・ビルドツールの追加禁止、JavaScript は必要最小限
- **Firebase連携TODO（D系等）はローカル完全検証ができない**ことを前提に、計画書の目視確認チェックリストへ「`js/firebase-config.js` の設定値投入後の手動確認」を必ず明記する
- **「バッジ」ではなく「バッチ」**（batch, 一括処理）が正式表記
