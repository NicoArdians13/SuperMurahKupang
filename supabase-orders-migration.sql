-- Jalankan setelah memeriksa tipe kolom `orders.id` yang sudah ada.
-- Migration ini aditif dan tidak menghapus/mengubah data pesanan lama.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists customer_id uuid;
alter table public.orders add column if not exists payment_method text not null default 'cash';
alter table public.orders add column if not exists payment_status text not null default 'belum_bayar';
alter table public.orders add column if not exists due_date date;
alter table public.orders add column if not exists subtotal numeric not null default 0;
alter table public.orders add column if not exists grand_total numeric not null default 0;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists delivery_status text not null default 'belum_diantar';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  product_id bigint,
  product_name text not null,
  product_code text,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  subtotal numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists customers_name_idx on public.customers (lower(name));
create index if not exists orders_order_date_idx on public.orders (order_date);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- Backfill nomor transaksi untuk baris lama yang belum memilikinya.
update public.orders
set order_number = coalesce(order_number, 'LEGACY-' || id::text)
where order_number is null;

-- Backfill total baru dari kolom legacy bila tersedia.
update public.orders
set grand_total = coalesce(nullif(grand_total, 0), total, 0),
    subtotal = coalesce(nullif(subtotal, 0), total, 0)
where total is not null;

-- Jika project memakai RLS, tambahkan policy yang setara dengan policy tabel
-- `orders` yang sudah ada. Jangan mengganti policy existing secara otomatis.
