# SUPER MURAH KUPANG

Update terbaru: impor ulang Excel hanya memperbarui harga barang lama dan menambah barang baru; kategori serta merk tetap melekat. Tidak perlu SQL tambahan untuk perubahan impor. Fitur sebelumnya: banner otomatis memenuhi kotak dengan latar putih, halaman dan filter Merk, serta Kelola merk di dashboard admin. Perbaikan harga manual pesanan, login, kategori, artikel, dan promo tetap disertakan.

Baca **PANDUAN-PERBAIKAN.md**. Jalankan **SQL-MERK.sql** satu kali pada Supabase yang sama sebelum memakai fitur merk. Tambahkan merk dari admin, lalu pilih merk saat mengedit produk. Data lama tidak dihapus. SQL-ARTIKEL-PROMO.sql hanya untuk instalasi yang belum memiliki tabel konten.

```bash
npm ci
npm run dev
npm run build
```

Output produksi: `dist`. Node.js 22.12+ atau 24. Pertahankan `.env` dan `.git` proyekmu.
