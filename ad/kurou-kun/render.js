#!/usr/bin/env node
/*
 * クロウ君 広告動画レンダラ
 *   ad.html を Playwright で 1フレームずつ撮影し、
 *   Playwright 同梱の ffmpeg (libvpx/VP8) で WebM にエンコードする。
 *
 * 使い方:
 *   node render.js                        # 全編レンダリング → kurou-kun-ad.webm
 *   node render.js --stills 500,3000,...  # 指定ms の静止画PNGを stills/ に出力(デザイン確認用)
 *   node render.js --fps 30 --out foo.webm --bitrate 6M
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PLAYWRIGHT_CANDIDATES = [
  'playwright',
  '/opt/node22/lib/node_modules/playwright',
];
let chromium;
for (const c of PLAYWRIGHT_CANDIDATES) {
  try { chromium = require(c).chromium; break; } catch {}
}
if (!chromium) { console.error('playwright not found'); process.exit(1); }

const FFMPEG_CANDIDATES = [
  process.env.FFMPEG_PATH,
  '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux',
  'ffmpeg',
].filter(Boolean);
const ffmpegBin = FFMPEG_CANDIDATES.find(p => { try { return p === 'ffmpeg' || fs.existsSync(p); } catch { return false; } });

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};

const FPS = Number(getArg('fps', 30));
const OUT = getArg('out', path.join(__dirname, 'kurou-kun-ad.webm'));
const BITRATE = getArg('bitrate', '6M');
const STILLS = getArg('stills', null);
const W = 1920, H = 1080;

(async () => {
  const browser = await chromium.launch({
    executablePath: fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
      ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined,
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto('file://' + path.join(__dirname, 'ad.html'));
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => window.__total);

  if (STILLS) {
    const dir = path.join(__dirname, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const msRaw of STILLS.split(',')) {
      const ms = Number(msRaw);
      await page.evaluate(t => window.__seek(t), ms);
      const file = path.join(dir, `t${String(ms).padStart(5, '0')}.png`);
      await page.screenshot({ path: file, type: 'png' });
      console.log('still:', file);
    }
    await browser.close();
    return;
  }

  const frames = Math.round(total / 1000 * FPS);
  console.log(`rendering ${frames} frames @ ${FPS}fps (${total}ms) -> ${OUT}`);

  const ff = spawn(ffmpegBin, [
    '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libvpx', '-b:v', BITRATE, '-crf', '8', '-qmin', '4', '-qmax', '40',
    '-deadline', 'good', '-cpu-used', '2',
    '-pix_fmt', 'yuv420p',
    '-an',
    OUT,
  ], { stdio: ['pipe', 'inherit', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d; });

  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const ms = i * 1000 / FPS;
    await page.evaluate(t => window.__seek(t), ms);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${i}/${frames}  (${el.toFixed(0)}s elapsed, ${(i / el || 0).toFixed(1)} fps)`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c + '\n' + ffErr.slice(-2000)))));
  await browser.close();

  const size = fs.statSync(OUT).size;
  console.log(`done: ${OUT} (${(size / 1024 / 1024).toFixed(2)} MB, ${(Date.now() - t0) / 1000 | 0}s)`);
})().catch(e => { console.error(e); process.exit(1); });
