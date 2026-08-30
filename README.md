# Tuyển dụng Udata.ai

Website tuyển dụng của Udata.ai - xây dựng bằng React + Vite + Tailwind CSS v4.

## Cài đặt & Chạy locally

```bash
# Cài dependencies
npm install

# Chạy dev server
npm run dev

# Build production
npm run build

# Preview bản build
npm run preview
```

## Biến môi trường

Sao chép file `.env.example` thành `.env` và điều chỉnh:

```bash
cp .env.example .env
```

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `VITE_HR_EMAIL` | Email HR nhận ứng tuyển | `hr@udata.ai` |
| `VITE_USE_MAILTO_FOR_APPLY` | `true` = mở mailto, `false` = dùng form trên web | `true` |
| `VITE_GOOGLE_SHEET_URL` | URL `/exec` của Google Apps Script Web App | Không có |

## Cấu hình Google Drive, Sheet và FormSubmit

Luồng nộp hồ sơ upload PDF lên Drive và ghi link vào tab `Guest` qua Apps
Script. Sau khi xác nhận link Drive, trình duyệt gửi link đó cho HR qua
FormSubmit để request có origin/referrer của website.

1. Mở Google Sheet nhận dữ liệu, chọn **Extensions → Apps Script**.
2. Thay code hiện có bằng toàn bộ nội dung file `google_sheet_script.js`.
3. Vào **Project Settings → Script Properties**, thêm:
   - `CV_FOLDER_NAME`: tên thư mục Drive, không bắt buộc; mặc định là
     `SAMETEL_UngTuyen_CV`.
4. Chọn **Deploy → Manage deployments → Edit → New version**.
5. Chọn **Execute as: Me** và **Who has access: Anyone**, sau đó cấp quyền
   Google Drive và Google Sheet.
6. Sao chép URL kết thúc bằng `/exec` vào `VITE_GOOGLE_SHEET_URL`, rồi build
   lại website.
7. Gửi một hồ sơ thử. Nếu FormSubmit gửi thư kích hoạt tới HR, mở thư và xác
   nhận địa chỉ, sau đó gửi hồ sơ thử lần nữa.

Tab `Guest` sẽ có thêm `Email_Status` và `Application_ID`. Một hồ sơ hoàn tất
khi `CV_Link` mở được và `Email_Status` có giá trị `Sent`.

## Docker

### Build image

```bash
docker build --build-arg VITE_HR_EMAIL=hr@udata.ai --build-arg VITE_USE_MAILTO_FOR_APPLY=true -t udata-careers .
```

### Chạy container

```bash
docker run -d -p 8081:80 udata-careers
```

Truy cập: `http://localhost:8081`

### Docker Compose

```bash
docker compose up -d
```

## Cấu trúc dự án

```
├── public/              # Static assets (logo, social icons)
├── src/
│   ├── data/jds.json    # Dữ liệu vị trí tuyển dụng
│   ├── App.jsx          # Component chính
│   ├── index.css        # Tailwind + theme config
│   └── main.jsx         # Entry point
├── nginx.conf           # Nginx config cho Docker
├── Dockerfile           # Multi-stage build (Node → Nginx)
├── .env.example         # Mẫu biến môi trường
├── vite.config.js       # Vite config
└── package.json
```

## Công nghệ

- **React 19** + **Vite 8**
- **Tailwind CSS v4**
- **Nginx** (serve production trên Docker)
