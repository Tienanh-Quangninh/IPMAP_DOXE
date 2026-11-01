import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = process.env.VERIFY_URL || 'http://127.0.0.1:5175';
const server = process.env.VERIFY_URL
  ? null
  : spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'],
      {
        stdio: 'ignore',
        windowsHide: true,
        env: { ...process.env, VITE_TURNSTILE_SITE_KEY: 'test-ui-only' },
      },
    );
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {}
  if (i === 59) {
    server?.kill();
    throw new Error('Vite test server did not start');
  }
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const errors = [];
const { expect } = await import('@playwright/test');
await mkdir('artifacts', { recursive: true });
const branch = {
  id: 'fixture-only',
  name: 'Cơ sở kiểm thử',
  province: 'Ninh Bình',
  aliases: [],
  address: 'Địa chỉ kiểm thử',
  lat: 20.4,
  lng: 106.1,
  hotline: '',
  mapUrl: 'https://example.com',
  services: [],
  active: true,
  verified: true,
  recruitmentEnabled: true,
};
const jobs = [
  {
    id: 'customer-support',
    branchId: null,
    scope: 'national',
    title: 'Hỗ trợ chăm sóc khách hàng',
    salary: 'Trao đổi khi phỏng vấn',
    benefits: [],
    vehicle: 'any',
    active: true,
  },
  {
    id: 'vehicle-technician',
    branchId: null,
    scope: 'national',
    title: 'Kỹ thuật xe',
    salary: 'Trao đổi khi phỏng vấn',
    benefits: [],
    vehicle: 'any',
    active: true,
  },
];
async function setup(hasBranch = false, region = 'Ninh Bình') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    window.__gpsRequests = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(resolve, reject) {
          window.__gpsRequests++;
          window.__finishLocation = (allow) =>
            allow
              ? resolve({ coords: { latitude: 21.1234567, longitude: 107.7654321, accuracy: 8.5 } })
              : reject({ code: 1 });
        },
      },
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const events = [];
  let applyCalls = 0;
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: "window.turnstile={render(el,opts){el.textContent='Xác minh kiểm thử';queueMicrotask(()=>opts.callback('fixture-'+opts.action+'-'+Math.random()));return 'mock';},remove(){}};",
      }),
  );
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === 'GET')
      return route.fulfill({
        json: path.endsWith('branches')
          ? { branches: hasBranch ? [branch] : [] }
          : path.endsWith('jobs')
            ? { jobs }
            : { province: region, source: 'ip' },
      });
    const payload = req.postDataJSON();
    events.push({ path, payload });
    if (path.endsWith('/apply') && ++applyCalls === 1)
      return route.fulfill({
        status: 502,
        json: { error: 'TELEGRAM_ERROR', message: 'Telegram chưa nhận, vui lòng thử lại.' },
      });
    return route.fulfill({ json: { ok: true, eventId: payload.eventId } });
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__gpsRequests === 1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return { context, page, events };
}
try {
  const denied = await setup(false, null);
  await denied.page.evaluate(() => window.__finishLocation(false));
  await expect(denied.page.getByRole('dialog', { name: 'Thông tin ứng tuyển' })).toBeVisible({
    timeout: 2000,
  });
  await expect(denied.page.getByRole('checkbox')).toHaveCount(0);
  assert.equal(denied.events.length, 0, 'Refusing GPS must not send a location event');
  await denied.page.getByLabel('Vị trí ứng tuyển').selectOption('vehicle-technician');
  await expect(denied.page.getByLabel('Vị trí ứng tuyển')).toHaveValue('vehicle-technician');
  await denied.page.keyboard.press('Escape');
  await denied.page.waitForTimeout(500);
  await expect(denied.page.getByRole('dialog')).toHaveCount(0);
  await denied.page.evaluate(() => document.fonts.ready);
  assert.match(
    await denied.page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily),
    /Be Vietnam Pro/,
  );
  await denied.page.locator('#parts').getByRole('button', { name: 'Xe máy', exact: true }).click();
  await expect(denied.page.locator('.product-card')).toHaveCount(2);
  await denied.page.locator('.product-card').first().click();
  await expect(denied.page.getByRole('dialog')).toBeVisible();
  await denied.page.keyboard.press('Escape');
  for (const width of [360, 390, 768, 1440]) {
    await denied.page.setViewportSize({ width, height: 844 });
    await denied.page.evaluate(() => scrollTo(0, 0));
    assert.equal(
      await denied.page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Overflow at ${width}`,
    );
    await denied.page.screenshot({ path: `artifacts/viewport-${width}.png`, fullPage: true });
  }
  await denied.page.locator('.branch-button').click();
  await denied.page.getByLabel('Tỉnh / thành phố', { exact: false }).selectOption('Ninh Bình');
  await expect(denied.page.getByRole('checkbox')).toHaveCount(0);
  await denied.page.getByRole('button', { name: 'Chọn khu vực & xem tuyển dụng' }).click();
  await expect(denied.page.getByRole('dialog', { name: 'Thông tin ứng tuyển' })).toBeVisible({
    timeout: 2000,
  });
  await expect
    .poll(() => denied.events.filter((e) => e.path.endsWith('location-consent')).length)
    .toBe(1);
  assert.equal(denied.events[0].payload.branchId, null);
  assert.equal(denied.events[0].payload.source, 'manual');
  assert.equal(denied.events[0].payload.position, null);
  await denied.context.close();
  console.log(
    'Denied GPS checks passed: immediate recruitment form, no location POST until manual selection, no consent checkbox, no repeated popup, 4 responsive widths.',
  );

  const granted = await setup(true);
  await granted.page.evaluate(() => window.__finishLocation(true));
  await expect(granted.page.getByRole('dialog', { name: 'Thông tin ứng tuyển' })).toBeVisible({
    timeout: 2000,
  });
  await expect
    .poll(() => granted.events.filter((e) => e.path.endsWith('location-consent')).length)
    .toBe(1);
  const loc = granted.events[0].payload;
  assert.equal(loc.source, 'gps');
  assert.equal(loc.branchId, branch.id);
  assert.deepEqual(loc.position, { latitude: 21.1234567, longitude: 107.7654321, accuracy: 8.5 });
  assert.deepEqual(
    Object.keys(loc).sort(),
    ['branchId', 'province', 'source', 'consent', 'position', 'eventId', 'turnstileToken'].sort(),
  );
  await expect(granted.page.locator('.branch-button')).toContainText(branch.name);
  await granted.page.getByLabel('Họ và tên').fill('Ứng viên kiểm thử');
  await granted.page.getByLabel('Năm sinh').fill('2000');
  await granted.page.getByLabel('Số điện thoại').fill('0912345678');
  await granted.page.getByLabel('Kỹ năng chuyên môn').fill('Hỗ trợ khách hàng và kỹ thuật xe');
  await granted.page.getByLabel('Vị trí ứng tuyển').selectOption('vehicle-technician');
  await expect(granted.page.getByRole('checkbox')).toHaveCount(0);
  await granted.page.getByRole('button', { name: 'Gửi đơn ứng tuyển' }).click();
  await expect(granted.page.getByRole('alert')).toBeVisible();
  await expect(granted.page.getByText('ĐÃ TIẾP NHẬN HỒ SƠ.', { exact: true })).toHaveCount(0);
  await granted.page.getByRole('button', { name: 'Gửi đơn ứng tuyển' }).click();
  await expect(granted.page.getByText('ĐÃ TIẾP NHẬN HỒ SƠ.', { exact: true })).toBeVisible();
  const applies = granted.events.filter((e) => e.path.endsWith('/apply'));
  assert.equal(applies.length, 2);
  assert.equal(applies[0].payload.eventId, applies[1].payload.eventId);
  assert.equal(applies[1].payload.jobId, 'vehicle-technician');
  assert.equal(applies[1].payload.submitted, true);
  assert.deepEqual(applies[1].payload.position, loc.position);
  assert.equal(applies[1].payload.locationShared, true);
  assert.equal(
    await granted.page.evaluate(() => localStorage.getItem('rg-region').includes('latitude')),
    false,
    'GPS must not enter localStorage',
  );
  await granted.page.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
  await granted.page.waitForTimeout(400);
  assert.equal(
    granted.events.filter((e) => e.path.endsWith('location-consent')).length,
    1,
    'Remount must not duplicate location delivery',
  );
  const unknown = await setup(false, null);
  await unknown.page.evaluate(() => window.__finishLocation(true));
  await expect(unknown.page.getByRole('dialog', { name: 'Thông tin ứng tuyển' })).toBeVisible({
    timeout: 2000,
  });
  await expect.poll(() => unknown.events.length).toBe(1);
  assert.equal(unknown.events[0].payload.branchId, null);
  assert.equal(unknown.events[0].payload.province, null);
  assert.equal(
    unknown.events[0].payload.position.latitude,
    21.1234567,
    'GPS must be sent even when region/branch is unknown',
  );
  await unknown.context.close();
  assert.deepEqual(errors, []);
  await granted.context.close();
  console.log(
    'Granted GPS checks passed: immediate form, independent location notification, two job choices, no checkbox, provider error/retry same ID and confirmed success; all providers mocked.',
  );
} finally {
  await browser.close();
  server?.kill();
}
