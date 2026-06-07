# ROADMAP

## 開発ロードマップ

Molkkynist のサイトは、最初から全機能を作り込まず、公開に必要な情報を整えたあと、Firebase 連携と管理画面を段階的に追加します。

## 第1段階: 静的サイトの土台作成

目的:

- Molkkynist の基本情報を掲載できる状態にする
- デザインの方向性を確認できる状態にする
- 石井さんとの相談材料を作る

作業内容:

- トップページ作成
- Molkkynistについてページ作成
- モルックとはページ作成
- イベントページの静的版作成
- 活動レポートページの静的仮ページ作成
- メンバー紹介ページの静的版作成
- 参加・お問い合わせ導線作成
- CSS の基本設計
- レスポンシブ対応

成果物:

- HTML / CSS の静的ページ
- 仮テキスト
- 仮画像または生成画像
- スマートフォンとデスクトップで破綻しないレイアウト

進捗:

- 2026年5月20日に、初期静的サイトとして `index.html`、`about.html`、`molkky.html`、`events.html`、`reports.html`、`members.html`、`contact.html`、`css/styles.css` を実装。
- 管理画面、Firebase SDK、Firestore読み込み、ログイン、フォームは未実装のまま、第3段階以降で扱う。
- Instagram DM 導線は全ページに仮リンクとして配置し、正式URL確定後に差し替える。
- 2026年5月20日の石井さんとの打ち合わせで、お問い合わせ動線を「Instagram DM + サイト内お問い合わせフォーム併用」に確定。トップページに「次回イベントカレンダー」「協力団体・スポンサー紹介」セクションを追加する方針を合意（詳細は `meeting_notes/2026-05-20.md`）。
- 2026年5月21日に R-1 / R-2 / R-5 を決定。お問い合わせフォームは Googleフォームではなく Firebase 連携の独自フォームに切り替え（必須: 名前・メール／任意: 電話番号／用件区分4種／参加希望時は Firestore `events` から日程取得しトグル選択）。協力団体・スポンサーはトップ下部にロゴ並べ表示（参考: モルックマニアのパートナー募集）。現時点の掲載対象はココシバのみ。モルックルール記事のSEOブログ化は見送り。
- 2026年5月21日に E-1（SEO 基本対策）を実装。全公開8ページ（`index` / `about` / `molkky` / `events` / `reports` / `members` / `contact` / `privacy`）に `meta name="keywords"`、`link rel="canonical"`、OGP（`og:type` / `og:site_name` / `og:locale` / `og:title` / `og:description` / `og:url` / `og:image`）、Twitter Card（`twitter:card=summary` / `title` / `description` / `image`）を追加。`index.html` のみ JSON-LD（Organization スキーマ）を追加。公開ドメインは `https://molkkynist-a0abd.web.app/` に確定済み。OGP 画像は暫定でロゴ画像を採用（OGP 専用画像作成時に差し替え）。
- 2026年5月22日に公開8ページの共通ヘッダーを更新。ブランド名テキストを英字ワードマーク画像 `assets/images/logos/molkkynist-wordmark.png` に差し替え、スマートフォン表示ではハンバーガーメニューで主要セクションを開閉できるようにした。あわせて `index.html` のフッター直前に「ご予約はこちら」ボタンとX・Instagram・LINEのSNSアイコン導線を追加。
- 2026年5月24日に `index.html` の `#about` と `#schedule` の間に `#news`（お知らせ）セクションを新設。`report-carousel` / `report-news-card` のカルーセル UI で、ダミーカード4枚を自動スクロール表示する。お知らせ詳細用に共通テンプレート `news.html` と描画スクリプト `js/news-detail.js` を追加し、`?id=xxx` の URLパラメータでクライアント側ダミーデータを出し分ける。CSS には詳細ページ用の `.news-detail__visual` 系プレースホルダーを追加。
- 2026年6月5日に D-10（お知らせ管理）を実装。`admin/news.html` と `js/admin-news.js` を追加し、Firestore `news` の記事追加・編集・公開切替に対応。トップページ `#news` は `js/news-list.js` で公開済み記事を取得し、`news.html?id=xxx` はFirestore記事を優先表示する構成へ移行した。Firestore未登録・取得失敗時は `js/news-data.js` の初期4件をフォールバック表示する。
- 2026年6月6日に D-9（お問い合わせ対応管理）を実装。`admin/contact-submissions.html` の詳細欄から対応ステータス（未対応 / 対応中 / 対応済み）と対応メモを保存できるようにし、一覧にも対応ステータスを表示する構成へ更新した。
- 2026年6月6日に R-10 を確定し、D-12（メンバー管理）を実装。`admin/members.html` と `js/admin-members.js` を追加し、Firestore `members` の追加・編集・公開切替・表示順管理に対応。トップページ `#members` と `member.html?id=xxx` はFirestoreメンバーを優先表示し、未登録・取得失敗時は `js/member-data.js` の初期3名をフォールバック表示する。
- 2026年6月7日にメンバー管理画面へ Firebase Storage 画像アップロードを追加。スマホで選択した JPEG / PNG / WebP（5MB以下）を `members/{memberId}/` 配下へアップロードし、取得したURLを Firestore `members.imageUrl` に保存する。公開サイト側は既存の `imageUrl` 表示ロジックで画像を表示する。
- 2026年6月7日に `member.html` の各メンバー詳細画面から「メンバー一覧へ戻る」ボタンを撤去。トップページ `#members` への導線はヘッダー・フッターの「メンバー」リンクで維持する。
- 2026年5月24日に `index.html` 旧 `#reports`（活動レポート）セクションを `#activity`（活動の様子）として刷新。横スライドのカルーセル UI を撤去し、正方形写真を 3×3 グリッドで並べる新 `.activity-grid` 構造に置き換え。9 枚の画像は `assets/images/activity/activity-01.jpg` 〜 `activity-09.jpg` を参照し、画像未配置時は黄色〜緑系の淡いグラデーションでプレースホルダー表示する。英字ラベルは `Activity Reports` → `Activity`、見出しは「活動レポート」→「活動の様子」、リード文と CTA「活動レポートを見る」（リンク先は `reports.html`）を整備。全公開ページのヘッダーナビゲーションのリンクを `index.html#reports / 活動レポート` から `index.html#activity / 活動の様子` に更新。既存の `report-carousel` 系 CSS と `js/report-carousel.js` は `#news` セクションで継続使用するため残置。
- 2026年5月24日に公開サイトのメンバー一覧専用ページ `members.html` を廃止。一覧表示はトップページ `#members` セクションに一本化し、`index.html` から「メンバー紹介へ」ボタンと `section-heading--with-link` 装飾を撤去。全公開ページのフッター「メンバー」リンクと `member.html` の「メンバー一覧へ戻る」ボタンの参照先を `index.html#members` に変更。個別メンバー詳細テンプレート `member.html?id=xxx` は存続し、2026年6月6日以降は Firestore `members` を優先表示する。
- 2026年5月24日に `index.html` の `#about` セクションから3つのアクティビティカード（Activity 01「定期イベントの開催」/ 02「初心者サポート」/ 03「地域とのつながり」= `pillar-grid` ブロック）を撤去。トップでは文章ベースの紹介に集約する方針に変更し、未使用となった `.pillar-grid` / `.pillar-card` 系 CSS を `css/styles.css` から削除。あわせてヒーロー見出しを「「モルックをもっと身近な遊びに。」をコンセプトにしたコミュニティです」の一文に簡素化し、`#hero-title` の文字サイズを `clamp(1.4rem, 3.2vw, 2rem)`（モバイルでは `clamp(1.25rem, 5.2vw, 1.7rem)`）に縮小して、ワードマーク主体のヒーローに合わせて見出しの重みを抑えた。
- 2026年6月7日にトップページの `#about` から `about.html` へのテキストリンク「Molkkynistの活動方針を詳しく見る」を撤去。あわせてトップページヒーローを画面幅いっぱいの活動写真＋写真上の白ワードマーク構成に調整し、ヘッダーをトップページのみ写真上へ重ねる表示へ変更。開催場所詳細は `#schedule` 内から独立した `#venue-detail` セクションとして分離した。
- 2026年6月7日にイベント予約システムを再整理。管理画面に `admin/venues.html`（開催場所）を追加し、`events` は `venueId` で開催場所を参照する構成へ変更した。イベント基本情報からタイトル、説明文、定員、持ち物、公開フラグを削除し、公開サイトとお問い合わせフォームは `status == "scheduled"` の今後イベントを表示する。
- 試作版（見た目中心）を1週間目処で作成し、リンクをLINEで石井さんに共有予定。
- 次回ミーティング: 2026年5月23日（土）21:00。AP関連の確認とサイト試作版の共有を予定。
- サイト試作版の宣伝機会: 2026年6月7日のスローマーケット（ココシバ）、2026年6月13日のモルクッキング。

## 第2段階: デザイン素材の作成

目的:

- Molkkynist らしい見た目を作る
- 北欧感、芝生、木の質感をサイトに反映する

作業内容:

- Image Gen 2 で素材作成
- 芝生テクスチャ作成
- 木目素材作成
- モルックらしいメインビジュアル作成
- 画像の軽量化
- `assets/` への配置
- CSS への反映

成果物:

- サイト用画像素材
- メインビジュアル
- 背景素材
- イベントやメンバー紹介で使える汎用画像

## 第3段階: Firebase 基盤整備

目的:

- 公開環境とデータ更新基盤を用意する

作業内容:

- Firebase プロジェクト作成
- Firebase Hosting 設定
- Firestore 設定
- Firebase Authentication 設定
- Firebase Storage 設定
- Firestore Security Rules の初期設定
- Storage Security Rules の初期設定

成果物:

- Firebase Hosting で公開できる状態
- Firestore にデータを保存できる状態
- 石井さんのログイン準備

## 第4段階: 公開サイトの Firebase 連携

目的:

- イベント情報や活動レポートを Firestore から表示できるようにする
- お問い合わせフォームを Firebase 連携で稼働させる

作業内容:

- Firebase SDK の導入
- イベント一覧の Firestore 読み込み
- 活動レポート一覧の Firestore 読み込み
- メンバー情報の Firestore 読み込み
- 公開対象データのみ表示（イベントは `status == "scheduled"`、開催場所は `isActive == true`、その他公開系コレクションは `isPublished == true`）
- 読み込み中やデータ未登録時の表示作成
- お問い合わせフォームの設置（Firestore `events` から参加日程候補を取得しトグル選択、送信内容を `contactSubmissions` に書き込み）
- プライバシーポリシーページの整備（フォーム公開の前提）
- お問い合わせフォーム送信時の自動返信メール（Cloud Functions + `nodemailer` + Gmail SMTP。実装ファイルは `functions/index.js` を参照。2026年6月5日に `molkkynist@gmail.com` からの自動返信送信成功を確認済み）

成果物:

- Firestore のデータを表示する公開サイト
- イベント更新に強いページ構成

## 第5段階: 管理画面の実装

目的:

- 石井さんが自分でイベントやレポートを更新できるようにする

作業内容:

- `admin/login.html` 作成
- `admin/index.html` 作成
- ログイン状態の判定
- 管理者 UID の判定
- イベント管理機能
- 開催場所管理機能
- 活動レポート管理機能
- メンバー管理機能
- お知らせ管理機能（`admin/news.html` / Firestore `news` コレクション）
- 画像アップロード機能
- お問い合わせ管理機能（`contactSubmissions` の一覧・詳細表示、`mail` の `delivery.state` 確認）

成果物:

- 石井さん専用の管理画面
- イベント追加・編集機能
- 開催場所追加・編集機能
- レポート追加・編集機能
- メンバー編集機能
- お問い合わせ一覧と自動返信メール送信状況の確認画面

進捗:

- 2026年5月21日に初期管理画面を実装。`admin/login.html`、`admin/index.html`、`admin/events.html`、`admin/contact-submissions.html` を追加し、Firebase Authentication のメールアドレス + パスワード方式、管理者UID判定、イベント追加・編集・公開切替、お問い合わせ一覧・詳細表示、自動返信メール送信状態確認を実装。
- 管理画面共通JSとして `js/admin-auth.js`、ログイン制御 `js/admin-login.js`、イベント管理 `js/admin-events.js`、お問い合わせ管理 `js/admin-contact-submissions.js` を追加。
- `mail` コレクションは管理画面から直接読まず、Cloud Functions callable `getMailDeliveryStates` で `delivery.state` を取得する構成にした。2026年6月5日に D-7 として管理者UIDを複数UID対応に変更し、あなたのUID `PvM8qIBG1ETC2Y7qM3PFj1i2ASk2` を `js/firebase-config.js` / `firestore.rules` / Cloud Functions 管理者判定へ先行登録済み。石井さんUID確定後は `adminUids` 配列と Functions 環境変数 `ADMIN_UIDS` へ追加する。
- 2026年5月21日に Firebase プロジェクト `molkkynist-a0abd` と連携。Webアプリ `Molkkynist` を作成し、`js/firebase-config.js` へSDK設定値を反映。Firebase Hosting は `https://molkkynist-a0abd.web.app` へデプロイ済み。Firestore default データベース、Security Rules、Indexes もデプロイ済み。
- Firestore は `asia-northeast1`（東京）で再作成済み。Cloud Functions は `sendAutoReplyOnContactCreate` と `getMailDeliveryStates` を `asia-northeast1` にデプロイ済み。2026年5月22日に自動返信メールを Gmail SMTP 直送方式へ変更。2026年6月5日に送信用Gmail `molkkynist@gmail.com`、App Password、SMTP Secret 設定を反映し、フォーム相当のテスト送信で自動返信メール送信成功を確認済み。2026年6月5日に B-1 として Cloud Functions 実行サービスアカウントへ `roles/datastore.user` を付与し、`mail` コレクションへの送信状態記録に必要なFirestore権限も設定済み。Authentication の石井さん用ユーザー作成と管理者UID反映は残作業。
- 2026年6月5日に D-8 として、本番管理画面の先行確認を実施。あなたのアカウントで `admin/events.html` と `admin/contact-submissions.html` にログインできること、イベント作成・編集・公開ON/OFF、問い合わせ一覧・詳細閲覧、自動返信メール送信状態の取得を確認済み。`getMailDeliveryStates` はブラウザから呼び出せるよう、Cloud Run サービス `getmaildeliverystates` に `allUsers` の `roles/run.invoker` を付与し、関数内部のFirebase管理者UID判定で制御する構成にした。確認用テストイベントは削除済み。
- 2026年6月7日に開催場所管理 `admin/venues.html` と `js/admin-venues.js` を追加。イベント管理 `admin/events.html` は開催場所を `venues` から選択する形式へ変更し、イベントの公開判定は公開フラグではなく `status == "scheduled"` を基準にした。
- 活動レポート管理、サイト基本設定は未実装。メンバー管理は 2026年6月6日に D-12 として実装・デプロイ済み。メンバー画像のStorageアップロードは2026年6月7日にローカル実装済みで、Storage Rules のデプロイと本番アップロード確認が残る。

## 第6段階: 公開前確認

目的:

- 公開前に表示、導線、権限を確認する

確認内容:

- モバイル表示
- デスクトップ表示
- Instagram DM 導線
- イベント情報の表示
- 活動レポートの表示
- 管理者ログイン
- 石井さん以外の書き込み不可
- 画像表示速度
- 誤字脱字

成果物:

- 公開可能な初期版

## 第7段階: 運用改善

目的:

- 実際の運用に合わせて更新しやすくする

改善候補:

- イベント告知テンプレートの改善
- レポート入力項目の見直し
- 画像アップロードの操作性改善
- スポンサー向けページ追加
- よくある質問の追加
- SEO の改善
- アクセス解析の導入

## 初期公開までの推奨順序

1. 静的ページで全体構成を作る
2. 石井さんと文章・掲載内容を確認する
3. Image Gen 2 で必要な素材を作る
4. デザインを反映する
5. Firebase Hosting で公開準備をする
6. Firestore でイベント情報を表示する
7. 管理画面を追加する

## 注意点

- 最初から管理画面を作り込みすぎない
- 先に公開サイトとして伝わる構成を固める
- 文章は石井さんとの相談後に正式化する
- Firebase のセキュリティルールは公開前に必ず確認する
- Image Gen 2 の素材は実際の活動写真と混同されないように使う
