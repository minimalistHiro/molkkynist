# FIREBASE_ARCHITECTURE

## Firebase 採用方針

Molkkynist のサイトでは、静的Webサイトを基本にしつつ、イベント情報や活動レポートなど更新が必要な部分に Firebase を使用する方針です。

一般ユーザー向けのログイン機能は設けず、オーナーである石井さんのみが管理画面から情報を更新できる構成を目指します。

## 使用予定の Firebase サービス

### Firebase Hosting

用途:

- 公開サイトのホスティング
- 管理画面のホスティング
- 独自ドメインを使う場合の配信基盤

### Firestore

用途:

- イベント情報の保存
- 活動レポートの保存
- メンバー情報の保存
- サイト基本設定の保存

### Firebase Authentication

用途:

- 石井さん専用のログイン
- 管理画面へのアクセス判定

想定方式:

- メールアドレスとパスワード
- または Google ログイン

### Firebase Storage

用途:

- イベント画像の保存
- 活動レポート画像の保存
- メンバー画像の保存
- サイト用画像素材の保存

ただし、固定のデザイン素材や生成画像は、初期段階では `assets/` に配置する方針です。

## 公開サイトと管理画面の関係

公開サイト:

```text
/
about.html
molkky.html
events.html
reports.html
members.html
contact.html
```

管理画面:

```text
admin/login.html
admin/index.html
admin/events.html
admin/reports.html
admin/members.html
```

管理画面の URL は一般ユーザー向けナビゲーションには表示しません。

ただし、ログインページ自体は URL を知っていれば表示できます。これは一般的な構成として問題ありません。

重要なのは、ログインページを隠すことではなく、石井さん以外がデータを編集できないように Firebase 側で制御することです。

## 権限管理方針

守るべきこと:

- 一般ユーザーは公開データのみ閲覧できる
- 一般ユーザーは Firestore に書き込みできない
- 一般ユーザーは Storage にアップロードできない
- 石井さんだけが管理データを書き換えられる
- 管理画面側の表示制御だけに頼らない
- Firestore Security Rules と Storage Security Rules で制御する

## 管理者判定

管理者判定は Firebase Authentication の UID を基準にする方針です。

理由:

- メールアドレスより変更に強い
- セキュリティルールで扱いやすい
- 特定ユーザーだけに書き込み権限を与えやすい

想定:

```text
adminUid = 石井さんの Firebase Authentication UID
```

## Firestore コレクション案

### events

イベント情報を保存します。

主なフィールド:

```text
title
description
eventDate
startTime
endTime
locationName
locationAddress
capacity
fee
status
isPublished
createdAt
updatedAt
```

### reports

活動レポートを保存します。

主なフィールド:

```text
title
body
eventDate
locationName
participantCount
imageUrls
isPublished
createdAt
updatedAt
```

### members

メンバー情報を保存します。

主なフィールド:

```text
name
role
profile
comment
imageUrl
displayOrder
isPublished
createdAt
updatedAt
```

### siteSettings

サイト全体の設定を保存します。

主なフィールド:

```text
instagramUrl
instagramDmUrl
contactMessage
mainCopy
subCopy
updatedAt
```

## 公開データの考え方

公開サイトでは、`isPublished` が `true` のデータだけを表示します。

下書きや非公開データは管理画面でのみ扱います。

## JavaScript の使用方針

Firebase を使用する画面では JavaScript が必要になります。

使用箇所:

- 公開サイトで Firestore からイベント情報を読み込む
- 公開サイトで Firestore から活動レポートを読み込む
- 管理画面でログイン状態を判定する
- 管理画面でデータを追加・編集する
- Storage に画像をアップロードする

静的な本文やデザインは HTML / CSS を基本にします。

## 初期段階での注意点

- Firebase 設定情報を公開しても問題ないが、セキュリティルールを必ず適切に設定する
- 管理画面で制御していても、Firestore ルールが甘いと不正書き込みされる可能性がある
- 画像アップロードは容量や料金に注意する
- 公開サイトの表示速度を落とさないように、画像サイズを調整する

## 今後決めること

- Firebase プロジェクト名
- 石井さんのログイン方式
- 管理者 UID
- Firestore の正式なデータ構造
- セキュリティルール
- 画像アップロードのサイズ制限
- Firebase Hosting の公開ドメイン
