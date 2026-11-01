# Racing Garage — yêu cầu hiện hành

Theo bản kế hoạch gốc PROJECT-BRIEF.vi.txt và các cập nhật của chủ dự án ngày 01/11/2026.

- React/Vite, Be Vietnam Pro toàn cục, hình concept, bộ lọc phụ tùng, gallery, responsive.
- Chủ dự án tự cấu hình Cloudflare Pages bằng Dashboard; mã nguồn commit/push GitHub.
- Tự yêu cầu GPS khi tải, chọn chi nhánh trên thiết bị, IP gợi ý tỉnh/thành; không gửi tọa độ cá nhân.
- Mở ngay form tuyển dụng khi trình duyệt trả kết quả vị trí, gồm cả từ chối. Không chờ Telegram, không yêu cầu đã chọn tỉnh/chi nhánh trước khi mở. Có hai vị trí toàn quốc: hỗ trợ chăm sóc khách hàng, kỹ thuật xe.
- Bỏ checkbox cả vị trí và ứng tuyển. Giữ thông tin dữ liệu ngắn gần header/form. Hai thông báo Telegram kèm IP và nhãn trình duyệt từ server cùng thời gian, khu vực và Google Maps.
- Không dùng database, không yêu cầu EVENT_STORE. Turnstile, kiểm tra đầu vào và chống spam/chống trùng bằng bộ nhớ tạm; không cam kết chống trùng toàn cục/qua restart. Browser giữ biên nhận trong phiên.
- Năm API, secrets server, ảnh social 1200×630 và metadata/sitemap theo VITE_SITE_URL.
- Cơ sở chưa có dữ liệu thật vẫn để trống; ứng tuyển toàn quốc theo tỉnh/thành, không tạo địa chỉ giả.

Kiểm thử API và UI đều dùng provider giả lập, không gửi Telegram thật. Nội dung thương hiệu, ảnh dự án/sản phẩm thật và đầu mối doanh nghiệp sẽ bổ sung khi có dữ liệu.
