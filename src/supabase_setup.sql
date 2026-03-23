-- ===================================================
-- QR Inventory System — Supabase SQL Setup
-- รัน SQL นี้ใน Supabase SQL Editor
-- ===================================================

-- 1. ตาราง scan_records สำหรับเก็บข้อมูลการสแกน QR
create table if not exists scan_records (
  id            uuid primary key default gen_random_uuid(),
  product_id    text        not null,          -- ID หรือ QR Code ของสินค้า
  product_name  text,                          -- ชื่อสินค้า
  quantity      integer     not null default 1, -- จำนวน
  section       text,                          -- แผนก (Hydraulic / Mechatronic / ...)
  division      text,                          -- ฝ่าย
  receiver      text,                          -- ผู้รับสินค้า
  scanned_by    text,                          -- ชื่อผู้สแกน (จาก user.fullname)
  scanned_by_id uuid,                          -- ID ของผู้สแกน (จาก users.id)
  note          text,                          -- หมายเหตุ
  scanned_at    timestamptz not null default now()
);

-- 2. Index เพื่อค้นหาเร็ว
create index if not exists idx_scan_records_product_id  on scan_records(product_id);
create index if not exists idx_scan_records_scanned_at  on scan_records(scanned_at desc);
create index if not exists idx_scan_records_scanned_by  on scan_records(scanned_by);

-- 3. Row Level Security — ปิดไว้ก่อน (ระบบใช้ service key)
--    ถ้าต้องการเปิด RLS ให้ uncomment บรรทัดด้านล่าง
-- alter table scan_records enable row level security;
-- create policy "allow all" on scan_records for all using (true);

-- 4. ตาราง users (ถ้ายังไม่มี)
create table if not exists users (
  id        uuid primary key default gen_random_uuid(),
  email     text unique not null,
  password  text not null,             -- ในระบบจริงควรใช้ Supabase Auth
  fullname  text,
  role      text default 'viewer',     -- admin | manager | warehouse | viewer
  section   text,
  division  text
);

-- 5. ข้อมูลทดสอบ (ลบออกได้หลัง setup จริง)
insert into users (email, password, fullname, role, section, division)
values
  ('admin@demo.com',     '1234', 'Admin User',     'admin',     'IT',          'ฝ่าย IT'),
  ('manager@demo.com',   '1234', 'Manager User',   'manager',   'Logistics',   'ฝ่ายจัดซื้อ'),
  ('warehouse@demo.com', '1234', 'Warehouse User', 'warehouse', 'Warehouse A', 'ฝ่ายคลังสินค้า'),
  ('viewer@demo.com',    '1234', 'View Only',      'viewer',    'Office',      'ฝ่ายบริหาร')
on conflict (email) do nothing;
