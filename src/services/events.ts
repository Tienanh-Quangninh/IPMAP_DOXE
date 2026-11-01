// Persist only a random ID and a digest; applicant details never enter web storage.
import { api, ApiError } from './api';
type Receipt = { hash: string; id: string; status?: 'sent' | 'unknown' };
// A new document load starts a new visit; remounts and retries keep the same receipt.
const pageVisitId = crypto.randomUUID();
const deliveries = new Map<string, Promise<{ ok: boolean; eventId: string }>>();
const memory = new Map<string, Receipt>();
export async function eventIdFor(kind: 'apply' | 'location', payload: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      JSON.stringify(kind === 'location' ? { pageVisitId, payload } : payload),
    ),
  );
  const hash = Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('');
  const key = `rg-event-${kind}`;
  let stored = memory.get(key);
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) stored = JSON.parse(raw);
  } catch {}
  if (stored?.hash === hash) return stored.id;
  const next = { hash, id: crypto.randomUUID() };
  memory.set(key, next);
  try {
    sessionStorage.setItem(key, JSON.stringify(next));
  } catch {}
  return next.id;
}

export async function sendEvent(
  kind: 'apply' | 'location',
  payload: unknown,
  turnstileToken: string,
) {
  const eventId = await eventIdFor(kind, payload);
  if (deliveries.has(eventId)) return deliveries.get(eventId)!;
  const key = `rg-event-${kind}`;
  let receipt = memory.get(key);
  try {
    receipt = JSON.parse(sessionStorage.getItem(key) || 'null') || receipt;
  } catch {}
  if (receipt?.id === eventId && receipt.status === 'sent') return { ok: true, eventId };
  if (receipt?.id === eventId && receipt.status === 'unknown')
    throw new ApiError(
      `Chưa xác định kết quả. Vui lòng đối soát mã ${eventId} trước khi gửi lại.`,
      'DELIVERY_UNKNOWN',
    );
  function mark(status: 'sent' | 'unknown') {
    if (!receipt || receipt.id !== eventId) return;
    const next = { ...receipt, status };
    memory.set(key, next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }
  try {
    const pending = api<{ ok: boolean; eventId: string }>(
      kind === 'apply' ? 'apply' : 'location-consent',
      { ...(payload as Record<string, unknown>), eventId, turnstileToken },
    );
    deliveries.set(eventId, pending);
    const result = await pending;
    mark('sent');
    return result;
  } catch (error) {
    if (error instanceof ApiError && ['DELIVERY_UNKNOWN', 'NETWORK_ERROR'].includes(error.code))
      mark('unknown');
    throw error;
  } finally {
    deliveries.delete(eventId);
  }
}
