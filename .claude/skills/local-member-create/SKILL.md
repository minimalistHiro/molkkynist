---
name: local-member-create
description: molkkynistプロジェクトでローカル管理の運営メンバーを追加・作成したいと依頼されたときに、必要項目をすべてヒアリングし、未入力項目がなくなるまで質問を続けてからローカルデータ追加へ進む。「メンバーを作成したい」「メンバーを追加したい」「新しい運営メンバーを登録したい」等の依頼が対象。
---

# Local Member Create

## 概要

Molkkynist の運営メンバー情報は、Firestore ではなくローカルデータと `assets/` 配下の画像で管理する。

このスキルは、ユーザーが新しいメンバー作成を依頼したときに、公開サイトのトップページ `#members` と `member.html?id=xxx` に必要な項目を漏れなく確認し、すべての必須項目が揃ってから `js/member-data.js` への追加作業へ進むために使用する。

## 手順

### 1. 現行データ構造を確認する

最初に以下を確認する。

- `js/member-data.js`
- `SITE_STRUCTURE.md`
- `DESIGN_GUIDELINES.md`

既存メンバーの `id`、表示順、文体、画像パスの扱いと矛盾しないようにする。

### 2. 必須項目と任意項目を確認する

必須項目:

- `id`: URLで使う英数字・ハイフンの識別子
- `name`: 表示名
- `role`: 役割
- `startedReason`: モルックを始めたきっかけ
- `favoriteThings`: モルック以外の好きなこと
- `firstTimerMessage`: 初参加者へのメッセージ
- `comment`: ひとことコメント
- `displayOrder`: 表示順
- `isPublished`: 公開状態

任意項目:

- `image`: `assets/` 配下の画像パス
- `visualVariant`: 写真未設定時のプレースホルダー色（空 / `soft` / `wood`）

### 3. 未入力項目を質問する

ユーザーの初回依頼に含まれている項目は再質問しない。

未入力項目がある場合は、一度に3項目程度まで質問する。回答を受け取ったら、埋まった項目を保持し、残りの未入力項目だけを追加で質問する。

質問は、すべての必須項目が埋まるまで続ける。

画像が未準備の場合は、`image` を空欄にしてプレースホルダー表示で仮登録できることを伝える。写真を使う場合は、画像を `assets/images/members/` 配下へ置く方針でファイル名を確認する。

### 4. 入力内容を正規化する

- `id` は小文字英数字とハイフンを基本にする。
- `displayOrder` は数値にする。
- `isPublished` は true / false にする。
- `visualVariant` は空、`soft`、`wood` のいずれかにする。
- 文体は既存メンバーと揃え、過度に長い紹介文にしない。

### 5. 追加前に確認する

すべての必須項目が揃ったら、`js/member-data.js` へ追加する前に確認用の要約を提示する。

確認する内容:

- URL用ID
- 名前
- 役割
- 画像の有無と画像パス
- プレースホルダー色
- 3つの紹介文
- ひとことコメント
- 表示順
- 公開状態

ユーザーが修正を希望した場合は、該当項目だけを聞き直す。

### 6. ローカルデータへ追加する

確認が取れたら、`js/member-data.js` の `MEMBER_ITEMS` に新しいメンバーを追加する。

画像ファイルが提供されている場合は、プロジェクト内の既存方針に従って `assets/images/members/` 配下へ配置する。画像ファイルが未提供の場合は `image: ""` とし、プレースホルダー表示にする。

### 7. 検証する

変更後は以下を確認する。

- `node --check js/member-data.js`
- `node --check js/member-list.js`
- `node --check js/member-detail.js`
- トップページ `#members` で表示されること
- `member.html?id=<id>` で詳細表示されること

## 対象となる依頼例

- メンバーを作成したい
- メンバーを追加したい
- 新しい運営メンバーを登録したい
- メンバー紹介を1人増やしたい
- ローカルデータにメンバーを追加して

## 注意事項

- メンバー情報は Firestore に保存しない。
- 管理画面 `admin/members.html` は使わない。
- 画像URLの手入力運用には戻さない。
- 個人情報寄りの項目（年齢、住所、連絡先、個人SNSなど）は追加しない。
- ユーザーがすべての必須項目を埋めるまで、実データ追加へ進まない。
- `.claude/skills/local-member-create/SKILL.md` と `.agents/skills/local-member-create/SKILL.md` は同一内容を維持する。
