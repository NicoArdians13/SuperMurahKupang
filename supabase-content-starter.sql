-- Artikel awal dan draf promo untuk tabel baru.
-- Opsional: jalankan SETELAH supabase-storefront-content.sql.
-- Hanya menambah konten baru; tidak menimpa konten yang sudah diedit.
insert into public.storefront_content (id, content_type, title, summary, body, image_url, published) values
('2b1f9870-7680-4f6c-84b5-28d61b765101', 'article', 'Memilih lemari yang sesuai dengan ruang Anda',
'Ukur ruang, perhatikan kebutuhan penyimpanan, dan pilih lemari yang nyaman dipakai setiap hari.',
'Ukur ruang sebelum memilih
Catat lebar, kedalaman, dan tinggi tempat lemari akan diletakkan. Sisakan ruang untuk membuka pintu, berjalan, dan membersihkan bagian sekitarnya.

Sesuaikan dengan isi lemari
Pisahkan kebutuhan untuk pakaian gantung, pakaian lipat, serta barang kecil. Susunan rak yang sesuai membantu barang lebih mudah ditemukan.

Periksa detail produk
Lihat ukuran, susunan pintu dan rak, bahan, serta cara perawatannya. Jika informasi belum lengkap di katalog, catat kode barang yang ingin Anda tanyakan saat memesan.

Pertimbangkan akses masuk
Pastikan lemari dapat melewati pintu dan jalur menuju tempatnya. Untuk kebutuhan pengiriman atau perakitan, konfirmasikan terlebih dahulu sebelum membuat pesanan.', '', true),
('2b1f9870-7680-4f6c-84b5-28d61b765102', 'article', 'Dapur lebih rapi dengan penyimpanan sederhana',
'Atur perlengkapan berdasarkan kebiasaan memasak agar dapur tetap nyaman dan mudah dibersihkan.',
'Mulai dari barang yang paling sering dipakai
Letakkan alat memasak harian di tempat yang mudah dijangkau. Barang yang jarang dipakai dapat ditempatkan di rak yang lebih tinggi atau di bagian belakang.

Kelompokkan sesuai fungsi
Pisahkan perlengkapan makan, alat memasak, bahan kering, dan alat kebersihan. Pengelompokan sederhana ini membantu seluruh anggota keluarga mengembalikan barang ke tempatnya.

Pilih ukuran yang tepat
Ukur ruang rak atau meja sebelum membeli wadah dan tempat penyimpanan. Pastikan ukuran produk sesuai dengan tempat yang tersedia, bukan hanya tampilannya.

Sisakan ruang untuk membersihkan
Hindari mengisi rak terlalu padat. Periksa petunjuk perawatan masing-masing produk dan bersihkan secara rutin sesuai bahan serta penggunaannya.', '', true),
('2b1f9870-7680-4f6c-84b5-28d61b765103', 'article', 'Menyusun daftar belanja perabot untuk usaha',
'Rencanakan kebutuhan, jumlah, dan anggaran sebelum membeli perlengkapan toko atau usaha.',
'Tulis kebutuhan utama
Buat daftar barang berdasarkan aktivitas usaha. Bedakan barang yang harus tersedia sejak awal dengan perlengkapan tambahan yang dapat dibeli bertahap.

Hitung jumlah pemakaian
Perkirakan kebutuhan harian, kapasitas penyimpanan, dan jumlah orang yang menggunakan barang. Hindari membeli jumlah besar hanya karena tertarik pada tampilan produk.

Bandingkan biaya keseluruhan
Catat harga satuan, jumlah pembelian, dan kebutuhan pengiriman atau pemasangan. Konfirmasikan harga, ketersediaan, dan ketentuan pembelian sebelum menyelesaikan pesanan.

Simpan catatan pemesanan
Gunakan kode atau nama barang yang jelas agar pesanan mudah diperiksa. Setelah menerima barang, cocokkan jumlah dan jenisnya dengan catatan pembelian.', '', true),
('2b1f9870-7680-4f6c-84b5-28d61b765104', 'promo', 'Promo pilihan minggu ini',
'Lengkapi informasi penawaran toko sebelum diterbitkan.',
'Draf promo: tulis nama produk yang termasuk promo, harga atau manfaat yang benar, periode berlaku, dan syarat pembelian. Unggah gambar milik toko, lalu centang Terbitkan di website setelah semua informasi sesuai.', '', false)
on conflict (id) do nothing;
