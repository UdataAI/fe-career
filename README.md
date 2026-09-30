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

## Cấu hình Google Drive, Sheet và email HR

Luồng nộp hồ sơ upload PDF lên Drive và ghi link vào tab `Guest` qua Apps
Script. Hồ sơ được tiếp nhận khi đã có file Drive và dòng trong Sheet.
Apps Script gửi email kèm link CV bằng MailApp; lỗi email được ghi riêng
trong `Email_Status`, không làm ứng viên phải nộp lại hồ sơ.
Frontend vẫn hỗ trợ FormSubmit với deployment Apps Script cũ trong thời gian chuyển đổi.

1. Mở Google Sheet nhận dữ liệu, chọn **Extensions → Apps Script**.
2. Thay code hiện có bằng toàn bộ nội dung file `google_sheet_script.js`.
3. Vào **Project Settings → Script Properties**, thêm:
   - `SPREADSHEET_ID`: ID trong URL Google Sheet nhận hồ sơ:
     `https://docs.google.com/spreadsheets/d/ID_CUA_SHEET/edit`.
     Bắt buộc với Apps Script độc lập; tài khoản chạy script cần quyền sửa Sheet.
   - `HR_EMAIL`: email HR nhận hồ sơ, ví dụ `hr@sametel.com.vn`. Đây là
     cấu hình phía server, độc lập với `VITE_HR_EMAIL` ở frontend.
   - `CV_FOLDER_NAME`: tên thư mục Drive, không bắt buộc; mặc định là
     `SAMETEL_UngTuyen_CV`.
4. Chọn hàm **authorizeServices → Run**, chấp nhận quyền gửi email mới.
   Log cần có `HR=...` và `Email quota=...`. Nếu manifest `appsscript.json`
   khai báo `oauthScopes` thủ công, bổ sung
   `https://www.googleapis.com/auth/script.send_mail`, giữ các quyền cũ.
5. Chọn **Deploy → Manage deployments → Edit → New version**.
6. Chọn **Execute as: Me** và **Who has access: Anyone**, sau đó cấp quyền
   Google Drive và Google Sheet.
7. Giữ URL `/exec` hiện có nếu cập nhật deployment cũ. Nếu tạo deployment
   mới, sao chép URL vào `VITE_GOOGLE_SHEET_URL`, rồi build
   lại website.
8. Gửi một hồ sơ thử, kiểm tra link Drive, dòng Sheet, `Email_Status` và
   mail HR (kể cả thư rác). HR dùng Microsoft vẫn nhận được; mail được gửi
   từ tài khoản Google thực thi Apps Script.

Tab `Guest` sẽ có thêm `Email_Status` và `Application_ID`. Một hồ sơ hoàn tất
khi `CV_Link` mở được. `Sent` nghĩa là dịch vụ gửi mail đã chấp nhận gửi,
không bảo đảm mail đã vào inbox HR.

Khi nâng cấp, deploy frontend mới trước Apps Script mới để hạn chế client cũ
gửi FormSubmit đồng thời với MailApp. Không thay đổi CI/CD hoặc URL webhook.

Để gửi lại các hồ sơ lỗi cũ, kiểm tra HR chưa nhận email rồi chạy thủ công
**retryFailedHrEmails** trong Apps Script Editor. Mỗi lần xử lý tối đa 20 dòng
`Ready` hoặc `Failed: ...`, bỏ qua `Sent` và `Sending`, không tạo lại file CV.
`Failed to fetch` có thể xảy ra sau khi dịch vụ cũ đã nhận yêu cầu, nên cần
kiểm tra inbox trước khi gửi lại để tránh mail trùng. Nếu trạng thái dừng ở
`Sending`, kiểm tra inbox và Executions trước khi đổi thành `Ready` để retry.
MailApp có hạn mức hàng ngày; nếu hết quota, giữ hồ sơ trong Sheet và chạy lại
sau khi quota được cấp lại.

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
