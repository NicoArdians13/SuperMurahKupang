import React from "react";
import {
  ArrowRight,
  MessageCircle,
  Truck,
  Package,
  ShieldCheck,
  Store,
  MapPin,
  Clock,
  ShoppingBag,
  Flame,
  CheckCircle2,
  HelpCircle,
  Percent,
} from "lucide-react";
import { Product, MarketingSettings } from "../types";
import { openWhatsApp, STORE_PHONE_DISPLAY } from "../lib/whatsapp";
import { trackEvent } from "../lib/analytics";

interface PreCatalogProps {
  settings: MarketingSettings;
  featuredProducts: Product[];
  bestSellerProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  formatRupiah: (val: number) => string;
  priceNumber: (val: string) => number;
  getDefaultCategoryImage: (cat: string) => string;
  lowerPromotionUrl?: string;
}

export function PublicPreCatalogSections({
  settings,
  featuredProducts,
  bestSellerProducts,
  onSelectProduct,
  onAddToCart,
  formatRupiah,
  priceNumber,
  getDefaultCategoryImage,
  lowerPromotionUrl,
}: PreCatalogProps) {
  // Combine unique featured/best seller products
  const curatedProducts = React.useMemo(() => {
    const list: Product[] = [];
    const seen = new Set<number>();

    for (const p of [...bestSellerProducts, ...featuredProducts]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        list.push(p);
      }
    }
    return list.slice(0, 8);
  }, [bestSellerProducts, featuredProducts]);

  return (
    <>
      {/* ===================================================
          5. KENAPA BELANJA DI SUPER MURAH?
      =================================================== */}
      <section className="section shell" id="kenapa-super-murah" style={{ paddingTop: "60px", paddingBottom: "60px" }}>
        <div className="section-heading" style={{ marginBottom: "32px" }}>
          <div>
            <p className="eyebrow">Kenapa belanja di sini?</p>
            <h2>
              Belanja lebih mudah,
              <br />
              <em>harga tetap bersahabat.</em>
            </h2>
          </div>
          <p className="section-intro">
            Kami menyediakan perabot rumah tangga untuk kebutuhan rumah, toko, reseller, kos, dan usaha dengan
            pilihan pembelian ecer maupun grosir di Kupang.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              number: "01",
              title: "Harga Ecer & Grosir",
              desc: "Belanja satuan maupun dalam jumlah banyak dengan 3 tingkatan harga jelas: ecer, grosir (≥6 pcs), dan super grosir (≥36 pcs).",
            },
            {
              number: "02",
              title: "Pilihan Perabot Lengkap",
              desc: "Koleksi perabot dapur, kamar mandi, perabot plastik, rak susun, ember, perlengkapan kebersihan dan perabot rumah tangga.",
            },
            {
              number: "03",
              title: "Cocok untuk Toko & Reseller",
              desc: "Margin harga grosir yang sangat kompetitif membantu toko kelontong, pedagang pasar, dan reseller di Kupang dan sekitarnya.",
            },
            {
              number: "04",
              title: "Toko Fisik di Kupang",
              desc: "Lokasi toko mudah diakses di Jln. Timor Raya, Km. 10, Oesapa. Bisa datang langsung, cek mutu barang, atau dikirim armada toko.",
            },
          ].map((item) => (
            <div
              key={item.number}
              style={{
                border: "1px solid rgba(35, 35, 35, 0.10)",
                borderRadius: "16px",
                padding: "24px 20px",
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "190px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)" }}>
                {item.number}
              </span>
              <div style={{ marginTop: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--ink)", fontWeight: 700 }}>{item.title}</h3>
                <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.6, color: "var(--muted)" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================
          6. PRODUK PILIHAN / BEST SELLER (DATA NYATA)
      =================================================== */}
      {curatedProducts.length > 0 && (
        <section
          className="section shell"
          id="produk-pilihan"
          style={{ paddingTop: "10px", paddingBottom: "60px" }}
        >
          <div className="section-heading" style={{ marginBottom: "28px" }}>
            <div>
              <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Flame size={15} style={{ color: "#ea580c" }} /> Produk Pilihan & Terlaris
              </p>
              <h2>
                Rekomendasi{" "}
                <em>paling diminati.</em>
              </h2>
            </div>
            <p className="section-intro">
              Daftar produk favorit pilihan toko dan pelanggan di Kupang. Dapatkan harga ecer dan grosir terbaik.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            {curatedProducts.map((p) => {
              const retailVal = priceNumber(p.retail);
              const wholesaleVal = priceNumber(p.wholesale);
              const superWholesaleVal = priceNumber(p.superWholesale);

              return (
                <article
                  key={`curated-${p.id}`}
                  className="product-card"
                  style={{
                    background: "white",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1px solid var(--line)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ position: "relative", width: "100%", paddingTop: "75%", background: "#f8fafc" }}>
                    {p.badge && (
                      <span
                        className="badge"
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          zIndex: 2,
                        }}
                      >
                        {p.badge}
                      </span>
                    )}
                    <img
                      src={p.image || getDefaultCategoryImage(p.category)}
                      alt={p.name}
                      loading="lazy"
                      onClick={() => {
                        trackEvent("product_view", { productId: p.id, productName: p.name });
                        onSelectProduct(p);
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        cursor: "pointer",
                      }}
                    />
                  </div>

                  <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
                      {p.category} {p.product_code ? `• ${p.product_code}` : ""}
                    </span>
                    <h4
                      style={{
                        margin: "4px 0 10px",
                        fontSize: "14px",
                        lineHeight: 1.3,
                        color: "var(--ink)",
                        cursor: "pointer",
                      }}
                      onClick={() => onSelectProduct(p)}
                    >
                      {p.name}
                    </h4>

                    {/* Price Tiers */}
                    <div style={{ display: "grid", gap: "3px", fontSize: "12px", marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)" }}>Ecer:</span>
                        <strong style={{ color: "var(--ink)" }}>{formatRupiah(retailVal)}</strong>
                      </div>
                      {wholesaleVal > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#166534" }}>
                          <span>Grosir (≥6 pcs):</span>
                          <strong>{formatRupiah(wholesaleVal)}</strong>
                        </div>
                      )}
                      {superWholesaleVal > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#854d0e" }}>
                          <span>Super Grosir (≥36 pcs):</span>
                          <strong>{formatRupiah(superWholesaleVal)}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: "7px 10px", fontSize: "12px", justifyContent: "center" }}
                        onClick={() => {
                          trackEvent("add_to_cart", { productId: p.id, productName: p.name });
                          onAddToCart(p);
                        }}
                      >
                        + Keranjang
                      </button>
                      <button
                        type="button"
                        className="order-btn"
                        style={{ padding: "7px 10px", fontSize: "12px" }}
                        title="Beli via WhatsApp"
                        onClick={() => {
                          trackEvent("whatsapp_click", { intent: "product", target: p.name });
                          openWhatsApp("product", {
                            product: {
                              name: p.name,
                              code: p.product_code,
                              retailPrice: p.retail,
                              wholesalePrice: p.wholesale,
                            },
                          });
                        }}
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================================================
          7. PROMO SPESIAL (DARI TABEL PROMOTIONS)
      =================================================== */}
      {lowerPromotionUrl && (
        <section className="shell" style={{ marginBottom: "60px" }}>
          <div
            style={{
              background: "#26332c",
              borderRadius: "18px",
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              color: "white",
            }}
          >
            <div style={{ padding: "36px 30px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255,255,255,0.15)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  width: "fit-content",
                  marginBottom: "12px",
                }}
              >
                <Percent size={14} /> Promo Spesial Toko
              </div>
              <h3 style={{ margin: "0 0 12px", fontSize: "24px", lineHeight: 1.25, fontWeight: 700 }}>
                Penawaran Menarik Pekan Ini di Kupang
              </h3>
              <p style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: 1.6, opacity: 0.85 }}>
                Dapatkan promo harga khusus untuk berbagai perabot pilihan. Hubungi tim kami via WhatsApp untuk
                mengetahui ketersediaan stok promosi.
              </p>
              <button
                type="button"
                className="primary-btn light"
                style={{ width: "fit-content" }}
                onClick={() => {
                  trackEvent("whatsapp_click", { intent: "general", source: "promo_banner" });
                  openWhatsApp("general");
                }}
              >
                Tanya Promo via WhatsApp <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ minHeight: "220px", position: "relative" }}>
              <img
                src={lowerPromotionUrl}
                alt="Promo Spesial"
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          8. BELANJA GROSIR UNTUK TOKO & USAHA (B2B)
      =================================================== */}
      <section
        className="section shell"
        id="grosir"
        style={{
          background: "#faf9f4",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "44px 32px",
          marginBottom: "60px",
        }}
      >
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--sage)",
              color: "#26332c",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            <Store size={15} /> Layanan B2B & Kemitraan Toko
          </span>

          <h2 style={{ fontSize: "30px", lineHeight: 1.25, color: "var(--ink)", margin: "0 0 16px" }}>
            {settings.b2bHeading || "Punya Toko atau Usaha?"}
          </h2>

          <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--muted)", margin: "0 0 30px" }}>
            {settings.b2bDescription ||
              "SUPER MURAH KUPANG melayani pembelian partai besar untuk toko kelontong, pengecer perabot, pengelola kos, kontraktor, dan usaha kuliner. Dapatkan harga super grosir langsung dari pusat distributor."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              textAlign: "left",
              marginBottom: "32px",
            }}
          >
            <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <CheckCircle2 size={18} style={{ color: "#16a34a", marginBottom: "8px" }} />
              <strong style={{ display: "block", fontSize: "14px", color: "var(--ink)" }}>Harga Super Grosir</strong>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>Tier pembelian ≥36 pcs dengan selisih margin maksimal.</span>
            </div>
            <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <CheckCircle2 size={18} style={{ color: "#16a34a", marginBottom: "8px" }} />
              <strong style={{ display: "block", fontSize: "14px", color: "var(--ink)" }}>Stok Rutin & Lengkap</strong>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>Pasokan perabot stabil tanpa khawatir kehabisan barang jualan.</span>
            </div>
            <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <CheckCircle2 size={18} style={{ color: "#16a34a", marginBottom: "8px" }} />
              <strong style={{ display: "block", fontSize: "14px", color: "var(--ink)" }}>Pengambilan & Kirim</strong>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>Bisa ambil langsung di Oesapa atau diatur pengiriman armada toko.</span>
            </div>
          </div>

          <button
            type="button"
            className="primary-btn"
            style={{ padding: "14px 28px", fontSize: "15px" }}
            onClick={() => {
              trackEvent("wholesale_click", { source: "b2b_section" });
              openWhatsApp("wholesale");
            }}
          >
            <MessageCircle size={18} /> Hubungi Bagian Grosir (WhatsApp)
          </button>
        </div>
      </section>
    </>
  );
}

interface PostCatalogProps {
  settings: MarketingSettings;
  searchKeyword?: string;
}

export function PublicPostCatalogSections({ settings, searchKeyword }: PostCatalogProps) {
  return (
    <>
      {/* ===================================================
          11. TIDAK MENEMUKAN BARANG? (CTA KHUSUS)
      =================================================== */}
      {searchKeyword?.trim() && <section className="shell" style={{ marginTop: "40px", marginBottom: "60px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #e6f4ea 100%)",
            border: "1px solid #bbf7d0",
            borderRadius: "16px",
            padding: "30px 24px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", maxWidth: "600px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#16a34a",
                color: "white",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <HelpCircle size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "var(--ink)", fontWeight: 700 }}>
                Tidak menemukan barang yang Anda cari?
              </h3>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#374151" }}>
                Katalog di website terus diperbarui. Kami memiliki ribuan produk perabot lain yang siap di toko fisik
                Kupang. Tanyakan ketersediaan barang langsung kepada tim kami!
              </p>
            </div>
          </div>

          <button
            type="button"
            className="primary-btn"
            style={{ whiteSpace: "nowrap" }}
            onClick={() => {
              trackEvent("whatsapp_click", { intent: "not_found", keyword: searchKeyword || "" });
              openWhatsApp("not_found", { searchKeyword });
            }}
          >
            <MessageCircle size={16} /> Tanya via WhatsApp
          </button>
        </div>
      </section>}

      {/* ===================================================
          12. TESTIMONI / SOCIAL PROOF (DATA NYATA)
      =================================================== */}
      {settings.testimonials && settings.testimonials.length > 0 && (
        <section className="section shell" id="testimoni" style={{ paddingBottom: "60px" }}>
          <div className="section-heading" style={{ marginBottom: "28px" }}>
            <div>
              <p className="eyebrow">Apa kata pelanggan?</p>
              <h2>
                Dipercaya oleh{" "}
                <em>pelanggan Kupang.</em>
              </h2>
            </div>
            <p className="section-intro">
              Pengalaman nyata dari pemilik toko, pengelola kos, dan keluarga yang berbelanja perabot di toko kami.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: "18px",
            }}
          >
            {settings.testimonials.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "white",
                  border: "1px solid var(--line)",
                  borderRadius: "16px",
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: "#eab308", fontSize: "15px", marginBottom: "10px" }}>
                    {"★".repeat(Math.max(0, Math.min(5, Math.round(Number(t.rating) || 5))))}
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.7, color: "var(--ink)", fontStyle: "italic" }}>
                    "{t.text}"
                  </p>
                </div>
                <div style={{ marginTop: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <strong style={{ display: "block", fontSize: "14px", color: "var(--ink)" }}>{t.name}</strong>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {t.role} {t.location ? `• ${t.location}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===================================================
          13. TOKO FISIK & LOKASI
      =================================================== */}
      <section
        className="section shell"
        id="lokasi"
        style={{
          paddingBottom: "60px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "36px 30px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "30px",
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              <Store size={15} /> Toko Fisik Resmi
            </span>
            <h3 style={{ margin: "0 0 14px", fontSize: "26px", color: "var(--ink)", fontWeight: 700 }}>
              {settings.storeName || "SUPER MURAH KUPANG"}
            </h3>

            <div style={{ display: "grid", gap: "12px", fontSize: "14px", color: "#374151", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <MapPin size={18} style={{ color: "#dc2626", marginTop: "2px", flexShrink: 0 }} />
                <span>
                  <strong>Alamat:</strong>
                  <br />
                  {settings.storeAddress || "Jln. Timor Raya, Km. 10, Oesapa, Kupang, NTT"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <Clock size={18} style={{ color: "#2563eb", marginTop: "2px", flexShrink: 0 }} />
                <span>
                  <strong>Jam Operasional:</strong>
                  <br />
                  {settings.storeHours || "Senin – Sabtu: 08.00 – 18.00 WITA (Minggu Libur)"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <MessageCircle size={18} style={{ color: "#16a34a", marginTop: "2px", flexShrink: 0 }} />
                <span>
                  <strong>Layanan Toko:</strong>
                  <br />
                  Pembelian Eceran, Belanja Grosir Langsung, Layanan Ambil di Toko (Pick Up), Pengantaran Armada Toko
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a
                href={settings.storeMapsUrl || "https://maps.google.com/?q=Oesapa+Kupang"}
                target="_blank"
                rel="noreferrer"
                className="primary-btn"
                style={{ padding: "10px 18px", fontSize: "13px" }}
              >
                <MapPin size={15} /> Petunjuk Arah Google Maps
              </a>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: "10px 18px", fontSize: "13px" }}
                onClick={() => {
                  trackEvent("whatsapp_click", { intent: "store_info" });
                  openWhatsApp("store_info");
                }}
              >
                <MessageCircle size={15} /> Tanya Alamat via WA
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--sage)",
                color: "#26332c",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Store size={28} />
            </div>
            <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "var(--ink)" }}>Kunjungi Toko Kami di Oesapa</h4>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>
              Pilih langsung produk yang Anda inginkan. Ribuan pilihan perabot rumah tangga dengan harga grosir dan ecer
              termurah siap dibawa pulang.
            </p>
            <div
              style={{
                padding: "8px 12px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              📞 Hotline Toko: {settings.storePhone || STORE_PHONE_DISPLAY}
            </div>
          </div>
        </div>
      </section>


    </>
  );
}

