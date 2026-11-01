import { json, normalizeProvince, route } from '../../shared/server';
export const onRequest = route('GET', ({ request }) => {
  // Approximate suggestion only: do not persist, notify, or expose coordinates/IP.
  const province =
    request.cf?.country === 'VN' && request.cf.region ? normalizeProvince(request.cf.region) : null;
  return json({ province, source: 'ip' });
});
