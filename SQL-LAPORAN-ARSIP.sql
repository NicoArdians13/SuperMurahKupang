-- Jalankan satu kali pada proyek Supabase yang sama.
-- Menambah kolom saja; tidak menghapus produk, pesanan, gambar, atau relasi.
BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS products_is_archived_idx ON public.products(is_archived);
CREATE INDEX IF NOT EXISTS orders_completed_at_idx ON public.orders(completed_at) WHERE completed_at IS NOT NULL;
-- Policy pembatas tambahan. Policy izin baca/tulis lama tetap diperlukan
-- dan tidak dihapus/diganti. Admin tetap dapat membaca produk arsip.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_archive_anon_visibility') THEN
    CREATE POLICY products_archive_anon_visibility ON public.products AS RESTRICTIVE
      FOR SELECT TO anon USING (is_archived = false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_archive_authenticated_visibility') THEN
    CREATE POLICY products_archive_authenticated_visibility ON public.products AS RESTRICTIVE
      FOR SELECT TO authenticated
      USING (is_archived = false OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE id=(SELECT auth.uid()) AND role='admin'
      ));
  END IF;
END $$;
COMMIT;
-- Tidak menandai pesanan lama selesai secara otomatis.
-- Gunakan tombol Tandai selesai di Pesanan toko untuk memasukkan ke laporan.
-- SQL tidak mengubah bucket atau policy Supabase Storage.
