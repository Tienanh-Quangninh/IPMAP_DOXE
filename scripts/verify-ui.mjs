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
await mkdir('artifacts', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    window.__gpsRequests = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(_resolve, reject) {
          window.__gpsRequests++;
          queueMicrotask(() => reject({ code: 1, message: 'Permission denied by test' }));
        },
      },
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const posts = [];
  await page.route('**/api/**', (route) => {
    if (route.request().method() === 'POST') posts.push(route.request().url());
    return route.fulfill({
      json: route.request().url().includes('/jobs') ? { jobs: [] } : { branches: [] },
    });
  });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      window.__gpsRequests === 1 &&
      document.querySelector('.branch-button')?.textContent?.includes('Chọn chi nhánh'),
  );
  assert.equal(
    await page.evaluate(() => window.__gpsRequests),
    1,
    'GPS must be requested on load, once in StrictMode, before any click',
  );
  assert.equal(
    await page.getByRole('dialog').count(),
    0,
    'No initial application modal may block the header',
  );
  assert.equal(posts.length, 0, 'Automatic location must not create Telegram events');
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.locator('#parts').getByRole('button', { name: 'Xe máy', exact: true }).click();
  assert.equal(await page.locator('.product-card').count(), 2);
  await page.locator('.product-card').first().click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByText('Chưa mở bán', { exact: true }).count(), 1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await page.getByLabel('Nhóm phụ tùng').selectOption('Mâm & lốp');
  assert.equal(await page.locator('.product-card').count(), 0);
  await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
  assert.equal(await page.locator('.product-card').count(), 4);
  await page.getByRole('button', { name: 'Chọn chi nhánh', exact: true }).first().click();
  await page.getByLabel('Tỉnh / thành phố').selectOption('Ninh Bình');
  await page.getByRole('button', { name: 'Xác nhận khu vực', exact: true }).click();
  assert.equal(posts.length, 0);
  assert.match(await page.locator('.branch-button').innerText(), /Ninh Bình/);
  await page.reload();
  assert.match(await page.locator('.branch-button').innerText(), /Ninh Bình/);
  await page.getByRole('button', { name: 'Xem mẫu ứng tuyển' }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Chưa mở tiếp nhận hồ sơ' }).isDisabled(),
    true,
  );
  await page.keyboard.press('Escape');
  await page.locator('.build-card').first().click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('.build-preview').count(), 1);
  await page.keyboard.press('Escape');
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Horizontal overflow at ${width}px`,
    );
    await page.screenshot({ path: `artifacts/viewport-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await page.locator('nav').getByRole('link', { name: 'Dịch vụ', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Mở menu' }).getAttribute('aria-expanded'),
    'false',
  );
  await page.getByRole('button', { name: 'Dữ liệu & quyền riêng tư' }).click();
  await page.getByRole('button', { name: 'Xóa khu vực đã lưu trên thiết bị' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('rg-region')), null);
  assert.equal(posts.length, 0);
  assert.deepEqual(errors, []);
  const failedImages = await page
    .locator('img')
    .evaluateAll((images) =>
      images.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
    );
  assert.deepEqual(failedImages, []);
  console.log(
    'UI checks passed: automatic GPS request, denied-permission fallback, region consent, persistence, catalog filters, detail dialogs, preview form, mobile navigation, privacy reset, 4 responsive widths, no unexpected POSTs or runtime errors.',
  );
  // Exercise configured frontend flows with isolated fixtures and mocked providers.
  const configured = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  await configured.addInitScript(() => {
    window.__gpsRequests = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(resolve) {
          window.__gpsRequests++;
          queueMicrotask(() => resolve({ coords: { latitude: 20.4, longitude: 106.1 } }));
        },
      },
    });
  });
  const flow = await configured.newPage();
  flow.on('pageerror', (e) => errors.push(e.message));
  const branch = {
    id: 'fixture-only',
    name: 'Cơ sở kiểm thử',
    province: 'Ninh Bình',
    aliases: [],
    address: 'Dữ liệu giả lập, không có cơ sở thực',
    lat: 20.4,
    lng: 106.1,
    hotline: '',
    mapUrl: 'https://example.com',
    services: [],
    active: true,
    verified: true,
    recruitmentEnabled: true,
  };
  const job = {
    id: 'fixture-job',
    branchId: branch.id,
    title: 'Kỹ thuật viên kiểm thử',
    salary: 'Mức lương kiểm thử',
    benefits: [],
    vehicle: 'motorcycle',
    active: true,
  };
  const events = [];
  await flow.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: "window.turnstile={render(el,opts){el.textContent='Xác minh kiểm thử';queueMicrotask(()=>opts.callback('fixture-token'));return 'mock';},remove(){}};",
      }),
  );
  let applications = 0;
  await flow.route('**/api/**', (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === 'GET')
      return route.fulfill({
        json: path.endsWith('branches')
          ? { branches: [branch] }
          : path.endsWith('jobs')
            ? { jobs: [job] }
            : { province: 'Ninh Bình', source: 'ip' },
      });
    const payload = req.postDataJSON();
    events.push({ path, payload });
    if (path.endsWith('/apply') && ++applications === 1)
      return route.fulfill({
        status: 502,
        json: {
          error: 'TELEGRAM_ERROR',
          message: 'Telegram chưa nhận được thông tin. Vui lòng thử lại.',
        },
      });
    return route.fulfill({ json: { ok: true, eventId: payload.eventId } });
  });
  await flow.goto(url);
  await flow.waitForFunction(
    () =>
      window.__gpsRequests === 1 &&
      document.querySelector('.branch-button')?.textContent?.includes('Cơ sở kiểm thử'),
  );
  assert.equal(
    events.length,
    0,
    'Granted GPS must update header without automatically sending Telegram',
  );
  assert.equal(await flow.getByRole('dialog').count(), 0);
  await flow.locator('.branch-button').click();
  await flow.getByRole('dialog').waitFor();
  await flow.getByRole('checkbox').check();
  await flow.getByRole('button', { name: 'Xác nhận & chia sẻ khu vực' }).click();
  await flow.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(events.length, 1);
  assert.match(events[0].path, /location-consent$/);
  assert.equal(
    events[0].payload.source,
    'gps',
    'Automatic GPS source must be retained when sharing',
  );
  assert.deepEqual(
    Object.keys(events[0].payload).sort(),
    ['branchId', 'consent', 'eventId', 'province', 'source', 'turnstileToken'].sort(),
  );
  await flow.getByRole('dialog', { name: 'Cơ hội nghề nghiệp' }).waitFor({ timeout: 10000 });
  await flow.getByRole('button', { name: 'Đóng hộp thoại' }).click();
  await flow.waitForTimeout(7000);
  assert.equal(await flow.getByRole('dialog').count(), 0, 'Recruitment popup must stay dismissed');
  await flow.locator('.job-button').click();
  await flow.getByLabel('Họ và tên').fill('Ứng viên kiểm thử');
  await flow.getByLabel('Năm sinh').fill('2000');
  await flow.getByLabel('Số điện thoại').fill('0912345678');
  await flow.getByLabel('Số năm kinh nghiệm').fill('3');
  await flow.getByLabel('Kỹ năng chuyên môn').fill('Kiểm thử tư vấn lắp đặt phụ tùng');
  await flow.getByRole('checkbox').check();
  await flow.getByRole('button', { name: 'Gửi đơn ứng tuyển' }).click();
  await flow.getByRole('alert').waitFor();
  assert.equal(
    await flow.getByText('ĐÃ TIẾP NHẬN HỒ SƠ.', { exact: true }).count(),
    0,
    'Provider error must not show success',
  );
  await flow.getByRole('button', { name: 'Gửi đơn ứng tuyển' }).click();
  await flow.getByText('ĐÃ TIẾP NHẬN HỒ SƠ.', { exact: true }).waitFor();
  assert.equal(events.length, 3);
  assert.equal(
    events[1].payload.eventId,
    events[2].payload.eventId,
    'Retry must preserve event ID',
  );
  assert.equal(events[1].payload.consent, true);
  assert.deepEqual(errors, []);
  await configured.close();
  console.log(
    'Configured flows passed: granted GPS selects branch automatically in header before click, separate consent event, recruitment popup only once, application validation, provider failure, retry with same ID, confirmed success. No external provider calls.',
  );
  await context.close();
} finally {
  await browser.close();
  server?.kill();
}
