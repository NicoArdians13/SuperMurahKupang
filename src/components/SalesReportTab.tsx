import { useMemo, useState } from "react";
import { buildSalesReport } from "../lib/salesReport";
import type { StoreOrder } from "../types";
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export function SalesReportTab({ orders, loading, error, onReload }: { orders: StoreOrder[]; loading: boolean; error: string; onReload: () => Promise<void> }) {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`;
  const [from, setFrom] = useState(firstDay), [to, setTo] = useState("");
  const invalid = Boolean(from && to && from > to);
  const report = useMemo(() => buildSalesReport(orders, from, to), [orders, from, to]);
  return <section className="sales-report" aria-label="Laporan penjualan">
    <div className="report-filters"><label>Dari tanggal<input aria-label="Laporan dari tanggal" type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>Sampai tanggal<input aria-label="Laporan sampai tanggal" type="date" value={to} onChange={e=>setTo(e.target.value)} /></label><button className="secondary-btn" onClick={()=>{setFrom("");setTo("");}}>Semua periode</button><button className="secondary-btn" disabled={loading} onClick={onReload}>Muat ulang laporan</button></div>
    <p>Laporan memakai tanggal pesanan dan harga pada nota. Hanya pesanan yang ditandai Selesai yang dihitung; status pengantaran tetap terpisah. Tandai melalui Pesanan toko.</p>
    {loading ? <p role="status">Memuat laporan...</p> : error ? <p role="alert">Laporan belum dapat dimuat: {error}</p> : invalid ? <p role="alert">Tanggal akhir harus sama atau setelah tanggal awal.</p> : <>
      <div className="report-cards">{[["Pesanan selesai",report.completed.length],["Nilai penjualan",rupiah(report.revenue)],["Unit terjual",report.quantity],["Pelanggan",report.customerCount],["Nilai pesanan lunas",rupiah(report.paid)],["Nilai pesanan belum lunas",rupiah(report.unpaid)]].map(([label,value])=><article key={label}><small>{label}</small><strong>{value}</strong></article>)}</div>
      <p>Nilai penjualan adalah jumlah QTY × harga satuan pada pesanan selesai, bukan laba atau uang masuk. Nilai belum lunas mencakup seluruh nilai pesanan DP/piutang, karena nominal pembayaran belum dicatat.</p>
      {!report.completed.length && <p className="empty-catalog">Belum ada pesanan selesai pada periode ini.</p>}
      <h3>Produk terlaris</h3><div className="report-table"><table><thead><tr><th>Produk</th><th>QTY</th><th>Nilai penjualan</th></tr></thead><tbody>{report.products.map((row,index)=><tr key={index}><td>{row.name}<small>{row.code}</small></td><td>{row.quantity}</td><td>{rupiah(row.revenue)}</td></tr>)}</tbody></table></div>
      <h3>Pelanggan yang sering belanja</h3><div className="report-table"><table><thead><tr><th>Pelanggan</th><th>Pesanan selesai</th><th>Nilai belanja</th></tr></thead><tbody>{report.customers.map((row,index)=><tr key={index}><td>{row.name}</td><td>{row.orders}</td><td>{rupiah(row.revenue)}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
