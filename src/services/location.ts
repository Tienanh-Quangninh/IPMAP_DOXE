type Coordinates = { latitude: number; longitude: number };
let pending: Promise<Coordinates> | null = null;

// Share the in-flight request across React StrictMode's repeated effect setup.
// Coordinates stay in memory and are never stored or sent to the server.
export function requestBrowserLocation(): Promise<Coordinates> {
  if (pending) return pending;
  pending = new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }).finally(() => {
    pending = null;
  });
  return pending;
}
