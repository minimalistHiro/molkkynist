# メンバー情報ローカル管理化 実装計画書

- 作成日: 2026-06-07
- ステータス: 実装完了（Hosting / Firestore デプロイ済み、Storage未セットアップ）
- 対象領域: 公開サイト / 管理画面 / Firestore / Storage / スキル
- 対象画面: `index.html#members` / `member.html` / `admin/index.html` / `admin/members.html`

## 背景

現在のメンバー情報は、Firestore `members` コレクションで管理する前提になっている。

管理画面 `admin/members.html` では、メンバーの追加・編集・公開切替・表示順管理を行い、写真は Cloud Storage for Firebase `members/{memberId}/` 配下へアップロードする構成になっている。公開サイト側では、トップページ `#members` と `member.html?id=xxx` が Firestore `members` の公開済みデータを優先して読み込み、取得できない場合のみ `js/member-data.js` の初期データをフォールバック表示する。

今回の要望では、メンバー情報をデータベースではなくローカルで管理する方針へ変更する。メンバーの登録作業は管理画面から行わず、ローカルのデータファイルと `assets/` 内の画像を編集して追加する運用に切り替える。

## 要望

- Firestore `members` コレクションを削除してよい。
- 管理画面からメンバー管理の項目・ページを削除する。
- 公開サイトのメンバー表示は維持しつつ、取得元を Firestore からローカルデータへ変更する。
- メンバー画像は Firebase Storage ではなく、ローカルアセットとして `assets/` 配下で管理する。
- 将来「メンバーを作成したい」と依頼されたときに、必要な項目を順番に質問し、すべて埋まるまで確認を続けるスキルを作成する。
- スキルは、現在の `members` コレクション相当の入力項目を基準にする。

## 現在の関連項目

Firestore `members` の主なフィールド:

```text
name
role
imageUrl
visualVariant
startedReason
favoriteThings
firstTimerMessage
comment
displayOrder
isPublished
createdAt
updatedAt
```

ローカル管理化後も、公開サイト表示に必要な項目として以下を維持する。

```text
id
name
role
image
visualVariant
startedReason
favoriteThings
firstTimerMessage
comment
displayOrder
isPublished
```

補足:

- `createdAt` / `updatedAt` は Firestore 用の管理項目のため、ローカル表示データには原則不要とする。
- `imageUrl` は外部URLではなく、ローカル画像パスを持つ `image` または同等の項目へ置き換える。
- `id` は `member.html?id=xxx` で詳細表示するため、ローカルデータでも必須にする。

## 実装方針

メンバー情報だけを Firebase 管理から外す。イベント、開催場所、お知らせ、活動レポート、お問い合わせなど、他の Firebase 利用箇所には影響を出さない。

公開サイト側では、既存の `js/member-data.js` をローカルメンバー情報の正本として扱う。`js/member-list.js` と `js/member-detail.js` から Firestore 取得処理を削除し、ローカルデータのみで一覧・詳細を描画する。

管理画面側では、`admin/members.html` と `js/admin-members.js` を削除対象にする。`admin/index.html` や各管理画面ナビゲーションから「メンバー管理」リンクを削除する。

Firestore / Storage では、`members` 関連のルール・インデックス・資料記述を削除または「ローカル管理へ移行済み」として更新する。

## Phase構成

### Phase 1: 既存参照の棚卸し

対象ファイル候補:

- `admin/members.html`
- `js/admin-members.js`
- `js/member-list.js`
- `js/member-detail.js`
- `js/member-data.js`
- `admin/index.html`
- `admin/news.html`
- `admin/venues.html`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `FIREBASE_ARCHITECTURE.md`
- `ADMIN_REQUIREMENTS.md`
- `SITE_STRUCTURE.md`
- `DESIGN_GUIDELINES.md`
- `ROADMAP.md`
- `TODO.md`
- `COMPLETED.md`

実施内容:

- `members` / `admin/members.html` / `js/admin-members.js` / `member-data` の参照箇所を確認する。
- 公開サイト表示に必要な処理と、管理画面・Firebase管理にだけ必要な処理を分離する。
- 削除してよいファイル、残すファイル、書き換えるファイルを確定する。

完了条件:

- メンバー関連の影響範囲が一覧化されている。
- 他の Firebase 機能へ影響しない変更範囲が明確になっている。

### Phase 2: 公開サイトをローカルデータ参照へ変更

対象ファイル:

- `js/member-data.js`
- `js/member-list.js`
- `js/member-detail.js`
- 必要に応じて `member.html`

実施内容:

- `js/member-data.js` をメンバー情報の正本として整理する。
- `js/member-list.js` から Firestore `members` 取得処理を削除する。
- `js/member-detail.js` から Firestore `members` 取得処理を削除する。
- `isPublished` と `displayOrder` はローカルデータ上で解釈し、公開中メンバーだけを表示する。
- 画像は `assets/` 配下のローカルパスを参照する。
- 画像未設定時は既存のアイコン風プレースホルダーを維持する。

完了条件:

- トップページ `#members` がローカルデータだけで表示される。
- `member.html?id=xxx` がローカルデータだけで詳細表示される。
- Firestore が未接続でもメンバー表示が破綻しない。

### Phase 3: 管理画面からメンバー管理を削除

対象ファイル:

- `admin/index.html`
- `admin/news.html`
- `admin/venues.html`
- `admin/members.html`
- `js/admin-members.js`
- `css/styles.css`

実施内容:

- 管理ダッシュボードから「メンバー管理」カードを削除する。
- 管理画面共通ナビゲーションから「メンバー管理」リンクを削除する。
- `admin/members.html` を削除する。
- `js/admin-members.js` を削除する。
- メンバー管理画面専用のCSSが不要であれば削除する。ただし他画面と共用しているCSSは残す。

完了条件:

- 管理画面からメンバー管理ページへ到達できない。
- 削除済みの `admin/members.html` を参照するリンクが残っていない。
- 他の管理画面の表示が崩れていない。

### Phase 4: Firebase設定から members 関連を削除

対象ファイル:

- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- 必要に応じて `firebase.json`

実施内容:

- Firestore Rules から `members` の公開読み取り・管理者書き込みルールを削除する。
- `firestore.indexes.json` から `members` 用複合インデックスを削除する。
- Storage Rules から `members/` 配下の画像ルールを削除する。
- 他のコレクション・Storage パスのルールは変更しない。

本番データ削除:

- Firestore 上の `members` コレクションは削除対象とする。
- 現時点で重要データはないため削除して問題ない。
- 2026年6月7日に `firebase firestore:delete members --recursive --force --project molkkynist-a0abd` を実行し、Firestore `members` コレクション削除は成功終了した。
- 2026年6月7日に Hosting / Firestore を `firebase deploy --only hosting,firestore --project molkkynist-a0abd` でデプロイ済み。
- Firestore 本番に残っていた `members(isPublished, displayOrder)` 複合インデックスは、名前指定で削除済み。
- Firebase Storage はプロジェクトで未セットアップのため Storage Rules はデプロイできなかった。`gcloud storage ls 'gs://molkkynist-a0abd.firebasestorage.app/members/**'` ではバケット自体が存在しないことを確認済みで、`members/` 配下の削除対象はない。

完了条件:

- リポジトリ内の Firebase 設定から `members` 管理が外れている。
- 本番側の `members` コレクション削除手順が明確になっている。

### Phase 5: メンバー作成ヒアリング用スキルを作成

対象ディレクトリ:

- `.claude/skills/local-member-create/SKILL.md`
- `.agents/skills/local-member-create/SKILL.md`

実施内容:

- `create-skill` ルールに従い、Claude Code 用の `.claude/skills/` を正本として作成する。
- Codex 用に `.agents/skills/` へ同一内容を反映する。
- スキル名は `local-member-create` を想定する。
- 「メンバーを作成したい」「メンバーを追加したい」「新しい運営メンバーを登録したい」などの依頼で発動するようにする。
- 必須項目が未入力の場合は、すべて埋まるまで質問を続ける手順を定義する。

スキルが確認する項目:

```text
id
名前
役割
写真ファイル名または写真の有無
プレースホルダー色
モルックを始めたきっかけ
モルック以外の好きなこと
初参加者へのメッセージ
ひとことコメント
表示順
公開状態
```

質問ルール:

- 一度に聞く項目は多すぎないようにする。
- 回答済み項目は保持し、未回答項目だけを追加で聞く。
- 空欄でよい項目と必須項目を明確に分ける。
- 画像が未準備の場合は、プレースホルダー表示で仮登録できるようにする。
- すべての項目が揃ったら、ローカルデータへ追加する前に確認用の要約を提示する。

完了条件:

- `.claude/skills/local-member-create/SKILL.md` と `.agents/skills/local-member-create/SKILL.md` が同一内容で作成されている。
- 将来のメンバー追加依頼時に、必要項目のヒアリング手順が明確になっている。

### Phase 6: ドキュメント同期

対象ファイル:

- `FIREBASE_ARCHITECTURE.md`
- `ADMIN_REQUIREMENTS.md`
- `SITE_STRUCTURE.md`
- `DESIGN_GUIDELINES.md`
- `ROADMAP.md`
- `TODO.md`
- `COMPLETED.md`

実施内容:

- Firestore `members` 管理を廃止したことを資料へ反映する。
- 管理画面のメンバー管理ページを削除済みとして反映する。
- メンバー紹介はトップページ `#members` と `member.html` で継続し、ローカルデータを正本にする方針を明記する。
- メンバー画像は `assets/` 配下で管理する方針へ更新する。
- 今後のメンバー追加は `local-member-create` スキルでヒアリングして進めることを記録する。

完了条件:

- 実装内容とMarkdown資料に矛盾がない。
- `members` を Firestore 管理対象として扱う記述が残っていない。

## 目視確認チェックリスト

ローカル確認:

```bash
cd /Users/kanekohiroki/Desktop/molkkynist
python3 -m http.server 8000
```

- [ ] `http://localhost:8000/` の `#members` にローカルメンバーが表示されること。
- [ ] メンバーカードから `member.html?id=xxx` へ遷移できること。
- [ ] `member.html?id=xxx` で該当メンバーの詳細が表示されること。
- [ ] 存在しない `id` の場合に、見つからない表示が出ること。
- [ ] 画像があるメンバーは `assets/` の画像が表示されること。
- [ ] 画像がないメンバーはプレースホルダー表示になること。
- [ ] `admin/index.html` に「メンバー管理」導線が残っていないこと。
- [ ] `admin/news.html` や `admin/venues.html` などの管理画面ナビに「メンバー管理」導線が残っていないこと。
- [ ] モバイル表示とデスクトップ表示の両方で、メンバー一覧・詳細が崩れないこと。

## リスクと注意点

- `members` コレクション削除は本番データ削除を伴うため、削除対象が `members` のみであることを確認してから実行する。
- Firestore / Storage の `members` 関連だけを外し、イベント・開催場所・お知らせ・お問い合わせの Firebase 機能には触れない。
- 管理画面からメンバーを編集できなくなるため、今後の更新はリポジトリ編集とデプロイが前提になる。
- 画像は `assets/` 配下で管理するため、ファイル名の命名規則と画像サイズを揃える必要がある。
- `member.html?id=xxx` を維持する場合、ローカルデータの `id` はURLとして扱いやすい英数字・ハイフンにする。
- 既存の未コミット変更が多いため、実装時は今回の変更範囲と既存変更を混ぜないように差分確認を行う。

## 完了条件

- 公開サイトのメンバー表示が Firestore に依存しない。
- 管理画面からメンバー管理ページと導線が削除されている。
- Firebase Rules / Indexes / Storage Rules から `members` 関連が削除されている。
- Firestore 本番側の `members` コレクション削除方針が明確になっている。
- メンバー追加時に必要項目を聞き切る `local-member-create` スキルの作成方針が決まっている。
- 関連Markdownに、メンバー情報はローカル管理へ移行する方針が反映されている。
