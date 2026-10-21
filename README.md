# SUPER MURAH KUPANG

Perbaikan terbaru: harga manual Pesanan Toko tidak berubah saat QTY diganti; harga daftar, Supabase, dan nota konsisten. Perbaikan login, kategori dan artikel/promo sebelumnya tetap disertakan.

Baca **PANDUAN-PERBAIKAN.md**. Jika SQL konten sudah berhasil dijalankan, update ini cukup mengganti kode src: tidak perlu SQL baru, reset database, atau impor ulang konten. SQL-ARTIKEL-PROMO.sql tetap disertakan hanya untuk instalasi yang belum mempunyai tabel konten.

```bash
npm ci
npm run dev
npm run build
```

Output produksi: `dist`. Node.js 22.12+ atau 24. Pertahankan `.env` dan `.git` proyekmu.
