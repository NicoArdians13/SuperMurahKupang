import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  MessageCircle,
  Pencil,
  FileText,
  Building2,
  Calendar,
  X,
  CreditCard,
  ShoppingBag,
  Clock,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import { Customer, StoreOrder } from "../types";
import { openWhatsApp } from "../lib/whatsapp";

interface AdminCustomersTabProps {
  customers: Customer[];
  orders: StoreOrder[];
  onOpenNewCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onViewOrderReceipt: (order: StoreOrder) => void;
}

export function AdminCustomersTab({
  customers,
  orders,
  onOpenNewCustomer,
  onEditCustomer,
  onViewOrderReceipt,
}: AdminCustomersTabProps) {
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState<"all" | "active" | "vip" | "followup">("all");
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  // Calculate customer statistics
  const customerStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        totalOrders: number;
        totalSpent: number;
        lastOrderDate: string;
        daysSinceLastOrder: number | null;
        isActive: boolean;
        isVip: boolean;
        needsFollowup: boolean;
        orders: StoreOrder[];
      }
    >();

    const todayMs = Date.now();

    for (const c of customers) {
      const cOrders = orders.filter(
        (o) =>
          o.customerId === c.id ||
          (o.storeName && o.storeName.toLowerCase() === c.name.toLowerCase()),
      );

      const totalSpent = cOrders.reduce(
        (sum, o) =>
          sum +
          o.items.reduce((iSum, item) => iSum + item.price * item.quantity, 0),
        0,
      );

      const dates = cOrders.map((o) => o.orderDate).sort().reverse();
      const lastOrderDate = dates[0] || "-";

      let daysSinceLastOrder: number | null = null;
      if (dates[0]) {
        const lastMs = new Date(dates[0]).getTime();
        daysSinceLastOrder = Math.max(0, Math.floor((todayMs - lastMs) / (1000 * 60 * 60 * 24)));
      }

      const isActive = lastOrderDate !== "-" && lastOrderDate >= thirtyDaysAgoStr;
      const isVip = totalSpent >= 5000000 || cOrders.length >= 3;
      const needsFollowup = !isActive || cOrders.length === 0;

      stats.set(c.id, {
        totalOrders: cOrders.length,
        totalSpent,
        lastOrderDate,
        daysSinceLastOrder,
        isActive,
        isVip,
        needsFollowup,
        orders: cOrders,
      });
    }

    return stats;
  }, [customers, orders, thirtyDaysAgoStr]);

  // Overall KPI counts
  const kpis = useMemo(() => {
    let activeCount = 0;
    let vipCount = 0;
    let followupCount = 0;

    for (const stat of customerStats.values()) {
      if (stat.isActive) activeCount++;
      if (stat.isVip) vipCount++;
      if (stat.needsFollowup) followupCount++;
    }

    return {
      total: customers.length,
      active: activeCount,
      vip: vipCount,
      followup: followupCount,
    };
  }, [customers, customerStats]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return customers.filter((c) => {
      const stat = customerStats.get(c.id);

      // Filter by segment tab
      if (filterSegment === "active" && !stat?.isActive) return false;
      if (filterSegment === "vip" && !stat?.isVip) return false;
      if (filterSegment === "followup" && !stat?.needsFollowup) return false;

      // Filter by search query
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = (c.whatsapp || "").toLowerCase().includes(q);
        const matchAddr = (c.address || "").toLowerCase().includes(q);
        const matchNotes = (c.notes || "").toLowerCase().includes(q);
        return matchName || matchPhone || matchAddr || matchNotes;
      }

      return true;
    });
  }, [customers, search, filterSegment, customerStats]);

  const getSegmentBadge = (stat: { isVip: boolean; isActive: boolean; totalOrders: number; totalSpent: number }) => {
    if (stat.isVip) {
      return { label: "VIP / Grosir", bg: "#fef3c7", color: "#b45309", icon: Star };
    }
    if (stat.isActive && stat.totalOrders >= 2) {
      return { label: "Langganan Aktif", bg: "#dbeafe", color: "#1d4ed8", icon: CheckCircle2 };
    }
    if (stat.isActive) {
      return { label: "Pelanggan Aktif", bg: "#dcfce7", color: "#15803d", icon: CheckCircle2 };
    }
    if (stat.totalOrders === 0) {
      return { label: "Pelanggan Baru", bg: "#f3f4f6", color: "#4b5563", icon: Sparkles };
    }
    return { label: "Perlu Follow-up", bg: "#fee2e2", color: "#b91c1c", icon: AlertCircle };
  };

  const selectedStats = selectedCustomerForHistory
    ? customerStats.get(selectedCustomerForHistory.id)
    : null;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* 1. TOP KPI SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: "14px",
        }}
      >
        {/* Total Pelanggan */}
        <div
          onClick={() => setFilterSegment("all")}
          style={{
            background: "white",
            padding: "16px 18px",
            borderRadius: "12px",
            border: `1.5px solid ${filterSegment === "all" ? "var(--ink)" : "var(--line)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Total Pelanggan
            </span>
            <strong style={{ display: "block", fontSize: "20px", color: "var(--ink)" }}>{kpis.total}</strong>
            <small style={{ fontSize: "11px", color: "var(--muted)" }}>Semua mitra & pembeli</small>
          </div>
        </div>

        {/* Pelanggan Aktif */}
        <div
          onClick={() => setFilterSegment("active")}
          style={{
            background: "white",
            padding: "16px 18px",
            borderRadius: "12px",
            border: `1.5px solid ${filterSegment === "active" ? "#16a34a" : "var(--line)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#16a34a",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Pelanggan Aktif
            </span>
            <strong style={{ display: "block", fontSize: "20px", color: "#16a34a" }}>{kpis.active}</strong>
            <small style={{ fontSize: "11px", color: "var(--muted)" }}>Order &lt; 30 hari terakhir</small>
          </div>
        </div>

        {/* VIP / Langganan */}
        <div
          onClick={() => setFilterSegment("vip")}
          style={{
            background: "white",
            padding: "16px 18px",
            borderRadius: "12px",
            border: `1.5px solid ${filterSegment === "vip" ? "#d97706" : "var(--line)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fef3c7",
              color: "#d97706",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Star size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
              VIP / Langganan
            </span>
            <strong style={{ display: "block", fontSize: "20px", color: "#d97706" }}>{kpis.vip}</strong>
            <small style={{ fontSize: "11px", color: "var(--muted)" }}>≥3 order atau ≥5jt</small>
          </div>
        </div>

        {/* Perlu Follow-up */}
        <div
          onClick={() => setFilterSegment("followup")}
          style={{
            background: "white",
            padding: "16px 18px",
            borderRadius: "12px",
            border: `1.5px solid ${filterSegment === "followup" ? "#dc2626" : "var(--line)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Perlu Follow-up
            </span>
            <strong style={{ display: "block", fontSize: "20px", color: "#dc2626" }}>{kpis.followup}</strong>
            <small style={{ fontSize: "11px", color: "var(--muted)" }}>&gt;30 hari tanpa order</small>
          </div>
        </div>
      </div>

      {/* 2. HEADER ACTIONS & FILTER TABS */}
      <div
        style={{
          background: "white",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Segment Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: `Semua (${kpis.total})` },
            { id: "active", label: `Aktif (${kpis.active})` },
            { id: "vip", label: `VIP / Grosir (${kpis.vip})` },
            { id: "followup", label: `Perlu Follow-up (${kpis.followup})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterSegment(tab.id as any)}
              style={{
                border: "none",
                background: filterSegment === tab.id ? "var(--ink)" : "#f1f5f9",
                color: filterSegment === tab.id ? "white" : "var(--ink)",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Add Customer */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f9fafb",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "6px 12px",
            }}
          >
            <Search size={15} style={{ color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Cari toko / WA / alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                width: "180px",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button className="primary-btn" onClick={onOpenNewCustomer} style={{ padding: "8px 14px", fontSize: "13px" }}>
            <Plus size={15} /> Tambah Toko
          </button>
        </div>
      </div>

      {/* 3. CUSTOMER LIST TABLE */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <tr>
                <th style={{ padding: "12px 16px" }}>Nama Toko / Pelanggan</th>
                <th style={{ padding: "12px 16px" }}>WhatsApp</th>
                <th style={{ padding: "12px 16px" }}>Segmentasi</th>
                <th style={{ padding: "12px 16px" }}>Total Order</th>
                <th style={{ padding: "12px 16px" }}>Total Pembelian</th>
                <th style={{ padding: "12px 16px" }}>Order Terakhir</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px", textAlign: "center", color: "var(--muted)" }}>
                    Tidak ada toko / pelanggan yang sesuai filter ini.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const stat = customerStats.get(c.id) || {
                    totalOrders: 0,
                    totalSpent: 0,
                    lastOrderDate: "-",
                    daysSinceLastOrder: null,
                    isActive: false,
                    isVip: false,
                    needsFollowup: true,
                    orders: [],
                  };
                  const badge = getSegmentBadge(stat);
                  const Icon = badge.icon;

                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "#f1f5f9",
                              display: "grid",
                              placeItems: "center",
                              color: "var(--muted)",
                              flexShrink: 0,
                            }}
                          >
                            <Building2 size={16} />
                          </div>
                          <div>
                            <strong style={{ color: "var(--ink)", display: "block" }}>{c.name}</strong>
                            {c.address && (
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                                {c.address}
                              </span>
                            )}
                            {c.notes && (
                              <small style={{ fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>
                                "{c.notes}"
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        {c.whatsapp ? (
                          <button
                            type="button"
                            onClick={() =>
                              openWhatsApp("customer", {
                                customerPhone: c.whatsapp,
                                customMessage: `Halo ${c.name}, kami dari SUPER MURAH KUPANG ingin menginformasikan update ketersediaan stok produk perabot dan penawaran harga grosir terbaru untuk toko Anda. 🙏`,
                              })
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              background: "#f0fdf4",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "12px",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            title="Chat WhatsApp dengan toko ini"
                          >
                            <MessageCircle size={13} /> {c.whatsapp}
                          </button>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "12px" }}>-</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: badge.bg,
                            color: badge.color,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          <Icon size={12} /> {badge.label}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{stat.totalOrders} pesanan</td>

                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ink)" }}>
                        Rp{stat.totalSpent.toLocaleString("id-ID")}
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                        {stat.lastOrderDate !== "-" ? (
                          <div>
                            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{stat.lastOrderDate}</span>
                            {stat.daysSinceLastOrder !== null && (
                              <small
                                style={{
                                  display: "block",
                                  fontSize: "10px",
                                  color: stat.daysSinceLastOrder > 30 ? "#dc2626" : "var(--muted)",
                                }}
                              >
                                {stat.daysSinceLastOrder === 0
                                  ? "Hari ini"
                                  : `${stat.daysSinceLastOrder} hari lalu`}
                              </small>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>Belum ada</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {c.whatsapp && (
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{
                                padding: "5px 8px",
                                fontSize: "11px",
                                background: "#f0fdf4",
                                color: "#16a34a",
                                borderColor: "#bbf7d0",
                              }}
                              onClick={() =>
                                openWhatsApp("customer", {
                                  customerPhone: c.whatsapp,
                                  customMessage: `Halo ${c.name}, salam dari SUPER MURAH KUPANG! Ada kebutuhan perabot atau barang toko yang perlu di-restock minggu ini?`,
                                })
                              }
                              title="Kirim pesan follow-up WA"
                            >
                              <PhoneCall size={12} /> Follow-up
                            </button>
                          )}
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: "5px 8px", fontSize: "11px" }}
                            onClick={() => setSelectedCustomerForHistory(c)}
                            title="Lihat riwayat pesanan"
                          >
                            <FileText size={12} /> Riwayat
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: "5px 8px", fontSize: "11px" }}
                            onClick={() => onEditCustomer(c)}
                            title="Edit toko"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CUSTOMER ORDER HISTORY MODAL */}
      {selectedCustomerForHistory && selectedStats && (
        <div className="editor-overlay" onClick={() => setSelectedCustomerForHistory(null)}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "700px",
              maxHeight: "85vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Riwayat Transaksi Pelanggan
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "18px", color: "var(--ink)" }}>
                  {selectedCustomerForHistory.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {/* Summary Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total Belanja Akumulatif:</span>
                  <strong style={{ display: "block", fontSize: "18px", color: "var(--ink)" }}>
                    Rp{selectedStats.totalSpent.toLocaleString("id-ID")}
                  </strong>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Frekuensi Order:</span>
                  <strong style={{ display: "block", fontSize: "18px", color: "var(--ink)" }}>
                    {selectedStats.totalOrders} kali
                  </strong>
                </div>
              </div>

              <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Daftar Nota Pesanan:</h4>
              {selectedStats.orders.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "13px" }}>Belum ada pesanan yang tercatat untuk toko ini.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {selectedStats.orders.map((ord) => {
                    const total = ord.items.reduce((s, it) => s + it.price * it.quantity, 0);
                    return (
                      <div
                        key={ord.id}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#fafafa",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: "13px" }}>No. {ord.id}</strong>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {ord.orderDate} • {ord.items.length} macam barang
                          </span>
                        </div>
                        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "12px" }}>
                          <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                            Rp{total.toLocaleString("id-ID")}
                          </strong>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              setSelectedCustomerForHistory(null);
                              onViewOrderReceipt(ord);
                            }}
                          >
                            Buka Nota
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
