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
- 2026年5月21日に E-1（SEO 基本対策）を実装。全公開8ページ（`index` / `about` / `molkky` / `events` / `reports` / `members` / `contact` / `privacy`）に `meta name="keywords"`、`link rel="canonical"`、OGP（`og:type` / `og:site_name` / `og:locale` / `og:title` / `og:description` / `og:url` / `og:image`）、Twitter Card（`twitter:card=summary` / `title` / `description` / `image`）を追加。`index.html` のみ JSON-LD（Organization スキーマ）を追加。公開ドメインは暫定で `https://molkkynist.web.app/`、OGP 画像は暫定でロゴ画像を採用（Firebase Hosting 公開ドメイン確定／OGP 専用画像作成時に差し替え）。
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
- 公開済みデータのみ表示
- 読み込み中やデータ未登録時の表示作成
- お問い合わせフォームの設置（Firestore `events` から参加日程候補を取得しトグル選択、送信内容を `contactSubmissions` に書き込み）
- プライバシーポリシーページの整備（フォーム公開の前提）
- お問い合わせフォーム送信時の自動返信メール（Cloud Functions + Firebase Extensions「Trigger Email from Firestore」。実装ファイルは `functions/index.js`、Extension 設定は `extensions/README.md` を参照。SMTP プロバイダ選定は R-7）

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
- 活動レポート管理機能
- メンバー管理機能
- 画像アップロード機能
- お問い合わせ管理機能（`contactSubmissions` の一覧・詳細表示、`mail` の `delivery.state` 確認）

成果物:

- 石井さん専用の管理画面
- イベント追加・編集機能
- レポート追加・編集機能
- メンバー編集機能
- お問い合わせ一覧と自動返信メール送信状況の確認画面

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
