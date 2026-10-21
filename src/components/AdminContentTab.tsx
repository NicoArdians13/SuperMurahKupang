import { FormEvent, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, ImagePlus } from "lucide-react";
import { contentVisibility, contentStatusLabels, ContentInput, ContentKind, emptyContent, imageUrl, StorefrontContent } from "../lib/storefrontContent";

interface Props {
  onImportLocal?: () => Promise<number>;
  onlyKind?: ContentKind;
  items: StorefrontContent[];
  error: string;
  loading: boolean;
  onReload: () => Promise<void>;
  onSave: (input: ContentInput, id?: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
}
export function AdminContentTab({ onImportLocal, onlyKind, items, error, loading, onReload, onSave, onRemove, onUpload }: Props) {
  const [kind, setKind] = useState<ContentKind>(onlyKind || "article");
  const [form, setForm] = useState<ContentInput | null>(null);
  const [editingId, setEditingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (patch: Partial<ContentInput>) => setForm(current => current ? { ...current, ...patch } : current);
  const start = (item?: StorefrontContent) => { setMessage(""); setEditingId(item?.id); setForm(item ? { ...item } : emptyContent(kind)); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form || busy) return; setBusy(true); setMessage("");
    try { await onSave(form, editingId); setForm(null); setEditingId(undefined); setMessage(`Konten berhasil disimpan. ${contentStatusLabels[contentVisibility(form)]}${!form.published ? ". Centang Terbitkan di website agar muncul di depan." : ""}`); } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan konten."); } finally { setBusy(false); }
  };
  const remove = async (item: StorefrontContent) => {
    if (!window.confirm(`Hapus ${item.content_type === "article" ? "artikel" : "promo"} “${item.title}”?`)) return;
    setBusy(true); setMessage("");
    try { await onRemove(item.id); if (editingId === item.id) { setForm(null); setEditingId(undefined); } setMessage("Konten berhasil dihapus."); } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menghapus konten."); } finally { setBusy(false); }
  };
  return <div className="content-admin">
    <p className="content-help">Kelola konten Home dan halaman khusus. Simpan sebagai draf atau terbitkan. Tanggal mulai/selesai bersifat opsional; kosongkan agar selalu tampil.</p>
    {error && <div className="order-error" role="alert">{error}<button className="secondary-btn" onClick={onReload}>Muat ulang</button></div>}
    {onImportLocal && <div className="content-import-panel"><p>Sudah pernah membuat artikel atau promo di browser ini? Salin ke Supabase tanpa menghapus salinan lokal. Konten dengan ID yang sudah ada akan dilewati.</p><button type="button" className="secondary-btn" disabled={busy || Boolean(error) || loading} onClick={async () => { setBusy(true); setMessage(""); try { const total = await onImportLocal(); setMessage(`${total} konten disalin ke Supabase. Salinan lokal tetap tersedia.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Impor belum berhasil."); } finally { setBusy(false); } }}>Salin konten lokal ke Supabase</button></div>}
    {message && <p className="content-message" role="status">{message}</p>}
    <div className="content-toolbar"><div className="content-tabs" hidden={Boolean(onlyKind)}><button className={kind === "article" ? "active" : ""} onClick={() => setKind("article")}>Artikel</button><button className={kind === "promo" ? "active" : ""} onClick={() => setKind("promo")}>Promo</button></div><button className="primary-btn" disabled={busy || Boolean(error)} onClick={() => start()}><Plus size={16} /> Tambah {kind === "article" ? "artikel" : "promo"}</button></div>
    {form && <form className="content-editor" onSubmit={submit}>
      <div className="content-toolbar"><h3>{editingId ? "Edit" : "Tambah"} {form.content_type === "article" ? "artikel" : "promo"}</h3><button type="button" className="secondary-btn" aria-label="Tutup editor konten" disabled={busy} onClick={() => setForm(null)}><X size={18} /></button></div>
      <fieldset disabled={busy}>
        <label>Judul<input required maxLength={180} value={form.title} onChange={e => update({ title: e.target.value })} /></label>
        <label>Ringkasan<textarea maxLength={400} value={form.summary} onChange={e => update({ summary: e.target.value })} placeholder="Kalimat singkat untuk kartu di Home" /></label>
        <label>Isi lengkap<textarea required rows={9} value={form.body} onChange={e => update({ body: e.target.value })} placeholder="Isi artikel, rincian promo, atau syarat dan ketentuan. Gunakan baris baru untuk paragraf." /></label>
        <label>URL gambar<input type="url" value={form.image_url} onChange={e => update({ image_url: e.target.value })} placeholder="https://..." /></label>
        <label className="content-file"><ImagePlus size={17} /> Atau unggah gambar<input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; if (!file.type.startsWith("image/")) { setMessage("Pilih file gambar."); return; } if (file.size > 5 * 1024 * 1024) { setMessage("Ukuran gambar maksimal 5 MB."); return; } setBusy(true); try { update({ image_url: await onUpload(file) }); } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal mengunggah gambar."); } finally { setBusy(false); } }} /></label>
        {imageUrl(form.image_url) && <img className="content-image-preview" src={imageUrl(form.image_url)} alt="Pratinjau gambar konten" />}
        <div className="content-dates"><label>Tampil mulai<input type="date" value={form.starts_on || ""} onChange={e => update({ starts_on: e.target.value || null })} /></label><label>Tampil sampai<input type="date" min={form.starts_on || undefined} value={form.ends_on || ""} onChange={e => update({ ends_on: e.target.value || null })} /></label></div>
        <label className="content-publish"><input type="checkbox" checked={form.published} onChange={e => update({ published: e.target.checked })} /> Terbitkan di website</label><p className="content-publish-status" role="status">Status setelah disimpan: <strong>{contentStatusLabels[contentVisibility(form)]}</strong>. Tanggal tampil memakai WITA. Kosongkan tanggal untuk menampilkan tanpa batas jadwal.</p>
      </fieldset>
      <button className="primary-btn" disabled={busy}><Save size={16} /> {busy ? "Menyimpan..." : "Simpan konten"}</button>
    </form>}
    {loading ? <p>Memuat konten...</p> : <div className="content-admin-list">{items.filter(item => item.content_type === kind).map(item => <article key={item.id} className="content-admin-row"><div>{imageUrl(item.image_url) && <img src={imageUrl(item.image_url)} alt="" />}<div><strong>{item.title}</strong><small>{contentStatusLabels[contentVisibility(item)]}{item.starts_on ? ` • Mulai ${item.starts_on}` : ""}{item.ends_on ? ` • Sampai ${item.ends_on}` : ""}</small><p>{item.summary}</p></div></div><div className="content-row-actions">{!item.published && <button className="primary-btn" disabled={busy} onClick={async () => { setBusy(true); try { const next = { ...item, published: true }; await onSave(next, item.id); setMessage(`Konten disimpan. ${contentStatusLabels[contentVisibility(next)]}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menerbitkan konten."); } finally { setBusy(false); } }}>Terbitkan</button>}<button className="secondary-btn" disabled={busy} onClick={() => start(item)} aria-label={`Edit ${item.title}`}><Pencil size={15} /> Edit</button><button className="delete-btn" disabled={busy} onClick={() => remove(item)} aria-label={`Hapus ${item.title}`}><Trash2 size={15} /> Hapus</button></div></article>)}{!error && !items.some(item => item.content_type === kind) && <p className="empty-catalog">Belum ada {kind === "article" ? "artikel" : "promo"}. Klik Tambah untuk membuat konten pertama.</p>}</div>}
  </div>;
}
