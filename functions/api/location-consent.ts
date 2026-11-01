import { linkAttributionMessage } from '../../shared/link-code';
import {
  clientAudit,
  dispatchEvent,
  readBody,
  route,
  serverTime,
  validateLocation,
} from '../../shared/server';
import { branchGoogleMaps, sharedLocationMessage } from '../../shared/maps';
export const onRequest = route('POST', async (context) => {
  const input = validateLocation(await readBody(context.request));
  const { turnstileToken, eventId, branch, province, source, position } = input;
  return dispatchEvent(context, {
    kind: 'LOCATION_CONSENT',
    eventId,
    turnstileToken,
    payload: {
      linkCode: input.linkCode,
      branchId: branch?.id || null,
      province,
      source,
      position,
      consent: true,
    },
    message:
      linkAttributionMessage(input.linkCode) +
      `📍 ${source === 'gps' ? 'KHÁCH HÀNG ĐÃ CHIA SẺ VỊ TRÍ' : source === 'visit' ? 'KHÁCH TRUY CẬP WEBSITE' : 'KHÁCH HÀNG ĐÃ CHỌN KHU VỰC'}\nSự kiện: LOCATION_CONSENT\nMã: ${eventId}\nThời gian: ${serverTime()}\n${clientAudit(context.request)}\nKhu vực/chi nhánh đã chọn: ${province || 'Chưa xác định tỉnh/thành'}\nChi nhánh: ${branch?.name || 'Chưa gắn cơ sở'}\nNguồn: ${source === 'gps' ? 'GPS đã cấp quyền' : source === 'visit' ? 'Mở hoặc tải lại trang' : 'Chọn thủ công'}\nTrạng thái: ${source === 'gps' ? 'Đã chia sẻ vị trí GPS' : source === 'visit' ? 'Không chia sẻ GPS' : 'Đã chọn khu vực thủ công'}\n${sharedLocationMessage(position, province)}${branch ? '\nGoogle Maps chi nhánh: ' + branchGoogleMaps(branch) : ''}`,
  });
});
