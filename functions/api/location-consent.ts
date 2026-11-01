import {
  clientAudit,
  dispatchEvent,
  readBody,
  route,
  serverTime,
  validateLocation,
} from '../../shared/server';
import { branchGoogleMaps, googleMapsSearch } from '../../shared/maps';
export const onRequest = route('POST', async (context) => {
  const input = validateLocation(await readBody(context.request));
  const { turnstileToken, eventId, branch, province, source } = input;
  return dispatchEvent(context, {
    kind: 'LOCATION_CONSENT',
    eventId,
    turnstileToken,
    payload: { branchId: branch?.id || null, province, source, consent: true },
    message: `📍 KHÁCH HÀNG ĐÃ CHỌN CHI NHÁNH\nSự kiện: LOCATION_CONSENT\nMã: ${eventId}\nThời gian: ${serverTime()}\n${clientAudit(context.request)}\nKhu vực: ${province || 'Chưa xác định tỉnh/thành'}\nChi nhánh: ${branch?.name || 'Chưa gắn cơ sở'}\nNguồn: ${source === 'gps' ? 'GPS đã cấp quyền (chỉ chia sẻ khu vực)' : 'Chọn thủ công'}\nTrạng thái: Đã đồng ý chia sẻ khu vực\nBản đồ khu vực: ${googleMapsSearch(province ? province + ', Việt Nam' : 'Việt Nam')}${branch ? '\nGoogle Maps chi nhánh: ' + branchGoogleMaps(branch) : ''}`,
  });
});
