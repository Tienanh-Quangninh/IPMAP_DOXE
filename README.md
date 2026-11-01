# Racing Garage · IPMAP_DOXE

Landing page tiếng Việt cho xe độ, phụ tùng và tuyển dụng theo khu vực. React + Vite + TypeScript, Cloudflare Pages Functions, Telegram, Turnstile.

Mã nguồn đã lưu trên GitHub. Theo yêu cầu chủ dự án, project Cloudflare đã được xóa; bạn sẽ tự kết nối repository vào Cloudflare Pages sau.

Hiện chưa mở tiếp nhận hồ sơ/thông báo Telegram: còn cần secrets, D1 và dữ liệu chi nhánh/tuyển dụng thật. Không dùng dữ liệu cơ sở giả để mở form.

## Chạy tại máy

Yêu cầu Node.js 22.13+ (kiểm thử API dùng `node:sqlite`; khuyên dùng Node 24 LTS).

```sh
npm ci
npm run dev
```

Vite hiển thị giao diện tại `http://127.0.0.1:5173`. API chỉ chạy trong Cloudflare Pages; khi chưa có API, danh sách cơ sở mặc định rỗng, website vẫn cho chọn và lưu khu vực thủ công.

```sh
npm run build
npm test
npm run check:pages
npm run pages:dev
```

Để chạy Functions cục bộ, sao chép `.dev.vars.example` thành `.dev.vars`, `.env.example` thành `.env` và cấu hình các giá trị của bạn. Secrets không bao giờ có prefix `VITE_`. Windows sandbox có thể cần đặt `WRANGLER_LOG_PATH` trong thư mục dự án. Kiểm tra trình duyệt: chạy `npm run test:ui` (tự khởi động máy chủ kiểm thử); có thể đặt biến `CHROME_PATH` để chọn Chrome, ảnh kiểm tra nằm trong `artifacts/` (không commit).

## Những gì đã có

- Giao diện đen/cam responsive, sticky header, menu mobile, section xe máy/ô tô, dịch vụ và FAQ.
- Danh mục phụ tùng với bộ lọc loại xe, nhóm sản phẩm, hãng, mẫu xe; chi tiết sản phẩm và gallery phóng lớn.
- Danh mục 34 tỉnh/thành và tên địa phương cũ. Tự yêu cầu quyền GPS ngay khi tải trang, cập nhật vị trí/chi nhánh ở header; IP gợi ý khu vực ước lượng trong lúc chờ. Nếu bị từ chối hoặc không xác định được, vẫn chọn thủ công được. Tọa độ chỉ đối chiếu trên trình duyệt, không gửi đi.
- Đồng ý chia sẻ khu vực tách khỏi đơn ứng tuyển. Không gửi tọa độ GPS hay IP trong sự kiện chọn khu vực.
- Popup chỉ hiển thị nếu chi nhánh đã xác minh có việc đang tuyển; đóng popup sẽ không tự bật lại trong cùng phiên.
- Form ứng tuyển kiểm tra đầu vào, thông báo dữ liệu audit và checkbox đồng ý, Turnstile ở frontend/backend.
- 5 API và D1 chống gửi trùng/giới hạn tần suất. Telegram lỗi không hiển thị thành công. Timeout chưa rõ kết quả không tự gửi lại.
- Điều hướng bàn phím, focus trap hộp thoại, reduced motion, quyền riêng tư và xóa khu vực đã lưu.

## Trạng thái nội dung

**Đây là phiên bản giới thiệu, chưa mở bán hoặc nhận hồ sơ.** Tên Racing Garage là tên tạm theo bản kế hoạch. `src/data/branches.json` và `jobs.json` cố ý để `[]`: chưa có dữ liệu cơ sở/tuyển dụng thật được cung cấp. Không tự tạo địa chỉ, hotline, mức lương hay tin tuyển dụng. Sản phẩm và ảnh đều ghi rõ minh họa/concept, chưa có giá.

`PROJECT-BRIEF.vi.txt` là bản kế hoạch gốc đã gửi. `PLAN.md` ghi phạm vi thực hiện. Nguồn ảnh và quyền sử dụng nằm trong `src/data/assets-manifest.json`; ảnh AI đã tối ưu WebP và lưu tại repository, không hotlink Google Images.

## Đưa lên Cloudflare Pages

1. Trong Cloudflare Pages, kết nối GitHub repository `Tienanh-Quangninh/IPMAP_DOXE`, chọn nhánh `main`.
2. Build command: `npm run build`; output: `dist`; root: thư mục gốc; Functions: `functions/`.
3. Tạo Turnstile widget cho domain thực tế. Thêm `VITE_TURNSTILE_SITE_KEY` vào biến build công khai. Không đặt secret vào biến frontend.
4. Thêm secrets `TELEGRAM_BOT_TOKEN` (token mới), `TELEGRAM_CHAT_ID`, `TURNSTILE_SECRET_KEY` trong Cloudflare Pages. Không đưa token vào repository.
5. Tạo D1 database riêng; điền binding `EVENT_STORE` trong `wrangler.toml` (hoặc cấu hình Pages tương ứng). Áp dụng schema:

```sh
npx wrangler d1 create racing-garage-events
# Điền database_id được trả về vào wrangler.toml trước lệnh tiếp theo.
npx wrangler d1 execute racing-garage-events --remote --file=shared/schema.sql
```

6. Thêm chi nhánh đã xác minh và việc đang tuyển theo kiểu dữ liệu tại `shared/types.ts`. `province` dùng tên trong `src/data/provinces.json`; khai báo tọa độ cửa hàng, địa chỉ, hotline và bản đồ thật. Xác minh thông tin doanh nghiệp, đầu mối dữ liệu, chính sách lưu trữ/xóa hồ sơ và Telegram trước khi mở form.
7. Kiểm tra cả hai luồng trên preview với Telegram nhóm thử nghiệm, sau đó mới bật production. Không dùng secret thử nghiệm ở production.

Các POST trả lỗi nếu thiếu binding/secrets. Dữ liệu chi nhánh, sản phẩm và tuyển dụng vẫn lưu JSON. D1 chỉ lưu metadata chống trùng và giới hạn tần suất để xử lý đúng các yêu cầu đồng thời. Không có thông báo Telegram thực tế nào được gửi trong quá trình kiểm thử tự động. Chi tiết hợp đồng API, thời hạn dữ liệu và xử lý trạng thái chưa rõ nằm trong [tài liệu backend](shared/README.md).

## Nguồn kỹ thuật

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage)

## Giới hạn còn lại

Chưa kết nối tài khoản Cloudflare, domain, secrets hoặc doanh nghiệp thật. Catalog chưa phải cửa hàng có giỏ hàng/thanh toán. So sánh ảnh trước/sau và thông số build thật cần ảnh và dữ liệu được xác minh. Không thể đảm bảo giao dịch nguyên tử giữa D1 và Telegram; kết quả chưa rõ cần đối soát theo mã sự kiện. Cơ chế chống lặp hoạt động khi ID sự kiện còn được lưu; giữ nguyên ID khi thử lại cùng dữ liệu trong phiên trình duyệt, không lưu nội dung hồ sơ vào web storage.
