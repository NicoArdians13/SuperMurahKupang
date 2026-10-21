import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type ContentKind = "article" | "promo";
export type StorefrontContent = {
  id: string; content_type: ContentKind; title: string; summary: string;
  body: string; image_url: string; starts_on: string | null;
  ends_on: string | null; published: boolean; created_at: string; updated_at: string;
};
export type ContentInput = Omit<StorefrontContent, "id" | "created_at" | "updated_at">;
const LOCAL_KEY = "smk_storefront_content_v1";
export const emptyContent = (kind: ContentKind): ContentInput => ({ content_type: kind, title: "", summary: "", body: "", image_url: "", starts_on: null, ends_on: null, published: false });
export function contentVisibility(item: Pick<StorefrontContent, "published" | "starts_on" | "ends_on">, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  if (!item.published) return "draft";
  if (item.starts_on && item.starts_on.slice(0, 10) > today) return "scheduled";
  if (item.ends_on && item.ends_on.slice(0, 10) < today) return "expired";
  return "live";
}
export function isContentVisible(item: StorefrontContent, now = new Date()) {
  return contentVisibility(item, now) === "live";
}
export const contentStatusLabels = { draft: "Draf — belum tampil", scheduled: "Terjadwal — belum mulai", expired: "Berakhir — tidak tampil", live: "Tayang di website" };
function latestFirst(items: StorefrontContent[]) {
  return [...items].sort((a, b) => (Date.parse(b.updated_at || b.created_at) || 0) - (Date.parse(a.updated_at || a.created_at) || 0));
}
export function imageUrl(value: string): string {
  if (!value) return "";
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try { const url = new URL(value, window.location.origin); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
export async function uploadContentImage(file: File): Promise<string> {
  const types: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
  if (!types[file.type]) throw new Error("Gunakan gambar JPG, PNG, WebP, atau GIF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
  const path = `content/${crypto.randomUUID()}.${types[file.type]}`;
  const { error } = await supabase.storage.from("promotion-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Gambar gagal diunggah: ${error.message}`);
  return supabase.storage.from("promotion-images").getPublicUrl(path).data.publicUrl;
}
function payloadOf(input: ContentInput) {
  const payload = { content_type: input.content_type, title: input.title.trim(), summary: input.summary.trim(), body: input.body.trim(), image_url: input.image_url.trim(), starts_on: input.starts_on || null, ends_on: input.ends_on || null, published: Boolean(input.published) };
  if (!payload.title || !payload.body) throw new Error("Judul dan isi wajib diisi.");
  if (payload.title.length > 180) throw new Error("Judul maksimal 180 karakter.");
  if (!["article", "promo"].includes(payload.content_type)) throw new Error("Jenis konten tidak valid.");
  if (payload.starts_on && payload.ends_on && payload.ends_on < payload.starts_on) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  return payload;
}
export function useStorefrontContent(isAdmin: boolean) {
  const [items, setItems] = useState<StorefrontContent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const version = useRef(0);
  const mutating = useRef(false);
  const reload = useCallback(async () => {
    if (mutating.current) return;
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const result: StorefrontContent[] = [];
      for (let start = 0; ; start += 1000) {
        let query = supabase.from("storefront_content").select("*").order("updated_at", { ascending: false }).order("id", { ascending: false }).range(start, start + 999);
        if (!isAdmin) query = query.eq("published", true);
        const { data, error } = await query;
        if (error) throw new Error(/42P01|PGRST205/.test(error.code) || /could not find.*table|does not exist/i.test(error.message) ? "Tabel konten belum tersedia. Jalankan SQL-ARTIKEL-PROMO.sql di Supabase, lalu klik Muat ulang." : error.message);
        result.push(...(data ?? []) as StorefrontContent[]);
        if (!data || data.length < 1000) break;
      }
      if (request === version.current) setItems(latestFirst(result));
    } catch (error) {
      if (request === version.current) { setError(error instanceof Error ? error.message : "Konten gagal dimuat."); setItems([]); }
    } finally { if (request === version.current) setLoading(false); }
  }, [isAdmin]);
  useEffect(() => { void reload(); return () => { version.current += 1; }; }, [reload]);
  // Public pages refresh after another tab/device changes content, without
  // requiring Supabase Realtime to be enabled for this table.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void reload(); };
    const timer = window.setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [reload]);
  const save = async (input: ContentInput, id?: string) => {
    if (!isAdmin) throw new Error("Akses admin diperlukan.");
    const payload = { ...payloadOf(input), updated_at: new Date().toISOString() };
    mutating.current = true; version.current += 1;
    try {
      const query = id ? supabase.from("storefront_content").update(payload).eq("id", id) : supabase.from("storefront_content").insert(payload);
      const { data, error } = await query.select("*").single();
      if (error || !data) throw new Error(error?.message || "Konten belum tersimpan. Periksa akses admin.");
      setItems(current => latestFirst([data as StorefrontContent, ...current.filter(item => item.id !== data.id)]));
      setError("");
    } finally { mutating.current = false; setLoading(false); }
  };
  const remove = async (id: string) => {
    if (!isAdmin) throw new Error("Akses admin diperlukan.");
    mutating.current = true; version.current += 1;
    try {
      const { data, error } = await supabase.from("storefront_content").delete().eq("id", id).select("id").single();
      if (error || !data) throw new Error(error?.message || "Konten belum dihapus. Periksa akses admin.");
      setItems(current => current.filter(item => item.id !== id));
      setError("");
    } finally { mutating.current = false; setLoading(false); }
  };
  const importLocal = async () => {
    if (!isAdmin) throw new Error("Akses admin diperlukan.");
    const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    if (!Array.isArray(parsed)) throw new Error("Format data lokal tidak valid. Salinan lokal tidak diubah.");
    let imported = 0;
    for (const item of parsed) {
      if (!item || typeof item.id !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id)) throw new Error("Ada ID konten lokal tidak valid. Salinan lokal tidak diubah.");
      const payload = payloadOf(item as ContentInput);
      const { data: existing, error: readError } = await supabase.from("storefront_content").select("id").eq("id", item.id).maybeSingle();
      if (readError) throw new Error(readError.message);
      if (existing) continue;
      if (payload.image_url.startsWith("data:")) {
        if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(payload.image_url)) throw new Error("Gambar lokal tidak valid.");
        const blob = await (await fetch(payload.image_url)).blob();
        payload.image_url = await uploadContentImage(new File([blob], "gambar-lokal", { type: blob.type }));
      }
      const { data, error } = await supabase.from("storefront_content").upsert({ ...payload, id: item.id, created_at: item.created_at || new Date().toISOString() }, { onConflict: "id", ignoreDuplicates: true }).select("id");
      if (error) { await reload(); throw new Error(`Impor berhenti setelah ${imported} konten: ${error.message}. Salinan lokal tetap ada; aman untuk mencoba lagi.`); }
      imported += data?.length || 0;
    }
    await reload();
    return imported;
  };
  return { items, error, loading, reload, save, remove, importLocal };
}
