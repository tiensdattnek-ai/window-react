# ▦ Window React — The Quiet Edition

**Desktop miễn phí trên trình duyệt. React + TypeScript + Node.js.**

Một không gian làm việc mang cảm hứng Windows, với giao diện kính mờ, phong cảnh thanh bình và các ứng dụng thực sự hoạt động. Không tài khoản, không quảng cáo, không telemetry.

## Chạy ngay

Cài **Node.js 20.19+** (khuyên dùng Node.js 22 LTS), rồi chạy:

```bash
npm install
npm run dev
```

Mở **http://localhost:3000**. React, Vite HMR và Node.js dùng chung một cổng; không cần chạy backend riêng.

### Bản production

```bash
npm run build
npm start
```

Vẫn truy cập **http://localhost:3000**. Có thể chọn cổng bằng biến môi trường `PORT`:

```bash
# macOS / Linux
PORT=8080 npm run dev

# Windows PowerShell
$env:PORT=8080; npm run dev
```

## Có gì bên trong?

| Thành phần                   | Chức năng                                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop & Window Manager** | Kéo, resize 8 hướng, thu nhỏ, phóng to, snap trái/phải/toàn màn hình, chuyển cửa sổ, Show Desktop.                                                                                                             |
| **Start Menu**               | Tìm kiếm ứng dụng/tệp, danh sách ứng dụng, tệp gần đây, menu nghỉ và khởi động lại.                                                                                                                            |
| **File Explorer**            | Home dashboard, collections, danh sách/lưới, tìm kiếm, sắp xếp, thư mục mới, đổi tên, sao chép, yêu thích, kéo tệp vào thư mục, upload/download, Recycle Bin và khôi phục.                                     |
| **Notes**                    | Nhiều ghi chú, Markdown preview an toàn, toolbar, tìm kiếm nội dung, tên ghi chú, đếm từ, export và tự lưu.                                                                                                    |
| **Browser**                  | Tab, lịch sử, thanh địa chỉ, tìm kiếm DuckDuckGo, bookmark, iframe và nút mở trang ngoài.                                                                                                                      |
| **Music**                    | Ba soundscape ambient nguyên bản, âm thanh thật, play/pause, seek, next/previous, shuffle, repeat, favorites, queue và volume. Nhạc tiếp tục khi đóng hoặc thu nhỏ ứng dụng.                                   |
| **Photos**                   | Gallery, favorites, xem ảnh, chuyển ảnh, zoom, xoay, tải xuống và đặt hình nền.                                                                                                                                |
| **Terminal**                 | Shell an toàn thao tác trên hệ thống tệp ảo; lịch sử lệnh, autocomplete tên lệnh, thông tin thật từ Node.js. Chạy được **`npm` / `npx` thật** trên máy chủ Node.js, output stream trực tiếp, Ctrl + C để dừng. |
| **Calculator**               | Phép toán chuẩn, phần trăm, bình phương, căn, nghịch đảo, bộ nhớ, lịch sử và bàn phím. Không dùng `eval`.                                                                                                      |
| **Calendar**                 | Chuyển tháng, chọn ngày, tạo/xóa lịch hẹn, chọn giờ và màu, lưu cục bộ.                                                                                                                                        |
| **Weather**                  | Tìm thành phố, thời tiết hiện tại và dự báo 7 ngày từ Open-Meteo, trạng thái offline rõ ràng.                                                                                                                  |
| **Focus**                    | Pomodoro 25/5/15 phút, play/pause/reset, danh sách việc cần làm, đếm phiên, nhạc nền và chế độ yên tĩnh.                                                                                                       |
| **Settings**                 | Ba hình nền, ảnh riêng, sáu accent, sáng/tối, transparency, reduced motion, cỡ icon, độ sáng workspace, tên người dùng, thông tin Node.js, backup/restore/reset.                                               |
| **System panels**            | Quick Settings, lịch trên taskbar, notification center, toast và màn hình nghỉ.                                                                                                                                |

Font, icon, hình nền và soundscape đều được phục vụ từ ứng dụng, không tải qua CDN khi sử dụng. Giao diện thích ứng theo kích thước **từng cửa sổ**, hỗ trợ cả điện thoại và máy tính.

## Phím tắt & thao tác

| Thao tác                                  | Kết quả                            |
| ----------------------------------------- | ---------------------------------- |
| `Ctrl + K` / `Cmd + K`                    | Tìm ứng dụng và tệp.               |
| `Ctrl + Alt + E`                          | File Explorer.                     |
| `Ctrl + Alt + N`                          | Notes.                             |
| `Ctrl + Alt + T`                          | Terminal.                          |
| `Ctrl + Alt + S`                          | Settings.                          |
| `Ctrl + Alt + D`                          | Ẩn/hiện các cửa sổ.                |
| `Ctrl + L` / `Cmd + L` trong Browser      | Chọn thanh địa chỉ.                |
| `Esc`                                     | Đóng panel hoặc hộp thoại đang mở. |
| Double-click icon desktop/tệp             | Mở ứng dụng/tệp.                   |
| Double-click thanh tiêu đề                | Phóng to/khôi phục cửa sổ.         |
| Kéo thanh tiêu đề tới cạnh trái/phải/trên | Snap cửa sổ.                       |
| Chuột phải desktop hoặc tệp               | Menu ngữ cảnh.                     |

Một số phím tắt có thể bị hệ điều hành/trình duyệt của bạn giữ lại. Luôn có nút tương ứng trên giao diện.

### Thử terminal

```text
help
ls
cd Documents
mkdir "My project"
cd "My project"
echo "Hello, Window React!" > hello.txt
cat hello.txt
calc (12 + 8) * 3
theme dark
wallpaper dusk
open music
sysinfo
```

`rm` đưa tệp vào Recycle Bin. Các lệnh trên thao tác với hệ thống tệp ảo và **không chạm vào ổ đĩa thật**.

### Chạy npm / npx từ terminal

```text
npm --version
npm i -g opencode-ai
npx cowsay "Hello, Window React!"
npm view react version
```

- `npm` và `npx` là **hai lệnh duy nhất** được chuyển tới máy chủ Node.js. Server gọi thẳng `npm-cli.js` đi kèm Node.js bằng `child_process.spawn` **không qua shell**, nên các ký tự như `;`, `|`, `&&` hay `$(...)` chỉ là tham số bình thường của npm, không bao giờ được diễn giải.
- Output được stream về theo thời gian thực (NDJSON), **Ctrl + C** hoặc nút **Stop** trên tab bar dừng cả cây tiến trình; đóng cửa sổ Terminal cũng dừng lệnh đang chạy. Mỗi lệnh tối đa **15 phút**, tối đa **2 lệnh** chạy đồng thời.
- Lệnh chạy trong thư mục `npm-workspace/` (đã nằm trong `.gitignore`), đổi được bằng biến môi trường `WR_NPM_CWD`. `npm i -g` cài vào prefix toàn cục của Node.js trên máy chủ như bình thường; nếu prefix cần quyền ghi (ví dụ `/usr/local` trên Linux), hãy cấu hình `npm config set prefix ~/.npm-global` trước.
- Tắt hoàn toàn tính năng này bằng `WR_NPM=off npm run dev` (hoặc `npm start`). Khi đó `/api/npm` trả về 403 và terminal báo rõ.
- Endpoint yêu cầu header `X-Requested-With: WindowReact` (buộc trình duyệt thực hiện CORS preflight), nên website khác không thể gọi thay bạn. Đây vẫn là **quyền chạy npm trên máy chủ**: chỉ bật khi bạn tin tưởng những ai truy cập được cổng này, và không nên public ra Internet mà không có lớp xác thực phía trước.

## Dữ liệu & giới hạn minh bạch

- Tệp, ghi chú, lịch hẹn và tùy chọn nằm trong **localStorage của trình duyệt hiện tại**, với các khóa `wr:*`. Không được tải lên máy chủ và không tự đồng bộ qua thiết bị.
- Hãy dùng **Settings → System & storage → Export workspace** để sao lưu tệp. Restore xác thực cấu trúc JSON, tên tệp, URL, quan hệ thư mục và chu kỳ trước khi thay thế dữ liệu. Bản backup hiện bao gồm **tệp/thư mục**, không bao gồm lịch hẹn, tùy chọn hay danh sách công việc.
- Upload hỗ trợ văn bản/mã và PNG/JPEG/WebP/GIF, tối đa **2 MB mỗi tệp**. Workspace hỗ trợ tối đa **1.000 tệp/thư mục** (tính cả Recycle Bin). Tổng localStorage thường khoảng **5 MB** tùy trình duyệt; ứng dụng cảnh báo khi không thể lưu thêm. Các ảnh/nhạc đóng gói sẵn không chiếm hạn mức này.
- Không dùng workspace như nơi duy nhất lưu dữ liệu quan trọng. Xóa dữ liệu website/chế độ riêng tư có thể làm mất dữ liệu; lưu trữ cục bộ này không được mã hóa.
- Weather cần internet. API không phản hồi sẽ hiện trạng thái lỗi cùng nút thử lại, **không tự tạo dự báo giả**. Vị trí mặc định là Đà Nẵng; bạn có thể tìm thành phố khác.
- Nhiều website chặn iframe qua CSP hoặc `X-Frame-Options`. Browser cung cấp nút mở trang trong tab thật; không cố vượt cơ chế bảo vệ của website.
- Wi-Fi/Bluetooth/airplane chỉ là **trạng thái mô phỏng trong workspace**, không điều khiển phần cứng. Volume điều khiển nhạc của ứng dụng; brightness chỉ làm tối workspace.
- Focus tiếp tục khi **thu nhỏ** nhưng dừng khi đóng cửa sổ hoặc tải lại trang. Màn hình nghỉ không phải khóa bảo mật.
- Terminal có thể chạy `npm`/`npx` **thật trên máy chủ Node.js** (xem mục trên). Ngoài hai lệnh đó, không có lệnh hệ thống nào khác được thực thi. Có thể tắt bằng `WR_NPM=off`.
- Đây là **web desktop độc lập**, không phải Windows thật, không chạy `.exe` và không liên kết với Microsoft.

## Cấu trúc

```text
window-react/
├── server/
│   ├── index.js                # Express + Vite middleware, API, production static server
│   └── npm.js                  # Chạy npm / npx thật, stream NDJSON, giới hạn & dọn tiến trình
├── src/
│   ├── apps/                   # 11 ứng dụng tách biệt
│   ├── components/             # Desktop, Window, StartMenu, system panels, UI dùng chung
│   ├── context/
│   │   ├── WorkspaceContext.tsx # Cửa sổ, tệp, sở thích, lịch, thông báo, thời tiết
│   │   └── MusicContext.tsx     # Trình phát liên tục, volume, queue/favorites
│   ├── lib/                    # Kiểu dữ liệu, dữ liệu mẫu, filesystem, parser số học, client npm
│   ├── styles/                 # Design tokens, shell, ứng dụng & container queries
│   └── main.tsx
├── public/
│   ├── wallpapers/             # 3 hình nền nguyên bản
│   ├── audio/                  # 3 soundscape WAV nguyên bản
│   └── icons/                  # Logo SVG
├── scripts/
│   └── generate-soundscapes.py # Tái tạo nhạc bằng Python standard library
├── tests/
│   ├── unit/                   # Arithmetic parser & filesystem validation
│   └── e2e/                    # Kiểm thử thao tác thật bằng Chromium/Playwright
├── playwright.config.ts
├── vitest.config.ts
├── vite.config.ts
└── package.json
```

### API Node.js

```http
GET  /api/health
GET  /api/system
GET  /api/weather?city=Da%20Nang
POST /api/npm            { "command": "npm" | "npx", "args": ["i", "-g", "opencode-ai"] }
```

Weather chỉ gọi các domain cố định của Open-Meteo, có timeout và cache 10 phút. `/api/system` mô tả **máy chủ Node.js** (kèm trạng thái bật/tắt npm), không giả làm thông tin thiết bị của người dùng.

`/api/npm` là endpoint duy nhất thực thi tiến trình: chỉ nhận `npm`/`npx`, tối đa 40 tham số không chứa ký tự điều khiển, yêu cầu header `X-Requested-With: WindowReact`, trả về stream `application/x-ndjson` với các sự kiện `start` · `stdout` · `stderr` · `exit` · `error`. Ngắt kết nối là dừng tiến trình. Không có API đọc/ghi tệp tùy ý trên máy chủ.

## Kiểm thử

```bash
npm test                 # Unit tests
npm run typecheck        # TypeScript strict
npm run build            # Production bundle
npm audit                # Dependency audit

npx playwright install --with-deps chromium
npm run test:e2e         # Tự khởi động server nếu cần

npm run format           # Prettier
npm run format:check
```

Trong môi trường đã có Chromium, có thể đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` cho Playwright. Bộ kiểm thử mô phỏng dịch vụ thời tiết để không phụ thuộc mạng ngoài; âm thanh, download, filesystem và API Node được kiểm tra thật.

### Tái tạo soundscape (không bắt buộc)

```bash
python3 scripts/generate-soundscapes.py
```

Script dùng sóng tổng hợp, hợp âm, chuông mềm và delay; không dùng sample hoặc bản thu của bên thứ ba. Những tệp WAV cần thiết đã có sẵn.

## Bản quyền

Mã nguồn theo giấy phép MIT. Icon bởi [Lucide](https://lucide.dev/) (ISC); DM Sans và Manrope theo SIL Open Font License, đóng gói bằng Fontsource. Hình nền được tạo cho dự án; soundscape được tổng hợp bằng script đi kèm. Thời tiết bởi [Open-Meteo](https://open-meteo.com/).

**A familiar feeling. A fresh perspective.**
