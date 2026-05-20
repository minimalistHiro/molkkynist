---
name: create-skill
description: molkkynistプロジェクトで新しいスキルの作成を依頼されたときに、.claude/skills/ を基準として作成し、Codex用に .agents/skills/ へ同一内容を反映する。「スキルを作成して」「スキルを追加して」「新しいスキルを作って」等の依頼が対象。
---

# Create Skill

## 概要

ユーザーから新しいスキルの作成依頼が来たときに、Claude Code用の正本として `.claude/skills/` に SKILL.md を作成し、Codex用に `.agents/skills/` へ同一内容を反映する。これにより Claude Code と Codex の両方で同じスキルが利用可能になる。

## 手順

### 1. スキルの内容をユーザーに確認する

依頼が曖昧な場合は、以下を確認する：

- **スキル名**: kebab-case で指定（例：`my-new-skill`）
- **トリガー条件**: どのような依頼でこのスキルが発動するか
- **実行内容**: スキルが行う具体的な処理・手順

ユーザーがある程度の内容を伝えている場合は確認を最小限にし、すぐに作成に進む。

### 2. SKILL.md を作成する

以下のテンプレートに従って SKILL.md を作成する：

```markdown
---
name: <スキル名（kebab-case）>
description: <スキルの説明。トリガーとなる依頼例も含める。>
---

# <スキル表示名>

## 概要

（スキルの目的・背景を記載）

## 手順

（具体的な実行手順をステップで記載）

## 対象となる依頼例

（このスキルが発動する依頼の例を箇条書きで記載）

## 注意事項

（守るべきルール・制約を記載）
```

### 3. Claude Code用とCodex用のディレクトリに配置する

**必ず以下の2箇所に同一内容で作成すること：**

1. `/Users/kanekohiroki/Desktop/molkkynist/.claude/skills/<スキル名>/SKILL.md`
2. `/Users/kanekohiroki/Desktop/molkkynist/.agents/skills/<スキル名>/SKILL.md`

`.claude/skills` を正本とし、`.agents/skills` は Codex 用の反映先として扱う。`.codex/skills` は使用しない。

### 4. 作成結果を報告する

作成したスキル名と `.claude/skills` / `.agents/skills` の両方のパスを日本語で報告する。

## 対象となる依頼例

- スキルを作成して
- スキルを追加して
- 新しいスキルを作って
- 〇〇のスキルを作成して
- 〇〇用のスキルを追加して

## 注意事項

- **必ず `.claude/skills/` と `.agents/skills/` の両方に作成すること。** 片方だけに作成してはならない。
- `.codex/skills/` は使用しない。`.codex` はCodex設定ファイルを置く場合のみ使用する。
- スキル名は kebab-case（例：`my-new-skill`）を使用する。
- 両方のディレクトリの SKILL.md は完全に同一の内容とする。
- 既存スキルと名前が重複しないよう、作成前に既存スキル一覧を確認する。
