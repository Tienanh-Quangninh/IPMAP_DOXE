# Backend Pages Functions — không database

Hai POST chỉ yêu cầu TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID và TURNSTILE_SECRET_KEY. Không có EVENT_STORE, SQL hoặc database binding. VITE_TURNSTILE_SITE_KEY là biến frontend công khai.

## API

- GET `/api/branches` → `{branches: Branch[]}`; chỉ cơ sở active/verified.
- GET `/api/jobs?branchId=…` → `{jobs: Job[]}`; gồm các job toàn quốc active và job đúng cơ sở đang tuyển.
- GET `/api/branch-suggestion` → `{province: string | null, source: "ip"}`; chỉ gợi ý request.cf, không lưu hoặc gửi Telegram.
- POST `/api/location-consent`: `{eventId, branchId: string | null, province: string | null, source: "gps" | "manual", consent: true, turnstileToken}`. `consent` đại diện cấp quyền GPS hoặc xác nhận chọn khu vực, không có checkbox. Cho phép chưa có cơ sở; GPS được cấp nhưng chưa biết tỉnh có thể gửi province null. Chọn thủ công bắt buộc tỉnh hợp lệ. Không nhận tọa độ cá nhân hoặc dữ liệu thiết bị từ client.
- POST `/api/apply`: `{eventId, branchId: string | null, province, jobId, name, birthYear: number, phone, education, experience: number, skills, vehicle, submitted: true, turnstileToken, website: ""}`. Job national nhận theo tỉnh, không bắt buộc cơ sở; job gắn chi nhánh vẫn kiểm tra cơ sở thật. Education: none/THCS/THPT/college/university; vehicle motorcycle/car, khớp job hoặc job any.

Các POST cùng Origin, JSON tối đa 16 KiB, UUID v4, Turnstile action location/apply và hostname khớp request. Mã thành công `{ok: true, eventId}` chỉ sau khi Telegram xác nhận. Lỗi `{error,message}`, HTTP 400/403/409/413/415/429/502/503.

Hai thông báo kèm thời gian server GMT+7, IP từ **CF-Connecting-IP** và browser/OS/nhóm thiết bị suy ra từ User-Agent header. Không lấy IP hay UA do JSON client khai báo. Không thu thập fingerprint, cookie đăng nhập hoặc GPS cá nhân. Thông tin dữ liệu hiển thị ngắn gần header/form; không có checkbox xác nhận. Link Google Maps dùng khu vực hoặc tọa độ cơ sở công khai từ cấu hình.

## Chống trùng và giới hạn

Map trong bộ nhớ **từng isolate**, tối đa 2000 bản ghi sự kiện và 2000 bộ đếm, chỉ giữ hash định danh/nội dung, mã và trạng thái. Claim pending trước await Turnstile để chặn gửi đồng thời cùng ID trong isolate. Giới hạn 3 hồ sơ hoặc 5 sự kiện khu vực / 10 phút / hash IP theo loại. Metadata sự kiện TTL 30 phút; counter 10 phút. Dọn khi có request mới.

Đây là best effort, không bảo đảm toàn cục hoặc qua restart/chuyển isolate. Browser giữ ID/hash/trạng thái trong sessionStorage và chia sẻ promise đang gửi để tránh gửi trùng khi đổi modal. Dữ liệu hồ sơ thô không vào storage. Kết quả Telegram không rõ (timeout, JSON lỗi) là unknown; không tự retry. Telegram từ chối rõ ràng cho phép thử lại với cùng ID và token Turnstile mới. Không có audit log bền vững hoặc SQL.

Các tests dùng mock network và bộ nhớ thật của module, không cần SQLite/D1, không gửi Telegram thật.

## Nguồn

- [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [34 tỉnh/thành — Chính phủ](https://baochinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-3321-don-vi-hanh-chinh-cap-xa-moi-102250704153652947.htm)
