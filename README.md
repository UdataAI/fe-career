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
