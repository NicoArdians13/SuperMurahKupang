import { loadMarketingSettings } from "./marketingSettings";

/**
 * WhatsApp conversion helper for SUPER MURAH KUPANG
 * Official store number: 085755463065 / 6285755463065
 */

export const STORE_PHONE_NUMBER = "6285755463065";
export const STORE_PHONE_DISPLAY = "085755463065";

export function normalizeWhatsAppPhone(value: string): string {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return digits || STORE_PHONE_NUMBER;
}

export type WhatsAppIntent =
  | "general"
  | "product"
  | "wholesale"
  | "not_found"
  | "checkout"
  | "store_info"
  | "customer"
  | "custom";

export interface WhatsAppProductData {
  name: string;
  code?: string | null;
  category?: string;
  retailPrice?: string;
  wholesalePrice?: string;
}

export interface WhatsAppCheckoutItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface WhatsAppCheckoutData {
  items: WhatsAppCheckoutItem[];
  totalQuantity: number;
  totalPriceFormatted: string;
  tierLabel: string;
}

export function buildWhatsAppUrl(
  intent: WhatsAppIntent,
  data?: {
    product?: WhatsAppProductData;
    checkout?: WhatsAppCheckoutData;
    searchKeyword?: string;
    customerPhone?: string;
    customMessage?: string;
  },
): string {
  let targetPhone = normalizeWhatsAppPhone(loadMarketingSettings().storePhone);
  let message = "";

  switch (intent) {
    case "product": {
      const p = data?.product;
      message =
        `Halo SUPER MURAH KUPANG, saya tertarik dengan produk:\n\n` +
        `*${p?.name || "Produk"}*\n` +
        (p?.code ? `Kode Barang: ${p.code}\n` : "") +
        (p?.retailPrice ? `Harga Ecer: ${p.retailPrice}\n` : "") +
        (p?.wholesalePrice ? `Harga Grosir: ${p.wholesalePrice}\n` : "") +
        `\nApakah stok barang ini masih tersedia di toko fisik Kupang?`;
      break;
    }

    case "wholesale": {
      message =
        `Halo SUPER MURAH KUPANG,\n` +
        `Saya pemilik toko/usaha/reseller dan ingin berkonsultasi mengenai:\n` +
        `- Pembelian perabot dalam jumlah grosir/partai besar\n` +
        `- Katalog & daftar harga super grosir\n` +
        `- Syarat dan ketentuan pemesanan rutin\n\n` +
        `Mohon informasi lebih lanjut. Terima kasih!`;
      break;
    }

    case "not_found": {
      const kw = data?.searchKeyword ? `"${data.searchKeyword}"` : "barang tertentu";
      message =
        `Halo SUPER MURAH KUPANG,\n` +
        `Saya mencari produk ${kw} di website tetapi belum menemukannya.\n` +
        `Apakah barang tersebut tersedia di toko fisik Oesapa Kupang?`;
      break;
    }

    case "checkout": {
      const c = data?.checkout;
      if (!c) {
        message = `Halo SUPER MURAH KUPANG, saya ingin melakukan pemesanan via WhatsApp.`;
        break;
      }

      const itemLines = c.items
        .map(
          (item) =>
            `- ${item.name} (${item.quantity} pcs) = Rp${item.subtotal.toLocaleString("id-ID")}`,
        )
        .join("\n");

      message =
        `Halo SUPER MURAH KUPANG, saya ingin checkout pesanan berikut:\n\n` +
        `${itemLines}\n\n` +
        `Total Barang: ${c.totalQuantity} pcs\n` +
        `Kategori Harga: ${c.tierLabel}\n` +
        `Total Belanja: ${c.totalPriceFormatted}\n\n` +
        `Nama Pemesan: \n` +
        `No. WhatsApp: \n` +
        `Alamat / Ambil di Toko: `;
      break;
    }

    case "store_info": {
      message =
        `Halo SUPER MURAH KUPANG,\n` +
        `Saya ingin menanyakan jam operasional dan petunjuk arah ke toko fisik di Jln. Timor Raya, Km. 10, Oesapa Kupang.`;
      break;
    }

    case "customer": {
      if (data?.customerPhone) {
        let clean = data.customerPhone.replace(/[^0-9]/g, "");
        if (clean.startsWith("0")) clean = "62" + clean.slice(1);
        if (clean.startsWith("8")) clean = "62" + clean;
        targetPhone = clean;
      }
      message =
        data?.customMessage ||
        `Halo, kami dari SUPER MURAH KUPANG menghubungi terkait pesanan Anda.`;
      break;
    }

    case "custom": {
      message = data?.customMessage || "Halo SUPER MURAH KUPANG";
      break;
    }

    case "general":
    default: {
      message =
        `Halo SUPER MURAH KUPANG, saya ingin bertanya tentang produk dan belanja perabot rumah tangga.`;
      break;
    }
  }

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(
  intent: WhatsAppIntent,
  data?: {
    product?: WhatsAppProductData;
    checkout?: WhatsAppCheckoutData;
    searchKeyword?: string;
    customerPhone?: string;
    customMessage?: string;
  },
): void {
  const url = buildWhatsAppUrl(intent, data);
  window.open(url, "_blank", "noopener,noreferrer");
}

