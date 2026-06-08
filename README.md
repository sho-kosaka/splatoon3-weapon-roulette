# ブキ縛りプラベ・ルーレット

スプラトゥーン3のプライベートマッチで、参加者ごとに使用ブキをランダム割り当てするシンプルWebツールです。

公開ページ:

https://sho-kosaka.github.io/splatoon3-weapon-roulette/

## 現在の要件

- 参加者を改行・カンマ・読点区切りで入力でき、1/4/8人サンプルから素早く切り替えられる
- ブキ種を選択して抽選対象を絞れる
- ブキ重複なし / ありを切り替えられる
- オーダー武器を抽選に含める / 含めないを切り替えられる
- 武器データに `武器種区分`、`オーダー武器フラグ`、`PNG画像パス` を持たせる
- 参加者全員分のブキを一括抽選できる
- 参加者人数分のルーレットカードが同時に高速回転する
- 停止時に全カードが文字なしの光輪・閃光エフェクトで確定する
- 効果音ON/OFFと音量調整ができる
- `assets/sounds/` に手元のSEファイルを置くと、回転中・決定時にその音を再生できる
- 確定後のルーレット表示にも武器画像を残す
- 結果をDiscordなどへ貼りやすいテキストでコピーできる
- スマホでも操作しやすいレスポンシブUI
- 抽選ロジックは `src/roulette.js` に分離し、自動テストで検証
- `index.html` をダブルクリックして `file://` で開いても動くように `src/app.bundle.js` を同梱

## 使い方

1. `index.html` をブラウザで開く
2. 参加者名を入力する
3. 抽選対象のブキ種、重複ルール、オーダー武器の有無を選ぶ
4. 「抽選する」を押す
5. 人数分のルーレットが同時に回り、約2秒後に光輪・閃光エフェクトで止まる
6. 必要なら「結果コピー」でDiscordや通話チャットに貼る

## 効果音について

画面左側の「ルーレット効果音ON」と音量スライダーで、抽選中の音を切り替えられます。

ゲーム内SEなど、手元で利用できる音声ファイルを使いたい場合は、以下の名前で配置してください。

```text
assets/sounds/roulette-loop.mp3  ルーレットが回っている間のループ音
assets/sounds/result-se.mp3      決まった瞬間のSE
```

注意:

- このフォルダにはゲーム内SEそのものは同梱していません。
- 著作権のある音声は、権利と利用範囲を確認したうえで、個人利用・身内利用の範囲で配置してください。
- 上記ファイルが未配置、または再生できない場合は、ブラウザ内で生成する代替のカチカチ音・決定音が鳴ります。
- mp3以外の拡張子を使う場合は、`src/main.js` の `customSoundPaths` を変更してから `npm run build:bundle` を実行してください。

ローカルサーバーで開く場合:

```bash
npm start
```

その後、ブラウザで以下を開きます。

```text
http://127.0.0.1:5173
```

## 武器画像について

`assets/weapons/*.png` に、Splatoon 3の武器レンダー画像を141枚ローカル保存しています。
取得元は Inkipedia の MediaWiki API 上にある `S3 Weapon Main ... 2D Current.png` 系の画像です。

注意:

- このツールは個人・非営利のファン用途として公開しています。
- Splatoon 3および武器画像等の権利は任天堂に帰属します。
- 本リポジトリは任天堂および関係各社とは関係ありません。

再取得する場合:

```bash
npm run assets:official
```

取得結果の対応表:

```text
assets/weapons/official-image-manifest.json
```

自前SVGプレースホルダーを再生成する旧スクリプトも残しています。

```bash
node scripts/generate-assets.mjs
```

## テスト

```bash
npm test
node --check src/app.bundle.js
```

## ファイル構成

```text
index.html                          画面本体、進行看板
src/main.js                         UI制御、同時ルーレット、インパクト演出、コピー
src/roulette.js                     武器データ、抽選ロジック
src/app.bundle.js                   file://直開き用の結合済みJS
src/styles.css                      デザイン、同時ルーレット、光輪・閃光CSS
assets/weapons/*.png                武器画像 141枚
assets/sounds/README.md             効果音ファイル配置メモ
assets/weapons/official-image-manifest.json 画像取得元マニフェスト
scripts/download-official-assets.py 公式由来PNG取得スクリプト
scripts/generate-assets.mjs         旧SVGプレースホルダー生成スクリプト
test/roulette.test.js               ロジックテスト
```
