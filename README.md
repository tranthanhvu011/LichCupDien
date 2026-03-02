# ⚡ Thông Báo Lịch Cúp Điện EVNSPC

Tool tự động tra cứu lịch cúp điện từ EVNSPC (Điện lực miền Nam) và gửi thông báo qua Telegram.

## 🚀 Cài đặt

```bash
npm install
```

## ⚙️ Cấu hình

1. Copy file `.env.example` → `.env`
2. Sửa file `.env` với thông tin của bạn:

### Tạo Telegram Bot

1. Mở Telegram, tìm **@BotFather**
2. Gửi `/newbot` → đặt tên → nhận **Bot Token**
3. Mở chat với bot mới tạo, gửi 1 tin nhắn bất kỳ
4. Mở trình duyệt: `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Tìm `"chat":{"id": 123456789}` → đó là **Chat ID**
6. Điền Token và Chat ID vào `.env`

## 📋 Sử dụng

### Check 1 lần (manual)
```bash
node src/index.js --check
```

### Chạy liên tục (auto scheduler)
```bash
node src/index.js
```
Mặc định check mỗi ngày lúc 7:00 sáng. Chỉ gửi Telegram khi **có** lịch cúp điện.

## 📁 Cấu trúc

```
├── src/
│   ├── index.js      # Entry point + scheduler
│   ├── scraper.js    # Fetch & parse EVNSPC data
│   ├── notifier.js   # Telegram notifications
│   └── config.js     # Load .env config
├── .env              # Config (Telegram token, ...)
├── .env.example      # Template config
└── package.json
```

## 🔔 Telegram Message

Khi có lịch cúp điện, bạn sẽ nhận message dạng:

```
⚡ THÔNG BÁO LỊCH CÚP ĐIỆN ⚡

📋 Mã KH: PK11000109647
📅 Giai đoạn: 02-03-2026 → 09-03-2026
📊 Số lần cúp điện: 1

🔸 Lần 1:
   📅 Ngày: 05-03-2026
   ⏰ Thời gian: 07:00 - 17:00
   📍 Khu vực: ...
   📝 Lý do: Bảo trì lưới điện

⚠️ Hãy chuẩn bị sạc pin và nước dự trữ!
```
