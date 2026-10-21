import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
export type Brand = { id: number; name: string; image: string };
export function useBrands(isAdmin: boolean) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const version = useRef(0);
  const reload = useCallback(async () => {
    const request = ++version.current; setLoading(true);
    try {
      const items: Brand[] = [];
      for (let start = 0; ; start += 1000) {
        const { data, error } = await supabase.from("brands").select("id, name, image").order("name").order("id").range(start, start + 999);
        if (error) throw new Error(/42P01|PGRST205/.test(error.code) ? "Fitur merk belum aktif. Jalankan SQL-MERK.sql lalu klik Muat ulang." : error.message);
        items.push(...(data ?? []).map(item => ({ id: Number(item.id), name: String(item.name), image: String(item.image || "") })));
        if (!data || data.length < 1000) break;
      }
      if (request === version.current) { setBrands(items); setError(""); }
    } catch (error) { if (request === version.current) setError(error instanceof Error ? error.message : "Merk gagal dimuat."); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => { void reload(); return () => { version.current += 1; }; }, [reload]);
  const save = async (name: string, image: string, id?: number) => {
    if (!isAdmin) throw new Error("Akses admin diperlukan.");
    const value = name.trim();
    if (!value || value.length > 100) throw new Error("Nama merk wajib diisi, maksimal 100 karakter.");
    if (brands.some(brand => brand.id !== id && brand.name.trim().toLowerCase() === value.toLowerCase())) throw new Error("Nama merk sudah ada.");
    const payload = { name: value, image: image.trim(), updated_at: new Date().toISOString() };
    const query = id ? supabase.from("brands").update(payload).eq("id", id) : supabase.from("brands").insert(payload);
    const { data, error } = await query.select("id, name, image").single();
    if (error || !data) throw new Error(error?.code === "23505" ? "Nama merk sudah ada." : error?.message || "Merk belum tersimpan.");
    version.current += 1; setLoading(false);
    setBrands(current => [...current.filter(brand => brand.id !== Number(data.id)), { id: Number(data.id), name: data.name, image: data.image || "" }].sort((a,b) => a.name.localeCompare(b.name, "id")));
    setError("");
  };
  const remove = async (id: number) => {
    if (!isAdmin) throw new Error("Akses admin diperlukan.");
    const { data, error } = await supabase.from("brands").delete().eq("id", id).select("id").single();
    if (error || !data) throw new Error(error?.code === "23503" ? "Merk masih digunakan produk. Ubah merk produk terlebih dahulu." : error?.message || "Merk belum dihapus.");
    version.current += 1; setLoading(false); setBrands(current => current.filter(brand => brand.id !== id));
  };
  return { brands, loading, error, reload, save, remove };
}
