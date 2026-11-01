import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const content = (property) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`))?.[1];
const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
assert.ok(canonical, 'Static canonical URL must exist');
assert.equal(new URL(canonical).protocol, 'https:');
assert.equal(content('og:url'), canonical);
assert.equal(content('og:image'), new URL('/images/social-recruitment-v2.jpg', canonical).href);
assert.equal(content('og:image:width'), '1200');
assert.equal(content('og:image:height'), '630');
assert.equal(content('og:image:type'), 'image/jpeg');
assert.equal(content('og:title'), 'Độ Xe Máy | Tuyển dụng nhân viên');
assert.equal(content('twitter:title'), content('og:title'));
assert.ok(html.includes('<title>Độ Xe Máy | Tuyển dụng nhân viên</title>'));
const jpg = readFileSync('dist/images/social-recruitment-v2.jpg');
assert.equal(jpg.readUInt16BE(0), 0xffd8);
assert.ok(jpg.length < 300 * 1024, 'Share JPEG should stay under 300 KiB');
assert.equal(content('twitter:card'), 'summary_large_image');
assert.ok(!html.includes('__SITE_URL__'), 'Build must resolve the public origin without client JS');
const image = readFileSync('dist/images/social-preview.png');
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
assert.ok(image.length < 1024 * 1024, 'Share PNG should stay under 1 MiB');
assert.ok(
  readFileSync('dist/robots.txt', 'utf8').includes(new URL('/sitemap.xml', canonical).href),
);
assert.ok(readFileSync('dist/sitemap.xml', 'utf8').includes(`<loc>${canonical}</loc>`));
console.log(
  'SEO checks passed: recruitment title, static canonical/OG/Twitter metadata, lightweight JPEG + 1200×630 PNG, robots and sitemap.',
);
