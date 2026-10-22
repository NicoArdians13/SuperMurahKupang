import { useState } from "react";
import type { Product } from "../types";
export function ArchivedProductsTab({ products, busy, onRestore }: { products: Product[]; busy: number | null; onRestore: (product: Product, archived: boolean) => Promise<void> }) {
  const [search,setSearch]=useState("");
  const filtered=products.filter(p=>`${p.name} ${p.product_code ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section aria-label="Arsip barang"><p>Barang di sini disembunyikan dari katalog dan pilihan barang pesanan baru. Data, gambar, dan nota lama tetap tersimpan. Pulihkan untuk menjualnya kembali.</p><label>Cari arsip<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari barang di arsip..." /></label><p>{filtered.length} barang diarsipkan</p><div className="archived-list">{filtered.map(product=><article key={product.id}><div><strong>{product.name}</strong><small>{product.product_code} · {product.category}</small></div><button className="secondary-btn" disabled={busy!==null} onClick={()=>onRestore(product,false)} aria-label={`Pulihkan ${product.name}`}>{busy===product.id ? "Menyimpan..." : "Pulihkan"}</button></article>)}</div>{!filtered.length && <p className="empty-catalog">Tidak ada barang dalam arsip ini.</p>}</section>;
}
