import type { Branch, SharedPosition } from './types';

export function googleMapsSearch(query: string): string {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', query);
  return url.href;
}

export function sharedLocationMessage(
  position: SharedPosition | null,
  province: string | null,
): string {
  if (position) {
    return `Vĩ độ: ${position.latitude}\nKinh độ: ${position.longitude}${position.accuracy === undefined ? '' : '\nĐộ chính xác GPS: ±' + position.accuracy + ' m'}\nGoogle Maps vị trí đã chia sẻ: ${googleMapsSearch(`${position.latitude},${position.longitude}`)}`;
  }
  return `Vị trí GPS: Không được chia sẻ${province ? '\nBản đồ khu vực đã chọn (không phải GPS): ' + googleMapsSearch(province + ', Việt Nam') : ''}`;
}

// Only public shop coordinates from configuration; never visitor GPS coordinates.
export function branchGoogleMaps(
  branch: Pick<Branch, 'name' | 'address' | 'province' | 'lat' | 'lng'>,
): string {
  const coordinatesValid =
    Number.isFinite(branch.lat) &&
    Number.isFinite(branch.lng) &&
    Math.abs(branch.lat) <= 90 &&
    Math.abs(branch.lng) <= 180 &&
    (branch.lat !== 0 || branch.lng !== 0);
  return googleMapsSearch(
    coordinatesValid
      ? `${branch.lat},${branch.lng}`
      : [branch.name, branch.address, branch.province, 'Việt Nam'].filter(Boolean).join(', '),
  );
}
