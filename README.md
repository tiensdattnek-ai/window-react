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

| Thành phần                   | Chức năng                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop & Window Manager** | Kéo, resize 8 hướng, thu nhỏ, phóng to, snap trái/phải/toàn màn hình, chuyển cửa sổ, Show Desktop.                                                                                                                                                                                                                                                                     |
| **Start Menu**               | Tìm kiếm ứng dụng/tệp, danh sách ứng dụng, tệp gần đây, menu nghỉ và khởi động lại.                                                                                                                                                                                                                                                                                    |
| **File Explorer**            | Home dashboard, collections, danh sách/lưới, tìm kiếm, sắp xếp, thư mục mới, đổi tên, sao chép, yêu thích, kéo tệp vào thư mục, upload/download, Recycle Bin và khôi phục.                                                                                                                                                                                             |
| **Notes**                    | Nhiều ghi chú, Markdown preview an toàn, toolbar, tìm kiếm nội dung, tên ghi chú, đếm từ, export và tự lưu.                                                                                                                                                                                                                                                            |
| **Browser**                  | Tab, lịch sử, thanh địa chỉ, tìm kiếm DuckDuckGo, bookmark, iframe và nút mở trang ngoài.                                                                                                                                                                                                                                                                              |
| **Music**                    | Ba soundscape ambient nguyên bản, âm thanh thật, play/pause, seek, next/previous, shuffle, repeat, favorites, queue và volume. Nhạc tiếp tục khi đóng hoặc thu nhỏ ứng dụng.                                                                                                                                                                                           |
| **Photos**                   | Gallery, favorites, xem ảnh, chuyển ảnh, zoom, xoay, tải xuống và đặt hình nền.                                                                                                                                                                                                                                                                                        |
| **Terminal**                 | **Shell thật** của máy chủ (PowerShell 7 / Windows PowerShell / cmd / Git Bash / WSL trên Windows; zsh / bash / fish trên macOS & Linux) qua PTY và xterm.js: chạy `npm i -g opencode-ai`, `opencode`, `vim`, `htop`, `git`… Nhiều tab, tìm kiếm, zoom, quick actions, 256 màu + truecolor, copy/paste, link bấm được. Kèm **Workspace shell** ảo an toàn như một tab. |
| **Calculator**               | Phép toán chuẩn, phần trăm, bình phương, căn, nghịch đảo, bộ nhớ, lịch sử và bàn phím. Không dùng `eval`.                                                                                                                                                                                                                                                              |
| **Calendar**                 | Chuyển tháng, chọn ngày, tạo/xóa lịch hẹn, chọn giờ và màu, lưu cục bộ.                                                                                                                                                                                                                                                                                                |
| **Weather**                  | Tìm thành phố, thời tiết hiện tại và dự báo 7 ngày từ Open-Meteo, trạng thái offline rõ ràng.                                                                                                                                                                                                                                                                          |
| **Focus**                    | Pomodoro 25/5/15 phút, play/pause/reset, danh sách việc cần làm, đếm phiên, nhạc nền và chế độ yên tĩnh.                                                                                                                                                                                                                                                               |
| **Settings**                 | Ba hình nền, ảnh riêng, sáu accent, sáng/tối, transparency, reduced motion, cỡ icon, độ sáng workspace, tên người dùng, thông tin Node.js, backup/restore/reset.                                                                                                                                                                                                       |
| **System panels**            | Quick Settings, lịch trên taskbar, notification center, toast và màn hình nghỉ.                                                                                                                                                                                                                                                                                        |

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

### Terminal: shell thật trên máy chủ

Mở **Terminal** (Ctrl + Alt + T). Tab đầu tiên là **shell thật** của máy đang chạy Window React, gắn với một pseudo-terminal (PTY) nên mọi chương trình tương tác đều hoạt động như trong Windows Terminal hay iTerm:

```text
npm i -g opencode-ai
opencode
node -v && npm -v
git status
```

- **Windows:** tự nhận PowerShell 7 → Windows PowerShell → Command Prompt → Git Bash → WSL (chọn qua nút **▾** cạnh dấu **+**). Dùng ConPTY qua `node-pty` với binary dựng sẵn, **không cần Visual Studio Build Tools**. **macOS / Linux:** shell đăng nhập (`$SHELL`), rồi zsh / bash / fish / sh. Trên Linux, `node-pty` được biên dịch lúc `npm install` (cần `python3`, `make`, `g++`).
- Shell mở tại thư mục home của người dùng chạy server (đổi bằng `WR_SHELL_CWD`). Quick actions → **Go to the project folder** để `cd` về thư mục Window React.
- **Nhiều tab** (Ctrl + Shift + T mở, Ctrl + Shift + W đóng, Ctrl + Tab chuyển, bấm chuột giữa để đóng), **tìm kiếm** trong scrollback (Ctrl + Shift + F, hỗ trợ regex và phân biệt hoa thường), **zoom chữ** (Ctrl + = / Ctrl + - / Ctrl + 0), **Quick actions** gõ sẵn lệnh thường dùng, tiêu đề tab cập nhật theo tiêu đề shell, chấm vàng khi tab nền có bell.
- **Copy / paste:** Ctrl + Shift + C / Ctrl + Shift + V; Ctrl + C khi đang bôi đen sẽ copy thay vì gửi SIGINT; Cmd + C / Cmd + V trên macOS; bấm giữ Ctrl + click để mở URL.
- **Workspace shell** cũ (chỉ thao tác hệ thống tệp ảo, không chạm ổ đĩa) vẫn còn: **▾ → Workspace shell**. Các lệnh `ls`, `cd`, `cat`, `mkdir`, `echo >`, `rm` (đưa vào Recycle Bin), `open`, `calc`, `theme`, `wallpaper`, `sysinfo`, `neofetch`… hoạt động như trước.
- **Kết xuất:** dùng WebGL khi trình duyệt có GPU, tự chuyển sang DOM renderer khi không (Remote Desktop, máy ảo, headless) — cả hai đều được kiểm thử. Mỗi cửa sổ ứng dụng có **error boundary riêng**: một app gặp sự cố chỉ hiển thị "Try again / Close" trong cửa sổ đó, desktop và các app khác không bị ảnh hưởng.

#### Bảo mật của shell

Đây là **quyền truy cập shell đầy đủ vào máy chủ với quyền của người chạy `npm run dev`**. Window React bảo vệ nó như sau:

- Kết nối WebSocket `/api/shell` chỉ chấp nhận **cùng origin** với trang (trình duyệt luôn gửi header `Origin`). Website khác không thể mở shell qua trình duyệt của bạn. Khi chạy sau reverse proxy có domain khác, khai báo `WR_SHELL_ORIGINS=https://desk.example.com` (phân tách bằng dấu phẩy).
- **Token tùy chọn:** đặt `WR_SHELL_TOKEN=<chuỗi bí mật>` trên server; terminal sẽ hỏi token một lần và lưu trong trình duyệt (`wr:shell-token`). So sánh bằng `timingSafeEqual`. `/api/system` không tiết lộ danh sách shell hay thư mục khi token được bật.
- Tối đa **8 shell** đồng thời; tiến trình shell **sống cùng kết nối** — đóng tab, đóng cửa sổ hay rớt mạng là shell bị kill cả cây. Heartbeat 30 giây phát hiện kết nối chết; back-pressure tạm dừng PTY khi trình duyệt không kịp nhận (ví dụ `yes`).
- **Tắt hoàn toàn:** `WR_SHELL=off npm run dev` (hoặc `npm start`). Terminal vẫn dùng được với Workspace shell ảo.
- Không nên public cổng này ra Internet nếu không có HTTPS + token + lớp xác thực phía trước (VPN, Tailscale, reverse proxy có đăng nhập).

## Dữ liệu & giới hạn minh bạch

- Tệp, ghi chú, lịch hẹn và tùy chọn nằm trong **localStorage của trình duyệt hiện tại**, với các khóa `wr:*`. Không được tải lên máy chủ và không tự đồng bộ qua thiết bị.
- Hãy dùng **Settings → System & storage → Export workspace** để sao lưu tệp. Restore xác thực cấu trúc JSON, tên tệp, URL, quan hệ thư mục và chu kỳ trước khi thay thế dữ liệu. Bản backup hiện bao gồm **tệp/thư mục**, không bao gồm lịch hẹn, tùy chọn hay danh sách công việc.
- Upload hỗ trợ văn bản/mã và PNG/JPEG/WebP/GIF, tối đa **2 MB mỗi tệp**. Workspace hỗ trợ tối đa **1.000 tệp/thư mục** (tính cả Recycle Bin). Tổng localStorage thường khoảng **5 MB** tùy trình duyệt; ứng dụng cảnh báo khi không thể lưu thêm. Các ảnh/nhạc đóng gói sẵn không chiếm hạn mức này.
- Không dùng workspace như nơi duy nhất lưu dữ liệu quan trọng. Xóa dữ liệu website/chế độ riêng tư có thể làm mất dữ liệu; lưu trữ cục bộ này không được mã hóa.
- Weather cần internet. API không phản hồi sẽ hiện trạng thái lỗi cùng nút thử lại, **không tự tạo dự báo giả**. Vị trí mặc định là Đà Nẵng; bạn có thể tìm thành phố khác.
- Nhiều website chặn iframe qua CSP hoặc `X-Frame-Options`. Browser cung cấp nút mở trang trong tab thật; không cố vượt cơ chế bảo vệ của website.
- Wi-Fi/Bluetooth/airplane chỉ là **trạng thái mô phỏng trong workspace**, không điều khiển phần cứng. Volume điều khiển nhạc của ứng dụng; brightness chỉ làm tối workspace.
- Focus tiếp tục khi **thu nhỏ** nhưng dừng khi đóng cửa sổ hoặc tải lại trang. Màn hình nghỉ không phải khóa bảo mật.
- Terminal cung cấp **shell thật của máy chủ** (xem mục trên) — tắt bằng `WR_SHELL=off`, giới hạn origin, thêm `WR_SHELL_TOKEN` khi cần. Không có API nào khác thực thi lệnh hay đọc/ghi tệp tùy ý.
- Đây là **web desktop độc lập**, không phải Windows thật, không chạy `.exe` và không liên kết với Microsoft.

## Cấu trúc

```text
window-react/
├── server/
│   ├── index.js                # Express + Vite middleware, API, production static server
│   └── pty.js                  # Shell thật qua node-pty + WebSocket, origin/token, back-pressure
├── src/
│   ├── apps/                   # 11 ứng dụng tách biệt (Terminal = ShellView xterm.js + WorkspaceShell ảo)
│   ├── components/             # Desktop, Window, StartMenu, system panels, UI dùng chung
│   ├── context/
│   │   ├── WorkspaceContext.tsx # Cửa sổ, tệp, sở thích, lịch, thông báo, thời tiết
│   │   └── MusicContext.tsx     # Trình phát liên tục, volume, queue/favorites
│   ├── lib/                    # Kiểu dữ liệu, dữ liệu mẫu, filesystem, parser số học, client shell
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
WS   /api/shell          { type: "start", cols, rows, shell?, token? } → ready · output · exit · error
```

Weather chỉ gọi các domain cố định của Open-Meteo, có timeout và cache 10 phút. `/api/system` mô tả **máy chủ Node.js** (kèm trạng thái shell), không giả làm thông tin thiết bị của người dùng.

`/api/shell` là WebSocket duy nhất thực thi tiến trình: một PTY cho mỗi kết nối, chỉ nhận cùng origin (hoặc `WR_SHELL_ORIGINS`), token tùy chọn, tối đa 8 phiên, kích thước lưới bị giới hạn 500×300. Client gửi `input` / `resize`; server trả `output` từng đoạn. Đóng kết nối là kết thúc shell. Không có API đọc/ghi tệp tùy ý ngoài shell này.

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

Trong môi trường đã có Chromium, có thể đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` cho Playwright. Bài kiểm thử terminal cần `node-pty` hoạt động (trên Linux CI cần `python3`, `make`, `g++`; Ubuntu runner có sẵn). Bộ kiểm thử mô phỏng dịch vụ thời tiết để không phụ thuộc mạng ngoài; âm thanh, download, filesystem và API Node được kiểm tra thật.

### Tái tạo soundscape (không bắt buộc)

```bash
python3 scripts/generate-soundscapes.py
```

Script dùng sóng tổng hợp, hợp âm, chuông mềm và delay; không dùng sample hoặc bản thu của bên thứ ba. Những tệp WAV cần thiết đã có sẵn.

## Bản quyền

Mã nguồn theo giấy phép MIT. Icon bởi [Lucide](https://lucide.dev/) (ISC); DM Sans và Manrope theo SIL Open Font License, đóng gói bằng Fontsource. Hình nền được tạo cho dự án; soundscape được tổng hợp bằng script đi kèm. Thời tiết bởi [Open-Meteo](https://open-meteo.com/).

**A familiar feeling. A fresh perspective.**
