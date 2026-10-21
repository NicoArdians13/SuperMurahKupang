import { useState, useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  Calendar,
  Eye,
  Search,
  MessageCircle,
  Clock,
  ArrowUpRight,
  Flame,
  AlertCircle,
  CreditCard,
  Plus,
  FileSpreadsheet,
  Receipt,
  Sparkles,
  Users,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { StoreOrder, Product } from "../types";
import { getAnalyticsSummary } from "../lib/analytics";

interface AdminOverviewTabProps {
  orders: StoreOrder[];
  products: Product[];
  onNavigateToTab: (tab: any) => void;
  onOpenProductEditor?: () => void;
  onOpenExcelImport?: () => void;
  onNewOrder?: () => void;
  onOpenMarketing?: () => void;
}

export function AdminOverviewTab({
  orders,
  products,
  onNavigateToTab,
  onOpenProductEditor,
  onOpenExcelImport,
  onNewOrder,
  onOpenMarketing,
}: AdminOverviewTabProps) {
  const [chartRange, setChartRange] = useState<"7days" | "30days">("7days");
  const analytics = useMemo(() => getAnalyticsSummary(), [orders, products]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const monthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Aggregate stats
  const metrics = useMemo(() => {
    let revenueToday = 0;
    let revenueMonth = 0;
    let totalItemsSold = 0;
    let pendingDeliveryCount = 0;
    let unpaidCount = 0;
    let unpaidTotal = 0;

    for (const o of orders) {
      const orderSum = o.items.reduce((s, it) => s + it.price * it.quantity, 0);
      const orderQty = o.items.reduce((s, it) => s + it.quantity, 0);

      if (o.orderDate === todayStr) {
        revenueToday += orderSum;
      }
      if (o.orderDate.startsWith(monthStr)) {
        revenueMonth += orderSum;
      }
      totalItemsSold += orderQty;

      if (o.deliveryStatus === "belum_diantar" || o.deliveryStatus === "diantar") {
        pendingDeliveryCount++;
      }

      if (o.paymentStatus === "belum_bayar" || o.paymentStatus === "piutang") {
        unpaidCount++;
        unpaidTotal += orderSum;
      }
    }

    return {
      revenueToday,
      revenueMonth,
      totalOrders: orders.length,
      pendingDeliveryCount,
      unpaidCount,
      unpaidTotal,
      totalItemsSold,
    };
  }, [orders, todayStr, monthStr]);

  // Best selling products from actual orders
  const topOrderedProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; totalSales: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const key = item.productName || "Produk";
        const prev = map.get(key) || { name: key, quantity: 0, totalSales: 0 };
        map.set(key, {
          name: key,
          quantity: prev.quantity + item.quantity,
          totalSales: prev.totalSales + item.price * item.quantity,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  // Top Active Customers
  const topActiveCustomers = useMemo(() => {
    const customerMap = new Map<
      string,
      { name: string; orderCount: number; totalSpend: number; lastDate: string }
    >();

    for (const o of orders) {
      const name = o.storeName.trim() || "Pelanggan Umum";
      const total = o.items.reduce((s, it) => s + it.price * it.quantity, 0);
      const prev = customerMap.get(name) || {
        name,
        orderCount: 0,
        totalSpend: 0,
        lastDate: o.orderDate,
      };

      customerMap.set(name, {
        name,
        orderCount: prev.orderCount + 1,
        totalSpend: prev.totalSpend + total,
        lastDate: o.orderDate > prev.lastDate ? o.orderDate : prev.lastDate,
      });
    }

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);
  }, [orders]);

  // Recent Orders (last 5)
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  // Sales Chart Data (7 or 30 days)
  const chartData = useMemo(() => {
    const daysCount = chartRange === "7days" ? 7 : 30;
    const result: { dateStr: string; label: string; amount: number; count: number }[] = [];

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dayOrders = orders.filter((o) => o.orderDate === dateStr);
      const amount = dayOrders.reduce(
        (sum, o) =>
          sum + o.items.reduce((iSum, it) => iSum + it.price * it.quantity, 0),
        0,
      );

      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      result.push({ dateStr, label, amount, count: dayOrders.length });
    }

    return result;
  }, [orders, chartRange]);

  const maxChartAmount = Math.max(...chartData.map((d) => d.amount), 100000);
  const totalChartRevenue = chartData.reduce((s, d) => s + d.amount, 0);
  const avgChartRevenue = Math.round(totalChartRevenue / chartData.length);

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* QUICK ACTIONS BAR */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "16px 20px",
          border: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>
            Aksi Cepat Manajemen Toko
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Akses langsung untuk input katalog, import partai, catat pesanan, dan promo.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {onOpenProductEditor && (
            <button
              type="button"
              className="secondary-btn"
              onClick={onOpenProductEditor}
              style={{ fontSize: "12px", padding: "8px 14px" }}
            >
              <Plus size={14} /> Tambah Produk
            </button>
          )}

          {onOpenExcelImport && (
            <button
              type="button"
              className="secondary-btn"
              onClick={onOpenExcelImport}
              style={{ fontSize: "12px", padding: "8px 14px" }}
            >
              <FileSpreadsheet size={14} /> Import Excel
            </button>
          )}

          {onNewOrder && (
            <button
              type="button"
              className="primary-btn"
              onClick={onNewOrder}
              style={{ fontSize: "12px", padding: "8px 14px" }}
            >
              <Receipt size={14} /> Catat Pesanan
            </button>
          )}

          {onOpenMarketing && (
            <button
              type="button"
              className="secondary-btn"
              onClick={onOpenMarketing}
              style={{ fontSize: "12px", padding: "8px 14px" }}
            >
              <Sparkles size={14} /> Kelola Marketing
            </button>
          )}
        </div>
      </div>

      {/* 1. TOP METRICS ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "14px",
        }}
      >
        {/* Omzet Hari Ini */}
        <div
          style={{
            background: "white",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "12px" }}>
            <span>Omzet Hari Ini</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center" }}>
              <DollarSign size={16} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "22px", color: "var(--ink)", marginTop: "6px" }}>
            Rp{metrics.revenueToday.toLocaleString("id-ID")}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Tanggal: {todayStr}</span>
        </div>

        {/* Omzet Bulan Ini */}
        <div
          style={{
            background: "white",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "12px" }}>
            <span>Omzet Bulan Ini</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "22px", color: "var(--ink)", marginTop: "6px" }}>
            Rp{metrics.revenueMonth.toLocaleString("id-ID")}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Bulan: {monthStr}</span>
        </div>

        {/* Jumlah Transaksi & Perlu Diproses */}
        <div
          style={{
            background: "white",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "12px" }}>
            <span>Pesanan Toko</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#fff7ed", color: "#ea580c", display: "grid", placeItems: "center" }}>
              <ShoppingBag size={16} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "22px", color: "var(--ink)", marginTop: "6px" }}>
            {metrics.totalOrders} transaksi
          </strong>
          <span style={{ fontSize: "11px", color: metrics.pendingDeliveryCount > 0 ? "#ea580c" : "var(--muted)", fontWeight: 600 }}>
            {metrics.pendingDeliveryCount} pesanan perlu diantar/proses
          </span>
        </div>

        {/* Piutang / Belum Lunas */}
        <div
          style={{
            background: "white",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "12px" }}>
            <span>Piutang / Belum Lunas</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#fef2f2", color: "#dc2626", display: "grid", placeItems: "center" }}>
              <CreditCard size={16} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "22px", color: metrics.unpaidTotal > 0 ? "#dc2626" : "var(--ink)", marginTop: "6px" }}>
            Rp{metrics.unpaidTotal.toLocaleString("id-ID")}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            {metrics.unpaidCount} nota belum diselesaikan
          </span>
        </div>

        {/* Produk Terjual */}
        <div
          style={{
            background: "white",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "12px" }}>
            <span>Total Produk Terjual</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#faf5ff", color: "#9333ea", display: "grid", placeItems: "center" }}>
              <Package size={16} />
            </div>
          </div>
          <strong style={{ display: "block", fontSize: "22px", color: "var(--ink)", marginTop: "6px" }}>
            {metrics.totalItemsSold.toLocaleString("id-ID")} pcs
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Total kuantiti semua item</span>
        </div>
      </div>

      {/* 2. SALES CHART (7 / 30 DAYS) */}
      <div
        style={{
          background: "white",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--ink)", fontWeight: 700 }}>
              Tren Omzet Penjualan
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Rata-rata: Rp{avgChartRevenue.toLocaleString("id-ID")}/hari • Total periode: Rp{totalChartRevenue.toLocaleString("id-ID")}
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setChartRange("7days")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: chartRange === "7days" ? "var(--ink)" : "white",
                color: chartRange === "7days" ? "white" : "var(--ink)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setChartRange("30days")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: chartRange === "30days" ? "var(--ink)" : "white",
                color: chartRange === "30days" ? "white" : "var(--ink)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              30 Hari Terakhir
            </button>
          </div>
        </div>

        {/* Bar Chart */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: chartRange === "7days" ? "16px" : "4px",
            height: "190px",
            paddingTop: "24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {chartData.map((d) => {
            const heightPercent = Math.max(5, (d.amount / maxChartAmount) * 100);
            return (
              <div
                key={d.dateStr}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                }}
                title={`${d.dateStr}: Rp${d.amount.toLocaleString("id-ID")} (${d.count} pesanan)`}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: chartRange === "7days" ? "44px" : "16px",
                    height: `${heightPercent}%`,
                    background: d.amount > 0 ? "var(--ink)" : "#f1f5f9",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    marginTop: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chartRange === "7days" ? d.label : d.label.split("/")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ROW: PRODUK PALING LAKU & TOKO/PELANGGAN PALING AKTIF */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "20px",
        }}
      >
        {/* Top Ordered Products */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Flame size={18} style={{ color: "#ea580c" }} />
              <h4 style={{ margin: 0, fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>
                Top 5 Produk Paling Laku
              </h4>
            </div>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Berdasarkan riwayat order</span>
          </div>

          {topOrderedProducts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>
              Belum ada data transaksi pesanan.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {topOrderedProducts.map((p, idx) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: idx === 0 ? "#ea580c" : "#e2e8f0",
                        color: idx === 0 ? "white" : "var(--ink)",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{p.name}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block", fontSize: "13px", color: "#16a34a" }}>
                      {p.quantity} pcs
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Rp{p.totalSales.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Active Customers */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={18} style={{ color: "#2563eb" }} />
              <h4 style={{ margin: 0, fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>
                Pelanggan / Toko Paling Aktif
              </h4>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab("customers")}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              Lihat Semua <ChevronRight size={14} />
            </button>
          </div>

          {topActiveCustomers.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>
              Belum ada pelanggan tercatat.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {topActiveCustomers.map((c, idx) => (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: idx === 0 ? "#2563eb" : "#e2e8f0",
                        color: idx === 0 ? "white" : "var(--ink)",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "var(--ink)" }}>{c.name}</strong>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>{c.orderCount}x pesanan</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block", fontSize: "13px", color: "var(--ink)" }}>
                      Rp{c.totalSpend.toLocaleString("id-ID")}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>Terakhir: {c.lastDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. RECENT ORDERS (AKTIVITAS / PESANAN TERBARU) */}
      <div
        style={{
          background: "white",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>
              Pesanan Terbaru Masuk
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Daftar nota transaksi terakhir yang tercatat di sistem toko.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab("orders")}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            Kelola Semua Pesanan <ChevronRight size={14} />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>
            Belum ada pesanan terbaru.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: "10px 14px" }}>No. Nota</th>
                  <th style={{ padding: "10px 14px" }}>Nama Toko / Pemesan</th>
                  <th style={{ padding: "10px 14px" }}>Tanggal</th>
                  <th style={{ padding: "10px 14px" }}>Barang</th>
                  <th style={{ padding: "10px 14px" }}>Status Bayar</th>
                  <th style={{ padding: "10px 14px" }}>Status Kirim</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => {
                  const total = ord.items.reduce((s, it) => s + it.price * it.quantity, 0);
                  const isPaid = ord.paymentStatus === "lunas";
                  return (
                    <tr key={ord.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700 }}>{ord.id}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{ord.storeName || "-"}</td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: "12px" }}>
                        {ord.orderDate}
                      </td>
                      <td style={{ padding: "10px 14px" }}>{ord.items.length} macam</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isPaid ? "#dcfce7" : "#fee2e2",
                            color: isPaid ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            color: "var(--ink)",
                          }}
                        >
                          {ord.deliveryStatus}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>
                        Rp{total.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. SEARCHES & WHATSAPP CONVERSION TRACKING */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "20px",
        }}
      >
        {/* Search Insights */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Search size={18} style={{ color: "var(--ink)" }} />
            <h4 style={{ margin: 0, fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>
              Pencarian Katalog Pelanggan
            </h4>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                Pencarian Terpopuler:
              </span>
              {analytics.topSearches.length === 0 ? (
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Belum ada pencarian terekam.</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {analytics.topSearches.map((s) => (
                    <span
                      key={s.query}
                      style={{
                        background: "#f1f5f9",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "var(--ink)",
                      }}
                    >
                      "{s.query}" ({s.count}x)
                    </span>
                  ))}
                </div>
              )}
            </div>

            {analytics.zeroResultSearches.length > 0 && (
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626", display: "block", marginBottom: "6px" }}>
                  ⚠️ Pencarian Tanpa Hasil (Peluang Stok Baru):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {analytics.zeroResultSearches.map((s) => (
                    <span
                      key={s.query}
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#b91c1c",
                      }}
                    >
                      "{s.query}" ({s.count}x)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Conversion Insights */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <MessageCircle size={18} style={{ color: "#16a34a" }} />
            <h4 style={{ margin: 0, fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>
              Konversi Klik WhatsApp
            </h4>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Tanya Produk:</span>
              <strong style={{ display: "block", fontSize: "16px", color: "var(--ink)" }}>
                {analytics.whatsappClicksByIntent.product || 0} klik
              </strong>
            </div>
            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Tanya Grosir / B2B:</span>
              <strong style={{ display: "block", fontSize: "16px", color: "var(--ink)" }}>
                {analytics.whatsappClicksByIntent.wholesale || 0} klik
              </strong>
            </div>
            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Checkout Order:</span>
              <strong style={{ display: "block", fontSize: "16px", color: "#16a34a" }}>
                {analytics.checkoutCount || 0} checkout
              </strong>
            </div>
            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Barang Kosong:</span>
              <strong style={{ display: "block", fontSize: "16px", color: "var(--ink)" }}>
                {analytics.whatsappClicksByIntent.not_found || 0} klik
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
