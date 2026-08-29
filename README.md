# Ruang Rumah Grosir

Website marketing berbasis Vite + React + TypeScript untuk toko grosir perabotan rumah tangga Indonesia.

## Menjalankan proyek

Pastikan Node.js 18+ dan npm tersedia, lalu jalankan:

```bash
npm install
npm run dev
```

Untuk validasi build produksi:

```bash
npm run build
```

Gambar produk saat ini menggunakan URL Unsplash sebagai placeholder dan sebaiknya diganti dengan foto produk toko.

Logo utama berada di `public/logo-super-murah-kupang.svg`. Ganti file tersebut melalui kode/file project jika ingin memakai logo resmi toko. Logo utama tidak dikelola dari dashboard.

Gambar utama/promosi dikelola dari dashboard admin dan menggantikan gambar hero utama di halaman depan setelah di-upload. Hapus gambar tersebut untuk kembali ke gambar bawaan.

## Import katalog Excel

Login ke menu **Admin**, lalu pilih **Import Excel**. Gunakan baris pertama sebagai nama kolom berikut:

| Nama Barang | Harga Ecer | Harga Grosir | Harga Super Grosir | Gambar | Kategori |
| --- | --- | --- | --- | --- | --- |
| Nama produk | Rp25.000 | Rp22.000 | Rp20.000 | URL gambar | Dapur |

Kolom `Nama Barang` wajib diisi. `Gambar` dapat berupa URL gambar, sedangkan `Kategori` boleh dikosongkan dan akan masuk ke kategori Dapur. Setelah import, kategori dapat diubah langsung lewat dropdown di setiap baris. Kategori baru dapat dibuat dan kategori kosong dapat dihapus dari dashboard.

> Login admin saat ini masih berjalan di browser dan data tersimpan di `localStorage`. Kredensial tidak ditampilkan di halaman. Untuk produksi, gunakan backend dan autentikasi server agar hanya pemilik toko yang dapat mengubah katalog.
