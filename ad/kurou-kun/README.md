# クロウ君 広告動画

介護・福祉施設向け AIシフト自動作成システム「クロウ君」( https://crow-shift.okii-lab.com/ ) の
30秒プロモーション動画。HTML/CSS/JS のモーショングラフィックスをヘッドレスChromiumで
1フレームずつ撮影し、動画にエンコードして生成する。

## 構成

| ファイル | 役割 |
|---|---|
| `ad.html` | 広告本体。全アニメーションが `window.__seek(ms)` で決定論的に描画される |
| `render.js` | Playwright でフレーム撮影 → ffmpeg (libvpx/VP8) で WebM にエンコード |
| `kurou-kun-ad.webm` | 完成品 (1920×1080, 30fps, 30秒, 無音) |

## 絵コンテ (30秒)

| 時間 | シーン |
|---|---|
| 0–5s   | 深夜のフック「毎月のシフト作成に、まだ何日もかけていますか？」 |
| 5–10s  | 積み上がる制約タグ →「考えることが、多すぎる。」 |
| 10–14.5s | 夜明け。クロウ君登場、ロゴ「クロウ君 / AIシフト自動作成システム」 |
| 14.5–21s | シフト表が自動で埋まるデモ「ボタンひとつで、最適なシフト。」 |
| 21–25.5s | 「数日 → 数分。」 |
| 25.5–30s | CTA: crow-shift.okii-lab.com / デモのご依頼受付中 |

## 再生成

```bash
node render.js                          # 全編 → kurou-kun-ad.webm
node render.js --stills 2600,12500      # 指定msの静止画を stills/ に出力(デザイン確認用)
node render.js --fps 30 --bitrate 6M --out out.webm
```

ブラウザで `ad.html?play` を開くとプレビュー再生できる。

## メモ

- 音声なし(BGM・ナレーションは動画編集ソフトで後付けを想定)
- MP4 (H.264) が必要な場合はローカルで変換:
  `ffmpeg -i kurou-kun-ad.webm -c:v libx264 -crf 18 -pix_fmt yuv420p kurou-kun-ad.mp4`
- フォントは IPA Pゴシック (コンテナ内蔵) を使用
