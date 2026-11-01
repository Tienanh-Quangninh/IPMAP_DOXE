# Pages Functions

## Cấu hình

Các route GET luôn hoạt động; POST đóng an toàn nếu thiếu cấu hình. Đặt `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TURNSTILE_SECRET_KEY` trong Cloudflare Pages Secrets. Không dùng prefix `VITE_` cho secrets. `.dev.vars.example` dành cho chạy Functions cục bộ.

Tạo D1 database và bind với tên `EVENT_STORE`, thực thi `shared/schema.sql` trước khi mở biểu mẫu. D1 chỉ lưu mã sự kiện, loại sự kiện, hash định danh giới hạn tần suất, hash nội dung và trạng thái gửi; không lưu hồ sơ, IP thô hoặc tọa độ. Dùng một database riêng cho preview và production.

Cấu hình production/preview qua Cloudflare Pages Dashboard. Repository không có `wrangler.toml` để Dashboard cho phép quản lý biến Text và bindings. Khi chạy cục bộ, `.dev.vars` vẫn dùng được; để gắn D1 local, dùng `wrangler pages dev dist --d1 EVENT_STORE` và áp dụng schema cho database local trước khi thử gửi form.

POST yêu cầu JSON cùng Origin với website, UUID v4 `eventId`, `consent: true`, Turnstile token. Widget Turnstile cần `action: location` cho chia sẻ khu vực và `action: apply` cho ứng tuyển. Backend kiểm tra hostname bằng hostname URL request. Cấu hình widget cho domain production/preview thực tế. Không dùng test secrets khi production.

`branches.json` và `jobs.json` cố ý rỗng. Chỉ thêm cơ sở thực, bật `active` và `verified` khi đã xác minh; chỉ bật `recruitmentEnabled` và thêm job `active` khi có tuyển dụng thật. GET jobs lọc đúng chi nhánh, POST apply kiểm tra lại phía server.

## Hợp đồng API

- GET `/api/branches` → `{branches: Branch[]}`.
- GET `/api/jobs?branchId=…` → `{jobs: Job[]}`.
- GET `/api/branch-suggestion` → `{province: string | null, source: "ip"}`; chỉ đọc `request.cf` để gợi ý, không lưu/gửi Telegram.
- POST `/api/location-consent`: `{eventId, branchId, province, source: "gps" | "manual", consent: true, turnstileToken}`. Không chấp nhận tọa độ hoặc dữ liệu thiết bị. Chỉ gửi khu vực và chi nhánh.
- POST `/api/apply`: `{eventId, branchId, jobId, name, birthYear: number, phone, education, experience: number, skills, vehicle, consent: true, turnstileToken, website: ""}`. `education`: `none`, `THCS`, `THPT`, `college`, `university`. `vehicle`: `motorcycle` hoặc `car`, khớp job.

Thành công `{ok: true, eventId}` chỉ khi Telegram xác nhận nhận. Lỗi `{error, message}`, mã HTTP 400/403/409/413/415/429/502/503. Chỉ IP do Cloudflare đưa vào header được dùng giới hạn tần suất. Ứng tuyển gửi IP này và nhãn browser/OS/thiết bị tổng quát sang Telegram sau đồng ý; không lấy fingerprint, cookie hoặc UA thô. Frontend phải thông báo nội dung tiếp nhận này trước checkbox đồng ý.

## Chống trùng, giới hạn tần suất và khôi phục

Một transaction D1 tăng bộ đếm và claim mã sự kiện; concurrent requests chỉ một bên được gửi. Ứng tuyển giới hạn 3 lần / 10 phút / hash IP; chia sẻ khu vực 5 lần. Hai luồng độc lập. Turnstile xác thực cả hai luồng. Body tối đa 16 KiB; honeypot và whitelist trường dữ liệu.

Giữ nguyên `eventId` cho các lần thử lại cùng một biểu mẫu, kể cả sau refresh. Nếu Telegram xác nhận lỗi rõ ràng (`TELEGRAM_ERROR`), có thể xác thực mới và thử lại cùng ID. Nếu mạng timeout hoặc phản hồi không đọc được, trạng thái `unknown` và lỗi `DELIVERY_UNKNOWN`; không tự gửi lại vì Telegram có thể đã nhận. Nếu worker ngắt sau gửi nhưng trước lưu kết quả, sự kiện còn `pending` và cũng không tự gửi lại. Người vận hành cần kiểm tra Telegram theo ID để đối soát, rồi cập nhật trạng thái D1 thủ công. Không có giao dịch phân tán giữa D1 và Telegram; hệ thống ưu tiên tránh thông báo trùng hơn tự retry khi kết quả không rõ.

Bộ đếm cũ được dọn khi có gửi mới. Thiết lập chính sách lưu trữ nội bộ cho `events`; đề xuất dọn sau 30 ngày bằng thao tác quản trị đã xác định phạm vi. Sau khi dọn, khả năng nhận biết ID cũ hết hiệu lực. Không log payload/secret/provider errors vào console. Bảo vệ quyền truy cập Telegram và D1, cùng quy trình xóa hồ sơ trong nhóm theo yêu cầu doanh nghiệp.

## Nguồn kỹ thuật và địa phương

- [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- [Cloudflare D1 Worker API](https://developers.cloudflare.com/d1/worker-api/) — batch transaction.
- [Telegram Bot API sendMessage](https://core.telegram.org/bots/api#sendmessage).
- Danh mục tỉnh/thành và mã số: [Báo Điện tử Chính phủ, Quyết định 19/2025/QĐ-TTg](https://baochinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-3321-don-vi-hanh-chinh-cap-xa-moi-102250704153652947.htm).
- Tên địa phương trước sắp xếp: [Nghị quyết 202/2025/QH15 — Báo Điện tử Chính phủ](https://baochinhphu.vn/nghi-quyet-cua-quoc-hoi-ve-sap-xep-don-vi-hanh-chinh-cap-tinh-102250612191145158.htm). `provinces.json` là danh mục khu vực, không phải danh sách cơ sở.

`npm test` dùng mock network và SQLite in-memory để kiểm tra chống trùng, gửi đồng thời, giới hạn, lỗi Telegram và xác thực. Không gửi tin Telegram thực tế.

Cả hai thông báo có link Google Maps khu vực và chi nhánh, tạo bằng `shared/maps.ts`. Query tọa độ chỉ lấy từ dữ liệu cửa hàng, không lấy GPS khách truy cập. URL dùng Maps URLs `api=1`, không cần API key. Nếu cấu hình chưa có tọa độ hợp lệ, link tìm bằng tên/địa chỉ/tỉnh của cơ sở.
