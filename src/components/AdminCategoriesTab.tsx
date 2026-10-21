import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { ImagePlus, Plus, Search, Tags, Trash2, ImageOff, Package } from "lucide-react";
import type { Category, Product } from "../types";
interface Props {
  categories: Category[]; products: Product[]; name: string; saving: boolean;
  uploadingId: number | null; onNameChange: (value: string) => void;
  onAdd: (event: FormEvent) => Promise<void>;
  onUpload: (category: Category, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveImage: (category: Category) => Promise<void>;
  onRemove: (category: Category) => Promise<void>;
  fallbackImage: (name: string) => string;
}
export function AdminCategoriesTab(props: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    props.products.forEach(product => { const key = product.category.trim().toLowerCase(); map.set(key, (map.get(key) || 0) + 1); });
    return map;
  }, [props.products]);
  const count = (category: Category) => counts.get(category.name.trim().toLowerCase()) || 0;
  const visible = props.categories.filter(category => category.name.toLowerCase().includes(search.trim().toLowerCase()) && (filter === "all" || (filter === "used" ? count(category) > 0 : count(category) === 0)));
  const run = async (category: Category, action: () => Promise<void>) => {
    setBusy(category.id); setMessage("");
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Perubahan belum berhasil. Coba lagi."); } finally { setBusy(null); }
  };
  return <div className="category-workspace">
    <div className="category-stats"><div><Tags size={20} /><span>Total kategori<strong>{props.categories.length}</strong></span></div><div><Package size={20} /><span>Digunakan produk<strong>{props.categories.filter(category => count(category) > 0).length}</strong></span></div><div><ImagePlus size={20} /><span>Dengan gambar<strong>{props.categories.filter(category => category.image).length}</strong></span></div></div>
    <section className="category-create-panel"><div><h3>Tambah kategori</h3><p>Kelompokkan produk agar lebih mudah ditemukan pelanggan.</p></div><form onSubmit={props.onAdd}><label className="sr-only" htmlFor="new-category-name">Nama kategori baru</label><input id="new-category-name" required maxLength={100} placeholder="Contoh: Lemari Pakaian" value={props.name} onChange={e => props.onNameChange(e.target.value)} disabled={props.saving} /><button className="primary-btn" disabled={props.saving}><Plus size={17} />{props.saving ? "Menyimpan..." : "Tambah kategori"}</button></form></section>
    <div className="category-toolbar"><label className="category-search"><Search size={18} /><input aria-label="Cari kategori" placeholder="Cari nama kategori..." value={search} onChange={e => setSearch(e.target.value)} /></label><label className="category-filter">Tampilkan<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Semua kategori</option><option value="used">Digunakan produk</option><option value="empty">Belum digunakan</option></select></label><span>{visible.length} kategori</span></div>
    {message && <p className="order-error" role="alert">{message}</p>}
    <div className="category-card-grid">{visible.map(category => {
      const used = count(category); const disabled = busy !== null || props.uploadingId !== null;
      return <article className="managed-category-card" key={category.id}>
        <div className="managed-category-photo"><img src={category.image || props.fallbackImage(category.name)} alt={category.name} loading="lazy" /><span>{used ? "Aktif" : "Belum digunakan"}</span></div>
        <div className="managed-category-body"><h3>{category.name}</h3><p><Package size={14} /> {used} produk dalam kategori</p>
          <div className="managed-category-actions"><label className={`category-upload ${disabled ? "disabled" : ""}`}><ImagePlus size={16} /><span>{props.uploadingId === category.id ? "Mengunggah..." : "Ganti gambar"}</span><input type="file" accept="image/*" aria-label={`Ganti gambar ${category.name}`} disabled={disabled} onChange={event => void run(category, () => props.onUpload(category, event))} /></label><button type="button" className="category-icon-action" aria-label={`Hapus gambar ${category.name}`} title="Hapus gambar kategori" disabled={disabled || !category.image} onClick={() => void run(category, () => props.onRemoveImage(category))}><ImageOff size={17} /></button></div>
          <button type="button" className="category-delete-action" disabled={disabled || used > 0} onClick={() => void run(category, () => props.onRemove(category))}><Trash2 size={15} />Hapus kategori</button><small>{used ? "Kategori yang digunakan produk tidak dapat dihapus." : "Kategori ini belum digunakan oleh produk."}</small>
        </div>
      </article>;
    })}</div>
    {!visible.length && <div className="category-empty"><Tags size={36} /><h3>{props.categories.length ? "Kategori tidak ditemukan" : "Belum ada kategori"}</h3><p>{props.categories.length ? "Coba kata pencarian atau filter lain." : "Tambahkan kategori pertama melalui formulir di atas."}</p></div>}
  </div>;
}
