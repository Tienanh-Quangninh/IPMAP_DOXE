import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoVehicles,
  defaultVehicleFilters,
  findDemoVehicles,
  brandsFor,
} from '../shared/vehicle-search';
import { validateVehicleSearch, ApiError } from '../shared/server';
import { onRequest } from '../functions/api/vehicle-search';
import { readFile } from 'node:fs/promises';
import photoData from '../src/data/vehicle-photos.json';

const input = () => ({
  ...defaultVehicleFilters,
  province: 'Ninh Bình',
  position: null,
  locationShared: false,
  submitted: true,
  eventId: crypto.randomUUID(),
  turnstileToken: 'search-token',
  linkCode: 'tienanh',
});

test('reference photos ship as local JPEGs with source and license credits', async () => {
  assert.ok(Object.keys(photoData).length >= 10);
  for (const photo of Object.values(photoData)) {
    assert.equal(new URL(photo.source).hostname, 'commons.wikimedia.org');
    assert.ok(photo.author.length > 0);
    assert.match(photo.license, /CC BY|Public domain|CC0/);
    const bytes = await readFile('public' + photo.image);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
  }
});
test('50 fictional offers filter by kind, brand, exact budget and radius; results sorted by simulated distance', () => {
  assert.equal(demoVehicles.length, 50);
  assert.equal(new Set(demoVehicles.map((v) => v.id)).size, 50);
  assert.equal(findDemoVehicles(defaultVehicleFilters).length, 50);
  for (const offer of demoVehicles) {
    assert.ok(brandsFor(offer.kind).includes(offer.brand));
    assert.ok(offer.price >= 1 && offer.price <= 200);
    assert.equal(offer.demo, true);
  }
  const results = findDemoVehicles({
    ...defaultVehicleFilters,
    kind: 'motorcycle',
    brand: 'Honda',
    minPrice: 15,
    maxPrice: 30,
    radiusKm: 10,
  });
  assert.ok(results.length > 0);
  for (const offer of results) {
    assert.equal(offer.brand, 'Honda');
    assert.equal(offer.kind, 'motorcycle');
    assert.ok(offer.price >= 15 && offer.price <= 30);
    assert.ok(offer.distanceKm <= 10);
  }
  assert.deepEqual(
    results.map((v) => v.distanceKm),
    results.map((v) => v.distanceKm).sort((a, b) => a - b),
  );
  assert.equal(
    findDemoVehicles({ ...defaultVehicleFilters, kind: 'car', minPrice: 1, maxPrice: 3 }).length,
    0,
  );
  assert.equal(
    findDemoVehicles({ ...defaultVehicleFilters, minPrice: 200, maxPrice: 200 }).length,
    1,
  );
});

test('search validates all filters, requires an area and cannot attach GPS without permission', () => {
  assert.equal(validateVehicleSearch(input()).filters.province, 'Ninh Bình');
  const position = { latitude: 21.12, longitude: 107.76, accuracy: 8 };
  assert.deepEqual(
    validateVehicleSearch({ ...input(), province: null, position, locationShared: true }).position,
    position,
  );
  for (const patch of [
    { minPrice: 0 },
    { maxPrice: 201 },
    { minPrice: 2.5 },
    { minPrice: 50, maxPrice: 20 },
    { radiusKm: 900 },
    { kind: 'boat' },
    { brand: 'made-up' },
    { kind: 'car', brand: 'Vespa' },
    { province: 'made-up' },
    { province: null },
    { position },
    { locationShared: true },
    { position: { latitude: 91, longitude: 0 }, locationShared: true },
    { resultCount: 999 },
    { submitted: false },
    { linkCode: 'a\nb' },
  ])
    assert.throws(() => validateVehicleSearch({ ...input(), ...patch }), ApiError);
});

test('search endpoint sends chosen filters, true GPS, link attribution and server audit once; ignores no client result counts', async (t) => {
  const messages: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).includes('siteverify')) {
      assert.equal(new URLSearchParams(String(options?.body)).get('response'), 'search-token');
      return Response.json({ success: true, hostname: 'garage.example', action: 'search' });
    }
    messages.push(JSON.parse(String(options?.body)).text);
    return Response.json({ ok: true });
  });
  const env = {
    TELEGRAM_BOT_TOKEN: 'mock',
    TELEGRAM_CHAT_ID: '-100',
    TURNSTILE_SECRET_KEY: crypto.randomUUID(),
  };
  const payload = {
    ...input(),
    kind: 'car',
    brand: 'Toyota',
    minPrice: 100,
    maxPrice: 200,
    position: { latitude: 21.12, longitude: 107.76 },
    locationShared: true,
  };
  const request = () =>
    new Request('https://garage.example/api/vehicle-search', {
      method: 'POST',
      headers: {
        Origin: 'https://garage.example',
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.0.2.10',
        'User-Agent': 'Mozilla/5.0 Windows NT 10.0 Chrome/130.0',
      },
      body: JSON.stringify(payload),
    });
  assert.equal((await onRequest({ request: request(), env })).status, 200);
  assert.equal((await onRequest({ request: request(), env })).status, 200);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Toyota/);
  assert.match(messages[0], /100–200 triệu/);
  assert.match(messages[0], /Path: \/tienanh/);
  assert.match(messages[0], /Kết quả DEMO: 2\/50/);
  assert.match(messages[0], /query=21.12%2C107.76/);
  assert.match(messages[0], /192\.0\.2\.10/);
});

test('search rejects a token for a different action without contacting Telegram', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ success: true, hostname: 'garage.example', action: 'apply' });
  });
  const request = new Request('https://garage.example/api/vehicle-search', {
    method: 'POST',
    headers: { Origin: 'https://garage.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(input()),
  });
  const response = await onRequest({
    request,
    env: {
      TELEGRAM_BOT_TOKEN: 'mock',
      TELEGRAM_CHAT_ID: '-100',
      TURNSTILE_SECRET_KEY: crypto.randomUUID(),
    },
  });
  assert.equal(response.status, 400);
  assert.equal(calls, 1);
});
