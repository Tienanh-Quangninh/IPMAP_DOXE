import { dispatchEvent, readBody, route, serverTime, validateLocation } from '../../shared/server';
export const onRequest = route('POST', async (context) => {
  const input = validateLocation(await readBody(context.request));
  const { turnstileToken, eventId, branch, province, source } = input;
  return dispatchEvent(context, {
    kind: 'LOCATION_CONSENT',
    eventId,
    turnstileToken,
    payload: { branchId: branch.id, province, source, consent: true },
    message: `📍 KHÁCH HÀNG ĐÃ CHỌN CHI NHÁNH\nSự kiện: LOCATION_CONSENT\nMã: ${eventId}\nThời gian: ${serverTime()}\nKhu vực: ${province}\nChi nhánh: ${branch.name}\nNguồn: ${source === 'gps' ? 'GPS đã cấp quyền (chỉ chia sẻ khu vực)' : 'Chọn thủ công'}\nTrạng thái: Đã đồng ý chia sẻ khu vực\nBản đồ khu vực: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(province + ', Việt Nam')}`,
  });
});
