# Racing Garage — kế hoạch triển khai

Theo bản kế hoạch người dùng gửi ngày 01/11/2026. React + Vite + TypeScript, Cloudflare Pages Functions, Telegram, Turnstile.

1. Khởi tạo dự án và dữ liệu có cấu trúc. Không công bố cơ sở hoặc tuyển dụng chưa xác minh.
2. Xây dựng landing page responsive phong cách Racing, gallery, bộ lọc phụ tùng và hộp thoại chi tiết.
3. Theo yêu cầu cập nhật: tự gọi yêu cầu quyền GPS khi tải trang và cập nhật header; vẫn cần quyền do trình duyệt cấp. Chỉ thông báo Telegram khi người dùng đồng ý chia sẻ riêng.
4. Form ứng tuyển và popup theo dữ liệu chi nhánh thực tế, xác thực và trạng thái lỗi rõ ràng.
5. Năm API Pages Functions, Turnstile, Telegram, chống lặp và giới hạn tần suất.
6. Build, kiểm thử luồng API, kiểm tra giao diện và tài liệu triển khai.

Production cần tên thương hiệu chính thức, danh sách cơ sở đã xác minh, ảnh thương mại, sản phẩm và tuyển dụng thật, secrets Telegram/Turnstile và cấu hình Cloudflare.

## Kết quả triển khai

- Đã dựng giao diện và các tương tác chính, ảnh concept WebP, dữ liệu JSON và năm API.
- D1 chỉ dùng metadata chống trùng/giới hạn tần suất để bảo đảm xử lý yêu cầu đồng thời; dữ liệu kinh doanh vẫn lưu JSON.
- Build thành công, 12 kiểm thử backend đạt. Kiểm tra Chrome trên 360/390/768/1440px đạt; hai luồng gửi đã thử với API/provider giả lập, không gửi Telegram thật.
- Project Cloudflare đã được xóa theo yêu cầu; giữ mã trên GitHub để chủ dự án tự cấu hình Pages. Không tự triển khai lại.
- Chưa mở tiếp nhận hồ sơ/Telegram vì còn thiếu secrets, D1 và dữ liệu doanh nghiệp thật.
