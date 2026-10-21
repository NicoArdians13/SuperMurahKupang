# Import Excel: harga diperbarui, kategori dan merk tetap

Untuk update ini ganti `src/components/ExcelImportModal.tsx` dan `src/App.tsx` dari ZIP. Tidak perlu SQL baru. Pertahankan `.env` dan konfigurasi Supabase milikmu.

- Barang lama dicocokkan berdasarkan kode terlebih dahulu, lalu nama. Nama diabaikan perbedaan huruf besar/kecil dan spasi berlebih.
- Barang lama hanya diperbarui kolom harga yang terisi pada Excel serta waktu pembaruan. Kategori, merk, nama, kode, gambar, badge dan deskripsi tidak dikirim pada PATCH, sehingga tetap mengikuti database.
- Harga kosong pada Excel mempertahankan harga lama; angka 0 tetap dianggap nilai harga.
- Barang baru ditambahkan mengikuti Excel dan belum memiliki merk. Tentukan merknya lewat pilihan langsung di daftar katalog atau Edit produk.
- Membaca ulang seluruh katalog Supabase sebelum menulis agar pencocokan tidak memakai daftar lama pada browser. Jika pembacaan gagal, impor dibatalkan tanpa menulis barang.
- Tidak ada penghapusan produk atau reset database. Tidak ada SQL yang dijalankan pada Supabase asli.

Build berhasil. Pengujian browser dengan API simulasi pada desktop dan ponsel mencakup kode sama dengan nama berbeda, nama sama dengan kode kosong, kategori/merk tetap, harga kosong tetap, barang baru, impor file yang sama dua kali tanpa duplikasi, serta hasil setelah muat ulang.

---

# Pilihan merk langsung pada daftar katalog admin

Update terbaru cukup mengganti `src/App.tsx` dan `src/styles.css` dari ZIP ini. Pertahankan `.env` milikmu.

Pada Admin → Katalog produk, setiap baris sekarang mempunyai pilihan Merk di sebelah kiri pilihan kategori. Pilih merk dan tunggu status Tersimpan; tidak perlu membuka Edit atau menekan tombol simpan. Pilih Tanpa merk untuk melepas hubungan merk tanpa menghapus produk atau merk. Jika penyimpanan gagal, pilihan lama tetap tampil dan ada pesan untuk mencoba lagi.

Pada layar kecil pilihan merk dan kategori disusun ke bawah agar tidak bertumpuk. Tambah/edit/hapus daftar merk tetap melalui Kelola merk.

Tidak perlu SQL baru jika SQL-MERK.sql dari versi sebelumnya sudah berhasil dijalankan. SQL tersebut tetap disertakan bagi yang belum memasangnya. Tidak ada SQL yang dijalankan pada database asli selama pengerjaan ini.

---

# Update Merk dan banner depan

## Pemasangan update terbaru

1. Salin kode dari ZIP terbaru ke proyekmu. Pertahankan konfigurasi `.env` milikmu.
2. Jalankan isi `SQL-MERK.sql` di SQL Editor pada proyek Supabase yang sama. Tidak perlu menjalankan ulang SQL artikel/promo.
3. Buka dashboard admin → Kelola merk, lalu tambahkan merk.
4. Edit produk, pilih merk, lalu simpan. Produk lama tetap ada dan belum memiliki merk sampai kamu memilihnya.
5. Build dan deploy ulang jika website sudah online.

Perubahan sumber terbaru: `src/App.tsx`, `src/types.ts`, `src/styles.css`, serta file baru `src/lib/brands.ts` dan `src/components/AdminBrandsTab.tsx`.

## Perilaku baru

- Banner depan memakai `object-fit: cover`, sehingga gambar memenuhi kotak. Bagian tepi gambar dapat terpotong sesuai rasio layar. Latar kotaknya putih.
- Menu garis tiga mempunyai halaman Merk. Pengunjung bisa memilih merk dan menggabungkannya dengan filter kategori di katalog. Filter merk tetap aktif saat halaman dimuat ulang.
- Admin dapat menambah, mengedit, dan menghapus merk. Mengganti nama merk tetap mempertahankan hubungan produk karena relasi memakai ID.
- Merk yang masih digunakan produk tidak dapat dihapus. Pindahkan atau kosongkan merk pada produk terlebih dahulu.
- Logo merk opsional dan tetap ditampilkan utuh. Upload menggunakan bucket `promotion-images` yang sudah ada; update ini tidak mengubah kebijakan bucket.
- SQL membuat tabel `brands` dan kolom nullable `products.brand_id`, dengan akses baca publik serta pengelolaan oleh akun admin yang terdaftar pada `admin_users`. Tidak menghapus atau mereset data lama.

Build berhasil. Pengujian browser dengan API simulasi lolos pada lebar 1440, 768, 390, dan 320 px, mencakup CRUD merk, penetapan merk produk, kombinasi filter, muat ulang, serta banner. Pengujian harga manual pesanan dan nota juga tetap lolos pada desktop dan ponsel. SQL dan kebijakan akses belum dijalankan pada Supabase asli selama pengerjaan.

Perbaikan sebelumnya tetap disertakan di bawah ini.

# Update Kelola Kategori + penyimpanan Supabase

Versi ini dibuat dari ZIP terbaru yang kamu unggah. Perubahan kode sudah selesai; SQL disertakan untuk dijalankan sendiri setelah memasang kode. Tidak ada perubahan yang dijalankan pada Supabase asli selama pengerjaan.

## Perbaikan harga Pesanan Toko

Untuk update harga pesanan saja, ganti `src/App.tsx` dan `src/styles.css` dari ZIP terbaru. Tidak perlu SQL baru. Tabel, kolom, harga katalog, dan data pesanan lama tidak diubah oleh pemasangan kode.

### Cara kerja

- Saat memilih barang, harga memakai mode **sistem**. QTY 1–5 memakai ecer, 6–35 grosir, dan 36 ke atas super grosir.
- Begitu kolom harga satuan diketik manual, mode berubah menjadi **manual**. Mengubah QTY tidak mengganti harga tersebut, termasuk ketika melewati batas tingkatan harga.
- Klik **Gunakan harga sistem** bila ingin kembali ke harga otomatis sesuai QTY yang sedang diisi.
- Memilih barang berbeda atau memulai item/pesanan baru mengembalikan mode awal ke sistem.
- Setelah klik Tambah barang, harga pada baris daftar adalah harga yang disepakati. Simpan pesanan tidak mengambil harga katalog lagi untuk menimpa daftar tersebut. Ini berlaku untuk pesanan baru maupun edit pesanan.
- Barang yang sama dengan harga satuan berbeda ditampilkan sebagai baris terpisah. Baris dengan barang, kode, dan harga yang sama dapat digabung jumlahnya, tanpa mengganti harga baris yang sudah ada. Bila ingin memakai tier berdasarkan gabungan QTY, masukkan gabungan QTY tersebut dalam pemilih barang sebelum Tambah barang.
- Nota, subtotal per barang, total keseluruhan, JSON items dan order_items memakai snapshot harga/jumlah yang sama.

### Validasi perubahan

Build TypeScript dan Vite berhasil. Pengujian browser dengan Supabase simulasi pada desktop (1440 px) dan ponsel (390 px) mencakup:

- Harga manual sebelum QTY, perubahan QTY 2, 6, 35, 36, dan kembali ke 6.
- Harga sistem pada QTY 1, 5, 6, 35 dan 36; kembali dari manual ke sistem.
- Satu barang ditambahkan dengan dua harga manual berbeda tanpa saling menimpa.
- Contoh simpan: 6 x Rp7.500 + 2 x Rp7.000 + 36 x Rp8.000 = Rp347.000. Harga pada payload Supabase dan nota cocok.
- Harga katalog pada server simulasi diubah sebelum penyimpanan; harga pesanan tetap mengikuti daftar yang disetujui.
- Pesanan dimuat ulang dari tabel simulasi, diedit dan disimpan lagi; seluruh harga dan total tetap sama.
- Tidak ditemukan exception JavaScript pada skenario uji. Supabase asli tidak ditulis/diubah selama pekerjaan ini.

## Tampilan login admin terbaru

- Login memakai satu kartu berukuran proporsional, dengan logo, ikon email/password, dan tombol masuk yang lebih jelas.
- Ikon mata menampilkan atau menyembunyikan password tanpa mengirim formulir. Teks yang sudah diketik tetap dipertahankan saat toggle.
- Password kembali tersembunyi saat kartu dibuka ulang. Tombol tutup membersihkan password yang diketik.
- Mendukung navigasi keyboard, Escape untuk menutup, indikator loading, dan pesan kesalahan login.
- Proses autentikasi dan pemeriksaan role Supabase tetap menggunakan submitLogin/updateLogin yang sama.

Untuk perubahan login saja, ganti src/App.tsx, src/styles.css, lalu tambahkan src/components/AdminLoginPanel.tsx. Tidak perlu SQL atau pengaturan akun baru.

Build berhasil. Pengujian dengan respons autentikasi simulasi pada ukuran 1440x900, 768x900, 390x844, 320x640 dan 700x400: tampil/sembunyikan password, nilai input tetap, toggle lewat keyboard, tidak ada submit saat toggle, pesan kredensial salah, dan penutupan/pembukaan ulang. Tidak mengirim kredensial ke Supabase asli selama pengujian.

## Perbaikan konten tidak muncul di depan

Update ini tidak memerlukan SQL baru, reset tabel, atau impor ulang konten yang sudah masuk Supabase.

- Data dimuat ulang saat menutup dashboard atau berpindah halaman publik.
- Tab browser yang sedang terbuka memeriksa pembaruan setiap 20 detik selama aktif, dan memuat ulang ketika kembali difokuskan atau koneksi kembali online. Tidak memerlukan aktivasi Supabase Realtime.
- Artikel Home tetap dibatasi tiga kartu, tetapi sekarang diurutkan berdasarkan waktu terakhir diperbarui. Artikel lama yang diperbarui naik ke bagian awal.
- Draf, terjadwal, berakhir dan tayang ditampilkan sebagai status berbeda. Menyimpan draf tidak otomatis menerbitkan konten. Tombol Terbitkan tersedia pada daftar draf dan tetap menghormati jadwal yang diisi.
- Jadwal dihitung memakai WITA. Agar konten tampil sekarang, centang Terbitkan di website dan pastikan tanggal mencakup hari ini, atau kosongkan kedua tanggal.
- Kegagalan membaca konten kini ditampilkan di halaman depan dengan tombol muat ulang; tidak disamarkan sebagai daftar kosong.
- Respons pemuatan lama tidak boleh menimpa hasil simpan yang lebih baru.

Cara memasang: salin folder src terbaru, pertahankan .env dan .git, lalu jalankan ulang npm run dev. Untuk versi online, deploy ulang build. SQL yang sebelumnya sudah berhasil dijalankan tidak perlu diulang.

Pengujian tambahan menggunakan respons Supabase simulasi: menyimpan draf, menerbitkan artikel/promo, mengedit artikel lama agar tampil pada tiga kartu Home, serta memuat perubahan dari perangkat lain ketika tab kembali difokuskan. Data Supabase asli belum diperiksa atau diubah; bila masalah berasal dari policy atau nilai data produksi, status dan pesan error kini membantu membedakannya.

## File kode yang berubah

1. `src/App.tsx`: menghubungkan tampilan kategori baru dan pengelolaan konten ke Supabase.
2. `src/components/AdminCategoriesTab.tsx`: komponen baru untuk kartu kategori, pencarian, filter, jumlah produk, dan kontrol gambar.
3. `src/components/AdminContentTab.tsx`: menambahkan tombol penyalinan konten lokal lama ke Supabase.
4. `src/lib/storefrontContent.ts`: membaca, menambah, mengedit, dan menghapus artikel/promo melalui Supabase; upload gambar; impor lokal secara eksplisit.
5. `src/styles.css`: menambahkan gaya untuk kategori, panel impor, dan status publikasi.
6. `src/components/StorefrontContentSections.tsx`: pembaruan urutan dan pemuatan/status konten publik.

File lain di folder src dipertahankan. `.env`, konfigurasi Supabase, package.json, dan package-lock.json tidak diganti.

## Memasang kode

- Salin keenam file di atas dari ZIP ke proyek lama, termasuk komponen baru. Alternatif: salin folder `src` secara lengkap karena file lainnya tetap dipertahankan.
- Pertahankan `.env`, `.git`, dan konfigurasi deployment milikmu.
- Jalankan `npm ci` jika dependency belum terpasang, lalu `npm run dev`.
- Gunakan Node.js 22.12+ atau Node.js 24.

## Mengaktifkan penyimpanan artikel/promo

1. Buka proyek Supabase yang sama dengan website saat ini.
2. Buka SQL Editor, buat query baru.
3. Salin isi **SQL-ARTIKEL-PROMO.sql** dan jalankan.
4. Kembali ke website; login admin yang sama. Buka **Pusat Marketing → Artikel website** atau **Banner Promosi → Promo website**, lalu klik Muat ulang bila sebelumnya muncul pesan tabel belum tersedia.

Kedua jenis konten memakai satu tabel baru `storefront_content`, dibedakan oleh kolom `content_type` (`article` atau `promo`). SQL kompatibel dengan tabel konten versi sebelumnya dan tidak menghapus isinya. Jika kamu sudah mempunyai tabel bernama sama tetapi struktur berbeda, periksa terlebih dahulu; script ini tidak mereset atau mengganti tabel yang ada.

SQL menambahkan tabel, index, policy RLS dan trigger updated_at untuk konten. Hak pengelolaan memakai `admin_users(id, role)` yang sudah dipakai login aplikasi. Publik hanya dapat membaca konten terbit. Tampilan publik menyaring tanggal mulai/selesai memakai waktu WITA.

**Jangan jalankan SQL migrasi pesanan atau script starter lama untuk update ini.** File yang diperlukan hanya SQL-ARTIKEL-PROMO.sql.

## Konten lokal yang sudah dibuat

Setelah SQL berhasil, gunakan browser dan domain yang sama dengan tempat kamu membuat artikel/promo sebelumnya. Di pengelolaan artikel atau promo, klik **Salin konten lokal ke Supabase**.

- Tombol ini menyalin artikel DAN promo dari key `smk_storefront_content_v1`.
- Proses tidak berjalan otomatis dan tidak menghapus salinan localStorage.
- ID konten yang sudah ada di Supabase dilewati, sehingga mencoba ulang tidak menimpa konten yang sudah diedit.
- Gambar lokal berbentuk data URL diunggah ke bucket `promotion-images`; tautan gambar yang sudah ada tetap dipertahankan.
- Jika proses berhenti sebagian karena koneksi/akses, konten yang sudah masuk tetap tersedia. Perbaiki kendala, lalu coba lagi; ID yang sudah tersimpan akan dilewati.
- Konten lokal hanya ada pada browser/domain asal. Kode atau ZIP tidak membawa isi localStorage dari laptopmu. Bila domain berbeda, lakukan penyalinan pada domain asal terlebih dahulu menggunakan kode terbaru.

Setelah penyalinan, perubahan berikutnya disimpan ke Supabase, bukan ke localStorage. Konten baru tersedia lintas perangkat saat halaman dimuat ulang. Draf tidak ditampilkan pada halaman publik. Menghapus konten melalui admin hanya menghapus baris yang dipilih; gambar storage tidak dihapus otomatis.

## Penyimpanan gambar

Upload artikel/promo memakai bucket `promotion-images` yang sudah dipakai banner. Script SQL tidak membuat ulang atau mengubah bucket maupun policy lama. Jika upload ditolak, periksa akses admin bucket tersebut. URL gambar tetap dapat dipakai. Format upload: JPG, PNG, WebP, GIF, maksimal 5 MB.

## Perbaikan Kelola Kategori

- Kartu dengan foto seragam, nama dan jumlah produk.
- Ringkasan jumlah kategori, kategori yang digunakan dan kategori dengan gambar.
- Pencarian nama dan filter semua/digunakan/belum digunakan.
- Form tambah kategori yang terpisah.
- Tombol ganti gambar dan hapus gambar tidak menumpuk dengan input file.
- Kategori yang masih digunakan produk tetap tidak bisa dihapus. Logika dan tabel kategori lama tetap dipakai.

## Validasi

Build TypeScript + Vite berhasil. Browser diuji pada lebar 1440, 768, 390 dan 320 px, mencakup navigasi publik, tujuh tab admin, pencarian/filter kategori, tombol hapus kategori yang digunakan, editor gambar, CRUD artikel/promo, serta penyalinan konten lokal dan percobaan ulang tanpa duplikasi. Pengujian menggunakan respons Supabase/storage simulasi, tanpa menulis ke server asli.

SQL dan policy belum dijalankan pada database produksi. Setelah aktivasi, coba satu artikel draf dari akun admin asli, pastikan dapat dimuat ulang, lalu terbitkan jika sudah sesuai. Build masih memiliki peringatan ukuran bundle, bukan error.

## Data lama

Produk, kategori, pesanan, pelanggan, banner, akun, bucket lama, dan salinan localStorage tidak dihapus/reset oleh update. Pengaturan informasi toko masih memakai penyimpanan yang sebelumnya sudah ada; update ini memindahkan artikel dan promo website ke Supabase.

ZIP tidak menyertakan node_modules atau riwayat .git. Folder dist adalah hasil build terbaru.
