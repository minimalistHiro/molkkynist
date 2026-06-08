# イベント参加者一覧 管理画面 実装計画書

- 作成日: 2026-06-08
- ステータス: 実装完了（本番デプロイ未実施）
- 対象領域: 管理画面 / お問い合わせフォーム / Firestore
- 対象画面: `contact.html` / `admin/index.html` / `admin/event-participants.html`

## 背景

管理画面には現在、お問い合わせ管理画面 `admin/contact-submissions.html` があり、公開サイトのお問い合わせフォームから届いた `contactSubmissions` を一覧・詳細で確認できる。

一方で、イベントごとの参加希望者を確認する専用画面はまだない。現状は、お問い合わせ管理画面で送信内容を1件ずつ確認する必要があるため、イベント当日の参加者確認や連絡先の把握には使いづらい。

今回の要望では、お問い合わせ管理画面とは別に、各イベントごとの参加者一覧を確認できる管理画面を追加する。

## 要望

- 管理画面に「イベント参加者一覧」ページを追加する。
- 最初の画面では、今後開催予定のイベントをトップページの開催スケジュールと同じカード形式UIで表示する。
- 各イベントカードには参加人数を表示する。
- イベントカードを選択すると、そのイベントの参加者一覧を表示する。
- 参加者一覧には、名前、住所などの参加者情報を表示する。
- 参加者情報は、既存の参加希望フォーム送信データをもとに表示する。

## 現状確認

### お問い合わせフォームの入力項目

`contact.html` の現行フォームで取得している項目:

```text
name
email
phone
inquiryType
selectedEventIds
message
privacyAgree
```

フォーム上の表示項目:

- お名前
- メールアドレス
- 電話番号
- 用件区分
- 参加希望の日程
- 一言・ご質問
- プライバシーポリシー同意

現時点では、住所入力欄は存在しない。

### Firestore保存データ

`js/contact-form.js` は、送信成功時に `contactSubmissions` へ以下を保存している。

```text
name
email
phone
inquiryType
selectedEventIds
message
createdAt
```

`selectedEventIds` は配列で保存されるため、1件の参加希望が複数イベントに紐づく可能性がある。

### Firestore Rules

`firestore.rules` では `contactSubmissions` の一般ユーザー作成時に、以下のキーだけを許可している。

```text
name
email
phone
inquiryType
selectedEventIds
message
createdAt
```

住所を保存するには、フォーム側の保存処理だけでなく Firestore Rules も更新する必要がある。

## 既存方針との整合

### 管理画面

`ADMIN_REQUIREMENTS.md` では、管理画面は `/admin/` 配下に作成し、石井さんだけが利用する前提としている。今回の参加者一覧ページも `/admin/` 配下に追加し、`requireAdmin()` による管理者確認を必須にする。

管理画面ではデータベース項目の一覧に編集ボタンと削除ボタンを置く方針があるが、今回の画面は参加者データを編集・削除する主画面ではなく、既存の `contactSubmissions` をイベント別に参照する閲覧画面として扱う。削除が必要な場合は、既存のお問い合わせ管理画面で実行する運用を基本とする。

### Firestore

参加者専用コレクションは新設せず、まずは既存の `contactSubmissions` を正本として使う。

理由:

- 参加希望フォームの送信データがすでに `contactSubmissions` に保存されている。
- `selectedEventIds` によってイベントとの紐づけが可能。
- お問い合わせ管理画面、自動返信メール、対応メモなど既存運用と分断しない。

### 公開サイト

参加者一覧は管理者専用画面であり、公開サイトには表示しない。一般ページのヘッダーやフッターにも管理画面への導線は追加しない。

## 実装方針

### 1. 住所入力欄をお問い合わせフォームへ追加する

対象:

- `contact.html`
- `js/contact-form.js`
- `firestore.rules`
- 必要に応じて `css/styles.css`

追加フィールド:

```text
address
```

フォーム表示:

```text
住所（任意）
```

方針:

- 住所は任意項目として追加する。
- 参加希望以外の問い合わせでも入力できる共通項目にする。
- `autocomplete="street-address"` を設定する。
- 保存時は空文字を許容する。
- Firestore Rules では `address` を許可し、文字列かつ上限文字数を設定する。

補足:

- 既存の送信データには `address` が存在しないため、管理画面では「未取得」と表示する。
- 住所は個人情報のため、公開サイト側には表示しない。

### 2. 管理ダッシュボードに導線を追加する

対象:

- `admin/index.html`
- 各管理画面のナビゲーション

追加導線:

```text
イベント参加者一覧
```

方針:

- 既存の `イベント管理`、`お問い合わせ管理` と同列の管理メニューとして追加する。
- お問い合わせ管理とは役割を分け、イベント単位で参加者を確認する画面として説明する。

### 3. イベント参加者一覧ページを追加する

新規ファイル:

```text
admin/event-participants.html
js/admin-event-participants.js
```

最初の画面:

- ページ見出しは「イベント参加者一覧」とする。
- 今後開催予定のイベントを一覧表示する。
- UIはトップページ `index.html#schedule` の開催スケジュールカードに近い構成にする。
- 開催日、時間、会場名、住所、参加費、参加人数を表示する。

対象イベント:

```text
events.status == "scheduled"
events.eventDate >= 今日
```

会場情報:

- `events.venueId` から `venues` を参照して表示する。
- 会場が未取得の場合は「開催場所未定」または既存のレガシー項目を表示する。

参加人数:

- `contactSubmissions` のうち、以下を満たす件数をカウントする。

```text
inquiryType == "participate"
selectedEventIds に対象イベントIDを含む
```

注意:

- Firestore の `array-contains` でイベントごとに取得する方法は、イベント数分の読み取りが発生する。
- 画面初期表示では今後開催予定イベント数が多くない想定のため、まずは実装しやすさを優先する。
- 将来イベント数や参加者数が増えた場合は、集計用フィールドや専用コレクションを検討する。

### 4. イベント別参加者リストを表示する

同一ページ内で、選択したイベントの参加者リストを表示する。

表示候補:

```text
名前
メールアドレス
電話番号
住所
申込日時
一言・ご質問
対応ステータス
```

方針:

- イベントカードをクリックまたはタップすると、右側または下部に参加者一覧を表示する。
- デスクトップではイベント一覧と参加者詳細を2カラムで表示する。
- モバイルではイベント一覧の下に参加者リストを表示する。
- 参加者がいない場合は「このイベントの参加希望者はまだいません。」と表示する。
- 住所未取得の既存データは「未取得」と表示する。
- 参加者詳細から問い合わせ削除は行わない。削除・対応メモ編集が必要な場合は、お問い合わせ管理画面で対応する。

## Phase構成

### Phase 1: 住所取得項目の追加

対象:

- `contact.html`
- `js/contact-form.js`
- `firestore.rules`
- `admin/contact-submissions.html`
- `js/admin-contact-submissions.js`

実施内容:

- お問い合わせフォームに住所入力欄を追加する。
- `contactSubmissions.address` として保存する。
- Firestore Rules の許可フィールドと型チェックに `address` を追加する。
- お問い合わせ管理画面の詳細表示に住所を追加する。

完了条件:

- 住所入力あり・なしのどちらでもフォーム送信できる。
- Firestore Rules により `address` が保存可能になっている。
- 既存送信データは住所欄が「未取得」と表示される。

### Phase 2: イベント参加者一覧ページの骨組み作成

対象:

- `admin/event-participants.html`
- `js/admin-event-participants.js`
- `admin/index.html`
- 既存管理画面ナビゲーション

実施内容:

- 管理者ログイン必須のページを新規作成する。
- 管理ダッシュボードと管理ナビゲーションに導線を追加する。
- ページ見出し、ステータス表示、イベント一覧エリア、参加者一覧エリアを配置する。

完了条件:

- `/admin/event-participants.html` を開くと管理者確認が走る。
- 管理ダッシュボードから参加者一覧ページへ遷移できる。
- 未ログインまたは非管理者は既存管理画面と同じ扱いになる。

### Phase 3: 開催予定イベントカード表示

対象:

- `js/admin-event-participants.js`
- `css/styles.css`

実施内容:

- Firestore `events` から今後開催予定イベントを取得する。
- Firestore `venues` から会場情報を取得し、イベントカードに反映する。
- トップページの開催スケジュールに近いカードUIで表示する。
- 各カードに参加人数を表示する。

完了条件:

- 今後開催予定イベントが開催日昇順で表示される。
- 会場名、住所、時間、参加費、参加人数がカード上で確認できる。
- モバイルとデスクトップでカード表示が破綻しない。

### Phase 4: イベント別参加者リスト表示

対象:

- `js/admin-event-participants.js`
- `css/styles.css`

実施内容:

- 選択したイベントIDをもとに `contactSubmissions` を取得する。
- `inquiryType == "participate"` かつ `selectedEventIds` に対象イベントIDを含むデータだけを表示する。
- 名前、メールアドレス、電話番号、住所、申込日時、一言をリスト表示する。
- 既存データの住所未取得状態を明示する。

完了条件:

- イベントカード選択後、そのイベントの参加者だけが表示される。
- 複数イベントを選択した問い合わせは、該当する各イベントの参加者として表示される。
- 参加者0件の場合の空状態が表示される。

### Phase 5: ドキュメント同期

対象:

- `ADMIN_REQUIREMENTS.md`
- `SITE_STRUCTURE.md`
- `FIREBASE_ARCHITECTURE.md`
- `CONTENT_GUIDELINES.md`
- 必要に応じて `COMPLETED.md`

実施内容:

- 管理画面に「イベント参加者一覧」を追加する方針を追記する。
- `contactSubmissions.address` を Firestore 構造に追記する。
- お問い合わせフォームの入力項目に住所を追記する。
- 実装完了後、完了内容を `COMPLETED.md` に記録する。

完了条件:

- 実装内容とMarkdown資料に矛盾がない。

## 検証方針

### 静的確認

- `contact.html` を開き、住所入力欄が自然な位置に表示されることを確認する。
- `admin/event-participants.html` を開き、管理画面レイアウトが既存画面と揃っていることを確認する。
- モバイル幅とデスクトップ幅で、イベントカード・参加者リストが崩れないことを確認する。

### Firebase連携確認

- 住所なしでフォーム送信できること。
- 住所ありでフォーム送信できること。
- Firestore `contactSubmissions.address` に保存されること。
- 管理画面のお問い合わせ詳細で住所が表示されること。
- イベント参加者一覧で、対象イベントの参加者数と参加者リストが表示されること。

### セキュリティ確認

- 未ログイン状態では参加者一覧画面のデータが表示されないこと。
- 非管理者では参加者一覧画面のデータが表示されないこと。
- `contactSubmissions` の読み取りは Firestore Rules 上も管理者のみに制限されていること。
- 一般ユーザーは `contactSubmissions` を作成できるが、読み取り・更新・削除はできないこと。

## 未決事項

- 住所を任意項目のままにするか、参加希望時だけ必須にするか。
  - 初期方針では任意とする。
- 参加者リストからお問い合わせ管理画面の該当詳細へ直接遷移するか。
  - 初期方針ではリンクまたはID表示を検討し、削除・対応編集はお問い合わせ管理画面側で行う。
- 参加人数をリアルタイム購読で更新するか、ページ読み込み時の取得にするか。
  - 初期方針では管理画面の操作性を優先し、`onSnapshot` または再描画しやすい構成で実装する。

## 将来検討

参加者数が増えたり、参加キャンセル、出欠確認、当日受付、支払い状況などを管理したくなった場合は、`eventParticipants` 専用コレクションの新設を検討する。

ただし初期実装では、既存の `contactSubmissions` を正本にして、イベント別に参照・集計する。

## 実装結果（2026-06-08）

- `contact.html` に任意の住所入力欄を追加した。
- `js/contact-form.js` で `contactSubmissions.address` を保存するようにした。
- `firestore.rules` で `address` を任意フィールドとして許可し、存在する場合は文字列・300文字以内に制限した。
- `js/admin-contact-submissions.js` のお問い合わせ詳細に住所表示を追加した。
- `admin/event-participants.html` と `js/admin-event-participants.js` を追加した。
- 管理ダッシュボードと各管理画面ナビゲーションに「イベント参加者一覧」導線を追加した。
- `css/styles.css` にイベント参加者一覧用のカード・2カラム・参加者リストのスタイルを追加した。
- `ADMIN_REQUIREMENTS.md` / `SITE_STRUCTURE.md` / `FIREBASE_ARCHITECTURE.md` / `CONTENT_GUIDELINES.md` / `COMPLETED.md` を同期した。
