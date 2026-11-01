// Persist only a random ID and a digest; applicant details never enter web storage.
const memory = new Map<string, { hash: string; id: string }>();
export async function eventIdFor(kind: 'apply' | 'location', payload: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(payload)),
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
