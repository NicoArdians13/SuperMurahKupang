import { MarketingSettings } from "../types";

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  announcementActive: true,
  announcementText:
    "📦 Pusat Grosir Perabot Rumah Tangga Kupang | Melayani Ecer, Grosir & Partai Besar | Toko Fisik di Oesapa",
  promoActive: true,
  heroBadge: "Pusat Grosir Perabot Rumah Tangga di Kupang",
  heroHeadingPrimary: "Perabot lengkap,",
  heroHeadingAccent: "harga super murah.",
  heroDescription:
    "Temukan berbagai kebutuhan perabot rumah tangga dengan pilihan harga ecer, grosir, dan super grosir. Cocok untuk rumah, toko, reseller, kos-kosan, dan usaha.",
  b2bHeading: "Punya Toko atau Usaha?",
  b2bDescription:
    "Kami siap menjadi mitra pasokan perabot Anda di Kupang dan sekitarnya. Dapatkan penawaran harga grosir khusus, ketersediaan stok konsisten, dan kemudahan pengambilan maupun pengantaran.",
  storeName: "SUPER MURAH KUPANG",
  storeAddress: "Jln. Timor Raya, Km. 10, Oesapa, Kupang, NTT",
  storeHours: "Senin – Sabtu: 08.00 – 18.00 WITA (Minggu Libur)",
  storePhone: "085755463065",
  storeMapsUrl: "https://maps.google.com/?q=Oesapa+Kupang+Timor+Raya",
  whatsappCtaCatalog:
    "Halo SUPER MURAH KUPANG, saya ingin tanya info katalog dan ketersediaan stok produk.",
  whatsappCtaWholesale:
    "Halo SUPER MURAH KUPANG, saya pemilik toko/usaha ingin tanya harga grosir dan pembelian partai besar.",
  testimonials: [
    {
      id: "testi-1",
      name: "Ibu Maria",
      role: "Pemilik Toko Kelontong",
      location: "Oesapa, Kupang",
      rating: 5,
      text: "Ambil barang grosir di Super Murah Kupang sangat membantu modal toko saya. Harganya bersahabat, barang perabot plastiknya cepat laku.",
    },
    {
      id: "testi-2",
      name: "Bapak Hendrik",
      role: "Pengelola Kos-Kosan",
      location: "Penfui, Kupang",
      rating: 5,
      text: "Waktu isi perabot untuk 12 kamar kos, belanja di sini dapat harga grosir bertingkat. Hemat banyak dan stafnya ramah melayani.",
    },
    {
      id: "testi-3",
      name: "Mama Yanti",
      role: "Ibu Rumah Tangga & Reseller",
      location: "Maulafa, Kupang",
      rating: 5,
      text: "Bisa beli ecer tapi harganya tetap murah. Kalau kumpul pesanan tetangga bisa dapat harga grosir. Lokasi toko mudah diakses.",
    },
  ],
};

const STORAGE_KEY = "smk_marketing_settings";

export function loadMarketingSettings(): MarketingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MARKETING_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MARKETING_SETTINGS,
      ...parsed,
      testimonials: Array.isArray(parsed.testimonials)
        ? parsed.testimonials
        : DEFAULT_MARKETING_SETTINGS.testimonials,
    };
  } catch (err) {
    console.warn("Gagal memuat setting marketing:", err);
    return DEFAULT_MARKETING_SETTINGS;
  }
}

export function saveMarketingSettings(settings: MarketingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Gagal menyimpan setting marketing:", err);
  }
}

