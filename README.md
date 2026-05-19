# molkkynist

`molkkynist` は、HTML と CSS をベースに制作する静的Webサイトプロジェクトです。

## 構成

```text
molkkynist/
├── AGENTS.md
├── README.md
├── index.html
├── css/
│   └── styles.css
└── assets/
    └── .gitkeep
```

## 制作方針

- HTML / CSS を基本にする
- JavaScript は必要な機能が出たときだけ追加する
- フレームワークやビルドツールは初期状態では使わない
- 画像・動画・フォントなどは `assets/` に配置する

## 確認方法

`index.html` をブラウザで開くと確認できます。

ローカルサーバーで確認する場合:

```bash
python3 -m http.server 8000
```

その後、ブラウザで `http://localhost:8000` を開いてください。
