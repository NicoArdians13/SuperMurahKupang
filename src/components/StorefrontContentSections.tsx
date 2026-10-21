import { ArrowRight, CalendarDays, FileText, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { imageUrl, isContentVisible, StorefrontContent } from "../lib/storefrontContent";

export function StorefrontContentSections({ items, loading, error = "", onReload, articlesOnly = false, promosOnly = false }: { items: StorefrontContent[]; loading: boolean; error?: string; onReload?: () => Promise<void>; articlesOnly?: boolean; promosOnly?: boolean }) {
  const [selected, setSelected] = useState<StorefrontContent | null>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); opener?.focus({ preventScroll: true }); };
  }, [selected]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  const visible = [...items].filter(item => isContentVisible(item, now)).sort((a, b) => (Date.parse(b.updated_at || b.created_at) || 0) - (Date.parse(a.updated_at || a.created_at) || 0));
  const articles = visible.filter(item => item.content_type === "article");
  const promos = visible.filter(item => item.content_type === "promo");
  return <>
    {error && <div className="shell public-content-error" role="alert"><p>Artikel dan promo belum berhasil dimuat. Silakan coba lagi.</p>{onReload && <button className="secondary-btn" onClick={onReload}>Muat ulang konten</button>}</div>}
    {!articlesOnly && <section className="storefront-section shell" aria-labelledby="promo-title"><div className="shop-section-heading"><h2 id="promo-title">Promo untuk Kamu</h2><span>Penawaran dari Super Murah Kupang</span></div><div className="editorial-grid promo-grid">{promos.map(item => <article className="editorial-card promo-card" key={item.id}><button onClick={() => setSelected(item)} aria-label={`Lihat promo ${item.title}`}><div className="editorial-image">{imageUrl(item.image_url) ? <img src={imageUrl(item.image_url)} alt={item.title} loading="lazy" /> : <Tag size={42} />}</div><div className="editorial-copy"><span className="content-kicker">Promo toko</span><h3>{item.title}</h3><p>{item.summary}</p>{item.ends_on && <small>Berlaku sampai {new Date(item.ends_on + "T00:00:00").toLocaleDateString("id-ID")}</small>}<span className="text-link">Lihat promo <ArrowRight size={15} /></span></div></button></article>)}</div>{!promos.length && <p className="editorial-empty">{loading ? "Memuat promo..." : "Nantikan promo terbaru dari toko kami."}</p>}</section>}
    {!promosOnly && <section className="storefront-section shell" aria-labelledby="articles-title"><div className="shop-section-heading"><h2 id="articles-title">Artikel Terbaru</h2><span>Inspirasi rumah & kebutuhan usaha</span></div><div className="editorial-grid">{(articlesOnly ? articles : articles.slice(0, 3)).map(item => <article className="editorial-card" key={item.id}><button className="editorial-image" onClick={() => setSelected(item)} aria-label={`Baca ${item.title}`}>{imageUrl(item.image_url) ? <img src={imageUrl(item.image_url)} alt={item.title} loading="lazy" /> : <FileText size={42} />}</button><div className="editorial-copy"><small className="article-date"><CalendarDays size={13} />{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</small><h3>{item.title}</h3><p>{item.summary || item.body.slice(0, 150)}</p><button className="article-read" onClick={() => setSelected(item)}>Baca selengkapnya <ArrowRight size={15} /></button></div></article>)}</div>{!articles.length && <p className="editorial-empty">{loading ? "Memuat artikel..." : "Artikel terbaru sedang disiapkan. Kunjungi kembali untuk inspirasi berikutnya."}</p>}</section>}
    {selected && <div className="content-dialog-backdrop" onClick={() => setSelected(null)}><article className="content-dialog" role="dialog" aria-modal="true" aria-labelledby="content-dialog-title" tabIndex={-1} ref={node => node?.focus()} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); e.currentTarget.querySelector<HTMLButtonElement>('button')?.focus(); } }}><button autoFocus className="content-dialog-close" aria-label="Tutup konten" onClick={() => setSelected(null)}><X size={22} /></button>{imageUrl(selected.image_url) && <img className="content-cover" src={imageUrl(selected.image_url)} alt={selected.title} />}<div className="content-dialog-copy"><p className="content-kicker">{selected.content_type === "article" ? "Artikel" : "Promo"} • SUPER MURAH KUPANG</p><h1 id="content-dialog-title">{selected.title}</h1>{selected.ends_on && <p className="content-validity">Berlaku sampai {new Date(selected.ends_on + "T00:00:00").toLocaleDateString("id-ID")}</p>}<p className="content-lead">{selected.summary}</p><div className="content-body">{selected.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></div></article></div>}
  </>;
}
