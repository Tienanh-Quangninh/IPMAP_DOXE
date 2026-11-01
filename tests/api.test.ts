import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  dispatchEvent,
  normalizeProvince,
  readBody,
  route,
  validateApplication,
  validateLocation,
  readPosition,
} from '../shared/server';
import type { Branch, Env, Job } from '../shared/types';
import { onRequest as getBranches } from '../functions/api/branches';
import { onRequest as suggestion } from '../functions/api/branch-suggestion';
import { branchGoogleMaps, googleMapsSearch, sharedLocationMessage } from '../shared/maps';
import { onRequest as applyRoute } from '../functions/api/apply';
import { onRequest as locationRoute } from '../functions/api/location-consent';
import { linkCodeFromPath } from '../shared/link-code';

test('Google Maps links encode region queries and use public shop coordinates or address', () => {
  const area = new URL(googleMapsSearch('Ninh Bình & Nam Định, Việt Nam'));
  assert.equal(area.origin, 'https://www.google.com');
  assert.equal(area.searchParams.get('api'), '1');
  assert.equal(area.searchParams.get('query'), 'Ninh Bình & Nam Định, Việt Nam');
  const shop = {
    name: 'Garage kiểm thử',
    address: 'Địa chỉ kiểm thử',
    province: 'Ninh Bình',
    lat: 20.4,
    lng: 106.1,
  };
  assert.equal(new URL(branchGoogleMaps(shop)).searchParams.get('query'), '20.4,106.1');
  const fallback = new URL(branchGoogleMaps({ ...shop, lat: 0, lng: 0 }));
  assert.equal(
    fallback.searchParams.get('query'),
    'Garage kiểm thử, Địa chỉ kiểm thử, Ninh Bình, Việt Nam',
  );
});

const branch: Branch = {
  id: 'test',
  name: 'Cơ sở kiểm thử',
  province: 'Ninh Bình',
  aliases: ['Nam Định'],
  address: '',
  lat: 20.4,
  lng: 106.1,
  hotline: '',
  mapUrl: '',
  services: [],
  active: true,
  verified: true,
  recruitmentEnabled: true,
};
const job: Job = {
  id: 'job-test',
  branchId: branch.id,
  title: 'Kỹ thuật viên',
  salary: '',
  benefits: [],
  vehicle: 'motorcycle',
  active: true,
};
const valid = () => ({
  eventId: crypto.randomUUID(),
  branchId: branch.id,
  jobId: job.id,
  name: 'Ứng viên kiểm thử',
  birthYear: 2000,
  phone: '0912345678',
  education: 'THPT',
  experience: 3,
  skills: 'Sửa xe máy',
  vehicle: 'motorcycle',
  submitted: true,
  turnstileToken: 'mock-token',
  website: '',
});
const request = (body?: unknown) =>
  new Request('https://garage.example/api/apply', {
    method: 'POST',
    headers: {
      Origin: 'https://garage.example',
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
    },
    body: JSON.stringify(body ?? valid()),
  });

const env = (): Env => ({
  TELEGRAM_BOT_TOKEN: 'mock-secret',
  TELEGRAM_CHAT_ID: '-1',
  TURNSTILE_SECRET_KEY: crypto.randomUUID(),
});
const event = (eventId = crypto.randomUUID()) => ({
  kind: 'JOB_APPLICATION' as const,
  eventId,
  turnstileToken: 'mock-token',
  payload: { name: 'mock' },
  message: 'TEST ONLY',
});
function mockNetwork(
  t: test.TestContext,
  telegram?: () => Response | Promise<Response>,
  captcha?: Record<string, unknown>,
) {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    calls++;
    if (String(url).includes('siteverify'))
      return Response.json(
        captcha ?? { success: true, hostname: 'garage.example', action: 'apply' },
      );
    return telegram ? telegram() : Response.json({ ok: true });
  });
  return () => calls;
}

test('public endpoints expose no unverified branches and no IP or coordinates', async () => {
  assert.deepEqual(
    await (
      await getBranches({ request: new Request('https://garage.example/api/branches'), env: {} })
    ).json(),
    { branches: [] },
  );
  const req = new Request('https://garage.example/api/branch-suggestion') as Request & {
    cf: { country: string; region: string };
  };
  req.cf = { country: 'VN', region: 'Nam Dinh' };
  assert.deepEqual(await (await suggestion({ request: req, env: {} })).json(), {
    province: 'Ninh Bình',
    source: 'ip',
  });
  req.cf.country = 'US';
  assert.deepEqual(await (await suggestion({ request: req, env: {} })).json(), {
    province: null,
    source: 'ip',
  });
});

test('JSON reader rejects cross-site requests and oversized bodies', async () => {
  const bad = new Request(request(), {
    headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
  });
  await assert.rejects(
    readBody(bad),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
  await assert.rejects(
    readBody(request({ data: 'x'.repeat(17_000) })),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  );
});

test('location validates shared GPS coordinates and explicit sharing action, supports prior province names', () => {
  const location = {
    eventId: crypto.randomUUID(),
    branchId: branch.id,
    province: 'Nam Định',
    source: 'manual',
    consent: true,
    turnstileToken: 'mock',
  };
  assert.equal(validateLocation(location, [branch]).province, 'Ninh Bình');
  assert.equal(normalizeProvince('Ho Chi Minh'), 'Hồ Chí Minh');
  assert.throws(() => validateLocation({ ...location, latitude: 20 }, [branch]), ApiError);
  assert.throws(() => validateLocation({ ...location, consent: false }, [branch]), ApiError);
  assert.throws(() => validateLocation(location, [{ ...branch, verified: false }]), ApiError);
});

test('application validates real openings, age, phone, education, skills and honeypot', () => {
  assert.equal(validateApplication(valid(), [branch], [job]).phone, '0912345678');
  for (const patch of [
    { phone: 'not a phone' },
    { birthYear: 2020 },
    { experience: 99 },
    { education: 'anything' },
    { website: 'spam' },
    { skills: '' },
    { submitted: false },
    { vehicle: 'car' },
  ]) {
    assert.throws(() => validateApplication({ ...valid(), ...patch }, [branch], [job]), ApiError);
  }
  assert.throws(
    () => validateApplication(valid(), [branch], [{ ...job, active: false }]),
    ApiError,
  );
  assert.throws(
    () => validateApplication(valid(), [{ ...branch, recruitmentEnabled: false }], [job]),
    ApiError,
  );
});

test('missing backend configuration fails closed without calling Telegram', async (t) => {
  const calls = mockNetwork(t);
  const handler = route('POST', (context) => dispatchEvent(context, event()));
  const response = await handler({ request: request(), env: {} });
  assert.equal(response.status, 503);
  assert.equal(((await response.json()) as { error: string }).error, 'NOT_CONFIGURED');
  assert.equal(calls(), 0);
});

test('successful submission is idempotent and changed payload cannot reuse an event ID', async (t) => {
  const calls = mockNetwork(t);
  const context = { request: request(), env: env() };
  const input = event();
  assert.equal((await dispatchEvent(context, input)).status, 200);
  assert.equal((await dispatchEvent(context, input)).status, 200);
  assert.equal(calls(), 2, 'one Turnstile request and one Telegram request');
  await assert.rejects(
    dispatchEvent(context, { ...input, payload: { name: 'changed' } }),
    (error: unknown) => error instanceof ApiError && error.code === 'EVENT_CONFLICT',
  );
});

test('concurrent same event is claimed once and generates one Telegram message', async (t) => {
  let sends = 0;
  mockNetwork(t, async () => {
    sends++;
    return Response.json({ ok: true });
  });
  const context = { request: request(), env: env() };
  const input = event();
  const results = await Promise.allSettled([
    dispatchEvent(context, input),
    dispatchEvent(context, input),
  ]);
  assert.equal(sends, 1);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length >= 1, true);
  for (const result of results) {
    if (result.status === 'rejected')
      assert.equal(
        result.reason instanceof ApiError && result.reason.code === 'DELIVERY_UNKNOWN',
        true,
      );
  }
});

test('known Telegram rejection is retryable using the same event ID', async (t) => {
  let attempt = 0;
  mockNetwork(t, () => Response.json({ ok: ++attempt > 1 }, { status: attempt === 1 ? 400 : 200 }));
  const context = { request: request(), env: env() };
  const input = event();
  await assert.rejects(
    dispatchEvent(context, input),
    (error: unknown) => error instanceof ApiError && error.code === 'TELEGRAM_ERROR',
  );
  assert.equal((await dispatchEvent(context, input)).status, 200);
  assert.equal(attempt, 2);
});

test('network timeout preserves an unknown state and never auto-sends again', async (t) => {
  const calls = mockNetwork(t, () => {
    throw new Error('simulated timeout');
  });
  const context = { request: request(), env: env() };
  const input = event();
  await assert.rejects(
    dispatchEvent(context, input),
    (error: unknown) => error instanceof ApiError && error.code === 'DELIVERY_UNKNOWN',
  );
  await assert.rejects(
    dispatchEvent(context, input),
    (error: unknown) => error instanceof ApiError && error.code === 'DELIVERY_UNKNOWN',
  );
  assert.equal(calls(), 2);
});

test('malformed provider JSON is an unknown outcome and cannot trigger a duplicate', async (t) => {
  const calls = mockNetwork(t, () =>
    Response.json({ error: 'upstream proxy response' }, { status: 502 }),
  );
  const context = { request: request(), env: env() };
  const input = event();
  await assert.rejects(
    dispatchEvent(context, input),
    (error: unknown) => error instanceof ApiError && error.code === 'DELIVERY_UNKNOWN',
  );
  await assert.rejects(
    dispatchEvent(context, input),
    (error: unknown) => error instanceof ApiError && error.code === 'DELIVERY_UNKNOWN',
  );
  assert.equal(calls(), 2);
});

test('rate limit stops a fourth application and Turnstile binds action plus hostname', async (t) => {
  let sends = 0;
  mockNetwork(t, () => {
    sends++;
    return Response.json({ ok: true });
  });
  const context = { request: request(), env: env() };
  for (let i = 0; i < 3; i++) await dispatchEvent(context, event());
  await assert.rejects(
    dispatchEvent(context, event()),
    (error: unknown) => error instanceof ApiError && error.status === 429,
  );
  assert.equal(sends, 3);
});

test('Turnstile rejects another hostname before any event is claimed', async (t) => {
  const calls = mockNetwork(t, undefined, {
    success: true,
    hostname: 'other.example',
    action: 'apply',
  });
  const context = { request: request(), env: env() };
  await assert.rejects(
    dispatchEvent(context, event()),
    (error: unknown) => error instanceof ApiError && error.code === 'TURNSTILE_INVALID',
  );
  assert.equal(calls(), 1);
});

test('national application accepts a selected province without a physical branch without database and includes server IP/browser in Telegram', async (t) => {
  let message = '';
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).includes('siteverify'))
      return Response.json({ success: true, hostname: 'garage.example', action: 'apply' });
    message = JSON.parse(String(options?.body)).text;
    return Response.json({ ok: true });
  });
  const body = { ...valid(), branchId: null, jobId: 'customer-support', province: 'Nam Định' };
  const response = await applyRoute({ request: request(body), env: env() });
  assert.equal(response.status, 200);
  assert.match(message, /Hỗ trợ chăm sóc khách hàng/);
  assert.match(message, /Ninh Bình/);
  assert.match(message, /https:\/\/www.google.com\/maps\/search/);
  assert.match(message, /IP: 192\.0\.2\.1/);
  assert.match(message, /Trình duyệt: Chrome \/ Windows/);
  assert.throws(() => validateApplication({ ...body, province: 'Unknown' }), ApiError);
  assert.throws(() => validateApplication({ ...body, branchId: 'invented-branch' }), ApiError);
  assert.throws(() => validateApplication({ ...body, submitted: false }), ApiError);
});

test('location can send coarse region without a branch or database and includes server audit', async (t) => {
  let message = '';
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).includes('siteverify'))
      return Response.json({ success: true, hostname: 'garage.example', action: 'location' });
    message = JSON.parse(String(options?.body)).text;
    return Response.json({ ok: true });
  });
  const body = {
    eventId: crypto.randomUUID(),
    branchId: null,
    province: 'Nam Định',
    source: 'gps',
    position: { latitude: 21.1234567, longitude: 107.7654321, accuracy: 8.5 },
    consent: true,
    turnstileToken: 'mock',
  };
  const response = await locationRoute({ request: request(body), env: env() });
  assert.equal(response.status, 200);
  assert.match(message, /Ninh Bình/);
  assert.match(message, /IP: 192\.0\.2\.1/);
  assert.match(message, /Chrome \/ Windows/);
  assert.match(message, /www.google.com\/maps/);
  assert.throws(() => validateLocation({ ...body, latitude: 20 }), ApiError);
  assert.equal(validateLocation({ ...body, province: null }).province, null);
});

test('shared position validation rejects partial, malformed and out-of-range coordinates', () => {
  const point = { latitude: 21.1234567, longitude: 107.7654321, accuracy: 8.5 };
  assert.deepEqual(readPosition(point), point);
  for (const invalid of [
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 },
    { latitude: '21', longitude: 107 },
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
    { latitude: 0 },
    { latitude: 0, longitude: 0, accuracy: -1 },
    [21, 107],
  ])
    assert.throws(() => readPosition(invalid), ApiError);
  const msg = sharedLocationMessage(point, 'Ninh Bình');
  const link = msg.match(/https:\/\/www.google.com\/maps\/search\/[^\s]+/)?.[0];
  assert.equal(new URL(link!).searchParams.get('query'), '21.1234567,107.7654321');
  assert.match(msg, /Vĩ độ: 21.1234567/);
  assert.match(msg, /Kinh độ: 107.7654321/);
  assert.match(msg, /±8.5 m/);
  assert.doesNotMatch(sharedLocationMessage(null, null), /https:/);
});

test('both Telegram notifications pin visitor GPS independently of the selected province or branch', async (t) => {
  const messages: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).includes('siteverify')) {
      const data = new URLSearchParams(String(options?.body));
      return Response.json({
        success: true,
        hostname: 'garage.example',
        action: data.get('response') === 'location-token' ? 'location' : 'apply',
      });
    }
    messages.push(JSON.parse(String(options?.body)).text);
    return Response.json({ ok: true });
  });
  const position = { latitude: 21.1234567, longitude: 107.7654321, accuracy: 8.5 };
  const environment = env();
  const loc = {
    linkCode: 'tienanh',
    eventId: crypto.randomUUID(),
    branchId: null,
    province: null,
    source: 'gps',
    consent: true,
    position,
    turnstileToken: 'location-token',
  };
  assert.equal((await locationRoute({ request: request(loc), env: environment })).status, 200);
  const body = {
    ...valid(),
    linkCode: 'tienanh',
    branchId: null,
    jobId: 'customer-support',
    province: 'Ninh Bình',
    position,
    locationShared: true,
  };
  assert.equal((await applyRoute({ request: request(body), env: environment })).status, 200);
  for (const message of messages) {
    assert.match(message, /Mã link: tienanh\nPath: \/tienanh\n/);
    const link = message.match(/Google Maps vị trí đã chia sẻ: (https:[^\s]+)/)?.[1];
    assert.equal(new URL(link!).searchParams.get('query'), '21.1234567,107.7654321');
    assert.match(message, /Vĩ độ: 21.1234567/);
    assert.match(message, /Kinh độ: 107.7654321/);
  }
  assert.throws(() => validateApplication({ ...body, locationShared: false }), ApiError);
  assert.throws(() => validateApplication({ ...body, linkCode: 'a\nFake entry' }), ApiError);
  assert.throws(() => validateLocation({ ...loc, linkCode: 'a'.repeat(81) }), ApiError);
  assert.throws(() => validateLocation({ ...loc, position: null }), ApiError);
  assert.throws(
    () => validateLocation({ ...loc, province: 'Ninh Bình', source: 'manual' }),
    ApiError,
  );
});

test('link labels accept one safe path segment and ignore queries and invalid paths', () => {
  assert.equal(linkCodeFromPath('/tienanh'), 'tienanh');
  assert.equal(linkCodeFromPath('/lananh/'), 'lananh');
  assert.equal(linkCodeFromPath('/khach-A_02'), 'khach-A_02');
  assert.equal(linkCodeFromPath('/%74ienanh'), 'tienanh');
  for (const path of [
    '/',
    '/api',
    '/api/apply',
    '/images',
    '/index.html',
    '/a/b',
    '/%0Atienanh',
    '/%ZZ',
    '/' + 'a'.repeat(81),
  ])
    assert.equal(linkCodeFromPath(path), null);
});

test('visit notifications accept no GPS and reject attached coordinates', () => {
  const visit = {
    eventId: crypto.randomUUID(),
    turnstileToken: 'test-token',
    consent: true,
    branchId: null,
    province: null,
    source: 'visit',
    position: null,
  };
  assert.equal(validateLocation(visit).source, 'visit');
  assert.equal(validateLocation(visit).position, null);
  assert.throws(
    () => validateLocation({ ...visit, position: { latitude: 21, longitude: 107 } }),
    ApiError,
  );
});
