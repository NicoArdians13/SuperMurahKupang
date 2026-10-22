import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "../types";

type Props = {
  products: Product[]; visible: Product[]; selected: number[];
  onSelect: (ids: number[]) => void; categories: string[];
  brands: { id: number; name: string }[]; brandsReady: boolean;
  disabled: boolean; busy: boolean; onBusy: (busy: boolean) => void;
  supabase: SupabaseClient; onChanged: (ids: number[], patch: { category?: string; brand_id?: number | null }) => void;
};

export function BulkProductActions(props: Props) {
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [message, setMessage] = useState("");
  const selected = props.selected.filter(id => props.products.some(product => product.id === id));
  const hidden = selected.filter(id => !props.visible.some(product => product.id === id)).length;
  const locked = props.disabled || props.busy;
  const apply = async () => {
    if (locked || !selected.length || (!category && !brand)) return;
    const patch: { category?: string; brand_id?: number | null } = {};
    if (category) patch.category = category;
    if (brand && props.brandsReady) patch.brand_id = brand === "none" ? null : Number(brand);
    if (!Object.keys(patch).length) return;
    const target = [category && `kategori: ${category}`, brand && `merk: ${brand === "none" ? "Tanpa merk" : props.brands.find(item => String(item.id) === brand)?.name}`].filter(Boolean).join("; ");
    if (!window.confirm(`Ubah ${selected.length} barang terpilih (${target})?${hidden ? ` Termasuk ${hidden} barang di luar hasil pencarian.` : ""}`)) return;
    props.onBusy(true);
    setMessage("Menyimpan perubahan...");
    const succeeded: number[] = [];
    try {
      // Batasi panjang permintaan dan periksa ID yang benar-benar dikembalikan RLS.
      for (let start = 0; start < selected.length; start += 100) {
        const ids = selected.slice(start, start + 100);
        try {
          const { data, error } = await props.supabase.from("products").update(patch).in("id", ids).select("id");
          if (error) throw error;
          const saved = (data ?? []).map(item => Number(item.id)).filter(id => ids.includes(id));
          succeeded.push(...saved);
          props.onChanged(saved, patch);
        } catch (error) {
          console.error("Perubahan massal gagal:", error);
        }
      }
      const remaining = selected.filter(id => !succeeded.includes(id));
      props.onSelect(remaining);
      setMessage(`${succeeded.length} barang tersimpan.${remaining.length ? ` ${remaining.length} belum tersimpan dan tetap dicentang. Silakan coba lagi.` : ""}`);
      if (!remaining.length) { setCategory(""); setBrand(""); }
    } finally { props.onBusy(false); }
  };
  return <section className="bulk-product-actions" aria-label="Ubah barang secara massal">
    <div className="bulk-selection"><strong>{selected.length} barang dipilih</strong><button type="button" disabled={locked || !props.visible.length} onClick={() => props.onSelect([...new Set([...selected, ...props.visible.map(item => item.id)])])}>Pilih semua hasil pencarian ({props.visible.length})</button><button type="button" disabled={locked || !selected.length} onClick={() => props.onSelect([])}>Batal pilih semua</button></div>
    {hidden > 0 && <p>{hidden} barang terpilih berada di luar hasil pencarian dan tetap akan diubah.</p>}
    <div className="bulk-fields"><label>Kategori tujuan<select aria-label="Kategori tujuan" value={category} disabled={locked} onChange={event => setCategory(event.target.value)}><option value="">Pertahankan kategori</option>{props.categories.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label>Merk tujuan<select aria-label="Merk tujuan" value={brand} disabled={locked || !props.brandsReady} onChange={event => setBrand(event.target.value)}><option value="">Pertahankan merk</option><option value="none">Tanpa merk</option>{props.brands.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label>
      <button type="button" className="primary-btn" disabled={locked || !selected.length || (!category && !brand)} onClick={apply}>{props.busy ? "Menyimpan..." : "Terapkan ke barang terpilih"}</button></div>
    <small>Hanya kategori dan/atau merk yang dipilih di atas yang diubah. Harga dan gambar tetap.</small>
    {message && <p role="status">{message}</p>}
  </section>;
}
