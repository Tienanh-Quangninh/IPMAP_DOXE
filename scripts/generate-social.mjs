import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Render an original share-card layout using the project's existing concept photo.
// Text stays exact and the exported PNG is always 1200 x 630 physical pixels.
const fontDir = 'node_modules/@fontsource/be-vietnam-pro';
const fontCSS = [700, 900]
  .map((weight) =>
    readFileSync(`${fontDir}/${weight}.css`, 'utf8').replace(
      /url\(\.\/files\/([^)]*)\)/g,
      (_match, name) => {
        const data = readFileSync(path.join(fontDir, 'files', name)).toString('base64');
        return `url(data:font/${name.endsWith('woff2') ? 'woff2' : 'woff'};base64,${data})`;
      },
    ),
  )
  .join('\n');
const photo = readFileSync('public/images/garage-moto.webp').toString('base64');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><style>${fontCSS}
 *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{font-family:'Be Vietnam Pro',sans-serif;color:#fff;background:#0b0d10}
 .photo,.shade{position:absolute;inset:0}.photo{background:url(data:image/webp;base64,${photo}) center right/cover}.shade{background:linear-gradient(90deg,#070a0ff5 0%,#070a0fe6 25%,#070a0f65 53%,#070a0f0d 85%),linear-gradient(0deg,#070a0fbb,transparent 45%)}
 .content{position:absolute;inset:51px 62px}.brand{font-weight:900;font-size:27px;letter-spacing:-1px}.brand span{color:#ff5a1f}.brand small{font-size:10px;letter-spacing:2px;display:block;margin-top:8px;font-weight:700;color:#adb1b7}
 .rule{width:35px;height:3px;background:#ff5a1f;margin:45px 0 22px}h1{margin:0;font-size:54px;line-height:1.24;letter-spacing:-2.1px;font-weight:900;white-space:nowrap}h1 span{color:#ff5a1f}.tag{font-size:12px;letter-spacing:2px;font-weight:700;margin-top:26px;color:#c3c5c9}.bottom{position:absolute;bottom:36px;left:62px;right:62px;display:flex;justify-content:space-between;border-top:1px solid #ffffff30;padding-top:18px;font-weight:700;font-size:10px;letter-spacing:2px}.bottom span:last-child{color:#9a9da4;font-size:9px;letter-spacing:.7px}.edge{position:absolute;left:0;bottom:0;right:0;height:9px;background:#ff5a1f}
 </style></head><body><div class="photo"></div><div class="shade"></div><div class="content"><div class="brand"><span>ĐỘ XE</span> MÁY<small>PHỤ TÙNG & ĐỒ CHƠI XE MÁY</small></div><div class="rule"></div><h1>ĐỘ CHẤT RIÊNG.<br><span>NÂNG TẦM</span><br>HIỆU SUẤT.</h1><div class="tag">PHỤ TÙNG · ĐỒ CHƠI · TUYỂN DỤNG</div></div><div class="bottom"><span>BUILT TO STAND OUT.</span><span>HÌNH ẢNH CONCEPT</span></div><div class="edge"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => i.decode())));
  mkdirSync('public/images', { recursive: true });
  await page.screenshot({ path: 'public/images/social-preview.png', type: 'png' });
  const png = readFileSync('public/images/social-preview.png');
  if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630)
    throw new Error('Unexpected share image dimensions');
  console.log(
    `Created public/images/social-preview.png — 1200×630, ${Math.round(png.length / 1024)} KiB`,
  );
} finally {
  await browser.close();
}
