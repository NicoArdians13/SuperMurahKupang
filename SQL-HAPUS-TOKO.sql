-- Menghapus toko dari daftar aktif tanpa DELETE, sehingga relasi pesanan tetap utuh.
BEGIN;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS customers_is_deleted_idx ON public.customers(is_deleted);
COMMIT;
-- Tidak menghapus customer, pesanan, nota, produk atau file storage.
-- Menggunakan izin UPDATE admin yang sudah dipakai fitur Edit toko.
