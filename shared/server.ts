import type { Branch, Env, FunctionContext, Job, Province, SharedPosition } from './types';
import branchesData from '../src/data/branches.json';
import jobsData from '../src/data/jobs.json';
import provincesData from '../src/data/provinces.json';
import { isLinkCode } from './link-code';

export const branches = (branchesData as Branch[]).filter((b) => b.active && b.verified);
export const jobs = jobsData as Job[];
export const provinces = provincesData as Province[];
const MAX_BODY = 16_384;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Body = Record<string, unknown>;
type Kind = 'LOCATION_CONSENT' | 'JOB_APPLICATION';
type EventRow = {
  status: 'pending' | 'sent' | 'failed' | 'unknown';
  requester_hash: string;
  payload_hash: string;
  expiresAt: number;
};
// Best-effort guards for this Worker isolate only; no database/binding required.
const eventCache = new Map<string, EventRow>();
const rateCache = new Map<string, { count: number; expiresAt: number }>();
const MAX_ENTRIES = 2000;
function prune(now: number) {
  for (const [key, value] of eventCache) if (value.expiresAt <= now) eventCache.delete(key);
  for (const [key, value] of rateCache) if (value.expiresAt <= now) rateCache.delete(key);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export function route(
  method: 'GET' | 'POST',
  fn: (context: FunctionContext) => Promise<Response> | Response,
) {
  return async (context: FunctionContext): Promise<Response> => {
    if (context.request.method !== method)
      return new Response(null, { status: 405, headers: { Allow: method } });
    try {
      return await fn(context);
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.code, message: error.message }, error.status);
      // Do not log request bodies, token-bearing URLs or raw provider errors.
      return json(
        {
          error: 'SERVICE_UNAVAILABLE',
          message: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
        },
        503,
      );
    }
  };
}

export async function readBody(request: Request): Promise<Body> {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Yêu cầu phải được gửi từ website này.');
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site')
    throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Nguồn yêu cầu không hợp lệ.');
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'CONTENT_TYPE', 'Chỉ hỗ trợ dữ liệu JSON.');
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY)
    throw new ApiError(413, 'BODY_TOO_LARGE', 'Dữ liệu gửi quá lớn.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_BODY', 'Thiếu dữ liệu.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new ApiError(413, 'BODY_TOO_LARGE', 'Dữ liệu gửi quá lớn.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data as Body;
  } catch {
    throw new ApiError(400, 'INVALID_BODY', 'Dữ liệu JSON không hợp lệ.');
  }
}

function text(body: Body, key: string, min: number, max: number): string {
  const value = body[key];
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000B-\u001F\u007F]/.test(value)
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Trường ${key} không hợp lệ.`);
  }
  return value.trim();
}

function common(body: Body, action: 'location' | 'application' = 'location') {
  const eventId = text(body, 'eventId', 36, 36);
  if (!UUID.test(eventId)) throw new ApiError(400, 'VALIDATION_ERROR', 'Mã sự kiện không hợp lệ.');
  const linkCode = body.linkCode == null ? null : body.linkCode;
  if (linkCode !== null && !isLinkCode(linkCode))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Mã link không hợp lệ.');
  if (body[action === 'location' ? 'consent' : 'submitted'] !== true)
    throw new ApiError(
      400,
      action === 'location' ? 'CONSENT_REQUIRED' : 'SUBMISSION_REQUIRED',
      'Vui lòng xác nhận thao tác gửi thông tin.',
    );
  return {
    eventId,
    linkCode,
    turnstileToken: text(body, 'turnstileToken', 1, 2048),
  };
}

export function normalizeProvince(value: string): string | null {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/^(tinh|thanh pho|tp\.?)[\s]+/, '')
      .trim();
  const input = clean(value);
  return (
    provinces.find((p) => [p.name, ...p.aliases].some((name) => clean(name) === input))?.name ??
    null
  );
}

export function readPosition(value: unknown): SharedPosition | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Tọa độ GPS không hợp lệ.');
  const p = value as Record<string, unknown>;
  if (
    Object.keys(p).some((k) => !['latitude', 'longitude', 'accuracy'].includes(k)) ||
    typeof p.latitude !== 'number' ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    typeof p.longitude !== 'number' ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180 ||
    (p.accuracy !== undefined &&
      (typeof p.accuracy !== 'number' ||
        !Number.isFinite(p.accuracy) ||
        p.accuracy < 0 ||
        p.accuracy > 40075000))
  )
    throw new ApiError(400, 'VALIDATION_ERROR', 'Tọa độ GPS không hợp lệ.');
  return {
    latitude: p.latitude,
    longitude: p.longitude,
    ...(p.accuracy === undefined ? {} : { accuracy: p.accuracy as number }),
  };
}

export function validateLocation(body: Body, available: Branch[] = branches) {
  const allowed = new Set([
    'linkCode',
    'eventId',
    'branchId',
    'province',
    'source',
    'position',
    'consent',
    'turnstileToken',
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key)))
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Thông báo vị trí có trường dữ liệu không được hỗ trợ.',
    );
  const base = common(body);
  const branchId =
    body.branchId == null || body.branchId === '' ? null : text(body, 'branchId', 1, 80);
  const branch = branchId
    ? available.find((b) => b.id === branchId && b.active && b.verified)
    : null;
  if (branchId && !branch)
    throw new ApiError(
      400,
      'BRANCH_UNAVAILABLE',
      'Chi nhánh chưa được xác minh hoặc chưa hoạt động.',
    );
  const province =
    body.province == null || body.province === ''
      ? null
      : normalizeProvince(text(body, 'province', 1, 80));
  if (
    (body.province && !province) ||
    (branch && province !== normalizeProvince(branch.province)) ||
    (body.source === 'manual' && !province)
  )
    throw new ApiError(400, 'VALIDATION_ERROR', 'Khu vực không hợp lệ hoặc không khớp chi nhánh.');
  if (body.source !== 'gps' && body.source !== 'manual' && body.source !== 'visit')
    throw new ApiError(400, 'VALIDATION_ERROR', 'Nguồn lựa chọn không hợp lệ.');
  const position = readPosition(body.position);
  if (body.source === 'gps' && !position)
    throw new ApiError(
      400,
      'GPS_REQUIRED',
      'Chưa nhận được tọa độ GPS đã chia sẻ. Vui lòng tải lại trang và cấp quyền vị trí.',
    );
  if (body.source !== 'gps' && position)
    throw new ApiError(400, 'VALIDATION_ERROR', 'Chọn thủ công không phải chia sẻ GPS.');
  return { ...base, branchId: branch?.id || null, branch, province, source: body.source, position };
}

export function validateApplication(
  body: Body,
  available: Branch[] = branches,
  openings: Job[] = jobs,
) {
  const allowed = new Set([
    'linkCode',
    'eventId',
    'branchId',
    'jobId',
    'name',
    'birthYear',
    'phone',
    'education',
    'experience',
    'skills',
    'vehicle',
    'submitted',
    'province',
    'position',
    'locationShared',
    'turnstileToken',
    'website',
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key)))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Biểu mẫu có trường dữ liệu không được hỗ trợ.');
  if (body.website !== undefined && body.website !== '')
    throw new ApiError(400, 'VALIDATION_ERROR', 'Không thể tiếp nhận biểu mẫu này.');
  const base = common(body, 'application');
  const position = readPosition(body.position);
  if ((position && body.locationShared !== true) || (body.locationShared === true && !position))
    throw new ApiError(
      400,
      'LOCATION_PERMISSION_REQUIRED',
      'Chỉ gửi tọa độ đã được khách cho phép chia sẻ.',
    );
  const jobId = text(body, 'jobId', 1, 80);
  const job = openings.find((j) => j.id === jobId && j.active);
  if (!job) throw new ApiError(400, 'JOB_UNAVAILABLE', 'Vị trí này hiện không tiếp nhận hồ sơ.');
  const national = job.scope === 'national';
  const branchId =
    body.branchId == null || body.branchId === '' ? null : text(body, 'branchId', 1, 80);
  const branch = branchId
    ? available.find(
        (b) => b.id === branchId && b.active && b.verified && (national || b.recruitmentEnabled),
      )
    : null;
  if ((branchId && !branch) || (!national && (!branch || job.branchId !== branch.id))) {
    throw new ApiError(
      400,
      'JOB_UNAVAILABLE',
      'Chi nhánh hoặc vị trí này hiện không tiếp nhận hồ sơ.',
    );
  }
  const province =
    body.province === undefined && branch
      ? branch.province
      : normalizeProvince(text(body, 'province', 1, 80));
  if (!province || (branch && province !== normalizeProvince(branch.province)))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Vui lòng chọn tỉnh/thành phù hợp với chi nhánh.');
  const name = text(body, 'name', 2, 100);
  const phone = text(body, 'phone', 10, 15).replace(/[ .-]/g, '');
  if (!/^(?:0|\+?84)[35789]\d{8}$/.test(phone))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Số điện thoại Việt Nam không hợp lệ.');
  const birthYear = body.birthYear;
  const year = new Date().getUTCFullYear();
  if (
    typeof birthYear !== 'number' ||
    !Number.isInteger(birthYear) ||
    birthYear < year - 100 ||
    birthYear > year - 16
  )
    throw new ApiError(400, 'VALIDATION_ERROR', 'Năm sinh phải tương ứng độ tuổi từ 16 đến 100.');
  const experience = body.experience;
  if (
    typeof experience !== 'number' ||
    !Number.isFinite(experience) ||
    experience < 0 ||
    experience > Math.min(60, year - birthYear - 14)
  )
    throw new ApiError(400, 'VALIDATION_ERROR', 'Số năm kinh nghiệm không hợp lệ.');
  const education = text(body, 'education', 1, 20);
  if (!['none', 'THCS', 'THPT', 'college', 'university'].includes(education))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Trình độ học vấn không hợp lệ.');
  if (
    !['motorcycle', 'car'].includes(String(body.vehicle)) ||
    (job.vehicle !== 'any' && body.vehicle !== job.vehicle)
  )
    throw new ApiError(400, 'VALIDATION_ERROR', 'Nhóm xe không khớp vị trí ứng tuyển.');
  return {
    ...base,
    branch,
    position,
    branchId: branch?.id || null,
    province,
    job,
    name,
    phone,
    birthYear,
    experience,
    education,
    skills: text(body, 'skills', 5, 1200),
    vehicle: body.vehicle,
  };
}

function configured(env: Env): asserts env is Env & {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TURNSTILE_SECRET_KEY: string;
} {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.TURNSTILE_SECRET_KEY)
    throw new ApiError(
      503,
      'NOT_CONFIGURED',
      'Biểu mẫu chưa được mở tiếp nhận. Vui lòng quay lại sau.',
    );
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(request: Request, secret: string, token: string, action: string) {
  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
  });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);
  let response: Response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(
      503,
      'VERIFICATION_UNAVAILABLE',
      'Chưa xác thực được chống spam. Vui lòng thử lại.',
    );
  }
  if (!response.ok)
    throw new ApiError(
      503,
      'VERIFICATION_UNAVAILABLE',
      'Dịch vụ chống spam tạm thời chưa sẵn sàng.',
    );
  const result = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  if (
    !result.success ||
    result.hostname !== new URL(request.url).hostname ||
    result.action !== action
  )
    throw new ApiError(
      400,
      'TURNSTILE_INVALID',
      'Xác thực chống spam hết hạn hoặc không hợp lệ. Vui lòng xác thực lại.',
    );
}

function previous(
  row: EventRow,
  requester: string,
  payload: string,
  eventId: string,
): Response | null {
  if (row.requester_hash !== requester || row.payload_hash !== payload)
    throw new ApiError(409, 'EVENT_CONFLICT', 'Mã sự kiện đã dùng cho dữ liệu khác.');
  if (row.status === 'sent') return json({ ok: true, eventId });
  if (row.status === 'pending' || row.status === 'unknown')
    throw new ApiError(
      409,
      'DELIVERY_UNKNOWN',
      'Thông báo đang xử lý hoặc chưa xác định kết quả. Vui lòng không gửi lại để tránh trùng; liên hệ bộ phận tiếp nhận với mã sự kiện.',
    );
  return null;
}

export async function dispatchEvent(
  context: FunctionContext,
  input: {
    kind: Kind;
    eventId: string;
    turnstileToken: string;
    payload: unknown;
    message: string;
  },
): Promise<Response> {
  const { request, env } = context;
  configured(env);
  const actor = await digest(
    `${env.TURNSTILE_SECRET_KEY}:${env.TELEGRAM_CHAT_ID}:${request.headers.get('CF-Connecting-IP') || 'local'}:${input.kind}`,
  );
  const payload = await digest(JSON.stringify(input.payload));
  const cacheKey = `${env.TELEGRAM_CHAT_ID}:${input.kind}:${input.eventId}`;
  const now = Date.now();
  prune(now);
  const old = eventCache.get(cacheKey);
  if (old) {
    const reply = previous(old, actor, payload, input.eventId);
    if (reply) return reply;
  }
  const rateKey = `${actor}:${Math.floor(now / 600000)}`;
  const rate = rateCache.get(rateKey) || { count: 0, expiresAt: now + 600000 };
  if (rate.count >= (input.kind === 'JOB_APPLICATION' ? 3 : 5))
    throw new ApiError(429, 'RATE_LIMITED', 'Bạn gửi quá nhiều lần. Vui lòng thử lại sau 10 phút.');
  if (
    (!old && eventCache.size >= MAX_ENTRIES) ||
    (!rateCache.has(rateKey) && rateCache.size >= MAX_ENTRIES)
  )
    throw new ApiError(503, 'SERVICE_BUSY', 'Kênh tiếp nhận đang bận, vui lòng thử lại sau.');
  rate.count++;
  rateCache.set(rateKey, rate);
  // Claim before awaiting verification to avoid concurrent sends in this isolate.
  const row: EventRow = {
    status: 'pending',
    requester_hash: actor,
    payload_hash: payload,
    expiresAt: now + 1800000,
  };
  eventCache.set(cacheKey, row);
  try {
    await verifyTurnstile(
      request,
      env.TURNSTILE_SECRET_KEY,
      input.turnstileToken,
      input.kind === 'LOCATION_CONSENT' ? 'location' : 'apply',
    );
  } catch (error) {
    row.status = 'failed';
    throw error;
  }
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: input.message,
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    row.status = 'unknown';
    throw new ApiError(
      502,
      'DELIVERY_UNKNOWN',
      'Chưa xác định Telegram đã nhận hay chưa. Không gửi lại; hãy lưu mã sự kiện để đối soát.',
    );
  }
  let telegram: { ok?: boolean } | null;
  try {
    telegram = (await response.json()) as { ok?: boolean } | null;
  } catch {
    row.status = 'unknown';
    throw new ApiError(
      502,
      'DELIVERY_UNKNOWN',
      'Chưa xác định kết quả tiếp nhận. Vui lòng lưu mã sự kiện để đối soát.',
    );
  }
  if (!telegram || typeof telegram.ok !== 'boolean' || (telegram.ok === true && !response.ok)) {
    row.status = 'unknown';
    throw new ApiError(
      502,
      'DELIVERY_UNKNOWN',
      'Phản hồi Telegram chưa xác định được kết quả. Vui lòng lưu mã sự kiện để đối soát.',
    );
  }
  const sent = response.ok && telegram.ok === true;
  row.status = sent ? 'sent' : 'failed';
  if (!sent)
    throw new ApiError(
      502,
      'TELEGRAM_ERROR',
      'Telegram chưa nhận được thông tin. Vui lòng xác thực lại và thử lại.',
    );
  return json({ ok: true, eventId: input.eventId });
}

export function serverTime(): string {
  return (
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date()) + ' GMT+7'
  );
}

export function clientAudit(request: Request): string {
  const ua = request.headers.get('User-Agent') || '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Khác';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Khác';
  const device = /Mobile|Android|iPhone|iPad/.test(ua) ? 'Di động' : 'Máy tính';
  return `IP: ${request.headers.get('CF-Connecting-IP') || 'Không có'}\nTrình duyệt: ${browser} / ${os} / ${device}`;
}
