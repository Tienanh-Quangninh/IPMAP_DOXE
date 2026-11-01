export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      'Kết nối bị gián đoạn. Vui lòng kiểm tra mạng và thử lại với cùng nội dung.',
      'NETWORK_ERROR',
    );
  }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json'))
    throw new Error('API chưa được kết nối. Vui lòng thử lại khi website được triển khai đầy đủ.');
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.',
      data.error || 'UNKNOWN',
    );
  return data as T;
}
export function nearestBranch(lat: number, lng: number, branches: import('../types').Branch[]) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const distance = (b: import('../types').Branch) =>
    Math.sin(rad(b.lat - lat) / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - lng) / 2) ** 2;
  return [...branches].sort((a, b) => distance(a) - distance(b))[0];
}
