# メンバー画像アップロード機能 実装計画書

- 作成日: 2026-06-07
- ステータス: 実装完了（ローカル、デプロイ未実施）
- 対象領域: 管理画面 / Firebase Storage / Firestore members
- 対象画面: `admin/members.html`

## 背景

現在のメンバー管理画面では、メンバー写真をファイルとしてアップロードする機能はなく、`写真またはアイコン画像URL` 欄へ画像URL文字列を手入力する方式になっている。

保存処理では `js/admin-members.js` がフォーム入力値を読み取り、Firestore `members.imageUrl` にその文字列を保存する。公開サイト側のトップページ `#members` と `member.html?id=xxx` は、この `imageUrl` をそのまま画像URLとして表示する。

この構成は画像URLが用意済みであれば動作するが、スマホから管理画面を開いてその場で写真を選び、メンバー画像として登録する運用には向いていない。

## 要望

管理者がスマホから `admin/members.html` を開き、端末内の写真またはカメラで撮影した画像を選択して、Firebase Storage へアップロードできるようにする。

アップロード完了後は、Firebase Storage の公開表示用URLを Firestore `members.imageUrl` に保存し、既存の公開サイト表示にそのまま反映させる。

## 現在の実装状況

### 実装済み

- `admin/members.html`
  - 名前、役割、画像URL、アイコン色、表示順、紹介文、公開状態を編集できる。
- `js/admin-members.js`
  - Firebase Authentication の管理者判定後、Firestore `members` を追加・編集できる。
  - `imageUrl` はテキスト入力値として保存している。
- `js/member-list.js`
  - 公開済み `members` を読み込み、`imageUrl` があればトップページのメンバーカードに画像表示する。
- `js/member-detail.js`
  - 公開済み `members` を読み込み、`imageUrl` があればメンバー詳細ページに画像表示する。
- `js/firebase-config.js`
  - `storageBucket` は Firebase Web SDK 設定値として反映済み。

### 未実装

- 管理画面でのファイル選択UI
- 画像プレビュー
- Firebase Storage SDK の読み込み
- Firebase Storage へのアップロード処理
- アップロード進捗・失敗時メッセージ
- Storage Security Rules
- `firebase.json` の Storage Rules 設定
- 画像サイズ・形式制限
- 差し替え時の旧画像削除方針

## 実装方針

既存の `members.imageUrl` を公開サイト側の表示ソースとして維持する。管理画面だけに Firebase Storage アップロード処理を追加し、アップロード完了後に得たURLを既存の `imageUrl` 欄へ反映する。

これにより、公開サイト側の `js/member-list.js` と `js/member-detail.js` は原則として大きく変更しない。

## 想定する管理画面の操作フロー

1. 管理者が `admin/members.html` にログインする。
2. 新規メンバー作成または既存メンバー編集を開始する。
3. `写真を選択` ボタンからスマホの写真ライブラリまたはカメラ画像を選ぶ。
4. 選択直後に管理画面内でプレビューを表示する。
5. 保存時、画像ファイルが選択されていれば Firebase Storage へアップロードする。
6. アップロード完了後、取得した画像URLを `members.imageUrl` として Firestore に保存する。
7. 公開状態がオンなら、トップページのメンバー一覧と詳細ページに画像が表示される。

## データ設計

Firestore `members` は既存フィールドを継続利用する。

```text
imageUrl
```

Storage の保存先は下記を想定する。

```text
members/{memberId}/profile.{拡張子}
```

新規作成時は Firestore のドキュメントIDが必要になるため、保存前に `doc(membersRef)` でIDを先に採番し、そのIDを使って Storage パスを決める。

## Storage Rules 方針

メンバー画像は公開サイトに表示する前提のため、読み取りは公開、書き込みは管理者UIDのみ許可する。

想定ルール:

```text
match /members/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null
    && request.auth.uid in [管理者UID一覧]
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

補足:

- 一般ユーザーはアップロード不可。
- 画像は公開ページに出す前提なので、Storage上でも公開読み取りを許可する。
- 個人情報寄りの画像を扱う場合は、公開状態とアップロード画像の扱いを運用で明確にする。

## 画像制限案

- 対応形式: JPEG / PNG / WebP
- 上限サイズ: 5MB
- 推奨サイズ: 長辺 1200px 程度
- 画面側では `accept="image/jpeg,image/png,image/webp"` を指定する。
- 初期実装ではクライアント側リサイズは必須にしない。
- 画像容量が問題になった場合、次段階でブラウザ側圧縮を追加する。

## Phase構成

### Phase 1: Storage設定とルール追加

- 対象ファイル:
  - `storage.rules`
  - `firebase.json`
  - `FIREBASE_ARCHITECTURE.md`
  - `ADMIN_REQUIREMENTS.md`
- 実装内容:
  - Storage Rules を新規追加する。
  - `firebase.json` に Storage Rules の参照を追加する。
  - 管理者のみアップロード可能、公開画像は読み取り可能という方針を資料へ反映する。
- 検証:
  - ルール構文確認。
  - Firebase デプロイ前の差分確認。

### Phase 2: 管理画面UI追加

- 対象ファイル:
  - `admin/members.html`
  - `css/styles.css`
- 実装内容:
  - 画像URL入力欄の近くにファイル選択UIを追加する。
  - 選択画像のプレビューを表示する。
  - スマホでも押しやすいボタンサイズと余白にする。
  - 既存のURL手入力も残し、必要な場合は直接URLを入れられるようにする。
- 検証:
  - モバイル幅でフォームが崩れないこと。
  - デスクトップ幅で既存フォームとの見た目が破綻しないこと。

### Phase 3: Firebase Storageアップロード処理

- 対象ファイル:
  - `js/admin-auth.js`
  - `js/admin-members.js`
- 実装内容:
  - Firebase Storage SDK のモジュールURLを追加する。
  - ファイル選択状態を保持する。
  - 保存時に画像が選択されていれば Storage へアップロードする。
  - `getDownloadURL()` で取得したURLを `members.imageUrl` に保存する。
  - アップロード中は保存ボタンを無効化し、状態メッセージを表示する。
  - 失敗時は Firestore 保存を止め、再試行できるようにする。
- 検証:
  - 新規メンバー作成時に画像URLが保存されること。
  - 既存メンバー編集時に画像を差し替えられること。
  - 画像を選ばない場合は既存 `imageUrl` の動作が維持されること。

### Phase 4: 公開サイト表示確認

- 対象ファイル:
  - `js/member-list.js`
  - `js/member-detail.js`
- 実装内容:
  - 原則変更なし。
  - Storage URLが既存表示ロジックで問題なく表示されるか確認する。
- 検証:
  - トップページ `index.html#members` で画像が表示されること。
  - `member.html?id=xxx` で画像が表示されること。
  - `imageUrl` 未設定時は従来どおりアイコン風プレースホルダーが表示されること。

### Phase 5: ドキュメント整理とデプロイ準備

- 対象ファイル:
  - `FIREBASE_ARCHITECTURE.md`
  - `ADMIN_REQUIREMENTS.md`
  - `ROADMAP.md`
  - `TODO.md`
  - `COMPLETED.md`
- 実装内容:
  - Storageアップロード機能の実装状況を関連Markdownへ反映する。
  - 未実装扱いだった「Storage を使った画像アップロード」を完了項目へ移す。
  - 必要に応じて今後の画像圧縮・旧画像削除を残課題として記録する。
- 検証:
  - Markdown差分確認。
  - 実装内容と資料の矛盾がないこと。

## 目視確認チェックリスト

ローカル確認:

```bash
cd /Users/kanekohiroki/Desktop/molkkynist
python3 -m http.server 8000
```

- [ ] `http://localhost:8000/admin/members.html` をスマホ幅で開き、画像選択UIが見切れないこと。
- [ ] 画像選択後、プレビューが表示されること。
- [ ] 画像選択なしでも従来どおりURL手入力で保存できること。
- [ ] 画像選択ありで保存した場合、Firebase Storage にファイルが作成されること。
- [ ] Firestore `members.imageUrl` に画像URLが保存されること。
- [ ] 公開状態オンのメンバーがトップページ `#members` に画像付きで表示されること。
- [ ] メンバー詳細ページでも画像が表示されること。
- [ ] 管理者以外のアカウントでは Storage へアップロードできないこと。

## リスクと注意点

- Firebase Storage の無料枠や転送量には上限があるため、大きすぎる画像をそのまま大量にアップロードしない。
- スマホ写真は容量が大きくなりやすいため、初期実装後に必要であればブラウザ側リサイズを追加する。
- 公開サイトに表示する画像なので、本人確認・掲載許可・公開状態の運用を明確にする。
- Storage Rules の管理者UID一覧は `js/firebase-config.js` と `firestore.rules` の管理者UID一覧と同期する必要がある。
- 画像差し替え時に旧画像を削除しない場合、Storageに未使用ファイルが残る。初期実装では削除を必須にせず、必要になった段階で整理機能を追加する。

## 完了条件

- 管理者がスマホからメンバー画像を選択し、Firebase Storage にアップロードできる。
- アップロードされた画像URLが Firestore `members.imageUrl` に保存される。
- 公開サイトのメンバー一覧と詳細ページに画像が表示される。
- 一般ユーザーは画像をアップロードできない。
- 関連Markdownに実装内容と運用注意点が反映されている。
