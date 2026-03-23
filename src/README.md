# QR Inventory System

ระบบบันทึกสินค้าด้วยการสแกน QR Code พัฒนาด้วย React + Vite + Tailwind CSS + Supabase

---

## 📁 โครงสร้างไฟล์

```
src/
├── context/
│   └── AuthContext.jsx        # ระบบ login / permissions
├── lib/
│   └── supabaseClient.js      # Supabase connection
├── components/
│   └── Navbar.jsx             # Navigation bar
├── pages/
│   ├── LoginPage.jsx          # หน้า Login
│   ├── DashboardPage.jsx      # หน้าแรก / ภาพรวม
│   ├── ScanPage.jsx           # หน้าสแกน QR + กรอกข้อมูล
│   ├── HistoryPage.jsx        # ตารางประวัติการสแกนทั้งหมด
│   └── ItemDetailPage.jsx     # รายละเอียดการสแกนแต่ละครั้ง
├── App.jsx                    # Router
├── main.jsx                   # Entry point
└── index.css                  # Tailwind + Custom CSS
```

---

## 🚀 Setup

### 1. Supabase Database
รัน SQL ใน `supabase_setup.sql` ที่ Supabase SQL Editor:
- สร้างตาราง `scan_records`
- สร้างตาราง `users`
- เพิ่มข้อมูลทดสอบ

### 2. ติดตั้ง dependencies
```bash
npm install
npm install @supabase/supabase-js react-router-dom
```

### 3. รันโปรเจกต์
```bash
npm run dev
```

---

## 📊 ข้อมูลที่บันทึกในแต่ละการสแกน

| ฟิลด์ | คำอธิบาย | แหล่งที่มา |
|-------|----------|------------|
| `product_id` | ID / QR Code ของสินค้า | จากการสแกน หรือกรอกเอง |
| `product_name` | ชื่อสินค้า | กรอกเอง หรือ parse จาก QR |
| `quantity` | จำนวน | กรอกเอง (default: 1) |
| `section` | แผนก | เลือกจาก dropdown |
| `division` | ฝ่าย | เลือกจาก dropdown |
| `receiver` | ผู้รับสินค้า | กรอกเอง หรือใช้ชื่อผู้ login |
| `scanned_by` | ผู้สแกน | **อัตโนมัติจาก user ที่ login** |
| `scanned_at` | เวลาสแกน | **อัตโนมัติ (เวลาปัจจุบัน)** |
| `note` | หมายเหตุ | กรอกเอง (ไม่บังคับ) |

---

## 🔑 Roles & Permissions

| Role | สแกน | ดูข้อมูล | Export | ลบ |
|------|------|----------|--------|-----|
| admin | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ |
| warehouse | ✅ | ✅ | ❌ | ❌ |
| viewer | ❌ | ✅ | ❌ | ❌ |

---

## 📱 QR Code Format

ระบบรองรับ QR Code 2 รูปแบบ:

**1. JSON format** (แนะนำ):
```json
{ "id": "SKU-0001", "name": "ปั๊มไฮดรอลิก", "qty": 5 }
```

**2. Plain text** (ID สินค้าเดี่ยวๆ):
```
SKU-0001
```

---

## 🌐 Browser Support (QR Scanner)
- Chrome / Edge: ✅ (BarcodeDetector API)
- Safari iOS: ✅ (iOS 17+)
- Firefox: ⚠️ ต้องกรอกข้อมูลด้วยตนเอง (ไม่รองรับ BarcodeDetector)
