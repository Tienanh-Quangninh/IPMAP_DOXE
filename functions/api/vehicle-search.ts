import {
  clientAudit,
  dispatchEvent,
  readBody,
  route,
  serverTime,
  validateVehicleSearch,
} from '../../shared/server';
import { linkAttributionMessage } from '../../shared/link-code';
import { sharedLocationMessage } from '../../shared/maps';
import { findDemoVehicles } from '../../shared/vehicle-search';

export const onRequest = route('POST', async (context) => {
  const { eventId, turnstileToken, linkCode, filters, position } = validateVehicleSearch(
    await readBody(context.request),
  );
  const count = findDemoVehicles(filters).length;
  const labels = { all: 'Xe máy & ô tô', motorcycle: 'Xe máy / xe điện', car: 'Ô tô' };
  return dispatchEvent(context, {
    kind: 'VEHICLE_SEARCH',
    eventId,
    turnstileToken,
    payload: { linkCode, filters, position, demo: true },
    message: `${linkAttributionMessage(linkCode)}🔎 NHU CẦU TÌM MUA XE\nMã: ${eventId}\nThời gian: ${serverTime()}\nLoại xe: ${labels[filters.kind]}\nHãng: ${filters.brand === 'all' ? 'Tất cả hãng' : filters.brand}\nNgân sách: ${filters.minPrice}–${filters.maxPrice} triệu đồng\nBán kính: ${filters.radiusKm} km\nKhu vực đã chọn: ${filters.province || 'Quanh GPS đã chia sẻ'}\nNguồn vị trí: ${position ? 'GPS đã được cấp quyền' : 'Tỉnh/thành khách chọn (không GPS)'}\n${sharedLocationMessage(position, filters.province || null)}\nKết quả DEMO: ${count}/50 tin minh họa, chưa có người bán xác minh. Khoảng cách và giá mô phỏng.\n${clientAudit(context.request)}`,
  });
});
