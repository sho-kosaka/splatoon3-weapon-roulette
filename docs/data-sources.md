# データ出典メモ

最終確認日: 2026-06-09

このツールのブキデータは、非営利のファン用途として、以下の公開リソースを参照して整理しています。Splatoon 3 および画像等の権利は任天堂に帰属します。

## ブキ一覧

- Source: Inkipedia / Splatoon Wiki
- URL: https://splatoonwiki.org/wiki/List_of_main_weapons_in_Splatoon_3
- 用途: 現行の総数確認
- 採用内容: version 11.1.0 時点の 65 main weapons / 173 weapon kits

## ブキ名・キー・Matching Range

- Source: stat.ink API
- URL: https://stat.ink/api/v3/weapon?full=1
- 用途: `src/roulette.js` のブキ名、英語名、`statInkKey`、`matchingRange`
- 採用内容: `key`, `name.ja_JP`, `name.en_US`, `type.name.ja_JP`, `matching_range`

## Xマッチ射程グループ

- Source: stat.ink API Info: Weapons (Splatoon 3)
- URL: https://stat.ink/api-info/weapon3?_lang_=en-US
- 用途: `xMatchGroup`, `xMatchLegacyGroup`, `matchingRange` の確認
- 採用内容:
  - `X Battle (S6-)`: 現在のXマッチ射程グループとして `xMatchGroup` に保存
  - `X Battle (S2-)`: 旧シーズンの参考値として `xMatchLegacyGroup` に保存
  - `X Battle (MR)`: stat.ink API の `matching_range` と照合

## Xマッチ仕様の公式確認

- Source: Nintendo official Splatoon 3 “How X Battles work”
- URL: https://splatoon.nintendo.com/en/news/squid-research-lab-dives-deep-into-the-splatlands/
- 用途: X Battle が類似ロードアウトでマッチングするという仕様確認
- 注意: 任天堂公式はブキごとのグループ値を公開していないため、個別グループは stat.ink を参照

## 武器画像

- Source: Inkipedia MediaWiki API
- API URL: https://splatoonwiki.org/w/api.php
- File title pattern: `File:S3 Weapon Main {English weapon name} 2D Current.png`
- 用途: `assets/weapons/*.png` の取得
- 対応表: `assets/weapons/official-image-manifest.json`
- 採用内容: MediaWiki API の `imageinfo.url`, `width`, `height`, `mime`

## アプリ内での整理

- stat.ink では `L3リールガン` / `H3リールガン` 系が `リールガン` として分かれています。
- このアプリのUIでは従来どおり `リールガン` 系を `シューター` カテゴリに含めています。
- `xMatchGroup` は `S`, `M`, `L`, `C` の4値です。
- `xMatchLegacyGroup` は `X Battle (S2-)` に値があるブキだけ保持し、現行追加ブキなど値がない場合は `null` として扱います。
