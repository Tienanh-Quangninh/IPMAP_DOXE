# Racing Garage · IPMAP_DOXE

Landing page tiếng Việt cho xe độ, phụ tùng và tuyển dụng theo khu vực. React + Vite + TypeScript, Cloudflare Pages Functions, Telegram, Turnstile.

Mã nguồn đã lưu trên GitHub. Theo yêu cầu chủ dự án, project Cloudflare đã được xóa; bạn sẽ tự kết nối repository vào Cloudflare Pages sau.

Đã mở hai vị trí tiếp nhận toàn quốc theo yêu cầu: hỗ trợ chăm sóc khách hàng và kỹ thuật xe. Ứng viên chọn tỉnh/thành mong muốn; không bắt buộc có cơ sở đã cấu hình. Để gửi thực tế cần secrets Turnstile/Telegram, D1 binding `EVENT_STORE` và schema.

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
- Form ứng tuyển kiểm tra đầu vào, chọn tỉnh/thành và vị trí. Nhấn gửi đơn là thao tác gửi hồ sơ; đã bỏ checkbox/đoạn xác nhận dài theo yêu cầu. Không gửi IP hoặc thông tin trình duyệt trong hồ sơ Telegram. Turnstile ở frontend/backend.
- 5 API và D1 chống gửi trùng/giới hạn tần suất. Telegram lỗi không hiển thị thành công. Timeout chưa rõ kết quả không tự gửi lại.
- Điều hướng bàn phím, focus trap hộp thoại, reduced motion, quyền riêng tư và xóa khu vực đã lưu.

## Trạng thái nội dung

**Catalog chưa mở bán.** Tên Racing Garage là tên tạm theo bản kế hoạch. `branches.json` vẫn rỗng chờ địa chỉ/hotline thực tế. `jobs.json` có hai vị trí toàn quốc do chủ dự án yêu cầu, scope `national`, không gắn một địa chỉ chi nhánh giả. Lương hiển thị trao đổi khi phỏng vấn. Sản phẩm và ảnh ghi rõ minh họa/concept, chưa có giá.

`PROJECT-BRIEF.vi.txt` là bản kế hoạch gốc đã gửi. `PLAN.md` ghi phạm vi thực hiện. Nguồn ảnh và quyền sử dụng nằm trong `src/data/assets-manifest.json`; ảnh AI đã tối ưu WebP và lưu tại repository, không hotlink Google Images.

## Đưa lên Cloudflare Pages

Điền các trường trên màn hình tạo project:

| Trường                 | Giá trị                        |
| ---------------------- | ------------------------------ |
| Project name           | `ipmap-doxe`                   |
| Repository             | `Tienanh-Quangninh/IPMAP_DOXE` |
| Production branch      | `main`                         |
| Framework preset       | `React (Vite)`                 |
| Build command          | `npm run build`                |
| Build output directory | `dist`                         |
| Root directory         | Để trống (gốc repository, `/`) |

Environment variables ở bước build:

| Tên                       | Giá trị                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `NODE_VERSION`            | `24`                                                                         |
| `VITE_SITE_URL`           | `https://ipmap-doxe.pages.dev` (đổi thành domain thật khi dùng domain riêng) |
| `VITE_TURNSTILE_SITE_KEY` | Site key công khai của Turnstile, có thể bỏ trống khi chỉ xem giao diện      |

`functions/` được Cloudflare nhận diện tự động ở gốc repository, không phải điền vào Build output directory. Dùng Node 24 vì quá trình kiểm thử dùng SQLite của Node. Không đặt Telegram token hoặc Turnstile secret vào biến `VITE_*`.

Dự án dùng **Dashboard** để quản lý biến và bindings, không dùng `wrangler.toml`. Nếu Dashboard vẫn báo cấu hình được quản lý bởi Wrangler, đợi deployment từ commit đã bỏ file này hoàn tất rồi tải lại trang Settings. Chọn `Text` cho `NODE_VERSION`, `VITE_SITE_URL`, `VITE_TURNSTILE_SITE_KEY`; chọn `Secret` cho `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TURNSTILE_SECRET_KEY`. Sau khi đổi biến build, Redeploy để áp dụng.

1. Trong Cloudflare Pages, kết nối GitHub repository `Tienanh-Quangninh/IPMAP_DOXE`, chọn nhánh `main`.
2. Build command: `npm run build`; output: `dist`; root: thư mục gốc; Functions: `functions/`.
3. Tạo Turnstile widget cho domain thực tế. Thêm `VITE_TURNSTILE_SITE_KEY` vào biến build công khai. Không đặt secret vào biến frontend.
4. Thêm secrets `TELEGRAM_BOT_TOKEN` (token mới), `TELEGRAM_CHAT_ID`, `TURNSTILE_SECRET_KEY` trong Cloudflare Pages. Không đưa token vào repository.
5. Tạo D1 database riêng. Trong Pages → Settings → Bindings, thêm D1 database binding tên `EVENT_STORE` trỏ tới database đó. Áp dụng schema:

```sh
npx wrangler d1 create racing-garage-events
npx wrangler d1 execute racing-garage-events --remote --file=shared/schema.sql
```

6. Khi có địa chỉ thật, bổ sung chi nhánh theo kiểu dữ liệu tại `shared/types.ts`. Hai vị trí toàn quốc có thể tiếp nhận theo tỉnh/thành ngay khi backend đủ cấu hình. `province` dùng tên trong `src/data/provinces.json`; khai báo tọa độ cửa hàng, địa chỉ, hotline và bản đồ thật. Xác minh thông tin doanh nghiệp, đầu mối dữ liệu, chính sách lưu trữ/xóa hồ sơ và Telegram trước khi mở form.
7. Kiểm tra cả hai luồng trên preview với Telegram nhóm thử nghiệm, sau đó mới bật production. Không dùng secret thử nghiệm ở production.

Các POST trả lỗi nếu thiếu binding/secrets. Dữ liệu chi nhánh, sản phẩm và tuyển dụng vẫn lưu JSON. D1 chỉ lưu metadata chống trùng và giới hạn tần suất để xử lý đúng các yêu cầu đồng thời. Không có thông báo Telegram thực tế nào được gửi trong quá trình kiểm thử tự động. Chi tiết hợp đồng API, thời hạn dữ liệu và xử lý trạng thái chưa rõ nằm trong [tài liệu backend](shared/README.md).

## Font, bản đồ và ảnh chia sẻ

- Be Vietnam Pro áp dụng toàn cục, tự host qua Fontsource; license nằm trong `public/licenses/be-vietnam-pro-OFL.txt`.
- Hai thông báo Telegram có Google Maps khu vực và chi nhánh. Link chi nhánh dùng tọa độ cửa hàng từ cấu hình, hoặc tên/địa chỉ nếu thiếu tọa độ. Không gửi GPS cá nhân; không cần Google Maps API key.
- `public/images/social-preview.png` là ảnh PNG **1200×630 px**, được khai báo bằng Open Graph/Twitter Cards trong HTML ban đầu cho Facebook/Zalo và các trình đọc thẻ chia sẻ. Dựng lại bằng `npm run social:image` (cần Chrome; đặt `CHROME_PATH` nếu khác đường dẫn mặc định).
- `VITE_SITE_URL` quyết định URL tuyệt đối của canonical, `og:url`, `og:image`, `robots.txt` và sitemap lúc build. Nếu dùng domain riêng, đổi biến này rồi Redeploy. Font và ảnh được phục vụ cùng website, không gọi Google Fonts hoặc dịch vụ ảnh ngoài khi khách truy cập.
- Sau khi deploy, kiểm tra HTML nguồn có meta Open Graph và mở `/images/social-preview.png` trực tiếp. Nền tảng có thể cache ảnh cũ; dùng Facebook Sharing Debugger hoặc công cụ kiểm tra chia sẻ của Zalo để tải lại. Chưa xác minh preview trực tiếp trên Facebook/Zalo vì chủ dự án sẽ tự triển khai.

## Nguồn kỹ thuật

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage)

## Giới hạn còn lại

Chưa kết nối tài khoản Cloudflare, domain, secrets hoặc doanh nghiệp thật. Catalog chưa phải cửa hàng có giỏ hàng/thanh toán. So sánh ảnh trước/sau và thông số build thật cần ảnh và dữ liệu được xác minh. Không thể đảm bảo giao dịch nguyên tử giữa D1 và Telegram; kết quả chưa rõ cần đối soát theo mã sự kiện. Cơ chế chống lặp hoạt động khi ID sự kiện còn được lưu; giữ nguyên ID khi thử lại cùng dữ liệu trong phiên trình duyệt, không lưu nội dung hồ sơ vào web storage.

## Chẩn đoán gửi Telegram

Kiểm tra ngày 01/11/2026: production đã có tên các biến Telegram/Turnstile nhưng **chưa có D1 binding `EVENT_STORE`**. Vì vậy backend chưa thể gửi. Secret đã lưu không chứng minh token hoặc chat ID hợp lệ; chưa gửi tin kiểm thử thật.

1. Cloudflare → Storage & Databases → D1 → tạo database `racing-garage-events`.
2. Mở SQL Console, chạy nội dung `shared/schema.sql` để tạo bảng `events` và `rate_limits`.
3. Pages `ipmap-doxe` → Settings → Bindings → Add → D1 database. Variable name: **`EVENT_STORE`**, chọn database vừa tạo.
4. Redeploy bản mới nhất. Khi đó form hai vị trí toàn quốc sẽ gửi hồ sơ theo tỉnh/thành; không cần tự tạo địa chỉ chi nhánh để thử.
5. Nếu còn lỗi, kiểm tra hostname Turnstile đúng domain, site key/secret cùng widget và bot có quyền nhắn trong nhóm Telegram. Không dùng token/chat ID của nhóm khác để thử.

Các kiểm thử tự động dùng Telegram giả lập, không gửi tin ra nhóm thật. IP chỉ dùng phía backend phục vụ Turnstile/giới hạn tần suất dưới dạng băm cho D1; không đưa IP hoặc thông tin trình duyệt vào hồ sơ Telegram.
