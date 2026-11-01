import type { SharedPosition as Coordinates } from '../../shared/types';
export type { SharedPosition } from '../../shared/types';
let pending: Promise<Coordinates> | null = null;

// Share the in-flight request across React StrictMode's repeated effect setup.
// Coordinates stay in memory; share only after the browser grants GPS permission.
export function requestBrowserLocation(): Promise<Coordinates> {
  if (pending) return pending;
  pending = new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          ...(Number.isFinite(coords.accuracy) ? { accuracy: coords.accuracy } : {}),
        }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }).finally(() => {
    pending = null;
  });
  return pending;
}
