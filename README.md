# Độ Xe Máy · IPMAP_DOXE

React + Vite + TypeScript, Cloudflare Pages Functions, Telegram và Turnstile. Backend không dùng database, không cần D1 hay binding EVENT_STORE.

Mã nguồn tại GitHub; chủ dự án tự cấu hình Cloudflare Pages Dashboard. Có hai vị trí tuyển dụng toàn quốc: hỗ trợ chăm sóc khách hàng và kỹ thuật xe. Chưa công bố cơ sở cụ thể vì chưa có dữ liệu địa chỉ đã xác minh.

## Chạy và kiểm tra

Dùng Node 24 LTS (tối thiểu 22.13), npm:

```sh
npm ci
npm run dev
npm run build
npm run check:seo
npm test
npm run check:pages
npm run pages:dev
```

Vite tại `http://127.0.0.1:5173` chỉ chạy giao diện. `pages:dev` chạy cả API; sao chép `.env.example` thành `.env` cho biến frontend và `.dev.vars.example` thành `.dev.vars` cho secret server. Cả hai file cá nhân đã được gitignore. Không đặt secret vào biến `VITE_*`.

`npm run test:ui` tự khởi động Vite và Chrome, dùng provider giả lập. Có thể đặt `CHROME_PATH`; ảnh kiểm tra trong `artifacts/`, không commit. Không gửi Telegram thật trong kiểm thử tự động.

## Hành vi

- Font Be Vietnam Pro toàn cục, tự host qua Fontsource, license tại `public/licenses/be-vietnam-pro-OFL.txt`.
- Giao diện responsive Racing, danh mục/bộ lọc phụ tùng, gallery concept, dịch vụ, chọn khu vực và FAQ. Catalog chưa mở bán, ảnh và sản phẩm ghi rõ minh họa; nguồn trong `src/data/assets-manifest.json`.
- Tự yêu cầu quyền GPS khi tải, cập nhật header. Sau khi khách cấp quyền, gửi vĩ độ/kinh độ và độ chính xác GPS tới API/Telegram, đồng thời đối chiếu chi nhánh trên thiết bị. Tọa độ chỉ giữ trong bộ nhớ trình duyệt, không ghi vào localStorage/sessionStorage. IP gợi ý tỉnh/thành ước lượng, hỗ trợ 34 tỉnh/thành và tên địa phương cũ.
- Ngay khi trình duyệt trả kết quả cấp hoặc từ chối GPS, mở **form ứng tuyển**. Hai vị trí nằm trong dropdown. Không đợi thông báo Telegram, không đợi có chi nhánh hoặc tỉnh đã chọn; ứng viên chọn tỉnh/thành trong form nếu cần.
- Nếu khách cấp GPS, gửi sự kiện kèm tọa độ vị trí qua `/api/location-consent` sau Turnstile. Từ chối GPS vẫn mở form, không tự gửi sự kiện chia sẻ vị trí. Nếu khách chủ động chọn khu vực thủ công, xác nhận chọn sẽ gửi sự kiện khu vực và mở form.
- Hai luồng độc lập, đều gửi thời gian, **IP từ CF-Connecting-IP và nhãn trình duyệt/OS/thiết bị** lấy từ header server về Telegram. Không dùng fingerprint hoặc cookie đăng nhập.
- Không có checkbox xác nhận ở hai luồng. Thông tin dữ liệu ngắn gọn hiển thị gần header/nút gửi. Cờ `consent` ở API vị trí đại diện cho cấp quyền/chọn khu vực; `submitted` ở API hồ sơ đại diện cho nhấn gửi đơn.
- Popup tự mở một lần trong phiên; đã đóng không tự bật liên tục. Chọn khu vực hoặc vị trí chủ động vẫn mở lại form. Điều hướng bàn phím, focus trap, reduced motion.
- Dữ liệu chi nhánh và tuyển dụng vẫn là JSON. `branches.json` chỉ thêm cơ sở thực đã xác minh; `jobs.json` có hai job `scope: national`, không cần tạo chi nhánh giả để nhận hồ sơ theo tỉnh/thành.

## Cloudflare Pages

| Trường                 | Giá trị                        |
| ---------------------- | ------------------------------ |
| Project name           | `ipmap-doxe`                   |
| Repository             | `Tienanh-Quangninh/IPMAP_DOXE` |
| Production branch      | `main`                         |
| Framework preset       | `React (Vite)`                 |
| Build command          | `npm run build`                |
| Build output directory | `dist`                         |
| Root directory         | Để trống (gốc repository)      |

Trong **Settings → Variables and secrets**, môi trường Production:

| Type   | Name                      | Value                                           |
| ------ | ------------------------- | ----------------------------------------------- |
| Text   | `NODE_VERSION`            | `24`                                            |
| Text   | `VITE_SITE_URL`           | `https://ipmap-doxe.pages.dev` hoặc domain thật |
| Text   | `VITE_TURNSTILE_SITE_KEY` | Site key công khai                              |
| Secret | `TURNSTILE_SECRET_KEY`    | Secret của cùng Turnstile widget                |
| Secret | `TELEGRAM_BOT_TOKEN`      | Token bot mới, không commit                     |
| Secret | `TELEGRAM_CHAT_ID`        | ID nhóm tiếp nhận                               |

`functions/` được nhận diện tự động. Không cần database, schema hoặc bindings. Repository không có `wrangler.toml` để Dashboard quản lý Text và secrets. Lưu biến xong Redeploy bản mới nhất. Cấu hình hostname của Turnstile đúng domain production; nếu dùng preview cần hostname, biến và secrets tương ứng.

Để chẩn đoán Telegram: kiểm tra biến đã áp dụng trong deployment mới, Turnstile site key/secret cùng widget, hostname đúng, bot ở trong nhóm và có quyền gửi, chat ID đúng. API không báo thành công nếu Telegram chưa xác nhận; lỗi hoặc kết quả chưa rõ được trả về giao diện.

## Chống spam và giới hạn

Turnstile xác thực cả hai API, kiểm tra action và hostname; kiểm tra Origin, kích thước JSON, đầu vào và honeypot hồ sơ. Backend hạn chế tốc độ và chống trùng bằng map có giới hạn/TTL trong **từng Worker isolate**. Browser giữ mã, hash nội dung và trạng thái sent/unknown trong phiên; không lưu hồ sơ thô. Timeout chưa rõ kết quả không tự gửi lại.

Không có database nên không bảo đảm chống trùng hoặc giới hạn tần suất toàn cục: Worker mới/khác không chia sẻ bộ nhớ, trạng thái mất khi restart. Bộ nhớ server giữ metadata tối đa 30 phút, dọn khi có request; Telegram là nơi nhận thông báo. Không có audit log bền vững. Nếu cần chống spam toàn cục, cấu hình rate limiting tại Cloudflare phù hợp với lưu lượng.

## Maps và social preview

Khi đã cấp GPS, cả hai thông báo có vĩ độ, kinh độ, độ chính xác (nếu trình duyệt cung cấp) và **Google Maps vị trí đã chia sẻ**, với query là đúng `latitude,longitude` của khách. Link chi nhánh (nếu có) được ghi riêng. Không dùng Việt Nam, tọa độ cửa hàng hoặc tỉnh suy đoán thay cho vị trí GPS. Nếu không có GPS thì ghi rõ không chia sẻ GPS, chỉ thêm link khu vực đã chọn khi có tỉnh/thành. Không cần Google Maps API key.

`public/images/social-preview.png`: PNG 1200×630, Open Graph/Twitter Cards trong HTML ban đầu cho Facebook/Zalo. `npm run social:image` dựng lại bằng Chrome từ ảnh concept và font có sẵn. `VITE_SITE_URL` quyết định canonical, og:url, og:image, robots và sitemap khi build; đổi domain cần đổi biến rồi Redeploy. Preview Facebook/Zalo thực tế phụ thuộc nền tảng và cache của họ.

Bản kế hoạch gốc trong `PROJECT-BRIEF.vi.txt`; yêu cầu cập nhật được ghi trong `PLAN.md`. Hợp đồng API tại [shared/README.md](shared/README.md).

## Nguồn kỹ thuật

- [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)

## Cập nhật thương hiệu và catalog

Thương hiệu hiện hành: **Độ Xe Máy**, áp dụng header/footer, hộp thoại, favicon và SEO/social preview. Banner bộ sưu tập và 8 ảnh sản phẩm tải từ các URL doxemay.com theo yêu cầu của chủ dự án, giữ hình gốc và nguồn trong assets-manifest. Danh mục phụ tùng theo hình tham khảo nằm trong categories.json. Giá của các sản phẩm bổ sung để liên hệ tư vấn; không tự gán giá hoặc tuyên bố tồn kho.
