import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  ApiError,
  dispatchEvent,
  normalizeProvince,
  readBody,
  route,
  validateApplication,
  validateLocation,
} from '../shared/server';
import type { Branch, D1Result, D1Statement, Env, EventDatabase, Job } from '../shared/types';
import { onRequest as getBranches } from '../functions/api/branches';
import { onRequest as suggestion } from '../functions/api/branch-suggestion';

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
  consent: true,
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
    },
    body: JSON.stringify(body ?? valid()),
  });

class SqliteStatement implements D1Statement {
  private values: unknown[] = [];
  constructor(
    private database: DatabaseSync,
    private sql: string,
  ) {}
  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }
  async first<T>() {
    return (this.database.prepare(this.sql).get(...(this.values as never[])) ?? null) as T | null;
  }
  execute(): D1Result {
    const result = this.database.prepare(this.sql).run(...(this.values as never[]));
    return { success: true, results: [], meta: { changes: Number(result.changes) } };
  }
  async run(): Promise<D1Result> {
    return this.execute();
  }
}
class SqliteDB implements EventDatabase {
  database = new DatabaseSync(':memory:');
  constructor() {
    this.database.exec(readFileSync(new URL('../shared/schema.sql', import.meta.url), 'utf8'));
  }
  prepare(sql: string) {
    return new SqliteStatement(this.database, sql);
  }
  async batch(statements: D1Statement[]) {
    this.database.exec('BEGIN');
    try {
      const results = statements.map((statement) => (statement as SqliteStatement).execute());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
const env = (): Env => ({
  TELEGRAM_BOT_TOKEN: 'mock-secret',
  TELEGRAM_CHAT_ID: '-1',
  TURNSTILE_SECRET_KEY: 'mock-turnstile',
  EVENT_STORE: new SqliteDB(),
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

test('location requires explicit consent, rejects exact coordinates, supports prior province names', () => {
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
    { consent: false },
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
